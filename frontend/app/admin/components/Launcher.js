"use client";

import React, { useState, useEffect } from 'react';

const ALL_MODULES = [
    { id: 'dashboard', label: 'Dashboard', category: 'Main', icon: 'grid_view' },
    { id: 'turf-management', label: 'Turf Bookings', category: 'Main', icon: 'sports_soccer', key: 'bookings' },
    { id: 'turf-management', label: 'Turf Management', category: 'Main', icon: 'settings_suggest', key: 'calendar' },
    { id: 'membership-management', label: 'Membership Management', category: 'Academy', icon: 'people', key: 'active' },
    { id: 'membership-management', label: 'New Admission', category: 'Academy', icon: 'person_add', key: 'new-admission' },
    { id: 'membership-management', label: 'Session Promotion', category: 'Academy', icon: 'move_up', key: 'promotion' },
    { id: 'batch-management', label: 'Batch Management', category: 'Academy', icon: 'groups' },
    { id: 'coach-management', label: 'Coach Management', category: 'Academy', icon: 'sports' },
    { id: 'attendance-management', label: 'Attendance Management', category: 'Academy', icon: 'fact_check' },
    { id: 'communication', label: 'Communication Center', category: 'Communication', icon: 'chat' },
    { id: 'finance', label: 'Finance & Accounts', category: 'Finance', icon: 'account_balance_wallet', key: 'plans' },
    { id: 'finance', label: 'Payment Collection', category: 'Finance', icon: 'payments', key: 'collect' },
    { id: 'inventory-management', label: 'Inventory & POS', category: 'Inventory', icon: 'inventory_2' },
    { id: 'hr', label: 'Human Resources (HR)', category: 'Staff', icon: 'badge' },
    { id: 'website', label: 'Website Management', category: 'Settings', icon: 'web' },
    { id: 'settings', label: 'Settings', category: 'Settings', icon: 'settings' },
    { id: 'audit-logs', label: 'Audit Logs', category: 'Settings', icon: 'history' }
];

