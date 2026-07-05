const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const Fee = require('../models/Fee');
const Attendance = require('../models/Attendance');
const Session = require('../models/Session');
const Coach = require('../models/Coach');
const Batch = require('../models/Batch');
const Enquiry = require('../models/Enquiry');
const Tenant = require('../models/Tenant');
const FeeStructure = require('../models/FeeStructure');
const AuditLog = require('../models/AuditLog');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth');
const { sendWhatsAppMessage } = require('../services/whatsapp');
const { sendFeeInvoiceEmail } = require('../services/mailercloud');
const { createOrder } = require('../services/cashfree');
const { generateMonthlyFeesForTenant } = require('../services/billing');

// Staff roles allowed to read academy operational data.
// Excludes PARENT and MEMBER, whose tokens must not expose other
// students' personal details, fees, or attendance.
const STAFF_READ = authorizeRoles('SUPER_ADMIN', 'ACADEMY_OWNER', 'BRANCH_MANAGER', 'FINANCE_MANAGER', 'RECEPTIONIST', 'COACH', 'GROUND_MANAGER', 'HR_MANAGER');

// 1. Admit Student (Counsellor/Admin/Staff permission)
router.post('/academy/students', authenticateToken, authorizeRoles('RECEPTIONIST', 'BRANCH_MANAGER', 'ACADEMY_OWNER', 'SUPER_ADMIN'), async (req, res) => {
    const { 
        name, parentName, email, phone, dateOfBirth, 
        age, gender, schoolName, classGrade, residentialAddress,
        city, pinCode, fatherName, motherName, fatherMobile, motherMobile,
        guardianName, guardianMobile,
        previousExperience, experienceDetails, medicalConditions, admissionDate,
        sport, batchTime, oneTimeAdmissionFee, monthlyFee, adjustedFee 
    } = req.body;

    if (!name || !dateOfBirth || !sport || !batchTime) {
        return res.status(400).json({ error: 'Missing required student intake fields.' });
    }

    try {
        const tenantId = req.user.tenantId;
        const branchId = req.user.branchId;

        // Fetch active session
        const activeSession = await Session.findOne({ tenantId, status: 'ACTIVE' });
        const currentSessionId = activeSession ? activeSession._id : null;

        // Auto-generate sequential membershipId (KP-XXXX) scoped per tenant
        const lastStudent = await Student.findOne({ tenantId, membershipId: { $regex: /^KP-\d+/ } }).sort({ membershipId: -1 });
        let sequenceNumber = 1;
        if (lastStudent && lastStudent.membershipId) {
            const match = lastStudent.membershipId.match(/KP-(\d+)/);
            if (match) {
                sequenceNumber = parseInt(match[1], 10) + 1;
            }
        }
        const membershipId = `KP-${String(sequenceNumber).padStart(4, '0')}`;

        // Backward compatibility mapping
        const pName = fatherName || motherName || guardianName || parentName || 'N/A';
        const pPhone = fatherMobile || motherMobile || guardianMobile || phone || 'N/A';

        const newStudent = new Student({
            tenantId,
            branchId,
            membershipId,
            name,
            parentName: pName,
            email: email ? email.toLowerCase() : '',
            phone: pPhone,
            dateOfBirth,
            age: age || undefined,
            gender: gender || 'Male',
            schoolName,
            classGrade,
            residentialAddress,
            city,
            pinCode,
            fatherName,
            motherName,
            fatherMobile,
            motherMobile,
            guardianName,
            guardianMobile,
            previousExperience: previousExperience || 'No',
            experienceDetails,
            medicalConditions,
            sport,
            admissionDate: admissionDate ? new Date(admissionDate) : new Date(),
            batchTime,
            oneTimeAdmissionFee: oneTimeAdmissionFee !== undefined ? Number(oneTimeAdmissionFee) : 1500,
            monthlyFee: monthlyFee !== undefined ? Number(monthlyFee) : (sport === 'cricket' ? 2000 : 2500),
            adjustedFee: adjustedFee !== undefined ? Number(adjustedFee) : undefined,
            currentSessionId,
            documents: {
                photoUrl: req.body.photoUrl || req.body.documents?.photoUrl || '',
                aadhaarUrl: req.body.aadhaarUrl || req.body.documents?.aadhaarUrl || '',
                birthCertUrl: req.body.birthCertUrl || req.body.documents?.birthCertUrl || '',
                medicalCertUrl: req.body.medicalCertUrl || req.body.documents?.medicalCertUrl || ''
            }
        });

        await newStudent.save();

        // Create first month's invoice (Admission fee + First Month tuition fee)
        const currentMonth = new Date(newStudent.admissionDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        const firstMonthAmount = newStudent.oneTimeAdmissionFee + (newStudent.adjustedFee || newStudent.monthlyFee);

        const dueDate = new Date(newStudent.admissionDate);
        dueDate.setDate(dueDate.getDate() + 5);

        const initialFee = new Fee({
            tenantId,
            branchId,
            studentId: newStudent._id,
            amountDue: firstMonthAmount,
            amountPaid: 0,
            dueDate: dueDate,
            monthFor: currentMonth,
            status: 'UNPAID',
            adjustmentReason: 'First Month Tuition + Registration Admission fee'
        });

        await initialFee.save();

        // Audit Log
        await new AuditLog({
            tenantId,
            userId: req.user.username,
            module: 'Members',
            action: 'CREATE_MEMBER',
            newData: { membershipId, name, sport }
        }).save();

        // Send registration notifications via WA
        const welcomeMessage = `🏆 *Welcome to KheloPatna Academy!* 🏆\n\nDear Parent, your ward *${name}* (ID: ${membershipId}) has been successfully admitted to our *${sport.toUpperCase()}* training academy.\n\n*Intake Details*:\n*   Membership ID: ${membershipId}\n*   Batch Time: ${batchTime}\n*   Sport: ${sport.toUpperCase()}\n*   Admission Date: ${new Date(newStudent.admissionDate).toLocaleDateString('en-IN')}\n\nOur certified coaches look forward to building a champion! 🏏⚽`;
        await sendWhatsAppMessage(pPhone, welcomeMessage);

        res.status(201).json({
            success: true,
            student: newStudent,
            initial_invoice: initialFee
        });

    } catch (err) {
        console.error('Error admitting student:', err);
        res.status(500).json({ error: 'Server error registering student.' });
    }
});

// 2. List Students (Staff permissions)
router.get('/academy/students', authenticateToken, STAFF_READ, async (req, res) => {
    const { sport, status } = req.query;
    const query = { tenantId: req.user.tenantId };
    if (sport) query.sport = sport;
    if (status) query.status = status;

    try {
        const students = await Student.find(query).sort({ name: 1 });
        res.json(students);
    } catch (err) {
        console.error('Error loading students list:', err);
        res.status(500).json({ error: 'Server error loading students.' });
    }
});

// 2.5. Update Student Profile
router.put('/academy/students/:id', authenticateToken, authorizeRoles('RECEPTIONIST', 'BRANCH_MANAGER', 'ACADEMY_OWNER', 'SUPER_ADMIN'), async (req, res) => {
    const studentId = req.params.id;
    const updateData = req.body;
    const tenantId = req.user.tenantId;

    try {
        const student = await Student.findOne({ _id: studentId, tenantId });
        if (!student) {
            return res.status(404).json({ error: 'Student not found.' });
        }

        const allowedUpdates = [
            'name', 'email', 'dateOfBirth', 'age', 'gender', 'schoolName', 
            'classGrade', 'residentialAddress', 'city', 'pinCode', 
            'fatherName', 'motherName', 'fatherMobile', 'motherMobile',
            'guardianName', 'guardianMobile',
            'previousExperience', 'experienceDetails', 'medicalConditions', 
            'sport', 'batchTime', 'status', 'oneTimeAdmissionFee', 
            'monthlyFee', 'adjustedFee', 'documents', 'photoUrl', 
            'aadhaarUrl', 'birthCertUrl', 'medicalCertUrl'
        ];

        const oldData = JSON.parse(JSON.stringify(student));

        allowedUpdates.forEach(field => {
            if (updateData[field] !== undefined) {
                if (field === 'admissionDate' && updateData[field]) {
                    student[field] = new Date(updateData[field]);
                } else if ((field === 'oneTimeAdmissionFee' || field === 'monthlyFee' || field === 'adjustedFee') && updateData[field] !== null && updateData[field] !== '') {
                    student[field] = Number(updateData[field]);
                } else if (field === 'adjustedFee' && (updateData[field] === null || updateData[field] === '')) {
                    student[field] = undefined;
                } else if (field === 'documents' && updateData[field]) {
                    student.documents = { ...(student.documents || {}), ...updateData[field] };
                } else if (field === 'photoUrl' || field === 'aadhaarUrl' || field === 'birthCertUrl' || field === 'medicalCertUrl') {
                    if (!student.documents) student.documents = {};
                    // Use Mongoose markModified so it registers changes to the Mixed subdocument
                    student.documents[field] = updateData[field];
                    student.markModified('documents');
                } else {
                    student[field] = updateData[field];
                }
            }
        });

        if (updateData.fatherName || updateData.motherName || updateData.guardianName) {
            student.parentName = updateData.fatherName || updateData.motherName || updateData.guardianName || student.parentName;
        }
        if (updateData.fatherMobile || updateData.motherMobile || updateData.guardianMobile) {
            student.phone = updateData.fatherMobile || updateData.motherMobile || updateData.guardianMobile || student.phone;
        }

        await student.save();

        await new AuditLog({
            tenantId,
            userId: req.user.username,
            module: 'Members',
            action: 'UPDATE_MEMBER',
            oldData,
            newData: student
        }).save();

        res.json({
            success: true,
            message: 'Student profile updated successfully.',
            student
        });
    } catch (err) {
        console.error('Error updating student profile:', err);
        res.status(500).json({ error: 'Server error updating student profile.' });
    }
});

// 3. Edit Student Fee Rules
router.put('/academy/students/:id/fee-adjust', authenticateToken, authorizeRoles('BRANCH_MANAGER', 'ACADEMY_OWNER', 'SUPER_ADMIN'), async (req, res) => {
    const { adjustedFee } = req.body;
    const studentId = req.params.id;
    const tenantId = req.user.tenantId;

    if (adjustedFee === undefined) {
        return res.status(400).json({ error: 'Adjusted fee amount is required.' });
    }

    try {
        const student = await Student.findOne({ _id: studentId, tenantId });
        if (!student) {
            return res.status(404).json({ error: 'Student not found.' });
        }

        student.adjustedFee = adjustedFee || undefined;
        await student.save();

        res.json({
            success: true,
            message: `Student billing rules updated. Monthly tuition fee set to ₹${adjustedFee || student.monthlyFee}`,
            student
        });
    } catch (err) {
        console.error('Error adjusting student fee rule:', err);
        res.status(500).json({ error: 'Server error adjusting fee rules.' });
    }
});

// 4. Collect Fees Manually
router.post('/academy/students/:studentId/fees', authenticateToken, authorizeRoles('RECEPTIONIST', 'BRANCH_MANAGER', 'ACADEMY_OWNER', 'SUPER_ADMIN'), async (req, res) => {
    const { studentId } = req.params;
    const { amountPaid, monthFor, adjustmentReason, paymentMethod, creditAccount, referenceNo, senderAccount, discount } = req.body;
    const tenantId = req.user.tenantId;
    const branchId = req.user.branchId;

    if (amountPaid === undefined || !monthFor) {
        return res.status(400).json({ error: 'Amount paid and month are required.' });
    }

    try {
        const student = await Student.findOne({ _id: studentId, tenantId });
        if (!student) {
            return res.status(404).json({ error: 'Student not found.' });
        }

        let feeRecord = await Fee.findOne({ studentId, monthFor, tenantId });
        const expectedFee = student.adjustedFee !== undefined ? student.adjustedFee : student.monthlyFee;

        if (!feeRecord) {
            feeRecord = new Fee({
                tenantId,
                branchId,
                studentId,
                amountDue: expectedFee,
                monthFor,
                dueDate: new Date(),
                status: 'UNPAID'
            });
        }

        feeRecord.amountPaid = Number(amountPaid);
        feeRecord.discount = Number(discount) || 0;
        feeRecord.paymentDate = new Date();
        feeRecord.adjustmentReason = adjustmentReason || feeRecord.adjustmentReason;
        feeRecord.paymentMethod = paymentMethod || 'Cash';
        feeRecord.creditAccount = creditAccount || '';
        feeRecord.referenceNo = referenceNo || '';
        feeRecord.senderAccount = senderAccount || '';
        
        if (feeRecord.amountPaid + feeRecord.discount >= feeRecord.amountDue) {
            feeRecord.status = 'PAID';
        } else if (feeRecord.amountPaid > 0) {
            feeRecord.status = 'PARTIAL';
        } else {
            feeRecord.status = 'UNPAID';
        }

        await feeRecord.save();

        // Audit Log
        await new AuditLog({
            tenantId,
            userId: req.user.username,
            module: 'Finance',
            action: 'COLLECT_FEE',
            newData: { studentId, amountPaid, monthFor }
        }).save();

        const waMessage = `💳 *KheloPatna Academy Fee Receipt* 💳\n\nDear parent, we have successfully received monthly tuition fees for *${student.name}*.\n\n*Invoice Summary*:\n*   Sport: ${student.sport.toUpperCase()}\n*   Month: ${monthFor}\n*   Amount Paid: ₹${amountPaid}\n*   Receipt ID: ${feeRecord._id}\n\nThank you for choosing KheloPatna! 🏆`;
        await sendWhatsAppMessage(student.phone, waMessage);

        try {
            await sendFeeInvoiceEmail(student, feeRecord);
        } catch (e) {
            console.error('Error sending fee email:', e);
        }

        res.json({
            success: true,
            message: 'Fee payment successfully recorded.',
            receipt: feeRecord
        });

    } catch (err) {
        console.error('Error collecting student fee:', err);
        res.status(500).json({ error: 'Server error collecting fee.' });
    }
});

// Get all fee records for a specific student (for the profile history log)
router.get('/academy/students/:studentId/fees', authenticateToken, STAFF_READ, async (req, res) => {
    const { studentId } = req.params;
    const tenantId = req.user.tenantId;

    try {
        const fees = await Fee.find({ studentId, tenantId }).sort({ dueDate: -1 });
        res.json(fees);
    } catch (err) {
        console.error('Error fetching student fee history:', err);
        res.status(500).json({ error: 'Server error fetching student fee history.' });
    }
});

// 5. Parent Dues Search Endpoint (Public Portal - uses subdomain or parameters)
router.get('/academy/dues', async (req, res) => {
    const { search, subdomain } = req.query; // Search matches Phone or StudentID

    if (!search) {
        return res.status(400).json({ error: 'Student ID or phone number is required.' });
    }

    try {
        let tenantFilter = {};
        if (subdomain) {
            const tenant = await Tenant.findOne({ subdomain });
            if (tenant) {
                tenantFilter.tenantId = tenant._id;
            }
        }

        let student = null;
        if (search.match(/^[0-9a-fA-F]{24}$/)) {
            student = await Student.findOne({ _id: search, ...tenantFilter });
        } else {
            // Require the complete phone number (exact match on the last 10
            // digits). A suffix regex on partial input would let anyone
            // enumerate students with a few digits.
            const cleanPhone = search.replace(/\D/g, '');
            if (cleanPhone.length < 10) {
                return res.status(400).json({ error: 'Please enter the complete 10-digit phone number.' });
            }
            const last10 = cleanPhone.slice(-10);
            student = await Student.findOne({
                phone: { $regex: last10 + '$' },
                ...tenantFilter
            });
        }

        if (!student) {
            return res.status(404).json({ error: 'No student registry matches this query.' });
        }

        const dues = await Fee.find({
            studentId: student._id,
            status: { $in: ['UNPAID', 'PARTIAL'] }
        }).sort({ dueDate: 1 });

        // Expose only what the payment portal needs — never the full document
        // (which contains parent contact details, notes, etc.)
        res.json({
            student: {
                _id: student._id,
                name: student.name,
                parentName: student.parentName,
                sport: student.sport,
                batchTime: student.batchTime,
                monthlyFee: student.monthlyFee,
                adjustedFee: student.adjustedFee,
                status: student.status
            },
            dues: dues.map(d => ({
                _id: d._id,
                monthFor: d.monthFor,
                dueDate: d.dueDate,
                amountDue: d.amountDue,
                amountPaid: d.amountPaid,
                discount: d.discount,
                status: d.status
            }))
        });

    } catch (err) {
        console.error('Error querying academy dues:', err);
        res.status(500).json({ error: 'Server error loading dues.' });
    }
});

// 6. Parent Pay Dues Online (Public Portal Checkout)
router.post('/academy/dues/pay', async (req, res) => {
    const { studentId, feeIds } = req.body;

    if (!studentId || !feeIds || feeIds.length === 0) {
        return res.status(400).json({ error: 'Student and target invoice IDs are required.' });
    }

    try {
        const student = await Student.findById(studentId);
        if (!student) {
            return res.status(404).json({ error: 'Student not found.' });
        }

        const dueRecords = await Fee.find({
            _id: { $in: feeIds },
            studentId: studentId,
            status: { $in: ['UNPAID', 'PARTIAL'] }
        });

        if (dueRecords.length === 0) {
            return res.status(400).json({ error: 'No pending due invoices found for selected items.' });
        }

        let totalAmount = 0;
        dueRecords.forEach(record => {
            totalAmount += (record.amountDue - record.amountPaid);
        });

        const orderId = `KPFEE-${Date.now()}`;

        await Fee.updateMany(
            { _id: { $in: feeIds } },
            { $set: { orderId: orderId } }
        );

        const cfOrder = await createOrder({
            amount: totalAmount,
            orderId: orderId,
            customerName: student.parentName,
            customerEmail: student.email,
            customerPhone: student.phone,
            returnUrl: `${process.env.FRONTEND_URL || 'https://khelopatna.in'}/academy/pay-fees?order_id=${orderId}&payment_status=success`
        });

        res.json({
            success: true,
            order_id: orderId,
            payment_session_id: cfOrder.payment_session_id
        });

    } catch (err) {
        console.error('Error initiating dues payment:', err);
        res.status(500).json({ error: err.message || 'Server error creating checkout session.' });
    }
});

// 7. Mark Student Attendance
router.post('/academy/attendance', authenticateToken, authorizeRoles('RECEPTIONIST', 'BRANCH_MANAGER', 'ACADEMY_OWNER', 'SUPER_ADMIN'), async (req, res) => {
    const { attendanceList, date } = req.body; // List: [{ studentId, status }]

    if (!attendanceList || !date) {
        return res.status(400).json({ error: 'Attendance checklist list and target date are required.' });
    }

    try {
        const tenantId = req.user.tenantId;
        const branchId = req.user.branchId;
        const savedLogs = [];

        for (const item of attendanceList) {
            const { studentId, status } = item;

            await Attendance.deleteOne({ studentId, date, tenantId });

            const log = new Attendance({
                tenantId,
                branchId,
                studentId,
                date,
                status
            });

            await log.save();
            savedLogs.push(log);

            const student = await Student.findOne({ _id: studentId, tenantId });
            if (student) {
                const nowTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                
                let text = '';
                if (status === 'PRESENT') {
                    text = `🟢 *Academy Check-In Alert* 🟢\n\nDear parent, your ward *${student.name}* has arrived and checked in for the *${student.sport.toUpperCase()}* training academy session today at *${nowTime}*.`;
                } else if (status === 'LATE') {
                    text = `🟡 *Academy Check-In Alert (Late)* 🟡\n\nDear parent, your ward *${student.name}* has arrived late for the *${student.sport.toUpperCase()}* training session today at *${nowTime}*.`;
                } else if (status === 'LEAVE') {
                    text = `🔵 *Academy Leave Alert* 🔵\n\nDear parent, your ward *${student.name}*'s leave request for today's *${student.sport.toUpperCase()}* session has been recorded.`;
                } else {
                    text = `🔴 *Academy Absence Alert* 🔴\n\nDear parent, this is to inform you that your ward *${student.name}* was marked absent from today's *${student.sport.toUpperCase()}* training academy session.`;
                }
                
                sendWhatsAppMessage(student.phone, text).catch(e => console.error('Error sending attendance WA message:', e));
            }
        }

        res.json({
            success: true,
            message: `Attendance log saved. ${savedLogs.length} student records updated.`,
            logs: savedLogs
        });

    } catch (err) {
        console.error('Error saving attendance logs:', err);
        res.status(500).json({ error: 'Server error marking attendance.' });
    }
});

// 8. Get Attendance Logs
router.get('/academy/attendance', authenticateToken, STAFF_READ, async (req, res) => {
    const { date } = req.query; // YYYY-MM-DD

    if (!date) {
        return res.status(400).json({ error: 'Target date query is required.' });
    }

    try {
        const tenantId = req.user.tenantId;
        const logs = await Attendance.find({ date, tenantId }).populate('studentId', 'name sport batchTime');
        res.json(logs);
    } catch (err) {
        console.error('Error loading attendance logs:', err);
        res.status(500).json({ error: 'Server error loading attendance.' });
    }
});

// --- NEW SaaS ERP ROUTINGS ---

// 9. Session Management
router.get('/academy/sessions', authenticateToken, STAFF_READ, async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const sessions = await Session.find({ tenantId }).sort({ startDate: -1 });
        res.json(sessions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/academy/sessions', authenticateToken, authorizeRoles('ACADEMY_OWNER', 'SUPER_ADMIN'), async (req, res) => {
    const { name, startDate, endDate, status } = req.body;
    try {
        const tenantId = req.user.tenantId;
        if (status === 'ACTIVE') {
            await Session.updateMany({ tenantId }, { status: 'INACTIVE' });
        }
        const session = new Session({
            tenantId,
            name,
            startDate,
            endDate,
            status
        });
        await session.save();
        res.status(201).json(session);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/academy/sessions/:id', authenticateToken, authorizeRoles('ACADEMY_OWNER', 'SUPER_ADMIN'), async (req, res) => {
    const { id } = req.params;
    const { name, startDate, endDate, status } = req.body;
    try {
        const tenantId = req.user.tenantId;
        if (status === 'ACTIVE') {
            await Session.updateMany({ tenantId, _id: { $ne: id } }, { status: 'INACTIVE' });
        }
        const session = await Session.findOneAndUpdate(
            { _id: id, tenantId },
            { name, startDate, endDate, status },
            { new: true }
        );
        res.json(session);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/academy/sessions/promote', authenticateToken, authorizeRoles('BRANCH_MANAGER', 'ACADEMY_OWNER', 'SUPER_ADMIN'), async (req, res) => {
    const { fromSessionId, toSessionId, studentIds } = req.body;
    try {
        const tenantId = req.user.tenantId;
        const result = await Student.updateMany(
            { _id: { $in: studentIds }, tenantId, currentSessionId: fromSessionId },
            { $set: { currentSessionId: toSessionId } }
        );
        res.json({ success: true, message: `Promoted ${result.modifiedCount} members successfully.` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 10. Coach Management
router.get('/academy/coaches', authenticateToken, STAFF_READ, async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const coaches = await Coach.find({ tenantId }).sort({ name: 1 });
        res.json(coaches);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/academy/coaches', authenticateToken, authorizeRoles('BRANCH_MANAGER', 'ACADEMY_OWNER', 'SUPER_ADMIN'), async (req, res) => {
    const { name, phone, email, sports, salary, schedule } = req.body;
    try {
        const tenantId = req.user.tenantId;
        const branchId = req.user.branchId;
        const coach = new Coach({
            tenantId,
            branchId,
            name,
            phone,
            email,
            sports,
            salary: Number(salary) || 0,
            schedule,
            status: 'ACTIVE'
        });
        await coach.save();
        res.status(201).json(coach);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/academy/coaches/:id', authenticateToken, authorizeRoles('BRANCH_MANAGER', 'ACADEMY_OWNER', 'SUPER_ADMIN'), async (req, res) => {
    const { id } = req.params;
    const { name, phone, email, sports, salary, schedule, status } = req.body;
    try {
        const tenantId = req.user.tenantId;
        const coach = await Coach.findOneAndUpdate(
            { _id: id, tenantId },
            { name, phone, email, sports, salary: Number(salary) || 0, schedule, status },
            { new: true }
        );
        res.json(coach);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/academy/coaches/:id', authenticateToken, authorizeRoles('ACADEMY_OWNER', 'SUPER_ADMIN'), async (req, res) => {
    const { id } = req.params;
    try {
        const tenantId = req.user.tenantId;
        await Coach.deleteOne({ _id: id, tenantId });
        res.json({ success: true, message: 'Coach successfully removed.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 11. Batch Management
router.get('/academy/batches', authenticateToken, STAFF_READ, async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const batches = await Batch.find({ tenantId }).populate('coachId', 'name').populate('members', 'name membershipId');
        res.json(batches);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/academy/batches', authenticateToken, authorizeRoles('BRANCH_MANAGER', 'ACADEMY_OWNER', 'SUPER_ADMIN'), async (req, res) => {
    const { name, sport, sessionId, coachId, groundId, capacity, startTime, endTime } = req.body;
    try {
        const tenantId = req.user.tenantId;
        const branchId = req.user.branchId;
        const batch = new Batch({
            tenantId,
            branchId,
            name,
            sport,
            sessionId,
            coachId: coachId || undefined,
            groundId,
            capacity: Number(capacity) || 20,
            startTime,
            endTime,
            status: 'ACTIVE',
            members: []
        });
        await batch.save();
        res.status(201).json(batch);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/academy/batches/:id', authenticateToken, authorizeRoles('BRANCH_MANAGER', 'ACADEMY_OWNER', 'SUPER_ADMIN'), async (req, res) => {
    const { id } = req.params;
    const { name, sport, sessionId, coachId, groundId, capacity, startTime, endTime, status } = req.body;
    try {
        const tenantId = req.user.tenantId;
        const batch = await Batch.findOneAndUpdate(
            { _id: id, tenantId },
            { name, sport, sessionId, coachId: coachId || undefined, groundId, capacity: Number(capacity) || 20, startTime, endTime, status },
            { new: true }
        );
        res.json(batch);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/academy/batches/:id/assign', authenticateToken, authorizeRoles('BRANCH_MANAGER', 'ACADEMY_OWNER', 'SUPER_ADMIN'), async (req, res) => {
    const { id } = req.params;
    const { studentIds } = req.body;
    try {
        const tenantId = req.user.tenantId;
        const batch = await Batch.findOne({ _id: id, tenantId });
        if (!batch) {
            return res.status(404).json({ error: 'Batch not found.' });
        }

        const currentMembers = batch.members.map(m => m.toString());
        studentIds.forEach(sid => {
            if (!currentMembers.includes(sid)) {
                batch.members.push(sid);
            }
        });
        await batch.save();

        await Student.updateMany(
            { _id: { $in: studentIds }, tenantId },
            { $set: { batchTime: `${batch.startTime}-${batch.endTime}` } }
        );

        res.json({ success: true, batch });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/academy/batches/:id/remove', authenticateToken, authorizeRoles('BRANCH_MANAGER', 'ACADEMY_OWNER', 'SUPER_ADMIN'), async (req, res) => {
    const { id } = req.params;
    const { studentIds } = req.body;
    try {
        const tenantId = req.user.tenantId;
        const batch = await Batch.findOne({ _id: id, tenantId });
        if (!batch) {
            return res.status(404).json({ error: 'Batch not found.' });
        }

        batch.members = batch.members.filter(m => !studentIds.includes(m.toString()));
        await batch.save();

        res.json({ success: true, batch });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/academy/batches/:id', authenticateToken, authorizeRoles('ACADEMY_OWNER', 'SUPER_ADMIN'), async (req, res) => {
    const { id } = req.params;
    try {
        const tenantId = req.user.tenantId;
        await Batch.deleteOne({ _id: id, tenantId });
        res.json({ success: true, message: 'Batch successfully deleted.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 12. Audit Logs
router.get('/admin/audit-logs', authenticateToken, authorizeRoles('ACADEMY_OWNER', 'SUPER_ADMIN'), async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const logs = await AuditLog.find({ tenantId }).sort({ timestamp: -1 }).limit(100);
        res.json(logs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 13. Fee Structure (persisted academy billing config)
router.get('/academy/fee-structure', authenticateToken, authorizeRoles('FINANCE_MANAGER', 'ACADEMY_OWNER', 'SUPER_ADMIN', 'RECEPTIONIST'), async (req, res) => {
    try {
        const structures = await FeeStructure.find({ tenantId: req.user.tenantId, isActive: true }).sort({ sport: 1 });
        res.json(structures);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/academy/fee-structure', authenticateToken, authorizeRoles('FINANCE_MANAGER', 'ACADEMY_OWNER', 'SUPER_ADMIN'), async (req, res) => {
    const { structures } = req.body;
    if (!structures || !Array.isArray(structures)) {
        return res.status(400).json({ error: 'structures array is required.' });
    }

    try {
        const tenantId = req.user.tenantId;
        const branchId = req.user.branchId;
        const activeSession = await Session.findOne({ tenantId, status: 'ACTIVE' });
        const saved = [];

        for (const item of structures) {
            const payload = {
                tenantId,
                branchId,
                sessionId: activeSession?._id,
                sport: item.sport || 'all',
                oneTimeAdmissionFee: Number(item.oneTimeAdmissionFee) || 1500,
                monthlyFee: Number(item.monthlyFee) || 2000,
                lateFeePenalty: Number(item.lateFeePenalty) || 0,
                dueDayOfMonth: Number(item.dueDayOfMonth) || 5,
                isActive: true,
                updatedAt: new Date()
            };

            const existing = await FeeStructure.findOne({ tenantId, sport: payload.sport, isActive: true });
            if (existing) {
                Object.assign(existing, payload);
                await existing.save();
                saved.push(existing);
            } else {
                const created = await FeeStructure.create(payload);
                saved.push(created);
            }
        }

        res.json({ success: true, structures: saved });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 14. Generate monthly fee invoices for all active students
router.post('/academy/billing/generate-monthly', authenticateToken, authorizeRoles('FINANCE_MANAGER', 'ACADEMY_OWNER', 'SUPER_ADMIN'), async (req, res) => {
    try {
        const results = await generateMonthlyFeesForTenant(req.user.tenantId, {
            forDate: req.body.forDate
        });

        await new AuditLog({
            tenantId: req.user.tenantId,
            userId: req.user.username,
            module: 'Billing',
            action: 'GENERATE_MONTHLY_FEES',
            newData: { created: results.created, skipped: results.skipped }
        }).save();

        res.json({ success: true, ...results });
    } catch (err) {
        console.error('Monthly billing error:', err);
        res.status(500).json({ error: 'Server error generating monthly fees.' });
    }
});

// 15. Convert enquiry to enrolled student
router.post('/academy/enquiries/:id/convert', authenticateToken, authorizeRoles('RECEPTIONIST', 'BRANCH_MANAGER', 'ACADEMY_OWNER', 'SUPER_ADMIN'), async (req, res) => {
    const { batchTime, monthlyFee, oneTimeAdmissionFee } = req.body;

    try {
        const tenantId = req.user.tenantId;
        const branchId = req.user.branchId;
        const enquiry = await Enquiry.findOne({ _id: req.params.id, tenantId });

        if (!enquiry) {
            return res.status(404).json({ error: 'Enquiry not found.' });
        }
        if (enquiry.status === 'CONVERTED') {
            return res.status(400).json({ error: 'This enquiry has already been converted.' });
        }
        if (!enquiry.interestedIn) {
            return res.status(400).json({ error: 'Enquiry must have a sport selected before conversion.' });
        }

        const activeSession = await Session.findOne({ tenantId, status: 'ACTIVE' });
        const lastStudent = await Student.findOne({ tenantId, membershipId: { $regex: /^KP-\d+/ } }).sort({ membershipId: -1 });
        let sequenceNumber = 1;
        if (lastStudent?.membershipId) {
            const match = lastStudent.membershipId.match(/KP-(\d+)/);
            if (match) sequenceNumber = parseInt(match[1], 10) + 1;
        }
        const membershipId = `KP-${String(sequenceNumber).padStart(4, '0')}`;

        const sport = enquiry.interestedIn;
        const feeStructure = await FeeStructure.findOne({ tenantId, sport, isActive: true })
            || await FeeStructure.findOne({ tenantId, sport: 'all', isActive: true });

        const newStudent = new Student({
            tenantId,
            branchId,
            membershipId,
            name: enquiry.studentName,
            parentName: enquiry.fatherName || 'N/A',
            phone: enquiry.mobileNumber,
            fatherName: enquiry.fatherName,
            fatherMobile: enquiry.mobileNumber,
            dateOfBirth: enquiry.dateOfBirth || '2000-01-01',
            age: enquiry.age,
            gender: enquiry.gender || 'Male',
            schoolName: enquiry.schoolName,
            classGrade: enquiry.classGrade,
            previousExperience: enquiry.previousExperience || 'No',
            experienceDetails: enquiry.experienceDetails,
            sport,
            batchTime: batchTime || '06:00-08:00 AM',
            oneTimeAdmissionFee: oneTimeAdmissionFee !== undefined ? Number(oneTimeAdmissionFee) : (feeStructure?.oneTimeAdmissionFee || 1500),
            monthlyFee: monthlyFee !== undefined ? Number(monthlyFee) : (feeStructure?.monthlyFee || (sport === 'cricket' ? 2000 : 2500)),
            currentSessionId: activeSession?._id
        });

        await newStudent.save();

        const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        const firstMonthAmount = newStudent.oneTimeAdmissionFee + (newStudent.adjustedFee || newStudent.monthlyFee);
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + (feeStructure?.dueDayOfMonth || 5));

        const initialFee = await Fee.create({
            tenantId,
            branchId,
            studentId: newStudent._id,
            amountDue: firstMonthAmount,
            amountPaid: 0,
            dueDate,
            monthFor: currentMonth,
            status: 'UNPAID',
            adjustmentReason: 'First Month Tuition + Registration (from enquiry)'
        });

        enquiry.status = 'CONVERTED';
        enquiry.convertedStudentId = newStudent._id;
        await enquiry.save();

        await new AuditLog({
            tenantId,
            userId: req.user.username,
            module: 'Enquiries',
            action: 'CONVERT_TO_STUDENT',
            newData: { enquiryId: enquiry._id, membershipId, studentName: newStudent.name }
        }).save();

        const welcomeMessage = `🏆 *Welcome to KheloPatna Academy!* 🏆\n\nDear Parent, your ward *${newStudent.name}* (ID: ${membershipId}) has been successfully admitted to our *${sport.toUpperCase()}* training academy.\n\n*Membership ID:* ${membershipId}\n*Batch Time:* ${newStudent.batchTime}\n\nOur certified coaches look forward to building a champion! 🏏⚽`;
        await sendWhatsAppMessage(enquiry.mobileNumber, welcomeMessage);

        res.status(201).json({ success: true, student: newStudent, initial_invoice: initialFee, enquiry });
    } catch (err) {
        console.error('Enquiry conversion error:', err);
        res.status(500).json({ error: 'Server error converting enquiry to student.' });
    }
});

// 16. Update enquiry status
router.put('/academy/enquiries/:id', authenticateToken, authorizeRoles('RECEPTIONIST', 'BRANCH_MANAGER', 'ACADEMY_OWNER', 'SUPER_ADMIN'), async (req, res) => {
    const { status, notes } = req.body;
    try {
        const enquiry = await Enquiry.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
        if (!enquiry) {
            return res.status(404).json({ error: 'Enquiry not found.' });
        }
        if (status) enquiry.status = status;
        if (notes !== undefined) enquiry.notes = notes;
        await enquiry.save();
        res.json({ success: true, enquiry });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
