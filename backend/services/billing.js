const Student = require('../models/Student');
const Fee = require('../models/Fee');
const FeeStructure = require('../models/FeeStructure');

function getMonthLabel(date = new Date()) {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function getDueDate(year, month, dueDayOfMonth = 5) {
    const dueDate = new Date(year, month, dueDayOfMonth);
    dueDate.setHours(23, 59, 59, 999);
    return dueDate;
}

async function generateMonthlyFeesForTenant(tenantId, options = {}) {
    const targetDate = options.forDate ? new Date(options.forDate) : new Date();
    const monthFor = getMonthLabel(targetDate);
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();

    const feeStructures = await FeeStructure.find({ tenantId, isActive: true });
    const defaultDueDay = feeStructures[0]?.dueDayOfMonth || 5;

    const students = await Student.find({
        tenantId,
        status: 'ACTIVE',
        admissionDate: { $lte: targetDate }
    });

    const results = { created: 0, skipped: 0, students: [] };

    for (const student of students) {
        const admissionMonth = getMonthLabel(student.admissionDate);
        if (admissionMonth === monthFor) {
            results.skipped++;
            continue;
        }

        const existing = await Fee.findOne({ studentId: student._id, monthFor });
        if (existing) {
            results.skipped++;
            continue;
        }

        const structure = feeStructures.find(s => s.sport === student.sport)
            || feeStructures.find(s => s.sport === 'all');
        const dueDay = structure?.dueDayOfMonth || defaultDueDay;
        const amountDue = student.adjustedFee || student.monthlyFee
            || structure?.monthlyFee
            || (student.sport === 'cricket' ? 2000 : 2500);

        const fee = await Fee.create({
            tenantId: student.tenantId,
            branchId: student.branchId,
            studentId: student._id,
            amountDue,
            amountPaid: 0,
            dueDate: getDueDate(year, month, dueDay),
            monthFor,
            status: 'UNPAID',
            adjustmentReason: `Monthly tuition — ${monthFor}`
        });

        results.created++;
        results.students.push({ studentId: student._id, membershipId: student.membershipId, feeId: fee._id });
    }

    return results;
}

module.exports = { generateMonthlyFeesForTenant, getMonthLabel };
