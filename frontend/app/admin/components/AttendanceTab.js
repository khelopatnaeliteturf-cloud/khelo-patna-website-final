import React from 'react';

export default function AttendanceTab(props) {
    const { 
        handleSaveAttendance = () => {}, 
        attendanceSport = 'cricket', 
        setAttendanceSport = () => {}, 
        studentsList = [], 
        attendanceGrid = {}, 
        toggleStudentAttendance = () => {} 
    } = props || {};
        return (
            <div className="card-premium animate-fade-in">
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Daily Attendance Desk</h3>
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
        );
}
