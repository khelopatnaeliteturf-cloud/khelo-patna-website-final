"use client";

import React, { useState, useEffect } from 'react';

const MODULES = [
    { id: 'dashboard', label: 'Dashboard & Analytics', desc: 'Overview of revenue, check-ins, and active memberships.' },
    { id: 'turf-management', label: 'Turf Bookings & Management', desc: 'View bookings log, operate calendar slots, and manage closures.' },
    { id: 'admission-studio', label: 'Academy Admissions', desc: 'Process student admission applications, registration, and documentation.' },
    { id: 'membership-management', label: 'Academy Memberships', desc: 'Access member profiles, status logs, active subscriptions.' },
    { id: 'session-management', label: 'Academy Sessions', desc: 'Create, modify, and delete training seasons and academic sessions.' },
    { id: 'batch-management', label: 'Academy Batches', desc: 'Assign coaching staff, time slots, and manage student batch rosters.' },
    { id: 'coach-management', label: 'Coaches Directory', desc: 'Manage coaches profile, specialization sports, schedules, and payroll rates.' },
    { id: 'attendance-management', label: 'Attendance Logs', desc: 'View and record daily attendance rosters for academy students.' },
    { id: 'membership-billing', label: 'Finance Billing & Invoices', desc: 'Waive, update, and manage fee billing invoices.' },
    { id: 'finance', label: 'Finance Cash Desk', desc: 'Collect fee payments, record transactions, and analyze financial accounts.' },
    { id: 'inventory-management', label: 'Stock & Inventory Management', desc: 'Manage equipment assets, record vendor sales, and monitor low stock alerts.' },
    { id: 'hr', label: 'HR Management & Staff Directory', desc: 'Register staff members, configure operational roles, and access payroll.' },
    { id: 'communication', label: 'Broadcast Messaging Desk', desc: 'Draft and send SMS or WhatsApp messages to students, members, or staff.' },
    { id: 'customers', label: 'Customers Database', desc: 'Search client directory, view customer booking histories, and merge profiles.' },
    { id: 'website', label: 'Website Content & SEO Editor', desc: 'Manage site FAQs, testimonials, rates cards, and public metadata.' },
    { id: 'integrations', label: 'Linked Devices & APIs', desc: 'Control Supabase integrations, Cloudinary storage, and WhatsApp bot configs.' },
    { id: 'settings', label: 'Access Control Settings', desc: 'Configure granular permission controls and active status of team operators.' },
    { id: 'audit-logs', label: 'Compliance & Audit Trail', desc: 'Inspect security logs, administrator logins, and sensitive data history.' }
];

const ROLES = [
    { value: 'SUPER_ADMIN', label: 'Super Admin (All Access)' },
    { value: 'ACADEMY_OWNER', label: 'Academy Owner' },
    { value: 'BRANCH_MANAGER', label: 'Branch Manager' },
    { value: 'FINANCE_MANAGER', label: 'Finance Manager' },
    { value: 'RECEPTIONIST', label: 'Receptionist' },
    { value: 'COACH', label: 'Coach' },
    { value: 'GROUND_MANAGER', label: 'Ground Manager' },
    { value: 'HR_MANAGER', label: 'HR Manager' }
];