export default function Launcher({ isOpen, onClose, allStudents, onSelectStudent, onSelectTab }) {
    const [query, setQuery] = useState('');
    const [recentModules, setRecentModules] = useState([]);
    const [pinnedModules, setPinnedModules] = useState(['membership-management', 'turf-management', 'finance']);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('kp_recent_modules');
            if (saved) setRecentModules(JSON.parse(saved));
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleModuleClick = (mod) => {
        // Save to recents
        let updated = [mod.id, ...recentModules.filter(id => id !== mod.id)].slice(0, 5);
        setRecentModules(updated);
        localStorage.setItem('kp_recent_modules', JSON.stringify(updated));

        onSelectTab(mod.id, mod.key || mod.id);
        onClose();
    };

    // Filter modules
    const filteredModules = ALL_MODULES.filter(m => 
        m.label.toLowerCase().includes(query.toLowerCase()) ||
        m.category.toLowerCase().includes(query.toLowerCase())
    );

    // Filter members
    const filteredMembers = query.length >= 2 
        ? allStudents.filter(s => 
            s.name.toLowerCase().includes(query.toLowerCase()) ||
            s.membershipId?.toLowerCase().includes(query.toLowerCase()) ||
            s.phone?.includes(query)
          )
        : [];

    return (
        <div className="launcher-overlay" onClick={onClose}>
            <div className="launcher-modal" onClick={(e) => e.stopPropagation()}>
                {/* Search Header */}
                <div className="launcher-header">
                    <span className="material-icons-outlined search-icon">search</span>
                    <input 
                        type="text" 
                        placeholder="Search members by name/ID/phone, or find modules..." 
                        autoFocus 
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="launcher-input"
                    />
                    <button className="launcher-close-btn" onClick={onClose}>ESC</button>
                </div>

                {/* Body Content */}
                <div className="launcher-body">
                    {/* Search Results for Members */}
                    {filteredMembers.length > 0 && (
                        <div className="launcher-section">
                            <div className="launcher-section-title">Members Directory Search Results</div>
                            <div className="launcher-list">
                                {filteredMembers.map(member => (
                                    <button 
                                        key={member._id}
                                        onClick={() => { onSelectStudent(member); onClose(); }}
                                        className="launcher-item member-item"
                                    >
                                        <span className="material-icons-outlined">person</span>
                                        <div>
                                            <strong>{member.name}</strong> 
                                            <span className="member-id">{member.membershipId || 'No ID'}</span>
                                            <span className="member-subtext">{member.sport.toUpperCase()} | {member.phone}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {query.length === 0 && (
                        <>
                            {/* Pinned / Quick Links */}
                            <div className="launcher-section">
                                <div className="launcher-section-title">📌 Pinned Actions</div>
                                <div className="launcher-grid">
                                    {ALL_MODULES.filter(m => pinnedModules.includes(m.id)).map(m => (
                                        <button key={m.id} onClick={() => handleModuleClick(m)} className="launcher-card">
                                            <span className="material-icons-outlined">{m.icon}</span>
                                            <span>{m.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Recents */}
                            {recentModules.length > 0 && (
                                <div className="launcher-section">
                                    <div className="launcher-section-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span className="material-icons-outlined" style={{ fontSize: '16px', color: 'var(--amber)' }}>bolt</span> Recent Modules
                                    </div>
                                    <div className="launcher-list">
                                        {ALL_MODULES.filter(m => recentModules.includes(m.id)).map(m => (
                                            <button key={m.id} onClick={() => handleModuleClick(m)} className="launcher-item">
                                                <span className="material-icons-outlined">history</span>
                                                <span>{m.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* Categorized Modules */}
                    <div className="launcher-section">
                        <div className="launcher-section-title">📂 All System Modules</div>
                        <div className="launcher-list">
                            {filteredModules.map(m => (
                                <button key={m.id + (m.key || '')} onClick={() => handleModuleClick(m)} className="launcher-item">
                                    <span className="material-icons-outlined">{m.icon}</span>
                                    <div>
                                        <span>{m.label}</span>
                                        <span className="launcher-item-category">{m.category}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer hints */}
                <div className="launcher-footer">
                    <span>↑↓ Navigation</span>
                    <span>↵ Select</span>
                    <span>ESC Close</span>
                </div>
            </div>

            <style jsx>{`
                .launcher-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(4, 6, 9, 0.75);
                    backdrop-filter: blur(12px);
                    display: flex;
                    align-items: flex-start;
                    justify-content: center;
                    padding-top: 10vh;
                    z-index: 9999;
                }
                .launcher-modal {
                    width: 100%;
                    max-width: 650px;
                    background: #0f172a;
                    border: 1px solid #334155;
                    border-radius: 16px;
                    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5);
                    overflow: hidden;
                    animation: launcherSlideIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
                }
                @keyframes launcherSlideIn {
                    from { transform: translateY(-10px) scale(0.98); opacity: 0; }
                    to { transform: translateY(0) scale(1); opacity: 1; }
                }
                .launcher-header {
                    display: flex;
                    align-items: center;
                    padding: 16px 20px;
                    border-bottom: 1px solid #1e293b;
                    gap: 12px;
                }
                .search-icon {
                    color: #94a3b8;
                    font-size: 24px;
                }
                .launcher-input {
                    flex: 1;
                    background: transparent;
                    border: none;
                    color: #f8fafc;
                    font-size: 1.1rem;
                    outline: none;
                }
                .launcher-close-btn {
                    background: #1e293b;
                    border: 1px solid #334155;
                    border-radius: 4px;
                    color: #64748b;
                    font-size: 0.75rem;
                    font-weight: 700;
                    padding: 4px 8px;
                    cursor: pointer;
                }
                .launcher-body {
                    max-height: 450px;
                    overflow-y: auto;
                    padding: 16px 20px;
                }
                .launcher-section {
                    margin-bottom: 24px;
                }
                .launcher-section:last-child {
                    margin-bottom: 0;
                }
                .launcher-section-title {
                    color: #64748b;
                    font-size: 0.75rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    margin-bottom: 10px;
                }
                .launcher-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 12px;
                }
                .launcher-card {
                    background: #1e293b;
                    border: 1px solid #334155;
                    border-radius: 10px;
                    padding: 16px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 8px;
                    color: #e2e8f0;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                .launcher-card:hover {
                    background: #3b82f6;
                    border-color: #60a5fa;
                    color: #fff;
                    transform: translateY(-2px);
                }
                .launcher-card span:first-child {
                    font-size: 28px;
                }
                .launcher-card span:last-child {
                    font-size: 0.8rem;
                    font-weight: 600;
                }
                .launcher-list {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }
                .launcher-item {
                    background: transparent;
                    border: none;
                    border-radius: 8px;
                    padding: 10px 12px;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    color: #cbd5e1;
                    width: 100%;
                    text-align: left;
                    cursor: pointer;
                    transition: all 0.15s ease;
                }
                .launcher-item:hover {
                    background: rgba(59, 130, 246, 0.15);
                    color: #3b82f6;
                }
                .launcher-item span {
                    font-size: 20px;
                    color: #94a3b8;
                }
                .launcher-item:hover span {
                    color: #3b82f6;
                }
                .launcher-item div {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    width: 100%;
                }
                .launcher-item-category {
                    font-size: 0.7rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    background: #1e293b;
                    padding: 2px 6px;
                    border-radius: 4px;
                    color: #94a3b8;
                }
                .member-item {
                    border: 1px solid #1e293b;
                    background: rgba(30, 41, 59, 0.3);
                }
                .member-item:hover {
                    border-color: #3b82f6;
                }
                .member-item div {
                    display: flex;
                    flex-direction: column;
                    align-items: flex-start;
                }
                .member-id {
                    font-size: 0.75rem;
                    background: rgba(16, 185, 129, 0.1);
                    color: #10b981;
                    border: 1px solid rgba(16, 185, 129, 0.2);
                    padding: 1px 6px;
                    border-radius: 4px;
                    font-weight: 700;
                    margin-left: 8px;
                    display: inline-block;
                }
                .member-subtext {
                    font-size: 0.75rem;
                    color: #64748b;
                    margin-top: 2px;
                }
                .launcher-footer {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    padding: 10px 20px;
                    background: #090d16;
                    border-top: 1px solid #1e293b;
                    color: #475569;
                    font-size: 0.75rem;
                    font-weight: 600;
                }
            `}</style>
        </div>
    );
}
