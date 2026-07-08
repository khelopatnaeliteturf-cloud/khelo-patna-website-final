"use client";

import React, { useState, useEffect } from 'react';
import AnimatedNumber from './AnimatedNumber';
import FeeTermsManager from './FeeTermsManager';
import { getSessionMonths, getSessionLabel } from '../lib/feeSession';

export default function MembershipTab({ 
    allStudents, 
    sessionsList, 
    coachesList, 
    batchesList, 
    onUpdateStudent, 
    onCollectPayment, 
    backendUrl, 
    getHeaders,
    initialSelectedMemberId,
    clearInitialSelectedMemberId,
    onOpenAdmissions,
    notifySuccess,
    notifyError
}) {
    const [subView, setSubView] = useState('list'); // 'list', 'new', 'promote', 'transfer'
    const [searchQuery, setSearchQuery] = useState('');
    const [sportFilter, setSportFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('ACTIVE'); // ACTIVE, INACTIVE, DROPOUT
    
    const [selectedMember, setSelectedMember] = useState(null);
    const [selectedMemberFees, setSelectedMemberFees] = useState([]);
    const [loadingFees, setLoadingFees] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState(null);
    const students = Array.isArray(allStudents) ? allStudents : [];

    useEffect(() => {
        if (selectedMember) {
            const fetchFees = async () => {
                setLoadingFees(true);
                try {
                    const res = await fetch(`${backendUrl}/api/academy/students/${selectedMember._id}/fees`, {
                        headers: getHeaders()
                    });
                    if (res.ok) {
                        const data = await res.json();
                        setSelectedMemberFees(data);
                    }
                } catch (err) {
                    console.error('Failed to load member fee history', err);
                } finally {
                    setLoadingFees(false);
                }
            };
            fetchFees();
        } else {
            setSelectedMemberFees([]);
        }
    }, [selectedMember]);

    useEffect(() => {
        if (initialSelectedMemberId && allStudents) {
            const found = allStudents.find(s => s._id === initialSelectedMemberId);
            if (found) {
                setSelectedMember(found);
            }
            if (clearInitialSelectedMemberId) {
                clearInitialSelectedMemberId();
            }
        }
    }, [initialSelectedMemberId, allStudents]);

    useEffect(() => {
        if (selectedMember && allStudents) {
            const current = allStudents.find(s => s._id === selectedMember._id);
            if (current) {
                setSelectedMember(current);
            }
        }
    }, [allStudents]);

    useEffect(() => {
        if (isEditing) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isEditing]);


    const handleEditClick = () => {
        setEditForm({ ...selectedMember });
        setIsEditing(true);
    };

    const handleSaveProfile = async (e) => {
        if (e) e.preventDefault();
        const success = await onUpdateStudent(editForm);
        if (success) {
            setIsEditing(false);
        }
    };

    // Session Promotion State
    const [promoSourceSession, setPromoSourceSession] = useState('');
    const [promoTargetSession, setPromoTargetSession] = useState('');
    const [promoSelectedMembers, setPromoSelectedMembers] = useState([]);
    // Bulk fee-term assignment state
    const [bulkSelectedIds, setBulkSelectedIds] = useState([]);
    const [bulkMonths, setBulkMonths] = useState([]);
    const [bulkSaving, setBulkSaving] = useState(false);

    const toggleBulkStudent = (id) => {
        setBulkSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };
    const toggleBulkMonth = (m) => {
        setBulkMonths(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);
    };

    const handleBulkAssign = async () => {
        if (bulkSelectedIds.length === 0 || bulkMonths.length === 0) return;
        setBulkSaving(true);
        try {
            const res = await fetch(`${backendUrl}/api/academy/fee-terms/bulk-assign`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ studentIds: bulkSelectedIds, months: bulkMonths })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Bulk assignment failed.');
            notifySuccess && notifySuccess(data.message);
            setBulkSelectedIds([]);
            setBulkMonths([]);
        } catch (err) {
            notifyError && notifyError(err.message);
        } finally {
            setBulkSaving(false);
        }
    };

    const normalizedSearch = searchQuery.trim().toLowerCase();
    const memberStats = students.reduce((acc, member) => {
        const status = member.status || 'ACTIVE';
        const sport = (member.sport || '').toLowerCase();
        acc.total += 1;
        if (status === 'ACTIVE') acc.active += 1;
        if (status !== 'ACTIVE') acc.inactive += 1;
        if (sport === 'cricket') acc.cricket += 1;
        if (sport === 'football') acc.football += 1;
        return acc;
    }, { total: 0, active: 0, inactive: 0, cricket: 0, football: 0 });

    const memberSummaryCards = [
        { label: 'Total Students', value: memberStats.total, icon: 'groups', color: 'var(--text-main)' },
        { label: 'Active', value: memberStats.active, icon: 'verified', color: 'var(--success-text)' },
        { label: 'Cricket', value: memberStats.cricket, icon: 'sports_cricket', color: '#22c55e' },
        { label: 'Football', value: memberStats.football, icon: 'sports_soccer', color: '#38bdf8' }
    ];

    const memberNavigation = [
        { key: 'list', label: 'Students', icon: 'groups' },
        { key: 'promote', label: 'Promotion', icon: 'upgrade' }
    ];

    const filteredMembers = students.filter(m => {
        const searchableText = [
            m.name,
            m.membershipId,
            m.phone,
            m.guardianMobile,
            m.fatherMobile,
            m.motherMobile,
            m.email,
            m.batchTime
        ].filter(Boolean).join(' ').toLowerCase();
        const matchesSearch = normalizedSearch === '' || searchableText.includes(normalizedSearch);
        const matchesSport = sportFilter === '' || m.sport === sportFilter;
        const matchesStatus = statusFilter === 'ALL' || (m.status || 'ACTIVE') === statusFilter;
        return matchesSearch && matchesSport && matchesStatus;
    });

    const hasMemberFilters = normalizedSearch !== '' || sportFilter !== '' || statusFilter !== 'ACTIVE';

    const clearMemberFilters = () => {
        setSearchQuery('');
        setSportFilter('');
        setStatusFilter('ACTIVE');
    };

    const handlePromotionSubmit = async (e) => {
        e.preventDefault();
        if (!promoSourceSession || !promoTargetSession || promoSelectedMembers.length === 0) {
            alert('Please select source session, target session, and at least one member.');
            return;
        }
        try {
            const res = await fetch(`${backendUrl}/api/academy/sessions/promote`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({
                    fromSessionId: promoSourceSession,
                    toSessionId: promoTargetSession,
                    studentIds: promoSelectedMembers
                })
            });
            if (res.ok) {
                alert('Session promotion successful!');
                setPromoSelectedMembers([]);
                setSubView('list');
            } else {
                const data = await res.json();
                alert('Error: ' + data.error);
            }
        } catch (err) {
            alert('Failed to execute promotion.');
        }
    };

    return (
        <div className="animate-fade-in">
            <div className="d-flex flex-column gap-3 mb-4">
                <div className="d-flex justify-content-between align-items-center gap-3 border-bottom pb-3 flex-wrap">
                    <div className="d-flex gap-2 flex-wrap">
                        {memberNavigation.map(item => (
                            <button
                                key={item.key}
                                className={`sub-tab-link ${subView === item.key ? 'active' : ''}`}
                                onClick={() => {
                                    setSubView(item.key);
                                    if (item.key === 'list') setSelectedMember(null);
                                }}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                            >
                                <span className="material-icons-outlined" style={{ fontSize: '16px' }}>{item.icon}</span>
                                {item.label}
                            </button>
                        ))}
                    </div>
                    <button
                        className="btn-primary-stripe"
                        onClick={() => onOpenAdmissions && onOpenAdmissions()}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}
                    >
                        <span className="material-icons-outlined" style={{ fontSize: '16px' }}>how_to_reg</span>
                        New Admission
                    </button>
                </div>

                {subView === 'list' && !selectedMember && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
                        {memberSummaryCards.map(card => (
                            <div key={card.label} className="summary-chip" style={{ '--chip-accent': card.color, '--chip-glow': `${card.color}33` }}>
                                <span className="material-icons-outlined summary-chip__icon" style={{ color: card.color }}>{card.icon}</span>
                                <div>
                                    <div className="summary-chip__value"><AnimatedNumber value={card.value} /></div>
                                    <div className="summary-chip__label">{card.label}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Sub View: Member List Grid */}
            {subView === 'list' && !selectedMember && (
                <div className="card-premium animate-fade-in" style={{ padding: '24px', border: '1px solid var(--border-color)' }}>
                    
                    <div className="d-flex flex-wrap align-items-center justify-content-between gap-4 mb-4 pb-3 border-bottom border-secondary-subtle" style={{ borderColor: 'var(--border-color) !important' }}>
                        <div style={{ position: 'relative', minWidth: '320px', flex: 1 }}>
                            <span className="material-icons-outlined" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '1.15rem', pointerEvents: 'none' }}>search</span>
                            <input 
                                type="text" 
                                placeholder="Search by ID, name, or contact number..." 
                                className="input-premium w-100"
                                style={{ paddingLeft: '46px', borderRadius: '12px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <div className="d-flex flex-wrap gap-3 align-items-center">
                            <div className="d-flex align-items-center gap-2" style={{ background: 'rgba(255,255,255,0.02)', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                                <span className="material-icons-outlined" style={{ fontSize: '1.05rem', color: 'var(--success-text)' }}>toggle_on</span>
                                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500 }}>Status:</span>
                                <select 
                                    className="input-premium py-0 border-0" 
                                    style={{ background: 'transparent', padding: '0 24px 0 0', margin: 0, fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main, #0f172a)', cursor: 'pointer', outline: 'none' }}
                                    value={statusFilter} 
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                >
                                    <option value="ALL" style={{ background: '#0b130f', color: '#fff' }}>All Members</option>
                                    <option value="ACTIVE" style={{ background: '#0b130f', color: '#fff' }}>Active Members</option>
                                    <option value="INACTIVE" style={{ background: '#0b130f', color: '#fff' }}>Inactive Members</option>
                                    <option value="DROPOUT" style={{ background: '#0b130f', color: '#fff' }}>Dropout Members</option>
                                </select>
                            </div>
                            
                            <div className="d-flex align-items-center gap-2" style={{ background: 'rgba(255,255,255,0.02)', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                                <span className="material-icons-outlined" style={{ fontSize: '1.05rem', color: 'var(--success-text)' }}>sports</span>
                                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500 }}>Sport:</span>
                                <select 
                                    className="input-premium py-0 border-0" 
                                    style={{ background: 'transparent', padding: '0 24px 0 0', margin: 0, fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main, #0f172a)', cursor: 'pointer', outline: 'none' }}
                                    value={sportFilter} 
                                    onChange={(e) => setSportFilter(e.target.value)}
                                >
                                    <option value="" style={{ background: '#0b130f', color: '#fff' }}>All Sports</option>
                                    <option value="cricket" style={{ background: '#0b130f', color: '#fff' }}>Cricket</option>
                                    <option value="football" style={{ background: '#0b130f', color: '#fff' }}>Football</option>
                                </select>
                            </div>

                            {hasMemberFilters && (
                                <button type="button" className="btn-secondary-stripe py-1 px-3" onClick={clearMemberFilters} style={{ fontSize: '0.78rem' }}>
                                    Clear
                                </button>
                            )}
                        </div>

                        <div style={{ width: '100%', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            Showing <strong style={{ color: 'var(--text-main)' }}>{filteredMembers.length}</strong> of <strong style={{ color: 'var(--text-main)' }}>{students.length}</strong> students
                        </div>
                    </div>

                    {/* Bulk fee-term assignment bar */}
                    {bulkSelectedIds.length > 0 && (
                        <div style={{
                            border: '1px solid rgba(15, 143, 106, 0.3)', borderRadius: '12px', padding: '14px 16px',
                            marginBottom: '16px', background: 'rgba(15, 143, 106, 0.05)'
                        }}>
                            <div className="d-flex justify-content-between align-items-center mb-2" style={{ flexWrap: 'wrap', gap: '8px' }}>
                                <strong style={{ fontSize: '0.85rem' }}>
                                    Assign fee terms (Session {getSessionLabel()}) to {bulkSelectedIds.length} selected student{bulkSelectedIds.length === 1 ? '' : 's'}
                                </strong>
                                <button type="button" className="btn btn-sm btn-link text-muted" style={{ textDecoration: 'none', padding: 0 }} onClick={() => { setBulkSelectedIds([]); setBulkMonths([]); }}>
                                    Clear selection
                                </button>
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                                {getSessionMonths().map(m => (
                                    <button
                                        key={m}
                                        type="button"
                                        aria-pressed={bulkMonths.includes(m)}
                                        onClick={() => toggleBulkMonth(m)}
                                        style={{
                                            fontSize: '0.74rem', fontWeight: 600, padding: '5px 12px', borderRadius: '999px',
                                            cursor: 'pointer',
                                            border: bulkMonths.includes(m) ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                                            background: bulkMonths.includes(m) ? 'var(--primary)' : 'transparent',
                                            color: bulkMonths.includes(m) ? '#fff' : 'var(--text-muted)'
                                        }}
                                    >
                                        {m}
                                    </button>
                                ))}
                            </div>
                            <button
                                type="button"
                                className="btn-primary-stripe"
                                disabled={bulkMonths.length === 0 || bulkSaving}
                                onClick={handleBulkAssign}
                                style={{ fontSize: '0.82rem', opacity: bulkMonths.length === 0 ? 0.5 : 1 }}
                            >
                                {bulkSaving ? 'Assigning…' : `Assign ${bulkMonths.length} Term${bulkMonths.length === 1 ? '' : 's'} to ${bulkSelectedIds.length} Student${bulkSelectedIds.length === 1 ? '' : 's'}`}
                            </button>
                        </div>
                    )}

                    {/* Premium Table Rendering */}
                    <div className="table-responsive">
                        <table className="table-premium" style={{ verticalAlign: 'middle' }}>
                            <thead>
                                <tr>
                                    <th style={{ width: '36px', paddingLeft: '16px' }}>
                                        <input
                                            type="checkbox"
                                            aria-label="Select all visible students for bulk fee-term assignment"
                                            checked={filteredMembers.length > 0 && filteredMembers.every(m => bulkSelectedIds.includes(m._id))}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setBulkSelectedIds(prev => [...new Set([...prev, ...filteredMembers.map(m => m._id)])]);
                                                } else {
                                                    const visible = new Set(filteredMembers.map(m => m._id));
                                                    setBulkSelectedIds(prev => prev.filter(id => !visible.has(id)));
                                                }
                                            }}
                                        />
                                    </th>
                                    <th>Member Profile</th>
                                    <th>Membership ID</th>
                                    <th>Discipline</th>
                                    <th>Batch Schedule</th>
                                    <th>Contact Phone</th>
                                    <th>Status</th>
                                    <th className="text-end" style={{ paddingRight: '16px' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredMembers.length > 0 ? (
                                    filteredMembers.map(m => {
                                        const memberName = m.name || 'Unnamed Student';
                                        const memberStatus = m.status || 'ACTIVE';
                                        const memberSport = m.sport || 'academy';
                                        const memberInitials = memberName.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'ST';
                                        const isActiveMember = memberStatus === 'ACTIVE';
                                        return (
                                        <tr key={m._id} className="table-row-hover" style={{ transition: 'background-color 0.2s ease' }}>
                                            <td style={{ paddingLeft: '16px' }}>
                                                <input
                                                    type="checkbox"
                                                    aria-label={`Select ${memberName} for bulk fee-term assignment`}
                                                    checked={bulkSelectedIds.includes(m._id)}
                                                    onChange={() => toggleBulkStudent(m._id)}
                                                />
                                            </td>
                                            {/* Profile column with Image Avatar */}
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                        {m.photoUrl ? (
                                                            <img src={m.photoUrl} alt={memberName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                        ) : (
                                                            <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--success-text)' }}>
                                                                {memberInitials}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-main, #0f172a)' }}>{memberName}</div>
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1px' }}>Joined {m.joiningDate ? new Date(m.joiningDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : 'Recently'}</div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Membership ID with glowing badge style */}
                                            <td>
                                                <span style={{ fontFamily: 'monospace', color: 'var(--success-text)', background: 'var(--success-bg)', border: '1px solid var(--success-border)', padding: '4px 8px', borderRadius: '6px', fontSize: '0.82rem', fontWeight: 600 }}>
                                                    {m.membershipId || 'N/A'}
                                                </span>
                                            </td>

                                            {/* Sport/Discipline badge */}
                                            <td>
                                                <span className="d-inline-flex align-items-center gap-1" style={{
                                                    fontSize: '0.78rem', fontWeight: 600, textTransform: 'capitalize',
                                                    padding: '4px 10px', borderRadius: '50px',
                                                    background: memberSport === 'cricket' ? 'var(--success-bg)' : 'rgba(56,189,248,0.1)',
                                                    border: memberSport === 'cricket' ? '1px solid var(--success-border)' : '1px solid rgba(56,189,248,0.2)',
                                                    color: memberSport === 'cricket' ? 'var(--success-text)' : '#38BDF8'
                                                }}>
                                                    <span className="material-icons-outlined" style={{ fontSize: '12px' }}>
                                                        {memberSport === 'cricket' ? 'sports_cricket' : 'sports_soccer'}
                                                    </span>
                                                    {memberSport}
                                                </span>
                                            </td>

                                            {/* Batch Schedule Outline Badge */}
                                            <td>
                                                <span className="d-inline-flex align-items-center gap-1" style={{ fontSize: '0.8rem', color: 'var(--text-main, #0f172a)', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', padding: '4px 10px', borderRadius: '8px' }}>
                                                    <span className="material-icons-outlined" style={{ fontSize: '13px', color: 'var(--text-muted, #64748b)' }}>schedule</span>
                                                    {m.batchTime || 'Not assigned'}
                                                </span>
                                            </td>

                                            {/* Contact Phone */}
                                            <td style={{ fontSize: '0.85rem', fontFamily: 'Space Grotesk', color: 'var(--text-main, #0f172a)' }}>
                                                {m.phone || m.guardianMobile || 'N/A'}
                                            </td>

                                            {/* Status Badge with pulse effect */}
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <span style={{
                                                        width: '6px', height: '6px', borderRadius: '50%',
                                                        background: isActiveMember ? 'var(--success-text)' : '#EF4444',
                                                        boxShadow: isActiveMember ? '0 0 8px var(--success-text)' : '0 0 8px #EF4444'
                                                    }} />
                                                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: isActiveMember ? 'var(--success-text)' : '#FCA5A5' }}>
                                                        {memberStatus}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Action buttons inside styled flexbox */}
                                            <td style={{ paddingRight: '16px' }}>
                                                <div className="d-flex gap-2 justify-content-end">
                                                    <button 
                                                        className="btn-secondary-stripe py-1 px-3" 
                                                        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', padding: '6px 12px' }}
                                                        onClick={() => setSelectedMember(m)}
                                                    >
                                                        <span className="material-icons-outlined" style={{ fontSize: '14px' }}>visibility</span> View Profile
                                                    </button>
                                                    <button 
                                                        className="btn-primary-stripe py-1 px-3" 
                                                        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', padding: '6px 12px' }}
                                                        onClick={() => onCollectPayment(m)}
                                                    >
                                                        <span className="material-icons-outlined" style={{ fontSize: '14px' }}>payments</span> Pay
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="8" className="text-center p-5 text-muted">
                                            <span className="material-icons-outlined d-block mb-2" style={{ fontSize: '2rem', color: 'rgba(255,255,255,0.1)' }}>group</span>
                                            No academy members match the selected filters.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Sub View: Member Profile Tab View */}
            {selectedMember && (
                <div className="card-premium" style={{ padding: 0, overflow: 'hidden' }}>
                    {/* Profile Hero Banner */}
                    <div style={{ 
                        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(6, 182, 212, 0.08) 50%, rgba(139, 92, 246, 0.1) 100%)',
                        padding: '32px 28px 24px', 
                        borderBottom: '1px solid var(--border-color)',
                        position: 'relative',
                        overflow: 'hidden'
                    }}>
                        {/* Subtle background pattern */}
                        <div style={{ position: 'absolute', top: 0, right: 0, width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(16, 185, 129, 0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />
                        <div className="d-flex justify-content-between align-items-start" style={{ position: 'relative', zIndex: 1 }}>
                            <div className="d-flex align-items-center gap-3">
                                {/* Avatar */}
                                <div style={{ 
                                    width: '88px', height: '88px', borderRadius: '20px', overflow: 'hidden',
                                    background: 'linear-gradient(135deg, var(--success-text), rgba(6, 182, 212, 0.8))',
                                    padding: '3px', flexShrink: 0
                                }}>
                                    <div style={{ 
                                        width: '100%', height: '100%', borderRadius: '17px', overflow: 'hidden',
                                        background: 'var(--card-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '2rem', fontWeight: 800, color: 'var(--success-text)'
                                    }}>
                                        {selectedMember.photoUrl || selectedMember.documents?.photoUrl ? (
                                            <img src={selectedMember.photoUrl || selectedMember.documents?.photoUrl} alt={selectedMember.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            selectedMember.name[0].toUpperCase()
                                        )}
                                    </div>
                                </div>
                                {/* Name + Meta */}
                                <div>
                                    <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '0 0 4px 0', color: 'var(--text-main)', letterSpacing: '-0.01em' }}>{selectedMember.name}</h2>
                                    <div className="d-flex align-items-center gap-2 flex-wrap">
                                        <span style={{ 
                                            fontFamily: 'monospace', fontSize: '0.78rem', fontWeight: 700,
                                            background: 'rgba(16, 185, 129, 0.12)', color: 'var(--success-text)',
                                            padding: '3px 10px', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.2)'
                                        }}>{selectedMember.membershipId || 'N/A'}</span>
                                        <span className={`badge-pill ${selectedMember.status === 'ACTIVE' ? 'badge-success' : selectedMember.status === 'INACTIVE' ? 'badge-warning' : 'badge-danger'}`}>{selectedMember.status}</span>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                            <span className="material-icons-outlined" style={{ fontSize: '14px' }}>sports_cricket</span>
                                            <span style={{ textTransform: 'capitalize' }}>{selectedMember.sport}</span>
                                        </span>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                            <span className="material-icons-outlined" style={{ fontSize: '14px' }}>schedule</span>
                                            {selectedMember.batchTime}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="d-flex gap-2" style={{ flexShrink: 0 }}>
                                <button className="btn-secondary-stripe" onClick={() => handleEditClick()} style={{ borderColor: '#10b981', color: '#10b981' }}>
                                    <span className="material-icons-outlined" style={{ fontSize: '16px', marginRight: '4px' }}>edit</span> Edit Profile
                                </button>
                                <button className="btn-secondary-stripe" onClick={() => setSelectedMember(null)}>
                                    <span className="material-icons-outlined" style={{ fontSize: '16px', marginRight: '4px' }}>arrow_back</span> Back to Directory
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Fee Summary Quick-Stats Strip */}
                    <div style={{ 
                        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1px',
                        background: 'var(--border-color)', borderBottom: '1px solid var(--border-color)'
                    }}>
                        {[
                            { label: 'Admission Fee', value: `₹${selectedMember.oneTimeAdmissionFee !== undefined ? selectedMember.oneTimeAdmissionFee : 1500}`, icon: 'receipt', gradient: 'linear-gradient(135deg, rgba(139, 92, 246, 0.12), rgba(139, 92, 246, 0.03))' },
                            { label: 'Monthly Fee', value: `₹${selectedMember.monthlyFee}/mo`, icon: 'payments', gradient: 'linear-gradient(135deg, rgba(6, 182, 212, 0.12), rgba(6, 182, 212, 0.03))' },
                            { label: 'Adjusted Fee', value: selectedMember.adjustedFee ? `₹${selectedMember.adjustedFee}/mo` : 'No Discount', icon: 'discount', gradient: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(16, 185, 129, 0.03))' },
                            { label: 'Admission Date', value: selectedMember.admissionDate ? new Date(selectedMember.admissionDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A', icon: 'event', gradient: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(245, 158, 11, 0.03))' }
                        ].map((stat, i) => (
                            <div key={i} style={{ background: 'var(--card-bg)', padding: '16px 20px', position: 'relative', overflow: 'hidden' }}>
                                <div style={{ position: 'absolute', inset: 0, background: stat.gradient, pointerEvents: 'none' }} />
                                <div style={{ position: 'relative', zIndex: 1 }}>
                                    <div className="d-flex align-items-center gap-2 mb-1">
                                        <span className="material-icons-outlined" style={{ fontSize: '16px', color: 'var(--text-muted)' }}>{stat.icon}</span>
                                        <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{stat.label}</span>
                                    </div>
                                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)' }}>{stat.value}</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Fee Terms Manager (session April → March) */}
                    <div style={{ padding: '16px 28px 0' }}>
                        <FeeTermsManager
                            student={selectedMember}
                            backendUrl={backendUrl}
                            getHeaders={getHeaders}
                            notifySuccess={notifySuccess}
                            notifyError={notifyError}
                        />
                    </div>

                    {/* Main Content Grid */}
                    <div style={{ padding: '24px 28px' }}>
                        <div className="row g-4">
                            {/* Left Column — Personal + Academic */}
                            <div className="col-lg-5">
                                {/* Personal Info Card */}
                                <div style={{ 
                                    background: 'linear-gradient(135deg, rgba(255,255,255,0.02), rgba(255,255,255,0.005))',
                                    border: '1px solid var(--border-color)', borderRadius: '14px', padding: '20px', marginBottom: '16px'
                                }}>
                                    <h5 style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        <span style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <span className="material-icons-outlined" style={{ fontSize: '16px', color: 'var(--success-text)' }}>person</span>
                                        </span>
                                        Personal Details
                                    </h5>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {[
                                            { label: 'Date of Birth', value: selectedMember.dateOfBirth, icon: 'cake' },
                                            { label: 'Age', value: selectedMember.age ? `${selectedMember.age} years` : (selectedMember.dateOfBirth ? `${Math.floor((Date.now() - new Date(selectedMember.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))} years (approx)` : 'N/A'), icon: 'hourglass_bottom' },
                                            { label: 'Gender', value: selectedMember.gender, icon: 'wc' },
                                            { label: 'Blood Group', value: selectedMember.bloodGroup || 'N/A', icon: 'bloodtype' },
                                            { label: 'Email', value: selectedMember.email || 'N/A', icon: 'email' },
                                        ].map((item, i) => (
                                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 12px', borderRadius: '10px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.02)' }}>
                                                <span className="material-icons-outlined" style={{ fontSize: '18px', color: 'var(--text-muted)', opacity: 0.6 }}>{item.icon}</span>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{item.label}</div>
                                                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.value}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Academic Info Card */}
                                <div style={{ 
                                    background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.03), rgba(6, 182, 212, 0.005))',
                                    border: '1px solid var(--border-color)', borderRadius: '14px', padding: '20px', marginBottom: '16px'
                                }}>
                                    <h5 style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        <span style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(6, 182, 212, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <span className="material-icons-outlined" style={{ fontSize: '16px', color: '#06b6d4' }}>school</span>
                                        </span>
                                        Academic & Experience
                                    </h5>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {[
                                            { label: 'School Name', value: selectedMember.schoolName || 'N/A', icon: 'account_balance' },
                                            { label: 'Class / Grade', value: selectedMember.classGrade || 'N/A', icon: 'class' },
                                            { label: 'Previous Experience', value: selectedMember.previousExperience || 'No', icon: 'emoji_events' },
                                        ].map((item, i) => (
                                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 12px', borderRadius: '10px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.02)' }}>
                                                <span className="material-icons-outlined" style={{ fontSize: '18px', color: 'var(--text-muted)', opacity: 0.6 }}>{item.icon}</span>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{item.label}</div>
                                                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.value}</div>
                                                </div>
                                            </div>
                                        ))}
                                        {selectedMember.experienceDetails && (
                                            <div style={{ padding: '8px 12px', borderRadius: '8px', background: 'rgba(6, 182, 212, 0.04)', border: '1px solid rgba(6, 182, 212, 0.1)', fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                                                <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>Details:</span> {selectedMember.experienceDetails}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Address Card */}
                                <div style={{ 
                                    background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.03), rgba(245, 158, 11, 0.005))',
                                    border: '1px solid var(--border-color)', borderRadius: '14px', padding: '20px', marginBottom: '16px'
                                }}>
                                    <h5 style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        <span style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <span className="material-icons-outlined" style={{ fontSize: '16px', color: '#f59e0b' }}>location_on</span>
                                        </span>
                                        Address
                                    </h5>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: 1.6 }}>
                                        {selectedMember.residentialAddress || 'N/A'}
                                        {(selectedMember.city || selectedMember.pinCode) && (
                                            <div style={{ marginTop: '4px', color: 'var(--text-muted)' }}>
                                                {[selectedMember.city, selectedMember.pinCode].filter(Boolean).join(', ')}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Medical Info Card */}
                                <div style={{ 
                                    background: selectedMember.medicalConditions ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.05), rgba(239, 68, 68, 0.01))' : 'linear-gradient(135deg, rgba(255,255,255,0.02), rgba(255,255,255,0.005))',
                                    border: `1px solid ${selectedMember.medicalConditions ? 'rgba(239, 68, 68, 0.15)' : 'var(--border-color)'}`, borderRadius: '14px', padding: '20px'
                                }}>
                                    <h5 style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        <span style={{ width: '28px', height: '28px', borderRadius: '8px', background: selectedMember.medicalConditions ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <span className="material-icons-outlined" style={{ fontSize: '16px', color: selectedMember.medicalConditions ? '#ef4444' : 'var(--success-text)' }}>{selectedMember.medicalConditions ? 'medical_information' : 'health_and_safety'}</span>
                                        </span>
                                        Medical Notes
                                    </h5>
                                    <div style={{ fontSize: '0.85rem', color: selectedMember.medicalConditions ? '#ef4444' : 'var(--text-muted)', fontWeight: selectedMember.medicalConditions ? 600 : 400 }}>
                                        {selectedMember.medicalConditions || 'No medical conditions reported ✓'}
                                    </div>
                                </div>
                            </div>

                            {/* Right Column — Family, Documents, Fees */}
                            <div className="col-lg-7">
                                {/* Family & Contact Registry */}
                                <div style={{ 
                                    border: '1px solid var(--border-color)', borderRadius: '14px', padding: '20px', marginBottom: '16px',
                                    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.03), rgba(139, 92, 246, 0.005))'
                                }}>
                                    <h5 style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        <span style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(139, 92, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <span className="material-icons-outlined" style={{ fontSize: '16px', color: '#8b5cf6' }}>family_restroom</span>
                                        </span>
                                        Family & Contact Registry
                                    </h5>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
                                        {[
                                            { label: 'Father Name', value: selectedMember.fatherName, icon: 'man' },
                                            { label: 'Father Mobile', value: selectedMember.fatherMobile, icon: 'phone_android' },
                                            { label: 'Mother Name', value: selectedMember.motherName, icon: 'woman' },
                                            { label: 'Mother Mobile', value: selectedMember.motherMobile, icon: 'phone_android' },
                                            { label: 'Guardian Name', value: selectedMember.guardianName || selectedMember.parentName, icon: 'supervisor_account' },
                                            { label: 'Guardian Mobile', value: selectedMember.guardianMobile || selectedMember.phone, icon: 'phone_in_talk' },
                                            { label: 'Primary Phone', value: selectedMember.phone, icon: 'call' },
                                            { label: 'WhatsApp', value: selectedMember.whatsapp || selectedMember.phone, icon: 'chat' },
                                        ].map((item, i) => (
                                            <div key={i} style={{ 
                                                display: 'flex', alignItems: 'center', gap: '10px',
                                                padding: '10px 14px', borderRadius: '10px',
                                                background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.03)',
                                                transition: 'all 0.2s'
                                            }}>
                                                <span className="material-icons-outlined" style={{ fontSize: '18px', color: '#8b5cf6', opacity: 0.5 }}>{item.icon}</span>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{item.label}</div>
                                                    <div style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.value || 'N/A'}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Verified Documents */}
                                <div style={{ 
                                    border: '1px solid var(--border-color)', borderRadius: '14px', padding: '20px', marginBottom: '16px',
                                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.03), rgba(16, 185, 129, 0.005))'
                                }}>
                                    <h5 style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        <span style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <span className="material-icons-outlined" style={{ fontSize: '16px', color: 'var(--success-text)' }}>folder_shared</span>
                                        </span>
                                        Verified Documents
                                    </h5>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px' }}>
                                        {[
                                            { label: 'Aadhaar Card', field: 'aadhaarUrl', icon: 'credit_card' },
                                            { label: 'Birth Certificate', field: 'birthCertUrl', icon: 'description' },
                                            { label: 'Medical Certificate', field: 'medicalCertUrl', icon: 'medical_services' },
                                            { label: 'Photo', field: 'photoUrl', icon: 'photo_camera' }
                                        ].map((doc, idx) => {
                                            const docUrl = selectedMember.documents?.[doc.field] || selectedMember[doc.field];
                                            return (
                                                <div key={idx} style={{ 
                                                    padding: '14px', borderRadius: '12px',
                                                    background: docUrl ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.03)',
                                                    border: `1px solid ${docUrl ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.1)'}`,
                                                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', textAlign: 'center'
                                                }}>
                                                    <div style={{ 
                                                        width: '40px', height: '40px', borderRadius: '12px',
                                                        background: docUrl ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.08)',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                    }}>
                                                        <span className="material-icons-outlined" style={{ fontSize: '20px', color: docUrl ? 'var(--success-text)' : '#ef4444' }}>
                                                            {docUrl ? 'verified' : 'cancel'}
                                                        </span>
                                                    </div>
                                                    <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-main)' }}>{doc.label}</div>
                                                    {docUrl ? (
                                                        <a href={docUrl} target="_blank" rel="noreferrer" style={{ 
                                                            fontSize: '0.68rem', fontWeight: 600, textDecoration: 'none',
                                                            color: 'var(--success-text)', display: 'flex', alignItems: 'center', gap: '3px'
                                                        }}>
                                                            View File <span className="material-icons-outlined" style={{ fontSize: '12px' }}>open_in_new</span>
                                                        </a>
                                                    ) : (
                                                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Not uploaded</span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Fee & Invoices Ledger */}
                                <div style={{ 
                                    border: '1px solid var(--border-color)', borderRadius: '14px', padding: '20px',
                                    background: 'linear-gradient(135deg, rgba(255,255,255,0.02), rgba(255,255,255,0.005))'
                                }}>
                                    <h5 style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        <span style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <span className="material-icons-outlined" style={{ fontSize: '16px', color: '#f59e0b' }}>receipt_long</span>
                                        </span>
                                        Fee & Invoices Ledger
                                    </h5>
                                    
                                    {loadingFees ? (
                                        <div className="text-center py-4" style={{ color: 'var(--text-muted)' }}>
                                            <span className="material-icons-outlined animate-spin" style={{ fontSize: '1.5rem' }}>sync</span>
                                            <div style={{ fontSize: '0.78rem', marginTop: '8px' }}>Loading billing history...</div>
                                        </div>
                                    ) : selectedMemberFees.length > 0 ? (
                                        <div className="table-responsive" style={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                                            <table className="table-premium" style={{ fontSize: '0.76rem' }}>
                                                <thead>
                                                    <tr>
                                                        <th>Billing Term</th>
                                                        <th>Amount Due</th>
                                                        <th>Paid</th>
                                                        <th>Discount</th>
                                                        <th>Status</th>
                                                        <th>Date Paid</th>
                                                        <th>Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {selectedMemberFees.map(f => (
                                                        <tr key={f._id}>
                                                            <td style={{ fontWeight: 700 }}>{f.monthFor}</td>
                                                            <td>₹{f.amountDue}</td>
                                                            <td style={{ color: 'var(--success-text)' }}>₹{f.amountPaid || 0}</td>
                                                            <td>₹{f.discount || 0}</td>
                                                            <td>
                                                                <span className={`badge-pill ${f.status === 'PAID' ? 'badge-success' : f.status === 'PARTIAL' ? 'badge-warning' : 'badge-danger'}`}>
                                                                    {f.status}
                                                                </span>
                                                            </td>
                                                            <td>{f.paymentDate ? new Date(f.paymentDate).toLocaleDateString('en-IN') : 'N/A'}</td>
                                                            <td>
                                                                {f.status !== 'PAID' && (
                                                                    <button 
                                                                        className="btn-primary-stripe py-0 px-2" 
                                                                        style={{ fontSize: '0.7rem' }}
                                                                        onClick={() => onCollectPayment(selectedMember)}
                                                                    >
                                                                        💳 Pay
                                                                    </button>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <div style={{ 
                                            textAlign: 'center', padding: '32px 20px', borderRadius: '12px',
                                            background: 'rgba(255,255,255,0.01)', border: '1px dashed var(--border-color)'
                                        }}>
                                            <span className="material-icons-outlined" style={{ fontSize: '2.5rem', color: 'var(--text-muted)', opacity: 0.3 }}>receipt</span>
                                            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: '8px 0 0' }}>No billing or fee invoices generated yet.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}


            {/* Sub View: Session Promotion */}
            {subView === 'promote' && (
                <div className="card-premium">
                    <h3 className="mb-4">Session Promotions & Rollovers</h3>
                    <form onSubmit={handlePromotionSubmit} className="row g-3">
                        <div className="col-md-6">
                            <label className="d-block mb-1">From Session (Source)</label>
                            <select className="input-premium w-100" value={promoSourceSession} onChange={(e) => setPromoSourceSession(e.target.value)}>
                                <option value="">Select source session</option>
                                {sessionsList.map(s => (
                                    <option key={s._id} value={s._id}>{s.name} ({s.status})</option>
                                ))}
                            </select>
                        </div>
                        <div className="col-md-6">
                            <label className="d-block mb-1">To Session (Target)</label>
                            <select className="input-premium w-100" value={promoTargetSession} onChange={(e) => setPromoTargetSession(e.target.value)}>
                                <option value="">Select target session</option>
                                {sessionsList.map(s => (
                                    <option key={s._id} value={s._id}>{s.name} ({s.status})</option>
                                ))}
                            </select>
                        </div>

                        {/* Members checklist */}
                        <div className="col-12 mt-4">
                            <h5>Select Active Members to Rollover</h5>
                            <div className="border rounded p-3 bg-opacity-10 bg-white" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                                {students.filter(s => (s.status || 'ACTIVE') === 'ACTIVE').map(student => (
                                    <div key={student._id} className="d-flex align-items-center gap-2 mb-2">
                                        <input 
                                            type="checkbox"
                                            checked={promoSelectedMembers.includes(student._id)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setPromoSelectedMembers([...promoSelectedMembers, student._id]);
                                                } else {
                                                    setPromoSelectedMembers(promoSelectedMembers.filter(id => id !== student._id));
                                                }
                                            }}
                                        />
                                        <span><strong>{student.name || 'Unnamed Student'}</strong> ({student.membershipId || 'No ID'}) | Sport: {(student.sport || 'academy').toUpperCase()}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="col-12 d-flex justify-content-end gap-3 mt-4">
                            <button type="button" className="btn-secondary-stripe" onClick={() => setSubView('list')}>Cancel</button>
                            <button type="submit" className="btn-primary-stripe" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                <span className="material-icons-outlined" style={{ fontSize: '16px' }}>bolt</span> Promote Selected Members
                            </button>
                        </div>
                    </form>
                </div>
            )}
            {/* Edit Profile Modal */}
            {isEditing && editForm && (
                <div
                    style={{
                        position: 'fixed', inset: 0,
                        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 9999, padding: '20px'
                    }}
                    onClick={() => setIsEditing(false)}
                >
                    <div
                        style={{
                            background: 'var(--bg-color)', borderRadius: '24px',
                            width: '100%', maxWidth: '820px', maxHeight: '90vh',
                            display: 'flex', flexDirection: 'column',
                            boxShadow: '0 32px 80px rgba(0,0,0,0.45)', border: '1px solid var(--border-color)',
                            animation: 'slide-up 0.3s cubic-bezier(0.34,1.56,0.64,1)'
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div style={{ padding: '24px 28px', borderBottom: '1px solid var(--border-color)', position: 'relative', flexShrink: 0 }}>
                            <button
                                type="button"
                                onClick={() => setIsEditing(false)}
                                style={{
                                    position: 'absolute', top: '20px', right: '20px',
                                    background: 'var(--bg-color)', border: '1px solid var(--border-color)',
                                    borderRadius: '12px', width: '36px', height: '36px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    cursor: 'pointer', color: 'var(--text-muted)', transition: 'all 0.2s'
                                }}
                            >
                                <span className="material-icons-outlined" style={{ fontSize: '18px' }}>close</span>
                            </button>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{
                                    width: '42px', height: '42px', borderRadius: '12px',
                                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                                    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: '0 4px 14px rgba(99,102,241,0.3)'
                                }}>
                                    <span className="material-icons-outlined" style={{ fontSize: '22px' }}>person_edit</span>
                                </div>
                                <div>
                                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', color: 'var(--text-main)' }}>
                                        Edit Student Profile
                                    </h3>
                                    <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                                        {editForm.membershipId} · Update membership and personal details
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Body */}
                        <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                            <div style={{ padding: '24px 28px', overflowY: 'auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 20px' }}>
                                
                                {/* Section 1: Personal Details */}
                                <div style={{ gridColumn: 'span 2', fontSize: '0.75rem', fontWeight: 800, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px', marginTop: '4px' }}>
                                    Personal Details
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>Student Name *</label>
                                    <input 
                                        type="text" 
                                        className="input-premium w-100" 
                                        required 
                                        value={editForm.name || ''} 
                                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>Date of Birth</label>
                                    <input 
                                        type="date" 
                                        className="input-premium w-100" 
                                        value={editForm.dateOfBirth ? editForm.dateOfBirth.slice(0, 10) : ''} 
                                        onChange={(e) => setEditForm({ ...editForm, dateOfBirth: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>Gender</label>
                                    <select 
                                        className="input-premium w-100" 
                                        value={editForm.gender || ''} 
                                        onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                                    >
                                        <option value="">Select Gender</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>Blood Group</label>
                                    <input 
                                        type="text" 
                                        className="input-premium w-100" 
                                        placeholder="e.g. O+ve" 
                                        value={editForm.bloodGroup || ''} 
                                        onChange={(e) => setEditForm({ ...editForm, bloodGroup: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>Phone Number</label>
                                    <input 
                                        type="tel" 
                                        className="input-premium w-100" 
                                        value={editForm.phone || ''} 
                                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>Email</label>
                                    <input 
                                        type="email" 
                                        className="input-premium w-100" 
                                        value={editForm.email || ''} 
                                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                    />
                                </div>

                                {/* Section 2: Academy/Membership Details */}
                                <div style={{ gridColumn: 'span 2', fontSize: '0.75rem', fontWeight: 800, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px', marginTop: '12px' }}>
                                    Academy Details
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>Sport *</label>
                                    <select 
                                        className="input-premium w-100" 
                                        required 
                                        value={editForm.sport || ''} 
                                        onChange={(e) => setEditForm({ ...editForm, sport: e.target.value })}
                                    >
                                        <option value="cricket">Cricket</option>
                                        <option value="football">Football</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>Batch Time / Schedule *</label>
                                    <select 
                                        className="input-premium w-100" 
                                        required 
                                        value={editForm.batchTime || ''} 
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            const batch = batchesList?.find(b => b.startTime + ' - ' + b.endTime === val || b.name === val);
                                            setEditForm({ 
                                                ...editForm, 
                                                batchTime: val,
                                                batchId: batch ? batch._id : editForm.batchId
                                            });
                                        }}
                                    >
                                        <option value="">Select Batch</option>
                                        {batchesList?.filter(b => b.sport === editForm.sport).map(b => (
                                            <option key={b._id} value={`${b.startTime} - ${b.endTime}`}>
                                                {b.name} ({b.startTime} - {b.endTime})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>Membership Status</label>
                                    <select 
                                        className="input-premium w-100" 
                                        value={editForm.status || 'ACTIVE'} 
                                        onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                                    >
                                        <option value="ACTIVE">ACTIVE</option>
                                        <option value="INACTIVE">INACTIVE</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>School Name</label>
                                    <input 
                                        type="text" 
                                        className="input-premium w-100" 
                                        value={editForm.schoolName || ''} 
                                        onChange={(e) => setEditForm({ ...editForm, schoolName: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>Class / Grade</label>
                                    <input 
                                        type="text" 
                                        className="input-premium w-100" 
                                        value={editForm.classGrade || ''} 
                                        onChange={(e) => setEditForm({ ...editForm, classGrade: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>Previous Experience</label>
                                    <select 
                                        className="input-premium w-100" 
                                        value={editForm.previousExperience || 'No'} 
                                        onChange={(e) => setEditForm({ ...editForm, previousExperience: e.target.value })}
                                    >
                                        <option value="No">No</option>
                                        <option value="Yes">Yes</option>
                                    </select>
                                </div>

                                {/* Section 3: Family & Contact Details */}
                                <div style={{ gridColumn: 'span 2', fontSize: '0.75rem', fontWeight: 800, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px', marginTop: '12px' }}>
                                    Family & Contact Registry
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>Father Name</label>
                                    <input 
                                        type="text" 
                                        className="input-premium w-100" 
                                        value={editForm.fatherName || ''} 
                                        onChange={(e) => setEditForm({ ...editForm, fatherName: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>Father Mobile</label>
                                    <input 
                                        type="tel" 
                                        className="input-premium w-100" 
                                        value={editForm.fatherMobile || ''} 
                                        onChange={(e) => setEditForm({ ...editForm, fatherMobile: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>Mother Name</label>
                                    <input 
                                        type="text" 
                                        className="input-premium w-100" 
                                        value={editForm.motherName || ''} 
                                        onChange={(e) => setEditForm({ ...editForm, motherName: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>Mother Mobile</label>
                                    <input 
                                        type="tel" 
                                        className="input-premium w-100" 
                                        value={editForm.motherMobile || ''} 
                                        onChange={(e) => setEditForm({ ...editForm, motherMobile: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>Guardian Name</label>
                                    <input 
                                        type="text" 
                                        className="input-premium w-100" 
                                        value={editForm.guardianName || ''} 
                                        onChange={(e) => setEditForm({ ...editForm, guardianName: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>Guardian Mobile</label>
                                    <input 
                                        type="tel" 
                                        className="input-premium w-100" 
                                        value={editForm.guardianMobile || ''} 
                                        onChange={(e) => setEditForm({ ...editForm, guardianMobile: e.target.value })}
                                    />
                                </div>
                                
                                <div style={{ gridColumn: 'span 2' }}>
                                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>Residential Address</label>
                                    <textarea 
                                        className="input-premium w-100" 
                                        rows="2"
                                        style={{ resize: 'vertical' }}
                                        value={editForm.currentAddress || ''} 
                                        onChange={(e) => setEditForm({ ...editForm, currentAddress: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Footer */}
                            <div style={{
                                display: 'flex', justifyContent: 'flex-end', gap: '12px',
                                borderTop: '1px solid var(--border-color)', padding: '20px 28px', flexShrink: 0
                            }}>
                                <button
                                    type="button"
                                    onClick={() => setIsEditing(false)}
                                    style={{
                                        padding: '10px 20px', background: 'var(--bg-color)',
                                        border: '1px solid var(--border-color)', borderRadius: '10px',
                                        cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600,
                                        color: 'var(--text-muted)', transition: 'all 0.2s'
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    style={{
                                        padding: '10px 24px',
                                        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                                        color: '#fff', border: 'none', borderRadius: '10px',
                                        cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600,
                                        boxShadow: '0 4px 12px rgba(99,102,241,0.25)',
                                        display: 'flex', alignItems: 'center', gap: '6px',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <span className="material-icons-outlined" style={{ fontSize: '16px' }}>check_circle</span>
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
