// Database Migration Script: MongoDB to Supabase/PostgreSQL
// Usage: MONGODB_URI=... SUPABASE_DB_URL=... node migrate_to_supabase.js

const mongoose = require('mongoose');
const { Client } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/khelopatna';
const SUPABASE_DB_URL = process.env.SUPABASE_DB_URL; // e.g., postgres://postgres.[project]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres

if (!SUPABASE_DB_URL) {
    console.error('Please provide SUPABASE_DB_URL environment variable.');
    process.exit(1);
}

// Deterministically convert 24-char hex MongoDB ObjectId to valid 36-char UUID v4 format
// Matches relation keys perfectly without needing lookup maps.
function toUuid(oid) {
    if (!oid) return null;
    const hex = String(oid);
    if (hex.length !== 24) return null;
    // Format: 00000000-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    return `00000000-${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}-${hex.slice(12)}`;
}

async function migrate() {
    console.log('Connecting to local MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB.');

    console.log('Connecting to Supabase PostgreSQL...');
    const pgClient = new Client({
        connectionString: SUPABASE_DB_URL,
        ssl: { rejectUnauthorized: false } // Required for Supabase external connections
    });
    await pgClient.connect();
    console.log('Connected to Supabase PostgreSQL.');

    try {
        // --- 1. Tenants ---
        console.log('\nMigrating Tenants...');
        const Tenant = mongoose.model('Tenant', new mongoose.Schema({}, { strict: false }));
        const tenants = await Tenant.find({});
        for (const t of tenants) {
            const row = t.toObject();
            await pgClient.query(
                `INSERT INTO tenants (id, name, subdomain, is_active, config, subscription_plan, subscription_expires_at, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                 ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
                [
                    toUuid(row._id),
                    row.name,
                    row.subdomain,
                    row.isActive ?? true,
                    JSON.stringify(row.config || {}),
                    row.subscription?.plan || 'ENTERPRISE',
                    row.subscription?.expiresAt || null,
                    row.createdAt || new Date(),
                    row.updatedAt || new Date()
                ]
            );
        }
        console.log(`- Migrated ${tenants.length} tenants.`);

        // --- 2. Branches ---
        console.log('Migrating Branches...');
        const Branch = mongoose.model('Branch', new mongoose.Schema({}, { strict: false }));
        const branches = await Branch.find({});
        for (const b of branches) {
            const row = b.toObject();
            await pgClient.query(
                `INSERT INTO branches (id, tenant_id, name, address, city, state, contact_number, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                 ON CONFLICT (id) DO NOTHING`,
                [
                    toUuid(row._id),
                    toUuid(row.tenantId),
                    row.name,
                    row.address,
                    row.city,
                    row.state,
                    row.contactNumber,
                    row.createdAt || new Date(),
                    row.updatedAt || new Date()
                ]
            );
        }
        console.log(`- Migrated ${branches.length} branches.`);

        // --- 3. Sessions ---
        console.log('Migrating Sessions...');
        const Session = mongoose.model('Session', new mongoose.Schema({}, { strict: false }));
        const sessions = await Session.find({});
        for (const s of sessions) {
            const row = s.toObject();
            await pgClient.query(
                `INSERT INTO sessions (id, tenant_id, name, start_date, end_date, status, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                 ON CONFLICT (id) DO NOTHING`,
                [
                    toUuid(row._id),
                    toUuid(row.tenantId),
                    row.name,
                    row.startDate,
                    row.endDate,
                    row.status || 'ACTIVE',
                    row.createdAt || new Date(),
                    row.updatedAt || new Date()
                ]
            );
        }
        console.log(`- Migrated ${sessions.length} sessions.`);

        // --- 4. Turf Settings ---
        console.log('Migrating Turf Settings...');
        const TurfSettings = mongoose.model('TurfSettings', new mongoose.Schema({}, { strict: false }));
        const settings = await TurfSettings.find({});
        for (const ts of settings) {
            const row = ts.toObject();
            await pgClient.query(
                `INSERT INTO turf_settings (id, tenant_id, branch_id, cricket_base_rate, football_base_rate, blackout_hours)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 ON CONFLICT (id) DO NOTHING`,
                [
                    toUuid(row._id),
                    toUuid(row.tenantId),
                    toUuid(row.branchId),
                    row.cricketBaseRate ?? 1200,
                    row.footballBaseRate ?? 1500,
                    JSON.stringify(row.blackoutHours || {})
                ]
            );
        }
        console.log(`- Migrated ${settings.length} turf settings.`);

        // --- 5. Staff ---
        console.log('Migrating Staff...');
        const Staff = mongoose.model('Staff', new mongoose.Schema({}, { strict: false }));
        const staff = await Staff.find({});
        for (const st of staff) {
            const row = st.toObject();
            await pgClient.query(
                `INSERT INTO staff (id, tenant_id, branch_id, username, password_hash, role, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                 ON CONFLICT (id) DO NOTHING`,
                [
                    toUuid(row._id),
                    toUuid(row.tenantId),
                    toUuid(row.branchId),
                    row.username,
                    row.password || '', // legacy stored plaintext/hash
                    row.role || 'STAFF',
                    row.createdAt || new Date(),
                    row.updatedAt || new Date()
                ]
            );
        }
        console.log(`- Migrated ${staff.length} staff accounts.`);

        // --- 6. Coaches ---
        console.log('Migrating Coaches...');
        const Coach = mongoose.model('Coach', new mongoose.Schema({}, { strict: false }));
        const coaches = await Coach.find({});
        for (const c of coaches) {
            const row = c.toObject();
            await pgClient.query(
                `INSERT INTO coaches (id, tenant_id, branch_id, name, phone, email, sports, salary, schedule, status, rating, joining_date, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                 ON CONFLICT (id) DO NOTHING`,
                [
                    toUuid(row._id),
                    toUuid(row.tenantId),
                    toUuid(row.branchId),
                    row.name,
                    row.phone,
                    row.email || null,
                    row.sports || [],
                    row.salary ?? 0,
                    row.schedule || null,
                    row.status || 'ACTIVE',
                    row.rating ?? 5.0,
                    row.joiningDate || new Date(),
                    row.createdAt || new Date(),
                    row.updatedAt || new Date()
                ]
            );
        }
        console.log(`- Migrated ${coaches.length} coaches.`);

        // --- 7. Students ---
        console.log('Migrating Students (Academy Members)...');
        const Student = mongoose.model('Student', new mongoose.Schema({}, { strict: false }));
        const students = await Student.find({});
        for (const s of students) {
            const row = s.toObject();
            await pgClient.query(
                `INSERT INTO students (
                    id, tenant_id, branch_id, membership_id, name, parent_name, email, phone,
                    date_of_birth, age, gender, blood_group, school_name, class_grade, residential_address,
                    city, pin_code, father_name, mother_name, father_mobile, mother_mobile,
                    guardian_name, guardian_mobile, previous_experience, experience_details,
                    medical_conditions, sport, admission_date, status, batch_time,
                    one_time_admission_fee, monthly_fee, adjusted_fee, current_session_id, documents, created_at, updated_at
                 ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37)
                 ON CONFLICT (id) DO NOTHING`,
                [
                    toUuid(row._id),
                    toUuid(row.tenantId),
                    toUuid(row.branchId),
                    row.membershipId || null,
                    row.name,
                    row.parentName || null,
                    row.email || null,
                    row.phone || null,
                    row.dateOfBirth ? new Date(row.dateOfBirth) : new Date(),
                    row.age || null,
                    row.gender || 'Male',
                    row.bloodGroup || null,
                    row.schoolName || null,
                    row.classGrade || null,
                    row.residentialAddress || null,
                    row.city || null,
                    row.pinCode || null,
                    row.fatherName || null,
                    row.motherName || null,
                    row.fatherMobile || null,
                    row.motherMobile || null,
                    row.guardianName || null,
                    row.guardianMobile || null,
                    row.previousExperience || 'No',
                    row.experienceDetails || null,
                    row.medicalConditions || null,
                    row.sport,
                    row.admissionDate || new Date(),
                    row.status || 'ACTIVE',
                    row.batchTime,
                    row.oneTimeAdmissionFee ?? 1500,
                    row.monthlyFee ?? 2000,
                    row.adjustedFee ?? null,
                    toUuid(row.currentSessionId),
                    JSON.stringify(row.documents || {}),
                    row.createdAt || new Date(),
                    row.updatedAt || new Date()
                ]
            );
        }
        console.log(`- Migrated ${students.length} students.`);

        // --- 8. Batches & Batch Members ---
        console.log('Migrating Batches & Members...');
        const Batch = mongoose.model('Batch', new mongoose.Schema({}, { strict: false }));
        const batches = await Batch.find({});
        for (const b of batches) {
            const row = b.toObject();
            const batchUuid = toUuid(row._id);
            await pgClient.query(
                `INSERT INTO batches (id, tenant_id, branch_id, name, sport, session_id, coach_id, ground_id, capacity, start_time, end_time, status, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                 ON CONFLICT (id) DO NOTHING`,
                [
                    batchUuid,
                    toUuid(row.tenantId),
                    toUuid(row.branchId),
                    row.name,
                    row.sport,
                    toUuid(row.sessionId),
                    toUuid(row.coachId),
                    row.groundId || null,
                    row.capacity ?? 20,
                    row.startTime,
                    row.endTime,
                    row.status || 'ACTIVE',
                    row.createdAt || new Date(),
                    row.updatedAt || new Date()
                ]
            );

            // Populate relational join table 'batch_members'
            if (row.members && Array.isArray(row.members)) {
                for (const studentId of row.members) {
                    await pgClient.query(
                        `INSERT INTO batch_members (batch_id, student_id)
                         VALUES ($1, $2)
                         ON CONFLICT DO NOTHING`,
                        [batchUuid, toUuid(studentId)]
                    );
                }
            }
        }
        console.log(`- Migrated ${batches.length} batches.`);

        // --- 9. Fee Structures ---
        console.log('Migrating Fee Structures...');
        const FeeStructure = mongoose.model('FeeStructure', new mongoose.Schema({}, { strict: false }));
        const feeStructures = await FeeStructure.find({});
        for (const fs of feeStructures) {
            const row = fs.toObject();
            await pgClient.query(
                `INSERT INTO fee_structures (id, tenant_id, branch_id, session_id, sport, one_time_admission_fee, monthly_fee, late_fee_penalty, due_day_of_month, is_active, updated_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                 ON CONFLICT (id) DO NOTHING`,
                [
                    toUuid(row._id),
                    toUuid(row.tenantId),
                    toUuid(row.branchId),
                    toUuid(row.sessionId),
                    row.sport || 'all',
                    row.oneTimeAdmissionFee ?? 1500,
                    row.monthlyFee,
                    row.lateFeePenalty ?? 0,
                    row.dueDayOfMonth ?? 5,
                    row.isActive ?? true,
                    row.updatedAt || new Date()
                ]
            );
        }
        console.log(`- Migrated ${feeStructures.length} fee structures.`);

        // --- 10. Fees (Invoices/Ledgers) ---
        console.log('Migrating Fees (Academy Invoices)...');
        const Fee = mongoose.model('Fee', new mongoose.Schema({}, { strict: false }));
        const fees = await Fee.find({});
        for (const f of fees) {
            const row = f.toObject();
            await pgClient.query(
                `INSERT INTO fees (id, tenant_id, branch_id, student_id, amount_due, amount_paid, payment_date, due_date, month_for, status, adjustment_reason, payment_method, credit_account, reference_no, sender_account, discount, order_id, created_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
                 ON CONFLICT (id) DO NOTHING`,
                [
                    toUuid(row._id),
                    toUuid(row.tenantId),
                    toUuid(row.branchId),
                    toUuid(row.studentId),
                    row.amountDue,
                    row.amountPaid ?? 0,
                    row.paymentDate || null,
                    row.dueDate,
                    row.monthFor,
                    row.status || 'UNPAID',
                    row.adjustmentReason || null,
                    row.paymentMethod || 'Cash',
                    row.creditAccount || null,
                    row.referenceNo || null,
                    row.senderAccount || null,
                    row.discount ?? 0,
                    row.orderId || null,
                    row.createdAt || new Date()
                ]
            );
        }
        console.log(`- Migrated ${fees.length} billing fee rows.`);

        // --- 11. Bookings (1,172 legacy entries seeded earlier!) ---
        console.log('Migrating Turf Bookings (This might take a moment)...');
        const Booking = mongoose.model('Booking', new mongoose.Schema({}, { strict: false }));
        const bookings = await Booking.find({});
        
        // Use transaction batching for high performance
        await pgClient.query('BEGIN');
        for (const b of bookings) {
            const row = b.toObject();
            await pgClient.query(
                `INSERT INTO bookings (id, tenant_id, branch_id, customer_name, customer_email, customer_phone, date, time_slots, total_amount, paid_amount, payment_status, payment_method, discount, order_id, transaction_id, sport, participants_count, payment_details, created_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
                 ON CONFLICT (order_id) DO NOTHING`,
                [
                    toUuid(row._id),
                    toUuid(row.tenantId),
                    toUuid(row.branchId),
                    row.customerName,
                    row.customerEmail,
                    row.customerPhone,
                    row.date, // string YYYY-MM-DD compiles directly to Postgres DATE type
                    row.timeSlots || [],
                    row.totalAmount,
                    row.paidAmount,
                    row.paymentStatus || 'PENDING',
                    row.paymentMethod,
                    row.discount ?? 0,
                    row.orderId,
                    row.transactionId || null,
                    row.sport,
                    row.participantsCount ?? 1,
                    row.paymentDetails ? JSON.stringify(row.paymentDetails) : null,
                    row.createdAt || new Date()
                ]
            );
        }
        await pgClient.query('COMMIT');
        console.log(`- Migrated ${bookings.length} turf bookings.`);

        // --- 12. Turf Closures ---
        console.log('Migrating Turf Closures...');
        const TurfClosure = mongoose.model('TurfClosure', new mongoose.Schema({}, { strict: false }));
        const closures = await TurfClosure.find({});
        for (const tc of closures) {
            const row = tc.toObject();
            await pgClient.query(
                `INSERT INTO turf_closures (id, tenant_id, branch_id, start_date, end_date, recurring_day, reason)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 ON CONFLICT (id) DO NOTHING`,
                [
                    toUuid(row._id),
                    toUuid(row.tenantId),
                    toUuid(row.branchId),
                    row.startDate,
                    row.endDate,
                    row.recurringDay ?? null,
                    row.reason || null
                ]
            );
        }
        console.log(`- Migrated ${closures.length} turf closures.`);

        // --- 13. Attendance ---
        console.log('Migrating Attendance...');
        const Attendance = mongoose.model('Attendance', new mongoose.Schema({}, { strict: false }));
        const attendanceRecords = await Attendance.find({});
        for (const att of attendanceRecords) {
            const row = att.toObject();
            await pgClient.query(
                `INSERT INTO attendance (id, tenant_id, branch_id, student_id, date, status, marked_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 ON CONFLICT (id) DO NOTHING`,
                [
                    toUuid(row._id),
                    toUuid(row.tenantId),
                    toUuid(row.branchId),
                    toUuid(row.studentId),
                    row.date,
                    row.status,
                    row.markedAt || new Date()
                ]
            );
        }
        console.log(`- Migrated ${attendanceRecords.length} attendance records.`);

        // --- 14. Audit Logs ---
        console.log('Migrating Audit Logs...');
        const AuditLog = mongoose.model('AuditLog', new mongoose.Schema({}, { strict: false }));
        const auditLogs = await AuditLog.find({});
        for (const log of auditLogs) {
            const row = log.toObject();
            await pgClient.query(
                `INSERT INTO audit_logs (id, tenant_id, user_id, module, action, old_data, new_data, ip_address, timestamp)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                 ON CONFLICT (id) DO NOTHING`,
                [
                    toUuid(row._id),
                    toUuid(row.tenantId),
                    row.userId,
                    row.module,
                    row.action,
                    row.oldData ? JSON.stringify(row.oldData) : null,
                    row.newData ? JSON.stringify(row.newData) : null,
                    row.ipAddress || null,
                    row.timestamp || new Date()
                ]
            );
        }
        console.log(`- Migrated ${auditLogs.length} audit log rows.`);

        // --- 15. Enquiries ---
        console.log('Migrating Enquiries...');
        const Enquiry = mongoose.model('Enquiry', new mongoose.Schema({}, { strict: false }));
        const enquiries = await Enquiry.find({});
        for (const eq of enquiries) {
            const row = eq.toObject();
            await pgClient.query(
                `INSERT INTO enquiries (
                    id, tenant_id, branch_id, student_name, date_of_birth, age, gender, school_name, class_grade,
                    father_name, mobile_number, interested_in, previous_experience, experience_details,
                    expected_joining_month, heard_about, heard_about_other, questions, source, status, converted_student_id, notes, created_at
                 ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
                 ON CONFLICT (id) DO NOTHING`,
                [
                    toUuid(row._id),
                    toUuid(row.tenantId),
                    toUuid(row.branchId),
                    row.studentName,
                    row.dateOfBirth ? new Date(row.dateOfBirth) : null,
                    row.age || null,
                    row.gender || '',
                    row.schoolName || null,
                    row.classGrade || null,
                    row.fatherName || null,
                    row.mobileNumber,
                    row.interestedIn || '',
                    row.previousExperience || '',
                    row.experienceDetails || null,
                    row.expectedJoiningMonth || null,
                    row.heardAbout || null,
                    row.heardAboutOther || null,
                    row.questions || null,
                    row.source,
                    row.status || 'NEW',
                    toUuid(row.convertedStudentId),
                    row.notes || null,
                    row.createdAt || new Date()
                ]
            );
        }
        console.log(`- Migrated ${enquiries.length} enquiries.`);

        // --- 16. Inventory Items ---
        console.log('Migrating Inventory Items...');
        const InventoryItem = mongoose.model('InventoryItem', new mongoose.Schema({}, { strict: false }));
        const inventoryItems = await InventoryItem.find({});
        for (const item of inventoryItems) {
            const row = item.toObject();
            await pgClient.query(
                `INSERT INTO inventory_items (id, tenant_id, branch_id, item_name, category, total_quantity, available_quantity, condition, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                 ON CONFLICT (id) DO NOTHING`,
                [
                    toUuid(row._id),
                    toUuid(row.tenantId),
                    toUuid(row.branchId),
                    row.itemName,
                    row.category,
                    row.totalQuantity,
                    row.availableQuantity,
                    row.condition || 'GOOD',
                    row.createdAt || new Date(),
                    row.updatedAt || new Date()
                ]
            );
        }
        console.log(`- Migrated ${inventoryItems.length} inventory items.`);

        // --- 17. POS Sales ---
        console.log('Migrating POS Sales...');
        const POSSale = mongoose.model('POSSale', new mongoose.Schema({}, { strict: false }));
        const posSales = await POSSale.find({});
        for (const sale of posSales) {
            const row = sale.toObject();
            await pgClient.query(
                `INSERT INTO pos_sales (id, tenant_id, branch_id, booking_id, item_id, quantity, total_price, sold_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                 ON CONFLICT (id) DO NOTHING`,
                [
                    toUuid(row._id),
                    toUuid(row.tenantId),
                    toUuid(row.branchId),
                    toUuid(row.bookingId),
                    toUuid(row.itemId),
                    row.quantity,
                    row.totalPrice,
                    row.soldAt || new Date()
                ]
            );
        }
        console.log(`- Migrated ${posSales.length} POS sales transactions.`);

        // --- 18. Check In Logs ---
        console.log('Migrating Check-In Logs...');
        const CheckInLog = mongoose.model('CheckInLog', new mongoose.Schema({}, { strict: false }));
        const checkInLogs = await CheckInLog.find({});
        for (const log of checkInLogs) {
            const row = log.toObject();
            await pgClient.query(
                `INSERT INTO check_in_logs (id, tenant_id, branch_id, booking_id, student_id, player_name, type, check_in_time, check_out_time)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                 ON CONFLICT (id) DO NOTHING`,
                [
                    toUuid(row._id),
                    toUuid(row.tenantId),
                    toUuid(row.branchId),
                    toUuid(row.bookingId),
                    toUuid(row.studentId),
                    row.playerName,
                    row.type,
                    row.checkInTime || new Date(),
                    row.checkOutTime || null
                ]
            );
        }
        console.log(`- Migrated ${checkInLogs.length} check-in logs.`);

        console.log('\n==============================================');
        console.log('Database Migration to Supabase Completed Successfully!');
        console.log('==============================================');

    } catch (err) {
        console.error('\n❌ Migration failed during database processing:', err.message);
    } finally {
        await mongoose.disconnect();
        await pgClient.end();
    }
}

migrate().catch(err => {
    console.error('Fatal migration error:', err);
    process.exit(1);
});