export default function SettingsTab({ backendUrl, getHeaders, notifySuccess, notifyError }) {
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Modal states
    const [selectedUser, setSelectedUser] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [modalRole, setModalRole] = useState('');
    const [modalStatus, setModalStatus] = useState('ACTIVE');
    const [modalPermissions, setModalPermissions] = useState([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadStaff();
    }, []);

    const loadStaff = async () => {
        setRefreshing(true);
        try {
            // The staff directory route returns staff with no passwords
            const res = await fetch(`${backendUrl}/api/auth/staff`, { headers: getHeaders() });
            const data = await res.json();
            if (res.ok) {
                setStaff(Array.isArray(data) ? data : []);
            } else {
                notifyError(data.error || 'Failed to load staff list.');
            }
        } catch (err) {
            console.error('Failed to load staff list:', err);
            notifyError('Network error loading staff list.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleOpenEdit = (user) => {
        setSelectedUser(user);
        setModalRole(user.role || 'STAFF');
        setModalStatus(user.status || 'ACTIVE');
        setModalPermissions(Array.isArray(user.permissions) ? user.permissions : []);
        setShowEditModal(true);
    };

    const handlePermissionToggle = (moduleId) => {
        setModalPermissions(prev => {
            if (prev.includes(moduleId)) {
                return prev.filter(p => p !== moduleId);
            } else {
                return [...prev, moduleId];
            }
        });
    };

    const handleSavePermissions = async (e) => {
        e.preventDefault();
        if (!selectedUser) return;
        setSaving(true);
        try {
            const res = await fetch(`${backendUrl}/api/auth/staff/${selectedUser._id}`, {
                method: 'PUT',
                headers: {
                    ...getHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    role: modalRole,
                    status: modalStatus,
                    permissions: modalPermissions
                })
            });
            const data = await res.json();
            if (res.ok) {
                notifySuccess(`Access permissions successfully updated for ${selectedUser.username}!`);
                setShowEditModal(false);
                loadStaff();
            } else {
                notifyError(data.error || 'Failed to update access control settings.');
            }
        } catch (err) {
            console.error('Failed to save access controls:', err);
            notifyError('Network error saving permissions.');
        } finally {
            setSaving(false);
        }
    };

    const selectAllPermissions = () => {
        setModalPermissions(MODULES.map(m => m.id));
    };

    const clearAllPermissions = () => {
        setModalPermissions([]);
    };

    return (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Header section with orange branding */}
            <div className="card-premium" style={{ padding: 0, border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                <div style={{ background: '#f15b2b', color: '#ffffff', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                            <span className="material-icons-outlined">admin_panel_settings</span>
                            Access Control & Settings
                        </h3>
                        <p style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.85)', margin: '4px 0 0' }}>
                            Configure granular feature access, edit operational roles, and set status blocks for all system operators.
                        </p>
                    </div>
                    <button 
                        type="button" 
                        onClick={loadStaff} 
                        disabled={refreshing}
                        className="btn-primary-stripe"
                        style={{ background: 'rgba(255, 255, 255, 0.2)', color: '#ffffff', border: '1px solid rgba(255, 255, 255, 0.3)', padding: '6px 14px', borderRadius: '8px', fontSize: '0.74rem', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
                    >
                        <span className="material-icons-outlined" style={{ fontSize: '16px' }}>{refreshing ? 'autorenew' : 'refresh'}</span>
                        Refresh Directory
                    </button>
                </div>
            </div>

            {/* Staff list panel */}
            {/* Staff list panel */}
            <div className="card-premium" style={{ padding: '20px', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', gap: '16px', flexWrap: 'wrap' }}>
                    <div>
                        <h4 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 800, color: 'var(--text-main)' }}>User List & Directory</h4>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Showing all registered managers, coaches, and administrators.</div>
                    </div>
                    {/* Beautiful search bar aligned with theme */}
                    <div style={{ position: 'relative', width: '100%', maxWidth: '280px' }}>
                        <span className="material-icons-outlined" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '18px' }}>search</span>
                        <input 
                            type="text"
                            placeholder="Search by username or role..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="input-premium"
                            style={{ width: '100%', paddingLeft: '38px', height: '36px', borderRadius: '8px', fontSize: '0.78rem' }}
                        />
                        {searchTerm && (
                            <button 
                                type="button" 
                                onClick={() => setSearchTerm('')} 
                                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                            >
                                <span className="material-icons-outlined" style={{ fontSize: '16px' }}>close</span>
                            </button>
                        )}
                    </div>
                </div>

                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        <div style={{ textAlign: 'center' }}>
                            <span className="material-icons-outlined animate-spin" style={{ fontSize: '2rem', color: '#f15b2b', marginBottom: '8px' }}>sync</span>
                            <div>Fetching staff configurations...</div>
                        </div>
                    </div>
                ) : staff.length === 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                        <span className="material-icons-outlined" style={{ fontSize: '3rem', color: 'var(--text-muted)', opacity: 0.3, marginBottom: '8px' }}>people_outline</span>
                        <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>No users registered</div>
                        <p style={{ fontSize: '0.76rem', textAlign: 'center', marginTop: '4px', maxWidth: '300px' }}>Register users via the HR tab first to enable permission configurations.</p>
                    </div>
                ) : (() => {
                    const filteredStaff = staff.filter((user) => {
                        const term = searchTerm.toLowerCase();
                        return (user.username || '').toLowerCase().includes(term) ||
                               (user.role || '').toLowerCase().includes(term);
                    });

                    if (filteredStaff.length === 0) {
                        return (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                                <span className="material-icons-outlined" style={{ fontSize: '3rem', color: 'var(--text-muted)', opacity: 0.3, marginBottom: '8px' }}>search_off</span>
                                <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>No matching users found</div>
                                <p style={{ fontSize: '0.76rem', textAlign: 'center', marginTop: '4px' }}>Try searching with a different username or role name.</p>
                            </div>
                        );
                    }

                    return (
                        <div className="table-responsive">
                            <table className="table-premium text-center" style={{ fontSize: '0.82rem' }}>
                                <thead>
                                    <tr>
                                        <th>User</th>
                                        <th>Username</th>
                                        <th>Assigned Role</th>
                                        <th>Granular Access</th>
                                        <th>Status</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredStaff.map((user) => {
                                        const initials = (user.username || 'U').substring(0, 2).toUpperCase();
                                        const isSuperAdmin = user.role === 'SUPER_ADMIN';
                                        const permCount = Array.isArray(user.permissions) ? user.permissions.length : 0;
                                        
                                        return (
                                            <tr key={user._id} style={{ verticalAlign: 'middle' }}>
                                                <td style={{ textAlign: 'left', paddingLeft: '16px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <div style={{ 
                                                            width: '32px', 
                                                            height: '32px', 
                                                            borderRadius: '50%', 
                                                            background: 'var(--surface-tint)', 
                                                            color: '#f15b2b', 
                                                            fontWeight: 700, 
                                                            fontSize: '0.74rem', 
                                                            display: 'flex', 
                                                            alignItems: 'center', 
                                                            justifyContent: 'center',
                                                            border: '2px solid rgba(241, 91, 43, 0.15)'
                                                        }}>
                                                            {initials}
                                                        </div>
                                                        <div style={{ fontWeight: 600 }}>{user.username}</div>
                                                    </div>
                                                </td>
                                                <td><code>{user.username}</code></td>
                                                <td>
                                                    <span style={{ 
                                                        background: isSuperAdmin ? 'rgba(241, 91, 43, 0.08)' : 'var(--surface-tint)',
                                                        color: isSuperAdmin ? '#f15b2b' : 'var(--text-main)',
                                                        border: isSuperAdmin ? '1px solid rgba(241, 91, 43, 0.2)' : '1px solid var(--border-color)',
                                                        padding: '3px 8px',
                                                        borderRadius: '6px',
                                                        fontSize: '0.72rem',
                                                        fontWeight: isSuperAdmin ? 700 : 500
                                                    }}>
                                                        {user.role}
                                                    </span>
                                                </td>
                                                <td>
                                                    {isSuperAdmin ? (
                                                        <span style={{ color: '#10B981', fontWeight: 600 }}>Full Administrative Access</span>
                                                    ) : permCount > 0 ? (
                                                        <span style={{ fontWeight: 600, color: '#f15b2b' }}>{permCount} of {MODULES.length} modules</span>
                                                    ) : (
                                                        <span style={{ color: 'var(--text-muted)' }}>Role Defaults Only</span>
                                                    )}
                                                </td>
                                                <td>
                                                    <span style={{ 
                                                        background: user.status === 'ACTIVE' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                                                        color: user.status === 'ACTIVE' ? '#10B981' : '#EF4444',
                                                        border: `1px solid ${user.status === 'ACTIVE' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                                                        padding: '3px 10px',
                                                        borderRadius: '20px',
                                                        fontSize: '0.72rem',
                                                        fontWeight: 700
                                                    }}>
                                                        {user.status || 'ACTIVE'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <button 
                                                        type="button"
                                                        onClick={() => handleOpenEdit(user)}
                                                        className="btn-primary-stripe"
                                                        style={{ 
                                                            background: '#f15b2b', 
                                                            color: '#ffffff', 
                                                            borderRadius: '6px', 
                                                            fontSize: '0.74rem', 
                                                            padding: '4px 10px', 
                                                            fontWeight: 600,
                                                            border: 'none',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '4px'
                                                        }}
                                                    >
                                                        <span className="material-icons-outlined" style={{ fontSize: '15px' }}>shield</span>
                                                        Access Control
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    );
                })()}
            </div>

            {/* Modal Dialog for Adjusting Access Controls */}
            {showEditModal && selectedUser && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(5px)' }}>
                    <div style={{ background: 'var(--bg-surface, #ffffff)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px', width: '90%', maxWidth: '620px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.45)' }}>
                        <div className="d-flex justify-content-between align-items-center mb-3 border-bottom pb-2" style={{ borderColor: 'var(--border-color)' }}>
                            <div>
                                <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#f15b2b' }}>
                                    Access Control Manager
                                </h4>
                                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                                    Username: <strong>{selectedUser.username}</strong>
                                </div>
                            </div>
                            <button type="button" className="btn-close" aria-label="Close" onClick={() => setShowEditModal(false)} style={{ filter: 'invert(1)', opacity: 0.8 }}></button>
                        </div>

                        <form onSubmit={handleSavePermissions} className="d-flex flex-column gap-3">
                            {/* Role and status settings side-by-side */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', background: 'var(--surface-tint)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                                <div>
                                    <label className="d-block mb-1" style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Operational Role *</label>
                                    <select 
                                        className="input-premium w-100" 
                                        value={modalRole} 
                                        onChange={e => setModalRole(e.target.value)}
                                        style={{ fontSize: '0.8rem', borderRadius: '8px' }}
                                    >
                                        {ROLES.map(r => (
                                            <option key={r.value} value={r.value}>{r.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="d-block mb-1" style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Operator Status *</label>
                                    <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600 }}>
                                            <input 
                                                type="radio" 
                                                name="status" 
                                                value="ACTIVE" 
                                                checked={modalStatus === 'ACTIVE'} 
                                                onChange={() => setModalStatus('ACTIVE')}
                                            />
                                            Active (Allowed login)
                                        </label>
                                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600, color: '#EF4444' }}>
                                            <input 
                                                type="radio" 
                                                name="status" 
                                                value="INACTIVE" 
                                                checked={modalStatus === 'INACTIVE'} 
                                                onChange={() => setModalStatus('INACTIVE')}
                                            />
                                            Deactivated (Block login)
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* Granular Module Checks */}
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Granular Access Permissions</label>
                                    <div className="d-flex gap-2">
                                        <button type="button" onClick={selectAllPermissions} style={{ background: 'transparent', border: 'none', color: '#f15b2b', fontSize: '0.7rem', fontWeight: 700 }}>Select All</button>
                                        <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>|</span>
                                        <button type="button" onClick={clearAllPermissions} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 700 }}>Clear All</button>
                                    </div>
                                </div>
                                
                                {modalRole === 'SUPER_ADMIN' ? (
                                    <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px dashed rgba(16, 185, 129, 0.25)', borderRadius: '8px', padding: '12px 16px', color: '#10B981', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span className="material-icons-outlined" style={{ fontSize: '18px' }}>info</span>
                                        <span>Super Administrators automatically retain full database access. Granular controls do not restrict this role.</span>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '280px', overflowY: 'auto', paddingRight: '6px' }}>
                                        {MODULES.map(m => {
                                            const checked = modalPermissions.includes(m.id);
                                            return (
                                                <label 
                                                    key={m.id} 
                                                    style={{ 
                                                        display: 'flex', 
                                                        alignItems: 'flex-start', 
                                                        gap: '12px', 
                                                        padding: '10px 14px', 
                                                        borderRadius: '10px', 
                                                        border: `1px solid ${checked ? 'rgba(241, 91, 43, 0.25)' : 'var(--border-color)'}`,
                                                        background: checked ? 'rgba(241, 91, 43, 0.03)' : 'transparent',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.15s'
                                                    }}
                                                >
                                                    <input 
                                                        type="checkbox" 
                                                        checked={checked} 
                                                        onChange={() => handlePermissionToggle(m.id)}
                                                        style={{ marginTop: '3px' }}
                                                    />
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: checked ? '#f15b2b' : 'var(--text-main)' }}>{m.label}</div>
                                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px', lineHeight: '1.25' }}>{m.desc}</div>
                                                    </div>
                                                </label>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Action Buttons */}
                            <div className="d-flex justify-content-end gap-2 border-top pt-3" style={{ borderColor: 'var(--border-color)' }}>
                                <button 
                                    type="button" 
                                    onClick={() => setShowEditModal(false)} 
                                    className="btn btn-secondary py-2 px-3" 
                                    style={{ fontSize: '0.8rem', borderRadius: '8px' }}
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={saving}
                                    className="btn text-white py-2 px-4" 
                                    style={{ background: '#f15b2b', border: '1px solid #f15b2b', fontSize: '0.8rem', borderRadius: '8px', fontWeight: 700 }}
                                >
                                    {saving ? 'Saving...' : 'Save Settings'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
