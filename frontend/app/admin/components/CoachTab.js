"use client";

import React, { useState, useEffect } from 'react';

export default function CoachTab({ 
    coachesList, 
    backendUrl, 
    getHeaders, 
    onRefresh 
}) {
    const [subView, setSubView] = useState('list'); // 'list', 'new', 'edit'
    const [editingCoach, setEditingCoach] = useState(null);

    // Form states
    const [coachForm, setCoachForm] = useState({
        name: '', phone: '', email: '', sports: ['cricket'], salary: 0, schedule: 'Mon-Sat 06:00 AM - 08:00 AM'
    });

    const handleCreateCoach = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`${backendUrl}/api/academy/coaches`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(coachForm)
            });
            if (res.ok) {
                alert('Coach successfully registered!');
                onRefresh();
                setSubView('list');
                setCoachForm({
                    name: '', phone: '', email: '', sports: ['cricket'], salary: 0, schedule: 'Mon-Sat 06:00 AM - 08:00 AM'
                });
            } else {
                const data = await res.json();
                alert('Error: ' + data.error);
            }
        } catch (err) {
            alert('Failed to register coach.');
        }
    };

    const handleUpdateCoach = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`${backendUrl}/api/academy/coaches/${editingCoach._id}`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify(editingCoach)
            });
            if (res.ok) {
                alert('Coach profile updated successfully!');
                onRefresh();
                setSubView('list');
                setEditingCoach(null);
            } else {
                const data = await res.json();
                alert('Error: ' + data.error);
            }
        } catch (err) {
            alert('Failed to update coach.');
        }
    };

    const handleDeleteCoach = async (coachId) => {
        if (!confirm('Are you sure you want to remove this coach?')) return;
        try {
            const res = await fetch(`${backendUrl}/api/academy/coaches/${coachId}`, {
                method: 'DELETE',
                headers: getHeaders()
            });
            if (res.ok) {
                alert('Coach successfully removed.');
                onRefresh();
            } else {
                const data = await res.json();
                alert('Error: ' + data.error);
            }
        } catch (err) {
            alert('Failed to delete coach.');
        }
    };

    return (
        <div className="animate-fade-in">
            {/* Sub Nav */}
            <div className="d-flex gap-3 mb-4 border-bottom pb-2">
                <button className={`sub-tab-link ${subView === 'list' ? 'active' : ''}`} onClick={() => setSubView('list')}>Coaches List</button>
                <button className={`sub-tab-link ${subView === 'new' ? 'active' : ''}`} onClick={() => setSubView('new')}>Register Coach</button>
            </div>

            {/* List */}
            {subView === 'list' && (
                <div className="card-premium">
                    <div className="table-responsive">
                        <table className="table-premium">
                            <thead>
                                <tr>
                                    <th>Coach Name</th>
                                    <th>Phone</th>
                                    <th>Email</th>
                                    <th>Sports</th>
                                    <th>Salary</th>
                                    <th>Schedule</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Array.isArray(coachesList) && coachesList.length > 0 ? (
                                    coachesList.map(c => (
                                        <tr key={c._id}>
                                            <td><strong>{c.name}</strong></td>
                                            <td>{c.phone}</td>
                                            <td>{c.email || 'N/A'}</td>
                                            <td>
                                                {(c.sports || []).map(s => (
                                                    <span key={s} className="badge-pill bg-opacity-10 bg-info text-info me-1" style={{ textTransform: 'capitalize' }}>
                                                        {s}
                                                    </span>
                                                ))}
                                            </td>
                                            <td>₹{c.salary} / month</td>
                                            <td>{c.schedule}</td>
                                            <td>
                                                <span className={`badge-pill ${c.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}`}>
                                                    {c.status}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="d-flex gap-2">
                                                    <button className="btn-secondary-stripe py-1 px-2" onClick={() => { setEditingCoach(c); setSubView('edit'); }}>Edit</button>
                                                    <button className="btn-secondary-stripe py-1 px-2" style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }} onClick={() => handleDeleteCoach(c._id)}>Delete</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="8" className="text-center p-4 text-muted">No coaches registered in the academy.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Register Coach */}
            {subView === 'new' && (
                <div className="card-premium">
                    <h3 className="mb-4">Register New Coach</h3>
                    <form onSubmit={handleCreateCoach} className="row g-3">
                        <div className="col-md-6">
                            <label className="d-block mb-1">Coach Name *</label>
                            <input type="text" required placeholder="e.g. Coach Rajan" className="input-premium w-100" value={coachForm.name} onChange={(e) => setCoachForm({...coachForm, name: e.target.value})} />
                        </div>
                        <div className="col-md-6">
                            <label className="d-block mb-1">Phone Number *</label>
                            <input type="tel" required placeholder="e.g. 9876543210" className="input-premium w-100" value={coachForm.phone} onChange={(e) => setCoachForm({...coachForm, phone: e.target.value})} />
                        </div>
                        <div className="col-md-6">
                            <label className="d-block mb-1">Email Address</label>
                            <input type="email" placeholder="e.g. rajan@khelopatna.in" className="input-premium w-100" value={coachForm.email} onChange={(e) => setCoachForm({...coachForm, email: e.target.value})} />
                        </div>
                        <div className="col-md-6">
                            <label className="d-block mb-1">Sports Coached (Comma-separated) *</label>
                            <input type="text" placeholder="cricket, football" required className="input-premium w-100" value={coachForm.sports.join(', ')} onChange={(e) => setCoachForm({...coachForm, sports: e.target.value.split(',').map(s => s.trim())})} />
                        </div>
                        <div className="col-md-6">
                            <label className="d-block mb-1">Salary Amount (INR / month) *</label>
                            <input type="number" required className="input-premium w-100" value={coachForm.salary} onChange={(e) => setCoachForm({...coachForm, salary: e.target.value})} />
                        </div>
                        <div className="col-md-6">
                            <label className="d-block mb-1">Schedule Timing *</label>
                            <input type="text" required placeholder="e.g. Mon-Sat 06:00-08:00 AM" className="input-premium w-100" value={coachForm.schedule} onChange={(e) => setCoachForm({...coachForm, schedule: e.target.value})} />
                        </div>

                        <div className="col-12 d-flex justify-content-end gap-3 mt-4">
                            <button type="button" className="btn-secondary-stripe" onClick={() => setSubView('list')}>Cancel</button>
                            <button type="submit" className="btn-primary-stripe" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                <span className="material-icons-outlined" style={{ fontSize: '16px' }}>add_circle</span> Register Coach
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Edit Coach */}
            {subView === 'edit' && editingCoach && (
                <div className="card-premium">
                    <h3 className="mb-4">Edit Coach: {editingCoach.name}</h3>
                    <form onSubmit={handleUpdateCoach} className="row g-3">
                        <div className="col-md-6">
                            <label className="d-block mb-1">Coach Name *</label>
                            <input type="text" required className="input-premium w-100" value={editingCoach.name} onChange={(e) => setEditingCoach({...editingCoach, name: e.target.value})} />
                        </div>
                        <div className="col-md-6">
                            <label className="d-block mb-1">Phone Number *</label>
                            <input type="tel" required className="input-premium w-100" value={editingCoach.phone} onChange={(e) => setEditingCoach({...editingCoach, phone: e.target.value})} />
                        </div>
                        <div className="col-md-6">
                            <label className="d-block mb-1">Email Address</label>
                            <input type="email" className="input-premium w-100" value={editingCoach.email || ''} onChange={(e) => setEditingCoach({...editingCoach, email: e.target.value})} />
                        </div>
                        <div className="col-md-6">
                            <label className="d-block mb-1">Sports Coached (Comma-separated) *</label>
                            <input type="text" required className="input-premium w-100" value={editingCoach.sports.join(', ')} onChange={(e) => setEditingCoach({...editingCoach, sports: e.target.value.split(',').map(s => s.trim())})} />
                        </div>
                        <div className="col-md-6">
                            <label className="d-block mb-1">Salary Amount (INR / month) *</label>
                            <input type="number" required className="input-premium w-100" value={editingCoach.salary} onChange={(e) => setEditingCoach({...editingCoach, salary: Number(e.target.value)})} />
                        </div>
                        <div className="col-md-6">
                            <label className="d-block mb-1">Schedule Timing *</label>
                            <input type="text" required className="input-premium w-100" value={editingCoach.schedule} onChange={(e) => setEditingCoach({...editingCoach, schedule: e.target.value})} />
                        </div>
                        <div className="col-md-6">
                            <label className="d-block mb-1">Status</label>
                            <select className="input-premium w-100" value={editingCoach.status} onChange={(e) => setEditingCoach({...editingCoach, status: e.target.value})}>
                                <option value="ACTIVE">ACTIVE</option>
                                <option value="INACTIVE">INACTIVE</option>
                            </select>
                        </div>

                        <div className="col-12 d-flex justify-content-end gap-3 mt-4">
                            <button type="button" className="btn-secondary-stripe" onClick={() => { setSubView('list'); setEditingCoach(null); }}>Cancel</button>
                            <button type="submit" className="btn-primary-stripe">💾 Save Changes</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
