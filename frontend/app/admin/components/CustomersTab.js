"use client";

import React, { useState, useEffect } from 'react';

// Levenshtein distance utility for name spell check
function getEditDistance(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    const matrix = [];
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    matrix[i][j - 1] + 1,     // insertion
                    matrix[i - 1][j] + 1      // deletion
                );
            }
        }
    }
    return matrix[b.length][a.length];
}

// Find duplicate profile suggestions
function findDuplicateSuggestions(custs) {
    const suggestions = [];
    const seenPairs = new Set();

    for (let i = 0; i < custs.length; i++) {
        const c1 = custs[i];
        const p1Clean = c1.phone.replace(/\D/g, '');
        const name1Lower = c1.name.toLowerCase().trim();

        for (let j = i + 1; j < custs.length; j++) {
            const c2 = custs[j];
            const p2Clean = c2.phone.replace(/\D/g, '');
            const name2Lower = c2.name.toLowerCase().trim();

            let isSuspected = false;
            let reason = '';
            let source = c1;
            let target = c2;

            // 1. Same phone suffix (e.g. 917366963737 vs 7366963737)
            if (p1Clean.length >= 10 && p2Clean.length >= 10) {
                const isSuffix1 = p1Clean.endsWith(p2Clean);
                const isSuffix2 = p2Clean.endsWith(p1Clean);
                if (isSuffix1 || isSuffix2) {
                    isSuspected = true;
                    reason = 'Similar phone suffix (possible missing country code)';
                    if (isSuffix1) {
                        source = c2;
                        target = c1;
                    } else {
                        source = c1;
                        target = c2;
                    }
                }
            }

            // 2. Exact match names with different phone numbers
            if (!isSuspected && name1Lower === name2Lower && p1Clean !== p2Clean) {
                isSuspected = true;
                reason = 'Exact matching name with a different number';
                if (c1.totalBookings < c2.totalBookings || (!c1.isStudent && c2.isStudent)) {
                    source = c1;
                    target = c2;
                } else {
                    source = c2;
                    target = c1;
                }
            }

            // 3. Similar name spellings (edit distance <= 2)
            if (!isSuspected && p1Clean !== p2Clean && name1Lower.length > 3 && name2Lower.length > 3) {
                const dist = getEditDistance(name1Lower, name2Lower);
                if (dist > 0 && dist <= 2) {
                    isSuspected = true;
                    reason = `Similar spelling (${c1.name} vs ${c2.name})`;
                    if (c1.totalBookings < c2.totalBookings) {
                        source = c1;
                        target = c2;
                    } else {
                        source = c2;
                        target = c1;
                    }
                }
            }

            if (isSuspected) {
                const pairKey = [source.phone, target.phone].sort().join('-');
                if (!seenPairs.has(pairKey)) {
                    seenPairs.add(pairKey);
                    suggestions.push({
                        source,
                        target,
                        reason
                    });
                }
            }
        }
    }
    return suggestions.slice(0, 5);
}

