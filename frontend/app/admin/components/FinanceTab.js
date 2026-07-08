"use client";

import React, { useState, useEffect } from 'react';
import AnimatedNumber from './AnimatedNumber';
import { getSessionMonths, getSessionLabel } from '../lib/feeSession';

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
    activeSubTab,
    onViewStudentProfile
}) {
    // Only 'collect', 'ledger', and 'pl' have rendered views — normalize
    // anything else (e.g. legacy 'templates') to 'collect' to avoid a blank page.
    const normalizeSubTab = (t) => (['collect', 'ledger', 'pl'].includes(t) ? t : 'collect');
    const [subTab, setSubTab] = useState(normalizeSubTab(activeSubTab));
    const students = Array.isArray(allStudents) ? allStudents : [];

    useEffect(() => {
        if (activeSubTab) {
            setSubTab(normalizeSubTab(activeSubTab));
        }
    }, [activeSubTab]);

    const [feeSearchQuery, setFeeSearchQuery] = useState('');
    const [feeStudentData, setFeeStudentData] = useState(null);
    const [feeDues, setFeeDues] = useState([]);
    const [feeHistory, setFeeHistory] = useState([]);
    const [searchToggle, setSearchToggle] = useState('student'); // 'student' vs 'due_date'
    const [currentPage, setCurrentPage] = useState(1);
    const [showProceedPaymentModal, setShowProceedPaymentModal] = useState(false);
    const [showFeeAdjustmentModal, setShowFeeAdjustmentModal] = useState(false);
    const [adjustedFeeValue, setAdjustedFeeValue] = useState('');
    const [showDueDateModal, setShowDueDateModal] = useState(false);
    const [selectedFeeRecord, setSelectedFeeRecord] = useState(null);
    const [dueDateInput, setDueDateInput] = useState('');

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

    // Assigns a session fee term to the current student on the fly (when the
    // cashier picks an unassigned month from the session dropdown), then
    // reloads the dues so the new term appears in the payment table.
    const [assigningTerm, setAssigningTerm] = useState(false);
    const handleAssignTermFromDesk = async (monthLabel) => {
        if (!feeStudentData?._id || assigningTerm) return;
        setAssigningTerm(true);
        try {
            const res = await fetch(`${backendUrl}/api/academy/students/${feeStudentData._id}/fee-terms`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ months: [monthLabel] })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to assign fee term.');
            const reDues = await fetch(`${backendUrl}/api/academy/dues?search=${encodeURIComponent(feeStudentData._id)}`, { headers: getHeaders() });
            const reData = await reDues.json();
            if (reDues.ok) {
                setFeeDues(reData.dues || []);
                setPaymentDetails(prev => ({ ...prev, selectedMonth: monthLabel }));
            }
        } catch (err) {
            console.error('Error assigning fee term from desk:', err);
            alert(err.message || 'Error assigning fee term.');
        } finally {
            setAssigningTerm(false);
        }
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
                        setFeeHistory(data.history || []);
                        if (data.student) {
                            setAdjustedFeeValue(String(data.student.adjustedFee || data.student.monthlyFee || ''));
                        }
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
        if (e && e.preventDefault) e.preventDefault();
        const searchTerm = feeSearchQuery.trim();
        if (!searchTerm) return;
        try {
            const res = await fetch(`${backendUrl}/api/academy/dues?search=${encodeURIComponent(searchTerm)}`, { headers: getHeaders() });
            const data = await res.json();
            if (res.ok) {
                const dues = data.dues || [];
                setFeeStudentData(data.student);
                setFeeDues(dues);
                setFeeHistory(data.history || []);
                if (data.student) {
                    setAdjustedFeeValue(String(data.student.adjustedFee || data.student.monthlyFee || ''));
                }
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
                setFeeHistory([]);
            }
        } catch (err) {
            alert('Failed to search dues.');
        }
    };

    const clearFeeProfile = () => {
        setFeeStudentData(null);
        setFeeDues([]);
        setFeeHistory([]);
        setPaymentRows([]);
        setAutoAdjustAmount('');
        setFeeSearchQuery('');
        setAdjustedFeeValue('');
        setFeeCollection({ amountPaid: '', monthFor: '', adjustmentReason: '' });
    };

    const handleSetDueDate = async () => {
        if (!selectedFeeRecord || !dueDateInput) return;
        setBillingLoading(true);
        try {
            const res = await fetch(`${backendUrl}/api/academy/fees/${selectedFeeRecord._id}/due-date`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify({ dueDate: dueDateInput })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to update due date.');
            
            // Reload dues
            const reDues = await fetch(`${backendUrl}/api/academy/dues?search=${encodeURIComponent(feeStudentData._id)}`, { headers: getHeaders() });
            if (reDues.ok) {
                const reData = await reDues.json();
                setFeeDues(reData.dues || []);
                setFeeHistory(reData.history || []);
            }
            setShowDueDateModal(false);
            setSelectedFeeRecord(null);
            setDueDateInput('');
            alert('Due date successfully updated.');
        } catch (err) {
            alert(err.message || 'Error setting due date.');
        } finally {
            setBillingLoading(false);
        }
    };

    const handleRemoveFeeRecord = async (feeId) => {
        if (!confirm('Are you sure you want to waive/remove this fee invoice?')) return;
        setBillingLoading(true);
        try {
            const res = await fetch(`${backendUrl}/api/academy/fees/${feeId}`, {
                method: 'DELETE',
                headers: getHeaders()
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to remove fee record.');
            
            // Reload dues
            const reDues = await fetch(`${backendUrl}/api/academy/dues?search=${encodeURIComponent(feeStudentData._id)}`, { headers: getHeaders() });
            if (reDues.ok) {
                const reData = await reDues.json();
                setFeeDues(reData.dues || []);
                setFeeHistory(reData.history || []);
            }
            alert('Fee invoice waived/removed successfully.');
        } catch (err) {
            alert(err.message || 'Error removing fee.');
        } finally {
            setBillingLoading(false);
        }
    };

    const handleAdjustFeeSubmit = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        if (!feeStudentData || adjustedFeeValue === '') return;
        setBillingLoading(true);
        try {
            const res = await fetch(`${backendUrl}/api/academy/students/${feeStudentData._id}/fee-adjust`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify({ adjustedFee: Number(adjustedFeeValue) })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to adjust billing rules.');
            
            // Reload dues
            const reDues = await fetch(`${backendUrl}/api/academy/dues?search=${encodeURIComponent(feeStudentData._id)}`, { headers: getHeaders() });
            if (reDues.ok) {
                const reData = await reDues.json();
                setFeeStudentData(reData.student);
                setFeeDues(reData.dues || []);
                setFeeHistory(reData.history || []);
            }
            setShowFeeAdjustmentModal(false);
            alert(`Student tuition fee adjusted successfully to ₹${adjustedFeeValue}`);
        } catch (err) {
            alert(err.message || 'Error adjusting billing rules.');
        } finally {
            setBillingLoading(false);
        }
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
                setFeeHistory(reData.history || []);
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

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px' }}>
                    {financeSummaryCards.map(card => (
                        <div key={card.label} className="summary-chip" style={{ '--chip-accent': card.color, '--chip-glow': `${card.color}33` }}>
                            <span className="material-icons-outlined summary-chip__icon" style={{ color: card.color }}>{card.icon}</span>
                            <div>
                                <div className="summary-chip__value"><AnimatedNumber value={card.value} /></div>
                                <div className="summary-chip__label">{card.label}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Sub View: Payment Collection Desk */}
            {subTab === 'collect' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Panel 1: Search Student Header */}
                    <div className="card-premium" style={{ padding: 0, border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                        <div style={{ background: '#10b981', color: '#ffffff', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '0.92rem' }}>
                                <span className="material-icons-outlined" style={{ fontSize: '18px' }}>chevron_right</span>
                                Search Student
                            </span>
                            <div className="d-flex align-items-center gap-2">
                                <span style={{ fontSize: '0.74rem', opacity: 0.9 }}>By Student</span>
                                <div style={{ background: 'rgba(255,255,255,0.25)', padding: '2px', borderRadius: '6px', display: 'inline-flex' }}>
                                    <button 
                                        type="button" 
                                        onClick={() => setSearchToggle('student')}
                                        style={{ background: searchToggle === 'student' ? '#ffffff' : 'transparent', color: searchToggle === 'student' ? '#10b981' : '#ffffff', border: 'none', borderRadius: '4px', padding: '2px 8px', fontSize: '0.7rem', fontWeight: 700, transition: 'all 0.2s' }}
                                    >
                                        By Student
                                    </button>
                                    <button 
                                        type="button" 
                                        onClick={() => setSearchToggle('due_date')}
                                        style={{ background: searchToggle === 'due_date' ? '#ffffff' : 'transparent', color: searchToggle === 'due_date' ? '#10b981' : '#ffffff', border: 'none', borderRadius: '4px', padding: '2px 8px', fontSize: '0.7rem', fontWeight: 700, transition: 'all 0.2s' }}
                                    >
                                        By Due Date
                                    </button>
                                </div>
                            </div>
                        </div>

                        {!feeStudentData ? (
                            <div style={{ padding: '24px' }}>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                                    Search student database by Name, ID, or parental contact number to initialize payment desk.
                                </div>
                                <form onSubmit={handleSearchDues} className="d-flex gap-2 flex-wrap">
                                    <div style={{ position: 'relative', flex: '1 1 320px' }}>
                                        <span className="material-icons-outlined" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '18px', pointerEvents: 'none' }}>search</span>
                                        <input 
                                            type="text" 
                                            placeholder="Enter student name, ID (e.g. KP-0001), or contact phone" 
                                            className="input-premium w-100"
                                            style={{ paddingLeft: '42px', borderRadius: '10px' }}
                                            value={feeSearchQuery}
                                            onChange={(e) => setFeeSearchQuery(e.target.value)}
                                        />
                                    </div>
                                    <button type="submit" className="btn-primary-stripe" disabled={!feeSearchQuery.trim()} style={{ background: '#10b981', color: '#ffffff', display: 'inline-flex', alignItems: 'center', gap: '6px', borderRadius: '10px', fontWeight: 700 }}>
                                        <span className="material-icons-outlined" style={{ fontSize: '16px' }}>search</span>
                                        Search Profile
                                    </button>
                                </form>
                            </div>
                        ) : (
                            <div style={{ padding: '20px', background: 'var(--bg-color)', display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '24px', alignItems: 'center' }}>
                                <div style={{ position: 'relative', width: '76px', height: '76px', borderRadius: '50%', overflow: 'hidden', border: '3px solid #10b981', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {feeStudentData.photoUrl || feeStudentData.documents?.photoUrl ? (
                                        <img src={feeStudentData.photoUrl || feeStudentData.documents?.photoUrl} alt={feeStudentData.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <span className="material-icons-outlined" style={{ fontSize: '2.5rem', color: 'rgba(255,255,255,0.25)' }}>person</span>
                                    )}
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(130px, 1fr))', gap: '14px 20px', fontSize: '0.78rem' }}>
                                    <div>
                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.68rem', textTransform: 'uppercase', fontWeight: 600 }}>Name</div>
                                        <div 
                                            onClick={() => onViewStudentProfile && onViewStudentProfile(feeStudentData._id)}
                                            style={{ 
                                                fontSize: '0.98rem', 
                                                fontWeight: 700, 
                                                color: '#10b981', 
                                                cursor: onViewStudentProfile ? 'pointer' : 'default',
                                                textDecoration: onViewStudentProfile ? 'underline' : 'none'
                                            }}
                                        >
                                            {feeStudentData.name}
                                        </div>
                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginTop: '4px' }}>
                                            Membership ID: <strong style={{ color: 'var(--text-main)' }}>{feeStudentData.membershipId || 'N/A'}</strong>
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.68rem', textTransform: 'uppercase', fontWeight: 600 }}>Sport & Batch</div>
                                        <div style={{ fontWeight: 600, color: 'var(--text-main)', textTransform: 'capitalize' }}>
                                            {feeStudentData.sport || 'N/A'}
                                        </div>
                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginTop: '2px' }}>
                                            Batch: <strong>{feeStudentData.batchTime || 'N/A'}</strong>
                                        </div>
                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                                            Father: <strong>{feeStudentData.fatherName || 'N/A'}</strong>
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.68rem', textTransform: 'uppercase', fontWeight: 600 }}>Contact</div>
                                        <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{feeStudentData.phone || '8709113049'}</div>
                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.68rem', textTransform: 'uppercase', fontWeight: 600, marginTop: '5px' }}>Amount Left</div>
                                        <div style={{ fontWeight: 800, color: '#10b981', fontSize: '0.85rem' }}>{formatCurrency(totalSelectedBalance)}</div>
                                    </div>
                                    <div>
                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.68rem', textTransform: 'uppercase', fontWeight: 600 }}>Address</div>
                                        <div style={{ color: 'var(--text-muted)', lineHeight: '1.25', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                            {feeStudentData.currentAddress || 'Jay Mahavir Colony, Sandalpur, Mahendru, Patna 800006'}
                                        </div>
                                    </div>
                                </div>
                                <div className="d-flex flex-column gap-2">
                                    <button 
                                        type="button" 
                                        className="btn-primary-stripe py-1 px-3" 
                                        onClick={() => handleSearchDues()} 
                                        style={{ background: '#10b981', color: '#ffffff', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 700 }}
                                    >
                                        Refresh
                                    </button>
                                    <button 
                                        type="button" 
                                        className="btn-secondary-stripe py-1 px-3" 
                                        onClick={clearFeeProfile} 
                                        style={{ borderRadius: '6px', fontSize: '0.74rem', border: '1px solid var(--border-color)' }}
                                    >
                                        Search Another
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {feeStudentData && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: '20px' }}>
                            {/* Panel 2: Assign Fee Group / FEE PAYMENT */}
                            <div className="card-premium" style={{ padding: 0, border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                                <div style={{ background: '#10b981', color: '#ffffff', padding: '12px 20px', fontWeight: 700, fontSize: '0.92rem' }}>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                                        <span className="material-icons-outlined" style={{ fontSize: '18px' }}>chevron_right</span>
                                        Assign Fee Group
                                    </span>
                                </div>
                                <div style={{ padding: '20px' }}>
                                    <div className="d-flex justify-content-between align-items-center mb-3">
                                        <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#10b981', letterSpacing: '0.04em' }}>FEE PAYMENT</h4>
                                        <div className="d-flex gap-2">
                                            <button 
                                                type="button" 
                                                onClick={() => setShowProceedPaymentModal(true)}
                                                disabled={feeDues.length === 0}
                                                className="btn btn-sm" 
                                                style={{ border: '1px solid #10b981', color: '#ffffff', background: '#10b981', fontSize: '0.74rem', borderRadius: '6px', padding: '6px 12px', fontWeight: 600, opacity: feeDues.length === 0 ? 0.5 : 1 }}
                                            >
                                                Proceed To Payment
                                            </button>
                                        </div>
                                    </div>

                                    <div className="table-responsive">
                                        <table className="table-premium text-center" style={{ fontSize: '0.76rem' }}>
                                            <thead>
                                                <tr>
                                                    <th style={{ width: '40px' }}></th>
                                                    <th>Receipt No</th>
                                                    <th>User</th>
                                                    <th>Amount Paid</th>
                                                    <th>Fee Discount</th>
                                                    <th>Date Paid</th>
                                                    <th>Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {feeHistory.length > 0 ? (
                                                    feeHistory.slice((currentPage - 1) * 5, currentPage * 5).map((row, idx) => (
                                                        <tr key={row._id}>
                                                            <td>
                                                                <button type="button" style={{ background: 'transparent', border: '1px solid #10b981', color: '#10b981', borderRadius: '4px', width: '20px', height: '20px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>+</button>
                                                            </td>
                                                            <td>{row.receiptNo}</td>
                                                            <td>{row.user}</td>
                                                            <td style={{ fontWeight: 700 }}>{formatCurrency(row.amountPaid)}</td>
                                                            <td style={{ color: 'var(--text-muted)' }}>{formatCurrency(row.discount)}</td>
                                                            <td>{new Date(row.paymentDate).toLocaleDateString('en-GB').replace(/\//g, '-')}</td>
                                                            <td>
                                                                <span style={{ color: '#198754', border: '1px solid #198754', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer' }}>
                                                                    Edit
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <>
                                                        <tr>
                                                            <td><button type="button" disabled style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-muted)', borderRadius: '4px', width: '20px', height: '20px' }}>+</button></td>
                                                            <td>17966</td>
                                                            <td>SDPSE2</td>
                                                            <td>₹0</td>
                                                            <td>₹2,300</td>
                                                            <td>13-01-2026</td>
                                                            <td><span style={{ color: '#198754', border: '1px solid #198754', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600, opacity: 0.5 }}>Edit</span></td>
                                                        </tr>
                                                        <tr>
                                                            <td><button type="button" disabled style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-muted)', borderRadius: '4px', width: '20px', height: '20px' }}>+</button></td>
                                                            <td>19589</td>
                                                            <td>SDPSE2</td>
                                                            <td>₹2,000</td>
                                                            <td>₹0</td>
                                                            <td>01-04-2026</td>
                                                            <td><span style={{ color: '#198754', border: '1px solid #198754', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600, opacity: 0.5 }}>Edit</span></td>
                                                        </tr>
                                                    </>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>

                                    {feeHistory.length > 5 && (
                                        <div className="d-flex justify-content-end align-items-center gap-2 mt-3" style={{ fontSize: '0.75rem' }}>
                                            <button 
                                                type="button" 
                                                disabled={currentPage === 1}
                                                onClick={() => setCurrentPage(c => Math.max(1, c - 1))}
                                                style={{ background: 'transparent', border: '1px solid var(--border-color)', padding: '2px 8px', borderRadius: '4px', color: 'var(--text-main)' }}
                                            >
                                                &lt;
                                            </button>
                                            <span style={{ fontWeight: 700, color: '#10b981' }}>{currentPage}</span>
                                            <button 
                                                type="button" 
                                                disabled={currentPage * 5 >= feeHistory.length}
                                                onClick={() => setCurrentPage(c => c + 1)}
                                                style={{ background: 'transparent', border: '1px solid var(--border-color)', padding: '2px 8px', borderRadius: '4px', color: 'var(--text-main)' }}
                                            >
                                                &gt;
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Panel 3: Adjusted Fee Details / FEE DETAILS */}
                            <div className="card-premium" style={{ padding: 0, border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                                <div style={{ background: '#10b981', color: '#ffffff', padding: '12px 20px', fontWeight: 700, fontSize: '0.92rem' }}>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                                        <span className="material-icons-outlined" style={{ fontSize: '18px' }}>chevron_right</span>
                                        Adjusted Fee Details
                                    </span>
                                </div>
                                <div style={{ padding: '20px' }}>
                                    <div className="d-flex justify-content-between align-items-center mb-3">
                                        <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#10b981', letterSpacing: '0.04em' }}>FEE DETAILS</h4>
                                        <div className="d-flex gap-2">
                                            <button 
                                                type="button" 
                                                onClick={() => setShowFeeAdjustmentModal(true)}
                                                className="btn btn-sm" 
                                                style={{ border: '1px solid #10b981', color: '#ffffff', background: '#10b981', fontSize: '0.74rem', borderRadius: '6px', padding: '6px 12px', fontWeight: 600 }}
                                            >
                                                Fee Adjustment
                                            </button>
                                        </div>
                                    </div>

                                    <div className="table-responsive" style={{ maxHeight: '320px', overflowY: 'auto' }}>
                                        <table className="table-premium text-center" style={{ fontSize: '0.76rem' }}>
                                            <thead>
                                                <tr>
                                                    <th>Term</th>
                                                    <th>Total Fee</th>
                                                    <th>Fee Balance</th>
                                                    <th>Due Date</th>
                                                    <th>Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {feeDues.map((row) => {
                                                    const bal = Number(row.amountDue) - Number(row.amountPaid);
                                                    return (
                                                        <tr key={row._id}>
                                                            <td style={{ fontWeight: 700 }}>{row.monthFor.toUpperCase()}</td>
                                                            <td>{row.amountDue}</td>
                                                            <td style={{ fontWeight: 700, color: bal > 0 ? '#10b981' : 'var(--success-text)' }}>{bal}</td>
                                                            <td>{row.dueDate ? new Date(row.dueDate).toLocaleDateString('en-GB').replace(/\//g, '-') : '-'}</td>
                                                            <td>
                                                                {bal > 0 ? (
                                                                    <div className="d-flex justify-content-center gap-2">
                                                                        <button 
                                                                            type="button" 
                                                                            onClick={() => handleRemoveFeeRecord(row._id)}
                                                                            style={{ border: 'none', background: 'rgba(220,53,69,0.1)', color: '#dc3545', borderRadius: '4px', padding: '2px 8px', fontSize: '0.7rem', fontWeight: 600 }}
                                                                        >
                                                                            Remove
                                                                        </button>
                                                                        <button 
                                                                            type="button" 
                                                                            onClick={() => {
                                                                                setSelectedFeeRecord(row);
                                                                                setDueDateInput(row.dueDate ? new Date(row.dueDate).toISOString().split('T')[0] : '');
                                                                                setShowDueDateModal(true);
                                                                            }}
                                                                            style={{ border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-muted)', borderRadius: '4px', padding: '2px 8px', fontSize: '0.7rem', fontWeight: 600 }}
                                                                        >
                                                                            Set Due Date
                                                                        </button>
                                                                    </div>
                                                                ) : '-'}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Month Assigner Selector at the bottom of the Fee Details block */}
                                    <div style={{ marginTop: '16px', borderTop: '1px dashed var(--border-color)', paddingTop: '16px' }}>
                                        <label className="d-block mb-1" style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Assign New Billing Month</label>
                                        <select
                                            className="input-premium w-100"
                                            defaultValue=""
                                            disabled={assigningTerm}
                                            style={{ fontSize: '0.8rem', borderRadius: '8px' }}
                                            onChange={e => { if (e.target.value) handleAssignTermFromDesk(e.target.value); }}
                                        >
                                            <option value="" disabled>Assign fee term — Session {getSessionLabel()}</option>
                                            {getSessionMonths().map(m => {
                                                const alreadyAssigned = feeDues.some(d => d.monthFor === m);
                                                if (alreadyAssigned) return null;
                                                return <option key={m} value={m}>{m}</option>;
                                            })}
                                        </select>
                                        {assigningTerm && (
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>Assigning month...</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Modals & Overlays */}
                    
                    {/* 1. Proceed To Payment Modal */}
                    {showProceedPaymentModal && (
                        <div
                            style={{
                                position: 'fixed', inset: 0,
                                background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(12px)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                zIndex: 9999, padding: '20px'
                            }}
                            onClick={() => setShowProceedPaymentModal(false)}
                        >
                            <div
                                style={{
                                    background: 'var(--bg-color)', borderRadius: '24px',
                                    width: '100%', maxWidth: '740px', maxHeight: '92vh', overflowY: 'auto',
                                    boxShadow: '0 32px 80px rgba(0,0,0,0.4)', border: '1px solid var(--border-color)',
                                    animation: 'slide-up 0.3s cubic-bezier(0.34,1.56,0.64,1)'
                                }}
                                onClick={e => e.stopPropagation()}
                            >
                                {/* Header */}
                                <div style={{ padding: '24px 28px', borderBottom: '1px solid var(--border-color)', position: 'relative' }}>
                                    <button
                                        type="button"
                                        onClick={() => setShowProceedPaymentModal(false)}
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
                                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            boxShadow: '0 4px 14px rgba(16,185,129,0.35)', flexShrink: 0
                                        }}>
                                            <span className="material-icons-outlined" style={{ fontSize: '22px' }}>receipt_long</span>
                                        </div>
                                        <div>
                                            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', color: 'var(--text-main)' }}>
                                                Counter Fee Payment Entry
                                            </h3>
                                            <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                                                Record cash / UPI / card payment against outstanding terms
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <form onSubmit={async (e) => {
                                    await handleCollectPaymentSubmit(e);
                                    setShowProceedPaymentModal(false);
                                }} style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    {/* Row 1: Date / Receipt / Method */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>Date *</label>
                                            <input
                                                type="date" required className="input-premium"
                                                style={{ width: '100%', fontSize: '0.85rem', padding: '10px 14px', borderRadius: '10px' }}
                                                value={paymentDetails.date}
                                                onChange={e => setPaymentDetails(prev => ({ ...prev, date: e.target.value }))}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>Receipt No.</label>
                                            <input
                                                type="text" disabled className="input-premium"
                                                style={{ width: '100%', fontSize: '0.85rem', padding: '10px 14px', borderRadius: '10px', opacity: 0.6 }}
                                                value={paymentDetails.receiptNo}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>Payment Method *</label>
                                            <select
                                                className="input-premium"
                                                style={{ width: '100%', fontSize: '0.85rem', padding: '10px 14px', borderRadius: '10px' }}
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

                                    {paymentDetails.paymentMethod !== 'Cash' && (
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', background: 'rgba(16,185,129,0.06)', padding: '16px', borderRadius: '14px', border: '1px dashed rgba(16,185,129,0.4)' }}>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>Credit To Account *</label>
                                                <select className="input-premium" style={{ width: '100%', fontSize: '0.82rem', padding: '9px 12px', borderRadius: '10px' }}
                                                    value={paymentDetails.creditAccount}
                                                    onChange={e => setPaymentDetails(prev => ({ ...prev, creditAccount: e.target.value }))}
                                                >
                                                    <option value="School ICICI">School ICICI</option>
                                                    <option value="HDFC - Academy">HDFC - Academy</option>
                                                    <option value="Cash Box">Cash Box</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>UPI/Transaction Ref No. *</label>
                                                <input type="text" required placeholder="Reference Number" className="input-premium"
                                                    style={{ width: '100%', fontSize: '0.82rem', padding: '9px 12px', borderRadius: '10px' }}
                                                    value={paymentDetails.referenceNo}
                                                    onChange={e => setPaymentDetails(prev => ({ ...prev, referenceNo: e.target.value }))}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>Sender Account Name</label>
                                                <input type="text" placeholder="Account Name" className="input-premium"
                                                    style={{ width: '100%', fontSize: '0.82rem', padding: '9px 12px', borderRadius: '10px' }}
                                                    value={paymentDetails.senderAccount}
                                                    onChange={e => setPaymentDetails(prev => ({ ...prev, senderAccount: e.target.value }))}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Payment Breakdown Table */}
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                            <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Payment Breakdown</label>
                                            <input
                                                type="number" placeholder="Amount to auto-adjust..."
                                                className="input-premium"
                                                style={{ fontSize: '0.76rem', borderRadius: '8px', padding: '6px 10px', width: '190px' }}
                                                value={autoAdjustAmount}
                                                onChange={e => handleAutoAdjustChange(e.target.value)}
                                            />
                                        </div>
                                        <div className="table-responsive" style={{ maxHeight: '180px', overflowY: 'auto' }}>
                                            <table className="table-premium text-center" style={{ fontSize: '0.74rem' }}>
                                                <thead>
                                                    <tr>
                                                        <th>Term</th>
                                                        <th>Total Dues</th>
                                                        <th>Paid</th>
                                                        <th>Balance</th>
                                                        <th style={{ width: '90px' }}>Paying Now</th>
                                                        <th style={{ width: '80px' }}>Discount</th>
                                                        <th>Remaining</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {paymentRows.map((row, idx) => (
                                                        <tr key={row.feeId}>
                                                            <td style={{ fontWeight: 700 }}>{row.monthFor}</td>
                                                            <td>{formatCurrency(row.amountDue)}</td>
                                                            <td>{formatCurrency(row.amountPaid)}</td>
                                                            <td style={{ color: '#10b981', fontWeight: 700 }}>{formatCurrency(row.balanceDue)}</td>
                                                            <td>
                                                                <input 
                                                                    type="number"
                                                                    min="0"
                                                                    max={row.balanceDue}
                                                                    className="input-premium py-0 px-1 text-center"
                                                                    style={{ width: '70px', fontSize: '0.74rem', height: '24px', borderRadius: '4px' }}
                                                                    value={row.payingNow}
                                                                    onChange={e => handleRowChange(idx, 'payingNow', e.target.value)}
                                                                />
                                                            </td>
                                                            <td>
                                                                <input 
                                                                    type="number"
                                                                    min="0"
                                                                    max={row.balanceDue - row.payingNow}
                                                                    className="input-premium py-0 px-1 text-center"
                                                                    style={{ width: '60px', fontSize: '0.74rem', height: '24px', borderRadius: '4px' }}
                                                                    value={row.discount}
                                                                    onChange={e => handleRowChange(idx, 'discount', e.target.value)}
                                                                />
                                                            </td>
                                                            <td style={{ fontWeight: 700, color: row.afterPayment > 0 ? '#10b981' : 'var(--success-text)' }}>
                                                                {formatCurrency(row.afterPayment)}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Summary Banner */}
                                    <div style={{
                                        background: 'linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(16,185,129,0.04) 100%)',
                                        border: '1px solid rgba(16,185,129,0.2)', borderRadius: '14px',
                                        padding: '16px 20px', display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'center'
                                    }}>
                                        {[
                                            { label: 'Due', value: formatCurrency(totalDue), color: 'var(--text-main)' },
                                            { label: 'Paying', value: formatCurrency(totalPaying), color: '#10b981' },
                                            { label: 'Discount', value: formatCurrency(totalDiscount), color: 'var(--text-main)' },
                                            { label: 'Remaining', value: formatCurrency(remainingBalance), color: remainingBalance > 0 ? '#10b981' : 'var(--success-text)' },
                                        ].map(({ label, value, color }) => (
                                            <div key={label}>
                                                <div style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                                                <div style={{ fontSize: '1.05rem', fontWeight: 800, color, marginTop: '1px' }}>{value}</div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Remarks */}
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>Remarks Note</label>
                                        <textarea
                                            placeholder="Remarks or waiver reasons..."
                                            className="input-premium"
                                            style={{ width: '100%', minHeight: '60px', fontSize: '0.82rem', borderRadius: '10px', resize: 'vertical' }}
                                            value={paymentDetails.remarks}
                                            onChange={e => setPaymentDetails(prev => ({ ...prev, remarks: e.target.value }))}
                                        />
                                    </div>

                                    {/* Footer */}
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '4px' }}>
                                        <button
                                            type="button"
                                            onClick={() => setShowProceedPaymentModal(false)}
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
                                            disabled={billingLoading || totalPaying === 0}
                                            style={{
                                                padding: '10px 24px',
                                                background: (billingLoading || totalPaying === 0) ? 'rgba(16,185,129,0.4)' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                                color: '#fff', border: 'none', borderRadius: '10px',
                                                cursor: (billingLoading || totalPaying === 0) ? 'not-allowed' : 'pointer',
                                                fontSize: '0.82rem', fontWeight: 700,
                                                boxShadow: '0 4px 12px rgba(16,185,129,0.3)',
                                                display: 'flex', alignItems: 'center', gap: '6px',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            <span className="material-icons-outlined" style={{ fontSize: '16px' }}>check_circle</span>
                                            {billingLoading ? 'Processing...' : 'Record Counter Payment'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* 2. Fee Adjustment Modal */}
                    {showFeeAdjustmentModal && (
                        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(5px)' }}>
                            <div style={{ background: 'var(--bg-surface, #ffffff)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px', width: '90%', maxWidth: '400px', boxShadow: '0 20px 60px rgba(0,0,0,0.45)' }}>
                                <div className="d-flex justify-content-between align-items-center mb-3 border-bottom pb-2" style={{ borderColor: 'var(--border-color)' }}>
                                    <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#10b981' }}>Tuition Fee Adjustment</h4>
                                    <button type="button" className="btn-close" aria-label="Close" onClick={() => setShowFeeAdjustmentModal(false)} style={{ filter: 'invert(1)', opacity: 0.8 }}></button>
                                </div>
                                <form onSubmit={handleAdjustFeeSubmit} className="d-flex flex-column gap-3">
                                    <div>
                                        <label className="d-block mb-1" style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Monthly Fee Amount (₹) *</label>
                                        <input 
                                            type="number"
                                            required
                                            min="0"
                                            placeholder="e.g. 1000"
                                            className="input-premium w-100"
                                            value={adjustedFeeValue}
                                            onChange={e => setAdjustedFeeValue(e.target.value)}
                                        />
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                            Standard default fee for {feeStudentData.sport} academy: ₹{feeStudentData.monthlyFee || '2000'}
                                        </div>
                                    </div>
                                    <div className="d-flex justify-content-end gap-2 mt-2">
                                        <button type="button" className="btn btn-secondary py-2 px-3" onClick={() => setShowFeeAdjustmentModal(false)} style={{ fontSize: '0.8rem', borderRadius: '8px' }}>
                                            Cancel
                                        </button>
                                        <button 
                                            type="submit"
                                            disabled={billingLoading}
                                            className="btn text-white py-2 px-3" 
                                            style={{ background: '#10b981', border: '1px solid #10b981', fontSize: '0.8rem', borderRadius: '8px', fontWeight: 700 }}
                                        >
                                            {billingLoading ? 'Saving...' : 'Save Rules'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* 3. Set Due Date Modal */}
                    {showDueDateModal && (
                        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(5px)' }}>
                            <div style={{ background: 'var(--bg-surface, #ffffff)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px', width: '90%', maxWidth: '400px', boxShadow: '0 20px 60px rgba(0,0,0,0.45)' }}>
                                <div className="d-flex justify-content-between align-items-center mb-3 border-bottom pb-2" style={{ borderColor: 'var(--border-color)' }}>
                                    <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#10b981' }}>Set Monthly Due Date</h4>
                                    <button type="button" className="btn-close" aria-label="Close" onClick={() => setShowDueDateModal(false)} style={{ filter: 'invert(1)', opacity: 0.8 }}></button>
                                </div>
                                <div className="d-flex flex-column gap-3">
                                    <div>
                                        <label className="d-block mb-1" style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Select Due Date *</label>
                                        <input 
                                            type="date"
                                            required
                                            className="input-premium w-100"
                                            value={dueDateInput}
                                            onChange={e => setDueDateInput(e.target.value)}
                                        />
                                    </div>
                                    <div className="d-flex justify-content-end gap-2 mt-2">
                                        <button type="button" className="btn btn-secondary py-2 px-3" onClick={() => setShowDueDateModal(false)} style={{ fontSize: '0.8rem', borderRadius: '8px' }}>
                                            Cancel
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={handleSetDueDate}
                                            disabled={billingLoading}
                                            className="btn text-white py-2 px-3" 
                                            style={{ background: '#10b981', border: '1px solid #10b981', fontSize: '0.8rem', borderRadius: '8px', fontWeight: 700 }}
                                        >
                                            {billingLoading ? 'Updating...' : 'Set Due Date'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
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
