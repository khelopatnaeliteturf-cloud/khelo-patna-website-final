// Database Migration Script: MongoDB to Supabase via Data API (Supabase JS Client)
// Usage: MONGODB_URI=... SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node migrate_to_supabase_api.js

const mongoose = require('mongoose');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/khelopatna';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://kpwhnpexuggkjpzduxoq.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Please provide SUPABASE_SERVICE_ROLE_KEY environment variable (the secret service_role API key).');
    process.exit(1);
}

// Deterministically convert 24-char hex MongoDB ObjectId to valid 36-char UUID v4 format
function toUuid(oid) {
    if (!oid) return null;
    const hex = String(oid);
    if (hex.length !== 24) return null;
    return `00000000-${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}-${hex.slice(12)}`;
}

async function migrate() {
    console.log('Connecting to local MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB.');

    console.log('Initializing Supabase JS Client...');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false }
    });
    console.log('Supabase Client Initialized.');

    try {
        // --- 1. Tenants ---
        console.log('\nMigrating Tenants...');
        const Tenant = mongoose.model('Tenant', new mongoose.Schema({}, { strict: false }));
        const tenants = await Tenant.find({});
        for (const t of tenants) {
            const row = t.toObject();
            const { error } = await supabase.from('tenants').upsert({
                id: toUuid(row._id),
                name: row.name,
                subdomain: row.subdomain,
                is_active: row.isActive ?? true,
                config: row.config || {},
                subscription_plan: row.subscription?.plan || 'ENTERPRISE',
                subscription_expires_at: row.subscription?.expiresAt || null,
                created_at: row.createdAt || new Date(),
                updated_at: row.updatedAt || new Date()
            });
            if (error) console.error('  Error tenant:', error.message);
        }
        console.log(`- Finished tenants.`);

        // --- 2. Branches ---
        console.log('Migrating Branches...');
        const Branch = mongoose.model('Branch', new mongoose.Schema({}, { strict: false }));
        const branches = await Branch.find({});
        for (const b of branches) {
            const row = b.toObject();
            const { error } = await supabase.from('branches').upsert({
                id: toUuid(row._id),
                tenant_id: toUuid(row.tenantId),
                name: row.name,
                address: row.address,
                city: row.city,
                state: row.state,
                contact_number: row.contactNumber,
                created_at: row.createdAt || new Date(),
                updated_at: row.updatedAt || new Date()
            });
            if (error) console.error('  Error branch:', error.message);
        }
        console.log(`- Finished branches.`);

        // --- 3. Sessions ---
        console.log('Migrating Sessions...');
        const Session = mongoose.model('Session', new mongoose.Schema({}, { strict: false }));
        const sessions = await Session.find({});
        for (const s of sessions) {
            const row = s.toObject();
            const { error } = await supabase.from('sessions').upsert({
                id: toUuid(row._id),
                tenant_id: toUuid(row.tenantId),
                name: row.name,
                start_date: row.startDate,
                end_date: row.endDate,
                status: row.status || 'ACTIVE',
                created_at: row.createdAt || new Date(),
                updated_at: row.updatedAt || new Date()
            });
            if (error) console.error('  Error session:', error.message);
        }
        console.log(`- Finished sessions.`);

        // --- 4. Turf Settings ---
        console.log('Migrating Turf Settings...');
        const TurfSettings = mongoose.model('TurfSettings', new mongoose.Schema({}, { strict: false }));
        const settings = await TurfSettings.find({});
        for (const ts of settings) {
            const row = ts.toObject();
            const { error } = await supabase.from('turf_settings').upsert({
                id: toUuid(row._id),
                tenant_id: toUuid(row.tenantId),
                branch_id: toUuid(row.branchId),
                cricket_base_rate: row.cricketBaseRate ?? 1200,
                football_base_rate: row.footballBaseRate ?? 1500,
                blackout_hours: row.blackoutHours || {}
            });
            if (error) console.error('  Error settings:', error.message);
        }
        console.log(`- Finished settings.`);

        // --- 5. Staff ---
        console.log('Migrating Staff...');
        const Staff = mongoose.model('Staff', new mongoose.Schema({}, { strict: false }));
        const staff = await Staff.find({});
        for (const st of staff) {
            const row = st.toObject();
            const { error } = await supabase.from('staff').upsert({
                id: toUuid(row._id),
                tenant_id: toUuid(row.tenantId),
                branch_id: toUuid(row.branchId),
                username: row.username,
                password_hash: row.password || '',
                role: row.role || 'STAFF',
                created_at: row.createdAt || new Date(),
                updated_at: row.updatedAt || new Date()
            });
            if (error) console.error('  Error staff:', error.message);
        }
        console.log(`- Finished staff.`);

        // --- 6. Coaches ---
        console.log('Migrating Coaches...');
        const Coach = mongoose.model('Coach', new mongoose.Schema({}, { strict: false }));
        const coaches = await Coach.find({});
        for (const c of coaches) {
            const row = c.toObject();
            const { error } = await supabase.from('coaches').upsert({
                id: toUuid(row._id),
                tenant_id: toUuid(row.tenantId),
                branch_id: toUuid(row.branchId),
                name: row.name,
                phone: row.phone,
                email: row.email || null,
                sports: row.sports || [],
                salary: row.salary ?? 0,
                schedule: row.schedule || null,
                status: row.status || 'ACTIVE',
                rating: row.rating ?? 5.0,
                joining_date: row.joiningDate || new Date(),
                created_at: row.createdAt || new Date(),
                updated_at: row.updatedAt || new Date()
            });
            if (error) console.error('  Error coach:', error.message);
        }
        console.log(`- Finished coaches.`);

        // --- 7. Students ---
        console.log('Migrating Students (Academy Members)...');
        const Student = mongoose.model('Student', new mongoose.Schema({}, { strict: false }));
        const students = await Student.find({});
        for (const s of students) {
            const row = s.toObject();
            const { error } = await supabase.from('students').upsert({
                id: toUuid(row._id),
                tenant_id: toUuid(row.tenantId),
                branch_id: toUuid(row.branchId),
                membership_id: row.membershipId || null,
                name: row.name,
                parent_name: row.parentName || null,
                email: row.email || null,
                phone: row.phone || null,
                date_of_birth: row.dateOfBirth ? new Date(row.dateOfBirth) : new Date(),
                age: row.age || null,
                gender: row.gender || 'Male',
                blood_group: row.bloodGroup || null,
                school_name: row.schoolName || null,
                class_grade: row.classGrade || null,
                residential_address: row.residentialAddress || null,
                city: row.city || null,
                pin_code: row.pinCode || null,
                father_name: row.fatherName || null,
                mother_name: row.motherName || null,
                father_mobile: row.fatherMobile || null,
                mother_mobile: row.motherMobile || null,
                guardian_name: row.guardianName || null,
                guardian_mobile: row.guardianMobile || null,
                previous_experience: row.previousExperience || 'No',
                experience_details: row.experienceDetails || null,
                medical_conditions: row.medicalConditions || null,
                sport: row.sport,
                admission_date: row.admissionDate || new Date(),
                status: row.status || 'ACTIVE',
                batch_time: row.batchTime,
                one_time_admission_fee: row.oneTimeAdmissionFee ?? 1500,
                monthly_fee: row.monthlyFee ?? 2000,
                adjusted_fee: row.adjustedFee ?? null,
                current_session_id: toUuid(row.currentSessionId),
                documents: row.documents || {},
                created_at: row.createdAt || new Date(),
                updated_at: row.updatedAt || new Date()
            });
            if (error) console.error('  Error student:', error.message);
        }
        console.log(`- Finished students.`);

        // --- 8. Batches & Batch Members ---
        console.log('Migrating Batches & Members...');
        const Batch = mongoose.model('Batch', new mongoose.Schema({}, { strict: false }));
        const batches = await Batch.find({});
        for (const b of batches) {
            const row = b.toObject();
            const batchUuid = toUuid(row._id);
            const { error: batchErr } = await supabase.from('batches').upsert({
                id: batchUuid,
                tenant_id: toUuid(row.tenantId),
                branch_id: toUuid(row.branchId),
                name: row.name,
                sport: row.sport,
                session_id: toUuid(row.sessionId),
                coach_id: toUuid(row.coachId),
                ground_id: row.groundId || null,
                capacity: row.capacity ?? 20,
                start_time: row.startTime,
                end_time: row.endTime,
                status: row.status || 'ACTIVE',
                created_at: row.createdAt || new Date(),
                updated_at: row.updatedAt || new Date()
            });
            if (batchErr) console.error('  Error batch:', batchErr.message);

            if (row.members && Array.isArray(row.members)) {
                for (const studentId of row.members) {
                    const { error: memErr } = await supabase.from('batch_members').upsert({
                        batch_id: batchUuid,
                        student_id: toUuid(studentId)
                    });
                    if (memErr) console.error('  Error batch_members:', memErr.message);
                }
            }
        }
        console.log(`- Finished batches.`);

        // --- 9. Fee Structures ---
        console.log('Migrating Fee Structures...');
        const FeeStructure = mongoose.model('FeeStructure', new mongoose.Schema({}, { strict: false }));
        const feeStructures = await FeeStructure.find({});
        for (const fs of feeStructures) {
            const row = fs.toObject();
            const { error } = await supabase.from('fee_structures').upsert({
                id: toUuid(row._id),
                tenant_id: toUuid(row.tenantId),
                branch_id: toUuid(row.branchId),
                session_id: toUuid(row.sessionId),
                sport: row.sport || 'all',
                one_time_admission_fee: row.oneTimeAdmissionFee ?? 1500,
                monthly_fee: row.monthlyFee,
                late_fee_penalty: row.lateFeePenalty ?? 0,
                due_day_of_month: row.dueDayOfMonth ?? 5,
                is_active: row.isActive ?? true,
                updated_at: row.updatedAt || new Date()
            });
            if (error) console.error('  Error fee structure:', error.message);
        }
        console.log(`- Finished fee structures.`);

        // --- 10. Fees ---
        console.log('Migrating Fees...');
        const Fee = mongoose.model('Fee', new mongoose.Schema({}, { strict: false }));
        const fees = await Fee.find({});
        for (const f of fees) {
            const row = f.toObject();
            const { error } = await supabase.from('fees').upsert({
                id: toUuid(row._id),
                tenant_id: toUuid(row.tenantId),
                branch_id: toUuid(row.branchId),
                student_id: toUuid(row.studentId),
                amount_due: row.amountDue,
                amount_paid: row.amountPaid ?? 0,
                payment_date: row.paymentDate || null,
                due_date: row.dueDate,
                month_for: row.monthFor,
                status: row.status || 'UNPAID',
                adjustment_reason: row.adjustmentReason || null,
                payment_method: row.paymentMethod || 'Cash',
                credit_account: row.creditAccount || null,
                reference_no: row.referenceNo || null,
                sender_account: row.senderAccount || null,
                discount: row.discount ?? 0,
                order_id: row.orderId || null,
                created_at: row.createdAt || new Date()
            });
            if (error) console.error('  Error fee:', error.message);
        }
        console.log(`- Finished fees.`);

        // --- 11. Bookings ---
        console.log('Migrating Turf Bookings...');
        const Booking = mongoose.model('Booking', new mongoose.Schema({}, { strict: false }));
        const bookings = await Booking.find({});
        for (const b of bookings) {
            const row = b.toObject();
            const { error } = await supabase.from('bookings').upsert({
                id: toUuid(row._id),
                tenant_id: toUuid(row.tenantId),
                branch_id: toUuid(row.branchId),
                customer_name: row.customerName,
                customer_email: row.customerEmail,
                customer_phone: row.customerPhone,
                date: row.date,
                time_slots: row.timeSlots || [],
                total_amount: row.totalAmount,
                paid_amount: row.paidAmount,
                payment_status: row.paymentStatus || 'PENDING',
                payment_method: row.paymentMethod,
                discount: row.discount ?? 0,
                order_id: row.orderId,
                transaction_id: row.transactionId || null,
                sport: row.sport,
                participants_count: row.participantsCount ?? 1,
                payment_details: row.paymentDetails || null,
                created_at: row.createdAt || new Date()
            });
            if (error) console.error('  Error booking:', error.message);
        }
        console.log(`- Finished bookings.`);

        // --- 12. Turf Closures ---
        console.log('Migrating Turf Closures...');
        const TurfClosure = mongoose.model('TurfClosure', new mongoose.Schema({}, { strict: false }));
        const closures = await TurfClosure.find({});
        for (const tc of closures) {
            const row = tc.toObject();
            const { error } = await supabase.from('turf_closures').upsert({
                id: toUuid(row._id),
                tenant_id: toUuid(row.tenantId),
                branch_id: toUuid(row.branchId),
                start_date: row.startDate,
                end_date: row.endDate,
                recurring_day: row.recurringDay ?? null,
                reason: row.reason || null
            });
            if (error) console.error('  Error closure:', error.message);
        }
        console.log(`- Finished closures.`);

        // --- 13. Attendance ---
        console.log('Migrating Attendance...');
        const Attendance = mongoose.model('Attendance', new mongoose.Schema({}, { strict: false }));
        const attendanceRecords = await Attendance.find({});
        for (const att of attendanceRecords) {
            const row = att.toObject();
            const { error } = await supabase.from('attendance').upsert({
                id: toUuid(row._id),
                tenant_id: toUuid(row.tenantId),
                branch_id: toUuid(row.branchId),
                student_id: toUuid(row.studentId),
                date: row.date,
                status: row.status,
                marked_at: row.markedAt || new Date()
            });
            if (error) console.error('  Error attendance:', error.message);
        }
        console.log(`- Finished attendance.`);

        // --- 14. Audit Logs ---
        console.log('Migrating Audit Logs...');
        const AuditLog = mongoose.model('AuditLog', new mongoose.Schema({}, { strict: false }));
        const auditLogs = await AuditLog.find({});
        for (const log of auditLogs) {
            const row = log.toObject();
            const { error } = await supabase.from('audit_logs').upsert({
                id: toUuid(row._id),
                tenant_id: toUuid(row.tenantId),
                user_id: row.userId,
                module: row.module,
                action: row.action,
                old_data: row.oldData || null,
                new_data: row.newData || null,
                ip_address: row.ipAddress || null,
                timestamp: row.timestamp || new Date()
            });
            if (error) console.error('  Error audit log:', error.message);
        }
        console.log(`- Finished audit logs.`);

        // --- 15. Enquiries ---
        console.log('Migrating Enquiries...');
        const Enquiry = mongoose.model('Enquiry', new mongoose.Schema({}, { strict: false }));
        const enquiries = await Enquiry.find({});
        for (const eq of enquiries) {
            const row = eq.toObject();
            const { error } = await supabase.from('enquiries').upsert({
                id: toUuid(row._id),
                tenant_id: toUuid(row.tenantId),
                branch_id: toUuid(row.branchId),
                student_name: row.studentName,
                date_of_birth: row.dateOfBirth ? new Date(row.dateOfBirth) : null,
                age: row.age || null,
                gender: row.gender || '',
                school_name: row.schoolName || null,
                class_grade: row.classGrade || null,
                father_name: row.fatherName || null,
                mobile_number: row.mobileNumber,
                interested_in: row.interestedIn || '',
                previous_experience: row.previousExperience || '',
                experience_details: row.experienceDetails || null,
                expected_joining_month: row.expectedJoiningMonth || null,
                heard_about: row.heardAbout || null,
                heard_about_other: row.heardAboutOther || null,
                questions: row.questions || null,
                source: row.source,
                status: row.status || 'NEW',
                converted_student_id: toUuid(row.convertedStudentId),
                notes: row.notes || null,
                created_at: row.createdAt || new Date()
            });
            if (error) console.error('  Error enquiry:', error.message);
        }
        console.log(`- Finished enquiries.`);

        // --- 16. Inventory Items ---
        console.log('Migrating Inventory Items...');
        const InventoryItem = mongoose.model('InventoryItem', new mongoose.Schema({}, { strict: false }));
        const inventoryItems = await InventoryItem.find({});
        for (const item of inventoryItems) {
            const row = item.toObject();
            const { error } = await supabase.from('inventory_items').upsert({
                id: toUuid(row._id),
                tenant_id: toUuid(row.tenantId),
                branch_id: toUuid(row.branchId),
                item_name: row.itemName,
                category: row.category,
                total_quantity: row.totalQuantity,
                available_quantity: row.availableQuantity,
                condition: row.condition || 'GOOD',
                created_at: row.createdAt || new Date(),
                updated_at: row.updatedAt || new Date()
            });
            if (error) console.error('  Error inventory item:', error.message);
        }
        console.log(`- Finished inventory items.`);

        // --- 17. POS Sales ---
        console.log('Migrating POS Sales...');
        const POSSale = mongoose.model('POSSale', new mongoose.Schema({}, { strict: false }));
        const posSales = await POSSale.find({});
        for (const sale of posSales) {
            const row = sale.toObject();
            const { error } = await supabase.from('pos_sales').upsert({
                id: toUuid(row._id),
                tenant_id: toUuid(row.tenantId),
                branch_id: toUuid(row.branchId),
                booking_id: toUuid(row.bookingId),
                item_id: toUuid(row.itemId),
                quantity: row.quantity,
                total_price: row.totalPrice,
                sold_at: row.soldAt || new Date()
            });
            if (error) console.error('  Error POS sale:', error.message);
        }
        console.log(`- Finished POS sales.`);

        // --- 18. Check In Logs ---
        console.log('Migrating Check-In Logs...');
        const CheckInLog = mongoose.model('CheckInLog', new mongoose.Schema({}, { strict: false }));
        const checkInLogs = await CheckInLog.find({});
        for (const log of checkInLogs) {
            const row = log.toObject();
            const { error } = await supabase.from('check_in_logs').upsert({
                id: toUuid(row._id),
                tenant_id: toUuid(row.tenantId),
                branch_id: toUuid(row.branchId),
                booking_id: toUuid(row.bookingId),
                student_id: toUuid(row.studentId),
                player_name: row.playerName,
                type: row.type,
                check_in_time: row.checkInTime || new Date(),
                check_out_time: row.checkOutTime || null
            });
            if (error) console.error('  Error check-in log:', error.message);
        }
        console.log(`- Finished check-in logs.`);

        console.log('\n==============================================');
        console.log('Database Migration to Supabase via API Completed Successfully!');
        console.log('==============================================');

    } catch (err) {
        console.error('\n❌ Migration failed during API processing:', err.message);
    } finally {
        await mongoose.disconnect();
    }
}

migrate().catch(err => {
    console.error('Fatal migration error:', err);
    process.exit(1);
});
