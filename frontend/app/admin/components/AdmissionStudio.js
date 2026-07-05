'use client';

import React, { useState, useEffect, useMemo } from 'react';

const SPORTS = [
    { id: 'cricket', label: 'Cricket', icon: 'sports_cricket', tagline: 'Nets, drills & match practice' },
    { id: 'football', label: 'Football', icon: 'sports_soccer', tagline: 'Turf training & league prep' }
];

const DEFAULT_PLAN = { oneTimeAdmissionFee: 1500, monthlyFee: 2000, lateFeePenalty: 0, dueDayOfMonth: 5 };

const formatINR = (v) => `₹${(Number(v) || 0).toLocaleString('en-IN')}`;

const calcAge = (dob) => {
    if (!dob) return '';
    const d = new Date(dob);
    if (isNaN(d)) return '';
    const diff = Date.now() - d.getTime();
    return Math.max(0, Math.floor(diff / (365.25 * 24 * 3600 * 1000)));
};

export default function AdmissionStudio({ backendUrl, getHeaders, batchesList, onRefresh, onCollectPayment, notifySuccess, notifyError }) {
    const [view, setView] = useState('wizard'); // 'wizard' | 'plans'
    const [step, setStep] = useState(1);
    const [submitting, setSubmitting] = useState(false);
    const [enrolled, setEnrolled] = useState(null); // created student after success

    // ─── Fee plans (per sport) ───
    const [plans, setPlans] = useState({}); // { cricket: {...}, football: {...} }
    const [plansDraft, setPlansDraft] = useState({});
    const [plansLoading, setPlansLoading] = useState(true);
    const [plansSaving, setPlansSaving] = useState(false);

    const loadPlans = async () => {
        setPlansLoading(true);
        try {
            const res = await fetch(`${backendUrl}/api/academy/fee-structure`, { headers: getHeaders(), credentials: 'include' });
            const data = await res.json();
            if (res.ok && Array.isArray(data)) {
                const next = {};
                data.forEach(s => { next[s.sport] = s; });
                setPlans(next);
                const draft = {};
                SPORTS.forEach(sp => {
                    const src = next[sp.id] || next['all'] || DEFAULT_PLAN;
                    draft[sp.id] = {
                        oneTimeAdmissionFee: src.oneTimeAdmissionFee ?? 1500,
                        monthlyFee: src.monthlyFee ?? 2000,
                        lateFeePenalty: src.lateFeePenalty ?? 0,
                        dueDayOfMonth: src.dueDayOfMonth ?? 5
                    };
                });
                setPlansDraft(draft);
            }
        } catch (e) {
            console.error('Failed to load fee plans:', e);
        } finally {
            setPlansLoading(false);
        }
    };

    useEffect(() => { loadPlans(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const planFor = (sportId) => {
        const p = plans[sportId] || plans['all'];
        return {
            oneTimeAdmissionFee: p?.oneTimeAdmissionFee ?? DEFAULT_PLAN.oneTimeAdmissionFee,
            monthlyFee: p?.monthlyFee ?? DEFAULT_PLAN.monthlyFee,
            lateFeePenalty: p?.lateFeePenalty ?? DEFAULT_PLAN.lateFeePenalty,
            dueDayOfMonth: p?.dueDayOfMonth ?? DEFAULT_PLAN.dueDayOfMonth
        };
    };

    const savePlans = async () => {
        setPlansSaving(true);
        try {
            const structures = SPORTS.map(sp => ({ sport: sp.id, ...plansDraft[sp.id] }));
            const res = await fetch(`${backendUrl}/api/academy/fee-structure`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', ...getHeaders() },
                credentials: 'include',
                body: JSON.stringify({ structures })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to save fee plans.');
            notifySuccess?.('Fee plans updated for all sports.');
            await loadPlans();
        } catch (e) {
            notifyError?.(e.message);
        } finally {
            setPlansSaving(false);
        }
    };

    // ─── Wizard state ───
    const [form, setForm] = useState({
        sport: '',
        name: '', dateOfBirth: '', gender: 'Male', schoolName: '', classGrade: '',
        guardianName: '', guardianMobile: '', email: '', medicalConditions: '',
        batchId: '', batchTime: '',
        feeOverride: '' // optional custom monthly fee
    });
    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const sportBatches = useMemo(
        () => (batchesList || []).filter(b => b.status !== 'INACTIVE' && (b.sport || '').toLowerCase() === form.sport),
        [batchesList, form.sport]
    );

    const activePlan = form.sport ? planFor(form.sport) : DEFAULT_PLAN;
    const effectiveMonthly = form.feeOverride !== '' ? Number(form.feeOverride) : activePlan.monthlyFee;

    const stepValid = () => {
        if (step === 1) return !!form.sport;
        if (step === 2) return form.name.trim() && form.dateOfBirth && form.guardianName.trim() && /^\+?[\d\s-]{10,}$/.test(form.guardianMobile.trim());
        if (step === 3) return !!form.batchTime;
        return true;
    };

    const selectBatch = (b) => {
        setForm(f => ({ ...f, batchId: b._id, batchTime: `${b.startTime}-${b.endTime}` }));
    };

    const resetWizard = () => {
        setForm({ sport: '', name: '', dateOfBirth: '', gender: 'Male', schoolName: '', classGrade: '', guardianName: '', guardianMobile: '', email: '', medicalConditions: '', batchId: '', batchTime: '', feeOverride: '' });
        setStep(1);
        setEnrolled(null);
    };

    const submitAdmission = async () => {
        setSubmitting(true);
        try {
            const payload = {
                name: form.name.trim(),
                dateOfBirth: form.dateOfBirth,
                age: calcAge(form.dateOfBirth),
                gender: form.gender,
                schoolName: form.schoolName.trim(),
                classGrade: form.classGrade.trim(),
                guardianName: form.guardianName.trim(),
                guardianMobile: form.guardianMobile.trim(),
                email: form.email.trim(),
                medicalConditions: form.medicalConditions.trim(),
                sport: form.sport,
                batchTime: form.batchTime,
                oneTimeAdmissionFee: activePlan.oneTimeAdmissionFee,
                monthlyFee: activePlan.monthlyFee,
                adjustedFee: form.feeOverride !== '' ? Number(form.feeOverride) : undefined
            };
            const res = await fetch(`${backendUrl}/api/academy/students`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...getHeaders() },
                credentials: 'include',
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Admission failed.');
            const student = data.student || data;

            // Assign to the chosen batch (best-effort — admission already succeeded)
            if (form.batchId && student?._id) {
                try {
                    await fetch(`${backendUrl}/api/academy/batches/${form.batchId}/assign`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', ...getHeaders() },
                        credentials: 'include',
                        body: JSON.stringify({ studentId: student._id })
                    });
                } catch (e) {
                    console.error('Batch assignment failed:', e);
                }
            }

            setEnrolled(student);
            notifySuccess?.(`${student.name} enrolled with ID ${student.membershipId || ''}`.trim());
            onRefresh?.();
        } catch (e) {
            notifyError?.(e.message);
        } finally {
            setSubmitting(false);
        }
    };

    const STEPS = ['Sport & Plan', 'Student Details', 'Batch', 'Review & Enroll'];

    // ═══════════════════ RENDER ═══════════════════
    return (
        <div className="admission-studio" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* View switcher */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button className={`sub-tab-link ${view === 'wizard' ? 'active' : ''}`} onClick={() => setView('wizard')}>
                    <span className="material-icons-outlined" style={{ fontSize: '15px', verticalAlign: '-3px', marginRight: '6px' }}>how_to_reg</span>
                    New Admission
                </button>
                <button className={`sub-tab-link ${view === 'plans' ? 'active' : ''}`} onClick={() => setView('plans')}>
                    <span className="material-icons-outlined" style={{ fontSize: '15px', verticalAlign: '-3px', marginRight: '6px' }}>payments</span>
                    Fee Plans
                </button>
            </div>

            {/* ═══ FEE PLANS EDITOR ═══ */}
            {view === 'plans' && (
                <div className="card-premium">
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '1.05rem' }}>Sport Fee Plans</h3>
                    <p style={{ margin: '0 0 18px 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        Each sport carries its own admission fee and monthly tuition. New admissions automatically pick up the plan for their sport.
                    </p>
                    {plansLoading ? (
                        <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading plans…</div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                            {SPORTS.map(sp => (
                                <div key={sp.id} className="plan-card">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                                        <span className="material-icons-outlined plan-card__icon">{sp.icon}</span>
                                        <div>
                                            <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>{sp.label}</div>
                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{sp.tagline}</div>
                                        </div>
                                    </div>
                                    {['oneTimeAdmissionFee', 'monthlyFee', 'lateFeePenalty', 'dueDayOfMonth'].map(field => (
                                        <div key={field} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '10px' }}>
                                            <label style={{ margin: 0, flexShrink: 0 }}>
                                                {field === 'oneTimeAdmissionFee' ? 'Admission Fee' : field === 'monthlyFee' ? 'Monthly Fee' : field === 'lateFeePenalty' ? 'Late Penalty' : 'Due Day'}
                                            </label>
                                            <input
                                                type="number"
                                                min={field === 'dueDayOfMonth' ? 1 : 0}
                                                max={field === 'dueDayOfMonth' ? 28 : undefined}
                                                className="input-premium"
                                                style={{ width: '120px', textAlign: 'right' }}
                                                value={plansDraft[sp.id]?.[field] ?? ''}
                                                onChange={e => setPlansDraft(d => ({ ...d, [sp.id]: { ...d[sp.id], [field]: e.target.value } }))}
                                            />
                                        </div>
                                    ))}
                                    <div style={{ marginTop: '12px', padding: '10px 12px', borderRadius: '10px', background: 'var(--primary-light)', fontSize: '0.78rem', display: 'flex', justifyContent: 'space-between' }}>
                                        <span>First payment</span>
                                        <strong>{formatINR(Number(plansDraft[sp.id]?.oneTimeAdmissionFee || 0) + Number(plansDraft[sp.id]?.monthlyFee || 0))}</strong>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    <div style={{ marginTop: '18px', display: 'flex', justifyContent: 'flex-end' }}>
                        <button className="btn-primary-stripe" onClick={savePlans} disabled={plansSaving || plansLoading}>
                            {plansSaving ? 'Saving…' : 'Save All Plans'}
                        </button>
                    </div>
                </div>
            )}

            {/* ═══ ADMISSION WIZARD ═══ */}
            {view === 'wizard' && !enrolled && (
                <div className="card-premium" style={{ overflow: 'visible' }}>
                    {/* Stepper */}
                    <div className="stepper" role="list" aria-label="Admission steps">
                        {STEPS.map((label, i) => {
                            const n = i + 1;
                            const state = n < step ? 'done' : n === step ? 'current' : 'todo';
                            return (
                                <div key={label} className={`stepper__item stepper__item--${state}`} role="listitem" aria-current={n === step ? 'step' : undefined}>
                                    <span className="stepper__dot">
                                        {state === 'done' ? <span className="material-icons-outlined" style={{ fontSize: '14px' }}>check</span> : n}
                                    </span>
                                    <span className="stepper__label">{label}</span>
                                    {i < STEPS.length - 1 && <span className="stepper__bar" aria-hidden="true" />}
                                </div>
                            );
                        })}
                    </div>

                    {/* STEP 1 — Sport & plan */}
                    {step === 1 && (
                        <div>
                            <h3 style={{ margin: '0 0 14px 0', fontSize: '1rem' }}>Choose a Program</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                                {SPORTS.map(sp => {
                                    const p = planFor(sp.id);
                                    const selected = form.sport === sp.id;
                                    return (
                                        <button
                                            key={sp.id}
                                            type="button"
                                            className={`sport-card ${selected ? 'sport-card--selected' : ''}`}
                                            onClick={() => set('sport', sp.id)}
                                            aria-pressed={selected}
                                        >
                                            <span className="material-icons-outlined sport-card__icon">{sp.icon}</span>
                                            <div style={{ textAlign: 'left', flex: 1 }}>
                                                <div style={{ fontWeight: 800, fontSize: '1rem' }}>{sp.label}</div>
                                                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>{sp.tagline}</div>
                                                <div className="sport-card__price">
                                                    {formatINR(p.monthlyFee)}<span style={{ fontSize: '0.7rem', fontWeight: 500, color: 'var(--text-muted)' }}>/month</span>
                                                    <span className="sport-card__admission">+ {formatINR(p.oneTimeAdmissionFee)} admission</span>
                                                </div>
                                            </div>
                                            {selected && <span className="material-icons-outlined" style={{ color: 'var(--primary)' }}>check_circle</span>}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* STEP 2 — Student details */}
                    {step === 2 && (
                        <div>
                            <h3 style={{ margin: '0 0 14px 0', fontSize: '1rem' }}>Student &amp; Guardian Details</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '14px' }}>
                                <div>
                                    <label>Student Name *</label>
                                    <input className="input-premium" style={{ width: '100%' }} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Full name" />
                                </div>
                                <div>
                                    <label>Date of Birth *</label>
                                    <input type="date" className="input-premium" style={{ width: '100%' }} value={form.dateOfBirth} onChange={e => set('dateOfBirth', e.target.value)} />
                                    {form.dateOfBirth && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>Age: {calcAge(form.dateOfBirth)} years</div>}
                                </div>
                                <div>
                                    <label>Gender</label>
                                    <select className="input-premium" style={{ width: '100%' }} value={form.gender} onChange={e => set('gender', e.target.value)}>
                                        <option>Male</option><option>Female</option><option>Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label>Guardian Name *</label>
                                    <input className="input-premium" style={{ width: '100%' }} value={form.guardianName} onChange={e => set('guardianName', e.target.value)} placeholder="Parent / guardian" />
                                </div>
                                <div>
                                    <label>Guardian Mobile *</label>
                                    <input className="input-premium" style={{ width: '100%' }} value={form.guardianMobile} onChange={e => set('guardianMobile', e.target.value)} placeholder="+91 99999 88888" />
                                </div>
                                <div>
                                    <label>Email</label>
                                    <input type="email" className="input-premium" style={{ width: '100%' }} value={form.email} onChange={e => set('email', e.target.value)} placeholder="Optional" />
                                </div>
                                <div>
                                    <label>School</label>
                                    <input className="input-premium" style={{ width: '100%' }} value={form.schoolName} onChange={e => set('schoolName', e.target.value)} placeholder="Optional" />
                                </div>
                                <div>
                                    <label>Class / Grade</label>
                                    <input className="input-premium" style={{ width: '100%' }} value={form.classGrade} onChange={e => set('classGrade', e.target.value)} placeholder="Optional" />
                                </div>
                            </div>
                            <div style={{ marginTop: '14px' }}>
                                <label>Medical Notes</label>
                                <textarea className="input-premium" style={{ width: '100%', minHeight: '64px', resize: 'vertical' }} value={form.medicalConditions} onChange={e => set('medicalConditions', e.target.value)} placeholder="Allergies, conditions the coach should know (optional)" />
                            </div>
                        </div>
                    )}

                    {/* STEP 3 — Batch assignment */}
                    {step === 3 && (
                        <div>
                            <h3 style={{ margin: '0 0 4px 0', fontSize: '1rem' }}>Assign a Batch</h3>
                            <p style={{ margin: '0 0 14px 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                Showing active {form.sport} batches. The student trains in this slot.
                            </p>
                            {sportBatches.length > 0 ? (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '12px' }}>
                                    {sportBatches.map(b => {
                                        const filled = (b.members || []).length;
                                        const cap = b.capacity || 20;
                                        const pct = Math.min(100, Math.round((filled / cap) * 100));
                                        const full = filled >= cap;
                                        const selected = form.batchId === b._id;
                                        return (
                                            <button
                                                key={b._id}
                                                type="button"
                                                disabled={full}
                                                className={`batch-card ${selected ? 'batch-card--selected' : ''}`}
                                                onClick={() => selectBatch(b)}
                                                aria-pressed={selected}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                                    <strong style={{ fontSize: '0.9rem' }}>{b.name}</strong>
                                                    {selected && <span className="material-icons-outlined" style={{ color: 'var(--primary)', fontSize: '18px' }}>check_circle</span>}
                                                </div>
                                                <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', margin: '4px 0 8px' }}>
                                                    {b.startTime} – {b.endTime}{b.groundId ? ` · ${b.groundId}` : ''}
                                                </div>
                                                <div className="batch-card__meter" aria-hidden="true"><span style={{ width: `${pct}%` }} /></div>
                                                <div style={{ fontSize: '0.7rem', color: full ? 'var(--danger, #e5484d)' : 'var(--text-muted)', marginTop: '5px' }}>
                                                    {full ? 'Batch full' : `${filled}/${cap} enrolled`}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div style={{ padding: '18px', borderRadius: '12px', border: '1px dashed var(--border-color)', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                    No active {form.sport} batches found. Pick a time slot manually — you can create batches under Academy → Batches.
                                </div>
                            )}
                            <div style={{ marginTop: '16px', maxWidth: '320px' }}>
                                <label>Or set a custom slot</label>
                                <select className="input-premium" style={{ width: '100%' }} value={form.batchId ? '' : form.batchTime} onChange={e => setForm(f => ({ ...f, batchId: '', batchTime: e.target.value }))}>
                                    <option value="">Select time slot…</option>
                                    <option value="06:00-08:00 AM">06:00 – 08:00 AM</option>
                                    <option value="08:00-10:00 AM">08:00 – 10:00 AM</option>
                                    <option value="04:00-06:00 PM">04:00 – 06:00 PM</option>
                                    <option value="06:00-08:00 PM">06:00 – 08:00 PM</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {/* STEP 4 — Review */}
                    {step === 4 && (
                        <div>
                            <h3 style={{ margin: '0 0 14px 0', fontSize: '1rem' }}>Review &amp; Enroll</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
                                <div className="review-box">
                                    <div className="review-box__title">Student</div>
                                    <ReviewRow label="Name" value={form.name} />
                                    <ReviewRow label="Age" value={form.dateOfBirth ? `${calcAge(form.dateOfBirth)} yrs (${form.dateOfBirth})` : '—'} />
                                    <ReviewRow label="Guardian" value={`${form.guardianName} · ${form.guardianMobile}`} />
                                    <ReviewRow label="Program" value={SPORTS.find(s => s.id === form.sport)?.label || form.sport} />
                                    <ReviewRow label="Batch" value={form.batchTime} />
                                </div>
                                <div className="review-box">
                                    <div className="review-box__title">Fee Plan ({SPORTS.find(s => s.id === form.sport)?.label})</div>
                                    <ReviewRow label="Admission fee (one-time)" value={formatINR(activePlan.oneTimeAdmissionFee)} />
                                    <ReviewRow label="Standard monthly fee" value={formatINR(activePlan.monthlyFee)} />
                                    <ReviewRow label="Fee due day" value={`${activePlan.dueDayOfMonth} of every month`} />
                                    <div style={{ marginTop: '10px' }}>
                                        <label>Custom monthly fee (optional)</label>
                                        <input
                                            type="number" min="0"
                                            className="input-premium"
                                            style={{ width: '100%' }}
                                            placeholder={`Default ${formatINR(activePlan.monthlyFee)}`}
                                            value={form.feeOverride}
                                            onChange={e => set('feeOverride', e.target.value)}
                                        />
                                    </div>
                                    <div style={{ marginTop: '12px', padding: '12px 14px', borderRadius: '10px', background: 'var(--primary-light)', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                        <span>Due at admission</span>
                                        <strong>{formatINR(Number(activePlan.oneTimeAdmissionFee) + Number(effectiveMonthly))}</strong>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Wizard footer nav */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '22px', gap: '10px' }}>
                        <button
                            type="button"
                            className="btn-ghost"
                            onClick={() => setStep(s => Math.max(1, s - 1))}
                            style={{ visibility: step === 1 ? 'hidden' : 'visible' }}
                        >
                            <span className="material-icons-outlined" style={{ fontSize: '16px', verticalAlign: '-3px' }}>arrow_back</span> Back
                        </button>
                        {step < 4 ? (
                            <button type="button" className="btn-primary-stripe" disabled={!stepValid()} onClick={() => setStep(s => s + 1)}>
                                Continue <span className="material-icons-outlined" style={{ fontSize: '16px', verticalAlign: '-3px' }}>arrow_forward</span>
                            </button>
                        ) : (
                            <button type="button" className="btn-primary-stripe" disabled={submitting} onClick={submitAdmission}>
                                {submitting ? 'Enrolling…' : 'Confirm Admission'}
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* ═══ SUCCESS SCREEN ═══ */}
            {view === 'wizard' && enrolled && (
                <div className="card-premium" style={{ textAlign: 'center', padding: '40px 24px' }}>
                    <div className="success-burst" aria-hidden="true">
                        <span className="material-icons-outlined">celebration</span>
                    </div>
                    <h3 style={{ margin: '16px 0 6px', fontSize: '1.2rem' }}>{enrolled.name} is enrolled</h3>
                    <p style={{ margin: '0 0 4px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        Membership ID <strong style={{ color: 'var(--primary)' }}>{enrolled.membershipId}</strong> · {SPORTS.find(s => s.id === form.sport)?.label} · {form.batchTime}
                    </p>
                    <p style={{ margin: '0 0 22px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        First payment due: {formatINR(Number(activePlan.oneTimeAdmissionFee) + Number(effectiveMonthly))} (admission + first month)
                    </p>
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button className="btn-primary-stripe" onClick={() => onCollectPayment?.(enrolled)}>
                            <span className="material-icons-outlined" style={{ fontSize: '16px', verticalAlign: '-3px' }}>point_of_sale</span> Collect First Payment
                        </button>
                        <button className="btn-ghost" onClick={resetWizard}>
                            <span className="material-icons-outlined" style={{ fontSize: '16px', verticalAlign: '-3px' }}>person_add</span> New Admission
                        </button>
                    </div>
                </div>
            )}

            <style jsx global>{`
                .admission-studio .sport-card,
                .admission-studio .batch-card {
                    display: flex;
                    align-items: center;
                    gap: 14px;
                    padding: 18px;
                    border-radius: 14px;
                    border: 1px solid var(--border-color);
                    background: rgba(255, 255, 255, 0.02);
                    cursor: pointer;
                    text-align: left;
                    transition: border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
                }
                .admission-studio .batch-card {
                    flex-direction: column;
                    align-items: stretch;
                    gap: 0;
                }
                .admission-studio .sport-card:hover:not(:disabled),
                .admission-studio .batch-card:hover:not(:disabled) {
                    border-color: rgba(15, 143, 106, 0.4);
                    transform: translateY(-2px);
                    box-shadow: var(--shadow-md);
                }
                .admission-studio .sport-card--selected,
                .admission-studio .batch-card--selected {
                    border-color: var(--primary) !important;
                    background: var(--primary-light);
                    box-shadow: 0 0 0 3px var(--primary-light);
                }
                .admission-studio .batch-card:disabled {
                    opacity: 0.55;
                    cursor: not-allowed;
                }
                .admission-studio .sport-card__icon {
                    font-size: 32px !important;
                    color: var(--primary);
                    width: 56px;
                    height: 56px;
                    border-radius: 14px;
                    background: var(--primary-light);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }
                .admission-studio .sport-card__price {
                    margin-top: 8px;
                    font-weight: 800;
                    font-size: 1.05rem;
                    color: var(--text-main);
                }
                .admission-studio .sport-card__admission {
                    display: block;
                    font-size: 0.7rem;
                    font-weight: 500;
                    color: var(--text-muted);
                    margin-top: 2px;
                }
                .admission-studio .batch-card__meter {
                    height: 6px;
                    border-radius: 6px;
                    background: rgba(255, 255, 255, 0.07);
                    overflow: hidden;
                }
                .admission-studio .batch-card__meter span {
                    display: block;
                    height: 100%;
                    border-radius: 6px;
                    background: var(--gradient-1);
                    transition: width 0.4s ease;
                }
                .admission-studio .plan-card {
                    border: 1px solid var(--border-color);
                    border-radius: 14px;
                    padding: 18px;
                    background: rgba(255, 255, 255, 0.02);
                    transition: border-color 0.2s ease, box-shadow 0.2s ease;
                }
                .admission-studio .plan-card:hover {
                    border-color: rgba(15, 143, 106, 0.35);
                    box-shadow: var(--shadow-md);
                }
                .admission-studio .plan-card__icon {
                    font-size: 24px !important;
                    color: var(--primary);
                    width: 42px;
                    height: 42px;
                    border-radius: 12px;
                    background: var(--primary-light);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .admission-studio .stepper {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    margin-bottom: 24px;
                    flex-wrap: wrap;
                }
                .admission-studio .stepper__item {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    flex: 1;
                    min-width: 120px;
                }
                .admission-studio .stepper__dot {
                    width: 28px;
                    height: 28px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 0.75rem;
                    font-weight: 700;
                    border: 1px solid var(--border-color);
                    color: var(--text-muted);
                    background: rgba(255, 255, 255, 0.03);
                    flex-shrink: 0;
                    transition: background 0.25s ease, color 0.25s ease, border-color 0.25s ease;
                }
                .admission-studio .stepper__item--current .stepper__dot {
                    background: var(--gradient-1);
                    color: #fff;
                    border-color: transparent;
                    box-shadow: 0 0 0 4px var(--primary-light);
                }
                .admission-studio .stepper__item--done .stepper__dot {
                    background: var(--primary-light);
                    color: var(--primary);
                    border-color: var(--primary);
                }
                .admission-studio .stepper__label {
                    font-size: 0.74rem;
                    font-weight: 600;
                    color: var(--text-muted);
                    white-space: nowrap;
                }
                .admission-studio .stepper__item--current .stepper__label {
                    color: var(--text-main);
                }
                .admission-studio .stepper__bar {
                    flex: 1;
                    height: 2px;
                    min-width: 12px;
                    background: var(--border-color);
                    border-radius: 2px;
                }
                .admission-studio .stepper__item--done .stepper__bar {
                    background: var(--primary);
                }
                .admission-studio .review-box {
                    border: 1px solid var(--border-color);
                    border-radius: 14px;
                    padding: 16px 18px;
                    background: rgba(255, 255, 255, 0.02);
                }
                .admission-studio .review-box__title {
                    font-size: 0.72rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.07em;
                    color: var(--primary);
                    margin-bottom: 10px;
                }
                .admission-studio .review-row {
                    display: flex;
                    justify-content: space-between;
                    gap: 12px;
                    padding: 6px 0;
                    font-size: 0.82rem;
                    border-bottom: 1px dashed var(--border-color);
                }
                .admission-studio .review-row:last-of-type {
                    border-bottom: none;
                }
                .admission-studio .review-row__label {
                    color: var(--text-muted);
                    flex-shrink: 0;
                }
                .admission-studio .btn-ghost {
                    padding: 10px 18px;
                    border-radius: 10px;
                    border: 1px solid var(--border-color);
                    background: transparent;
                    color: var(--text-main);
                    font-weight: 600;
                    font-size: 0.85rem;
                    cursor: pointer;
                    transition: background 0.2s ease, border-color 0.2s ease;
                }
                .admission-studio .btn-ghost:hover {
                    background: var(--surface-tint);
                    border-color: rgba(15, 143, 106, 0.35);
                }
                .admission-studio .success-burst {
                    width: 72px;
                    height: 72px;
                    margin: 0 auto;
                    border-radius: 50%;
                    background: var(--gradient-1);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 0 0 10px var(--primary-light), 0 14px 34px rgba(15, 143, 106, 0.35);
                    animation: burst-in 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
                }
                .admission-studio .success-burst .material-icons-outlined {
                    font-size: 34px;
                    color: #fff;
                }
                @keyframes burst-in {
                    from { transform: scale(0.4); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
                @media (prefers-reduced-motion: reduce) {
                    .admission-studio .success-burst { animation: none; }
                    .admission-studio .sport-card:hover,
                    .admission-studio .batch-card:hover { transform: none; }
                }
            `}</style>
        </div>
    );
}

function ReviewRow({ label, value }) {
    return (
        <div className="review-row">
            <span className="review-row__label">{label}</span>
            <span style={{ fontWeight: 600, textAlign: 'right' }}>{value || '—'}</span>
        </div>
    );
}
