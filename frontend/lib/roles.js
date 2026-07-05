export const STAFF_ROLES = [
    'SUPER_ADMIN',
    'ACADEMY_OWNER',
    'BRANCH_MANAGER',
    'FINANCE_MANAGER',
    'RECEPTIONIST',
    'COACH',
    'GROUND_MANAGER',
    'HR_MANAGER'
];

export const ROLE_LABELS = {
    SUPER_ADMIN: 'Super Admin',
    ACADEMY_OWNER: 'Academy Owner',
    BRANCH_MANAGER: 'Branch Manager',
    FINANCE_MANAGER: 'Finance Manager',
    RECEPTIONIST: 'Receptionist',
    COACH: 'Coach',
    GROUND_MANAGER: 'Ground Manager',
    HR_MANAGER: 'HR Manager'
};

export const ROLE_PERMISSIONS = {
    SUPER_ADMIN: 'Full system access — settings, staff, finance, academy & turf',
    ACADEMY_OWNER: 'Academy operations, finance oversight, staff management',
    BRANCH_MANAGER: 'Turf bookings, POS, calendar & slot management',
    FINANCE_MANAGER: 'Billing, fee collection, accounts & revenue reports',
    RECEPTIONIST: 'Student admissions, attendance tracking & fee collection',
    COACH: 'Attendance, batch roster & student progress',
    GROUND_MANAGER: 'Turf operations, check-ins & facility management',
    HR_MANAGER: 'Staff directory, payroll & HR records'
};

const ADMIN_ROLES = ['SUPER_ADMIN', 'ACADEMY_OWNER', 'FINANCE_MANAGER', 'HR_MANAGER'];
const TURF_ROLES = ['BRANCH_MANAGER', 'GROUND_MANAGER'];
const ACADEMY_ROLES = ['RECEPTIONIST', 'COACH'];

export function getDefaultTabForRole(role) {
    if (ADMIN_ROLES.includes(role)) return 'dashboard';
    if (TURF_ROLES.includes(role)) return 'turf-management';
    if (ACADEMY_ROLES.includes(role)) return 'membership-management';
    return 'dashboard';
}

export function canRegisterStaff(role) {
    return ['SUPER_ADMIN', 'ACADEMY_OWNER', 'HR_MANAGER'].includes(role);
}

export function canManageAcademy(role) {
    return ['SUPER_ADMIN', 'ACADEMY_OWNER', 'BRANCH_MANAGER', 'RECEPTIONIST', 'COACH', 'FINANCE_MANAGER'].includes(role);
}

export function canManageFinance(role) {
    return ['SUPER_ADMIN', 'ACADEMY_OWNER', 'FINANCE_MANAGER', 'RECEPTIONIST'].includes(role);
}
