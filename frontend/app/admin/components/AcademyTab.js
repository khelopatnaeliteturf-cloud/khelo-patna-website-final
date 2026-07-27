import React, { useState, useEffect } from 'react';

export default function AcademyTab(props) {
    const { 
        backendUrl = '',
        getHeaders = () => ({}),
        academySubTab = 'students', 
        setAcademySubTab = () => {}, 
        customerSearchQuery = '', 
        setCustomerSearchQuery = () => {}, 
        allStudents = [], 
        selectedCrmStudent = null, 
        setSelectedCrmStudent = () => {}, 
        setActiveTab = () => {}, 
        setActiveSidebarKey = () => {}, 
        setPaymentsSubTab = () => {}, 
        setPaymentSearchId = () => {}, 
        setSelectedStudentForPayment = () => {}, 
        setShowEnquiryModal = () => {}, 
        enquirySearchQuery = '', 
        setEnquirySearchQuery = () => {}, 
        enquiriesList = [], 
        handleConvertEnquiry = () => {}, 
        handleSaveAttendance = () => {}, 
        attendanceSport = 'cricket', 
        setAttendanceSport = () => {}, 
        studentsList = [], 
        attendanceGrid = {}, 
        toggleStudentAttendance = () => {} 
    } = props || {};

    const [applications, setApplications] = useState([]);
    const [loadingApps, setLoadingApps] = useState(false);
    const [appSearch, setAppSearch] = useState('');

    useEffect(() => {
        if (academySubTab === 'online-applications') {
            loadApplications();
        }
    }, [academySubTab]);

    const loadApplications = async () => {
        setLoadingApps(true);
        try {
            const res = await fetch(`${backendUrl}/api/academy/admission/applications`, { headers: getHeaders() });
            const data = await res.json();
            if (res.ok) setApplications(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error fetching applications:', err);
        } finally {
            setLoadingApps(false);
        }
    };

    const handleApproveApplication = async (appId) => {
        if (!confirm('Approve and officially admit this student? The ₹1,000 registration deposit will be automatically adjusted against the admission fee.')) return;
        try {
            const res = await fetch(`${backendUrl}/api/academy/admission/approve/${appId}`, {
                method: 'POST',
                headers: { ...getHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ oneTimeAdmissionFee: 1500, monthlyFee: 2000 })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                alert(`Student successfully admitted! Assigned ID: ${data.student.membershipId} (₹1,000 deposit adjusted)`);
                loadApplications();
            } else {
                alert(data.error || 'Failed to approve application');
            }
        } catch (err) {
            alert(err.message || 'Error approving application');
        }
    };

    return (
        <div className="animate-fade-in">
            <div className="d-flex gap-3 mb-4 border-bottom pb-2 flex-wrap">
                {[
                    { id: 'students', label: 'Directory' },
                    { id: 'online-applications', label: 'Online Applications (₹1k Paid)' },
                    { id: 'admissions', label: 'Enquiries' },
                    { id: 'attendance', label: 'Attendance' }
                ].map(t => (
                    <button key={t.id} className={`sub-tab-link ${academySubTab === t.id ? 'active' : ''}`} onClick={() => setAcademySubTab(t.id)}>{t.label}</button>
                ))}
            </div>

            {/* 1. DIRECTORY */}
            {academySubTab === 'students' && (
                <div className="row g-4">
                    <div className="col-lg-5">
                        <div className="card-premium">
                            <input type="text" placeholder="Search students..." className="input-premium w-100 mb-3" value={customerSearchQuery} onChange={(e) => setCustomerSearchQuery(e.target.value)} />
                            <div className="d-flex flex-column gap-2" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                {allStudents.filter(s => s.name.toLowerCase().includes(customerSearchQuery.toLowerCase())).map(s => (
                                    <button key={s._id} className={`student-crm-list-item ${selectedCrmStudent?._id === s._id ? 'active' : ''}`} onClick={() => setSelectedCrmStudent(s)}>
                                        <div className="text-start">
                                            <strong>{s.name}</strong>
                                            <span style={{ fontSize: '0.75rem', display: 'block', color: 'var(--text-muted)' }}>Sport: {s.sport}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="col-lg-7">
                        {selectedCrmStudent ? (
                            <div className="card-premium">
                                <h2 className="mb-3">{selectedCrmStudent.name}</h2>
                                <div className="row g-3 mb-4">
                                    <div className="col-md-6">
                                        <span className="text-muted d-block" style={{ fontSize: '0.75rem' }}>Parent Contact</span>
                                        <strong>{selectedCrmStudent.parentName || selectedCrmStudent.fatherName} ({selectedCrmStudent.phone || selectedCrmStudent.fatherMobile})</strong>
                                    </div>
                                    <div className="col-md-6">
                                        <span className="text-muted d-block" style={{ fontSize: '0.75rem' }}>Sport Academy</span>
                                        <strong style={{ textTransform: 'capitalize' }}>{selectedCrmStudent.sport}</strong>
                                    </div>
                                    <div className="col-md-6">
                                        <span className="text-muted d-block" style={{ fontSize: '0.75rem' }}>Age / Gender</span>
                                        <strong>{selectedCrmStudent.age || 'N/A'} yrs / {selectedCrmStudent.gender}</strong>
                                    </div>
                                    <div className="col-md-6">
                                        <span className="text-muted d-block" style={{ fontSize: '0.75rem' }}>Deposit Adjusted</span>
                                        <strong style={{ color: 'var(--emerald)' }}>₹{selectedCrmStudent.adjustedFee || 1000} (Adjusted)</strong>
                                    </div>
                                    <div className="col-md-12">
                                        <span className="text-muted d-block" style={{ fontSize: '0.75rem' }}>Residential Address</span>
                                        <strong>{selectedCrmStudent.residentialAddress || 'N/A'}</strong>
                                    </div>
                                </div>
                                <button className="btn-primary-stripe" onClick={() => { setActiveTab('membership-billing'); setActiveSidebarKey('membership-billing'); setPaymentsSubTab('collect'); setPaymentSearchId(selectedCrmStudent._id); setSelectedStudentForPayment(selectedCrmStudent); }} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                    <span className="material-icons-outlined" style={{ fontSize: '18px' }}>payments</span> Collect Fee
                                </button>
                            </div>
                        ) : (
                            <div className="card-premium text-center p-5" style={{ borderStyle: 'dashed' }}>
                                <span className="text-muted">Select student from directory list to view profile details.</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* 2. ONLINE ADMISSION APPLICATIONS */}
            {academySubTab === 'online-applications' && (
                <div className="card-premium">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <div>
                            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span className="material-icons-outlined" style={{ color: 'var(--emerald)' }}>assignment_turned_in</span> Online Admission Applications
                            </h3>
                            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                                Applications submitted via website form with ₹1,000 registration fee paid (100% adjustable).
                            </p>
                        </div>
                        <button className="btn-secondary-stripe" onClick={loadApplications} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <span className="material-icons-outlined" style={{ fontSize: '16px' }}>refresh</span> Refresh List
                        </button>
                    </div>

                    <input type="text" placeholder="Search applicant name, parent mobile..." className="input-premium w-100 mb-3" value={appSearch} onChange={(e) => setAppSearch(e.target.value)} />

                    <div className="table-responsive">
                        <table className="table-premium">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Student Name</th>
                                    <th>Parent & Contact</th>
                                    <th>Sport & Batch</th>
                                    <th>Deposit Paid</th>
                                    <th>Status</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loadingApps ? (
                                    <tr><td colSpan="7" className="text-center p-4">Loading applications...</td></tr>
                                ) : applications.length > 0 ? (
                                    applications.filter(a => (a.studentName || '').toLowerCase().includes(appSearch.toLowerCase()) || (a.parentPhone || '').includes(appSearch)).map(a => (
                                        <tr key={a._id}>
                                            <td style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                                                {new Date(a.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </td>
                                            <td>
                                                <strong>{a.studentName}</strong>
                                                <span style={{ fontSize: '0.72rem', display: 'block', color: 'var(--text-muted)' }}>{a.age ? `${a.age} yrs` : ''} ({a.gender})</span>
                                            </td>
                                            <td>
                                                <div style={{ fontSize: '0.85rem' }}>{a.parentName}</div>
                                                <strong style={{ fontSize: '0.78rem', color: 'var(--emerald)' }}>📞 {a.parentPhone}</strong>
                                            </td>
                                            <td>
                                                <span style={{ textTransform: 'capitalize', fontWeight: 700 }}>{a.sport}</span>
                                                <span style={{ fontSize: '0.72rem', display: 'block', color: 'var(--text-muted)' }}>{a.batchTime}</span>
                                            </td>
                                            <td>
                                                <span style={{ background: 'rgba(16, 185, 129, 0.14)', color: '#047857', border: '1px solid rgba(16, 185, 129, 0.35)', padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 800 }}>
                                                    ₹{a.depositPaid || 1000} Paid (Adjustable)
                                                </span>
                                            </td>
                                            <td>
                                                {a.status === 'ADMITTED' ? (
                                                    <span style={{ background: 'rgba(59, 130, 246, 0.14)', color: '#1D4ED8', border: '1px solid rgba(59, 130, 246, 0.35)', padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 800 }}>
                                                        ADMITTED
                                                    </span>
                                                ) : (
                                                    <span style={{ background: 'rgba(245, 158, 11, 0.14)', color: '#B45309', border: '1px solid rgba(245, 158, 11, 0.35)', padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 800 }}>
                                                        REGISTERED
                                                    </span>
                                                )}
                                            </td>
                                            <td>
                                                {a.status !== 'ADMITTED' ? (
                                                    <button className="btn-primary-stripe" onClick={() => handleApproveApplication(a._id)} style={{ fontSize: '0.72rem', padding: '6px 12px' }}>
                                                        Approve & Admit (₹1k Adjusted)
                                                    </button>
                                                ) : (
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Admitted</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr><td colSpan="7" className="text-center p-4 text-muted">No online admission applications recorded yet.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* 3. ENQUIRIES */}
            {academySubTab === 'admissions' && (
                <div className="card-premium">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Admission Inquiries</h3>
                        <button className="btn-primary-stripe" onClick={() => setShowEnquiryModal(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <span className="material-icons-outlined" style={{ fontSize: '16px' }}>add_circle</span> Log New Enquiry
                        </button>
                    </div>
                    <input type="text" placeholder="Search enquiries..." className="input-premium w-100 mb-3" value={enquirySearchQuery} onChange={(e) => setEnquirySearchQuery(e.target.value)} />
                    <table className="table-premium">
                        <thead>
                            <tr><th>Date</th><th>Student</th><th>Mobile</th><th>Sport</th><th>Status</th><th>Source</th><th>Action</th></tr>
                        </thead>
                        <tbody>
                            {enquiriesList.filter(e => (e.studentName || '').toLowerCase().includes(enquirySearchQuery.toLowerCase())).map(e => (
                                <tr key={e._id}>
                                    <td>{new Date(e.createdAt).toLocaleDateString('en-IN')}</td>
                                    <td>{e.studentName}</td>
                                    <td>{e.parentMobile}</td>
                                    <td>{e.sport}</td>
                                    <td><span className="badge-pill bg-warning">{e.status}</span></td>
                                    <td>{e.source}</td>
                                    <td><button className="btn-secondary-stripe p-1 px-2" onClick={() => handleConvertEnquiry(e)}>Convert</button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* 4. ATTENDANCE */}
            {academySubTab === 'attendance' && (
                <div className="card-premium">
                    <div className="d-flex justify-content-between align-items-center mb-4">
                        <h3>Academy Daily Attendance</h3>
                        <div className="d-flex gap-2">
                            <select className="input-premium" value={attendanceSport} onChange={(e) => setAttendanceSport(e.target.value)}>
                                <option value="cricket">Cricket</option>
                                <option value="football">Football</option>
                            </select>
                            <button className="btn-primary-stripe" onClick={handleSaveAttendance}>Save Attendance</button>
                        </div>
                    </div>

                    <table className="table-premium">
                        <thead>
                            <tr><th>Student Name</th><th>Batch Time</th><th>Status</th></tr>
                        </thead>
                        <tbody>
                            {studentsList.map(s => (
                                <tr key={s._id}>
                                    <td>{s.name}</td>
                                    <td>{s.batchTime}</td>
                                    <td>
                                        <button className={`btn ${attendanceGrid[s._id] ? 'btn-success' : 'btn-outline-danger'}`} onClick={() => toggleStudentAttendance(s._id)}>
                                            {attendanceGrid[s._id] ? 'Present' : 'Absent'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
