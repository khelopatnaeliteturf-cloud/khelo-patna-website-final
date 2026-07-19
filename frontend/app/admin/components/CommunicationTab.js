import React from 'react';

export default function CommunicationTab(props) {
    const { commType, setCommType, handleCommunicateSubmit, commStudentMsg, setCommStudentMsg, allStudents, commGroupMsg, setCommGroupMsg, commStaffMsg, setCommStaffMsg, commEmail, setCommEmail } = props;

        return (
            <div className="card-premium animate-fade-in">
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="material-icons-outlined" style={{ color: 'var(--primary)' }}>chat</span> Communicate Center
                    </h3>
                </div>

                <div className="d-flex gap-3 mb-4 border-bottom pb-2">
                    {[
                        { id: 'single', label: 'Single Member' },
                        { id: 'broadcast', label: 'Bulk Broadcast' },
                        { id: 'staff', label: 'Staff Notice' },
                        { id: 'email', label: 'Email transactional' }
                    ].map(t => (
                        <button 
                            key={t.id} 
                            className={`sub-tab-link ${commType === t.id ? 'active' : ''}`} 
                            onClick={() => setCommType(t.id)}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                {commType === 'single' && (
                    <form onSubmit={(e) => handleCommunicateSubmit('single_msg', e)} className="d-flex flex-column gap-3" style={{ maxWidth: '500px' }}>
                        <div>
                            <label className="d-block mb-1 text-muted">Select Student / Member</label>
                            <select 
                                className="input-premium w-100" 
                                value={commStudentMsg.studentId} 
                                onChange={(e) => setCommStudentMsg({...commStudentMsg, studentId: e.target.value})}
                                required
                            >
                                <option value="">Select recipient...</option>
                                {allStudents.map(s => (
                                    <option key={s._id} value={s._id}>{s.name} ({s.sport.toUpperCase()} | {s.phone || s.fatherMobile})</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="d-block mb-1 text-muted">WhatsApp Message Content</label>
                            <textarea 
                                className="input-premium w-100" 
                                rows="5" 
                                placeholder="Enter custom message details..." 
                                value={commStudentMsg.message}
                                onChange={(e) => setCommStudentMsg({...commStudentMsg, message: e.target.value})}
                                required
                            />
                        </div>
                        <button type="submit" className="btn-primary-stripe" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                            <span className="material-icons-outlined" style={{ fontSize: '16px' }}>chat</span> Send WhatsApp Message
                        </button>
                    </form>
                )}

                {commType === 'broadcast' && (
                    <form onSubmit={(e) => handleCommunicateSubmit(commGroupMsg.groupType === 'cricket' ? 'cricket_group_msg' : 'football_group_msg', e)} className="d-flex flex-column gap-3" style={{ maxWidth: '500px' }}>
                        <div>
                            <label className="d-block mb-1 text-muted">Target Academy Group</label>
                            <select 
                                className="input-premium w-100" 
                                value={commGroupMsg.groupType} 
                                onChange={(e) => setCommGroupMsg({...commGroupMsg, groupType: e.target.value})}
                                required
                            >
                                <option value="cricket">Cricket Academy (All Active Members)</option>
                                <option value="football">Football Academy (All Active Members)</option>
                            </select>
                        </div>
                        <div>
                            <label className="d-block mb-1 text-muted">Broadcast Message Content</label>
                            <textarea 
                                className="input-premium w-100" 
                                rows="5" 
                                placeholder="Dear parents, academy slots are revised tomorrow..." 
                                value={commGroupMsg.message}
                                onChange={(e) => setCommGroupMsg({...commGroupMsg, message: e.target.value})}
                                required
                            />
                        </div>
                        <button type="submit" className="btn-primary-stripe" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                            <span className="material-icons-outlined" style={{ fontSize: '16px' }}>campaign</span> Broadcast Group WhatsApp
                        </button>
                    </form>
                )}

                {commType === 'staff' && (
                    <form onSubmit={(e) => handleCommunicateSubmit('staff_msg', e)} className="d-flex flex-column gap-3" style={{ maxWidth: '500px' }}>
                        <div>
                            <label className="d-block mb-1 text-muted">Staff Contact Phone</label>
                            <input 
                                type="text" 
                                className="input-premium w-100" 
                                placeholder="e.g. +91 99999 88888" 
                                value={commStaffMsg.phone} 
                                onChange={(e) => setCommStaffMsg({...commStaffMsg, phone: e.target.value})}
                                required
                            />
                        </div>
                        <div>
                            <label className="d-block mb-1 text-muted">WhatsApp Message Content</label>
                            <textarea 
                                className="input-premium w-100" 
                                rows="5" 
                                placeholder="Shift details for manager..." 
                                value={commStaffMsg.message}
                                onChange={(e) => setCommStaffMsg({...commStaffMsg, message: e.target.value})}
                                required
                            />
                        </div>
                        <button type="submit" className="btn-primary-stripe" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                            <span className="material-icons-outlined" style={{ fontSize: '16px' }}>chat</span> Send Staff Notice
                        </button>
                    </form>
                )}

                {commType === 'email' && (
                    <form onSubmit={(e) => handleCommunicateSubmit('email', e)} className="d-flex flex-column gap-3" style={{ maxWidth: '500px' }}>
                        <div>
                            <label className="d-block mb-1 text-muted">Recipient Email</label>
                            <input 
                                type="email" 
                                className="input-premium w-100" 
                                placeholder="e.g. parent@gmail.com" 
                                value={commEmail.email} 
                                onChange={(e) => setCommEmail({...commEmail, email: e.target.value})}
                                required
                            />
                        </div>
                        <div>
                            <label className="d-block mb-1 text-muted">Subject</label>
                            <input 
                                type="text" 
                                className="input-premium w-100" 
                                placeholder="Invoice payment receipt details..." 
                                value={commEmail.subject} 
                                onChange={(e) => setCommEmail({...commEmail, subject: e.target.value})}
                                required
                            />
                        </div>
                        <div>
                            <label className="d-block mb-1 text-muted">Email Body Content</label>
                            <textarea 
                                className="input-premium w-100" 
                                rows="5" 
                                placeholder="Dear customer, your invoice is processed..." 
                                value={commEmail.message}
                                onChange={(e) => setCommEmail({...commEmail, message: e.target.value})}
                                required
                            />
                        </div>
                        <button type="submit" className="btn-primary-stripe" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <span className="material-icons-outlined" style={{ fontSize: '16px' }}>mail</span> Dispatch Transactional Email
                        </button>
                    </form>
                )}
            </div>
        );
}
