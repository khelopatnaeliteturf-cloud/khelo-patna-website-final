import React from 'react';

export default function AcademyTab(props) {
    const { 
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
        return (
            <div className="animate-fade-in">
                <div className="d-flex gap-3 mb-4 border-bottom pb-2">
                    {[
                        { id: 'students', label: 'Directory' },
                        { id: 'admissions', label: 'Enquiries' },
                        { id: 'attendance', label: 'Attendance' }
                    ].map(t => (
                        <button key={t.id} className={`sub-tab-link ${academySubTab === t.id ? 'active' : ''}`} onClick={() => setAcademySubTab(t.id)}>{t.label}</button>
                    ))}
                </div>

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
                                            <strong>{selectedCrmStudent.fatherName} ({selectedCrmStudent.fatherMobile})</strong>
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
                                        <td><strong>{e.studentName}</strong></td>
                                        <td>{e.mobileNumber}</td>
                                        <td style={{ textTransform: 'capitalize' }}>{e.interestedIn || '—'}</td>
                                        <td><span className="badge-pill badge-primary">{e.status || 'NEW'}</span></td>
                                        <td>{e.source}</td>
                                        <td>
                                            {e.status !== 'CONVERTED' && (
                                                <button className="btn-secondary-stripe" style={{ fontSize: '0.75rem', padding: '4px 10px' }} onClick={() => handleConvertEnquiry(e._id)}>
                                                    Admit
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {academySubTab === 'attendance' && (
                    <div className="card-premium">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Daily Attendance</h3>
                            <button className="btn-primary-stripe" onClick={handleSaveAttendance}>Save Attendance</button>
                        </div>
                        <div className="row g-2 mb-3">
                            <div className="col-md-6">
                                <select className="input-premium w-100" value={attendanceSport} onChange={(e) => setAttendanceSport(e.target.value)}>
                                    <option value="football">Football Academy</option>
                                    <option value="cricket">Cricket Academy</option>
                                </select>
                            </div>
                        </div>
                        <table className="table-premium">
                            <thead>
                                <tr><th>Student</th><th>Parent</th><th>Mobile</th><th style={{ width: '80px', textAlign: 'center' }}>Present</th></tr>
                            </thead>
                            <tbody>
                                {studentsList.map(s => {
                                    const present = attendanceGrid[s._id] === 'PRESENT';
                                    return (
                                        <tr key={s._id}>
                                            <td><strong>{s.name}</strong></td>
                                            <td>{s.fatherName}</td>
                                            <td>{s.fatherMobile}</td>
                                            <td className="text-center">
                                                <input type="checkbox" checked={present} onChange={() => toggleStudentAttendance(s._id)} />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        );
}
