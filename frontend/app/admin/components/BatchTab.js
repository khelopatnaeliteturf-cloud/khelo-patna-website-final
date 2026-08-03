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
    const [editingBatch, setEditingBatch] = useState(null);
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        if (isEditing) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isEditing]);

    const handleEditClick = (b) => {
        setEditingBatch({
            ...b,
            coachId: b.coachId?._id || b.coachId || '',
            sessionId: b.sessionId?._id || b.sessionId || ''
        });
        setIsEditing(true);
    };

    const handleSaveBatch = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`${backendUrl}/api/academy/batches/${editingBatch._id}`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify(editingBatch)
            });
            if (res.ok) {
                alert('Batch updated successfully!');
                setIsEditing(false);
                setEditingBatch(null);
                onRefresh();
            } else {
                const data = await res.json();
                alert('Error: ' + data.error);
            }
        } catch (err) {
            alert('Failed to update batch.');
        }
    };

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
                                {Array.isArray(batchesList) && batchesList.length > 0 ? (
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
                                                    <button className="btn-secondary-stripe py-1 px-2" onClick={() => handleEditClick(b)} style={{ borderColor: 'var(--success)', color: 'var(--success)' }}>
                                                        <span className="material-icons-outlined" style={{ fontSize: '15px' }}>edit</span>
                                                    </button>
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
                                {Array.isArray(selectedBatch?.members) && selectedBatch.members.length > 0 ? (
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

            {/* Edit Batch Modal — styled like Book Turf panel */}
            {isEditing && editingBatch && (
                <div
                    style={{
                        position: 'fixed', inset: 0,
                        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 9999, padding: '20px'
                    }}
                    onClick={() => setIsEditing(false)}
                >
                    <div
                        style={{
                            background: 'var(--bg-color)', borderRadius: '24px',
                            width: '100%', maxWidth: '750px', maxHeight: '90vh', overflowY: 'auto',
                            boxShadow: '0 32px 80px rgba(0,0,0,0.45)', border: '1px solid var(--border-color)',
                            animation: 'slide-up 0.3s cubic-bezier(0.34,1.56,0.64,1)'
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div style={{ padding: '24px 28px', borderBottom: '1px solid var(--border-color)', position: 'relative' }}>
                            <button
                                type="button"
                                onClick={() => setIsEditing(false)}
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
                                    background: 'linear-gradient(135deg, var(--success) 0%, var(--primary) 100%)',
                                    color: 'var(--white)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: '0 4px 14px rgba(16,185,129,0.3)'
                                }}>
                                    <span className="material-icons-outlined" style={{ fontSize: '22px' }}>edit</span>
                                </div>
                                <div>
                                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', color: 'var(--text-main)' }}>
                                        Edit Training Batch
                                    </h3>
                                    <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                                        {editingBatch.name} · Update cohort details and scheduling
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Body Form */}
                        <form onSubmit={handleSaveBatch}>
                            <div style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

                                {/* Row 1 */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Batch Name *</label>
                                        <input
                                            type="text" required className="input-premium"
                                            style={{ width: '100%', fontSize: '0.85rem', padding: '10px 14px', borderRadius: '10px' }}
                                            value={editingBatch.name || ''}
                                            onChange={e => setEditingBatch({ ...editingBatch, name: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Sport *</label>
                                        <select
                                            className="input-premium"
                                            style={{ width: '100%', fontSize: '0.85rem', padding: '10px 14px', borderRadius: '10px' }}
                                            value={editingBatch.sport || ''}
                                            onChange={e => setEditingBatch({ ...editingBatch, sport: e.target.value })}
                                        >
                                            <option value="cricket">Cricket</option>
                                            <option value="football">Football</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Row 2 */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Session *</label>
                                        <select
                                            required className="input-premium"
                                            style={{ width: '100%', fontSize: '0.85rem', padding: '10px 14px', borderRadius: '10px' }}
                                            value={editingBatch.sessionId || ''}
                                            onChange={e => setEditingBatch({ ...editingBatch, sessionId: e.target.value })}
                                        >
                                            <option value="">Select Session</option>
                                            {sessionsList.map(s => (
                                                <option key={s._id} value={s._id}>{s.name} ({s.status})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Coach</label>
                                        <select
                                            className="input-premium"
                                            style={{ width: '100%', fontSize: '0.85rem', padding: '10px 14px', borderRadius: '10px' }}
                                            value={editingBatch.coachId || ''}
                                            onChange={e => setEditingBatch({ ...editingBatch, coachId: e.target.value })}
                                        >
                                            <option value="">Select Coach (Optional)</option>
                                            {coachesList.filter(c => c.sports.includes(editingBatch.sport)).map(c => (
                                                <option key={c._id} value={c._id}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Row 3 */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Ground / Turf Slot</label>
                                        <input
                                            type="text" className="input-premium"
                                            style={{ width: '100%', fontSize: '0.85rem', padding: '10px 14px', borderRadius: '10px' }}
                                            value={editingBatch.groundId || ''}
                                            onChange={e => setEditingBatch({ ...editingBatch, groundId: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Start Time *</label>
                                        <input
                                            type="text" required placeholder="06:00 AM" className="input-premium"
                                            style={{ width: '100%', fontSize: '0.85rem', padding: '10px 14px', borderRadius: '10px' }}
                                            value={editingBatch.startTime || ''}
                                            onChange={e => setEditingBatch({ ...editingBatch, startTime: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>End Time *</label>
                                        <input
                                            type="text" required placeholder="08:00 AM" className="input-premium"
                                            style={{ width: '100%', fontSize: '0.85rem', padding: '10px 14px', borderRadius: '10px' }}
                                            value={editingBatch.endTime || ''}
                                            onChange={e => setEditingBatch({ ...editingBatch, endTime: e.target.value })}
                                        />
                                    </div>
                                </div>

                                {/* Row 4 */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Max Capacity *</label>
                                        <input
                                            type="number" required className="input-premium"
                                            style={{ width: '100%', fontSize: '0.85rem', padding: '10px 14px', borderRadius: '10px' }}
                                            value={editingBatch.capacity || 20}
                                            onChange={e => setEditingBatch({ ...editingBatch, capacity: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Status</label>
                                        <select
                                            className="input-premium"
                                            style={{ width: '100%', fontSize: '0.85rem', padding: '10px 14px', borderRadius: '10px' }}
                                            value={editingBatch.status || 'ACTIVE'}
                                            onChange={e => setEditingBatch({ ...editingBatch, status: e.target.value })}
                                        >
                                            <option value="ACTIVE">ACTIVE</option>
                                            <option value="INACTIVE">INACTIVE</option>
                                        </select>
                                    </div>
                                </div>

                            </div>

                            {/* Footer */}
                            <div style={{
                                display: 'flex', justifyContent: 'flex-end', gap: '12px',
                                borderTop: '1px solid var(--border-color)', padding: '20px 28px'
                            }}>
                                <button
                                    type="button"
                                    onClick={() => setIsEditing(false)}
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
                                    style={{
                                        padding: '10px 24px',
                                        background: 'linear-gradient(135deg, var(--success) 0%, var(--primary) 100%)',
                                        color: 'var(--white)', border: 'none', borderRadius: '10px',
                                        cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600,
                                        boxShadow: '0 4px 12px rgba(16,185,129,0.25)',
                                        display: 'flex', alignItems: 'center', gap: '6px',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <span className="material-icons-outlined" style={{ fontSize: '16px' }}>check_circle</span>
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}
