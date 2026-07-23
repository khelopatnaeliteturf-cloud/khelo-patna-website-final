import React from 'react';

function renderWhatsAppFormatted(text) {
    if (!text) return { __html: '' };
    const escaped = String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    
    const formatted = escaped
        .replace(/\*(.*?)\*/g, '<strong>$1</strong>')
        .replace(/_(.*?)_/g, '<em>$1</em>')
        .replace(/~(.*?)~/g, '<del>$1</del>')
        .replace(/\n/g, '<br/>');

    return { __html: formatted };
}

function getCleanSummary(text) {
    if (!text) return '';
    return String(text).replace(/[*_~]/g, '');
}

export default function CommunicationTab(props) {
    const { 
        commType, 
        setCommType, 
        handleCommunicateSubmit, 
        commStudentMsg, 
        setCommStudentMsg, 
        allStudents, 
        commGroupMsg, 
        setCommGroupMsg, 
        commStaffMsg, 
        setCommStaffMsg, 
        commEmail, 
        setCommEmail,
        backendUrl,
        getHeaders
    } = props;

    // Local state for communication logs
    const [logs, setLogs] = React.useState([]);
    const [loading, setLoading] = React.useState(false);
    const [search, setSearch] = React.useState('');
    const [filterType, setFilterType] = React.useState(''); // '', 'EMAIL', 'WHATSAPP'
    const [filterStatus, setFilterStatus] = React.useState(''); // '', 'SENT', 'FAILED'
    const [page, setPage] = React.useState(1);
    const [totalPages, setTotalPages] = React.useState(1);
    const [selectedLog, setSelectedLog] = React.useState(null); // For modal details

    const fetchLogs = React.useCallback(async () => {
        if (!backendUrl) return;
        setLoading(true);
        try {
            const queryParams = new URLSearchParams({
                page,
                limit: 10,
                search,
                type: filterType,
                status: filterStatus
            });
            const res = await fetch(`${backendUrl}/api/admin/communicate/logs?${queryParams}`, {
                headers: getHeaders()
            });
            const data = await res.json();
            if (data.success) {
                setLogs(data.logs || []);
                setTotalPages(data.pagination?.pages || 1);
            }
        } catch (err) {
            console.error('Error fetching communication logs:', err);
        } finally {
            setLoading(false);
        }
    }, [backendUrl, getHeaders, page, search, filterType, filterStatus]);

    React.useEffect(() => {
        if (commType === 'logs') {
            fetchLogs();
        }
    }, [commType, fetchLogs]);

    // Reset pagination when filters change
    React.useEffect(() => {
        setPage(1);
    }, [search, filterType, filterStatus]);

    return (
        <div className="card-premium animate-fade-in" style={{ position: 'relative' }}>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="material-icons-outlined" style={{ color: 'var(--primary)' }}>chat</span> Communicate Center
                </h3>
            </div>

            <div className="d-flex gap-3 mb-4 border-bottom pb-2 flex-wrap">
                {[
                    { id: 'single', label: 'Single Member' },
                    { id: 'broadcast', label: 'Bulk Broadcast' },
                    { id: 'staff', label: 'Staff Notice' },
                    { id: 'email', label: 'Email transactional' },
                    { id: 'logs', label: '📄 Logs (Email & WA)' }
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

            {commType === 'logs' && (
                <div className="animate-fade-in">
                    {/* Filters Section */}
                    <div className="row g-2 mb-3">
                        <div className="col-md-5">
                            <input 
                                type="text" 
                                className="input-premium w-100" 
                                placeholder="Search recipient, subject, or content..." 
                                value={search} 
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <div className="col-md-3 col-6">
                            <select 
                                className="input-premium w-100" 
                                value={filterType} 
                                onChange={(e) => setFilterType(e.target.value)}
                            >
                                <option value="">All Channels</option>
                                <option value="EMAIL">📧 Email</option>
                                <option value="WHATSAPP">💬 WhatsApp</option>
                            </select>
                        </div>
                        <div className="col-md-3 col-6">
                            <select 
                                className="input-premium w-100" 
                                value={filterStatus} 
                                onChange={(e) => setFilterStatus(e.target.value)}
                            >
                                <option value="">All Statuses</option>
                                <option value="SENT">🟢 Sent</option>
                                <option value="FAILED">🔴 Failed</option>
                            </select>
                        </div>
                        <div className="col-md-1 d-flex gap-2">
                            <button 
                                onClick={fetchLogs} 
                                className="btn-premium w-100 d-flex align-items-center justify-content-center"
                                title="Refresh Logs"
                            >
                                <span className="material-icons-outlined">refresh</span>
                            </button>
                        </div>
                    </div>

                    {/* Table Section */}
                    {loading ? (
                        <div className="text-center py-5">
                            <div className="spinner-border text-success" role="status">
                                <span className="visually-hidden">Loading...</span>
                            </div>
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="text-center py-5 text-muted border rounded-3 bg-light-subtle">
                            <span className="material-icons-outlined fs-1 mb-2">history</span>
                            <p className="mb-0">No communication logs found matching filters.</p>
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <table className="table table-hover align-middle" style={{ minWidth: '800px', fontSize: '0.88rem' }}>
                                <thead>
                                    <tr>
                                        <th>Channel</th>
                                        <th>Recipient</th>
                                        <th>Subject / Summary</th>
                                        <th>Status</th>
                                        <th>Sent Time</th>
                                        <th className="text-end">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logs.map((log) => {
                                        const isEmail = log.type === 'EMAIL';
                                        return (
                                            <tr key={log._id}>
                                                <td>
                                                    <span style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        padding: '4px 8px',
                                                        borderRadius: '6px',
                                                        fontSize: '0.75rem',
                                                        fontWeight: 700,
                                                        background: isEmail ? 'rgba(59, 130, 246, 0.08)' : 'rgba(16, 185, 129, 0.08)',
                                                        color: isEmail ? '#3b82f6' : '#10b981'
                                                    }}>
                                                        <span className="material-icons-outlined" style={{ fontSize: '14px' }}>
                                                            {isEmail ? 'mail' : 'chat'}
                                                        </span>
                                                        {log.type}
                                                    </span>
                                                </td>
                                                <td className="font-monospace" style={{ fontWeight: 600 }}>{log.recipient}</td>
                                                <td>
                                                    <div style={{ maxWidth: '340px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {isEmail ? (
                                                            <strong>{log.subject || '(No Subject)'}</strong>
                                                        ) : (
                                                            <span>{getCleanSummary(log.content)}</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td>
                                                    {log.status === 'SENT' ? (
                                                        <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1">
                                                            SENT
                                                        </span>
                                                    ) : (
                                                        <span 
                                                            className="badge bg-danger-subtle text-danger border border-danger-subtle px-2 py-1" 
                                                            title={log.errorMessage || 'Error occurred'}
                                                            style={{ cursor: 'help' }}
                                                        >
                                                            FAILED ⚠️
                                                        </span>
                                                    )}
                                                </td>
                                                <td>{new Date(log.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                                                <td className="text-end">
                                                    <button 
                                                        onClick={() => setSelectedLog(log)}
                                                        className="btn btn-sm btn-outline-success d-inline-flex align-items-center gap-1"
                                                        style={{ fontSize: '0.78rem', borderRadius: '8px' }}
                                                    >
                                                        <span className="material-icons-outlined" style={{ fontSize: '14px' }}>visibility</span> View Full
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>

                            {/* Pagination */}
                            <div className="d-flex justify-content-between align-items-center mt-3 pt-3 border-top flex-wrap gap-2">
                                <span className="text-muted" style={{ fontSize: '0.8rem' }}>
                                    Showing page <strong>{page}</strong> of <strong>{totalPages}</strong>
                                </span>
                                <div className="d-flex gap-2">
                                    <button 
                                        className="btn btn-sm btn-outline-secondary" 
                                        disabled={page <= 1}
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                    >
                                        Previous
                                    </button>
                                    <button 
                                        className="btn btn-sm btn-outline-secondary" 
                                        disabled={page >= totalPages}
                                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Modal for viewing detailed log content */}
            {selectedLog && (
                <div className="modal-backdrop-premium fade show d-flex align-items-center justify-content-center" style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh',
                    background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(10px)', zIndex: 999999
                }}>
                    <div className="card-premium animate-scale-up" style={{
                        width: '90%', maxWidth: '750px', maxHeight: '90vh', display: 'flex', flexDirection: 'column',
                        background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '24px',
                        overflow: 'hidden', padding: 0, boxShadow: '0 25px 60px rgba(0,0,0,0.5)'
                    }}>
                        <div className="p-4 border-bottom d-flex justify-content-between align-items-center">
                            <div>
                                <h4 className="mb-1" style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)' }}>Communication Details</h4>
                                <p className="mb-0 text-muted" style={{ fontSize: '0.78rem' }}>
                                    Sent: {new Date(selectedLog.createdAt).toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'medium' })}
                                </p>
                            </div>
                            <button 
                                onClick={() => setSelectedLog(null)} 
                                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                            >
                                <span className="material-icons-outlined" style={{ fontSize: '24px' }}>close</span>
                            </button>
                        </div>

                        <div className="p-4" style={{ overflowY: 'auto', flex: 1 }}>
                            <div className="row g-3 mb-4">
                                <div className="col-sm-6">
                                    <div className="text-muted mb-1" style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em' }}>RECIPIENT</div>
                                    <div className="font-monospace fw-bold" style={{ color: 'var(--text-main)', fontSize: '1rem' }}>{selectedLog.recipient}</div>
                                </div>
                                <div className="col-sm-6">
                                    <div className="text-muted mb-1" style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em' }}>BOOKED BY / INITIATOR</div>
                                    <div className="fw-bold" style={{ color: 'var(--primary)', fontSize: '0.92rem' }}>
                                        {selectedLog.bookedBy || selectedLog.sender || (selectedLog.type === 'EMAIL' ? 'KheloPatna System' : 'Online / WhatsApp Bot')}
                                    </div>
                                </div>
                                <div className="col-sm-6">
                                    <div className="text-muted mb-1" style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em' }}>CHANNEL</div>
                                    <div className="fw-bold" style={{ color: selectedLog.type === 'EMAIL' ? '#3b82f6' : '#10b981' }}>{selectedLog.type}</div>
                                </div>
                                <div className="col-sm-6">
                                    <div className="text-muted mb-1" style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em' }}>STATUS</div>
                                    <div>
                                        {selectedLog.status === 'SENT' ? (
                                            <span className="text-success fw-bold">🟢 Sent Successfully</span>
                                        ) : (
                                            <span className="text-danger fw-bold">🔴 Failed to Send</span>
                                        )}
                                    </div>
                                </div>
                                {selectedLog.type === 'EMAIL' && (
                                    <div className="col-12 border-top pt-3">
                                        <div className="text-muted mb-1" style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em' }}>SUBJECT</div>
                                        <div className="fw-bold" style={{ color: 'var(--text-main)', fontSize: '1rem' }}>{selectedLog.subject || '(No Subject)'}</div>
                                    </div>
                                )}
                                {selectedLog.errorMessage && (
                                    <div className="col-12 border-top pt-3 text-danger bg-danger-subtle p-3 rounded-3" style={{ fontSize: '0.85rem' }}>
                                        <strong>Error Details:</strong> {selectedLog.errorMessage}
                                    </div>
                                )}
                            </div>

                            <div className="border-top pt-3">
                                <div className="text-muted mb-2" style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em' }}>MESSAGE CONTENT</div>
                                {selectedLog.type === 'EMAIL' ? (
                                    <iframe 
                                        srcDoc={selectedLog.content} 
                                        style={{ width: '100%', height: '420px', border: '1px solid var(--border-color)', borderRadius: '12px', background: '#fff' }} 
                                        title="Email Preview"
                                    />
                                ) : (
                                    <div style={{
                                        background: 'var(--input-bg, rgba(16, 185, 129, 0.05))',
                                        border: '1.5px solid rgba(16, 185, 129, 0.25)',
                                        borderRadius: '16px',
                                        padding: '20px 24px',
                                        color: 'var(--text-main)',
                                        fontFamily: 'inherit',
                                        fontSize: '0.94rem',
                                        lineHeight: '1.65',
                                        boxShadow: '0 4px 20px rgba(0,0,0,0.06)'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.76rem', fontWeight: 800, color: '#10b981', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            <span className="material-icons-outlined" style={{ fontSize: '16px' }}>chat</span> WhatsApp Message
                                        </div>
                                        <div dangerouslySetInnerHTML={renderWhatsAppFormatted(selectedLog.content)} />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-3 bg-light-subtle border-top text-end">
                            <button onClick={() => setSelectedLog(null)} className="btn btn-secondary px-4" style={{ borderRadius: '10px', fontWeight: 600 }}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
