-- Supabase/PostgreSQL Database Schema
-- Project: Khelo Patna Elite Sports & Turf ERP
-- Generated to mirror original MongoDB/Mongoose models with relational integrity.

-- Enable UUID extension for primary key generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tenants Table
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    subdomain TEXT UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    config JSONB DEFAULT '{"theme": "light", "currency": "INR"}'::jsonb,
    subscription_plan TEXT DEFAULT 'ENTERPRISE',
    subscription_expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Branches Table
CREATE TABLE branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT,
    city TEXT,
    state TEXT,
    contact_number TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Sessions Table
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- e.g., "2026-2027"
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT CHECK (status IN ('ACTIVE', 'INACTIVE')) DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Turf Settings Table
CREATE TABLE turf_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    cricket_base_rate NUMERIC(10, 2) DEFAULT 1200.00,
    football_base_rate NUMERIC(10, 2) DEFAULT 1500.00,
    nets_base_rate NUMERIC(10, 2) DEFAULT 800.00,
    blackout_hours JSONB DEFAULT '{"start": 15, "end": 18}'::jsonb, -- 3 PM - 6 PM
    weekly_rates JSONB DEFAULT '{"cricket": [1000, 1000, 1000, 1000, 1000, 1000, 1000], "football": [1200, 1200, 1200, 1200, 1200, 1200, 1200], "nets": [800, 800, 800, 800, 800, 800, 800]}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Staff (Employee Users) Table
CREATE TABLE staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    username TEXT NOT NULL,
    password_hash TEXT NOT NULL, -- renamed from 'password' to clarify it's a hash
    role TEXT CHECK (role IN ('SUPER_ADMIN', 'BRANCH_MANAGER', 'STAFF')) DEFAULT 'STAFF',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (tenant_id, username)
);

-- 6. Coaches Table
CREATE TABLE coaches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    sports TEXT[] DEFAULT '{}', -- Array of sports (e.g. {'cricket', 'football'})
    salary NUMERIC(10, 2) DEFAULT 0.00,
    schedule TEXT, -- e.g. "Mon-Fri 06:00-08:00 AM"
    status TEXT CHECK (status IN ('ACTIVE', 'INACTIVE')) DEFAULT 'ACTIVE',
    rating NUMERIC(3, 2) DEFAULT 5.00,
    joining_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Students (Academy Members) Table
CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    membership_id TEXT,
    name TEXT NOT NULL,
    parent_name TEXT, -- legacy support
    email TEXT,
    phone TEXT, -- legacy support
    date_of_birth DATE NOT NULL,
    age INT,
    gender TEXT CHECK (gender IN ('Male', 'Female', 'Other')) DEFAULT 'Male',
    blood_group TEXT,
    school_name TEXT,
    class_grade TEXT,
    residential_address TEXT,
    city TEXT,
    pin_code TEXT,
    father_name TEXT,
    mother_name TEXT,
    father_mobile TEXT,
    mother_mobile TEXT,
    guardian_name TEXT,
    guardian_mobile TEXT,
    previous_experience TEXT CHECK (previous_experience IN ('Yes', 'No')) DEFAULT 'No',
    experience_details TEXT,
    medical_conditions TEXT,
    sport TEXT NOT NULL,
    admission_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status TEXT CHECK (status IN ('ACTIVE', 'INACTIVE', 'DROPOUT')) DEFAULT 'ACTIVE',
    batch_time TEXT NOT NULL, -- e.g. "06:00-08:00 AM"
    one_time_admission_fee NUMERIC(10, 2) DEFAULT 1500.00,
    monthly_fee NUMERIC(10, 2) DEFAULT 2000.00,
    adjusted_fee NUMERIC(10, 2),
    current_session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
    documents JSONB DEFAULT '{"photoUrl": "", "aadhaarUrl": "", "birthCertUrl": "", "medicalCertUrl": ""}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (tenant_id, membership_id)
);

-- 8. Batches Table
CREATE TABLE batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- e.g. "Morning Elite Under-16"
    sport TEXT NOT NULL, -- e.g. "cricket"
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    coach_id UUID REFERENCES coaches(id) ON DELETE SET NULL,
    ground_id TEXT,
    capacity INT DEFAULT 20,
    start_time TEXT NOT NULL, -- e.g. "06:00 AM"
    end_time TEXT NOT NULL, -- e.g. "08:00 AM"
    status TEXT CHECK (status IN ('ACTIVE', 'INACTIVE')) DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Batch Members Association Table (Relational replacement for batches.members array)
