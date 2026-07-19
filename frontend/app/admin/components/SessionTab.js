import React from 'react';

export default function SessionTab(props) {
    const { setErrorMessage, setSuccessMessage, setLoading, BACKEND_URL, getHeaders, newSessionData, setNewSessionData, loadSessions, sessionsList } = props;
        const handleCreateSession = async (e) => {
            e.preventDefault();
            setErrorMessage('');
            setSuccessMessage('');
            setLoading(true);
            try {
                const res = await fetch(`${BACKEND_URL}/api/academy/sessions`, {
                    method: 'POST',
                    headers: getHeaders(),
                    body: JSON.stringify(newSessionData)
                });
                const data = await res.json();
                if (res.ok) {
                    setSuccessMessage(`Session "${newSessionData.name}" created successfully.`);
                    setNewSessionData({ name: '', startDate: '', endDate: '', status: 'ACTIVE' });
                    loadSessions();
                } else {
                    setErrorMessage(data.error || 'Failed to create session.');
                }
            } catch (err) {
                setErrorMessage('Network error creating session.');
            } finally {
                setLoading(false);
            }
        };

        const handleToggleSessionStatus = async (id, currentStatus) => {
            const nextStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
            setErrorMessage('');
            setSuccessMessage('');
            setLoading(true);
            try {
                const res = await fetch(`${BACKEND_URL}/api/academy/sessions/${id}`, {
                    method: 'PUT',
                    headers: getHeaders(),
                    body: JSON.stringify({ status: nextStatus })
                });
                if (res.ok) {
                    setSuccessMessage(`Session status updated to ${nextStatus}.`);
                    loadSessions();
                } else {
                    const data = await res.json();
                    setErrorMessage(data.error || 'Failed to update session.');
                }
            } catch (err) {
                setErrorMessage('Network error updating session.');
            } finally {
                setLoading(false);
            }
        };

        return (
            <div className="card-premium animate-fade-in">
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="material-icons-outlined" style={{ color: 'var(--emerald)' }}>school</span> Academy Training & Billing Sessions
                    </h3>
                </div>
                
                <div className="row g-4">
                    <div className="col-md-5">
                        <div className="card-premium p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', color: 'inherit' }}>
                            <h5 className="mb-3" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-main, #fff)' }}>
                                <span className="material-icons-outlined" style={{ fontSize: '1.1rem', color: 'var(--success-text)' }}>add_circle</span> Define New Session
                            </h5>
                            <form onSubmit={handleCreateSession} className="d-flex flex-column gap-3">
                                <div>
                                    <label className="d-block mb-1" style={{ fontSize: '0.8rem', color: 'var(--text-muted, #94a3b8)', fontWeight: 500 }}>Session Label *</label>
                                    <input 
                                        type="text" 
                                        required 
                                        placeholder="e.g. Summer Camp 2026" 
                                        className="input-premium w-100" 
                                        value={newSessionData.name} 
                                        onChange={(e) => setNewSessionData({...newSessionData, name: e.target.value})} 
                                    />
                                </div>
                                <div>
                                    <label className="d-block mb-1" style={{ fontSize: '0.8rem', color: 'var(--text-muted, #94a3b8)', fontWeight: 500 }}>Start Date *</label>
                                    <input 
                                        type="date" 
                                        required 
                                        className="input-premium w-100" 
                                        value={newSessionData.startDate} 
                                        onChange={(e) => setNewSessionData({...newSessionData, startDate: e.target.value})} 
                                    />
                                </div>
                                <div>
                                    <label className="d-block mb-1" style={{ fontSize: '0.8rem', color: 'var(--text-muted, #94a3b8)', fontWeight: 500 }}>End Date *</label>
                                    <input 
                                        type="date" 
                                        required 
                                        className="input-premium w-100" 
                                        value={newSessionData.endDate} 
                                        onChange={(e) => setNewSessionData({...newSessionData, endDate: e.target.value})} 
                                    />
                                </div>
                                <div>
                                    <label className="d-block mb-1" style={{ fontSize: '0.8rem', color: 'var(--text-muted, #94a3b8)', fontWeight: 500 }}>Initial Status *</label>
                                    <select 
                                        className="input-premium w-100" 
                                        value={newSessionData.status} 
                                        onChange={(e) => setNewSessionData({...newSessionData, status: e.target.value})}
                                    >
                                        <option value="ACTIVE">Active (Enabling admissions)</option>
                                        <option value="INACTIVE">Inactive</option>
                                    </select>
                                </div>
                                <button type="submit" className="btn-primary-stripe mt-2">Create Session</button>
                            </form>
                        </div>
                    </div>
                    
                    <div className="col-md-7">
                        <h5 className="mb-3">Configured Sessions ({sessionsList.length})</h5>
                        <div className="table-responsive">
                            <table className="table-premium">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Start Date</th>
                                        <th>End Date</th>
                                        <th>Status</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sessionsList.length === 0 ? (
                                        <tr><td colSpan="5" className="text-center text-muted py-3">No sessions defined yet</td></tr>
                                    ) : (
                                        sessionsList.map(s => (
                                            <tr key={s._id}>
                                                <td><strong>{s.name}</strong></td>
                                                <td>{new Date(s.startDate).toLocaleDateString('en-IN')}</td>
                                                <td>{new Date(s.endDate).toLocaleDateString('en-IN')}</td>
                                                <td>
                                                    <span className={`badge-stripe ${s.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}`}>
                                                        {s.status}
                                                    </span>
                                                </td>
                                                <td>
                                                    <button 
                                                        className={`btn btn-sm ${s.status === 'ACTIVE' ? 'btn-outline-danger' : 'btn-outline-success'}`}
                                                        onClick={() => handleToggleSessionStatus(s._id, s.status)}
                                                    >
                                                        {s.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        );
}