export default function CustomersTab({ backendUrl, getHeaders }) {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showMergeModal, setShowMergeModal] = useState(false);
    
    // Merge Form States
    const [mergeForm, setMergeForm] = useState({
        sourcePhone: '',
        targetPhone: '',
        targetName: '',
        targetEmail: ''
    });
    const [mergeSubmitting, setMergeSubmitting] = useState(false);
    const [mergeError, setMergeError] = useState('');
    const [mergeSuccess, setMergeSuccess] = useState('');

    // Previews for source & target
    const [sourcePreview, setSourcePreview] = useState(null);
    const [targetPreview, setTargetPreview] = useState(null);

    // Customer history states
    const [selectedCustomerForHistory, setSelectedCustomerForHistory] = useState(null);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [customerHistory, setCustomerHistory] = useState(null);

    const handleViewHistory = async (customer) => {
        setSelectedCustomerForHistory(customer);
        setHistoryLoading(true);
        setCustomerHistory(null);
        try {
            const res = await fetch(`${backendUrl}/api/admin/customers/lookup?phone=${encodeURIComponent(customer.phone)}`, {
                headers: getHeaders()
            });
            const data = await res.json();
            if (res.ok) {
                setCustomerHistory(data);
            }
        } catch (err) {
            console.error('Error fetching customer history:', err);
        } finally {
            setHistoryLoading(false);
        }
    };

    // Sorting States
    const [sortBy, setSortBy] = useState('lastActive');
    const [sortOrder, setSortOrder] = useState('desc');

    const toggleSort = (field) => {
        if (sortBy === field) {
            setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('desc');
        }
    };

    const renderSortIcon = (field) => {
        if (sortBy !== field) return null;
        return (
            <span className="material-icons-outlined" style={{ fontSize: '13px', marginLeft: '4px', verticalAlign: 'middle', color: 'var(--primary)' }}>
                {sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'}
            </span>
        );
    };

    // Compute duplicate suggestions dynamically
    const suggestions = React.useMemo(() => findDuplicateSuggestions(customers), [customers]);

    useEffect(() => {
        loadCustomers();
    }, []);

    // Look up preview details locally whenever source or target phone fields are modified
    useEffect(() => {
        if (!mergeForm.sourcePhone) {
            setSourcePreview(null);
        } else {
            const found = customers.find(c => c.phone.replace(/\D/g, '') === mergeForm.sourcePhone.replace(/\D/g, ''));
            setSourcePreview(found || null);
        }
    }, [mergeForm.sourcePhone, customers]);

    useEffect(() => {
        if (!mergeForm.targetPhone) {
            setTargetPreview(null);
        } else {
            const found = customers.find(c => c.phone.replace(/\D/g, '') === mergeForm.targetPhone.replace(/\D/g, ''));
            setTargetPreview(found || null);
            if (found && !mergeForm.targetName) {
                setMergeForm(prev => ({
                    ...prev,
                    targetName: found.name,
                    targetEmail: found.email || prev.targetEmail
                }));
            }
        }
    }, [mergeForm.targetPhone, customers]);

    const loadCustomers = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${backendUrl}/api/admin/customers`, { headers: getHeaders() });
            const data = await res.json();
            if (res.ok) {
                setCustomers(data.customers || []);
            }
        } catch (err) {
            console.error('Failed to load customer list:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleMergeSubmit = async (e) => {
        e.preventDefault();
        setMergeError('');
        setMergeSuccess('');

        if (mergeForm.sourcePhone.trim() === mergeForm.targetPhone.trim()) {
            setMergeError('Source and Target phone numbers cannot be identical.');
            return;
        }

        setMergeSubmitting(true);
        try {
            const res = await fetch(`${backendUrl}/api/admin/customers/merge`, {
                method: 'POST',
                headers: {
                    ...getHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(mergeForm)
            });
            const data = await res.json();
            if (res.ok) {
                setMergeSuccess('Profiles merged successfully! Re-indexing bookings and student profiles...');
                // Reset form
                setMergeForm({
                    sourcePhone: '',
                    targetPhone: '',
                    targetName: '',
                    targetEmail: ''
                });
                setSourcePreview(null);
                setTargetPreview(null);
                // Reload list
                await loadCustomers();
                setTimeout(() => setShowMergeModal(false), 2000);
            } else {
                setMergeError(data.error || 'Failed to merge profiles.');
            }
        } catch (err) {
            console.error('Merge error:', err);
            setMergeError('Network error combining profiles. Check console logs.');
        } finally {
            setMergeSubmitting(false);
        }
    };

    const handleQuickMergeInitiate = (customer) => {
        setMergeForm({
            sourcePhone: customer.phone,
            targetPhone: '',
            targetName: '',
            targetEmail: ''
        });
        setSourcePreview(customer);
        setTargetPreview(null);
        setMergeError('');
        setMergeSuccess('');
        setShowMergeModal(true);
    };

    // Filter customers list by search input
    const filteredCustomers = customers.filter(c => {
        const term = searchTerm.toLowerCase();
        return (
            c.name.toLowerCase().includes(term) ||
            c.phone.includes(term) ||
            (c.email && c.email.toLowerCase().includes(term))
        );
    });

    // Sort the filtered list
    const sortedCustomers = React.useMemo(() => {
        return [...filteredCustomers].sort((a, b) => {
            let valA, valB;
            if (sortBy === 'name') {
                valA = a.name.toLowerCase();
                valB = b.name.toLowerCase();
            } else if (sortBy === 'spend') {
                valA = a.totalSpent || 0;
                valB = b.totalSpent || 0;
            } else if (sortBy === 'lastActive') {
                valA = a.lastBookingDate || '';
                valB = b.lastBookingDate || '';
            } else if (sortBy === 'bookings') {
                valA = a.totalBookings || 0;
                valB = b.totalBookings || 0;
            } else {
                return 0;
            }

            if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });
    }, [filteredCustomers, sortBy, sortOrder]);

    const totalUnique = customers.length;
    const repeatCount = customers.filter(c => c.totalBookings >= 2).length;
    const academyCount = customers.filter(c => c.isStudent).length;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fade-in 0.3s ease-out' }}>
            <style>{`
                .sug-card-hover:hover {
                    border-color: var(--primary) !important;
                    background: var(--primary-light) !important;
                    transform: translateY(-2px);
                }
                .table-row-hover:hover {
                    background-color: var(--primary-light) !important;
                }
            `}</style>
            
            {/* Top Statistics Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                <div className="card-premium" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: '12px', borderRadius: '12px', display: 'flex' }}>
                        <span className="material-icons-outlined" style={{ fontSize: '28px' }}>group</span>
                    </div>
                    <div>
                        <div style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-muted)' }}>Unique Customers</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '2px', color: 'var(--text-main)' }}>{loading ? '...' : totalUnique}</div>
                    </div>
                </div>

                <div className="card-premium" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ background: 'rgba(16, 185, 129, 0.08)', color: 'var(--success)', padding: '12px', borderRadius: '12px', display: 'flex' }}>
                        <span className="material-icons-outlined" style={{ fontSize: '28px' }}>loop</span>
                    </div>
                    <div>
                        <div style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-muted)' }}>Repeat Players (2+)</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '2px', color: 'var(--text-main)' }}>{loading ? '...' : repeatCount}</div>
                    </div>
                </div>

                <div className="card-premium" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ background: 'rgba(59, 130, 246, 0.08)', color: '#3B82F6', padding: '12px', borderRadius: '12px', display: 'flex' }}>
                        <span className="material-icons-outlined" style={{ fontSize: '28px' }}>school</span>
                    </div>
                    <div>
                        <div style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-muted)' }}>Academy Members</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '2px', color: 'var(--text-main)' }}>{loading ? '...' : academyCount}</div>
                    </div>
                </div>
            </div>

            {/* Customer Directory Table Section */}
            <div className="card-premium" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div>
                        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>Customer Directory</h3>
                        <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>Unified database of sports players and academy students.</p>
                    </div>
                    
                    <button 
                        onClick={() => {
                            setMergeForm({ sourcePhone: '', targetPhone: '', targetName: '', targetEmail: '' });
                            setSourcePreview(null);
                            setTargetPreview(null);
                            setMergeError('');
                            setMergeSuccess('');
                            setShowMergeModal(true);
                        }}
                        className="btn-secondary-stripe"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 600, cursor: 'pointer', fontSize: '0.82rem' }}
                    >
                        <span className="material-icons-outlined" style={{ fontSize: '18px' }}>merge_type</span>
                        Merge Profiles
                    </button>
                </div>

                {/* Filter and Search Bar */}
                <div style={{ marginBottom: '20px' }}>
                    <div style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
                        <span className="material-icons-outlined" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '18px' }}>search</span>
                        <input
                            type="text"
                            placeholder="Search by name, email or phone..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="input-premium"
                            style={{ width: '100%', padding: '10px 14px 10px 42px', fontSize: '0.85rem', borderRadius: '10px' }}
                        />
                    </div>
                </div>

                {/* Main Table */}
                {loading ? (
                    <div style={{ padding: '60px', textAlign: 'center' }}>
                        <div className="spinner" style={{ margin: '0 auto 12px auto', width: '32px', height: '32px', border: '3px solid rgba(0,0,0,0.05)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Retrieving customer profiles...</span>
                    </div>
                ) : filteredCustomers.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', border: '1px dashed var(--border-color)', borderRadius: '14px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        No customers match your search criteria.
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                                    <th style={{ padding: '12px 16px', fontWeight: 600, cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSort('name')}>
                                        Customer Name {renderSortIcon('name')}
                                    </th>
                                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>Phone</th>
                                    <th style={{ padding: '12px 16px', fontWeight: 600, cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSort('bookings')}>
                                        Bookings {renderSortIcon('bookings')}
                                    </th>
                                    <th style={{ padding: '12px 16px', fontWeight: 600, cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSort('spend')}>
                                        Lifetime Spend {renderSortIcon('spend')}
                                    </th>
                                    <th style={{ padding: '12px 16px', fontWeight: 600, cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSort('lastActive')}>
                                        Last Active {renderSortIcon('lastActive')}
                                    </th>
                                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>Status Badge</th>
                                    <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedCustomers.map((cust, idx) => (
                                    <tr 
                                        key={idx} 
                                        onClick={() => handleViewHistory(cust)}
                                        style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-main)', transition: 'background-color 0.2s', cursor: 'pointer' }} 
                                        className="table-row-hover"
                                    >
                                        <td style={{ padding: '16px' }}>
                                            <div style={{ fontWeight: 700 }}>{cust.name}</div>
                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{cust.email || 'No email registered'}</div>
                                        </td>
                                        <td style={{ padding: '16px', fontFamily: 'monospace', fontWeight: 600 }}>{cust.phone}</td>
                                        <td style={{ padding: '16px' }}>
                                            <span style={{ fontWeight: 700 }}>{cust.totalBookings}</span>
                                            {cust.totalBookings > 0 && (
                                                <span style={{ fontSize: '0.68rem', color: 'var(--success)', background: 'var(--success-light)', padding: '2px 6px', borderRadius: '4px', marginLeft: '6px', fontWeight: 700 }}>
                                                    {cust.successfulBookings} paid
                                                </span>
                                            )}
                                        </td>
                                        <td style={{ padding: '16px', fontWeight: 800 }}>₹{cust.totalSpent}</td>
                                        <td style={{ padding: '16px', color: cust.lastBookingDate ? 'var(--text-main)' : 'var(--text-muted)' }}>
                                            {cust.lastBookingDate ? cust.lastBookingDate : '—'}
                                        </td>
                                        <td style={{ padding: '16px' }}>
                                            {cust.isStudent ? (
                                                <span className="badge-pill" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6', fontSize: '0.68rem', fontWeight: 700 }}>
                                                    🎓 Student
                                                </span>
                                            ) : (
                                                <span className="badge-pill" style={{ background: 'rgba(0, 0, 0, 0.04)', color: 'var(--text-muted)', fontSize: '0.68rem', fontWeight: 700 }}>
                                                    👤 Player
                                                </span>
                                            )}
                                        </td>
                                        <td style={{ padding: '16px', textAlign: 'right' }}>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleQuickMergeInitiate(cust); }}
                                                style={{ border: '1px solid var(--border-color)', background: 'none', color: 'var(--text-muted)', fontSize: '0.74rem', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                                className="btn-row-action"
                                                title="Merge this profile into another"
                                            >
                                                <span className="material-icons-outlined" style={{ fontSize: '14px' }}>call_merge</span>
                                                Merge
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Merge Profiles Modal */}
            {showMergeModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '20px' }} onClick={() => setShowMergeModal(false)}>
                    <div style={{ background: 'var(--card-bg)', borderRadius: '24px', width: '100%', maxWidth: '650px', maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--border-color)', boxShadow: '0 24px 80px rgba(0,0,0,0.3)', animation: 'slide-up 0.25s ease-out' }} onClick={e => e.stopPropagation()}>
                        
                        <div style={{ padding: '24px', borderBottom: '1px solid var(--border-color)', position: 'relative' }}>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span className="material-icons-outlined" style={{ color: 'var(--primary)' }}>merge_type</span>
                                Merge Customer Profiles
                            </h3>
                            <button onClick={() => setShowMergeModal(false)} style={{ position: 'absolute', right: '20px', top: '20px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                <span className="material-icons-outlined">close</span>
                            </button>
                        </div>

                        <form onSubmit={handleMergeSubmit} style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
                                Merge bookings and academy details of a duplicate or misspelled profile (Source) into a clean, consolidated profile (Target). All source history transfers dynamically.
                            </p>

                            {/* Duplicate Suggestions Panel */}
                            {suggestions.length > 0 && (
                                <div style={{ 
                                    background: 'rgba(99, 102, 241, 0.04)', 
                                    border: '1px solid rgba(99, 102, 241, 0.15)', 
                                    borderRadius: '16px', 
                                    padding: '16px', 
                                    display: 'flex', 
                                    flexDirection: 'column', 
                                    gap: '10px' 
                                }}>
                                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span className="material-icons-outlined" style={{ fontSize: '16px', color: 'var(--primary)' }}>lightbulb</span>
                                        Suspected Duplicates Detected ({suggestions.length})
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {suggestions.map((sug, idx) => (
                                            <div 
                                                key={idx} 
                                                onClick={() => {
                                                    setMergeForm({
                                                        sourcePhone: sug.source.phone,
                                                        targetPhone: sug.target.phone,
                                                        targetName: sug.target.name,
                                                        targetEmail: sug.target.email || sug.source.email || ''
                                                    });
                                                    setMergeError('');
                                                    setMergeSuccess('');
                                                }}
                                                style={{ 
                                                    background: 'var(--card-bg)', 
                                                    border: '1px solid var(--border-color)', 
                                                    borderRadius: '10px', 
                                                    padding: '10px 12px', 
                                                    cursor: 'pointer', 
                                                    fontSize: '0.74rem',
                                                    transition: 'all 0.2s',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    boxShadow: 'var(--shadow-sm)'
                                                }}
                                                className="sug-card-hover"
                                            >
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'left' }}>
                                                    <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                                                        Merge <span style={{ color: 'var(--danger)' }}>{sug.source.name}</span> ({sug.source.phone}) ➔ <span style={{ color: 'var(--success)' }}>{sug.target.name}</span> ({sug.target.phone})
                                                    </div>
                                                    <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>
                                                        Reason: {sug.reason}
                                                    </div>
                                                </div>
                                                <span className="material-icons-outlined" style={{ fontSize: '16px', color: 'var(--primary)' }}>arrow_forward</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {mergeError && (
                                <div style={{ background: 'var(--danger-light)', color: 'var(--danger)', padding: '12px 16px', borderRadius: '10px', fontSize: '0.78rem', fontWeight: 600 }}>
                                    ⚠️ {mergeError}
                                </div>
                            )}

                            {mergeSuccess && (
                                <div style={{ background: 'var(--success-light)', color: 'var(--success)', padding: '12px 16px', borderRadius: '10px', fontSize: '0.78rem', fontWeight: 600 }}>
                                    ✓ {mergeSuccess}
                                </div>
                            )}

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
                                
                                {/* Source Column */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>1. Duplicate Profile Phone (Source) *</label>
                                    <input
                                        type="tel"
                                        required
                                        placeholder="e.g. 919876543210"
                                        className="input-premium"
                                        style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', fontSize: '0.85rem' }}
                                        value={mergeForm.sourcePhone}
                                        onChange={e => setMergeForm(prev => ({ ...prev, sourcePhone: e.target.value }))}
                                    />
                                    
                                    {/* Source Preview Card */}
                                    {sourcePreview ? (
                                        <div style={{ background: 'rgba(239, 68, 68, 0.03)', border: '1px solid rgba(239, 68, 68, 0.15)', borderRadius: '12px', padding: '12px', marginTop: '8px', fontSize: '0.74rem' }}>
                                            <div style={{ fontWeight: 700, color: 'var(--danger)' }}>Source to be merged & deleted</div>
                                            <div style={{ fontWeight: 800, marginTop: '4px', fontSize: '0.8rem' }}>{sourcePreview.name}</div>
                                            <div style={{ color: 'var(--text-muted)' }}>📊 {sourcePreview.totalBookings} Bookings (₹{sourcePreview.totalSpent} Spent)</div>
                                            {sourcePreview.isStudent && <div style={{ color: '#3B82F6', fontWeight: 600 }}>🎓 Active Academy Member</div>}
                                        </div>
                                    ) : mergeForm.sourcePhone && (
                                        <div style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.02)', borderRadius: '8px', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                            No profile found matching this phone number.
                                        </div>
                                    )}
                                </div>

                                {/* Target Column */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>2. Correct Profile Phone (Target) *</label>
                                    <input
                                        type="tel"
                                        required
                                        placeholder="e.g. 919876543211"
                                        className="input-premium"
                                        style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', fontSize: '0.85rem' }}
                                        value={mergeForm.targetPhone}
                                        onChange={e => setMergeForm(prev => ({ ...prev, targetPhone: e.target.value }))}
                                    />

                                    {/* Target Preview Card */}
                                    {targetPreview ? (
                                        <div style={{ background: 'var(--success-light)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '12px', padding: '12px', marginTop: '8px', fontSize: '0.74rem' }}>
                                            <div style={{ fontWeight: 700, color: 'var(--success)' }}>Target destination profile</div>
                                            <div style={{ fontWeight: 800, marginTop: '4px', fontSize: '0.8rem' }}>{targetPreview.name}</div>
                                            <div style={{ color: 'var(--text-muted)' }}>📊 {targetPreview.totalBookings} Bookings (₹{targetPreview.totalSpent} Spent)</div>
                                            {targetPreview.isStudent && <div style={{ color: '#3B82F6', fontWeight: 600 }}>🎓 Active Academy Member</div>}
                                        </div>
                                    ) : mergeForm.targetPhone && (
                                        <div style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.02)', borderRadius: '8px', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                            New profile will be created or updated.
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Consolidated Profile details fields */}
                            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <h4 style={{ margin: 0, fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)' }}>3. Consolidated Target Details (Spelling Correction)</h4>
                                
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '6px' }}>Correct Name *</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="Consolidated customer name"
                                            className="input-premium"
                                            style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', fontSize: '0.85rem' }}
                                            value={mergeForm.targetName}
                                            onChange={e => setMergeForm(prev => ({ ...prev, targetName: e.target.value }))}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '6px' }}>Correct Email</label>
                                        <input
                                            type="email"
                                            placeholder="Consolidated customer email"
                                            className="input-premium"
                                            style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', fontSize: '0.85rem' }}
                                            value={mergeForm.targetEmail}
                                            onChange={e => setMergeForm(prev => ({ ...prev, targetEmail: e.target.value }))}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Submit controls */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                                <button 
                                    type="button" 
                                    onClick={() => setShowMergeModal(false)}
                                    className="btn-secondary-stripe"
                                    style={{ border: '1px solid var(--border-color)', padding: '10px 20px', borderRadius: '10px', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem' }}
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    disabled={mergeSubmitting || !mergeForm.sourcePhone || !mergeForm.targetPhone || !mergeForm.targetName}
                                    style={{ 
                                        padding: '10px 24px', 
                                        borderRadius: '10px', 
                                        background: 'var(--danger)', 
                                        color: '#fff', 
                                        border: 'none', 
                                        fontWeight: 700, 
                                        cursor: 'pointer', 
                                        fontSize: '0.82rem',
                                        opacity: (mergeSubmitting || !mergeForm.sourcePhone || !mergeForm.targetPhone || !mergeForm.targetName) ? 0.6 : 1,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '8px'
                                    }}
                                >
                                    {mergeSubmitting ? (
                                        <>
                                            <div className="spinner" style={{ width: '14px', height: '14px', border: '1.5px solid rgba(255,255,255,0.2)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                                            Merging Profiles...
                                        </>
                                    ) : (
                                        <>
                                            <span className="material-icons-outlined" style={{ fontSize: '18px' }}>call_merge</span>
                                            Confirm Merge
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Customer Bookings & Payments History Modal */}
            {selectedCustomerForHistory && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '20px' }} onClick={() => setSelectedCustomerForHistory(null)}>
                    <div style={{ background: 'var(--card-bg)', borderRadius: '24px', width: '100%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--border-color)', boxShadow: '0 24px 80px rgba(0,0,0,0.3)', animation: 'slide-up 0.25s ease-out' }} onClick={e => e.stopPropagation()}>
                        
                        <div style={{ padding: '24px', borderBottom: '1px solid var(--border-color)', position: 'relative', display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <span className="material-icons-outlined" style={{ fontSize: '24px' }}>account_circle</span>
                            </div>
                            <div style={{ textAlign: 'left' }}>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                                    {selectedCustomerForHistory.name}
                                </h3>
                                <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                                    Phone: {selectedCustomerForHistory.phone} {selectedCustomerForHistory.email ? ` | Email: ${selectedCustomerForHistory.email}` : ''}
                                </p>
                            </div>
                            <button onClick={() => setSelectedCustomerForHistory(null)} style={{ position: 'absolute', right: '20px', top: '24px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                <span className="material-icons-outlined">close</span>
                            </button>
                        </div>

                        <div style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {historyLoading ? (
                                <div style={{ padding: '40px', textAlign: 'center' }}>
                                    <div className="spinner" style={{ margin: '0 auto 12px auto', width: '32px', height: '32px', border: '3px solid rgba(0,0,0,0.05)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Retrieving booking and payments history...</span>
                                </div>
                            ) : customerHistory ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    
                                    {/* Stats grid for this customer */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                                        <div style={{ padding: '14px', background: 'var(--bg-color)', borderRadius: '12px', border: '1px solid var(--border-color)', textAlign: 'left' }}>
                                            <div style={{ fontSize: '0.66rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Bookings</div>
                                            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '4px' }}>
                                                {customerHistory.bookings?.length || 0}
                                            </div>
                                        </div>
                                        <div style={{ padding: '14px', background: 'var(--bg-color)', borderRadius: '12px', border: '1px solid var(--border-color)', textAlign: 'left' }}>
                                            <div style={{ fontSize: '0.66rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Spent</div>
                                            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--success)', marginTop: '4px' }}>
                                                ₹{(customerHistory.bookings?.reduce((acc, b) => acc + (b.paymentStatus === 'SUCCESS' ? b.paidAmount : 0), 0) || 0).toLocaleString('en-IN')}
                                            </div>
                                        </div>
                                        <div style={{ padding: '14px', background: 'var(--bg-color)', borderRadius: '12px', border: '1px solid var(--border-color)', textAlign: 'left' }}>
                                            <div style={{ fontSize: '0.66rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Academy Status</div>
                                            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: customerHistory.student ? '#3B82F6' : 'var(--text-muted)', marginTop: '6px' }}>
                                                {customerHistory.student ? `🎓 ${customerHistory.student.status}` : '👤 Regular Player'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Bookings History list */}
                                    <div style={{ textAlign: 'left' }}>
                                        <h4 style={{ margin: '0 0 12px 0', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)' }}>All-Time Turf Bookings & Payment Details</h4>
                                        
                                        {!customerHistory.bookings || customerHistory.bookings.length === 0 ? (
                                            <div style={{ padding: '30px', textAlign: 'center', background: 'var(--bg-color)', borderRadius: '14px', color: 'var(--text-muted)', fontSize: '0.8rem', border: '1px dashed var(--border-color)' }}>
                                                No turf bookings registered for this customer yet.
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '40vh', overflowY: 'auto', paddingRight: '4px' }}>
                                                {customerHistory.bookings.map((booking, idx) => {
                                                    const balance = (booking.totalAmount || 0) - (booking.paidAmount || 0);
                                                    return (
                                                        <div key={idx} style={{ 
                                                            padding: '16px', 
                                                            background: 'var(--bg-color)', 
                                                            borderRadius: '14px', 
                                                            border: '1px solid var(--border-color)', 
                                                            display: 'flex', 
                                                            flexDirection: 'column', 
                                                            gap: '12px' 
                                                        }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                    <div style={{ 
                                                                        padding: '6px', 
                                                                        background: booking.sport === 'cricket' ? 'rgba(245,158,11,0.08)' : 'rgba(16,185,129,0.08)', 
                                                                        color: booking.sport === 'cricket' ? 'var(--amber)' : 'var(--success)', 
                                                                        borderRadius: '8px', 
                                                                        display: 'flex' 
                                                                    }}>
                                                                        <span className="material-icons-outlined" style={{ fontSize: '16px' }}>
                                                                            {booking.sport === 'cricket' ? 'sports_cricket' : 'sports_soccer'}
                                                                        </span>
                                                                    </div>
                                                                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)' }}>
                                                                        {booking.sport.toUpperCase()}
                                                                    </span>
                                                                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                                                        ({booking.orderId})
                                                                    </span>
                                                                </div>

                                                                <span style={{ 
                                                                    fontSize: '0.68rem', 
                                                                    fontWeight: 700, 
                                                                    padding: '4px 8px', 
                                                                    borderRadius: '6px', 
                                                                    background: booking.paymentStatus === 'SUCCESS' ? 'var(--success-light)' : (booking.paymentStatus === 'PENDING' ? 'var(--warning-light)' : 'var(--danger-light)'), 
                                                                    color: booking.paymentStatus === 'SUCCESS' ? 'var(--success)' : (booking.paymentStatus === 'PENDING' ? 'var(--warning)' : 'var(--danger)') 
                                                                }}>
                                                                    {booking.paymentStatus}
                                                                </span>
                                                            </div>

                                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                                                                <div>
                                                                    <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{booking.date}</div>
                                                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                                                        🕒 {booking.timeSlots?.join(', ')}
                                                                    </div>
                                                                </div>
                                                                
                                                                <div style={{ textAlign: 'right' }}>
                                                                    <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>₹{booking.totalAmount?.toLocaleString('en-IN')}</div>
                                                                    <div style={{ fontSize: '0.68rem', color: balance > 0 ? 'var(--danger)' : 'var(--text-muted)', fontWeight: balance > 0 ? 700 : 500, marginTop: '2px' }}>
                                                                        {balance > 0 ? `Unpaid Dues: ₹${balance.toLocaleString('en-IN')}` : `Fully Paid via ${booking.paymentMethod?.toUpperCase()}`}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                    Unable to load history.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            
        </div>
    );
}
