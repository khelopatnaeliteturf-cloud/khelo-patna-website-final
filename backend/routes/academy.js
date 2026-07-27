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
const AcademyAdmission = require('../models/AcademyAdmission');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth');
const { sendWhatsAppMessage } = require('../services/whatsapp');
const { sendFeeInvoiceEmail } = require('../services/mailercloud');
const { createOrder, verifyPayment } = require('../services/cashfree');
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

        // Auto-generate sequential membershipId (KPC001 / KPF001) scoped per tenant
        const prefix = sport === 'cricket' ? 'KPC' : sport === 'football' ? 'KPF' : 'KP';
        const lastStudent = await Student.findOne({ 
            tenantId, 
            membershipId: { $regex: new RegExp('^' + prefix + '\\d+') } 
        }).sort({ membershipId: -1 });

        let sequenceNumber = 1;
        if (lastStudent && lastStudent.membershipId) {
            const match = lastStudent.membershipId.match(new RegExp('^' + prefix + '(\\d+)'));
            if (match) {
                sequenceNumber = parseInt(match[1], 10) + 1;
            }
        }
        const membershipId = `${prefix}${String(sequenceNumber).padStart(3, '0')}`;

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

        // Create admission invoice (one-time admission fee ONLY).
        // Monthly fee terms are NOT auto-assigned — staff assign session
        // terms from the member profile, in bulk, or at the Finance Desk.
        const dueDate = new Date(newStudent.admissionDate);
        dueDate.setDate(dueDate.getDate() + 5);

        const initialFee = new Fee({
            tenantId,
            branchId,
            studentId: newStudent._id,
            amountDue: newStudent.oneTimeAdmissionFee,
            amountPaid: 0,
            dueDate: dueDate,
            monthFor: 'Admission Fee',
            status: 'UNPAID',
            adjustmentReason: 'One-time registration / admission fee'
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

// 1.5. Get Next Membership ID
router.get('/academy/students/next-id', authenticateToken, async (req, res) => {
    const { sport } = req.query;
    const tenantId = req.user.tenantId;

    try {
        const prefix = sport === 'cricket' ? 'KPC' : sport === 'football' ? 'KPF' : 'KP';
        const lastStudent = await Student.findOne({ 
            tenantId, 
            membershipId: { $regex: new RegExp('^' + prefix + '\\d+') } 
        }).sort({ membershipId: -1 });

        let sequenceNumber = 1;
        if (lastStudent && lastStudent.membershipId) {
            const match = lastStudent.membershipId.match(new RegExp('^' + prefix + '(\\d+)'));
            if (match) {
                sequenceNumber = parseInt(match[1], 10) + 1;
            }
        }
        const nextId = `${prefix}${String(sequenceNumber).padStart(3, '0')}`;
        res.json({ nextId });
    } catch (err) {
        console.error('Error generating next membership ID:', err);
        res.status(500).json({ error: 'Server error generating membership ID.' });
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
        sendWhatsAppMessage(student.phone, waMessage).catch(err => console.error('Error sending fee WhatsApp:', err));
        sendFeeInvoiceEmail(student, feeRecord).catch(err => console.error('Error sending fee email:', err));

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

// ═══════════════ FEE TERMS (session April → March) ═══════════════
// A "fee term" is a monthly Fee record within the academy session.
// Terms are NOT auto-assigned at admission — staff assign them per
// student (profile), in bulk, or on the fly at the Fee Collection Desk.

const STAFF_WRITE_ROLES = ['RECEPTIONIST', 'BRANCH_MANAGER', 'ACADEMY_OWNER', 'SUPER_ADMIN'];

// Returns the 12 month labels ("April 2026" ... "March 2027") for the
// session containing `ref` (session year starts in April).
const getSessionMonths = (ref = new Date()) => {
    const startYear = ref.getMonth() >= 3 ? ref.getFullYear() : ref.getFullYear() - 1;
    return Array.from({ length: 12 }, (_, i) =>
        new Date(startYear, 3 + i, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    );
};

const termDueDate = (monthLabel, dueDay = 5) => {
    const parsed = new Date(`${monthLabel.split(' ')[0]} 1, ${monthLabel.split(' ')[1]}`);
    if (isNaN(parsed.getTime())) return new Date();
    parsed.setDate(dueDay);
    return parsed;
};

// Creates UNPAID Fee records for the given months (skips months that already
// have a record). Returns { assigned, skipped }.
const assignTermsToStudent = async (student, months, tenantId, branchId) => {
    const perMonthFee = student.adjustedFee !== undefined && student.adjustedFee !== null
        ? Number(student.adjustedFee)
        : Number(student.monthlyFee) || 0;
    const existing = await Fee.find({ studentId: student._id, tenantId, monthFor: { $in: months } }).select('monthFor');
    const existingSet = new Set(existing.map(f => f.monthFor));
    const toCreate = months.filter(m => !existingSet.has(m));
    if (toCreate.length > 0) {
        await Fee.insertMany(toCreate.map(monthFor => ({
            tenantId,
            branchId,
            studentId: student._id,
            amountDue: perMonthFee,
            amountPaid: 0,
            dueDate: termDueDate(monthFor),
            monthFor,
            status: 'UNPAID',
            adjustmentReason: 'Session fee term'
        })));
    }
    return { assigned: toCreate, skipped: months.filter(m => existingSet.has(m)) };
};

// List current session months (for dropdowns)
router.get('/academy/fee-terms/session-months', authenticateToken, STAFF_READ, (req, res) => {
    const months = getSessionMonths();
    const startYear = Number(months[0].split(' ')[1]);
    res.json({ sessionLabel: `${startYear}-${String(startYear + 1).slice(2)}`, months });
});

// Assign fee terms to ONE student
router.post('/academy/students/:studentId/fee-terms', authenticateToken, authorizeRoles(...STAFF_WRITE_ROLES), async (req, res) => {
    const { months } = req.body;
    const tenantId = req.user.tenantId;
    if (!Array.isArray(months) || months.length === 0) {
        return res.status(400).json({ error: 'months array is required.' });
    }
    try {
        const student = await Student.findOne({ _id: req.params.studentId, tenantId });
        if (!student) return res.status(404).json({ error: 'Student not found.' });
        const result = await assignTermsToStudent(student, months, tenantId, req.user.branchId);
        await new AuditLog({
            tenantId, userId: req.user.username, module: 'Finance',
            action: 'ASSIGN_FEE_TERMS', newData: { studentId: student._id, months: result.assigned }
        }).save();
        res.json({ message: `${result.assigned.length} fee term(s) assigned.`, ...result });
    } catch (err) {
        console.error('Error assigning fee terms:', err);
        res.status(500).json({ error: 'Server error assigning fee terms.' });
    }
});

// Remove an UNPAID, zero-paid fee term from a student
router.post('/academy/students/:studentId/fee-terms/remove', authenticateToken, authorizeRoles(...STAFF_WRITE_ROLES), async (req, res) => {
    const { monthFor } = req.body;
    const tenantId = req.user.tenantId;
    if (!monthFor) return res.status(400).json({ error: 'monthFor is required.' });
    try {
        const fee = await Fee.findOne({ studentId: req.params.studentId, tenantId, monthFor });
        if (!fee) return res.status(404).json({ error: 'Fee term not found.' });
        if (fee.status !== 'UNPAID' || (Number(fee.amountPaid) || 0) > 0) {
            return res.status(400).json({ error: 'Only unpaid terms with no payments can be removed.' });
        }
        await Fee.deleteOne({ _id: fee._id });
        await new AuditLog({
            tenantId, userId: req.user.username, module: 'Finance',
            action: 'REMOVE_FEE_TERM', newData: { studentId: req.params.studentId, monthFor }
        }).save();
        res.json({ message: `Fee term ${monthFor} removed.` });
    } catch (err) {
        console.error('Error removing fee term:', err);
        res.status(500).json({ error: 'Server error removing fee term.' });
    }
});

// Bulk assign fee terms to MANY students
router.post('/academy/fee-terms/bulk-assign', authenticateToken, authorizeRoles(...STAFF_WRITE_ROLES), async (req, res) => {
    const { studentIds, months } = req.body;
    const tenantId = req.user.tenantId;
    if (!Array.isArray(studentIds) || studentIds.length === 0 || !Array.isArray(months) || months.length === 0) {
        return res.status(400).json({ error: 'studentIds and months arrays are required.' });
    }
    try {
        const students = await Student.find({ _id: { $in: studentIds }, tenantId });
        let totalAssigned = 0;
        for (const student of students) {
            const result = await assignTermsToStudent(student, months, tenantId, req.user.branchId);
            totalAssigned += result.assigned.length;
        }
        await new AuditLog({
            tenantId, userId: req.user.username, module: 'Finance',
            action: 'BULK_ASSIGN_FEE_TERMS', newData: { studentCount: students.length, months, totalAssigned }
        }).save();
        res.json({ message: `${totalAssigned} fee term(s) assigned across ${students.length} student(s).`, totalAssigned, studentCount: students.length });
    } catch (err) {
        console.error('Error bulk assigning fee terms:', err);
        res.status(500).json({ error: 'Server error bulk assigning fee terms.' });
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
        if (search.match(/^[0-9a-fA-F]{24}$/) || search.match(/^[0-9a-fA-F-]{36}$/)) {
            student = await Student.findOne({ _id: search, ...tenantFilter });
        } else {
            const cleanPhone = search.replace(/\D/g, '');
            if (cleanPhone.length >= 10) {
                const last10 = cleanPhone.slice(-10);
                student = await Student.findOne({
                    phone: { $regex: last10 + '$' },
                    ...tenantFilter
                });
            }
            if (!student) {
                student = await Student.findOne({
                    $or: [
                        { name: { $regex: search, $options: 'i' } },
                        { membershipId: { $regex: search, $options: 'i' } }
                    ],
                    ...tenantFilter
                });
            }
        }

        if (!student) {
            return res.status(404).json({ error: 'No student registry matches this query.' });
        }

        const dues = await Fee.find({
            studentId: student._id,
            status: { $in: ['UNPAID', 'PARTIAL'] }
        }).sort({ dueDate: 1 });

        const history = await Fee.find({
            studentId: student._id,
            status: 'PAID'
        }).sort({ paymentDate: -1 });

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
                status: student.status,
                phone: student.phone,
                rollNo: student.rollNo || student.admissionNo?.slice(-2) || '13',
                admissionNo: student.admissionNo || 'SDPS1932',
                fatherName: student.fatherName || student.parentName || 'Ravi Sankar Kumar',
                currentAddress: student.currentAddress || 'Patna',
                classGrade: student.classGrade || 'PLAY',
                section: student.section || 'A'
            },
            dues: dues.map(d => ({
                _id: d._id,
                monthFor: d.monthFor,
                dueDate: d.dueDate,
                amountDue: d.amountDue,
                amountPaid: d.amountPaid,
                discount: d.discount,
                status: d.status
            })),
            history: history.map(d => ({
                _id: d._id,
                receiptNo: d.referenceNo || d.orderId || ('REC-' + d._id.toString().slice(-6)),
                user: d.creditAccount || 'CASHIER',
                amountPaid: d.amountPaid,
                discount: d.discount,
                paymentDate: d.paymentDate || d.createdAt,
                status: d.status,
                monthFor: d.monthFor
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

        // Determine redirect URL dynamically based on Cashfree credentials mode
        const backendOrigin = `${req.protocol}://${req.get('host')}`;
        const redirectUrl = cfOrder.mock 
            ? `${backendOrigin}/mock-payment.html?order_id=${orderId}&amount=${totalAmount}`
            : `${backendOrigin}/checkout.html?session_id=${cfOrder.payment_session_id}&env=${process.env.CASHFREE_ENV || 'sandbox'}`;

        res.json({
            success: true,
            order_id: orderId,
            payment_session_id: cfOrder.payment_session_id,
            redirect_url: redirectUrl
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
            oneTimeAdmissionFee: oneTimeAdmissionFee !== undefined ? Number(oneTimeAdmissionFee) : (feeStructure?.oneTimeAdmissionFee || 5000),
            monthlyFee: monthlyFee !== undefined ? Number(monthlyFee) : (feeStructure?.monthlyFee || (sport === 'cricket' ? 2000 : 2500)),
            currentSessionId: activeSession?._id
        });

        await newStudent.save();

        // Admission invoice only — monthly fee terms are assigned separately.
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + (feeStructure?.dueDayOfMonth || 5));

        const initialFee = await Fee.create({
            tenantId,
            branchId,
            studentId: newStudent._id,
            amountDue: newStudent.oneTimeAdmissionFee,
            amountPaid: 0,
            dueDate,
            monthFor: 'Admission Fee',
            status: 'UNPAID',
            adjustmentReason: 'One-time registration / admission fee (from enquiry)'
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

// 17. Update specific fee record due date
router.put('/academy/fees/:id/due-date', authenticateToken, authorizeRoles('RECEPTIONIST', 'FINANCE_MANAGER', 'BRANCH_MANAGER', 'ACADEMY_OWNER', 'SUPER_ADMIN'), async (req, res) => {
    const { dueDate } = req.body;
    try {
        const fee = await Fee.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
        if (!fee) {
            return res.status(404).json({ error: 'Fee invoice not found.' });
        }
        fee.dueDate = new Date(dueDate);
        await fee.save();
        res.json({ success: true, message: 'Due date updated successfully.', fee });
    } catch (err) {
        console.error('Error updating due date:', err);
        res.status(500).json({ error: err.message });
    }
});

// 18. Delete/Waive specific fee record (invoice)
router.delete('/academy/fees/:id', authenticateToken, authorizeRoles('FINANCE_MANAGER', 'BRANCH_MANAGER', 'ACADEMY_OWNER', 'SUPER_ADMIN'), async (req, res) => {
    try {
        const fee = await Fee.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
        if (!fee) {
            return res.status(404).json({ error: 'Fee invoice not found.' });
        }
        await Fee.deleteOne({ _id: req.params.id });
        res.json({ success: true, message: 'Fee invoice deleted/removed successfully.' });
    } catch (err) {
        console.error('Error deleting fee invoice:', err);
        res.status(500).json({ error: err.message });
    }
});

// 19. Initiate Dedicated Academy Admission Application Payment (₹1,000 Registration Fee)
router.post('/academy/admission/initiate', async (req, res) => {
    const {
        studentName, dateOfBirth, age, gender, sport, batchTime,
        parentName, parentPhone, parentEmail, address, emergencyContact, experience
    } = req.body;

    if (!studentName || !parentName || !parentPhone || !sport || !batchTime) {
        return res.status(400).json({ error: 'Missing mandatory registration fields (Student Name, Parent Name, Mobile, Sport, Batch Time).' });
    }

    try {
        const tenant = await Tenant.findOne() || { _id: 'KHELOPATNA' };
        const orderId = `KP-ADM-${Date.now()}`;
        const REGISTRATION_FEE = 1000;

        let cleanPhone = String(parentPhone).replace(/\D/g, '');
        if (cleanPhone.length > 10) cleanPhone = cleanPhone.slice(-10);

        // Initiate Cashfree checkout session
        const returnUrl = `${process.env.FRONTEND_URL || 'https://khelopatna.in'}/academy/admission/confirmation?order_id=${orderId}`;
        const orderData = await createOrder({
            amount: REGISTRATION_FEE,
            orderId,
            customerName: parentName,
            customerEmail: parentEmail || 'admission@khelopatna.in',
            customerPhone: cleanPhone,
            returnUrl
        });

        // Save application draft in AcademyAdmission table
        const admission = new AcademyAdmission({
            tenantId: tenant._id,
            orderId,
            studentName,
            dateOfBirth,
            age: Number(age) || null,
            gender: gender || 'Male',
            sport: String(sport).toLowerCase(),
            batchTime,
            parentName,
            parentPhone: cleanPhone,
            parentEmail,
            address,
            emergencyContact,
            experience,
            registrationFee: REGISTRATION_FEE,
            depositPaid: 0,
            paymentStatus: 'PENDING',
            status: 'PAYMENT_INITIATED',
            createdAt: new Date()
        });

        await admission.save();

        res.json({
            success: true,
            orderId,
            paymentSessionId: orderData.payment_session_id,
            registrationFee: REGISTRATION_FEE
        });
    } catch (err) {
        console.error('Error initiating admission registration:', err);
        res.status(500).json({ error: err.message || 'Failed to initiate admission registration payment.' });
    }
});

// 20. Verify Admission Application Payment & Finalize Application
router.post('/academy/admission/verify', async (req, res) => {
    const { orderId } = req.body;
    if (!orderId) {
        return res.status(400).json({ error: 'Order ID is required for payment verification.' });
    }

    try {
        const admission = await AcademyAdmission.findOne({ orderId });
        if (!admission) {
            return res.status(404).json({ error: 'Admission application record not found.' });
        }

        if (admission.paymentStatus === 'PAID') {
            return res.json({ success: true, message: 'Payment already verified.', admission });
        }

        const verifyResult = await verifyPayment(orderId, 1000);
        if (!verifyResult.success || verifyResult.payment_status !== 'SUCCESS') {
            return res.status(400).json({ error: 'Payment verification failed or payment is pending.' });
        }

        admission.paymentStatus = 'PAID';
        admission.depositPaid = 1000;
        admission.status = 'REGISTERED';
        admission.transactionId = verifyResult.payment_details?.transaction_id || `TXN-${Date.now()}`;
        admission.registeredAt = new Date();
        await admission.save();

        // Audit Log
        try {
            await new AuditLog({
                tenantId: admission.tenantId || 'KHELOPATNA',
                userId: 'Customer (Online)',
                module: 'Academy Admission',
                action: 'PAY_FEE',
                newData: {
                    orderId: admission.orderId,
                    studentName: admission.studentName,
                    parentName: admission.parentName,
                    sport: admission.sport,
                    amount: 1000,
                    note: '₹1,000 Registration Fee Paid (100% Adjustable against admission)'
                },
                timestamp: new Date()
            }).save();
        } catch (_) {}

        // Send WhatsApp Confirmation to Parent
        try {
            const message = `🏆 *KheloPatna Academy — Admission Registration Received!* 🏆\n\nDear *${admission.parentName}*,\nThank you for registering *${admission.studentName}* for the *${admission.sport.toUpperCase()} ACADEMY* at KheloPatna Elite Turf!\n\n*Registration Details*:\n*   Ref Code: *${admission.orderId}*\n*   Student Name: *${admission.studentName}*\n*   Sport: *${admission.sport.toUpperCase()}*\n*   Batch Time: *${admission.batchTime}*\n*   Registration Fee Paid: *₹1,000* (100% Adjustable against tuition fee)\n\nOur academy coordinator will review your application and contact you shortly for batch orientation.\n\n📍 *Location*: Sandalpur Road, Near ICICI Bank, Kumhrar, Patna – 800006\n📞 *Contact*: (+91) 970 970 1400`;
            await sendWhatsAppMessage(admission.parentPhone, message);
        } catch (waErr) {
            console.error('WhatsApp confirmation error:', waErr.message);
        }

        res.json({ success: true, message: 'Registration fee verified successfully!', admission });
    } catch (err) {
        console.error('Error verifying admission payment:', err);
        res.status(500).json({ error: err.message || 'Server error verifying payment.' });
    }
});

// 21. Get All Admission Applications (Staff / Admin Protected)
router.get('/academy/admission/applications', authenticateToken, STAFF_READ, async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const applications = await AcademyAdmission.find({ tenantId }).sort({ createdAt: -1 });
        res.json(applications);
    } catch (err) {
        console.error('Error fetching admission applications:', err);
        res.status(500).json({ error: 'Server error loading applications.' });
    }
});

// 22. Approve & Admit Registered Student (Staff / Admin Protected — Adjusts ₹1,000 Fee)
router.post('/academy/admission/approve/:id', authenticateToken, authorizeRoles('RECEPTIONIST', 'BRANCH_MANAGER', 'ACADEMY_OWNER', 'SUPER_ADMIN'), async (req, res) => {
    try {
        const admission = await AcademyAdmission.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
        if (!admission) {
            return res.status(404).json({ error: 'Admission application not found.' });
        }

        const { oneTimeAdmissionFee = 1500, monthlyFee = 2000 } = req.body;

        // Auto-generate sequential membership ID (KPC001 / KPF001)
        const prefix = admission.sport === 'cricket' ? 'KPC' : admission.sport === 'football' ? 'KPF' : 'KP';
        const lastStudent = await Student.findOne({ tenantId: req.user.tenantId, sport: admission.sport }).sort({ createdAt: -1 });
        
        let seq = 1;
        if (lastStudent && lastStudent.membershipId) {
            const match = lastStudent.membershipId.match(/(\d+)$/);
            if (match) seq = parseInt(match[1], 10) + 1;
        }
        const membershipId = `${prefix}${String(seq).padStart(3, '0')}`;

        // Deduct/adjust the ₹1,000 registration deposit from admission fee!
        const registrationDeposit = admission.depositPaid || 1000;
        const netAdmissionFeeDue = Math.max(0, Number(oneTimeAdmissionFee) - registrationDeposit);

        const newStudent = new Student({
            tenantId: req.user.tenantId,
            branchId: req.user.branchId,
            membershipId,
            name: admission.studentName,
            parentName: admission.parentName,
            phone: admission.parentPhone,
            parentEmail: admission.parentEmail,
            dateOfBirth: admission.dateOfBirth ? new Date(admission.dateOfBirth) : new Date(),
            age: admission.age,
            gender: admission.gender,
            residentialAddress: admission.address,
            emergencyContact: admission.emergencyContact,
            previousExperience: admission.experience,
            sport: admission.sport,
            batchTime: admission.batchTime,
            status: 'ACTIVE',
            oneTimeAdmissionFee: Number(oneTimeAdmissionFee),
            monthlyFee: Number(monthlyFee),
            adjustedFee: registrationDeposit,
            admissionDate: new Date()
        });

        await newStudent.save();

        // Mark application status as ADMITTED
        admission.status = 'ADMITTED';
        admission.studentId = newStudent._id;
        await admission.save();

        // Create Invoice with net balance due (adjusted for ₹1,000 deposit)
        const invoice = new Fee({
            tenantId: req.user.tenantId,
            branchId: req.user.branchId,
            studentId: newStudent._id,
            amountDue: netAdmissionFeeDue,
            amountPaid: 0,
            monthFor: 'Admission Fee (Adjusted ₹1,000 Deposit)',
            status: netAdmissionFeeDue === 0 ? 'PAID' : 'PENDING',
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        });
        await invoice.save();

        // Audit Log
        try {
            await new AuditLog({
                tenantId: req.user.tenantId,
                userId: req.user.username || 'Owner',
                module: 'Academy Admission',
                action: 'ADMISSION',
                newData: {
                    membershipId,
                    studentName: newStudent.name,
                    parentName: newStudent.parentName,
                    sport: newStudent.sport,
                    adjustedDeposit: registrationDeposit,
                    netBalanceDue: netAdmissionFeeDue
                },
                timestamp: new Date()
            }).save();
        } catch (_) {}

        // Send WhatsApp welcome & adjustment confirmation
        try {
            const welcomeMsg = `🏆 *Welcome to KheloPatna Academy!* 🏆\n\nDear Parent, *${newStudent.name}* (ID: *${membershipId}*) has been officially admitted to our *${newStudent.sport.toUpperCase()} ACADEMY*!\n\n*Intake & Adjustment Summary*:\n*   Membership ID: *${membershipId}*\n*   Batch Time: *${newStudent.batchTime}*\n*   Admission Fee: ₹${oneTimeAdmissionFee}\n*   Registration Deposit Adjusted: *-₹${registrationDeposit}*\n*   Balance Due: *₹${netAdmissionFeeDue}*\n\nOur certified coaches look forward to building a champion! 🏏⚽`;
            await sendWhatsAppMessage(newStudent.phone, welcomeMsg);
        } catch (_) {}

        res.json({
            success: true,
            message: `Student successfully admitted! ₹${registrationDeposit} deposit adjusted.`,
            student: newStudent,
            invoice
        });
    } catch (err) {
        console.error('Error approving admission:', err);
        res.status(500).json({ error: err.message || 'Failed to approve admission.' });
    }
});

module.exports = router;