CREATE TABLE batch_members (
    batch_id UUID REFERENCES batches(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    PRIMARY KEY (batch_id, student_id)
);

-- 9. Fee Structures Table
CREATE TABLE fee_structures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
    sport TEXT CHECK (sport IN ('cricket', 'football', 'all')) DEFAULT 'all',
    one_time_admission_fee NUMERIC(10, 2) DEFAULT 1500.00,
    monthly_fee NUMERIC(10, 2) NOT NULL,
    late_fee_penalty NUMERIC(10, 2) DEFAULT 0.00,
    due_day_of_month INT CHECK (due_day_of_month BETWEEN 1 AND 28) DEFAULT 5,
    is_active BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Fees (Invoices/Ledger) Table
CREATE TABLE fees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    amount_due NUMERIC(10, 2) NOT NULL,
    amount_paid NUMERIC(10, 2) DEFAULT 0.00,
    payment_date TIMESTAMP WITH TIME ZONE,
    due_date DATE NOT NULL,
    month_for TEXT NOT NULL, -- e.g. "June 2026"
    status TEXT CHECK (status IN ('PAID', 'PARTIAL', 'UNPAID')) DEFAULT 'UNPAID',
    adjustment_reason TEXT,
    payment_method TEXT DEFAULT 'Cash',
    credit_account TEXT,
    reference_no TEXT,
    sender_account TEXT,
    discount NUMERIC(10, 2) DEFAULT 0.00,
    order_id TEXT, -- Cashfree transaction order ID if paid online
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. Bookings Table (Turf Booking logs)
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    date DATE NOT NULL, -- mapped to DATE object
    time_slots TEXT[] NOT NULL, -- e.g. {"06:00-07:00", "07:00-08:00"}
    total_amount NUMERIC(10, 2) NOT NULL,
    paid_amount NUMERIC(10, 2) NOT NULL,
    payment_status TEXT CHECK (payment_status IN ('PENDING', 'SUCCESS', 'FAILED', 'CANCELLED')) DEFAULT 'PENDING',
    payment_method TEXT CHECK (payment_method IN ('cashfree', 'upi', 'cash', 'offline', 'card')) NOT NULL,
    discount NUMERIC(10, 2) DEFAULT 0.00,
    order_id TEXT UNIQUE NOT NULL,
    transaction_id TEXT,
    sport TEXT NOT NULL,
    participants_count INT DEFAULT 1,
    payment_details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. Turf Closures Table
CREATE TABLE turf_closures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    recurring_day INT CHECK (recurring_day BETWEEN 0 AND 6), -- 0 = Sunday, 6 = Saturday
    reason TEXT
);

-- 13. Attendance Table
CREATE TABLE attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status TEXT CHECK (status IN ('PRESENT', 'ABSENT', 'LATE', 'LEAVE')) NOT NULL,
    marked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (tenant_id, date, student_id)
);

-- 14. Audit Logs Table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL, -- Username or staff ID
    module TEXT NOT NULL, -- e.g. "Members", "Turf", "Finance"
    action TEXT NOT NULL, -- e.g. "CREATE_MEMBER"
    old_data JSONB,
    new_data JSONB,
    ip_address TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 15. Enquiries Table
CREATE TABLE enquiries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    student_name TEXT NOT NULL,
    date_of_birth DATE,
    age INT,
    gender TEXT CHECK (gender IN ('Male', 'Female', 'Other', '')),
    school_name TEXT,
    class_grade TEXT,
    father_name TEXT,
    mobile_number TEXT NOT NULL,
    interested_in TEXT CHECK (interested_in IN ('cricket', 'football', '')),
    previous_experience TEXT CHECK (previous_experience IN ('Yes', 'No', '')),
    experience_details TEXT,
    expected_joining_month TEXT,
    heard_about TEXT,
    heard_about_other TEXT,
    questions TEXT,
    source TEXT NOT NULL, -- "Public Website" or "Internal - [username]"
    status TEXT CHECK (status IN ('NEW', 'CONTACTED', 'CONVERTED', 'CLOSED')) DEFAULT 'NEW',
    converted_student_id UUID REFERENCES students(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 16. Inventory Items Table
CREATE TABLE inventory_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    item_name TEXT NOT NULL,
    category TEXT NOT NULL,
    total_quantity INT NOT NULL,
    available_quantity INT NOT NULL,
    condition TEXT CHECK (condition IN ('GOOD', 'DAMAGED', 'LOST')) DEFAULT 'GOOD',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 17. POS Sales Table
CREATE TABLE pos_sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
    item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
    quantity INT NOT NULL,
    total_price NUMERIC(10, 2) NOT NULL,
    sold_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 18. Chat Sessions Table (WhatsApp interactive sessions)
CREATE TABLE chat_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone TEXT UNIQUE NOT NULL,
    state TEXT DEFAULT 'IDLE',
    booking_data JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 19. Check In Logs Table
CREATE TABLE check_in_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
    student_id UUID REFERENCES students(id) ON DELETE SET NULL,
    player_name TEXT NOT NULL,
    type TEXT CHECK (type IN ('TURF_BOOKING', 'ACADEMY_STUDENT')) NOT NULL,
    check_in_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    check_out_time TIMESTAMP WITH TIME ZONE
);

