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

    // Form states
    const [newStaff, setNewStaff] = useState({ username: '', password: '', role: 'RECEPTIONIST' });

    const handleCreateStaff = async (e) => {
        e.preventDefault();
        setLoading(true);
        const success = await onRegisterStaff(newStaff.username, newStaff.password, newStaff.role);
        setLoading(false);
        if (success) {
            setSubTab('directory');
            setNewStaff({ username: '', password: '', role: 'RECEPTIONIST' });
        }
    };

    return (
        <div className="animate-fade-in">
            {/* Sub Nav */}
            <div className="d-flex gap-3 mb-4 border-bottom pb-2">
                <button className={`sub-tab-link ${subTab === 'directory' ? 'active' : ''}`} onClick={() => setSubTab('directory')}>Staff Directory</button>
                <button className={`sub-tab-link ${subTab === 'register' ? 'active' : ''}`} onClick={() => setSubTab('register')}>Register Employee</button>
                <button className={`sub-tab-link ${subTab === 'payroll' ? 'active' : ''}`} onClick={() => setSubTab('payroll')}>Payroll Processing</button>
            </div>

            {/* List */}
            {subTab === 'directory' && (
                <div className="card-premium">
                    <div className="table-responsive">
                        <table className="table-premium">
                            <thead>
                                <tr>
                                    <th>Username</th>
                                    <th>Designation Role</th>
                                    <th>Privileges Summary</th>
                                </tr>
                            </thead>
                            <tbody>
                                {staffList.map((s, idx) => (
                                    <tr key={s.id || idx}>
                                        <td><strong>{s.username}</strong></td>
                                        <td>
                                            <span className={`badge-pill ${s.role === 'SUPER_ADMIN' || s.role === 'ACADEMY_OWNER' ? 'badge-danger' : 'badge-primary'}`}>
                                                {s.role}
                                            </span>
                                        </td>
                                        <td>
                                            {ROLE_PERMISSIONS[s.role] || 'Standard staff access'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Register */}
            {subTab === 'register' && (
                <div className="card-premium">
                    <h3 className="mb-4">Register New Employee Account</h3>
                    <form onSubmit={handleCreateStaff} className="d-flex flex-column gap-3" style={{ maxWidth: '450px' }}>
                        <div>
                            <label className="d-block mb-1">Username *</label>
                            <input type="text" required placeholder="Enter login username" className="input-premium w-100" value={newStaff.username} onChange={(e) => setNewStaff({...newStaff, username: e.target.value})} />
                        </div>
                        <div>
                            <label className="d-block mb-1">Password *</label>
                            <input type="password" required placeholder="Enter password" className="input-premium w-100" value={newStaff.password} onChange={(e) => setNewStaff({...newStaff, password: e.target.value})} />
                        </div>
                        <div>
                            <label className="d-block mb-1">Assigned Role *</label>
                            <select className="input-premium w-100" value={newStaff.role} onChange={(e) => setNewStaff({...newStaff, role: e.target.value})}>
                                <option value="SUPER_ADMIN">SUPER_ADMIN (Owner / Full system access)</option>
                                <option value="BRANCH_MANAGER">BRANCH_MANAGER (Roster, POS & Calendar control)</option>
                                <option value="RECEPTIONIST">RECEPTIONIST (Admissions, Attendance & Payments)</option>
                                <option value="FINANCE_MANAGER">FINANCE_MANAGER (Billing & ledger accounts access)</option>
                            </select>
                        </div>

                        <button type="submit" className="btn-primary-stripe mt-2" disabled={loading} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                            {loading ? 'Creating Account...' : (
                                <>
                                    <span className="material-icons-outlined" style={{ fontSize: '16px' }}>add_circle</span> Register Account
                                </>
                            )}
                        </button>
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
