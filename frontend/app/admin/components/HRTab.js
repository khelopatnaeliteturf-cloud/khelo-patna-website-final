"use client";

import React, { useState } from 'react';
import { ROLE_PERMISSIONS } from '../../../lib/roles';

export default function HRTab({ 
    staffList, 
    onRegisterStaff, 
    backendUrl, 
    getHeaders, 
    onRefresh 
}) {
    const [subTab, setSubTab] = useState('directory'); // 'directory', 'register', 'payroll'
    const [loading, setLoading] = useState(false);

    // Form states for single unified user registration
    const [newStaff, setNewStaff] = useState({ name: '', phone: '', username: '', password: '', role: 'RECEPTIONIST' });

    const handleCreateStaff = async (e) => {
        e.preventDefault();
        setLoading(true);
        const success = await onRegisterStaff(newStaff);
        setLoading(false);
        if (success) {
            setSubTab('directory');
            setNewStaff({ name: '', phone: '', username: '', password: '', role: 'RECEPTIONIST' });
        }
    };

    return (
        <div className="animate-fade-in">
            {/* Header & Sub Nav */}
            <div className="d-flex align-items-center justify-content-between mb-4 border-bottom pb-3">
                <div className="d-flex gap-3">
                    <button className={`sub-tab-link ${subTab === 'directory' ? 'active' : ''}`} onClick={() => setSubTab('directory')}>Staff Directory ({staffList ? staffList.length : 0})</button>
                    <button className={`sub-tab-link ${subTab === 'register' ? 'active' : ''}`} onClick={() => setSubTab('register')}>Register New User</button>
                    <button className={`sub-tab-link ${subTab === 'payroll' ? 'active' : ''}`} onClick={() => setSubTab('payroll')}>Payroll Processing</button>
                </div>

                <button 
                    className="btn-primary-stripe" 
                    onClick={() => setSubTab('register')}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontSize: '0.85rem' }}
                >
                    <span className="material-icons-outlined" style={{ fontSize: '18px' }}>person_add</span>
                    + Add New User
                </button>
            </div>

            {/* List */}
            {subTab === 'directory' && (
                <div className="card-premium">
                    <div className="table-responsive">
                        <table className="table-premium">
                            <thead>
                                <tr>
                                    <th>Full Name</th>
                                    <th>Username</th>
                                    <th>Phone Contact</th>
                                    <th>Designation Role</th>
                                    <th>Privileges Summary</th>
                                </tr>
                            </thead>
                            <tbody>
                                {staffList && staffList.length > 0 ? (
                                    staffList.map((s, idx) => (
                                        <tr key={s.id || s._id || idx}>
                                            <td><strong>{s.name || s.username}</strong></td>
                                            <td style={{ opacity: 0.85 }}>{s.username}</td>
                                            <td>{s.phone || '—'}</td>
                                            <td>
                                                <span className={`badge-pill ${s.role === 'SUPER_ADMIN' || s.role === 'ACADEMY_OWNER' ? 'badge-danger' : 'badge-primary'}`}>
                                                    {s.role}
                                                </span>
                                            </td>
                                            <td>
                                                {ROLE_PERMISSIONS[s.role] || 'Standard staff access'}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="5" className="text-center py-4 text-muted">
                                            No users found. Click <strong>+ Add New User</strong> above to register staff.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Single Unified Register User Form */}
            {subTab === 'register' && (
                <div className="card-premium" style={{ maxWidth: '600px' }}>
                    <div className="d-flex align-items-center justify-content-between mb-4">
                        <h3 className="m-0" style={{ fontSize: '1.2rem', fontWeight: 700 }}>Register New User Account</h3>
                        <button className="btn-secondary" onClick={() => setSubTab('directory')} style={{ fontSize: '0.8rem', padding: '4px 10px' }}>
                            Cancel
                        </button>
                    </div>

                    <form onSubmit={handleCreateStaff} className="d-flex flex-column gap-3">
                        <div className="row g-3">
                            <div className="col-12 col-md-6">
                                <label className="d-block mb-1 text-muted" style={{ fontSize: '0.82rem', fontWeight: 600 }}>Full Name</label>
                                <input type="text" placeholder="e.g. Rahul Sharma" className="input-premium w-100" value={newStaff.name} onChange={(e) => setNewStaff({...newStaff, name: e.target.value})} />
                            </div>
                            <div className="col-12 col-md-6">
                                <label className="d-block mb-1 text-muted" style={{ fontSize: '0.82rem', fontWeight: 600 }}>Phone Contact</label>
                                <input type="tel" placeholder="e.g. 9876543210" className="input-premium w-100" value={newStaff.phone} onChange={(e) => setNewStaff({...newStaff, phone: e.target.value})} />
                            </div>
                        </div>

                        <div>
                            <label className="d-block mb-1 text-muted" style={{ fontSize: '0.82rem', fontWeight: 600 }}>Username *</label>
                            <input type="text" required placeholder="Enter login username" className="input-premium w-100" value={newStaff.username} onChange={(e) => setNewStaff({...newStaff, username: e.target.value})} />
                        </div>

                        <div>
                            <label className="d-block mb-1 text-muted" style={{ fontSize: '0.82rem', fontWeight: 600 }}>Password *</label>
                            <input type="password" required placeholder="Enter password (min 6 chars)" className="input-premium w-100" value={newStaff.password} onChange={(e) => setNewStaff({...newStaff, password: e.target.value})} />
                        </div>

                        <div>
                            <label className="d-block mb-1 text-muted" style={{ fontSize: '0.82rem', fontWeight: 600 }}>Assigned Role *</label>
                            <select className="input-premium w-100" value={newStaff.role} onChange={(e) => setNewStaff({...newStaff, role: e.target.value})}>
                                <option value="SUPER_ADMIN">SUPER_ADMIN (Owner / Full system access)</option>
                                <option value="BRANCH_MANAGER">BRANCH_MANAGER (Roster, POS & Calendar control)</option>
                                <option value="RECEPTIONIST">RECEPTIONIST (Admissions, Attendance & Payments)</option>
                                <option value="FINANCE_MANAGER">FINANCE_MANAGER (Billing & ledger accounts access)</option>
                                <option value="COACH">COACH (Academy attendance & session logs)</option>
                            </select>
                        </div>

                        <div className="d-flex gap-2 mt-3">
                            <button type="submit" className="btn-primary-stripe flex-grow-1" disabled={loading} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                                {loading ? 'Creating Account...' : (
                                    <>
                                        <span className="material-icons-outlined" style={{ fontSize: '18px' }}>person_add</span> Register User Account
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Payroll */}
            {subTab === 'payroll' && (
                <div className="card-premium text-center p-5" style={{ borderStyle: 'dashed' }}>
                    <span className="material-icons-outlined" style={{ fontSize: '48px', color: 'var(--text-muted)' }}>payments</span>
                    <h3 className="mt-3">Payroll Processing Cycle</h3>
                    <p className="text-muted mt-2">All administrative staff salaries are auto-credited at the end of every calendar month. You can generate pay slips in PDF or export Excel roster sheets from the Reports tab.</p>
                </div>
            )}
        </div>
    );
}
