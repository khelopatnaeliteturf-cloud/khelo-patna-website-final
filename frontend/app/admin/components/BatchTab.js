"use client";

import React, { useState, useEffect } from 'react';

export default function BatchTab({ 
    batchesList, 
    sessionsList, 
    coachesList, 
    allStudents, 
    backendUrl, 
    getHeaders,
    onRefresh 
}) {
    const [subView, setSubView] = useState('list'); // 'list', 'new', 'assign'
    const [selectedBatch, setSelectedBatch] = useState(null);

    // Form states
    const [newBatch, setNewBatch] = useState({
        name: '', sport: 'cricket', sessionId: '', coachId: '', groundId: 'Turf A',
        capacity: 20, startTime: '06:00 AM', endTime: '08:00 AM'
    });

    const [assignSelectedMembers, setAssignSelectedMembers] = useState([]);

    const handleCreateBatch = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`${backendUrl}/api/academy/batches`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(newBatch)
            });
            if (res.ok) {
                alert('Batch created successfully!');
                onRefresh();
                setSubView('list');
                setNewBatch({
                    name: '', sport: 'cricket', sessionId: '', coachId: '', groundId: 'Turf A',
                    capacity: 20, startTime: '06:00 AM', endTime: '08:00 AM'
                });
            } else {
                const data = await res.json();
                alert('Error: ' + data.error);
            }
        } catch (err) {
            alert('Failed to save batch.');
        }
    };

    const handleAssignMembers = async (e) => {
        e.preventDefault();
        if (!selectedBatch || assignSelectedMembers.length === 0) {
            alert('Please select a batch and at least one member.');
            return;
        }
        try {
            const res = await fetch(`${backendUrl}/api/academy/batches/${selectedBatch._id}/assign`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ studentIds: assignSelectedMembers })
            });
            if (res.ok) {
                alert('Members successfully assigned to batch!');
                setAssignSelectedMembers([]);
                onRefresh();
                setSubView('list');
                setSelectedBatch(null);
            } else {
                const data = await res.json();
                alert('Error: ' + data.error);
            }
        } catch (err) {
            alert('Failed to assign members.');
        }
    };

    const handleRemoveMembers = async (batchId, studentIds) => {
        if (!confirm('Are you sure you want to remove selected members from this batch?')) return;
        try {
            const res = await fetch(`${backendUrl}/api/academy/batches/${batchId}/remove`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ studentIds })
            });
            if (res.ok) {
                alert('Members successfully removed!');
                onRefresh();
                setSelectedBatch(null);
            } else {
                const data = await res.json();
                alert('Error: ' + data.error);
            }
        } catch (err) {
            alert('Failed to remove members.');
        }
    };

    return (
        <div className="animate-fade-in">
            {/* Sub Nav */}
            <div className="d-flex gap-3 mb-4 border-bottom pb-2">
                <button className={`sub-tab-link ${subView === 'list' ? 'active' : ''}`} onClick={() => { setSubView('list'); setSelectedBatch(null); }}>Active Batches</button>
                <button className={`sub-tab-link ${subView === 'new' ? 'active' : ''}`} onClick={() => setSubView('new')}>Create Batch</button>
            </div>

            {/* List */}
            {subView === 'list' && !selectedBatch && (
                <div className="card-premium">
                    <div className="table-responsive">
                        <table className="table-premium">
                            <thead>
                                <tr>
                                    <th>Batch Name</th>
                                    <th>Sport</th>
                                    <th>Coach</th>
                                    <th>Ground</th>
                                    <th>Timing</th>
                                    <th>Capacity</th>
                                    <th>Members</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {batchesList.length > 0 ? (
                                    batchesList.map(b => (
                                        <tr key={b._id}>
                                            <td><strong>{b.name}</strong></td>
                                            <td style={{ textTransform: 'capitalize' }}>{b.sport}</td>
                                            <td>{b.coachId?.name || 'Unassigned'}</td>
                                            <td>{b.groundId}</td>
                                            <td>{b.startTime} - {b.endTime}</td>
                                            <td>{b.capacity}</td>
                                            <td><strong>{b.members?.length || 0}</strong> enrolled</td>
                                            <td>
                                                <div className="d-flex gap-2">
                                                    <button className="btn-secondary-stripe py-1 px-2" onClick={() => setSelectedBatch(b)}>View Roster</button>
                                                    <button className="btn-primary-stripe py-1 px-2" onClick={() => { setSelectedBatch(b); setSubView('assign'); }} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                         <span className="material-icons-outlined" style={{ fontSize: '14px' }}>add_circle</span> Assign
                                                     </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="8" className="text-center p-4 text-muted">No training cohorts registered.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* View Roster */}
            {selectedBatch && subView === 'list' && (
                <div className="card-premium">
                    <div className="d-flex justify-content-between align-items-center mb-4 border-bottom pb-2">
                        <div>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span className="material-icons-outlined" style={{ color: 'var(--emerald)' }}>groups</span> {selectedBatch.name} Roster
                            </h3>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Coach: {selectedBatch.coachId?.name || 'Unassigned'} | Timing: {selectedBatch.startTime} - {selectedBatch.endTime}</span>
                        </div>
                        <button className="btn-secondary-stripe" onClick={() => setSelectedBatch(null)}>Back to Batches</button>
                    </div>

                    <div className="table-responsive">
                        <table className="table-premium">
                            <thead>
                                <tr>
                                    <th>Member ID</th>
                                    <th>Name</th>
                                    <th>Phone</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {selectedBatch.members && selectedBatch.members.length > 0 ? (
                                    selectedBatch.members.map(m => (
                                        <tr key={m._id}>
                                            <td><strong style={{ color: 'var(--primary)' }}>{m.membershipId}</strong></td>
                                            <td><strong>{m.name}</strong></td>
                                            <td>{m.phone || 'N/A'}</td>
                                            <td>
                                                <button className="btn-secondary-stripe py-1 px-2" onClick={() => handleRemoveMembers(selectedBatch._id, [m._id])}>Remove</button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="4" className="text-center p-4 text-muted">No students assigned to this batch.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Create Batch */}
            {subView === 'new' && (
                <div className="card-premium">
                    <h3 className="mb-4">Create New Training Batch</h3>
                    <form onSubmit={handleCreateBatch} className="row g-3">
                        <div className="col-md-6">
                            <label className="d-block mb-1">Batch Name *</label>
                            <input type="text" required placeholder="e.g. Under-14 Morning Advanced" className="input-premium w-100" value={newBatch.name} onChange={(e) => setNewBatch({...newBatch, name: e.target.value})} />
                        </div>
                        <div className="col-md-6">
                            <label className="d-block mb-1">Sport *</label>
                            <select className="input-premium w-100" value={newBatch.sport} onChange={(e) => setNewBatch({...newBatch, sport: e.target.value})}>
                                <option value="cricket">Cricket</option>
                                <option value="football">Football</option>
                            </select>
                        </div>
                        <div className="col-md-6">
                            <label className="d-block mb-1">Session *</label>
                            <select required className="input-premium w-100" value={newBatch.sessionId} onChange={(e) => setNewBatch({...newBatch, sessionId: e.target.value})}>
                                <option value="">Select Session</option>
                                {sessionsList.map(s => (
                                    <option key={s._id} value={s._id}>{s.name} ({s.status})</option>
                                ))}
                            </select>
                        </div>
                        <div className="col-md-6">
                            <label className="d-block mb-1">Coach</label>
                            <select className="input-premium w-100" value={newBatch.coachId} onChange={(e) => setNewBatch({...newBatch, coachId: e.target.value})}>
                                <option value="">Select Coach (Optional)</option>
                                {coachesList.filter(c => c.sports.includes(newBatch.sport)).map(c => (
                                    <option key={c._id} value={c._id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="col-md-4">
                            <label className="d-block mb-1">Ground / Turf Slot</label>
                            <input type="text" className="input-premium w-100" value={newBatch.groundId} onChange={(e) => setNewBatch({...newBatch, groundId: e.target.value})} />
                        </div>
                        <div className="col-md-4">
                            <label className="d-block mb-1">Max Capacity *</label>
                            <input type="number" required className="input-premium w-100" value={newBatch.capacity} onChange={(e) => setNewBatch({...newBatch, capacity: e.target.value})} />
                        </div>
                        <div className="col-md-2">
                            <label className="d-block mb-1">Start Time *</label>
                            <input type="text" placeholder="e.g. 06:00 AM" required className="input-premium w-100" value={newBatch.startTime} onChange={(e) => setNewBatch({...newBatch, startTime: e.target.value})} />
                        </div>
                        <div className="col-md-2">
                            <label className="d-block mb-1">End Time *</label>
                            <input type="text" placeholder="e.g. 08:00 AM" required className="input-premium w-100" value={newBatch.endTime} onChange={(e) => setNewBatch({...newBatch, endTime: e.target.value})} />
                        </div>

                        <div className="col-12 d-flex justify-content-end gap-3 mt-4">
                            <button type="button" className="btn-secondary-stripe" onClick={() => setSubView('list')}>Cancel</button>
                            <button type="submit" className="btn-primary-stripe" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                <span className="material-icons-outlined" style={{ fontSize: '16px' }}>add_circle</span> Create Batch
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Assign Members */}
            {subView === 'assign' && selectedBatch && (
                <div className="card-premium">
                    <h3 className="mb-4">Assign Members to {selectedBatch.name}</h3>
                    <form onSubmit={handleAssignMembers} className="row g-3">
                        <div className="col-12">
                            <label className="d-block mb-1">Select Active {selectedBatch.sport.toUpperCase()} Members to Enroll:</label>
                            <div className="border rounded p-3 bg-opacity-10 bg-white" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                                {allStudents
                                    .filter(s => s.status === 'ACTIVE' && s.sport === selectedBatch.sport)
                                    .map(student => {
                                        const isAlreadyEnrolled = selectedBatch.members?.some(m => m._id === student._id);
                                        if (isAlreadyEnrolled) return null;
                                        return (
                                            <div key={student._id} className="d-flex align-items-center gap-2 mb-2">
                                                <input 
                                                    type="checkbox"
                                                    checked={assignSelectedMembers.includes(student._id)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setAssignSelectedMembers([...assignSelectedMembers, student._id]);
                                                        } else {
                                                            setAssignSelectedMembers(assignSelectedMembers.filter(id => id !== student._id));
                                                        }
                                                    }}
                                                />
                                                <span><strong>{student.name}</strong> ({student.membershipId || 'No ID'}) | Phone: {student.phone}</span>
                                            </div>
                                        );
                                    })}
                            </div>
                        </div>

                        <div className="col-12 d-flex justify-content-end gap-3 mt-4">
                            <button type="button" className="btn-secondary-stripe" onClick={() => { setSubView('list'); setSelectedBatch(null); }}>Cancel</button>
                            <button type="submit" className="btn-primary-stripe" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                <span className="material-icons-outlined" style={{ fontSize: '16px' }}>add_circle</span> Assign Selected Members
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
