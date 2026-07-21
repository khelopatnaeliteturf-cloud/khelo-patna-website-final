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

const MODULE_GROUPS = [
    {
        name: 'Dashboards',
        modules: [
            { id: 'dashboard', label: 'Dashboard' },
            { id: 'audit-logs', label: 'Audit Logs' }
        ]
    },
    {
        name: 'Master Configuration',
        modules: [
            { id: 'session-management', label: 'Sessions' },
            { id: 'batch-management', label: 'Batches' },
            { id: 'coach-management', label: 'Coaches' },
            { id: 'integrations', label: 'Integrations' }
        ]
    },
    {
        name: 'Academy Operations',
        modules: [
            { id: 'admission-studio', label: 'Admissions' },
            { id: 'membership-management', label: 'Memberships' },
            { id: 'attendance-management', label: 'Attendance' }
        ]
    },
    {
        name: 'Finance Desk',
        modules: [
            { id: 'membership-billing', label: 'Billing Invoices' },
            { id: 'finance', label: 'Accounts & Cash Book' },
            { id: 'inventory-management', label: 'Inventory' }
        ]
    },
    {
        name: 'System Settings',
        modules: [
            { id: 'hr', label: 'HR Directory' },
            { id: 'communication', label: 'Broadcaster' },
            { id: 'customers', label: 'Customers DB' },
            { id: 'website', label: 'Website SEO' },
            { id: 'settings', label: 'Access Control' }
        ]
    }
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

    // Add User states
    const [showAddUserModal, setShowAddUserModal] = useState(false);
    const [newUser, setNewUser] = useState({ username: '', password: '', role: 'SUPER_ADMIN', name: '', phone: '' });
    const [creatingUser, setCreatingUser] = useState(false);

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

    const handleDeleteUser = async (user) => {
        if (user.username === 'owner') {
            notifyError('The primary owner account cannot be deleted.');
            return;
        }
        if (!window.confirm(`Are you sure you want to permanently delete user "${user.username}"?`)) {
            return;
        }
        try {
            const res = await fetch(`${backendUrl}/api/auth/staff/${user._id}`, {
                method: 'DELETE',
                headers: getHeaders()
            });
            const data = await res.json();
            if (res.ok) {
                notifySuccess(`User "${user.username}" deleted successfully.`);
                loadStaff();
            } else {
                notifyError(data.error || 'Failed to delete user.');
            }
        } catch (err) {
            console.error('Error deleting user:', err);
            notifyError('Network error deleting user.');
        }
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        setCreatingUser(true);
        try {
            const res = await fetch(`${backendUrl}/api/auth/register`, {
                method: 'POST',
                headers: {
                    ...getHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: newUser.username.trim(),
                    password: newUser.password,
                    role: newUser.role,
                    name: newUser.name.trim() || null,
                    phone: newUser.phone.trim() || null
                })
            });
            const data = await res.json();
            if (res.ok) {
                notifySuccess(`User "${newUser.username}" registered successfully.`);
                setShowAddUserModal(false);
                setNewUser({ username: '', password: '', role: 'SUPER_ADMIN', name: '', phone: '' });
                loadStaff();
            } else {
                notifyError(data.error || 'Failed to register new user.');
            }
        } catch (err) {
            console.error('Error registering user:', err);
            notifyError('Network error registering new user.');
        } finally {
            setCreatingUser(false);
        }
    };

    const handleOpenEdit = (user) => {
        setSelectedUser(user);
        setModalRole(user.role || 'STAFF');
        setModalStatus(user.status || 'ACTIVE');
        setModalPermissions(Array.isArray(user.permissions) ? user.permissions : []);
        setShowEditModal(true);
    };

    const [modalSearchQuery, setModalSearchQuery] = useState('');

    const hasGranularPermission = (moduleId, action) => {
        return modalPermissions.includes(moduleId) || modalPermissions.includes(`${moduleId}:${action}`);
    };

    const toggleGranularPermission = (moduleId, action) => {
        setModalPermissions(prev => {
            let list = [...prev];
            const specificKey = `${moduleId}:${action}`;
            const allActions = ['view', 'add', 'edit', 'delete'];
            
            if (list.includes(moduleId)) {
                list = list.filter(k => k !== moduleId);
                allActions.forEach(act => {
                    if (act !== action) {
                        list.push(`${moduleId}:${act}`);
                    }
                });
                return list;
            }
            
            if (list.includes(specificKey)) {
                return list.filter(k => k !== specificKey);
            } else {
                return [...list, specificKey];
            }
        });
    };

    const isAllChecked = (moduleId) => {
        const allActions = ['view', 'add', 'edit', 'delete'];
        return modalPermissions.includes(moduleId) || allActions.every(act => modalPermissions.includes(`${moduleId}:${act}`));
    };

    const toggleAllModule = (moduleId) => {
        const allActions = ['view', 'add', 'edit', 'delete'];
        const specificKeys = allActions.map(act => `${moduleId}:${act}`);
        
        setModalPermissions(prev => {
            let list = prev.filter(k => k !== moduleId && !specificKeys.includes(k));
            const currentlyAll = isAllChecked(moduleId);
            
            if (!currentlyAll) {
                allActions.forEach(act => list.push(`${moduleId}:${act}`));
            }
            return [...new Set(list)];
        });
    };

    const isGroupAllChecked = (group) => {
        return group.modules.every(m => isAllChecked(m.id));
    };

    const toggleGroupAll = (group) => {
        const allChecked = isGroupAllChecked(group);
        setModalPermissions(prev => {
            let list = [...prev];
            group.modules.forEach(m => {
                const allActions = ['view', 'add', 'edit', 'delete'];
                const specificKeys = allActions.map(act => `${m.id}:${act}`);
                list = list.filter(k => k !== m.id && !specificKeys.includes(k));
                if (!allChecked) {
                    allActions.forEach(act => list.push(`${m.id}:${act}`));
                }
            });
            return [...new Set(list)];
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
        const list = [];
        MODULES.forEach(m => {
            ['view', 'add', 'edit', 'delete'].forEach(act => {
                list.push(`${m.id}:${act}`);
            });
        });
        setModalPermissions(list);
    };

    const clearAllPermissions = () => {
        setModalPermissions([]);
    };

    return (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Header section with orange branding */}
            <div className="card-premium" style={{ padding: 0, border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                <div style={{ background: 'var(--success)', color: 'var(--white)', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
                        style={{ background: 'rgba(255, 255, 255, 0.2)', color: 'var(--white)', border: '1px solid rgba(255, 255, 255, 0.3)', padding: '6px 14px', borderRadius: '8px', fontSize: '0.74rem', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
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
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                        {/* Beautiful search bar aligned with theme */}
                        <div style={{ position: 'relative', width: '220px' }}>
                            <span className="material-icons-outlined" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '18px' }}>search</span>
                            <input 
                                type="text"
                                placeholder="Search..."
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
                        <button
                            type="button"
                            onClick={() => setShowAddUserModal(true)}
                            className="btn-primary-stripe"
                            style={{ 
                                background: 'var(--success)', 
                                color: 'var(--white)', 
                                border: 'none', 
                                padding: '6px 14px', 
                                borderRadius: '8px', 
                                fontSize: '0.74rem', 
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                gap: '6px', 
                                fontWeight: 700,
                                height: '36px'
                            }}
                        >
                            <span className="material-icons-outlined" style={{ fontSize: '16px' }}>person_add</span>
                            Add New User
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        <div style={{ textAlign: 'center' }}>
                            <span className="material-icons-outlined animate-spin" style={{ fontSize: '2rem', color: 'var(--success)', marginBottom: '8px' }}>sync</span>
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
                                                            color: 'var(--success)', 
                                                            fontWeight: 700, 
                                                            fontSize: '0.74rem', 
                                                            display: 'flex', 
                                                            alignItems: 'center', 
                                                            justifyContent: 'center',
                                                            border: '2px solid rgba(16, 185, 129, 0.15)'
                                                        }}>
                                                            {initials}
                                                        </div>
                                                        <div style={{ fontWeight: 600 }}>{user.username}</div>
                                                    </div>
                                                </td>
                                                <td><code>{user.username}</code></td>
                                                <td>
                                                    <span style={{ 
                                                        background: isSuperAdmin ? 'rgba(16, 185, 129, 0.08)' : 'var(--surface-tint)',
                                                        color: isSuperAdmin ? 'var(--success)' : 'var(--text-main)',
                                                        border: isSuperAdmin ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid var(--border-color)',
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
                                                        <span style={{ color: 'var(--success)', fontWeight: 600 }}>Full Administrative Access</span>
                                                    ) : permCount > 0 ? (
                                                        <span style={{ fontWeight: 600, color: 'var(--success)' }}>{permCount} of {MODULES.length} modules</span>
                                                    ) : (
                                                        <span style={{ color: 'var(--text-muted)' }}>Role Defaults Only</span>
                                                    )}
                                                </td>
                                                <td>
                                                    <span style={{ 
                                                        background: user.status === 'ACTIVE' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                                                        color: user.status === 'ACTIVE' ? 'var(--success)' : 'var(--danger)',
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
                                                            background: 'var(--success)', 
                                                            color: 'var(--white)', 
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
                                                    {user.username !== 'owner' && (
                                                        <button 
                                                            type="button"
                                                            onClick={() => handleDeleteUser(user)}
                                                            className="btn-secondary-stripe"
                                                            style={{ 
                                                                background: 'var(--danger)', 
                                                                color: 'var(--white)', 
                                                                borderRadius: '6px', 
                                                                fontSize: '0.74rem', 
                                                                padding: '4px 10px', 
                                                                fontWeight: 600,
                                                                border: 'none',
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '4px',
                                                                marginLeft: '8px'
                                                            }}
                                                        >
                                                            <span className="material-icons-outlined" style={{ fontSize: '15px' }}>delete</span>
                                                            Delete
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    );
                })()}

                {/* Official Brand Media & Marketing Assets Card */}
                <div style={{ background: 'var(--card-bg, #040609)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px', marginTop: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '20px' }}>
                        <div>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span className="material-icons-outlined" style={{ color: 'var(--emerald)' }}>auto_awesome</span>
                                Official Brand Media Assets
                            </h3>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                                Download official animated logo GIFs and high-resolution assets for WhatsApp DPs, Instagram, and promotional media.
                            </p>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                        {/* Animated GIF Card */}
                        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '14px', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                            <div style={{ width: '110px', height: '110px', borderRadius: '50%', background: '#030806', border: '3px solid rgba(16,185,129,0.4)', boxShadow: '0 0 25px rgba(16,185,129,0.25)', overflow: 'hidden', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <img src="/khelo_patna_logo_animated.gif" alt="Khelo Patna Animated Logo" style={{ width: '100px', height: '100px', objectFit: 'contain' }} />
                            </div>
                            <h4 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0, color: '#ffffff' }}>Animated Bouncing Logo (GIF)</h4>
                            <span style={{ fontSize: '0.72rem', color: 'var(--emerald)', fontWeight: 600, marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>500 × 500 px · High-Res 60fps Loop</span>
                            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '8px 0 16px 0', lineHeight: 1.4 }}>
                                Bouncing white logo with sweeping neon light ray. Ideal for WhatsApp profile picture, Instagram display picture, and email signatures.
                            </p>

                            <a 
                                href="/khelo_patna_logo_animated.gif" 
                                download="khelo_patna_logo_animated.gif" 
                                className="btn-premium w-100" 
                                style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px', fontSize: '0.8rem', borderRadius: '10px', fontWeight: 700 }}
                            >
                                <span className="material-icons-outlined" style={{ fontSize: '18px' }}>download</span>
                                Download Animated GIF
                            </a>
                        </div>

                        {/* Standard PNG Logo Card */}
                        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                            <div style={{ width: '110px', height: '110px', borderRadius: '50%', background: '#FFFFFF', border: '3px solid rgba(255,255,255,0.2)', boxShadow: '0 0 20px rgba(0,0,0,0.15)', overflow: 'hidden', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px' }}>
                                <img src="/logo.png" alt="Khelo Patna Logo PNG" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                            </div>
                            <h4 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0, color: '#ffffff' }}>Official Vector Logo (PNG)</h4>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>621 × 621 px · Transparent HD</span>
                            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '8px 0 16px 0', lineHeight: 1.4 }}>
                                Standard transparent PNG logo for print documents, letterheads, venue banners, and invoice templates.
                            </p>

                            <a 
                                href="/logo.png" 
                                download="khelo_patna_logo.png" 
                                className="btn-premium-border w-100" 
                                style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px', fontSize: '0.8rem', borderRadius: '10px', fontWeight: 700 }}
                            >
                                <span className="material-icons-outlined" style={{ fontSize: '18px' }}>download</span>
                                Download Transparent PNG
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal Dialog for Adjusting Access Controls */}
            {showEditModal && selectedUser && (() => {
                let checkedCount = 0;
                let totalCheckboxes = 0;
                MODULE_GROUPS.forEach(g => {
                    g.modules.forEach(m => {
                        totalCheckboxes += 4;
                        ['view', 'add', 'edit', 'delete'].forEach(act => {
                            if (hasGranularPermission(m.id, act)) checkedCount++;
                        });
                    });
                });

                return (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'var(--overlay-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(5px)' }}>
                        <div style={{ background: 'var(--bg-surface, var(--white))', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px', width: '95%', maxWidth: '850px', maxHeight: '92vh', overflowY: 'auto', boxShadow: 'var(--shadow-xl)' }}>
                            <div className="d-flex justify-content-between align-items-center mb-3 border-bottom pb-2" style={{ borderColor: 'var(--border-color)' }}>
                                <div>
                                    <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: 'var(--success)' }}>
                                        Access Control Manager
                                    </h4>
                                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                                        Username: <strong>{selectedUser.username}</strong>
                                    </div>
                                </div>
                                <button type="button" className="btn-close" aria-label="Close" onClick={() => setShowEditModal(false)} style={{ filter: 'var(--invert-icon)', opacity: 0.8 }}></button>
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
                                                    style={{ accentColor: 'var(--success)' }}
                                                />
                                                Active (Allowed login)
                                            </label>
                                            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600, color: 'var(--danger)' }}>
                                                <input 
                                                    type="radio" 
                                                    name="status" 
                                                    value="INACTIVE" 
                                                    checked={modalStatus === 'INACTIVE'} 
                                                    onChange={() => setModalStatus('INACTIVE')}
                                                    style={{ accentColor: 'var(--success)' }}
                                                />
                                                Deactivated (Block login)
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                {/* Granular Module Checks */}
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: '12px', flexWrap: 'wrap' }}>
                                        <div className="d-flex align-items-center gap-2">
                                            <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', margin: 0 }}>Granular Access Permissions</label>
                                            <span style={{ fontSize: '0.72rem', background: 'var(--bg-success-light)', color: 'var(--success)', border: '1px solid var(--border-success-light)', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
                                                {checkedCount} / {totalCheckboxes} Checked
                                            </span>
                                        </div>
                                        <div className="d-flex align-items-center gap-3">
                                            {/* Search box within modal */}
                                            <div style={{ position: 'relative', width: '100%', maxWidth: '200px' }}>
                                                <span className="material-icons-outlined" style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '15px' }}>search</span>
                                                <input 
                                                    type="text"
                                                    placeholder="Search module..."
                                                    value={modalSearchQuery}
                                                    onChange={e => setModalSearchQuery(e.target.value)}
                                                    className="input-premium"
                                                    style={{ width: '100%', paddingLeft: '28px', height: '28px', borderRadius: '6px', fontSize: '0.72rem' }}
                                                />
                                            </div>
                                            <div className="d-flex gap-2">
                                                <button type="button" onClick={selectAllPermissions} style={{ background: 'transparent', border: 'none', color: 'var(--success)', fontSize: '0.7rem', fontWeight: 700 }}>Select All</button>
                                                <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>|</span>
                                                <button type="button" onClick={clearAllPermissions} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 700 }}>Clear All</button>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {modalRole === 'SUPER_ADMIN' ? (
                                        <div style={{ background: 'var(--bg-success-light)', border: '1px dashed var(--border-success-light)', borderRadius: '8px', padding: '12px 16px', color: 'var(--success)', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span className="material-icons-outlined" style={{ fontSize: '18px' }}>info</span>
                                            <span>Super Administrators automatically retain full database access. Granular controls do not restrict this role.</span>
                                        </div>
                                    ) : (
                                        <div className="table-responsive" style={{ maxHeight: '380px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
                                            <table className="table-premium text-center align-middle" style={{ fontSize: '0.78rem', margin: 0 }}>
                                                <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-surface)', zIndex: 10 }}>
                                                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                                        <th style={{ textAlign: 'left', paddingLeft: '16px', width: '38%', padding: '12px 6px' }}>
                                                            <span style={{ color: 'var(--text-main)', fontWeight: 700 }}>MODULE</span>
                                                        </th>
                                                        <th style={{ width: '12%', padding: '12px 6px' }}>
                                                            <span style={{ color: 'var(--text-main)', fontWeight: 700 }}>VIEW</span>
                                                        </th>
                                                        <th style={{ width: '12%', padding: '12px 6px' }}>
                                                            <span style={{ color: 'var(--text-main)', fontWeight: 700 }}>ADD</span>
                                                        </th>
                                                        <th style={{ width: '12%', padding: '12px 6px' }}>
                                                            <span style={{ color: 'var(--text-main)', fontWeight: 700 }}>EDIT</span>
                                                        </th>
                                                        <th style={{ width: '12%', padding: '12px 6px' }}>
                                                            <span style={{ color: 'var(--text-main)', fontWeight: 700 }}>DEL</span>
                                                        </th>
                                                        <th style={{ width: '14%', padding: '12px 6px' }}>
                                                            <span style={{ color: 'var(--text-main)', fontWeight: 700 }}>ALL</span>
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {MODULE_GROUPS.map(group => {
                                                        const filteredModules = group.modules.filter(m => 
                                                            m.label.toLowerCase().includes(modalSearchQuery.toLowerCase()) ||
                                                            m.id.toLowerCase().includes(modalSearchQuery.toLowerCase())
                                                        );
                                                        if (filteredModules.length === 0) return null;

                                                        const groupAll = isGroupAllChecked(group);

                                                        return (
                                                            <React.Fragment key={group.name}>
                                                                <tr style={{ background: 'var(--bg-success-light)', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
                                                                    <td colSpan={6} style={{ textAlign: 'left', paddingLeft: '12px', fontWeight: 800, fontSize: '0.74rem', color: 'var(--success)', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '10px 6px' }}>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                            <input 
                                                                                type="checkbox" 
                                                                                checked={groupAll} 
                                                                                onChange={() => toggleGroupAll(group)} 
                                                                                style={{ accentColor: 'var(--success)', cursor: 'pointer' }}
                                                                            />
                                                                            <span style={{ color: 'var(--success)', fontWeight: 800 }}>{group.name}</span>
                                                                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500, textTransform: 'none' }}>
                                                                                ({filteredModules.length} modules)
                                                                            </span>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                                {filteredModules.map(m => {
                                                                    const hasAny = ['view', 'add', 'edit', 'delete'].some(act => hasGranularPermission(m.id, act));
                                                                    const allCheckedVal = isAllChecked(m.id);

                                                                    return (
                                                                        <tr 
                                                                            key={m.id} 
                                                                            style={{ 
                                                                                background: hasAny ? 'var(--bg-success-ultra-light)' : 'transparent',
                                                                                transition: 'background 0.2s',
                                                                                borderBottom: '1px solid var(--border-color)'
                                                                            }}
                                                                        >
                                                                            <td style={{ textAlign: 'left', paddingLeft: '24px', fontWeight: 600, padding: '12px 6px' }}>
                                                                                <span style={{ color: 'var(--text-main)', display: 'block', fontWeight: 600 }}>{m.label}</span>
                                                                                <div style={{ fontSize: '0.64rem', color: 'var(--text-muted)', fontWeight: 400, marginTop: '2px' }}>
                                                                                    code: <code style={{ color: 'var(--success)', background: 'var(--bg-success-ultra-light)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border-success-light)', fontSize: '0.6rem' }}>{m.id}</code>
                                                                                </div>
                                                                            </td>
                                                                            <td style={{ padding: '12px 6px' }}>
                                                                                <input 
                                                                                    type="checkbox" 
                                                                                    checked={hasGranularPermission(m.id, 'view')} 
                                                                                    onChange={() => toggleGranularPermission(m.id, 'view')} 
                                                                                    style={{ accentColor: 'var(--success)', cursor: 'pointer', width: '15px', height: '15px' }}
                                                                                />
                                                                            </td>
                                                                            <td style={{ padding: '12px 6px' }}>
                                                                                <input 
                                                                                    type="checkbox" 
                                                                                    checked={hasGranularPermission(m.id, 'add')} 
                                                                                    onChange={() => toggleGranularPermission(m.id, 'add')} 
                                                                                    style={{ accentColor: 'var(--success)', cursor: 'pointer', width: '15px', height: '15px' }}
                                                                                />
                                                                            </td>
                                                                            <td style={{ padding: '12px 6px' }}>
                                                                                <input 
                                                                                    type="checkbox" 
                                                                                    checked={hasGranularPermission(m.id, 'edit')} 
                                                                                    onChange={() => toggleGranularPermission(m.id, 'edit')} 
                                                                                    style={{ accentColor: 'var(--success)', cursor: 'pointer', width: '15px', height: '15px' }}
                                                                                />
                                                                            </td>
                                                                            <td style={{ padding: '12px 6px' }}>
                                                                                <input 
                                                                                    type="checkbox" 
                                                                                    checked={hasGranularPermission(m.id, 'delete')} 
                                                                                    onChange={() => toggleGranularPermission(m.id, 'delete')} 
                                                                                    style={{ accentColor: 'var(--success)', cursor: 'pointer', width: '15px', height: '15px' }}
                                                                                />
                                                                            </td>
                                                                            <td style={{ padding: '12px 6px' }}>
                                                                                <div 
                                                                                    onClick={() => toggleAllModule(m.id)}
                                                                                    style={{
                                                                                        width: '38px',
                                                                                        height: '20px',
                                                                                        borderRadius: '10px',
                                                                                        background: allCheckedVal ? 'var(--success)' : 'var(--border-color)',
                                                                                        border: '1px solid var(--border-color)',
                                                                                        position: 'relative',
                                                                                        cursor: 'pointer',
                                                                                        transition: 'all 0.2s',
                                                                                        display: 'inline-block',
                                                                                        verticalAlign: 'middle'
                                                                                    }}
                                                                                >
                                                                                    <div style={{
                                                                                        width: '14px',
                                                                                        height: '14px',
                                                                                        borderRadius: '50%',
                                                                                        background: 'var(--white)',
                                                                                        position: 'absolute',
                                                                                        top: '2px',
                                                                                        left: allCheckedVal ? '20px' : '2px',
                                                                                        transition: 'all 0.2s'
                                                                                    }} />
                                                                                </div>
                                                                            </td>
                                                                        </tr>
                                                                    );
                                                                })}
                                                            </React.Fragment>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
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
                                        style={{ background: 'var(--success)', border: '1px solid var(--success)', fontSize: '0.8rem', borderRadius: '8px', fontWeight: 700 }}
                                    >
                                        {saving ? 'Saving...' : 'Save Settings'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                );
            })()}

            {/* Modal Dialog for Registering a New User */}
            {showAddUserModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(5px)' }}>
                    <div style={{ background: 'var(--card-bg, #ffffff)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px', width: '95%', maxWidth: '450px', boxShadow: 'var(--shadow-lg)' }}>
                        <div className="d-flex justify-content-between align-items-center mb-3 border-bottom pb-2" style={{ borderColor: 'var(--border-color)' }}>
                            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>Register New User Account</h3>
                            <button type="button" onClick={() => setShowAddUserModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                <span className="material-icons-outlined">close</span>
                            </button>
                        </div>
                        <form onSubmit={handleCreateUser} className="d-flex flex-column gap-3">
                            <div>
                                <label className="d-block mb-1" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)' }}>Username *</label>
                                <input 
                                    type="text" 
                                    required 
                                    placeholder="Enter login username" 
                                    className="input-premium w-100" 
                                    value={newUser.username} 
                                    onChange={(e) => setNewUser({...newUser, username: e.target.value})} 
                                />
                            </div>
                            <div>
                                <label className="d-block mb-1" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)' }}>Name</label>
                                <input 
                                    type="text" 
                                    placeholder="Enter employee's name" 
                                    className="input-premium w-100" 
                                    value={newUser.name} 
                                    onChange={(e) => setNewUser({...newUser, name: e.target.value})} 
                                />
                            </div>
                            <div>
                                <label className="d-block mb-1" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)' }}>Password *</label>
                                <input 
                                    type="password" 
                                    required 
                                    placeholder="Enter password" 
                                    className="input-premium w-100" 
                                    value={newUser.password} 
                                    onChange={(e) => setNewUser({...newUser, password: e.target.value})} 
                                />
                            </div>
                            <div>
                                <label className="d-block mb-1" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)' }}>Phone No</label>
                                <input 
                                    type="text" 
                                    placeholder="Enter contact number" 
                                    className="input-premium w-100" 
                                    value={newUser.phone} 
                                    onChange={(e) => setNewUser({...newUser, phone: e.target.value})} 
                                />
                            </div>
                            <div>
                                <label className="d-block mb-1" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)' }}>Assigned Role *</label>
                                <select 
                                    className="input-premium w-100" 
                                    value={newUser.role} 
                                    onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                                >
                                    <option value="SUPER_ADMIN">SUPER_ADMIN (Owner / Full system access)</option>
                                    <option value="BRANCH_MANAGER">BRANCH_MANAGER (Roster, POS & Calendar control)</option>
                                    <option value="RECEPTIONIST">RECEPTIONIST (Admissions, Attendance & Payments)</option>
                                    <option value="FINANCE_MANAGER">FINANCE_MANAGER (Billing & ledger accounts access)</option>
                                </select>
                            </div>

                            <div className="d-flex justify-content-end gap-2 border-top pt-3 mt-2" style={{ borderColor: 'var(--border-color)' }}>
                                <button 
                                    type="button" 
                                    onClick={() => setShowAddUserModal(false)} 
                                    className="btn btn-secondary py-2 px-3" 
                                    style={{ fontSize: '0.8rem', borderRadius: '8px' }}
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={creatingUser}
                                    className="btn text-white py-2 px-4" 
                                    style={{ background: 'var(--success)', border: '1px solid var(--success)', fontSize: '0.8rem', borderRadius: '8px', fontWeight: 700 }}
                                >
                                    {creatingUser ? 'Creating...' : 'Register User'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

