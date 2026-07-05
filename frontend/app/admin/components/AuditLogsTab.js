"use client";

import React, { useState, useEffect } from 'react';

export default function AuditLogsTab({ backendUrl, getHeaders }) {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadLogs();
    }, []);

    const loadLogs = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${backendUrl}/api/admin/audit-logs`, { headers: getHeaders() });
            const data = await res.json();
            if (res.ok) {
                setLogs(data);
            }
        } catch (err) {
            console.error('Failed to load audit logs:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="card-premium animate-fade-in">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="material-icons-outlined" style={{ color: 'var(--emerald)' }}>analytics</span> Administrative Audit Trail Logs
                </h3>
                <button className="btn-secondary-stripe" onClick={loadLogs} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="material-icons-outlined" style={{ fontSize: '16px' }}>refresh</span> Refresh Logs
                </button>
            </div>

            <div className="table-responsive">
                <table className="table-premium">
                    <thead>
                        <tr>
                            <th>Timestamp</th>
                            <th>Operator</th>
                            <th>Module</th>
                            <th>Action</th>
                            <th>Audit Summary Details</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="5" className="text-center p-4">Loading audit trails...</td>
                            </tr>
                        ) : logs.length > 0 ? (
                            logs.map(log => (
                                <tr key={log._id}>
                                    <td>{new Date(log.timestamp).toLocaleString('en-IN')}</td>
                                    <td><strong className="text-warning">{log.userId}</strong></td>
                                    <td>{log.module}</td>
                                    <td>
                                        <span className="badge-pill bg-opacity-10 bg-primary text-primary">
                                            {log.action}
                                        </span>
                                    </td>
                                    <td style={{ fontSize: '0.82rem', maxWidth: '350px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {JSON.stringify(log.newData || log.oldData || '')}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="5" className="text-center p-4 text-muted">No audit logs recorded for this tenant pool.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
