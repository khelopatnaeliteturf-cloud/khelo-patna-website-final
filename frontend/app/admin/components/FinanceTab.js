"use client";

import React, { useState, useEffect } from 'react';

const formatCurrency = (value) => `₹${(Number(value) || 0).toLocaleString('en-IN')}`;

export default function FinanceTab({ 
    allStudents,
    coachesList,
    backendUrl,
    getHeaders,
    feeTerms,
    setFeeTerms,
    feeTypes,
    setFeeTypes,
    feeRebates,
    setFeeRebates,
    feeGroups,
    setFeeGroups,
    onCollectPayment,
    initialStudentId,
    clearInitialStudentId,
    activeSubTab
}) {
    const [subTab, setSubTab] = useState(activeSubTab || 'collect'); // 'collect', 'templates', 'ledger', 'pl'
    const students = Array.isArray(allStudents) ? allStudents : [];

    useEffect(() => {
        if (activeSubTab) {
            setSubTab(activeSubTab);
        }
    }, [activeSubTab]);

    const [feeSearchQuery, setFeeSearchQuery] = useState('');
    const [feeStudentData, setFeeStudentData] = useState(null);
    const [feeDues, setFeeDues] = useState([]);

    const [paymentRows, setPaymentRows] = useState([]);
    const [paymentDetails, setPaymentDetails] = useState({
        date: new Date().toISOString().split('T')[0],
        receiptNo: '',
        paymentMethod: 'Cash',
        creditAccount: 'School ICICI',
        referenceNo: '',
        senderAccount: '',
        remarks: '',
        selectedMonth: 'all'
    });
    const [autoAdjustAmount, setAutoAdjustAmount] = useState('');

    useEffect(() => {
        if (feeStudentData && feeDues) {
            const rows = feeDues.map(d => {
                const amountDue = Number(d.amountDue) || 0;
                const amountPaid = Number(d.amountPaid) || 0;
                const balanceDue = Math.max(0, amountDue - amountPaid);
                return {
                    feeId: d._id,
                    monthFor: d.monthFor,
                    feeType: amountDue > (Number(feeStudentData.monthlyFee) || 2000) ? 'Admission + Tuition Fee' : 'Tuition Fee',
                    amountDue,
                    amountPaid,
                    balanceDue: balanceDue,
                    payingNow: balanceDue,
                    discount: 0,
                    afterPayment: 0
                };
            });
            setPaymentRows(rows);
            setPaymentDetails(prev => ({
                ...prev,
                selectedMonth: 'all',
                receiptNo: String(Math.floor(10000 + Math.random() * 90000)),
                remarks: '',
                referenceNo: '',
                senderAccount: ''
            }));
            setAutoAdjustAmount('');
        } else {
            setPaymentRows([]);
        }
    }, [feeDues, feeStudentData]);

    const handleRowChange = (index, field, value) => {
        setPaymentRows(prev => {
            const next = [...prev];
            const row = next[index];
            if (!row) return prev;
            const val = Math.max(0, Number(value) || 0);
            if (field === 'payingNow') {
                next[index].payingNow = Math.min(val, Math.max(0, row.balanceDue - row.discount));
            } else if (field === 'discount') {
                next[index].discount = Math.min(val, Math.max(0, row.balanceDue - row.payingNow));
            } else {
                next[index][field] = val;
            }
            
            if (field === 'payingNow' || field === 'discount') {
                next[index].afterPayment = Math.max(0, next[index].balanceDue - next[index].payingNow - next[index].discount);
            }
            return next;
        });
    };

    const handleAutoAdjustChange = (val) => {
        setAutoAdjustAmount(val);
        const amount = Number(val) || 0;
        setPaymentRows(prev => {
            let remaining = amount;
            return prev.map(row => {
                const isVisible = paymentDetails.selectedMonth === 'all' || row.monthFor === paymentDetails.selectedMonth;
                if (!isVisible) return row;

                const availableBalance = Math.max(0, row.balanceDue - row.discount);
                const paying = Math.min(remaining, availableBalance);
                remaining -= paying;
                return {
                    ...row,
                    payingNow: paying,
                    afterPayment: Math.max(0, row.balanceDue - paying - row.discount)
                };
            });
        });
    };

    useEffect(() => {
        if (initialStudentId) {
            setFeeSearchQuery(initialStudentId);
            const fetchDuesForId = async () => {
                try {
                    const res = await fetch(`${backendUrl}/api/academy/dues?search=${encodeURIComponent(initialStudentId)}`, { headers: getHeaders() });
                    const data = await res.json();
                    if (res.ok) {
                        const dues = data.dues || [];
                        setFeeStudentData(data.student);
                        setFeeDues(dues);
                        if (dues.length > 0) {
                            setFeeCollection({
                                amountPaid: String((Number(dues[0].amountDue) || 0) - (Number(dues[0].amountPaid) || 0)),
                                monthFor: dues[0].monthFor,
                                adjustmentReason: ''
                            });
                        } else {
                            setFeeCollection({ amountPaid: '', monthFor: '', adjustmentReason: '' });
                        }
                    }
                } catch (err) {
                    console.error('Failed to load initial student dues', err);
                }
            };
            fetchDuesForId();
            if (clearInitialStudentId) {
                clearInitialStudentId();
            }
        }
    }, [initialStudentId]);
    
    // Counter payment collections
    const [feeCollection, setFeeCollection] = useState({ amountPaid: '', monthFor: '', adjustmentReason: '' });

    // Ledger transactions state
    const [transactions, setTransactions] = useState([]);

    // P&L Metrics state
    const [plData, setPlData] = useState({
        bookingRev: 0,
        feeRev: 0,
        posRev: 0,
        coachExpense: 0,
        netProfit: 0
    });

    useEffect(() => {
        if (subTab === 'ledger') {
            loadLedgerTransactions();
        } else if (subTab === 'pl') {
            loadPLStatement();
        }
    }, [subTab]);

    const loadLedgerTransactions = async () => {
        try {
            // Fetch bookings and fee records to merge in chronological transaction ledger
            const resBookings = await fetch(`${backendUrl}/api/reports/bookings?paymentStatus=SUCCESS`, { headers: getHeaders() });
            const dataBookings = await resBookings.json();

            const resFees = await fetch(`${backendUrl}/api/reports/fees?status=PAID`, { headers: getHeaders() });
            const dataFees = await resFees.json();

            const merged = [];
            dataBookings.forEach(b => {
                merged.push({
                    date: b.createdAt || b.date,
                    type: 'TURF_BOOKING',
                    desc: `Turf Rental - ${b.customerName} (${b.sport.toUpperCase()})`,
                    amount: b.paidAmount,
                    method: b.paymentMethod.toUpperCase()
                });
            });

            const invoices = dataFees.invoices || [];
            invoices.forEach(f => {
                merged.push({
                    date: f.paymentDate || f.dueDate,
                    type: 'ACADEMY_FEE',
                    desc: `Academy Fee - ${f.studentId?.name || 'Member'} (${f.monthFor})`,
                    amount: f.amountPaid,
                    method: 'CASH / COUNTER'
                });
            });

            // Sort by date descending
            merged.sort((a,b) => new Date(b.date) - new Date(a.date));
            setTransactions(merged);
        } catch (err) {
            console.error('Failed to load ledger:', err);
        }
    };

    const loadPLStatement = async () => {
        try {
            // Fetch month revenue analytics
            const resAnalytics = await fetch(`${backendUrl}/api/reports/revenue-analytics`, { headers: getHeaders() });
            const dataAnalytics = await resAnalytics.json();

            // Summarize all past 6 months income and expenses
            let bRev = 0, fRev = 0, pRev = 0, cExp = 0;
            dataAnalytics.forEach(item => {
                bRev += item.bookings;
                fRev += item.fees;
                pRev += item.pos;
                cExp += item.coachExpense || 0;
            });

            setPlData({
                bookingRev: bRev,
                feeRev: fRev,
                posRev: pRev,
                coachExpense: cExp,
                netProfit: (bRev + fRev + pRev) - cExp
            });
        } catch (err) {
            console.error('Failed to calculate Profit & Loss:', err);
        }
    };

    const handleSearchDues = async (e) => {
        e.preventDefault();
        const searchTerm = feeSearchQuery.trim();
        if (!searchTerm) return;
        try {
            const res = await fetch(`${backendUrl}/api/academy/dues?search=${encodeURIComponent(searchTerm)}`, { headers: getHeaders() });
            const data = await res.json();
            if (res.ok) {
                const dues = data.dues || [];
                setFeeStudentData(data.student);
                setFeeDues(dues);
                if (dues.length > 0) {
                    setFeeCollection({
                        amountPaid: String((Number(dues[0].amountDue) || 0) - (Number(dues[0].amountPaid) || 0)),
                        monthFor: dues[0].monthFor,
                        adjustmentReason: ''
                    });
                } else {
                    setFeeCollection({ amountPaid: '', monthFor: '', adjustmentReason: '' });
                }
            } else {
                alert(data.error || 'No records found.');
                setFeeStudentData(null);
                setFeeDues([]);
            }
        } catch (err) {
            alert('Failed to search dues.');
        }
    };

    const clearFeeProfile = () => {
        setFeeStudentData(null);
        setFeeDues([]);
        setPaymentRows([]);
        setAutoAdjustAmount('');
        setFeeSearchQuery('');
        setFeeCollection({ amountPaid: '', monthFor: '', adjustmentReason: '' });
    };

    const handleCollectPaymentSubmit = async (e) => {
        e.preventDefault();
        if (!feeStudentData || paymentRows.length === 0) {
            alert('No pending dues to pay.');
            return;
        }

        const visibleRows = paymentDetails.selectedMonth === 'all'
            ? paymentRows
            : paymentRows.filter(r => r.monthFor === paymentDetails.selectedMonth);

        const rowsToPay = visibleRows.filter(r => r.payingNow > 0 || r.discount > 0);
        if (rowsToPay.length === 0) {
            alert('Please specify amount to pay or discount to apply.');
            return;
        }

        setBillingLoading(true);
        try {
            for (const row of rowsToPay) {
                const res = await fetch(`${backendUrl}/api/academy/students/${feeStudentData._id}/fees`, {
                    method: 'POST',
                    headers: getHeaders(),
                    body: JSON.stringify({
                        monthFor: row.monthFor,
                        amountPaid: Number(row.payingNow) || 0,
                        discount: Number(row.discount) || 0,
                        adjustmentReason: paymentDetails.remarks || 'Counter collection',
                        paymentMethod: paymentDetails.paymentMethod,
                        creditAccount: paymentDetails.paymentMethod !== 'Cash' ? paymentDetails.creditAccount : '',
                        referenceNo: paymentDetails.paymentMethod !== 'Cash' ? paymentDetails.referenceNo : '',
                        senderAccount: paymentDetails.paymentMethod !== 'Cash' ? paymentDetails.senderAccount : ''
                    })
                });
                if (!res.ok) {
                    const errData = await res.json();
                    throw new Error(errData.error || `Failed to record payment for ${row.monthFor}`);
                }
            }

            alert('Fee payment(s) successfully recorded! WA / Email receipts queued.');
            
            // Reload dues
            const reDues = await fetch(`${backendUrl}/api/academy/dues?search=${encodeURIComponent(feeStudentData._id)}`, { headers: getHeaders() });
            if (reDues.ok) {
                const reData = await reDues.json();
                setFeeDues(reData.dues || []);
            }
            setAutoAdjustAmount('');
        } catch (err) {
            alert(err.message || 'Error collecting payment.');
        } finally {
            setBillingLoading(false);
        }
    };

    const [billingLoading, setBillingLoading] = useState(false);

    const handleGenerateMonthlyFees = async () => {
        if (!confirm('Generate monthly fee invoices for all active students?')) return;
        setBillingLoading(true);
        try {
            const res = await fetch(`${backendUrl}/api/academy/billing/generate-monthly`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({})
            });
            const data = await res.json();
            if (res.ok) {
                alert(`Monthly billing complete: ${data.created} invoices created, ${data.skipped} skipped.`);
            } else {
                alert(data.error || 'Failed to generate monthly fees.');
            }
        } catch (err) {
            alert('Failed to generate monthly fees.');
        } finally {
            setBillingLoading(false);
        }
    };

    const visibleRows = paymentDetails.selectedMonth === 'all'
        ? paymentRows
        : paymentRows.filter(r => r.monthFor === paymentDetails.selectedMonth);

    const totalDue = visibleRows.reduce((sum, r) => sum + r.balanceDue, 0);
    const totalPaying = visibleRows.reduce((sum, r) => sum + r.payingNow, 0);
    const totalDiscount = visibleRows.reduce((sum, r) => sum + r.discount, 0);
    const remainingBalance = visibleRows.reduce((sum, r) => sum + r.afterPayment, 0);
    const totalSelectedBalance = paymentRows.reduce((sum, r) => sum + r.balanceDue, 0);
    const activeFinanceStudents = students.filter(s => (s.status || 'ACTIVE') === 'ACTIVE').length;
    const financeNavigation = [
        { key: 'collect', label: 'Collect', icon: 'payments' },
        { key: 'ledger', label: 'Ledger', icon: 'receipt_long' },
        { key: 'pl', label: 'P&L', icon: 'monitoring' }
    ];
    const financeSummaryCards = [
        { label: 'Students', value: students.length, icon: 'groups', color: 'var(--text-main)' },
        { label: 'Active Accounts', value: activeFinanceStudents, icon: 'verified', color: 'var(--success-text)' },
        { label: 'Open Invoices', value: feeDues.length, icon: 'pending_actions', color: '#f59e0b' },
        { label: 'Selected Balance', value: formatCurrency(totalSelectedBalance), icon: 'account_balance_wallet', color: totalSelectedBalance > 0 ? 'var(--danger)' : 'var(--success)' }
    ];

    return (
        <div className="animate-fade-in">
            <div className="d-flex flex-column gap-3 mb-4">
                <div className="d-flex justify-content-between align-items-center gap-3 border-bottom pb-3 flex-wrap">
                    <div className="d-flex gap-2 flex-wrap">
                        {financeNavigation.map(item => (
                            <button
                                key={item.key}
                                className={`sub-tab-link ${subTab === item.key ? 'active' : ''}`}
                                onClick={() => setSubTab(item.key)}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                            >
                                <span className="material-icons-outlined" style={{ fontSize: '16px' }}>{item.icon}</span>
                                {item.label}
                            </button>
                        ))}
                    </div>
                    <button
                        className="btn-secondary-stripe"
                        onClick={handleGenerateMonthlyFees}
                        disabled={billingLoading}
                        style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        <span className="material-icons-outlined" style={{ fontSize: '15px' }}>{billingLoading ? 'hourglass_empty' : 'calendar_month'}</span>
                        {billingLoading ? 'Generating...' : 'Generate Invoices'}
                    </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
                    {financeSummaryCards.map(card => (
                        <div key={card.label} style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '14px 16px', background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', gap: '12px', minHeight: '72px' }}>
                            <span className="material-icons-outlined" style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', color: card.color }}>{card.icon}</span>
                            <div>
                                <div style={{ fontSize: '1.05rem', fontWeight: 800, lineHeight: 1.1, color: 'var(--text-main)' }}>{card.value}</div>
                                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '5px' }}>{card.label}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Sub View: Payment Collection Desk */}
            {subTab === 'collect' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div className="card-premium" style={{ padding: '18px', borderRadius: '8px' }}>
                        <div className="d-flex justify-content-between align-items-center gap-3 flex-wrap mb-3">
                            <div>
                                <h4 className="mb-1" style={{ fontSize: '0.92rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-main)' }}>
                                    Fee Collection Desk
                                </h4>
                                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                    Search by student ID, name, or parent phone.
                                </div>
                            </div>
                            {feeStudentData && (
                                <button type="button" className="btn-secondary-stripe py-1 px-3" onClick={clearFeeProfile} style={{ fontSize: '0.78rem' }}>
                                    Clear Student
                                </button>
                            )}
                        </div>
                        <form onSubmit={handleSearchDues} className="d-flex gap-2 flex-wrap">
                            <div style={{ position: 'relative', flex: '1 1 280px' }}>
                                <span className="material-icons-outlined" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '18px', pointerEvents: 'none' }}>search</span>
                                <input 
                                    type="text" 
                                    placeholder="Student ID, name, or parent phone" 
                                    className="input-premium w-100"
                                    style={{ paddingLeft: '42px' }}
                                    value={feeSearchQuery}
                                    onChange={(e) => setFeeSearchQuery(e.target.value)}
                                />
                            </div>
                            <button type="submit" className="btn-primary-stripe" disabled={!feeSearchQuery.trim()} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                <span className="material-icons-outlined" style={{ fontSize: '16px' }}>manage_search</span>
                                Search
                            </button>
                        </form>
                    </div>

                    {feeStudentData && (
                        <>
                            <div className="card-premium" style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                                <div style={{ position: 'relative', width: '72px', height: '72px', borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--success-text)', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    {feeStudentData.documents?.photoUrl || feeStudentData.photoUrl ? (
                                        <img src={feeStudentData.documents?.photoUrl || feeStudentData.photoUrl} alt={feeStudentData.name || 'Student'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <span className="material-icons-outlined" style={{ fontSize: '2.2rem', color: 'rgba(255,255,255,0.3)' }}>person</span>
                                    )}
                                </div>
                                <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                                    <div>
                                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Student Name</div>
                                        <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--success-text)' }}>{feeStudentData.name || 'Unnamed Student'}</div>
                                        <div style={{ fontSize: '0.75rem', marginTop: '2px' }}>ID: <strong>{feeStudentData.membershipId || 'N/A'}</strong></div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Academy Sport & Slot</div>
                                        <div style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'capitalize' }}>{feeStudentData.sport || 'academy'} Academy</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Slot: {feeStudentData.batchTime || 'Not assigned'}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Parent / Guardian Info</div>
                                        <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{feeStudentData.fatherName || feeStudentData.parentName || 'N/A'}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Ph: {feeStudentData.phone || feeStudentData.guardianMobile || 'N/A'}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Outstanding Balance</div>
                                        <div style={{ fontSize: '1.05rem', fontWeight: 800, color: totalSelectedBalance > 0 ? 'var(--danger)' : 'var(--success)' }}>
                                            {formatCurrency(totalSelectedBalance)}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{feeDues.length} open invoice{feeDues.length === 1 ? '' : 's'}</div>
                                    </div>
                                    <div style={{ gridColumn: '1 / -1' }}>
                                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Address</div>
                                        <div style={{ fontSize: '0.78rem', color: 'var(--text-color)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                            {feeStudentData.currentAddress || feeStudentData.residentialAddress || feeStudentData.permanentAddress || 'N/A'}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Fee Payment Form & Table */}
                            {feeDues.length > 0 ? (
                                <div className="card-premium">
                                    <div className="d-flex justify-content-between align-items-center mb-3 border-bottom pb-2">
                                        <h4 style={{ margin: 0, fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Payment Entry</h4>
                                        <button type="button" className="btn btn-sm btn-link text-muted" style={{ textDecoration: 'none', padding: 0, display: 'inline-flex', alignItems: 'center', gap: '4px' }} onClick={clearFeeProfile}>
                                            <span className="material-icons-outlined" style={{ fontSize: '15px' }}>close</span>
                                            Close
                                        </button>
                                    </div>

                                    <form onSubmit={handleCollectPaymentSubmit} className="d-flex flex-column gap-4">
                                        {/* Row 1: Inputs */}
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                                            <div>
                                                <label className="d-block mb-1" style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)' }}>Collect Fee *</label>
                                                <select 
                                                    className="input-premium w-100" 
                                                    value={paymentDetails.selectedMonth}
                                                    onChange={e => {
                                                        const mVal = e.target.value;
                                                        setPaymentDetails(prev => ({ ...prev, selectedMonth: mVal }));
                                                        setAutoAdjustAmount('');
                                                    }}
                                                >
                                                    <option value="all">All Outstanding Months</option>
                                                    {feeDues.map(d => (
                                                        <option key={d._id} value={d.monthFor}>{d.monthFor} (Due: {formatCurrency((Number(d.amountDue) || 0) - (Number(d.amountPaid) || 0))})</option>
                                                    ))}
                                                </select>
                                            </div>
                                            
                                            <div>
                                                <label className="d-block mb-1" style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)' }}>Date *</label>
                                                <input 
                                                    type="date" 
                                                    required 
                                                    className="input-premium w-100" 
                                                    value={paymentDetails.date}
                                                    onChange={e => setPaymentDetails(prev => ({ ...prev, date: e.target.value }))}
                                                />
                                            </div>
                                            
                                            <div>
                                                <label className="d-block mb-1" style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)' }}>Receipt No.</label>
                                                <input 
                                                    type="text" 
                                                    disabled 
                                                    className="input-premium w-100" 
                                                    style={{ background: 'rgba(255,255,255,0.03)', color: 'var(--text-muted)' }}
                                                    value={paymentDetails.receiptNo}
                                                />
                                            </div>
                                            
                                            <div>
                                                <label className="d-block mb-1" style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)' }}>Payment Method *</label>
                                                <select 
                                                    className="input-premium w-100" 
                                                    value={paymentDetails.paymentMethod}
                                                    onChange={e => setPaymentDetails(prev => ({ ...prev, paymentMethod: e.target.value }))}
                                                >
                                                    <option value="Cash">Cash</option>
                                                    <option value="UPI">UPI</option>
                                                    <option value="Card">Debit/Credit Card</option>
                                                    <option value="Bank Transfer">Bank Transfer</option>
                                                </select>
                                            </div>
                                        </div>

                                        {/* UPI / Card details */}
                                        {paymentDetails.paymentMethod !== 'Cash' && (
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', background: 'rgba(0,0,0,0.12)', padding: '16px', borderRadius: '12px', border: '1px dashed var(--border-color)' }}>
                                                <div>
                                                    <label className="d-block mb-1" style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-muted)' }}>Credit To Account *</label>
                                                    <select 
                                                        className="input-premium w-100" 
                                                        value={paymentDetails.creditAccount}
                                                        onChange={e => setPaymentDetails(prev => ({ ...prev, creditAccount: e.target.value }))}
                                                    >
                                                        <option value="School ICICI">School ICICI</option>
                                                        <option value="HDFC - Academy">HDFC - Academy</option>
                                                        <option value="Cash Box">Cash Box</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="d-block mb-1" style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-muted)' }}>UPI/Transaction Reference No. *</label>
                                                    <input 
                                                        type="text" 
                                                        required
                                                        placeholder="UPI Reference Number"
                                                        className="input-premium w-100"
                                                        value={paymentDetails.referenceNo}
                                                        onChange={e => setPaymentDetails(prev => ({ ...prev, referenceNo: e.target.value }))}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="d-block mb-1" style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-muted)' }}>Sender Account Name</label>
                                                    <input 
                                                        type="text" 
                                                        placeholder="Account Name"
                                                        className="input-premium w-100"
                                                        value={paymentDetails.senderAccount}
                                                        onChange={e => setPaymentDetails(prev => ({ ...prev, senderAccount: e.target.value }))}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {/* Invoices Table */}
                                        <div>
                                            <label className="d-block mb-2" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Payment Distribution Breakdown</label>
                                            <div className="table-responsive" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                                                <table className="table-premium" style={{ fontSize: '0.78rem' }}>
                                                    <thead>
                                                        <tr>
                                                            <th>Term</th>
                                                            <th>Fee Type</th>
                                                            <th>Amount</th>
                                                            <th>Paid</th>
                                                            <th>Balance</th>
                                                            <th style={{ width: '110px' }}>Paying Now</th>
                                                            <th style={{ width: '100px' }}>Discount</th>
                                                            <th>After Payment</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {visibleRows.map((row) => {
                                                            const actualIndex = paymentRows.findIndex(r => r.feeId === row.feeId);
                                                            return (
                                                                <tr key={row.feeId}>
                                                                    <td style={{ fontWeight: 700 }}>{row.monthFor}</td>
                                                                    <td>{row.feeType}</td>
                                                                    <td>{formatCurrency(row.amountDue)}</td>
                                                                    <td>{formatCurrency(row.amountPaid)}</td>
                                                                    <td style={{ color: 'var(--warning)', fontWeight: 700 }}>{formatCurrency(row.balanceDue)}</td>
                                                                    <td>
                                                                        <input 
                                                                            type="number"
                                                                            min="0"
                                                                            max={row.balanceDue}
                                                                            className="input-premium py-1 px-2 text-center"
                                                                            style={{ width: '90px', fontSize: '0.78rem' }}
                                                                            value={row.payingNow}
                                                                            onChange={e => handleRowChange(actualIndex, 'payingNow', e.target.value)}
                                                                        />
                                                                    </td>
                                                                    <td>
                                                                        <input 
                                                                            type="number"
                                                                            min="0"
                                                                            max={row.balanceDue - row.payingNow}
                                                                            className="input-premium py-1 px-2 text-center"
                                                                            style={{ width: '80px', fontSize: '0.78rem' }}
                                                                            value={row.discount}
                                                                            onChange={e => handleRowChange(actualIndex, 'discount', e.target.value)}
                                                                        />
                                                                    </td>
                                                                    <td style={{ fontWeight: 700, color: row.afterPayment > 0 ? 'var(--danger)' : 'var(--success)' }}>
                                                                        {formatCurrency(row.afterPayment)}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>

                                        {/* Calculations & Summary Bar */}
                                        <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: '12px', padding: '16px', display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                                                <div>
                                                    <div style={{ fontSize: '0.64rem', opacity: 0.8, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Total Due</div>
                                                    <div style={{ fontSize: '1.15rem', fontWeight: 800 }}>{formatCurrency(totalDue)}</div>
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '0.64rem', opacity: 0.8, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Paying</div>
                                                    <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#10B981' }}>{formatCurrency(totalPaying)}</div>
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '0.64rem', opacity: 0.8, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Discount</div>
                                                    <div style={{ fontSize: '1.15rem', fontWeight: 800 }}>{formatCurrency(totalDiscount)}</div>
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '0.64rem', opacity: 0.8, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Remaining Balance</div>
                                                    <div style={{ fontSize: '1.15rem', fontWeight: 800, color: remainingBalance > 0 ? 'var(--danger)' : 'var(--success)' }}>{formatCurrency(remainingBalance)}</div>
                                                </div>
                                            </div>
                                            
                                            <div style={{ minWidth: '220px' }}>
                                                <label className="d-block mb-1" style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-muted)' }}>Enter Amount To Auto-Adjust</label>
                                                <input 
                                                    type="number" 
                                                    placeholder="Enter amount to distribute..." 
                                                    className="input-premium w-100"
                                                    style={{ fontSize: '0.8rem', padding: '8px 12px', background: 'rgba(255,255,255,0.03)' }}
                                                    value={autoAdjustAmount}
                                                    onChange={e => handleAutoAdjustChange(e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        {/* Remarks and Submit */}
                                        <div>
                                            <label className="d-block mb-1" style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)' }}>Remarks / Waivers Note</label>
                                            <textarea 
                                                placeholder="Add comments or payment remarks..." 
                                                className="input-premium w-100"
                                                style={{ minHeight: '60px', fontSize: '0.8rem' }}
                                                value={paymentDetails.remarks}
                                                onChange={e => setPaymentDetails(prev => ({ ...prev, remarks: e.target.value }))}
                                            />
                                        </div>

                                        <button 
                                            type="submit" 
                                            disabled={billingLoading}
                                            className="btn-primary-stripe w-100 py-3"
                                            style={{ fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                        >
                                            <span className="material-icons-outlined" style={{ fontSize: '20px' }}>{billingLoading ? 'hourglass_empty' : 'check_circle'}</span>
                                            {billingLoading ? 'Processing payments...' : 'Record Payment'}
                                        </button>
                                    </form>
                                </div>
                            ) : (
                                <div className="card-premium text-center py-5">
                                    <span className="material-icons-outlined text-success mb-3" style={{ fontSize: '3rem' }}>check_circle</span>
                                    <h4 className="text-success">✓ Accounts are clear!</h4>
                                    <p className="text-muted mb-0">Student has no outstanding dues for this season.</p>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* Sub View: General Ledger */}
            {subTab === 'ledger' && (
                <div className="card-premium">
                    <h4 className="mb-3">Cash & Bank Transaction Logs</h4>
                    <div className="table-responsive">
                        <table className="table-premium">
                            <thead>
                                <tr>
                                    <th>Timestamp</th>
                                    <th>Category</th>
                                    <th>Description</th>
                                    <th>Amount</th>
                                    <th>Payment Mode</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.length > 0 ? (
                                    transactions.map((t, idx) => (
                                        <tr key={idx}>
                                            <td>{new Date(t.date).toLocaleString('en-IN')}</td>
                                            <td>
                                                <span className={`badge-pill ${t.type === 'TURF_BOOKING' ? 'badge-success' : 'badge-primary'}`}>
                                                    {t.type}
                                                </span>
                                            </td>
                                            <td>{t.desc}</td>
                                            <td><strong className="text-success">+ ₹{t.amount}</strong></td>
                                            <td>{t.method}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="5" className="text-center p-4 text-muted">No transactions registered in this period.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Sub View: Profit & Loss Statement */}
            {subTab === 'pl' && (
                <div className="card-premium">
                    <h4 className="mb-4">Profit & Loss Statement (Cumulative past 6 months)</h4>
                    <div className="row g-4 mb-4">
                        <div className="col-md-4">
                            <div className="border rounded p-3 text-center bg-success bg-opacity-10">
                                <span className="text-muted" style={{ fontSize: '0.8rem' }}>Total Gross Revenue</span>
                                <h3 className="text-success mt-2">₹{plData.bookingRev + plData.feeRev + plData.posRev}</h3>
                            </div>
                        </div>
                        <div className="col-md-4">
                            <div className="border rounded p-3 text-center bg-danger bg-opacity-10">
                                <span className="text-muted" style={{ fontSize: '0.8rem' }}>Coach Salaries Expense</span>
                                <h3 className="text-danger mt-2">₹{plData.coachExpense}</h3>
                            </div>
                        </div>
                        <div className="col-md-4">
                            <div className="border rounded p-3 text-center bg-primary bg-opacity-10">
                                <span className="text-muted" style={{ fontSize: '0.8rem' }}>Cumulative Net Profit</span>
                                <h3 className="text-primary mt-2">₹{plData.netProfit}</h3>
                            </div>
                        </div>
                    </div>

                    <table className="table-premium">
                        <thead>
                            <tr>
                                <th>Revenue Categories</th>
                                <th className="text-end">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Turf Slot Bookings Income</td>
                                <td className="text-end text-success">+ ₹{plData.bookingRev}</td>
                            </tr>
                            <tr>
                                <td>Academy Students Enrollment Fees</td>
                                <td className="text-end text-success">+ ₹{plData.feeRev}</td>
                            </tr>
                            <tr>
                                <td>POS Beverage & Jerseies Retail Sales</td>
                                <td className="text-end text-success">+ ₹{plData.posRev}</td>
                            </tr>
                            <tr className="border-top" style={{ fontWeight: 700 }}>
                                <td>Total Gross Income</td>
                                <td className="text-end text-success">+ ₹{plData.bookingRev + plData.feeRev + plData.posRev}</td>
                            </tr>
                            <tr className="border-top">
                                <td>Coaches Salaries Disbursements</td>
                                <td className="text-end text-danger">- ₹{plData.coachExpense}</td>
                            </tr>
                            <tr className="border-top" style={{ fontSize: '1.1rem', fontWeight: 800 }}>
                                <td>Net Profit / Loss</td>
                                <td className={`text-end ${plData.netProfit >= 0 ? 'text-success' : 'text-danger'}`}>
                                    ₹{plData.netProfit}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