-- 20. Finance Configs Table
CREATE TABLE finance_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
    fee_terms JSONB DEFAULT '[]'::jsonb,
    fee_types JSONB DEFAULT '[]'::jsonb,
    fee_rebates JSONB DEFAULT '[]'::jsonb,
    fee_groups JSONB DEFAULT '[]'::jsonb,
    student_fee_groups JSONB DEFAULT '{}'::jsonb,
    student_back_dues JSONB DEFAULT '{}'::jsonb,
    fee_payments JSONB DEFAULT '[]'::jsonb,
    adjustment_requests JSONB DEFAULT '[]'::jsonb,
    fee_reminders_log JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE finance_configs ENABLE ROW LEVEL SECURITY;

-- 21. Communication Logs Table
CREATE TABLE communication_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('EMAIL', 'WHATSAPP')),
    recipient VARCHAR(255) NOT NULL,
    subject VARCHAR(255) DEFAULT NULL,
    content TEXT NOT NULL,
    status VARCHAR(20) CHECK (status IN ('SENT', 'FAILED')) DEFAULT 'SENT',
    error_message TEXT DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE communication_logs ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- Database Indexes for Performance
-- ==========================================

-- Multi-tenant optimization indexes
CREATE INDEX idx_branches_tenant ON branches (tenant_id);
CREATE INDEX idx_sessions_tenant ON sessions (tenant_id);
CREATE INDEX idx_staff_tenant ON staff (tenant_id);
CREATE INDEX idx_coaches_tenant ON coaches (tenant_id);
CREATE INDEX idx_students_tenant ON students (tenant_id);
CREATE INDEX idx_batches_tenant ON batches (tenant_id);
CREATE INDEX idx_fees_tenant ON fees (tenant_id);
CREATE INDEX idx_bookings_tenant ON bookings (tenant_id);
CREATE INDEX idx_attendance_tenant ON attendance (tenant_id);
CREATE INDEX idx_enquiries_tenant ON enquiries (tenant_id);
CREATE INDEX idx_inventory_tenant ON inventory_items (tenant_id);
CREATE INDEX idx_pos_tenant ON pos_sales (tenant_id);
CREATE INDEX idx_checkin_tenant ON check_in_logs (tenant_id);
CREATE INDEX idx_finance_tenant ON finance_configs (tenant_id);
CREATE INDEX idx_communication_logs_tenant ON communication_logs (tenant_id);
CREATE INDEX idx_communication_logs_type ON communication_logs (type);
CREATE INDEX idx_communication_logs_created ON communication_logs (created_at DESC);

-- Operational search and date indexes
CREATE INDEX idx_bookings_date ON bookings (tenant_id, date);
CREATE INDEX idx_attendance_lookup ON attendance (tenant_id, date, student_id);
CREATE INDEX idx_fees_ledger ON fees (tenant_id, student_id, month_for);
CREATE INDEX idx_fees_status_due ON fees (tenant_id, status, due_date);
CREATE INDEX idx_audit_timestamp ON audit_logs (tenant_id, timestamp DESC);
CREATE INDEX idx_enquiries_status ON enquiries (tenant_id, status, created_at DESC);
CREATE INDEX idx_checkin_active ON check_in_logs (tenant_id, check_in_time) WHERE check_out_time IS NULL;

-- Automatically update updated_at triggers
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

CREATE TRIGGER update_tenants_modtime BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_branches_modtime BEFORE UPDATE ON branches FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_sessions_modtime BEFORE UPDATE ON sessions FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_turf_settings_modtime BEFORE UPDATE ON turf_settings FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_staff_modtime BEFORE UPDATE ON staff FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_coaches_modtime BEFORE UPDATE ON coaches FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_students_modtime BEFORE UPDATE ON students FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_batches_modtime BEFORE UPDATE ON batches FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_inventory_modtime BEFORE UPDATE ON inventory_items FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_finance_modtime BEFORE UPDATE ON finance_configs FOR EACH ROW EXECUTE FUNCTION update_modified_column();
