"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import Launcher from './components/Launcher';
import MembershipTab from './components/MembershipTab';
import BatchTab from './components/BatchTab';
import CoachTab from './components/CoachTab';
import FinanceTab from './components/FinanceTab';
import HRTab from './components/HRTab';
import WebsiteTab from './components/WebsiteTab';
import AuditLogsTab from './components/AuditLogsTab';
import GoogleReviewsTab from './components/GoogleReviewsTab';
import IntegrationsTab from './components/IntegrationsTab';
import CustomersTab from './components/CustomersTab';
import AnimatedNumber from './components/AnimatedNumber';
import SettingsTab from './components/SettingsTab';
import AdmissionStudio from './components/AdmissionStudio';

import CouponsTab from './components/CouponsTab';
import { getBackendUrl } from '../lib/backendUrl';
import { getDefaultTabForRole, ROLE_LABELS, ROLE_PERMISSIONS, canRegisterStaff } from '../../lib/roles';
import DashboardTab from './components/DashboardTab';
import TurfTab from './components/TurfTab';
import AcademyTab from './components/AcademyTab';
import SessionTab from './components/SessionTab';
import AttendanceTab from './components/AttendanceTab';
import InventoryTab from './components/InventoryTab';
import CommunicationTab from './components/CommunicationTab';

const BACKEND_URL = getBackendUrl();

const formatSlotTo12Hr = (slotStr) => {
    if (!slotStr || !slotStr.includes('-')) return slotStr;
    const parts = slotStr.split('-');
    if (parts.length !== 2) return slotStr;
    
    const formatHour = (hStr) => {
        let h = parseInt(hStr, 10);
        if (isNaN(h)) return hStr;
        h = h % 24;
        const period = h >= 12 ? 'PM' : 'AM';
        let h12 = h % 12;
        if (h12 === 0) h12 = 12;
        const padHour = String(h12).padStart(2, '0');
        return `${padHour}:00 ${period}`;
    };
    
    return `${formatHour(parts[0])} - ${formatHour(parts[1])}`;
};

export default function AdminDashboard() {
    const router = useRouter();

    useEffect(() => {
        const originalFetch = window.fetch;
        window.fetch = function (url, options = {}) {
            if (typeof url === 'string' && url.includes(BACKEND_URL)) {
                options.credentials = 'include';
            }
            return originalFetch(url, options);
        };
        return () => {
            window.fetch = originalFetch;
        };
    }, []);
    
    // Auth States
    const [token, setToken] = useState('');
    const [role, setRole] = useState('');
    const [permissions, setPermissions] = useState([]);
    const [username, setUsername] = useState('');
    const [authenticated, setAuthenticated] = useState(false);
    const [theme, setTheme] = useState('light');
    
    // Navigation Panel State
    const [activeTab, setActiveTab] = useState('');
    const [activeSidebarKey, setActiveSidebarKey] = useState('dashboard');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    
    // GungunERP Launcher and Data Lists States
    const [showLauncher, setShowLauncher] = useState(false);
    const [sessionsList, setSessionsList] = useState([]);
    const [coachesList, setCoachesList] = useState([]);
    const [batchesList, setBatchesList] = useState([]);
    const [auditLogsList, setAuditLogsList] = useState([]);
    const [initialSelectedMemberId, setInitialSelectedMemberId] = useState('');
    const [initialStudentId, setInitialStudentId] = useState('');
    const [newSessionData, setNewSessionData] = useState({ name: '', startDate: '', endDate: '', status: 'ACTIVE' });
    const [commType, setCommType] = useState('single');
    
    // Calendar States
    const [calendarView, setCalendarView] = useState('month');
    const [calendarDate, setCalendarDate] = useState(new Date());

    // Common Loading/Error states
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    // Auto-dismiss toast notifications (success after 4.5s, errors after 8s).
    useEffect(() => {
        if (!successMessage) return;
        const t = setTimeout(() => setSuccessMessage(''), 4500);
        return () => clearTimeout(t);
    }, [successMessage]);
    useEffect(() => {
        if (!errorMessage) return;
        const t = setTimeout(() => setErrorMessage(''), 8000);
        return () => clearTimeout(t);
    }, [errorMessage]);

    // --- DATA STATES ---
    // Analytics
    const [stats, setStats] = useState(null);
    const [revenueAnalytics, setRevenueAnalytics] = useState([]);
    const [pendingFeesAmount, setPendingFeesAmount] = useState(0);
    
    // Settings & Closures
    const [turfSettings, setTurfSettings] = useState(null);
    const [closuresList, setClosuresList] = useState([]);
    const [newClosure, setNewClosure] = useState({
        startDate: '',
        endDate: '',
        recurringDay: '',
        reason: ''
    });

    // WhatsApp
    const [whatsappStatus, setWhatsappStatus] = useState({ status: 'DISCONNECTED', qr: '', bot_enabled: false });
    
    // Inventory & POS
    const [inventoryItems, setInventoryItems] = useState([]);
    const [posItems, setPosItems] = useState([]);
    const [newInventoryItem, setNewInventoryItem] = useState({
        id: '',
        itemName: '',
        category: 'pos_drinks',
        totalQuantity: 0,
        availableQuantity: 0,
        condition: 'GOOD',
        unitPrice: 0
    });
    const [posSale, setPosSale] = useState({
        itemId: '',
        quantity: 1,
        bookingId: ''
    });

    // Staff Accounts & Change Password
    const [newStaff, setNewStaff] = useState({
        username: '',
        password: '',
        role: 'RECEPTIONIST'
    });
    const [staffList, setStaffList] = useState([]);
    
    // User Profile Menu & Change Password Modal
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
    const [changePasswordForm, setChangePasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [changingPassword, setChangingPassword] = useState(false);

    const handleChangePasswordSubmit = async (e) => {
        e.preventDefault();
        if (changePasswordForm.newPassword !== changePasswordForm.confirmPassword) {
            setErrorMessage('New password and confirm password do not match.');
            return;
        }

        setChangingPassword(true);
        setErrorMessage('');
        setSuccessMessage('');

        try {
            const res = await fetch(`${BACKEND_URL}/api/auth/change-password`, {
                method: 'POST',
                headers: getHeaders(),
                credentials: 'include',
                body: JSON.stringify({
                    currentPassword: changePasswordForm.currentPassword,
                    newPassword: changePasswordForm.newPassword
                })
            });
            const data = await res.json();
            if (res.ok) {
                setSuccessMessage('Your password has been updated successfully.');
                setShowChangePasswordModal(false);
                setChangePasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
            } else {
                setErrorMessage(data.error || 'Failed to change password.');
            }
        } catch (err) {
            console.error('Error changing password:', err);
            setErrorMessage('Network error changing password.');
        } finally {
            setChangingPassword(false);
        }
    };

    // Bookings
    const [bookingsLog, setBookingsLog] = useState([]);
    const [bookingsFilter, setBookingsFilter] = useState({
        sport: '',
        paymentStatus: 'SUCCESS' // Default to SUCCESS to show only paid/success bookings initially
    });
    const [selectedBooking, setSelectedBookingState] = useState(null);
    const [isRescheduling, setIsRescheduling] = useState(false);
    const [rescheduleDate, setRescheduleDate] = useState('');
    const [rescheduleSlots, setRescheduleSlots] = useState([]);
    const [rescheduleAvailableSlots, setRescheduleAvailableSlots] = useState([]);
    const [loadingRescheduleSlots, setLoadingRescheduleSlots] = useState(false);
    const [bookingsDateRange, setBookingsDateRange] = useState('30days'); // 'all', '30days', '90days', 'custom'
    const [bookingsCustomStartDate, setBookingsCustomStartDate] = useState('');
    const [bookingsCustomEndDate, setBookingsCustomEndDate] = useState('');
    const [showBookingsReportModal, setShowBookingsReportModal] = useState(false);

    useEffect(() => {
        if (selectedBooking) {
            setIsRescheduling(false);
            setRescheduleDate(selectedBooking.date || '');
            setRescheduleSlots(selectedBooking.timeSlots || []);
            setRescheduleAvailableSlots([]);
        }
    }, [selectedBooking]);

    useEffect(() => {
        if (!selectedBooking || !isRescheduling || !rescheduleDate) return;
        
        const fetchRescheduleSlots = async () => {
            setLoadingRescheduleSlots(true);
            try {
                const res = await fetch(`${BACKEND_URL}/api/available-slots?sport=${selectedBooking.sport}&date=${rescheduleDate}&is_admin=true`);
                if (!res.ok) throw new Error('Failed to load slots');
                const data = await res.json();
                
                // Allow the currently booked slots of THIS booking to show up as available,
                // so the admin can keep them or change parts of them without them showing as blocked!
                const slots = (data.slots || []).map(slot => {
                    if (selectedBooking.date === rescheduleDate && selectedBooking.timeSlots.includes(slot.value)) {
                        return { ...slot, available: true, booked: false, reason: '' };
                    }
                    return slot;
                });
                setRescheduleAvailableSlots(slots);
            } catch (err) {
                console.error('Error fetching reschedule slots:', err);
                setRescheduleAvailableSlots([]);
            } finally {
                setLoadingRescheduleSlots(false);
            }
        };
        
        fetchRescheduleSlots();
    }, [selectedBooking, isRescheduling, rescheduleDate]);

    // Offline Booking States
    const [showOfflineBookingModal, setShowOfflineBookingModal] = useState(false);
    const [offlineBookingForm, setOfflineBookingForm] = useState({
        customerName: '',
        customerEmail: '',
        customerPhone: '',
        sport: 'cricket',
        date: new Date().toISOString().split('T')[0],
        timeSlots: [],
        discount: 0,
        paidAmount: 0,
        paymentMethod: 'cash',
        paymentType: 'offline', // 'offline' or 'link'
        participantsCount: 1
    });
    const [offlineAvailableSlots, setOfflineAvailableSlots] = useState([]);
    const [loadingOfflineSlots, setLoadingOfflineSlots] = useState(false);
    const [bookingSubmitting, setBookingSubmitting] = useState(false);
    const [customerLookupResult, setCustomerLookupResult] = useState(null);
    const [loadingCustomerLookup, setLoadingCustomerLookup] = useState(false);


    // Player Checkin/Checkout
    const [activeCheckins, setActiveCheckins] = useState([]);
    const [newCheckin, setNewCheckin] = useState({
        playerName: '',
        type: 'TURF_BOOKING',
        bookingId: '',
        studentId: ''
    });

    // Academy & Attendance
    const [newStudent, setNewStudent] = useState({
        name: '',
        dateOfBirth: '',
        age: '',
        gender: 'Male',
        schoolName: '',
        classGrade: '',
        residentialAddress: '',
        city: '',
        pinCode: '',
        fatherName: '',
        motherName: '',
        fatherMobile: '',
        motherMobile: '',
        email: '',
        sport: 'cricket',
        previousExperience: 'No',
        experienceDetails: '',
        medicalConditions: '',
        admissionDate: new Date().toISOString().split('T')[0],
        batchTime: '06:00-08:00 AM',
        oneTimeAdmissionFee: 1500,
        monthlyFee: 2000
    });
    const [attendanceSport, setAttendanceSport] = useState('cricket');
    const [attendanceDate, setAttendanceDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [studentsList, setStudentsList] = useState([]);
    const [attendanceGrid, setAttendanceGrid] = useState({}); // studentId -> status (PRESENT/ABSENT)

    // --- FINANCE STATES ---
    const [feeTerms, setFeeTerms] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('kp_fee_terms');
            if (saved) return JSON.parse(saved);
        }
        return [
            { id: 't1', name: 'First Term (Apr - Jul)', startDate: '2026-04-01', endDate: '2026-07-31', status: 'ACTIVE' },
            { id: 't2', name: 'Second Term (Aug - Nov)', startDate: '2026-08-01', endDate: '2026-11-30', status: 'INACTIVE' },
            { id: 't3', name: 'Third Term (Dec - Mar)', startDate: '2026-12-01', endDate: '2027-03-31', status: 'INACTIVE' }
        ];
    });

    const [feeTypes, setFeeTypes] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('kp_fee_types');
            if (saved) return JSON.parse(saved);
        }
        return [
            { id: 'ft1', name: 'Admission Fee', amount: 3000, frequency: 'ONE-TIME', description: 'One-time admission charges' },
            { id: 'ft2', name: 'Monthly Tuition Fee', amount: 1500, frequency: 'MONTHLY', description: 'Monthly training charges' },
            { id: 'ft3', name: 'Kit Charges', amount: 1200, frequency: 'ONE-TIME', description: 'Academy jersey and training kit' },
            { id: 'ft4', name: 'Tournament Fee', amount: 500, frequency: 'PERIODIC', description: 'Internal tournament registration' }
        ];
    });

    const [feeRebates, setFeeRebates] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('kp_fee_rebates');
            if (saved) return JSON.parse(saved);
        }
        return [
            { id: 'r1', name: 'Sibling Discount', type: 'PERCENTAGE', value: 10, description: '10% off for real siblings' },
            { id: 'r2', name: 'Merit Scholarship', type: 'PERCENTAGE', value: 25, description: '25% off for selected school players' },
            { id: 'r3', name: 'Staff Child Waiver', type: 'FIXED', value: 1500, description: '₹1500 waiver for academy staff children' }
        ];
    });

    const [feeGroups, setFeeGroups] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('kp_fee_groups');
            if (saved) return JSON.parse(saved);
        }
        return [
            { id: 'fg1', name: 'Elite Football Group', feeTypeIds: ['ft1', 'ft2', 'ft3'], description: 'Fee structure for high-intensity football batch' },
            { id: 'fg2', name: 'Weekend Cricket Nets', feeTypeIds: ['ft2', 'ft4'], description: 'Fee structure for weekend cricket training' }
        ];
    });

    const [studentFeeGroups, setStudentFeeGroups] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('kp_student_fee_groups');
            if (saved) return JSON.parse(saved);
        }
        return {}; // studentId -> feeGroupId
    });

    const [studentBackDues, setStudentBackDues] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('kp_student_back_dues');
            if (saved) return JSON.parse(saved);
        }
        return {}; // studentId -> backDuesAmount
    });

    const [feePayments, setFeePayments] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('kp_fee_payments');
            if (saved) return JSON.parse(saved);
        }
        return [];
    });

    const [adjustmentRequests, setAdjustmentRequests] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('kp_adjustment_requests');
            if (saved) return JSON.parse(saved);
        }
        return [
            { id: 'adj1', studentId: 'default_stud_1', studentName: 'Aarav Sharma', amount: 500, reason: 'Late admission waiver request', status: 'PENDING' },
            { id: 'adj2', studentId: 'default_stud_2', studentName: 'Kabir Verma', amount: 300, reason: 'Medical absence credit', status: 'APPROVED' }
        ];
    });

    const [feeRemindersLog, setFeeRemindersLog] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('kp_fee_reminders');
            if (saved) return JSON.parse(saved);
        }
        return [];
    });

    // Finance form states
    const [newFeeTerm, setNewFeeTerm] = useState({ name: '', startDate: '', endDate: '', status: 'ACTIVE' });
    const [newFeeType, setNewFeeType] = useState({ name: '', amount: '', frequency: 'MONTHLY', description: '' });
    const [newFeeRebate, setNewFeeRebate] = useState({ name: '', type: 'PERCENTAGE', value: '', description: '' });
    const [newFeeGroup, setNewFeeGroup] = useState({ name: '', feeTypeIds: [], description: '' });
    const [batchAssignGroupId, setBatchAssignGroupId] = useState('');
    const [newBackDue, setNewBackDue] = useState({ studentId: '', amount: '', description: '' });
    const [paymentSearchId, setPaymentSearchId] = useState('');
    const [selectedStudentForPayment, setSelectedStudentForPayment] = useState(null);
    const [paymentCollectionInput, setPaymentCollectionInput] = useState({ amountPaid: '', method: 'CASH', termId: '' });
    const [newAdjustmentRequest, setNewAdjustmentRequest] = useState({ studentId: '', amount: '', reason: '' });
    const [activeReceipt, setActiveReceipt] = useState(null);

    // Manage Members States
    const [allStudents, setAllStudents] = useState([]);
    const [memberFilters, setMemberFilters] = useState({
        username: '',
        classSport: '',
        sectionBatch: '',
        studentType: '',
        gender: '',
        rollAge: '',
        admissionNo: '',
        search: ''
    });
    const [memberStatusFilter, setMemberStatusFilter] = useState('ACTIVE'); // 'ACTIVE' or 'INACTIVE'
    const [editingStudent, setEditingStudent] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedStudents, setSelectedStudents] = useState([]);
    const [searchTriggeredFilters, setSearchTriggeredFilters] = useState({
        username: '',
        classSport: '',
        sectionBatch: '',
        studentType: '',
        gender: '',
        rollAge: '',
        admissionNo: '',
        search: ''
    });
    const [showCols, setShowCols] = useState({
        dob: false,
        admissionDate: false,
        address: false,
        biometric: false
    });


    // Fee Collector
    const [feeSearchQuery, setFeeSearchQuery] = useState('');
    const [feeStudentData, setFeeStudentData] = useState(null);
    const [feeDues, setFeeDues] = useState([]);
    const [feeCollection, setFeeCollection] = useState({
        amountPaid: '',
        monthFor: '',
        adjustmentReason: ''
    });

    // Communicate Tab States
    const [commFilter, setCommFilter] = useState('');
    const [pinnedComm, setPinnedComm] = useState([]);
    const [activeCommForm, setActiveCommForm] = useState('');
    const [recentComm, setRecentComm] = useState(['Group Message', 'Birthday Wishes', 'Holidays']);
    
    // Communicate Form Data
    const [commGroupMsg, setCommGroupMsg] = useState({ groupType: 'cricket', message: '' });
    const [commStudentMsg, setCommStudentMsg] = useState({ studentId: '', message: '' });
    const [commStaffMsg, setCommStaffMsg] = useState({ phone: '', message: '' });
    const [commSMS, setCommSMS] = useState({ phone: '', message: '' });
    const [commEmail, setCommEmail] = useState({ email: '', subject: '', message: '' });
    const [commNotice, setCommNotice] = useState({ title: '', audience: 'all', content: '' });

    // Enquiry States
    const [enquiriesList, setEnquiriesList] = useState([]);
    const [enquirySearchQuery, setEnquirySearchQuery] = useState('');
    const [showEnquiryModal, setShowEnquiryModal] = useState(false);
    const [selectedEnquiry, setSelectedEnquiry] = useState(null);
    const [newEnquiry, setNewEnquiry] = useState({
        studentName: '',
        dateOfBirth: '',
        age: '',
        gender: '',
        schoolName: '',
        classGrade: '',
        fatherName: '',
        mobileNumber: '',
        interestedIn: '',
        previousExperience: '',
        experienceDetails: '',
        expectedJoiningMonth: '',
        heardAbout: '',
        heardAboutOther: '',
        questions: ''
    });

    // --- AUTHENTICATION CHECK & THEME LOADER ---
    useEffect(() => {
        const storedToken = localStorage.getItem('token');
        const storedRole = localStorage.getItem('user_role');
        const storedUser = localStorage.getItem('username');
        const storedTheme = localStorage.getItem('erp_theme') || 'light';

        setTheme(storedTheme);
        if (storedToken) {
            setToken(storedToken);
        }
        if (storedRole) {
            setRole(storedRole);
        }
        if (storedUser) {
            setUsername(storedUser);
        }

        const verifySession = async () => {
            try {
                const headers = storedToken ? { Authorization: `Bearer ${storedToken}` } : {};
                const res = await fetch(`${BACKEND_URL}/api/auth/me`, {
                    headers,
                    credentials: 'include'
                });
                const profile = await res.json();

                if (!res.ok) {
                    throw new Error(profile.error || 'Session expired.');
                }

                const verifiedRole = profile.role;
                const verifiedUsername = profile.username;
                const verifiedPermissions = profile.permissions || [];
                setToken(storedToken || '');
                setRole(verifiedRole);
                setUsername(verifiedUsername);
                setPermissions(verifiedPermissions);
                if (storedToken) localStorage.setItem('token', storedToken);
                localStorage.setItem('user_role', verifiedRole);
                localStorage.setItem('username', verifiedUsername);
                setAuthenticated(true);

                let defaultTab = getDefaultTabForRole(verifiedRole);
                if (verifiedRole !== 'SUPER_ADMIN' && verifiedPermissions.length > 0) {
                    if (!verifiedPermissions.includes(defaultTab)) {
                        defaultTab = verifiedPermissions[0];
                    }
                }
                setActiveTab(defaultTab);
                setActiveSidebarKey(defaultTab);
            } catch (err) {
                localStorage.removeItem('token');
                localStorage.removeItem('user_role');
                localStorage.removeItem('username');
                document.cookie = 'kp_session=; path=/; max-age=0';
                router.push('/login');
            }
        };

        verifySession();
    }, []);

    const hasTabAccess = (tabId) => {
        if (!role) return false;
        if (role === 'SUPER_ADMIN') return true;
        
        if (permissions && permissions.length > 0) {
            return permissions.includes(tabId) || permissions.includes(`${tabId}:view`);
        }
        
        if (tabId === 'dashboard') {
            return ['SUPER_ADMIN', 'ACADEMY_OWNER', 'FINANCE_MANAGER', 'HR_MANAGER'].includes(role);
        }
        if (tabId === 'turf-management') {
            return ['SUPER_ADMIN', 'ACADEMY_OWNER', 'BRANCH_MANAGER', 'GROUND_MANAGER'].includes(role);
        }
        if (tabId === 'admission-studio' || tabId === 'membership-management' || tabId === 'session-management' || tabId === 'batch-management' || tabId === 'coach-management' || tabId === 'attendance-management') {
            return ['SUPER_ADMIN', 'ACADEMY_OWNER', 'BRANCH_MANAGER', 'RECEPTIONIST', 'COACH', 'FINANCE_MANAGER'].includes(role);
        }
        if (tabId === 'membership-billing' || tabId === 'finance') {
            return ['SUPER_ADMIN', 'ACADEMY_OWNER', 'FINANCE_MANAGER', 'RECEPTIONIST'].includes(role);
        }
        if (tabId === 'coupons') {
            return ['SUPER_ADMIN', 'ACADEMY_OWNER', 'FINANCE_MANAGER'].includes(role);
        }
        if (tabId === 'inventory-management') {
            return ['SUPER_ADMIN', 'ACADEMY_OWNER', 'BRANCH_MANAGER', 'GROUND_MANAGER'].includes(role);
        }
        if (tabId === 'hr') {
            return ['SUPER_ADMIN', 'ACADEMY_OWNER', 'HR_MANAGER'].includes(role);
        }
        if (tabId === 'communication' || tabId === 'customers') {
            return ['SUPER_ADMIN', 'ACADEMY_OWNER', 'BRANCH_MANAGER', 'RECEPTIONIST', 'HR_MANAGER'].includes(role);
        }
        if (tabId === 'website' || tabId === 'integrations' || tabId === 'settings' || tabId === 'audit-logs' || tabId === 'google-reviews') {
            return ['SUPER_ADMIN', 'ACADEMY_OWNER'].includes(role);
        }
        return false;
    };

    // --- FINANCE BACKEND SYNC ---
    // Fee data is persisted per-tenant in MongoDB (/api/finance/config).
    // localStorage is only read once as a legacy migration source: if the
    // server has no finance document yet, the locally-initialized state
    // (seeded from old kp_fee_* keys) is pushed up on first save.
    const [financeLoaded, setFinanceLoaded] = useState(false);

    useEffect(() => {
        if (!authenticated) return;

        const loadFinanceConfig = async () => {
            try {
                const res = await fetch(`${BACKEND_URL}/api/finance/config`, {
                    headers: getHeaders(),
                    credentials: 'include'
                });
                if (res.status === 403) {
                    // Caller's role has no finance access; skip sync entirely
                    return;
                }
                if (!res.ok) throw new Error('Failed to fetch finance config');
                const data = await res.json();

                if (data.exists && data.config) {
                    setFeeTerms(data.config.feeTerms || []);
                    setFeeTypes(data.config.feeTypes || []);
                    setFeeRebates(data.config.feeRebates || []);
                    setFeeGroups(data.config.feeGroups || []);
                    setStudentFeeGroups(data.config.studentFeeGroups || {});
                    setStudentBackDues(data.config.studentBackDues || {});
                    setFeePayments(data.config.feePayments || []);
                    setAdjustmentRequests(data.config.adjustmentRequests || []);
                    setFeeRemindersLog(data.config.feeRemindersLog || []);
                }
                // exists === false: keep current state (defaults or legacy
                // localStorage data) — the sync effect below will persist it.
                setFinanceLoaded(true);
            } catch (err) {
                console.error('Could not load finance data from server:', err);
                // Do NOT enable sync on failure — avoids overwriting server
                // data with local defaults.
            }
        };

        loadFinanceConfig();
    }, [authenticated]);

    // Debounced save of all finance sections whenever any of them change
    useEffect(() => {
        if (!financeLoaded) return;

        const timer = setTimeout(async () => {
            try {
                await fetch(`${BACKEND_URL}/api/finance/config`, {
                    method: 'PUT',
                    headers: getHeaders(),
                    credentials: 'include',
                    body: JSON.stringify({
                        feeTerms,
                        feeTypes,
                        feeRebates,
                        feeGroups,
                        studentFeeGroups,
                        studentBackDues,
                        feePayments,
                        adjustmentRequests,
                        feeRemindersLog
                    })
                });
            } catch (err) {
                console.error('Could not save finance data to server:', err);
            }
        }, 800);

        return () => clearTimeout(timer);
    }, [financeLoaded, feeTerms, feeTypes, feeRebates, feeGroups, studentFeeGroups, studentBackDues, feePayments, adjustmentRequests, feeRemindersLog]);

    // Get Auth Headers
    const getHeaders = () => {
        const headers = {
            'Content-Type': 'application/json'
        };
        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }
        return headers;
    };

    // Clear selected students when filters or status change
    useEffect(() => {
        setSelectedStudents([]);
    }, [memberFilters, memberStatusFilter]);

    // Load data when activeTab changes
    useEffect(() => {
        if (!authenticated) return;
        setErrorMessage('');
        setSuccessMessage('');

        if (activeTab === 'dashboard') {
            loadAnalytics();
            loadBookingsLog();
            loadAllStudents();
            loadInventory();
            loadSessions();
            loadCoaches();
            loadBatches();
            loadAuditLogs();
        } else if (activeTab === 'turf-management') {
            loadBookingsLog();
            loadCheckins();
            loadSettingsAndClosures();
        } else if (activeTab === 'membership-management' || activeTab === 'academy-management' || activeTab === 'admission-studio') {
            loadAllStudents();
            loadSessions();
            loadCoaches();
            loadBatches();
            loadEnquiries();
        } else if (activeTab === 'batch-management') {
            loadBatches();
            loadSessions();
            loadCoaches();
            loadAllStudents();
        } else if (activeTab === 'coach-management') {
            loadCoaches();
        } else if (activeTab === 'attendance-management') {
            loadAllStudents();
            loadBatches();
            loadStudentsForAttendance();
        } else if (activeTab === 'membership-billing' || activeTab === 'finance') {
            loadAllStudents();
            loadCoaches();
            loadSessions();
        } else if (activeTab === 'inventory-management') {
            loadInventory();
        } else if (activeTab === 'hr') {
            fetchStaffList();
            loadCoaches();
        } else if (activeTab === 'settings') {
            loadSettingsAndClosures();
            loadWhatsappStatus();
        } else if (activeTab === 'audit-logs') {
            loadAuditLogs();
            loadAnalytics();
            loadBookingsLog();
            loadInventory();
        }
    }, [activeTab, bookingsFilter, bookingsDateRange, bookingsCustomStartDate, bookingsCustomEndDate, attendanceSport, attendanceDate]);

    // Automatic live polling for WhatsApp status to keep top bar pill synchronized instantly
    useEffect(() => {
        loadWhatsappStatus();
        const interval = setInterval(loadWhatsappStatus, 5000);
        return () => clearInterval(interval);
    }, []);

    // Global keyboard listener for Launcher overlay toggles
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setShowLauncher(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // --- API DISPATCHERS ---

    // 1. Analytics & Reports
    const loadAnalytics = async () => {
        setLoading(true);
        try {
            const res1 = await fetch(`${BACKEND_URL}/api/reports/dashboard`, { headers: getHeaders() });
            const data1 = await res1.json();
            if (res1.ok) setStats(data1);

            const res2 = await fetch(`${BACKEND_URL}/api/reports/revenue-analytics`, { headers: getHeaders() });
            const data2 = await res2.json();
            if (res2.ok) setRevenueAnalytics(data2);

            const res3 = await fetch(`${BACKEND_URL}/api/reports/fees`, { headers: getHeaders() });
            const data3 = await res3.json();
            if (res3.ok) setPendingFeesAmount(data3.totals?.due || 0);
        } catch (e) {
            setErrorMessage('Error loading reports.');
        } finally {
            setLoading(false);
        }
    };

    const loadEnquiries = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${BACKEND_URL}/api/admin/enquiries`, { headers: getHeaders() });
            const data = await res.json();
            if (res.ok) {
                setEnquiriesList(data);
            } else {
                setErrorMessage(data.error || 'Failed to load enquiries.');
            }
        } catch (e) {
            setErrorMessage('Error loading enquiries.');
        } finally {
            setLoading(false);
        }
    };

    const handleConvertEnquiry = async (enquiryId) => {
        if (!confirm('Convert this enquiry to an enrolled student?')) return;
        setLoading(true);
        try {
            const res = await fetch(`${BACKEND_URL}/api/academy/enquiries/${enquiryId}/convert`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ batchTime: '06:00-08:00 AM' })
            });
            const data = await res.json();
            if (res.ok) {
                setSuccessMessage(`Student ${data.student.name} admitted (${data.student.membershipId}).`);
                loadEnquiries();
                loadAllStudents();
            } else {
                setErrorMessage(data.error || 'Failed to convert enquiry.');
            }
        } catch (e) {
            setErrorMessage('Error converting enquiry.');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveEnquiry = async (e) => {
        if (e) e.preventDefault();
        setLoading(true);
        setErrorMessage('');
        setSuccessMessage('');
        try {
            const res = await fetch(`${BACKEND_URL}/api/admin/enquiries`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(newEnquiry)
            });
            const data = await res.json();
            if (res.ok) {
                setSuccessMessage('Enquiry logged successfully!');
                setShowEnquiryModal(false);
                setNewEnquiry({
                    studentName: '',
                    dateOfBirth: '',
                    age: '',
                    gender: '',
                    schoolName: '',
                    classGrade: '',
                    fatherName: '',
                    mobileNumber: '',
                    interestedIn: '',
                    previousExperience: '',
                    experienceDetails: '',
                    expectedJoiningMonth: '',
                    heardAbout: '',
                    heardAboutOther: '',
                    questions: ''
                });
                loadEnquiries();
                loadAnalytics();
            } else {
                setErrorMessage(data.error || 'Failed to save enquiry.');
            }
        } catch (err) {
            setErrorMessage('Network error saving enquiry.');
        } finally {
            setLoading(false);
        }
    };

    const loadAllActiveStudents = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${BACKEND_URL}/api/academy/students?status=ACTIVE`, { headers: getHeaders() });
            const data = await res.json();
            if (res.ok) {
                setStudentsList(data);
            }
        } catch (e) {
            setErrorMessage('Could not load student list.');
        } finally {
            setLoading(false);
        }
    };

    const loadAllStudents = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${BACKEND_URL}/api/academy/students`, { headers: getHeaders() });
            const data = await res.json();
            if (res.ok) {
                setAllStudents(data);
            }
        } catch (e) {
            setErrorMessage('Could not load student list.');
        } finally {
            setLoading(false);
        }
    };

    const loadSessions = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${BACKEND_URL}/api/academy/sessions`, { headers: getHeaders() });
            const data = await res.json();
            if (res.ok) {
                setSessionsList(data);
            }
        } catch (e) {
            setErrorMessage('Could not load sessions.');
        } finally {
            setLoading(false);
        }
    };

    const loadCoaches = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${BACKEND_URL}/api/academy/coaches`, { headers: getHeaders() });
            const data = await res.json();
            if (res.ok) {
                setCoachesList(data);
            }
        } catch (e) {
            setErrorMessage('Could not load coaches.');
        } finally {
            setLoading(false);
        }
    };

    const fetchStaffList = async () => {
        try {
            const res = await fetch(`${BACKEND_URL}/api/auth/staff`, { headers: getHeaders() });
            const data = await res.json();
            if (res.ok) {
                setStaffList(data.map(s => ({
                    id: s._id,
                    username: s.username,
                    role: s.role,
                    permissions: ROLE_PERMISSIONS[s.role] || 'Standard staff access'
                })));
            }
        } catch (e) {
            console.error('Could not load staff directory:', e);
        }
    };

    const loadBatches = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${BACKEND_URL}/api/academy/batches`, { headers: getHeaders() });
            const data = await res.json();
            if (res.ok) {
                setBatchesList(data);
            }
        } catch (e) {
            setErrorMessage('Could not load batches.');
        } finally {
            setLoading(false);
        }
    };

    const loadAuditLogs = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${BACKEND_URL}/api/admin/audit-logs`, { headers: getHeaders() });
            const data = await res.json();
            if (res.ok) {
                setAuditLogsList(data);
            }
        } catch (e) {
            setErrorMessage('Could not load audit logs.');
        } finally {
            setLoading(false);
        }
    };

    const handleAddStudent = async (studentData) => {
        setErrorMessage('');
        setSuccessMessage('');
        setLoading(true);
        try {
            const res = await fetch(`${BACKEND_URL}/api/academy/students`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(studentData)
            });
            const data = await res.json();
            if (res.ok) {
                setSuccessMessage(`Intake successful for ${studentData.name} (ID: ${data.student?.membershipId || ''}).`);
                loadAllStudents();
                return true;
            } else {
                setErrorMessage(data.error || 'Failed to admit student.');
                return false;
            }
        } catch (err) {
            setErrorMessage('Network error registering student.');
            return false;
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStudentWrapper = async (updatedStudent) => {
        setErrorMessage('');
        setSuccessMessage('');
        setLoading(true);
        try {
            const res = await fetch(`${BACKEND_URL}/api/academy/students/${updatedStudent._id}`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify(updatedStudent)
            });
            const data = await res.json();
            if (res.ok) {
                setSuccessMessage('Student profile updated successfully!');
                loadAllStudents();
                return true;
            } else {
                setErrorMessage(data.error || 'Failed to update student profile.');
                return false;
            }
        } catch (err) {
            setErrorMessage('Network error updating student.');
            return false;
        } finally {
            setLoading(false);
        }
    };

    const handleCollectPaymentRedirect = (student) => {
        setInitialStudentId(student._id || student.membershipId);
        setActiveTab('finance');
        setActiveSidebarKey('finance');
    };

    const handleRegisterStaffWrapper = async (usernameOrObj, password, role, name, phone) => {
        setErrorMessage('');
        setSuccessMessage('');
        
        let payload = {};
        if (typeof usernameOrObj === 'object' && usernameOrObj !== null) {
            payload = usernameOrObj;
        } else {
            payload = { username: usernameOrObj, password, role, name, phone };
        }

        try {
            const currentHeaders = getHeaders();
            if (!currentHeaders.Authorization) {
                const storedToken = token || (typeof window !== 'undefined' ? (localStorage.getItem('token') || localStorage.getItem('adminToken') || '') : '');
                if (storedToken) {
                    currentHeaders.Authorization = `Bearer ${storedToken}`;
                }
            }

            const res = await fetch(`${BACKEND_URL}/api/auth/register`, {
                method: 'POST',
                headers: currentHeaders,
                credentials: 'include',
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (res.ok) {
                setSuccessMessage(`User credentials added for ${payload.username}.`);
                await fetchStaffList();
                return true;
            } else {
                setErrorMessage(data.error || 'Failed to register user.');
                return false;
            }
        } catch (e) {
            setErrorMessage(e.message || 'Failed to register user.');
            return false;
        }
    };

    const handleUpdateStudent = async (e) => {
        if (e) e.preventDefault();
        setErrorMessage('');
        setSuccessMessage('');
        setLoading(true);

        try {
            const res = await fetch(`${BACKEND_URL}/api/academy/students/${editingStudent._id}`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify(editingStudent)
            });
            const data = await res.json();
            if (res.ok) {
                setSuccessMessage('Student profile updated successfully!');
                setShowEditModal(false);
                setEditingStudent(null);
                loadAllStudents(); // Refresh the list
            } else {
                setErrorMessage(data.error || 'Failed to update student profile.');
            }
        } catch (err) {
            setErrorMessage('Network error updating student profile.');
        } finally {
            setLoading(false);
        }
    };

    const getFilteredStudents = () => {
        return allStudents.filter(student => {
            // Filter by status first (Active vs Inactive status button)
            const studentStatus = student.status || 'ACTIVE';
            if (studentStatus !== memberStatusFilter) {
                return false;
            }

            // Filter by Membership ID (username filter field)
            if (memberFilters.username && !student.membershipId?.toLowerCase().includes(memberFilters.username.toLowerCase())) {
                return false;
            }

            // Filter by Sports (classSport filter field)
            if (memberFilters.classSport && student.sport !== memberFilters.classSport) {
                return false;
            }

            // Filter by Batch (sectionBatch filter field)
            if (memberFilters.sectionBatch && !student.batchTime?.toLowerCase().includes(memberFilters.sectionBatch.toLowerCase())) {
                return false;
            }

            // Filter by Gender
            if (memberFilters.gender && student.gender !== memberFilters.gender) {
                return false;
            }

            // Filter by Global Search (search filter field)
            if (memberFilters.search) {
                const query = memberFilters.search.toLowerCase();
                const matchName = student.name?.toLowerCase().includes(query);
                const matchId = student.membershipId?.toLowerCase().includes(query);
                const matchSchool = student.schoolName?.toLowerCase().includes(query);
                const matchFather = student.fatherName?.toLowerCase().includes(query);
                const matchPhone = student.phone?.toLowerCase().includes(query) || 
                                   student.fatherMobile?.toLowerCase().includes(query) || 
                                   student.motherMobile?.toLowerCase().includes(query);
                const matchEmail = student.email?.toLowerCase().includes(query);
                const matchAddress = student.residentialAddress?.toLowerCase().includes(query);
                const matchSport = student.sport?.toLowerCase().includes(query);
                const matchBatch = student.batchTime?.toLowerCase().includes(query);

                if (!matchName && !matchId && !matchSchool && !matchFather && !matchPhone && !matchEmail && !matchAddress && !matchSport && !matchBatch) {
                    return false;
                }
            }

            return true;
        });
    };

    const exportToCSV = () => {
        const filtered = getFilteredStudents();
        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "S.No,Membership ID,Name,Sport (Class),Batch (Section),Age (Roll No),Father Name,Contact No,Admission No,Status\n";
        
        filtered.forEach((s, idx) => {
            const row = [
                idx + 1,
                s.membershipId || '',
                s.name || '',
                s.sport || '',
                s.batchTime || '',
                s.age || '',
                s.fatherName || '',
                s.phone || '',
                s.membershipId || '',
                s.status || ''
            ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(",");
            csvContent += row + "\n";
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `khelo_patna_members_${memberStatusFilter.toLowerCase()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };


    const handleCommunicateSubmit = async (type, e) => {
        if (e) e.preventDefault();
        setErrorMessage('');
        setSuccessMessage('');
        setLoading(true);

        try {
            let url = '';
            let body = {};

            if (type === 'football_group_msg') {
                url = `${BACKEND_URL}/api/admin/communicate/send-group-whatsapp`;
                body = { groupType: 'football', message: commGroupMsg.message };
            } else if (type === 'cricket_group_msg') {
                url = `${BACKEND_URL}/api/admin/communicate/send-group-whatsapp`;
                body = { groupType: 'cricket', message: commGroupMsg.message };
            } else if (type === 'single_msg') {
                url = `${BACKEND_URL}/api/admin/communicate/send-whatsapp`;
                const stud = studentsList.find(s => s._id === commStudentMsg.studentId);
                const phone = stud ? (stud.fatherMobile || stud.motherMobile || stud.phone) : '';
                if (!phone) {
                    setErrorMessage('Selected student does not have a valid parent phone number.');
                    setLoading(false);
                    return;
                }
                body = { phone, message: commStudentMsg.message };
            } else if (type === 'staff_msg') {
                url = `${BACKEND_URL}/api/admin/communicate/send-whatsapp`;
                body = { phone: commStaffMsg.phone, message: commStaffMsg.message };
            } else if (type === 'sms') {
                url = `${BACKEND_URL}/api/admin/communicate/send-whatsapp`;
                body = commSMS;
            } else if (type === 'email') {
                setTimeout(() => {
                    setSuccessMessage(`Email successfully sent to ${commEmail.email} (Simulated Log)`);
                    setLoading(false);
                }, 800);
                return;
            } else if (type === 'notice') {
                setTimeout(() => {
                    setSuccessMessage(`General notice "${commNotice.title}" published successfully!`);
                    setLoading(false);
                }, 800);
                return;
            }

            const res = await fetch(url, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(body)
            });
            const data = await res.json();
            if (res.ok) {
                if (type === 'football_group_msg' || type === 'cricket_group_msg') {
                    setSuccessMessage(`Bulk WhatsApp message successfully sent to ${data.sent} of ${data.total} recipients.`);
                } else {
                    setSuccessMessage('WhatsApp message successfully sent!');
                }
                setCommGroupMsg(prev => ({ ...prev, message: '' }));
                setCommStudentMsg(prev => ({ ...prev, message: '' }));
                setCommStaffMsg(prev => ({ ...prev, message: '' }));
                setCommSMS(prev => ({ ...prev, message: '' }));
            } else {
                setErrorMessage(data.error || 'Failed to send message.');
            }
        } catch (err) {
            setErrorMessage('Network error sending message.');
        } finally {
            setLoading(false);
        }
    };

    // 2. Settings & Closures
    const loadSettingsAndClosures = async () => {
        setLoading(true);
        try {
            const res1 = await fetch(`${BACKEND_URL}/api/admin/turf-settings`, { headers: getHeaders() });
            const data1 = await res1.json();
            if (res1.ok) setTurfSettings(data1);

            const res2 = await fetch(`${BACKEND_URL}/api/admin/closures`, { headers: getHeaders() });
            const data2 = await res2.json();
            if (res2.ok) setClosuresList(data2);
        } catch (e) {
            setErrorMessage('Error loading turf rules.');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveSettings = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`${BACKEND_URL}/api/admin/turf-settings`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify({
                    cricketBaseRate: turfSettings.cricketBaseRate,
                    footballBaseRate: turfSettings.footballBaseRate,
                    netsBaseRate: turfSettings.netsBaseRate || 800,
                    weeklyRates: turfSettings.weeklyRates,
                    blackoutStart: turfSettings.blackoutHours.start,
                    blackoutEnd: turfSettings.blackoutHours.end,
                    advancePercentage: turfSettings.advancePercentage !== undefined ? turfSettings.advancePercentage : 100
                })
            });
            if (res.ok) {
                setSuccessMessage('Pricing and blackout hours updated successfully.');
            } else {
                throw new Error('Update failed.');
            }
        } catch (e) {
            setErrorMessage('Could not update pricing settings.');
        }
    };

    const handleCreateClosure = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`${BACKEND_URL}/api/admin/closures`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({
                    startDate: newClosure.startDate,
                    endDate: newClosure.endDate,
                    recurringDay: newClosure.recurringDay !== '' ? newClosure.recurringDay : undefined,
                    reason: newClosure.reason
                })
            });
            if (res.ok) {
                setSuccessMessage('Closure block added to calendar.');
                setNewClosure({ startDate: '', endDate: '', recurringDay: '', reason: '' });
                loadSettingsAndClosures();
            } else {
                const data = await res.json();
                throw new Error(data.error);
            }
        } catch (e) {
            setErrorMessage(e.message || 'Failed to create closure.');
        }
    };

    const handleDeleteClosure = async (closureId) => {
        if (!confirm('Are you sure you want to delete this closure?')) return;
        try {
            const res = await fetch(`${BACKEND_URL}/api/admin/closures/${closureId}`, {
                method: 'DELETE',
                headers: getHeaders()
            });
            if (res.ok) {
                setSuccessMessage('Closure deleted successfully.');
                loadSettingsAndClosures();
            }
        } catch (e) {
            setErrorMessage('Failed to delete closure.');
        }
    };

    // 3. WhatsApp gateway
    const loadWhatsappStatus = async () => {
        try {
            const res = await fetch(`${BACKEND_URL}/api/admin/whatsapp/status`, { headers: getHeaders() });
            const data = await res.json();
            if (res.ok) setWhatsappStatus(data);
        } catch (e) {
            setErrorMessage('Error connecting to WhatsApp socket api.');
        }
    };

    const toggleWhatsappBot = async (enabled) => {
        try {
            const res = await fetch(`${BACKEND_URL}/api/admin/whatsapp/toggle-bot`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ enabled })
            });
            if (res.ok) {
                setSuccessMessage(`Auto-bot conversational state toggled to ${enabled ? 'ENABLED' : 'DISABLED'}.`);
                loadWhatsappStatus();
            }
        } catch (e) {
            setErrorMessage('Failed to toggle bot status.');
        }
    };

    // 4. Inventory & POS
    const loadInventory = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${BACKEND_URL}/api/inventory`, { headers: getHeaders() });
            const data = await res.json();
            if (res.ok) {
                setInventoryItems(data);
                // Filter items for POS checkout
                setPosItems(data.filter(item => item.category === 'pos_drinks' || item.category === 'general'));
            }
        } catch (e) {
            setErrorMessage('Failed to load inventory counts.');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveInventoryItem = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`${BACKEND_URL}/api/inventory`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({
                    id: newInventoryItem.id || undefined,
                    itemName: newInventoryItem.itemName,
                    category: newInventoryItem.category,
                    totalQuantity: Number(newInventoryItem.totalQuantity),
                    availableQuantity: Number(newInventoryItem.availableQuantity),
                    condition: newInventoryItem.condition,
                    unitPrice: Number(newInventoryItem.unitPrice) || 0
                })
            });
            if (res.ok) {
                setSuccessMessage('Inventory entry saved successfully.');
                setNewInventoryItem({ id: '', itemName: '', category: 'pos_drinks', totalQuantity: 0, availableQuantity: 0, condition: 'GOOD', unitPrice: 0 });
                loadInventory();
            }
        } catch (e) {
            setErrorMessage('Failed to save inventory item.');
        }
    };

    const handlePOSCheckout = async (e) => {
        e.preventDefault();
        if (!posSale.itemId) {
            setErrorMessage('Please select an item to sell.');
            return;
        }

        const selected = posItems.find(item => item._id === posSale.itemId);
        if (!selected) return;

        // Fallback price only used by the server for legacy items without a
        // configured unitPrice; otherwise the server computes the price itself.
        const fallbackUnitPrice = selected.category === 'pos_drinks' ? 20 : 150;
        const fallbackTotal = fallbackUnitPrice * Number(posSale.quantity);

        try {
            const res = await fetch(`${BACKEND_URL}/api/pos/sell`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({
                    itemId: posSale.itemId,
                    quantity: Number(posSale.quantity),
                    totalPrice: fallbackTotal,
                    bookingId: posSale.bookingId || undefined
                })
            });
            const data = await res.json();
            if (res.ok) {
                setSuccessMessage(`Sale recorded! Total collected: ₹${data.sale?.totalPrice ?? fallbackTotal}. Remaining Stock: ${data.item_remaining}`);
                setPosSale({ itemId: '', quantity: 1, bookingId: '' });
                loadInventory();
            } else {
                throw new Error(data.error);
            }
        } catch (e) {
            setErrorMessage(e.message || 'Error processing POS sale transaction.');
        }
    };

    // 5. Staff creator
    const handleRegisterStaff = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`${BACKEND_URL}/api/auth/register`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(newStaff)
            });
            const data = await res.json();
            if (res.ok) {
                setSuccessMessage(`Staff credentials added for ${newStaff.username}.`);
                await fetchStaffList();
                setNewStaff({ username: '', password: '', role: 'RECEPTIONIST' });
            } else {
                throw new Error(data.error);
            }
        } catch (e) {
            setErrorMessage(e.message || 'Failed to register staff.');
        }
    };

    // Offline Booking Slots effect
    useEffect(() => {
        if (!showOfflineBookingModal) return;
        
        let active = true;
        const fetchOfflineSlots = async () => {
            setLoadingOfflineSlots(true);
            try {
                const res = await fetch(`${BACKEND_URL}/api/available-slots?sport=${offlineBookingForm.sport}&date=${offlineBookingForm.date}&is_admin=true`);
                if (!res.ok) throw new Error('Failed to load slots');
                const data = await res.json();
                if (active) {
                    setOfflineAvailableSlots(data.slots || []);
                }
            } catch (err) {
                console.error('Error fetching offline available slots:', err);
                if (active) {
                    setOfflineAvailableSlots([]);
                }
            } finally {
                if (active) {
                    setLoadingOfflineSlots(false);
                }
            }
        };

        fetchOfflineSlots();
        return () => {
            active = false;
        };
    }, [showOfflineBookingModal, offlineBookingForm.sport, offlineBookingForm.date]);

    const fetchCustomerLookup = async (phone) => {
        if (!phone || phone.trim().length < 10) {
            setCustomerLookupResult(null);
            return;
        }
        setLoadingCustomerLookup(true);
        try {
            const res = await fetch(`${BACKEND_URL}/api/admin/customers/lookup?phone=${encodeURIComponent(phone.trim())}`, {
                headers: getHeaders()
            });
            if (res.ok) {
                const data = await res.json();
                if (data.exists) {
                    setCustomerLookupResult(data);
                    // Autofill if empty
                    setOfflineBookingForm(prev => ({
                        ...prev,
                        customerName: prev.customerName ? prev.customerName : data.customerName,
                        customerEmail: prev.customerEmail ? prev.customerEmail : data.customerEmail
                    }));
                } else {
                    setCustomerLookupResult(null);
                }
            } else {
                setCustomerLookupResult(null);
            }
        } catch (err) {
            console.error('Customer lookup failed:', err);
            setCustomerLookupResult(null);
        } finally {
            setLoadingCustomerLookup(false);
        }
    };

    useEffect(() => {
        if (!showOfflineBookingModal) {
            setCustomerLookupResult(null);
            return;
        }

        const phone = offlineBookingForm.customerPhone;
        const digits = phone ? phone.replace(/\D/g, '') : '';
        
        if (digits.length < 10) {
            setCustomerLookupResult(null);
            return;
        }

        const delayDebounceFn = setTimeout(() => {
            fetchCustomerLookup(digits);
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [showOfflineBookingModal, offlineBookingForm.customerPhone]);


    const handleToggleOfflineSlot = (slotVal) => {
        setOfflineBookingForm(prev => {
            const isSelected = prev.timeSlots.includes(slotVal);
            const newSlots = isSelected 
                ? prev.timeSlots.filter(s => s !== slotVal)
                : [...prev.timeSlots, slotVal];

            const total = prev.sport === 'nets'
                ? (newSlots.length * 100 * (prev.participantsCount || 1))
                : newSlots.reduce((sum, val) => {
                    const slotObj = offlineAvailableSlots.find(s => s.value === val);
                    return sum + (slotObj ? (slotObj.price || 0) : 0);
                }, 0);

            const netDue = Math.max(0, total - (Number(prev.discount) || 0));
            const defaultPaid = Math.round(netDue * 0.5);

            return {
                ...prev,
                timeSlots: newSlots,
                paidAmount: defaultPaid
            };
        });
    };

    const handleChangeOfflineDiscount = (val) => {
        const numDisc = Number(val) || 0;
        setOfflineBookingForm(prev => {
            const total = prev.sport === 'nets'
                ? (prev.timeSlots.length * 100 * (prev.participantsCount || 1))
                : prev.timeSlots.reduce((sum, val) => {
                    const slotObj = offlineAvailableSlots.find(s => s.value === val);
                    return sum + (slotObj ? (slotObj.price || 0) : 0);
                }, 0);

            const netDue = Math.max(0, total - numDisc);
            const defaultPaid = Math.round(netDue * 0.5);

            return {
                ...prev,
                discount: val,
                paidAmount: defaultPaid
            };
        });
    };

    const handleRescheduleBooking = async (bookingId) => {
        if (!rescheduleDate || !rescheduleSlots.length) {
            alert('Please select date and at least one slot.');
            return;
        }

        try {
            const res = await fetch(`${BACKEND_URL}/api/admin/bookings/${bookingId}/reschedule`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify({
                    date: rescheduleDate,
                    timeSlots: rescheduleSlots
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to reschedule booking');

            alert('Booking rescheduled successfully!');
            setSelectedBookingState(null);
            loadBookingsLog();
        } catch (err) {
            console.error('Error rescheduling:', err);
            alert(err.message || 'Error rescheduling booking.');
        }
    };

    const handleCancelRefundBooking = async (bookingId) => {
        if (!window.confirm('Are you sure you want to cancel this booking and initiate a refund? This action is irreversible.')) {
            return;
        }

        try {
            const res = await fetch(`${BACKEND_URL}/api/admin/bookings/${bookingId}/cancel-refund`, {
                method: 'POST',
                headers: getHeaders()
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to cancel booking');

            alert(data.message || 'Booking cancelled and refund initiated successfully!');
            setSelectedBookingState(null);
            loadBookingsLog();
        } catch (err) {
            console.error('Error cancelling booking:', err);
            alert(err.message || 'Error cancelling booking.');
        }
    };

    const handleCancelOnlyBooking = async (bookingId) => {
        if (!window.confirm('Are you sure you want to cancel this booking WITHOUT a refund? This action is irreversible.')) {
            return;
        }

        try {
            const res = await fetch(`${BACKEND_URL}/api/admin/bookings/${bookingId}/cancel-refund`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({
                    initiateRefund: false
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to cancel booking');

            alert('Booking cancelled successfully (no refund).');
            setSelectedBookingState(null);
            loadBookingsLog();
        } catch (err) {
            console.error('Error cancelling booking:', err);
            alert(err.message || 'Error cancelling booking.');
        }
    };

    const handleCreateOfflineBooking = async (e) => {
        e.preventDefault();
        
        if (!offlineBookingForm.customerName || !offlineBookingForm.customerPhone) {
            setErrorMessage('Customer name and phone number are required.');
            return;
        }

        if (!offlineBookingForm.timeSlots.length) {
            setErrorMessage('Please select at least one time slot.');
            return;
        }

        const totalAmount = offlineBookingForm.sport === 'nets'
            ? (offlineBookingForm.timeSlots.length * 100 * (offlineBookingForm.participantsCount || 1))
            : offlineBookingForm.timeSlots.reduce((sum, val) => {
                const slotObj = offlineAvailableSlots.find(s => s.value === val);
                return sum + (slotObj ? (slotObj.price || 0) : 0);
            }, 0);

        const netDue = Math.max(0, totalAmount - (Number(offlineBookingForm.discount) || 0));

        setBookingSubmitting(true);
        setErrorMessage('');
        setSuccessMessage('');

        try {
            const res = await fetch(`${BACKEND_URL}/api/admin/bookings`, {
                method: 'POST',
                headers: {
                    ...getHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    customerName: offlineBookingForm.customerName,
                    customerEmail: offlineBookingForm.customerEmail,
                    customerPhone: offlineBookingForm.customerPhone,
                    sport: offlineBookingForm.sport,
                    date: offlineBookingForm.date,
                    timeSlots: offlineBookingForm.timeSlots,
                    totalAmount: netDue,
                    paidAmount: Number(offlineBookingForm.paidAmount),
                    discount: Number(offlineBookingForm.discount || 0),
                    paymentMethod: offlineBookingForm.paymentMethod,
                    paymentType: offlineBookingForm.paymentType,
                    participantsCount: offlineBookingForm.sport === 'nets' ? (offlineBookingForm.participantsCount || 1) : 1
                })
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Failed to submit booking');
            }

            setSuccessMessage(
                offlineBookingForm.paymentType === 'link'
                    ? 'Online payment link shared on customer WhatsApp successfully!'
                    : 'Offline booking registered successfully!'
            );
            
            setShowOfflineBookingModal(false);
            setCustomerLookupResult(null);
            // Reset form
            setOfflineBookingForm({
                customerName: '',
                customerEmail: '',
                customerPhone: '',
                sport: 'cricket',
                date: new Date().toISOString().split('T')[0],
                timeSlots: [],
                discount: 0,
                paidAmount: 0,
                paymentMethod: 'cash',
                paymentType: 'offline',
                participantsCount: 1
            });

            // Reload bookings
            loadBookingsLog();

        } catch (err) {
            console.error('Error submitting offline booking:', err);
            setErrorMessage(err.message || 'Failed to submit offline booking.');
        } finally {
            setBookingSubmitting(false);
        }
    };

    // 6. Bookings Log
    const loadBookingsLog = async () => {
        setLoading(true);
        try {
            const params = { ...bookingsFilter };
            
            if (bookingsDateRange === '30days') {
                const start = new Date();
                start.setDate(start.getDate() - 30);
                params.startDate = start.toISOString().split('T')[0];
                params.endDate = new Date().toISOString().split('T')[0];
            } else if (bookingsDateRange === '90days') {
                const start = new Date();
                start.setDate(start.getDate() - 90);
                params.startDate = start.toISOString().split('T')[0];
                params.endDate = new Date().toISOString().split('T')[0];
            } else if (bookingsDateRange === 'custom') {
                if (bookingsCustomStartDate) params.startDate = bookingsCustomStartDate;
                if (bookingsCustomEndDate) params.endDate = bookingsCustomEndDate;
            }

            const query = new URLSearchParams(params).toString();
            const res = await fetch(`${BACKEND_URL}/api/reports/bookings?${query}`, { headers: getHeaders() });
            const data = await res.json();
            if (res.ok) setBookingsLog(data);
        } catch (e) {
            setErrorMessage('Failed to fetch bookings list.');
        } finally {
            setLoading(false);
        }
    };

    // 7. Check-In & Check-Out
    const loadCheckins = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${BACKEND_URL}/api/checkin/active`, { headers: getHeaders() });
            const data = await res.json();
            if (res.ok) setActiveCheckins(data);
        } catch (e) {
            setErrorMessage('Error listing players inside arena.');
        } finally {
            setLoading(false);
        }
    };

    const handlePlayerCheckinSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`${BACKEND_URL}/api/checkin`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({
                    playerName: newCheckin.playerName,
                    type: newCheckin.type,
                    bookingId: newCheckin.bookingId || undefined,
                    studentId: newCheckin.studentId || undefined
                })
            });
            const data = await res.json();
            if (res.ok) {
                setSuccessMessage(data.message);
                setNewCheckin({ playerName: '', type: 'TURF_BOOKING', bookingId: '', studentId: '' });
                loadCheckins();
            } else {
                throw new Error(data.error);
            }
        } catch (e) {
            setErrorMessage(e.message || 'Error processing player checkin.');
        }
    };

    const handlePlayerCheckout = async (logId) => {
        try {
            const res = await fetch(`${BACKEND_URL}/api/checkout`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ logId })
            });
            const data = await res.json();
            if (res.ok) {
                setSuccessMessage(data.message);
                loadCheckins();
            } else {
                throw new Error(data.error);
            }
        } catch (e) {
            setErrorMessage(e.message || 'Error during checkout.');
        }
    };

    // Helper to calculate age from DOB in real-time
    const calculateAge = (dobString) => {
        if (!dobString) return '';
        const dob = new Date(dobString);
        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const m = today.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
            age--;
        }
        return age >= 0 ? age : 0;
    };

    // 8. Academy Student Intake Form
    const handleStudentAdmission = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`${BACKEND_URL}/api/academy/students`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({
                    name: newStudent.name,
                    dateOfBirth: newStudent.dateOfBirth,
                    age: Number(newStudent.age) || undefined,
                    gender: newStudent.gender,
                    schoolName: newStudent.schoolName,
                    classGrade: newStudent.classGrade,
                    residentialAddress: newStudent.residentialAddress,
                    city: newStudent.city,
                    pinCode: newStudent.pinCode,
                    fatherName: newStudent.fatherName,
                    motherName: newStudent.motherName,
                    fatherMobile: newStudent.fatherMobile,
                    motherMobile: newStudent.motherMobile,
                    email: newStudent.email,
                    sport: newStudent.sport,
                    previousExperience: newStudent.previousExperience,
                    experienceDetails: newStudent.experienceDetails,
                    medicalConditions: newStudent.medicalConditions,
                    admissionDate: newStudent.admissionDate,
                    batchTime: newStudent.batchTime,
                    oneTimeAdmissionFee: Number(newStudent.oneTimeAdmissionFee),
                    monthlyFee: Number(newStudent.monthlyFee)
                })
            });
            const data = await res.json();
            if (res.ok) {
                setSuccessMessage(`Intake successful for ${newStudent.name} (ID: ${data.student?.membershipId}). First dues invoice issued: ₹${data.initial_invoice?.amountDue}.`);
                setNewStudent({
                    name: '',
                    dateOfBirth: '',
                    age: '',
                    gender: 'Male',
                    schoolName: '',
                    classGrade: '',
                    residentialAddress: '',
                    city: '',
                    pinCode: '',
                    fatherName: '',
                    motherName: '',
                    fatherMobile: '',
                    motherMobile: '',
                    email: '',
                    sport: 'cricket',
                    previousExperience: 'No',
                    experienceDetails: '',
                    medicalConditions: '',
                    admissionDate: new Date().toISOString().split('T')[0],
                    batchTime: '06:00-08:00 AM',
                    oneTimeAdmissionFee: 1500,
                    monthlyFee: 2000
                });
            } else {
                throw new Error(data.error);
            }
        } catch (e) {
            setErrorMessage(e.message || 'Admission failed.');
        }
    };

    // 9. Attendance marking
    const loadStudentsForAttendance = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${BACKEND_URL}/api/academy/students?sport=${attendanceSport}&status=ACTIVE`, { headers: getHeaders() });
            const data = await res.json();
            if (res.ok) {
                setStudentsList(data);
                // Load existing marked logs for this date
                const resLogs = await fetch(`${BACKEND_URL}/api/academy/attendance?date=${attendanceDate}`, { headers: getHeaders() });
                const logsData = await resLogs.json();
                
                const grid = {};
                // Default all to ABSENT, overwrite if logged PRESENT
                data.forEach(student => {
                    grid[student._id] = 'ABSENT';
                });
                if (resLogs.ok && Array.isArray(logsData)) {
                    logsData.forEach(log => {
                        const sId = log.studentId?._id || log.studentId;
                        grid[sId] = log.status;
                    });
                }
                setAttendanceGrid(grid);
            }
        } catch (e) {
            setErrorMessage('Could not load student roster.');
        } finally {
            setLoading(false);
        }
    };

    const toggleStudentAttendance = (studentId) => {
        const current = attendanceGrid[studentId] || 'ABSENT';
        setAttendanceGrid({
            ...attendanceGrid,
            [studentId]: current === 'PRESENT' ? 'ABSENT' : 'PRESENT'
        });
    };

    const handleSaveAttendance = async (e) => {
        e.preventDefault();
        const list = Object.keys(attendanceGrid).map(studentId => ({
            studentId,
            status: attendanceGrid[studentId]
        }));

        try {
            const res = await fetch(`${BACKEND_URL}/api/academy/attendance`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({
                    date: attendanceDate,
                    attendanceList: list
                })
            });
            if (res.ok) {
                setSuccessMessage('Attendance checklist saved! Parents notified via WhatsApp.');
            } else {
                throw new Error('Save failed.');
            }
        } catch (e) {
            setErrorMessage('Failed to save attendance.');
        }
    };

    // 10. Student Fee Collector Search & collection
    const handleFeeSearch = async (e) => {
        if (e) e.preventDefault();
        if (!feeSearchQuery.trim()) return;

        setLoading(true);
        setErrorMessage('');
        setFeeStudentData(null);
        setFeeDues([]);

        try {
            const res = await fetch(`${BACKEND_URL}/api/academy/dues?search=${encodeURIComponent(feeSearchQuery)}`);
            if (res.status === 404) {
                throw new Error('No student matches this Student ID or phone.');
            }
            if (!res.ok) throw new Error('Dues check failed.');

            const data = await res.json();
            setFeeStudentData(data.student);
            setFeeDues(data.dues || []);
            // prefill amount paid based on default dues month
            if (data.dues && data.dues.length > 0) {
                setFeeCollection({
                    amountPaid: String(data.dues[0].amountDue - data.dues[0].amountPaid),
                    monthFor: data.dues[0].monthFor,
                    adjustmentReason: ''
                });
            }
        } catch (e) {
            setErrorMessage(e.message || 'Error checking student dues.');
        } finally {
            setLoading(false);
        }
    };

    const handleRecordPaymentSubmit = async (e) => {
        e.preventDefault();
        if (!feeStudentData) return;

        try {
            const res = await fetch(`${BACKEND_URL}/api/academy/students/${feeStudentData._id}/fees`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({
                    amountPaid: Number(feeCollection.amountPaid),
                    monthFor: feeCollection.monthFor,
                    adjustmentReason: feeCollection.adjustmentReason
                })
            });
            const data = await res.json();
            if (res.ok) {
                setSuccessMessage('Tuition fee payment registered! WA receipt invoice generated.');
                // Refresh dues
                handleFeeSearch();
            } else {
                throw new Error(data.error);
            }
        } catch (e) {
            setErrorMessage(e.message || 'Failed to submit payment.');
        }
    };

    // --- FINANCE HANDLER FUNCTIONS ---
    const handleSaveFeeTerm = (e) => {
        e.preventDefault();
        const term = {
            id: 't_' + Date.now(),
            name: newFeeTerm.name,
            startDate: newFeeTerm.startDate,
            endDate: newFeeTerm.endDate,
            status: newFeeTerm.status
        };
        // If this term is active, deactivate others
        if (term.status === 'ACTIVE') {
            setFeeTerms(prev => prev.map(t => ({ ...t, status: 'INACTIVE' })).concat(term));
        } else {
            setFeeTerms(prev => [...prev, term]);
        }
        setNewFeeTerm({ name: '', startDate: '', endDate: '', status: 'ACTIVE' });
        setSuccessMessage('Fee Term added successfully!');
    };

    const toggleFeeTermStatus = (id) => {
        setFeeTerms(prev => prev.map(t => {
            if (t.id === id) {
                return { ...t, status: t.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' };
            }
            // Deactivate all others if setting this one to active
            if (t.status === 'ACTIVE') {
                return { ...t, status: 'INACTIVE' };
            }
            return t;
        }));
        setSuccessMessage('Fee Term status updated.');
    };

    const handleSaveFeeType = (e) => {
        e.preventDefault();
        const ftype = {
            id: 'ft_' + Date.now(),
            name: newFeeType.name,
            amount: parseFloat(newFeeType.amount) || 0,
            frequency: newFeeType.frequency,
            description: newFeeType.description
        };
        setFeeTypes(prev => [...prev, ftype]);
        setNewFeeType({ name: '', amount: '', frequency: 'MONTHLY', description: '' });
        setSuccessMessage('Fee Type created successfully!');
    };

    const handleSaveFeeRebate = (e) => {
        e.preventDefault();
        const rebate = {
            id: 'r_' + Date.now(),
            name: newFeeRebate.name,
            type: newFeeRebate.type,
            value: parseFloat(newFeeRebate.value) || 0,
            description: newFeeRebate.description
        };
        setFeeRebates(prev => [...prev, rebate]);
        setNewFeeRebate({ name: '', type: 'PERCENTAGE', value: '', description: '' });
        setSuccessMessage('Rebate Rule saved successfully!');
    };

    const handleSaveFeeGroup = (e) => {
        e.preventDefault();
        const fgroup = {
            id: 'fg_' + Date.now(),
            name: newFeeGroup.name,
            feeTypeIds: newFeeGroup.feeTypeIds,
            description: newFeeGroup.description
        };
        setFeeGroups(prev => [...prev, fgroup]);
        setNewFeeGroup({ name: '', feeTypeIds: [], description: '' });
        setSuccessMessage('Fee Group created successfully!');
    };

    const handleAssignGroupSubmit = (e) => {
        e.preventDefault();
        if (!batchAssignGroupId) {
            setErrorMessage('Please select a Fee Group.');
            return;
        }
        if (selectedStudents.length === 0) {
            setErrorMessage('Please select at least one student.');
            return;
        }
        const updated = { ...studentFeeGroups };
        selectedStudents.forEach(sid => {
            updated[sid] = batchAssignGroupId;
        });
        setStudentFeeGroups(updated);
        setSelectedStudents([]);
        setSuccessMessage(`Assigned Fee Group to ${selectedStudents.length} students!`);
    };

    const handleSaveBackDue = (e) => {
        e.preventDefault();
        if (!newBackDue.studentId) {
            setErrorMessage('Please select a student.');
            return;
        }
        const amount = parseFloat(newBackDue.amount) || 0;
        setStudentBackDues(prev => ({
            ...prev,
            [newBackDue.studentId]: amount
        }));
        setNewBackDue({ studentId: '', amount: '', description: '' });
        setSuccessMessage('Student Back Dues updated.');
    };

    const calculateStudentDuesDetail = (studentId) => {
        const student = allStudents.find(s => s._id === studentId);
        if (!student) return null;

        const groupId = studentFeeGroups[studentId];
        const group = feeGroups.find(g => g.id === groupId);
        
        let subtotal = 0;
        let breakdown = [];

        // Back Dues
        const backDue = studentBackDues[studentId] || 0;
        if (backDue > 0) {
            subtotal += backDue;
            breakdown.push({ name: 'Carried Forward Back Dues', amount: backDue });
        }

        // Fee Types in Group
        if (group) {
            group.feeTypeIds.forEach(ftid => {
                const ft = feeTypes.find(type => type.id === ftid);
                if (ft) {
                    subtotal += ft.amount;
                    breakdown.push({ name: ft.name, amount: ft.amount });
                }
            });
        } else {
            // Fallback to student monthlyFee
            const fallbackFee = student.monthlyFee || 2000;
            subtotal += fallbackFee;
            breakdown.push({ name: 'Tuition Fee (Standard)', amount: fallbackFee });
        }

        // Apply Rebate Rules
        let discount = 0;
        let appliedRebates = [];
        feeRebates.forEach(reb => {
            // Simple auto-apply sibling rule check for demonstration
            if (reb.name.toLowerCase().includes('sibling') && student.fatherMobile) {
                // If another student has same mobile number, apply sibling
                const count = allStudents.filter(s => s.fatherMobile === student.fatherMobile).length;
                if (count > 1) {
                    const value = reb.type === 'PERCENTAGE' ? (subtotal * reb.value) / 100 : reb.value;
                    discount += value;
                    appliedRebates.push({ name: reb.name, amount: -value });
                }
            } else if (reb.name.toLowerCase().includes('scholarship') && student.adjustedFee) {
                // Apply merit
                const value = reb.type === 'PERCENTAGE' ? (subtotal * reb.value) / 100 : reb.value;
                discount += value;
                appliedRebates.push({ name: reb.name, amount: -value });
            }
        });

        // Add Approved Adjustments/Waivers
        const approvedWaivers = adjustmentRequests
            .filter(req => req.studentId === studentId && req.status === 'APPROVED')
            .reduce((sum, req) => sum + req.amount, 0);

        if (approvedWaivers > 0) {
            discount += approvedWaivers;
            appliedRebates.push({ name: 'Approved Adjustments', amount: -approvedWaivers });
        }

        // Payments Made
        const paidAmount = feePayments
            .filter(pay => pay.studentId === studentId)
            .reduce((sum, pay) => sum + pay.amountPaid, 0);

        const totalDues = Math.max(0, subtotal - discount);
        const outstanding = Math.max(0, totalDues - paidAmount);

        return {
            student,
            feeGroup: group,
            subtotal,
            discount,
            totalDues,
            paidAmount,
            outstanding,
            breakdown,
            appliedRebates
        };
    };

    const handleRecordCounterPayment = (e) => {
        e.preventDefault();
        if (!selectedStudentForPayment) return;

        const amount = parseFloat(paymentCollectionInput.amountPaid) || 0;
        const activeTerm = feeTerms.find(t => t.status === 'ACTIVE')?.name || 'Current Term';

        const payment = {
            id: 'rcpt_' + Date.now(),
            studentId: selectedStudentForPayment._id,
            studentName: selectedStudentForPayment.name,
            amountPaid: amount,
            method: paymentCollectionInput.method,
            termName: activeTerm,
            paymentDate: new Date().toISOString()
        };

        setFeePayments(prev => [...prev, payment]);
        
        // Show receipt print preview modal
        setActiveReceipt({
            receiptNo: payment.id,
            student: selectedStudentForPayment,
            amountPaid: amount,
            method: paymentCollectionInput.method,
            termName: activeTerm,
            date: payment.paymentDate,
            breakdown: calculateStudentDuesDetail(selectedStudentForPayment._id)
        });

        // Clear input
        setPaymentCollectionInput({ amountPaid: '', method: 'CASH', termId: '' });
        setSuccessMessage('Payment logged successfully! Print Receipt generated.');
    };

    const handleSaveAdjustmentSubmit = (e) => {
        e.preventDefault();
        if (!newAdjustmentRequest.studentId) {
            setErrorMessage('Please select a student.');
            return;
        }
        const student = allStudents.find(s => s._id === newAdjustmentRequest.studentId);
        const req = {
            id: 'adj_' + Date.now(),
            studentId: newAdjustmentRequest.studentId,
            studentName: student ? student.name : 'Unknown',
            amount: parseFloat(newAdjustmentRequest.amount) || 0,
            reason: newAdjustmentRequest.reason,
            status: 'PENDING'
        };
        setAdjustmentRequests(prev => [...prev, req]);
        setNewAdjustmentRequest({ studentId: '', amount: '', reason: '' });
        setSuccessMessage('Waiver request submitted for approval.');
    };

    const handleApproveAdjustment = (id) => {
        setAdjustmentRequests(prev => prev.map(req => {
            if (req.id === id) {
                return { ...req, status: 'APPROVED' };
            }
            return req;
        }));
        setSuccessMessage('Fee adjustment request approved.');
    };

    const handleRejectAdjustment = (id) => {
        setAdjustmentRequests(prev => prev.map(req => {
            if (req.id === id) {
                return { ...req, status: 'REJECTED' };
            }
            return req;
        }));
        setSuccessMessage('Fee adjustment request rejected.');
    };

    const handleSendReminder = (student) => {
        const detail = calculateStudentDuesDetail(student._id);
        const reminder = {
            id: 'rem_' + Date.now(),
            studentId: student._id,
            studentName: student.name,
            phone: student.fatherMobile || student.motherMobile || 'N/A',
            amountDue: detail ? detail.outstanding : 0,
            sentDate: new Date().toISOString()
        };
        setFeeRemindersLog(prev => [...prev, reminder]);
        setSuccessMessage(`WhatsApp payment alert sent to ${student.name}'s parent (${reminder.phone})!`);
    };

    const handlePromoteFeeStructure = () => {
        setSuccessMessage('Academic Session Rollover Completed! Fee terms, fee types, and fee groups copied to Session 2026-2027 successfully.');
    };

    const handlePromoteBackDues = () => {
        const updatedDues = { ...studentBackDues };
        allStudents.forEach(student => {
            const detail = calculateStudentDuesDetail(student._id);
            if (detail && detail.outstanding > 0) {
                updatedDues[student._id] = (updatedDues[student._id] || 0) + detail.outstanding;
            }
        });
        setStudentBackDues(updatedDues);
        setFeePayments([]);
        setSuccessMessage('Pending dues promoted successfully! All unpaid balances set as Opening Back Dues for the next session.');
    };

    const handleSignOut = async () => {
        try {
            await fetch(`${BACKEND_URL}/api/auth/logout`, {
                method: 'POST',
                headers: getHeaders(),
                credentials: 'include'
            });
        } catch (err) {
            console.error('Logout request failed:', err);
        }
        localStorage.removeItem('token');
        localStorage.removeItem('user_role');
        localStorage.removeItem('username');
        document.cookie = 'kp_session=; path=/; max-age=0';
        setToken('');
        setRole('');
        setUsername('');
        setAuthenticated(false);
        router.push('/login');
    };

    const [academySubTab, setAcademySubTab] = useState('students');
    const [paymentsSubTab, setPaymentsSubTab] = useState('collect');
    const [customerSearchQuery, setCustomerSearchQuery] = useState('');
    const [selectedCrmStudent, setSelectedCrmStudent] = useState(null);
    const [posCart, setPosCart] = useState([]);
    const [attendanceList, setAttendanceList] = useState([]);

    // Format helper
    const formatINR = (amount) => {
        return '₹' + (amount || 0).toLocaleString('en-IN');
    };

    // Generate unique customer ID from name + phone
    const generateCustomerId = (name, phone) => {
        const str = `${(name || 'WI').substring(0, 2).toUpperCase()}${(phone || '0000').slice(-4)}`;
        const hash = Array.from(str).reduce((acc, c) => acc + c.charCodeAt(0), 0);
        return `KP-${str.substring(0, 2)}${String(hash).padStart(4, '0').slice(-4)}`;
    };

    // Theme toggle
    const toggleTheme = () => {
        const nextTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(nextTheme);
        localStorage.setItem('erp_theme', nextTheme);
    };

    // Calendar helper variables
    const monthName = calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const firstDayIndex = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 1).getDay();
    const daysInMonth = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 0).getDate();


    const renderPaymentsTab = () => {
        return (
            <div className="animate-fade-in">
                <div className="d-flex gap-3 mb-4 border-bottom pb-2">
                    {[
                        { id: 'collect', label: 'Counter Desk' },
                        { id: 'ledger', label: 'Ledger log' },
                        { id: 'waivers', label: 'Waiver Approvals' }
                    ].map(t => (
                        <button key={t.id} className={`sub-tab-link ${paymentsSubTab === t.id ? 'active' : ''}`} onClick={() => setPaymentsSubTab(t.id)}>{t.label}</button>
                    ))}
                </div>

                {paymentsSubTab === 'collect' && (
                    <div className="row g-4">
                        <div className="col-md-5">
                            <div className="card-premium">
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 15px 0' }}>Lookup Billing</h3>
                                <div className="mb-3">
                                    <select className="input-premium w-100" value={paymentSearchId} onChange={(e) => { setPaymentSearchId(e.target.value); setSelectedStudentForPayment(allStudents.find(s => s._id === e.target.value) || null); }}>
                                        <option value="">-- Choose Student --</option>
                                        {allStudents.map(s => <option key={s._id} value={s._id}>{s.name} ({s.sport})</option>)}
                                    </select>
                                </div>

                                {selectedStudentForPayment && (
                                    <form onSubmit={handleRecordCounterPayment}>
                                        <div className="mb-3">
                                            <label className="form-label">Payment Mode</label>
                                            <select className="input-premium w-100" value={paymentCollectionInput.method} onChange={(e) => setPaymentCollectionInput({ ...paymentCollectionInput, method: e.target.value })}>
                                                <option value="CASH">CASH MODE</option>
                                                <option value="UPI">UPI / NET BANKING</option>
                                            </select>
                                        </div>
                                        <div className="mb-3">
                                            <label className="form-label">Amount Collected *</label>
                                            <input type="number" className="input-premium w-100" required value={paymentCollectionInput.amountPaid} onChange={(e) => setPaymentCollectionInput({ ...paymentCollectionInput, amountPaid: e.target.value })} />
                                        </div>
                                        <button type="submit" className="btn-primary-stripe w-100">Record Fee Transaction</button>
                                    </form>
                                )}
                            </div>
                        </div>

                        <div className="col-md-7">
                            {selectedStudentForPayment ? (
                                (() => {
                                    const dues = calculateStudentDuesDetail(selectedStudentForPayment._id);
                                    return (
                                        <div className="card-premium">
                                            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 15px 0' }}>{selectedStudentForPayment.name}</h3>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: '8px', fontSize: '0.9rem' }}>
                                                <span>Total Due Charges:</span><strong style={{ textAlign: 'right' }}>{formatINR(dues?.totalDues)}</strong>
                                                <span>Paid Amount:</span><strong style={{ textAlign: 'right' }}>{formatINR(dues?.paidAmount)}</strong>
                                                <span>Outstanding Balance:</span><strong style={{ textAlign: 'right', color: 'var(--danger)' }}>{formatINR(dues?.outstanding)}</strong>
                                            </div>
                                        </div>
                                    );
                                })()
                            ) : (
                                <div className="card-premium text-center p-4">Select student to display bill details.</div>
                            )}
                        </div>
                    </div>
                )}

                {paymentsSubTab === 'ledger' && (
                    <div className="card-premium">
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 15px 0' }}>Transaction Ledger Log</h3>
                        <div className="table-responsive">
                            <table className="table-premium">
                                <thead>
                                    <tr><th>Date</th><th>Student</th><th>Receipt ID</th><th>Term</th><th>Method</th><th>Collected</th></tr>
                                </thead>
                                <tbody>
                                    {feePayments.map(p => (
                                        <tr key={p.id}>
                                            <td>{new Date(p.paymentDate).toLocaleDateString('en-IN')}</td>
                                            <td><strong>{allStudents.find(s => s._id === p.studentId)?.name || 'Student'}</strong></td>
                                            <td><code>{p.id.split('_')[1] || p.id}</code></td>
                                            <td>{p.termName}</td>
                                            <td>{p.method}</td>
                                            <td style={{ color: 'var(--success)', fontWeight: 'bold' }}>{formatINR(p.amountPaid)}</td>
                                        </tr>
                                    ))}
                                    {feePayments.length === 0 && (
                                        <tr>
                                            <td colSpan="6" className="text-muted text-center py-4">No transactions recorded yet.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {paymentsSubTab === 'waivers' && (
                    <div className="card-premium">
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 15px 0' }}>Waiver Requests</h3>
                        <table className="table-premium">
                            <thead>
                                <tr><th>Student</th><th>Amount</th><th>Description</th><th>Status</th><th>Actions</th></tr>
                            </thead>
                            <tbody>
                                {adjustmentRequests.map(r => (
                                    <tr key={r.id}>
                                        <td><strong>{r.studentName || allStudents.find(s => s._id === r.studentId)?.name || 'Student'}</strong></td>
                                        <td>{formatINR(r.amount)}</td>
                                        <td>{r.reason}</td>
                                        <td>
                                            <span className={`badge-stripe ${r.status === 'APPROVED' ? 'badge-success' : r.status === 'PENDING' ? 'badge-warning' : 'badge-danger'}`}>
                                                {r.status}
                                            </span>
                                        </td>
                                        <td>
                                            {r.status === 'PENDING' && (
                                                <div className="d-flex gap-2">
                                                    <button className="btn-primary-stripe py-1 px-2" style={{ fontSize: '0.8rem' }} onClick={() => handleApproveAdjustment(r.id)}>Approve</button>
                                                    <button className="btn-secondary-stripe py-1 px-2" style={{ fontSize: '0.8rem', color: 'var(--danger)', borderColor: 'rgba(239,68,68,0.2)' }} onClick={() => handleRejectAdjustment(r.id)}>Reject</button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {adjustmentRequests.length === 0 && (
                                    <tr>
                                        <td colSpan="5" className="text-muted text-center py-4">No waiver requests found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        );
    };

    const renderCustomersTab = () => {
        return (
            <div className="card-premium animate-fade-in">
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 15px 0' }}>Customer Directory</h3>
                <div className="table-responsive">
                    <table className="table-premium">
                        <thead>
                            <tr><th>Customer</th><th>Sport</th><th>Contact Mobile</th><th>Outstanding Dues</th><th>Reminders</th></tr>
                        </thead>
                        <tbody>
                            {allStudents.map(student => {
                                const detail = calculateStudentDuesDetail(student._id);
                                return (
                                    <tr key={student._id}>
                                        <td><strong>{student.name}</strong></td>
                                        <td>{student.sport}</td>
                                        <td>{student.fatherMobile}</td>
                                        <td style={{ color: detail?.outstanding > 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 'bold' }}>{formatINR(detail?.outstanding)}</td>
                                        <td>
                                            {detail?.outstanding > 0 && <button className="btn btn-sm btn-outline-danger" onClick={() => handleSendReminder(student)}>Send alert</button>}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const renderReportsTab = () => {
        if (activeSidebarKey === 'activity-logs') {
            const systemLogs = [
                ...bookingsLog.map(b => ({
                    action: 'Turf Booking Created',
                    details: `${b.customerName || 'Walk-in'} booked ${b.sport?.toUpperCase()} Turf for ${b.date}`,
                    user: 'admin',
                    timestamp: b.createdAt
                })),
                ...allStudents.map(s => ({
                    action: 'Academy Student Admitted',
                    details: `${s.name} joined ${s.sport?.toUpperCase()} Academy (${s.batchTime})`,
                    user: 'admin',
                    timestamp: s.admissionDate
                }))
            ].sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0)).slice(0, 10);

            return (
                <div className="card-premium animate-fade-in">
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 15px 0' }}>📜 System Activity Logs</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px' }}>Historical audit trail of administrative operations and database records compiled in real-time.</p>
                    <div className="table-responsive">
                        <table className="table-premium">
                            <thead>
                                <tr><th>Timestamp</th><th>Action / Operation</th><th>Operation Details</th><th>Triggered By</th></tr>
                            </thead>
                            <tbody>
                                {systemLogs.length === 0 ? (
                                    <tr><td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0' }}>No activity records found in DB</td></tr>
                                ) : (
                                    systemLogs.map((log, idx) => (
                                        <tr key={idx}>
                                            <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}</td>
                                            <td><span className={`badge-stripe ${log.action.includes('Booking') ? 'badge-success' : 'badge-warning'}`}>{log.action}</span></td>
                                            <td>{log.details}</td>
                                            <td><strong>{log.user}</strong></td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            );
        }

        return (
            <div className="row g-4 animate-fade-in">
                {['Revenue Report', 'Attendance Ledger', 'Booking Report'].map((rep, idx) => (
                    <div className="col-md-4" key={idx}>
                        <div className="card-premium">
                            <h3>{rep}</h3>
                            <button className="btn-secondary-stripe w-100 mb-2" onClick={() => setSuccessMessage(`${rep} CSV export triggered.`)}>Export CSV</button>
                            <button className="btn-secondary-stripe w-100" onClick={() => setSuccessMessage(`${rep} PDF export triggered.`)}>Export PDF</button>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    const renderStaffTab = () => {
        if (activeSidebarKey === 'roles') {
            const rolePermissions = [
                { role: 'SUPER_ADMIN', bookings: 'Full', academy: 'Full', inventory: 'Full', finance: 'Full', staff: 'Register' },
                { role: 'BRANCH_MANAGER', bookings: 'Read/Write', academy: 'View', inventory: 'POS', finance: 'View', staff: 'No Access' },
                { role: 'RECEPTIONIST', bookings: 'Read Only', academy: 'CRM/Attendance', inventory: 'Read Only', finance: 'Collect Fees', staff: 'No Access' },
                { role: 'FINANCE_MANAGER', bookings: 'View', academy: 'View', inventory: 'View', finance: 'Full', staff: 'No Access' }
            ];
            return (
                <div className="card-premium animate-fade-in">
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 15px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="material-icons-outlined" style={{ color: 'var(--emerald)' }}>security</span> ERP Roles & Permissions Matrix
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px' }}>Below is the access authorization mapping for the staff accounts inside this Turf & Academy ERP.</p>
                    <div className="table-responsive">
                        <table className="table-premium">
                            <thead>
                                <tr><th>Role</th><th>Turf Bookings</th><th>Academy CRM</th><th>Inventory & Store</th><th>Payments & Dues</th><th>Staff Management</th></tr>
                            </thead>
                            <tbody>
                                {rolePermissions.map((rp, i) => (
                                    <tr key={i}>
                                        <td><strong>{rp.role}</strong></td>
                                        <td>{rp.bookings}</td>
                                        <td>{rp.academy}</td>
                                        <td>{rp.inventory}</td>
                                        <td>{rp.finance}</td>
                                        <td>{rp.staff}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            );
        }

        return (
            <div className="animate-fade-in">
                <div className="row g-4">
                    <div className="col-md-7">
                        <div className="card-premium">
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 15px 0' }}>Staff List Directory</h3>
                            <table className="table-premium">
                                <thead>
                                    <tr><th>Username</th><th>Role</th><th>Access permissions</th></tr>
                                </thead>
                                <tbody>
                                    {staffList.map((staff, idx) => (
                                        <tr key={idx}>
                                            <td><strong>{staff.username}</strong></td>
                                            <td><span className="badge-stripe badge-success">{staff.role}</span></td>
                                            <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{staff.permissions}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="col-md-5">
                        <div className="card-premium">
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 15px 0' }}>Register Staff User</h3>
                            <form onSubmit={handleRegisterStaff}>
                                <div className="mb-2">
                                    <label className="form-label">Username</label>
                                    <input type="text" className="input-premium w-100" required value={newStaff.username} onChange={(e) => setNewStaff({ ...newStaff, username: e.target.value })} />
                                </div>
                                <div className="mb-2">
                                    <label className="form-label">Password</label>
                                    <input type="password" className="input-premium w-100" required value={newStaff.password} onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })} />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label">Role</label>
                                    <select className="input-premium w-100" value={newStaff.role} onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value })}>
                                        <option value="RECEPTIONIST">RECEPTIONIST</option>
                                        <option value="BRANCH_MANAGER">BRANCH_MANAGER</option>
                                        <option value="FINANCE_MANAGER">FINANCE_MANAGER</option>
                                        <option value="COACH">COACH</option>
                                    </select>
                                </div>
                                <button type="submit" className="btn-primary-stripe w-100">Save Account</button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderBookingDetailsModal = () => {
        if (!selectedBooking) return null;
        const b = selectedBooking;
        const custId = generateCustomerId(b.customerName, b.customerPhone);
        const balance = (b.totalAmount || 0) - (b.discountAmount || 0) - (b.paidAmount || 0);
        const initials = (b.customerName || 'W').substring(0, 2).toUpperCase();
        return (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10050, padding: '20px' }} onClick={() => setSelectedBookingState(null)}>
                <div style={{ background: 'var(--card-bg)', borderRadius: '20px', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 80px rgba(0,0,0,0.25)', border: '1px solid var(--border-color)' }} onClick={e => e.stopPropagation()}>
                    {/* Modal Header - Customer Profile */}
                    <div style={{ padding: '28px 28px 20px', borderBottom: '1px solid var(--border-color)', position: 'relative' }}>
                        <button onClick={() => setSelectedBookingState(null)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '10px', width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)', transition: 'all 0.2s' }}>
                            <span className="material-icons-outlined" style={{ fontSize: '18px' }}>close</span>
                        </button>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'var(--gradient-1)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.1rem', boxShadow: '0 6px 20px rgba(99,102,241,0.3)' }}>
                                {initials}
                            </div>
                            <div>
                                <div style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.02em' }}>{b.customerName || 'Walk-in Customer'}</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                                    <span style={{ fontSize: '0.72rem', fontWeight: 600, background: 'rgba(99,102,241,0.08)', color: 'var(--primary)', padding: '2px 8px', borderRadius: '5px', fontFamily: 'monospace' }}>{custId}</span>
                                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '3px' }}>
                                        <span className="material-icons-outlined" style={{ fontSize: '13px' }}>lock</span> Admin Only
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Customer Contact Info */}
                    <div style={{ padding: '18px 28px', borderBottom: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>Contact Information</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            {[
                                { icon: 'phone', label: 'Phone', value: b.customerPhone || '—' },
                                { icon: 'email', label: 'Email', value: b.customerEmail || '—' },
                            ].map((f, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: 'var(--bg-color)', borderRadius: '10px' }}>
                                    <span className="material-icons-outlined" style={{ fontSize: '17px', color: 'var(--primary)' }}>{f.icon}</span>
                                    <div>
                                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 500 }}>{f.label}</div>
                                        <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>{f.value}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Booking Details */}
                    <div style={{ padding: '18px 28px', borderBottom: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>Booking Details</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            {[
                                { icon: 'sports_soccer', label: 'Sport', value: (b.sport || '—').charAt(0).toUpperCase() + (b.sport || '').slice(1) },
                                { icon: 'event', label: 'Booking Date', value: b.date ? new Date(b.date + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : '—' },
                                { icon: 'schedule', label: 'Time Slots', value: (b.timeSlots || []).map(formatSlotTo12Hr).join(', ') || '—' },
                                { icon: 'access_time', label: 'Booked On', value: b.createdAt ? new Date(b.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—' },
                            ].map((f, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px 12px', background: 'var(--bg-color)', borderRadius: '10px' }}>
                                    <span className="material-icons-outlined" style={{ fontSize: '17px', color: '#3B82F6', marginTop: '2px' }}>{f.icon}</span>
                                    <div>
                                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 500 }}>{f.label}</div>
                                        <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>{f.value}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Payment Breakdown */}
                    <div style={{ padding: '18px 28px', borderBottom: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '14px' }}>Payment & Cashfree Details</div>
                        
                        {/* Amount Breakdown Card */}
                        <div style={{ background: 'var(--bg-color)', borderRadius: '14px', padding: '16px', marginBottom: '14px' }}>
                            {Number(b.discount || b.discountAmount || 0) > 0 ? (
                                <>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                        <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Slot Rate Subtotal</span>
                                        <span style={{ fontSize: '0.92rem', fontWeight: 700 }}>{formatINR((b.totalAmount || 0) + Number(b.discount || b.discountAmount || 0))}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px dashed var(--border-color)' }}>
                                        <span style={{ fontSize: '0.82rem', color: '#10B981', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 600 }}>
                                            <span className="material-icons-outlined" style={{ fontSize: '15px' }}>local_offer</span> Discount Applied {b.couponCode ? `(${b.couponCode})` : ''}
                                        </span>
                                        <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#10B981' }}>- {formatINR(b.discount || b.discountAmount || 0)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px dashed var(--border-color)' }}>
                                        <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>Net Total Amount</span>
                                        <span style={{ fontSize: '1rem', fontWeight: 800 }}>{formatINR(b.totalAmount || 0)}</span>
                                    </div>
                                </>
                            ) : (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px dashed var(--border-color)' }}>
                                    <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Total Amount</span>
                                    <span style={{ fontSize: '1rem', fontWeight: 800 }}>{formatINR(b.totalAmount || 0)}</span>
                                </div>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <span style={{ fontSize: '0.82rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <span className="material-icons-outlined" style={{ fontSize: '15px' }}>check_circle</span> Advance Paid
                                </span>
                                <span style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--success)' }}>{formatINR(b.paidAmount || 0)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.82rem', color: balance > 0 ? 'var(--danger)' : 'var(--success)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <span className="material-icons-outlined" style={{ fontSize: '15px' }}>{balance > 0 ? 'pending' : 'verified'}</span> Rest Due
                                </span>
                                <span style={{ fontSize: '0.92rem', fontWeight: 700, color: balance > 0 ? 'var(--danger)' : 'var(--success)' }}>{balance > 0 ? formatINR(balance) : '₹0 (Fully Paid)'}</span>
                            </div>
                        </div>

                        {/* Cashfree / Payment Gateway Details */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            {[
                                { icon: 'payment', label: 'Payment Method', value: (b.paymentMethod || '—').toUpperCase(), color: '#6366F1' },
                                { icon: 'verified', label: 'Payment Status', value: b.paymentStatus || '—', color: b.paymentStatus === 'SUCCESS' ? '#10B981' : b.paymentStatus === 'PENDING' ? '#F59E0B' : b.paymentStatus === 'DROPPED' ? '#D97706' : b.paymentStatus === 'CANCELLED' ? '#9CA3AF' : '#EF4444' },
                                { icon: 'tag', label: 'Cashfree Order ID', value: b.orderId || '—', color: '#3B82F6' },
                                { icon: 'receipt', label: 'Transaction ID', value: b.transactionId || 'Not available', color: '#8B5CF6' },
                            ].concat(Number(b.discount || b.discountAmount || 0) > 0 ? [{ icon: 'local_offer', label: 'Discount Savings', value: `Saved ${formatINR(b.discount || b.discountAmount)}`, color: '#10B981' }] : []).map((f, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '9px', padding: '10px 12px', background: 'var(--bg-color)', borderRadius: '10px' }}>
                                    <span className="material-icons-outlined" style={{ fontSize: '16px', color: f.color, marginTop: '2px' }}>{f.icon}</span>
                                    <div style={{ minWidth: 0 }}>
                                        <div style={{ fontSize: '0.63rem', color: 'var(--text-muted)', fontWeight: 500 }}>{f.label}</div>
                                        <div style={{ fontSize: '0.78rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: f.label.includes('Status') ? f.color : 'inherit' }}>{f.value}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        {b.paymentDetails && (
                            <div style={{ marginTop: '14px', background: 'rgba(255,255,255,0.02)', padding: '14px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Gateway Metadata</div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', fontSize: '0.76rem' }}>
                                    {Object.entries(b.paymentDetails).map(([key, val]) => {
                                        if (typeof val === 'object') return null; // Skip nested objects like refund info
                                        return (
                                            <div key={key} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '4px' }}>
                                                <span style={{ color: 'var(--text-muted)' }}>{key}:</span>
                                                <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{String(val)}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                                {b.paymentDetails.refund && (
                                    <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed var(--border-color)' }}>
                                        <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--danger)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Refund Information</div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', fontSize: '0.74rem' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span style={{ color: 'var(--text-muted)' }}>Refund ID:</span>
                                                <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{b.paymentDetails.refund.refundId}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span style={{ color: 'var(--text-muted)' }}>Status:</span>
                                                <span style={{ fontWeight: 600, color: 'var(--danger)' }}>{b.paymentDetails.refund.status}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span style={{ color: 'var(--text-muted)' }}>Refunded:</span>
                                                <span style={{ fontWeight: 600, color: 'var(--danger)' }}>₹{b.paymentDetails.refund.amount}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span style={{ color: 'var(--text-muted)' }}>On Date:</span>
                                                <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{new Date(b.paymentDetails.refund.refundedAt).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Admin Booking Controls */}
                    <div style={{ padding: '18px 28px', borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.01)' }}>
                        <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>Admin Actions</div>
                        
                        {isRescheduling ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', background: 'rgba(0,0,0,0.12)', padding: '16px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                                <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>Reschedule Booking</div>
                                
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '6px' }}>Target Date</label>
                                    <input 
                                        type="date"
                                        className="input-premium"
                                        style={{ width: '100%', fontSize: '0.82rem', padding: '8px 12px', borderRadius: '8px' }}
                                        value={rescheduleDate}
                                        onChange={e => {
                                            setRescheduleDate(e.target.value);
                                            setRescheduleSlots([]);
                                        }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '6px' }}>Select Time Slots</label>
                                    {loadingRescheduleSlots ? (
                                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', padding: '8px 0' }}>Loading slots...</div>
                                    ) : rescheduleAvailableSlots.length === 0 ? (
                                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', padding: '8px 0' }}>Choose a date to fetch slots.</div>
                                    ) : (
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', maxHeight: '140px', overflowY: 'auto', padding: '4px' }}>
                                            {rescheduleAvailableSlots.map((slot, idx) => {
                                                const isSelected = rescheduleSlots.includes(slot.value);
                                                const isAvailable = slot.available;
                                                
                                                let bg = 'rgba(255,255,255,0.02)';
                                                let color = 'var(--text-color)';
                                                let border = '1px solid var(--border-color)';
                                                
                                                if (!isAvailable) {
                                                    bg = 'rgba(255,0,0,0.03)';
                                                    color = 'var(--text-muted)';
                                                    border = '1px solid rgba(239, 68, 68, 0.15)';
                                                } else if (isSelected) {
                                                    bg = 'var(--gradient-2)';
                                                    color = '#fff';
                                                    border = 'none';
                                                }

                                                return (
                                                    <button
                                                        key={idx}
                                                        type="button"
                                                        disabled={!isAvailable}
                                                        onClick={() => {
                                                            setRescheduleSlots(prev => 
                                                                prev.includes(slot.value) 
                                                                    ? prev.filter(s => s !== slot.value) 
                                                                    : [...prev, slot.value]
                                                            );
                                                        }}
                                                        style={{
                                                            padding: '6px 4px',
                                                            borderRadius: '6px',
                                                            background: bg,
                                                            color: color,
                                                            border: border,
                                                            cursor: isAvailable ? 'pointer' : 'not-allowed',
                                                            fontSize: '0.7rem',
                                                            fontWeight: 600,
                                                            textAlign: 'center',
                                                            transition: 'all 0.1s'
                                                        }}
                                                    >
                                                        <div>{formatSlotTo12Hr(slot.value)}</div>
                                                        {!isAvailable && <div style={{ fontSize: '0.55rem', opacity: 0.7 }}>{slot.reason || 'Booked'}</div>}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '6px' }}>
                                    <button 
                                        type="button"
                                        onClick={() => setIsRescheduling(false)}
                                        style={{ padding: '6px 14px', borderRadius: '8px', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-color)', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => handleRescheduleBooking(b._id)}
                                        style={{ padding: '6px 14px', borderRadius: '8px', background: 'var(--primary)', border: 'none', color: '#fff', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
                                    >
                                        Save Changes
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                <button 
                                    onClick={() => {
                                        setRescheduleDate(b.date || '');
                                        setRescheduleSlots(b.timeSlots || []);
                                        setIsRescheduling(true);
                                    }}
                                    style={{ flex: '1 1 140px', padding: '10px', background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: '10px', color: 'var(--primary)', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.2s' }}
                                >
                                    <span className="material-icons-outlined" style={{ fontSize: '16px' }}>schedule</span> Reschedule
                                </button>
                                {b.paymentStatus !== 'FAILED' && b.paymentStatus !== 'CANCELLED' && (
                                    <>
                                        <button 
                                            onClick={() => handleCancelOnlyBooking(b._id)}
                                            style={{ flex: '1 1 140px', padding: '10px', background: 'rgba(239, 68, 68, 0.04)', border: '1px solid rgba(239, 68, 68, 0.15)', borderRadius: '10px', color: 'var(--danger)', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.2s' }}
                                        >
                                            <span className="material-icons-outlined" style={{ fontSize: '16px' }}>cancel</span> Cancel (No Refund)
                                        </button>
                                        <button 
                                            onClick={() => handleCancelRefundBooking(b._id)}
                                            style={{ flex: '1 1 140px', padding: '10px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '10px', color: 'var(--danger)', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.2s' }}
                                        >
                                            <span className="material-icons-outlined" style={{ fontSize: '16px' }}>price_check</span> Cancel & Refund
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div style={{ padding: '16px 28px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                        <button onClick={() => setSelectedBookingState(null)} style={{ padding: '9px 20px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '10px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', transition: 'all 0.2s' }}>
                            Close
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const renderOfflineBookingModal = () => {
        if (!showOfflineBookingModal) return null;

        // Calculate total price based on selected slots
        const totalAmount = offlineBookingForm.sport === 'nets'
            ? (offlineBookingForm.timeSlots.length * 100 * (offlineBookingForm.participantsCount || 1))
            : offlineBookingForm.timeSlots.reduce((sum, val) => {
                const slotObj = offlineAvailableSlots.find(s => s.value === val);
                return sum + (slotObj ? (slotObj.price || 0) : 0);
            }, 0);

        const netDue = Math.max(0, totalAmount - (Number(offlineBookingForm.discount) || 0));
        const restDue = Math.max(0, netDue - (Number(offlineBookingForm.paidAmount) || 0));

        return (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }} onClick={() => setShowOfflineBookingModal(false)}>
                <div style={{ background: 'var(--card-bg)', borderRadius: '24px', width: '100%', maxWidth: '750px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 80px rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', animation: 'slide-up 0.3s ease-out' }} onClick={e => e.stopPropagation()}>
                    
                    {/* Modal Header */}
                    <div style={{ padding: '24px 28px', borderBottom: '1px solid var(--border-color)', position: 'relative', background: 'rgba(255,255,255,0.01)' }}>
                        <button onClick={() => setShowOfflineBookingModal(false)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '12px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)', transition: 'all 0.2s' }}>
                            <span className="material-icons-outlined" style={{ fontSize: '18px' }}>close</span>
                        </button>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'var(--gradient-2)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(16,185,129,0.3)' }}>
                                <span className="material-icons-outlined" style={{ fontSize: '22px' }}>add_circle</span>
                            </div>
                            <div>
                                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>Book Turf (Offline / Desk Link)</h3>
                                <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>Register walk-in bookings and share secure checkout links directly</p>
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleCreateOfflineBooking} style={{ padding: '28px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            
                            {/* Row 1: Contact Details */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>Customer Name *</label>
                                    <input 
                                        type="text" 
                                        required
                                        className="input-premium" 
                                        placeholder="Enter customer name"
                                        style={{ width: '100%', fontSize: '0.85rem', padding: '10px 14px', borderRadius: '10px' }}
                                        value={offlineBookingForm.customerName}
                                        onChange={e => setOfflineBookingForm(prev => ({ ...prev, customerName: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>Customer Phone (WhatsApp) *</label>
                                    <input 
                                        type="tel" 
                                        required
                                        className="input-premium" 
                                        placeholder="e.g. 91XXXXXXXXXX"
                                        style={{ width: '100%', fontSize: '0.85rem', padding: '10px 14px', borderRadius: '10px' }}
                                        value={offlineBookingForm.customerPhone}
                                        onChange={e => setOfflineBookingForm(prev => ({ ...prev, customerPhone: e.target.value }))}
                                    />
                                </div>
                            </div>

                            {/* Customer Profile & History Lookup View */}
                            {loadingCustomerLookup && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', background: 'rgba(255,255,255,0.01)', border: '1px dashed var(--border-color)', borderRadius: '14px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                    <div className="spinner" style={{ width: '14px', height: '14px', border: '1.5px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--success)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                                    <span>Searching customer profile and booking records...</span>
                                </div>
                            )}

                            {customerLookupResult && (
                                <div style={{ 
                                    background: 'rgba(16, 185, 129, 0.03)', 
                                    border: '1px solid rgba(16, 185, 129, 0.15)', 
                                    padding: '16px', 
                                    borderRadius: '16px', 
                                    display: 'flex', 
                                    flexDirection: 'column', 
                                    gap: '12px',
                                    animation: 'fade-in 0.25s ease-out'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span className="material-icons-outlined" style={{ color: 'var(--success)', fontSize: '18px' }}>verified_user</span>
                                            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--success)' }}>Customer Profile Found</span>
                                        </div>
                                        {customerLookupResult.student && (
                                            <span className="badge-pill" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6', fontSize: '0.68rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                <span className="material-icons-outlined" style={{ fontSize: '12px' }}>school</span>
                                                Active Academy Member
                                            </span>
                                        )}
                                    </div>
                                    
                                    {/* Stats grid */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', background: 'rgba(0,0,0,0.12)', borderRadius: '12px', padding: '10px' }}>
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Total Bookings</div>
                                            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-color)', marginTop: '2px' }}>{customerLookupResult.bookings.length}</div>
                                        </div>
                                        <div style={{ textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.05)', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
                                            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Successful</div>
                                            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--success)', marginTop: '2px' }}>
                                                {customerLookupResult.bookings.filter(b => b.paymentStatus === 'SUCCESS').length}
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Total Spent</div>
                                            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-color)', marginTop: '2px' }}>
                                                ₹{customerLookupResult.bookings.filter(b => b.paymentStatus === 'SUCCESS').reduce((sum, b) => sum + (b.paidAmount || 0), 0)}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Scrollable list */}
                                    {customerLookupResult.bookings.length > 0 && (
                                        <div>
                                            <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <span className="material-icons-outlined" style={{ fontSize: '13px' }}>history</span>
                                                Booking History (Most Recent First)
                                            </div>
                                            <div style={{ maxHeight: '120px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', paddingRight: '4px' }}>
                                                {customerLookupResult.bookings.map((b, idx) => {
                                                    let statusColor = 'var(--text-muted)';
                                                    let statusBg = 'rgba(255,255,255,0.05)';
                                                    if (b.paymentStatus === 'SUCCESS') {
                                                        statusColor = 'var(--success)';
                                                        statusBg = 'rgba(16,185,129,0.1)';
                                                    } else if (b.paymentStatus === 'CANCELLED') {
                                                        statusColor = '#9CA3AF';
                                                        statusBg = 'rgba(156, 163, 175, 0.1)';
                                                    } else if (b.paymentStatus === 'DROPPED') {
                                                        statusColor = '#D97706';
                                                        statusBg = 'rgba(217,119,6,0.1)';
                                                    } else if (b.paymentStatus === 'FAILED') {
                                                        statusColor = 'var(--danger)';
                                                        statusBg = 'rgba(239,68,68,0.1)';
                                                    } else if (b.paymentStatus === 'PENDING') {
                                                        statusColor = 'var(--warning)';
                                                        statusBg = 'rgba(245,158,11,0.1)';
                                                    }

                                                    return (
                                                        <div key={idx} style={{ 
                                                            display: 'flex', 
                                                            justifyContent: 'space-between', 
                                                            alignItems: 'center', 
                                                            padding: '8px 12px', 
                                                            background: 'rgba(255,255,255,0.02)', 
                                                            borderRadius: '8px', 
                                                            border: '1px solid rgba(255,255,255,0.03)', 
                                                            fontSize: '0.74rem' 
                                                        }}>
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                                <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                    <span className="material-icons-outlined" style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                                                                        {b.sport === 'cricket' ? 'sports_cricket' : b.sport === 'nets' ? 'grid_3x3' : 'sports_soccer'}
                                                                    </span>
                                                                    <span style={{ textTransform: 'capitalize' }}>{b.sport} Booking</span>
                                                                    <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.68rem' }}>({b.orderId})</span>
                                                                </div>
                                                                <div style={{ color: 'var(--text-muted)', fontSize: '0.68rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                    <span>📅 {b.date}</span>
                                                                    <span>•</span>
                                                                    <span>⏰ {b.timeSlots.map(s => formatSlotTo12Hr(s)).join(', ')}</span>
                                                                </div>
                                                            </div>
                                                            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-end' }}>
                                                                <div style={{ fontWeight: 800 }}>₹{b.paidAmount || b.totalAmount}</div>
                                                                <span className="badge-pill" style={{ background: statusBg, color: statusColor, fontSize: '0.62rem', padding: '1px 6px', fontWeight: 700, textTransform: 'uppercase' }}>
                                                                    {b.paymentStatus}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Row 2: Email & Sport Choice */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>Customer Email</label>
                                    <input 
                                        type="email" 
                                        className="input-premium" 
                                        placeholder="Optional email"
                                        style={{ width: '100%', fontSize: '0.85rem', padding: '10px 14px', borderRadius: '10px' }}
                                        value={offlineBookingForm.customerEmail}
                                        onChange={e => setOfflineBookingForm(prev => ({ ...prev, customerEmail: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>Select Sport</label>
                                    <select 
                                        className="input-premium" 
                                        style={{ width: '100%', fontSize: '0.85rem', padding: '10px 14px', borderRadius: '10px' }}
                                        value={offlineBookingForm.sport}
                                        onChange={e => setOfflineBookingForm(prev => ({ ...prev, sport: e.target.value, timeSlots: [] }))}
                                    >
                                        <option value="cricket">Cricket Turf</option>
                                        <option value="nets">Cricket Practice Nets</option>
                                        <option value="football">Football Turf</option>
                                    </select>
                                    {offlineBookingForm.sport === 'nets' && (
                                        <div style={{ marginTop: '12px' }}>
                                            <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Number of Persons *</label>
                                            <select 
                                                className="input-premium" 
                                                style={{ width: '100%', fontSize: '0.8rem', padding: '8px 12px', borderRadius: '8px' }}
                                                value={offlineBookingForm.participantsCount || 1}
                                                onChange={e => {
                                                    const pCount = Number(e.target.value);
                                                    setOfflineBookingForm(prev => {
                                                        const total = pCount * 100 * prev.timeSlots.length;
                                                        const netDue = Math.max(0, total - (Number(prev.discount) || 0));
                                                        const defaultPaid = Math.round(netDue * 0.5);
                                                        return {
                                                            ...prev,
                                                            participantsCount: pCount,
                                                            paidAmount: defaultPaid
                                                        };
                                                    });
                                                }}
                                            >
                                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                                                    <option key={n} value={n}>
                                                        {n} {n === 1 ? 'Person' : 'People'} (₹{n * 100}/hr)
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Row 3: Target Date */}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>Booking Date</label>
                                <input 
                                    type="date" 
                                    className="input-premium" 
                                    style={{ width: '100%', fontSize: '0.85rem', padding: '10px 14px', borderRadius: '10px' }}
                                    value={offlineBookingForm.date}
                                    onChange={e => setOfflineBookingForm(prev => ({ ...prev, date: e.target.value, timeSlots: [] }))}
                                />
                            </div>

                            {/* Row 4: Interactive Time Slots Grid */}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
                                    Select Available Slots (Click to toggle)
                                </label>
                                
                                {loadingOfflineSlots ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '20px', justifyContent: 'center' }}>
                                        <div className="spinner" style={{ width: '20px', height: '20px', border: '2px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Loading slots availability...</span>
                                    </div>
                                ) : offlineAvailableSlots.length === 0 ? (
                                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border-color)', borderRadius: '12px', fontSize: '0.8rem' }}>
                                        No slots available or error loading slots for this date.
                                    </div>
                                ) : (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', maxHeight: '180px', overflowY: 'auto', padding: '6px', border: '1px solid var(--border-color)', borderRadius: '12px', background: 'rgba(0,0,0,0.08)' }}>
                                        {offlineAvailableSlots.map((slot, idx) => {
                                            const isSelected = offlineBookingForm.timeSlots.includes(slot.value);
                                            const isAvailable = slot.available;
                                            const isBookedSlot = !isAvailable && (slot.booked || slot.reason === 'Booked');
                                            
                                            let bg = 'rgba(255,255,255,0.02)';
                                            let color = 'var(--text-color)';
                                            let border = '1px solid var(--border-color)';
                                            let cursor = 'pointer';

                                            if (isBookedSlot) {
                                                bg = 'rgba(239, 68, 68, 0.12)';
                                                color = '#F87171';
                                                border = '1px solid rgba(239, 68, 68, 0.5)';
                                                cursor = 'pointer';
                                            } else if (!isAvailable) {
                                                bg = 'rgba(255, 0, 0, 0.04)';
                                                color = 'var(--text-muted)';
                                                border = '1px solid rgba(239, 68, 68, 0.2)';
                                                cursor = 'default';
                                            } else if (isSelected) {
                                                bg = 'var(--gradient-2)';
                                                color = '#fff';
                                                border = 'none';
                                            }

                                            const handleAdminSlotClick = async () => {
                                                if (isAvailable) {
                                                    handleToggleOfflineSlot(slot.value);
                                                } else if (isBookedSlot) {
                                                    // Search local log first for instant modal pop-up
                                                    const localMatch = (bookingsLog || []).find(b => 
                                                        b.date === offlineBookingForm.date && 
                                                        (b.timeSlots || []).includes(slot.value) && 
                                                        (b.paymentStatus === 'SUCCESS' || b.paymentStatus === 'PENDING')
                                                    ) || (bookingsLog || []).find(b => 
                                                        b.date === offlineBookingForm.date && 
                                                        (b.timeSlots || []).includes(slot.value)
                                                    );

                                                    if (localMatch) {
                                                        setSelectedBookingState(localMatch);
                                                        return;
                                                    }

                                                    // Fallback fetch via backend API lookup
                                                    try {
                                                        const res = await fetch(`${BACKEND_URL}/api/admin/bookings-lookup?date=${offlineBookingForm.date}&slot=${slot.value}`, {
                                                            headers: getHeaders()
                                                        });
                                                        const data = await res.json();
                                                        if (data.booking) {
                                                            setSelectedBookingState(data.booking);
                                                        } else {
                                                            notifyInfo(`Slot ${slot.text} is booked on ${offlineBookingForm.date}.`);
                                                        }
                                                    } catch (err) {
                                                        notifyInfo(`Slot ${slot.text} is booked on ${offlineBookingForm.date}.`);
                                                    }
                                                }
                                            };

                                            return (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    onClick={handleAdminSlotClick}
                                                    title={isBookedSlot ? 'Click to view booking details' : undefined}
                                                    style={{
                                                        padding: '10px',
                                                        borderRadius: '8px',
                                                        background: bg,
                                                        color: color,
                                                        border: border,
                                                        cursor: cursor,
                                                        fontSize: '0.74rem',
                                                        fontWeight: 600,
                                                        textAlign: 'center',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '4px',
                                                        transition: 'all 0.15s'
                                                    }}
                                                >
                                                    <div>{slot.text}</div>
                                                    <div style={{ fontSize: '0.62rem', opacity: 0.9, fontWeight: isBookedSlot ? 700 : 500 }}>
                                                        {isAvailable 
                                                            ? `₹${offlineBookingForm.sport === 'nets' ? (100 * (offlineBookingForm.participantsCount || 1)) : slot.price}` 
                                                            : (isBookedSlot ? '🔒 Booked (View Info)' : (slot.reason || 'Closed'))}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Pricing Details Dashboard Section */}
                            {offlineBookingForm.timeSlots.length > 0 && (
                                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                    <h4 style={{ margin: 0, fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                                        Receipt Breakdown
                                    </h4>
                                    
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                                        <div style={{ background: 'rgba(0,0,0,0.12)', padding: '10px 14px', borderRadius: '10px' }}>
                                            <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>Total Rate</div>
                                            <div style={{ fontSize: '1.05rem', fontWeight: 800, marginTop: '2px' }}>₹{totalAmount}</div>
                                        </div>
                                        <div style={{ background: 'rgba(16,185,129,0.04)', padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(16,185,129,0.15)' }}>
                                            <div style={{ fontSize: '0.66rem', color: 'var(--success)' }}>Discount Applied</div>
                                            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--success)', marginTop: '2px' }}>- ₹{Number(offlineBookingForm.discount) || 0}</div>
                                        </div>
                                        <div style={{ background: 'rgba(99,102,241,0.06)', padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(99,102,241,0.2)' }}>
                                            <div style={{ fontSize: '0.66rem', color: 'var(--primary)' }}>Net Due (Payable)</div>
                                            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--primary)', marginTop: '2px' }}>₹{netDue}</div>
                                        </div>
                                    </div>

                                    {/* Discount & Advance Inputs */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginTop: '4px' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                                                Apply Discount (₹)
                                            </label>
                                            <input 
                                                type="number" 
                                                min="0"
                                                max={totalAmount}
                                                className="input-premium" 
                                                style={{ width: '100%', fontSize: '0.8rem', padding: '8px 12px', borderRadius: '8px' }}
                                                value={offlineBookingForm.discount}
                                                onChange={e => handleChangeOfflineDiscount(e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                                                Advance Paid (₹) — Default 50%
                                            </label>
                                            <input 
                                                type="number" 
                                                min="0"
                                                max={netDue}
                                                className="input-premium" 
                                                style={{ width: '100%', fontSize: '0.8rem', padding: '8px 12px', borderRadius: '8px' }}
                                                value={offlineBookingForm.paidAmount}
                                                onChange={e => setOfflineBookingForm(prev => ({ ...prev, paidAmount: e.target.value }))}
                                            />
                                        </div>
                                    </div>

                                    {/* Balance Rest Due Display */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', fontWeight: 600, color: restDue > 0 ? 'var(--danger)' : 'var(--success)', padding: '6px 4px 0', borderTop: '1px dashed var(--border-color)' }}>
                                        <div>Payment Method / Flow:</div>
                                        <div>Remaining Balance (Rest Due): ₹{restDue}</div>
                                    </div>
                                </div>
                            )}

                            {/* Booking & Payment Flows selectors */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>Booking Flow Mode</label>
                                    <select 
                                        className="input-premium" 
                                        style={{ width: '100%', fontSize: '0.85rem', padding: '10px 14px', borderRadius: '10px' }}
                                        value={offlineBookingForm.paymentType}
                                        onChange={e => setOfflineBookingForm(prev => ({ ...prev, paymentType: e.target.value }))}
                                    >
                                        <option value="offline">Direct Booking (Cash/UPI/Card)</option>
                                        <option value="link">Send Payment Link on WhatsApp</option>
                                    </select>
                                </div>

                                {offlineBookingForm.paymentType === 'offline' ? (
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>Payment Mode</label>
                                        <select 
                                            className="input-premium" 
                                            style={{ width: '100%', fontSize: '0.85rem', padding: '10px 14px', borderRadius: '10px' }}
                                            value={offlineBookingForm.paymentMethod}
                                            onChange={e => setOfflineBookingForm(prev => ({ ...prev, paymentMethod: e.target.value }))}
                                        >
                                            <option value="cash">Cash Payment</option>
                                            <option value="upi">UPI Direct Transfer</option>
                                            <option value="card">Card Payment</option>
                                            <option value="offline">Other / Offline Desk</option>
                                        </select>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)', padding: '10px 14px', borderRadius: '10px', marginTop: '22px' }}>
                                        <span className="material-icons-outlined" style={{ fontSize: '20px', color: 'var(--primary)', marginRight: '8px' }}>info</span>
                                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: '1.2' }}>
                                            The system will request Cashfree to generate a checkout link and forward it via WhatsApp to the user's phone.
                                        </span>
                                    </div>
                                )}
                            </div>

                        </div>

                        {/* Modal Footer Actions */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '32px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                            <button
                                type="button"
                                onClick={() => setShowOfflineBookingModal(false)}
                                style={{
                                    padding: '10px 20px',
                                    background: 'var(--bg-color)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '10px',
                                    cursor: 'pointer',
                                    fontSize: '0.82rem',
                                    fontWeight: 600,
                                    color: 'var(--text-muted)'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={bookingSubmitting || offlineBookingForm.timeSlots.length === 0}
                                style={{
                                    padding: '10px 24px',
                                    background: 'var(--gradient-2)',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '10px',
                                    cursor: (bookingSubmitting || offlineBookingForm.timeSlots.length === 0) ? 'not-allowed' : 'pointer',
                                    fontSize: '0.82rem',
                                    fontWeight: 600,
                                    boxShadow: '0 4px 12px rgba(16,185,129,0.25)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}
                            >
                                {bookingSubmitting ? (
                                    <>
                                        <div className="spinner" style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.2)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <span className="material-icons-outlined" style={{ fontSize: '16px' }}>check_circle</span>
                                        {offlineBookingForm.paymentType === 'link' ? 'Share Payment Link' : 'Register Booking'}
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
    };

    const renderBookingsReportModal = () => {
        if (!showBookingsReportModal) return null;
        const reportBookingsCount = bookingsLog.length;
        const reportPaidCount = bookingsLog.filter(b => b.paymentStatus === 'SUCCESS').length;
        const reportPendingCount = bookingsLog.filter(b => b.paymentStatus === 'PENDING').length;
        const reportFailedCount = bookingsLog.filter(b => b.paymentStatus === 'FAILED' || b.paymentStatus === 'CANCELLED').length;
        
        const getBookingNetRevenue = (b) => {
            if (b.paymentStatus === 'SUCCESS') return Number(b.paidAmount || 0);
            if (b.paymentStatus === 'CANCELLED') {
                const refund = b.paymentDetails?.refund;
                const isRefunded = refund && (refund.status === 'SUCCESS' || (refund.amount > 0 && refund.status !== 'SKIPPED' && refund.status !== 'FAILED_GATEWAY'));
                if (isRefunded) {
                    const refundAmt = Number(refund.amount || b.paidAmount || 0);
                    return Math.max(0, Number(b.paidAmount || 0) - refundAmt);
                } else {
                    return Number(b.paidAmount || 0);
                }
            }
            return 0;
        };

        const reportTotalRevenue = bookingsLog.reduce((sum, b) => sum + getBookingNetRevenue(b), 0);
        const reportTotalOutstanding = bookingsLog.filter(b => b.paymentStatus === 'PENDING').reduce((sum, b) => sum + ((b.totalAmount || 0) - (b.paidAmount || 0)), 0);
        
        const cricketBookings = bookingsLog.filter(b => b.sport === 'cricket');
        const footballBookings = bookingsLog.filter(b => b.sport === 'football');
        const netsBookings = bookingsLog.filter(b => b.sport === 'nets');
        
        const cricketRevenue = cricketBookings.reduce((sum, b) => sum + getBookingNetRevenue(b), 0);
        const footballRevenue = footballBookings.reduce((sum, b) => sum + getBookingNetRevenue(b), 0);
        const netsRevenue = netsBookings.reduce((sum, b) => sum + getBookingNetRevenue(b), 0);
        
        return (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }} onClick={() => setShowBookingsReportModal(false)}>
                <div className="bookings-report-modal" style={{ background: 'var(--card-bg)', borderRadius: '20px', width: '100%', maxWidth: '750px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 80px rgba(0,0,0,0.25)', border: '1px solid var(--border-color)', padding: '28px' }} onClick={e => e.stopPropagation()}>
                    
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }} className="no-print">
                        <div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 6px 0', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span className="material-icons-outlined" style={{ color: 'var(--primary)' }}>analytics</span> Turf Bookings Financial Report
                            </h3>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                                Generated on {new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                            </p>
                        </div>
                        <button onClick={() => setShowBookingsReportModal(false)} style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '10px', width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)' }}>
                            <span className="material-icons-outlined" style={{ fontSize: '18px' }}>close</span>
                        </button>
                    </div>

                    {/* Print Header */}
                    <div className="print-only mb-4" style={{ display: 'none' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '2px solid #000', paddingBottom: '10px' }}>
                            <div>
                                <h2 style={{ margin: 0, fontWeight: 900, fontSize: '1.6rem' }}>KHELO PATNA</h2>
                                <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Elite Sports Academy & Turf</span>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <h4 style={{ margin: 0 }}>Turf Bookings Financial Report</h4>
                                <span style={{ fontSize: '0.7rem', color: '#666' }}>Generated: {new Date().toLocaleString('en-IN')}</span>
                            </div>
                        </div>
                    </div>

                    {/* KPI Stats grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
                        {[
                            { label: 'Total Volume', value: reportBookingsCount, sub: `${reportPaidCount} paid · ${reportPendingCount} pending` },
                            { label: 'Total Revenue', value: formatINR(reportTotalRevenue), sub: 'Successful advances collected', color: 'var(--success)' },
                            { label: 'Outstanding Dues', value: formatINR(reportTotalOutstanding), sub: 'Pending balance amount', color: 'var(--danger)' },
                            { label: 'Collection Rate', value: `${((reportPaidCount / (reportBookingsCount || 1)) * 100).toFixed(0)}%`, sub: 'Paid vs unpaid ratio' }
                        ].map((k, i) => (
                            <div key={i} style={{ background: 'var(--bg-color)', borderRadius: '12px', padding: '14px', border: '1px solid var(--border-color)' }}>
                                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k.label}</div>
                                <div style={{ fontSize: '1.25rem', fontWeight: 800, margin: '6px 0 2px 0', color: k.color || 'inherit' }}>{k.value}</div>
                                <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>{k.sub}</div>
                            </div>
                        ))}
                    </div>

                    {/* Breakdown by Sport */}
                    <div style={{ marginBottom: '24px' }}>
                        <h4 style={{ fontSize: '0.85rem', fontWeight: 800, margin: '0 0 10px 0', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Revenue Breakdown by Sport</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                            <div style={{ padding: '14px', background: 'var(--bg-color)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.82rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                        <span className="material-icons-outlined" style={{ fontSize: '16px', color: 'var(--amber)' }}>sports_cricket</span> Cricket Turf
                                    </span>
                                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{cricketBookings.length} bookings</span>
                                </div>
                                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10B981' }}>{formatINR(cricketRevenue)}</div>
                            </div>
                            <div style={{ padding: '14px', background: 'var(--bg-color)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.82rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                        <span className="material-icons-outlined" style={{ fontSize: '16px', color: 'var(--emerald)' }}>grid_on</span> Cricket Nets
                                    </span>
                                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{netsBookings.length} bookings</span>
                                </div>
                                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#6366F1' }}>{formatINR(netsRevenue)}</div>
                            </div>
                            <div style={{ padding: '14px', background: 'var(--bg-color)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.82rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                        <span className="material-icons-outlined" style={{ fontSize: '16px', color: 'var(--emerald)' }}>sports_soccer</span> Football Turf
                                    </span>
                                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{footballBookings.length} bookings</span>
                                </div>
                                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#3B82F6' }}>{formatINR(footballRevenue)}</div>
                            </div>
                        </div>
                    </div>

                    {/* Financial Ledger Detail table */}
                    <div style={{ marginBottom: '24px' }}>
                        <h4 style={{ fontSize: '0.85rem', fontWeight: 800, margin: '0 0 10px 0', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Detailed Booking Ledger</h4>
                        <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', textAlign: 'left' }}>
                                <thead style={{ background: 'var(--bg-color)', position: 'sticky', top: 0, zIndex: 2 }}>
                                    <tr>
                                        <th style={{ padding: '8px 12px' }}>Customer</th>
                                        <th style={{ padding: '8px 12px' }}>Sport</th>
                                        <th style={{ padding: '8px 12px' }}>Date</th>
                                        <th style={{ padding: '8px 12px', textAlign: 'right' }}>Total</th>
                                        <th style={{ padding: '8px 12px', textAlign: 'right' }}>Paid</th>
                                        <th style={{ padding: '8px 12px', textAlign: 'center' }}>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {bookingsLog.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)' }}>No records available for selected filters.</td>
                                        </tr>
                                    ) : (
                                        bookingsLog.map((b, idx) => (
                                            <tr key={idx} style={{ borderTop: '1px solid var(--border-color)' }}>
                                                <td style={{ padding: '8px 12px', fontWeight: 600 }}>{b.customerName}</td>
                                                <td style={{ padding: '8px 12px', textTransform: 'capitalize' }}>{b.sport}</td>
                                                <td style={{ padding: '8px 12px' }}>{b.date}</td>
                                                <td style={{ padding: '8px 12px', textAlign: 'right' }}>{formatINR(b.totalAmount)}</td>
                                                <td style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--success)' }}>{formatINR(b.paidAmount)}</td>
                                                <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                                    <span style={{ fontSize: '0.65rem', fontWeight: 700, color: b.paymentStatus === 'SUCCESS' ? '#10B981' : b.paymentStatus === 'PENDING' ? '#F59E0B' : b.paymentStatus === 'DROPPED' ? '#D97706' : b.paymentStatus === 'CANCELLED' ? '#9CA3AF' : '#EF4444' }}>
                                                        {b.paymentStatus === 'CANCELLED' ? 'CANCELLED' : b.paymentStatus}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Footer / Print Trigger */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }} className="no-print">
                        <button onClick={() => setShowBookingsReportModal(false)} style={{ padding: '9px 18px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '10px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                            Close
                        </button>
                        <button onClick={() => window.print()} style={{ padding: '9px 22px', background: 'var(--gradient-1)', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, boxShadow: '0 4px 12px rgba(99,102,241,0.25)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span className="material-icons-outlined" style={{ fontSize: '16px' }}>print</span> Print Report
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const renderReceiptModal = () => {
        if (!activeReceipt) return null;
        return (
            <div className="printable-receipt-backdrop" style={{
                position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)',
                zIndex: 1100, display: 'flex', alignItems: 'center', justify: 'center'
            }}>
                <style>{`
                    @media print {
                        body * {
                            visibility: hidden;
                        }
                        .printable-receipt-card, .printable-receipt-card * {
                            visibility: visible;
                        }
                        .printable-receipt-card {
                            position: absolute;
                            left: 0;
                            top: 0;
                            width: 100%;
                            background: #ffffff !important;
                            color: #000000 !important;
                            padding: 24px;
                            box-shadow: none !important;
                        }
                        .no-print {
                            display: none !important;
                        }
                    }
                    @page {
                        size: landscape;
                    }
                `}</style>
                <div className="glass-card p-4 animate-fade-in printable-receipt-card" style={{ width: '90%', maxWidth: '750px', background: '#ffffff', color: '#000000', border: '1px solid rgba(0,0,0,0.15)', borderRadius: '15px', boxShadow: '0 20px 50px rgba(0,0,0,0.8)' }}>
                    <div className="d-flex justify-content-between align-items-center mb-4 pb-3 no-print" style={{ borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
                        <span style={{ fontWeight: 'bold', color: '#2563EB', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <span className="material-icons-outlined" style={{ fontSize: '18px' }}>print</span> Print Preview - Receipt Card
                        </span>
                        <button className="btn btn-sm btn-outline-secondary" onClick={() => setActiveReceipt(null)}>Close</button>
                    </div>

                    {/* Receipt Header */}
                    <div className="d-flex justify-content-between align-items-start mb-4">
                        <div>
                            <h2 style={{ fontSize: '1.4rem', fontWeight: 900, letterSpacing: '0.5px', margin: 0, color: '#000' }}>
                                KHELO <span style={{ color: '#2563EB' }}>PATNA</span>
                            </h2>
                            <span style={{ fontSize: '0.62rem', letterSpacing: '2px', fontWeight: 'bold', textTransform: 'uppercase', color: '#666' }}>
                                Elite Sports Academy
                            </span>
                            <div style={{ fontSize: '0.8rem', color: '#444', marginTop: '6px' }}>S.D. Public School Campus, Patna, Bihar</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#2563EB', margin: 0 }}>
                                {activeReceipt.method === 'DEMAND_NOTICE' ? 'DEMAND NOTICE' : 'OFFICIAL PAYMENT RECEIPT'}
                            </h3>
                            <div style={{ fontSize: '0.82rem', color: '#444', marginTop: '4px' }}>
                                Receipt ID: <code style={{ background: '#f4f4f5', padding: '2px 6px', borderRadius: '4px', color: '#000' }}>{activeReceipt.receiptNo.split('_')[1] || activeReceipt.receiptNo}</code>
                            </div>
                            <div style={{ fontSize: '0.82rem', color: '#444' }}>Date: {new Date(activeReceipt.date).toLocaleDateString('en-IN')}</div>
                        </div>
                    </div>

                    {/* Student Metadata */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', background: '#f4f4f5', padding: '15px', borderRadius: '10px', marginBottom: '25px', fontSize: '0.85rem' }}>
                        <div>
                            <div style={{ color: '#666' }}>Student Name:</div>
                            <strong style={{ fontSize: '1rem', color: '#000' }}>{activeReceipt.student.name}</strong>
                            <div style={{ color: '#444', marginTop: '4px' }}>Mobile: {activeReceipt.student.fatherMobile || 'N/A'}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ color: '#666' }}>Academy Batch:</div>
                            <strong style={{ fontSize: '1rem', color: '#000', textTransform: 'capitalize' }}>{activeReceipt.student.sport} Academy</strong>
                            <div style={{ color: '#444', marginTop: '4px' }}>Term: {activeReceipt.termName}</div>
                        </div>
                    </div>

                    {/* Billing details table */}
                    <table className="table" style={{ fontSize: '0.88rem', borderBottom: '1px solid #dee2e6', width: '100%' }}>
                        <thead>
                            <tr style={{ background: '#e4e4e7' }}>
                                <th style={{ color: '#000', textAlign: 'left', padding: '8px' }}>Description of Charges</th>
                                <th style={{ textAlign: 'right', color: '#000', width: '150px', padding: '8px' }}>Amount Due</th>
                            </tr>
                        </thead>
                        <tbody>
                            {activeReceipt.breakdown?.breakdown.map((item, idx) => (
                                <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                                    <td style={{ color: '#333', padding: '8px' }}>{item.name}</td>
                                    <td style={{ textAlign: 'right', color: '#000', padding: '8px' }}>₹{item.amount.toLocaleString('en-IN')}</td>
                                </tr>
                            ))}
                            {activeReceipt.breakdown?.appliedRebates.map((item, idx) => (
                                <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                                    <td style={{ color: '#10b981', fontStyle: 'italic', padding: '8px' }}>{item.name}</td>
                                    <td style={{ textAlign: 'right', color: '#10b981', padding: '8px' }}>-₹{Math.abs(item.amount).toLocaleString('en-IN')}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Totals and Payment block */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '20px' }}>
                        <div style={{ fontSize: '0.82rem', color: '#555' }}>
                            <div>Payment Method: <strong>{activeReceipt.method}</strong></div>
                            <div style={{ marginTop: '4px' }}>Status: <strong style={{ color: '#10b981' }}>{activeReceipt.method === 'DEMAND_NOTICE' ? 'PENDING' : 'COMPLETED'}</strong></div>
                        </div>
                        <div style={{ width: '250px', fontSize: '0.9rem', lineHeight: '1.6' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>Total Term Dues:</span>
                                <strong>₹{activeReceipt.breakdown?.totalDues.toLocaleString('en-IN')}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #ddd', paddingBottom: '6px' }}>
                                <span>{activeReceipt.method === 'DEMAND_NOTICE' ? 'Outstanding Dues:' : 'Collected Cash:'}</span>
                                <strong style={{ color: '#10b981' }}>₹{activeReceipt.amountPaid.toLocaleString('en-IN')}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '6px', fontSize: '1rem' }}>
                                <span>Balance Outstanding:</span>
                                <strong style={{ color: '#ef4444' }}>
                                    ₹{(activeReceipt.method === 'DEMAND_NOTICE' ? activeReceipt.amountPaid : (activeReceipt.breakdown?.outstanding || 0)).toLocaleString('en-IN')}
                                </strong>
                            </div>
                        </div>
                    </div>

                    {/* Signatures block */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '60px', fontSize: '0.82rem', borderTop: '1px dashed #ccc', paddingTop: '15px' }}>
                        <div style={{ color: '#555' }}>* Computer generated invoice. Signature not required.</div>
                        <div style={{ textAlign: 'center', width: '150px' }}>
                            <div style={{ borderBottom: '1px solid #333', height: '30px' }}></div>
                            <div style={{ marginTop: '6px', fontWeight: 'bold' }}>Academy Director</div>
                        </div>
                    </div>

                    {/* Action panel */}
                    <div className="d-flex gap-2 justify-content-end mt-4 no-print">
                        <button className="btn btn-secondary" onClick={() => setActiveReceipt(null)}>Close</button>
                        <button className="btn btn-primary-stripe" onClick={() => window.print()} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <span className="material-icons-outlined" style={{ fontSize: '18px' }}>print</span> Print Receipt (Landscape)
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    if (!authenticated) {
        return (
            <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '100vh', background: 'var(--bg-color)' }}>
                <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}></div>
            </div>
        );
    }

    const pendingWaivers = adjustmentRequests.filter(r => r.status === 'PENDING').length;
    const totalNotifications = (stats?.critical_stock_count || 0) + pendingWaivers;
    const pageMeta = {
        dashboard: {
            title: 'Operations Command',
            eyebrow: 'Live control room',
            description: 'Turf bookings, academy attendance, revenue, dues, and stock in one working view.',
            icon: 'dashboard_customize'
        },
        bookings: {
            title: 'Turf Desk',
            eyebrow: 'Bookings operations',
            description: 'Create walk-in bookings, track payments, reschedule slots, and review turf revenue.',
            icon: 'sports_soccer'
        },
        calendar: {
            title: 'Turf Control',
            eyebrow: 'Rates and availability',
            description: 'Manage rates, blackout hours, academy blocks, and closure rules.',
            icon: 'tune'
        },
        'admission-studio': {
            title: 'Admission Studio',
            eyebrow: 'Guided enrollment',
            description: 'Enroll students step by step — pick a sport, assign a batch, and apply the right fee plan automatically.',
            icon: 'how_to_reg'
        },
        'membership-management': {
            title: 'Membership CRM',
            eyebrow: 'Academy members',
            description: 'Search profiles, admit students, review documents, and manage member lifecycle.',
            icon: 'groups'
        },
        'academy-management': {
            title: 'Academy Intake',
            eyebrow: 'Enquiries and admissions',
            description: 'Convert enquiries, onboard players, and keep academy records updated.',
            icon: 'school'
        },
        'session-management': {
            title: 'Training Sessions',
            eyebrow: 'Academic calendar',
            description: 'Create academy terms and keep season windows clean.',
            icon: 'event_note'
        },
        'batch-management': {
            title: 'Batches',
            eyebrow: 'Training cohorts',
            description: 'Build rosters, assign coaches, and balance batch capacity.',
            icon: 'groups_2'
        },
        'coach-management': {
            title: 'Coaches',
            eyebrow: 'Staffed training',
            description: 'Manage coach profiles, schedules, specializations, and compensation.',
            icon: 'sports'
        },
        'attendance-management': {
            title: 'Attendance',
            eyebrow: 'Daily roll call',
            description: 'Mark attendance and keep parents informed through the operations flow.',
            icon: 'fact_check'
        },
        'membership-billing': {
            title: 'Billing Ledger',
            eyebrow: 'Payment records',
            description: 'Review every recorded payment, filter by month, and audit billing history.',
            icon: 'receipt_long'
        },
        finance: {
            title: 'Finance Desk',
            eyebrow: 'Collections',
            description: 'Collect fees, track dues, print receipts, and review account movement.',
            icon: 'account_balance_wallet'
        },
        'inventory-management': {
            title: 'Inventory',
            eyebrow: 'Stock and POS',
            description: 'Monitor equipment, consumables, store sales, and low-stock alerts.',
            icon: 'inventory_2'
        },
        hr: {
            title: 'Staff Access',
            eyebrow: 'Roles and permissions',
            description: 'Create staff logins and review access levels for the ERP.',
            icon: 'badge'
        },
        communication: {
            title: 'Messages',
            eyebrow: 'Comms center',
            description: 'Send WhatsApp updates, staff notices, group broadcasts, and email logs.',
            icon: 'campaign'
        },
        customers: {
            title: 'Customers',
            eyebrow: 'Player directory',
            description: 'Identify repeat players, academy links, and duplicate customer records.',
            icon: 'people'
        },
        website: {
            title: 'Website',
            eyebrow: 'Content controls',
            description: 'Manage site content, testimonials, and public-facing metadata.',
            icon: 'web'
        },
        integrations: {
            title: 'Integrations',
            eyebrow: 'Connected systems',
            description: 'Review payment, messaging, upload, and automation connections.',
            icon: 'hub'
        },
        settings: {
            title: 'Settings',
            eyebrow: 'System controls',
            description: 'Tune operational preferences and WhatsApp automation health.',
            icon: 'settings'
        },
        'audit-logs': {
            title: 'Audit Logs',
            eyebrow: 'Compliance trail',
            description: 'Review sensitive actions, staff activity, and tenant-level changes.',
            icon: 'history'
        }
    };
    const currentPage = pageMeta[activeSidebarKey] || pageMeta[activeTab] || pageMeta.dashboard;
    const todayLabel = new Date().toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' });

    return (
        <div className={`admin-erp-container ${sidebarOpen ? 'mobile-sidebar-open' : ''}`} data-theme={theme} style={{ display: 'flex', height: '100vh', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)', transition: 'background-color 0.2s, color 0.2s', overflow: 'hidden' }}>
            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

                :root {
                     --bg-color: #F1F5F9;
                     --card-bg: #FFFFFF;
                     --border-color: rgba(0,0,0,0.06);
                     --primary: #6366F1;
                     --primary-hover: #4F46E5;
                     --primary-light: rgba(99, 102, 241, 0.08);
                     --success: #10B981;
                     --success-light: rgba(16, 185, 129, 0.1);
                     --warning: #F59E0B;
                     --warning-light: rgba(245, 158, 11, 0.1);
                     --danger: #EF4444;
                     --danger-light: rgba(239, 68, 68, 0.1);
                     --text-main: #0F172A;
                     --text-muted: #64748B;
                     --input-bg: #FFFFFF;
                     --sidebar-bg: linear-gradient(195deg, #0F172A 0%, #1E293B 100%);
                     --sidebar-border: rgba(255,255,255,0.06);
                     --sidebar-text: rgba(255,255,255,0.55);
                     --sidebar-active-text: #FFFFFF;
                     --sidebar-active-bg: rgba(99, 102, 241, 0.25);
                     --shadow-sm: 0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02);
                     --shadow-md: 0 4px 16px rgba(0,0,0,0.06);
                     --shadow-lg: 0 12px 40px rgba(0,0,0,0.08);
                     --gradient-1: linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%);
                     --gradient-2: linear-gradient(135deg, #10B981 0%, #34D399 100%);
                     --gradient-3: linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%);
                     --gradient-4: linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%);
                     --gradient-5: linear-gradient(135deg, #EF4444 0%, #F87171 100%);
                     --success-text: #16a34a;
                     --success-bg: rgba(22, 163, 74, 0.06);
                     --success-border: rgba(22, 163, 74, 0.18);
                     --info: #2563EB;
                     --info-light: rgba(37, 99, 235, 0.1);
                     --purple: #7C3AED;
                     --purple-light: rgba(124, 58, 237, 0.1);
                     --white: #FFFFFF;
                     --text-on-primary: #FFFFFF;
                     --success-dark: #059669;
                     --danger-dark: #DC2626;
                 }

                 [data-theme='dark'] {
                     --bg-color: #0B1120;
                     --card-bg: rgba(30, 41, 59, 0.7);
                     --border-color: rgba(255,255,255,0.06);
                     --primary: #818CF8;
                     --primary-hover: #A5B4FC;
                     --primary-light: rgba(129, 140, 248, 0.12);
                     --success: #34D399;
                     --success-light: rgba(52, 211, 153, 0.12);
                     --warning: #FBBF24;
                     --warning-light: rgba(251, 191, 36, 0.12);
                     --danger: #F87171;
                     --danger-light: rgba(248, 113, 113, 0.12);
                     --text-main: #F1F5F9;
                     --text-muted: #94A3B8;
                     --input-bg: rgba(30, 41, 59, 0.8);
                     --sidebar-bg: linear-gradient(195deg, #070D1A 0%, #0F172A 100%);
                     --sidebar-border: rgba(255,255,255,0.04);
                     --sidebar-text: rgba(255,255,255,0.45);
                     --sidebar-active-text: #FFFFFF;
                     --sidebar-active-bg: rgba(129, 140, 248, 0.2);
                     --shadow-sm: 0 1px 3px rgba(0,0,0,0.3);
                     --shadow-md: 0 4px 16px rgba(0,0,0,0.3);
                     --shadow-lg: 0 12px 40px rgba(0,0,0,0.4);
                     --success-text: #34D399;
                     --success-bg: rgba(52, 211, 153, 0.12);
                     --success-border: rgba(52, 211, 153, 0.22);
                     --info: #60A5FA;
                     --info-light: rgba(96, 165, 250, 0.12);
                     --purple: #A78BFA;
                     --purple-light: rgba(167, 139, 250, 0.12);
                     --white: #FFFFFF;
                     --text-on-primary: #030806;
                     --success-dark: #10B981;
                     --danger-dark: #EF4444;
                 }

                * { box-sizing: border-box; }

                body {
                    margin: 0;
                    padding: 0;
                    background-color: var(--bg-color);
                    color: var(--text-main);
                    font-family: 'Inter', system-ui, -apple-system, sans-serif;
                    -webkit-font-smoothing: antialiased;
                    -moz-osx-font-smoothing: grayscale;
                }

                .admin-erp-container {
                    font-family: 'Inter', system-ui, -apple-system, sans-serif;
                }

                /* Sidebar Styles - Premium Dark Sidebar */
                .sidebar-container {
                    width: 272px;
                    background: #090E0C;
                    display: flex;
                    flex-direction: column;
                    height: 100vh;
                    position: sticky;
                    top: 0;
                    z-index: 100;
                    transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    flex-shrink: 0;
                    overflow: hidden;
                    border-right: 1px solid rgba(255, 255, 255, 0.06);
                }
                .sidebar-container::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 250px;
                    background: radial-gradient(circle at 10% 10%, rgba(16, 185, 129, 0.1) 0%, transparent 80%);
                    pointer-events: none;
                    z-index: 0;
                }
                .sidebar-container.collapsed {
                    width: 76px;
                }
                .sidebar-brand {
                    padding: 24px 20px 20px 20px;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    min-height: 76px;
                    overflow: hidden;
                    position: relative;
                    z-index: 1;
                    white-space: nowrap;
                    flex-shrink: 0;
                }
                .sidebar-container.collapsed .sidebar-brand {
                    padding: 20px 0;
                    justify-content: center;
                }
                .sidebar-brand-text {
                    overflow: hidden;
                    opacity: 1;
                    transition: opacity 0.2s ease;
                }
                .sidebar-container.collapsed .sidebar-brand-text {
                    opacity: 0;
                    width: 0;
                    margin: 0;
                    padding: 0;
                }
                .sidebar-container.collapsed .sidebar-brand img {
                    margin-right: 0 !important;
                }
                .sidebar-nav {
                    flex: 1;
                    padding: 6px 18px;
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                    overflow-y: auto;
                    overflow-x: hidden;
                    scrollbar-width: none;
                    position: relative;
                    z-index: 1;
                }
                .sidebar-nav::-webkit-scrollbar { display: none; }
                .sidebar-container.collapsed .sidebar-nav {
                    padding: 8px 14px;
                    align-items: center;
                }
                .sidebar-link {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 8px 12px;
                    border-radius: 12px;
                    color: rgba(255, 255, 255, 0.72);
                    background: transparent;
                    border: none;
                    text-align: left;
                    font-weight: 500;
                    font-size: 0.83rem;
                    cursor: pointer;
                    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
                    white-space: nowrap;
                    overflow: visible;
                    position: relative;
                    width: 100%;
                    letter-spacing: 0.01em;
                    flex-shrink: 0;
                }
                .sidebar-link:focus,
                .sidebar-link:active,
                .sidebar-link:focus-visible {
                    outline: none !important;
                    box-shadow: none !important;
                }
                .sidebar-container.collapsed .sidebar-link {
                    padding: 0;
                    justify-content: center;
                    width: 48px;
                    height: 48px;
                    border-radius: 14px;
                }
                .sidebar-link-label {
                    overflow: hidden;
                    opacity: 1;
                    transition: opacity 0.15s ease;
                }
                .sidebar-container.collapsed .sidebar-link-label {
                    opacity: 0;
                    width: 0;
                    position: absolute;
                    pointer-events: none;
                }
                .sidebar-link .sidebar-icon-wrap {
                    width: 32px;
                    height: 32px;
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid rgba(255, 255, 255, 0.04);
                    transition: all 0.25s;
                    color: inherit;
                }
                .sidebar-container.collapsed .sidebar-link .sidebar-icon-wrap {
                    width: 100%;
                    height: 100%;
                    border-radius: 14px;
                    background: transparent;
                    border: none;
                }
                .sidebar-link:hover {
                    color: #FFFFFF;
                    background: rgba(255, 255, 255, 0.03);
                    transform: translateX(4px);
                }
                .sidebar-container.collapsed .sidebar-link:hover {
                    transform: none;
                    background: rgba(255, 255, 255, 0.06);
                }
                .sidebar-link:hover .sidebar-icon-wrap {
                    background: rgba(16, 185, 129, 0.1);
                    border-color: rgba(16, 185, 129, 0.25);
                    color: var(--emerald);
                }
                .sidebar-link.active {
                    background: linear-gradient(135deg, rgba(16, 185, 129, 0.14) 0%, rgba(5, 150, 105, 0.04) 100%);
                    color: #FFFFFF;
                    font-weight: 600;
                    box-shadow: inset 0 1px 1px rgba(255,255,255,0.05);
                }
                .active-indicator {
                    position: absolute;
                    left: -10px;
                    top: 10px;
                    bottom: 10px;
                    width: 3px;
                    background: var(--emerald);
                    border-radius: 4px;
                    box-shadow: 0 0 10px rgba(0, 255, 136, 0.7);
                    z-index: 2;
                }
                .sidebar-container.collapsed .active-indicator {
                    left: 2px;
                    top: 8px;
                    bottom: 8px;
                    width: 3px;
                }
                .sidebar-link.active .sidebar-icon-wrap {
                    background: linear-gradient(135deg, var(--emerald) 0%, var(--emerald-dark) 100%);
                    border: none;
                    color: #030806;
                    box-shadow: 0 4px 14px rgba(0, 255, 136, 0.35);
                }
                .sidebar-container.collapsed .sidebar-link.active {
                    background: linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.04) 100%);
                    border-left: none;
                }
                .sidebar-container.collapsed .sidebar-link.active .sidebar-icon-wrap {
                    background: linear-gradient(135deg, var(--emerald) 0%, var(--emerald-dark) 100%);
                    box-shadow: 0 4px 14px rgba(0, 255, 136, 0.35);
                }
                .sidebar-footer {
                    padding: 12px;
                    position: relative;
                    z-index: 1;
                    flex-shrink: 0;
                }
                .sidebar-container.collapsed .sidebar-footer {
                    padding: 12px 14px;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                }
                .sidebar-section-label {
                    font-size: 0.72rem;
                    font-weight: 700;
                    color: var(--emerald);
                    opacity: 0.78;
                    letter-spacing: 0.1em;
                    text-transform: uppercase;
                    padding: 14px 12px 6px 12px;
                    margin-top: 16px;
                    transition: opacity 0.15s ease;
                    white-space: nowrap;
                    overflow: hidden;
                    position: relative;
                    /* Prevent the label being crushed to 0 height when the
                       flex-column nav overflows (overflow:hidden makes its
                       automatic minimum size 0, so it shrinks first). */
                    flex-shrink: 0;
                }
                .sidebar-section-label:first-child {
                    padding-top: 4px;
                }
                .sidebar-container.collapsed .sidebar-section-label {
                    opacity: 0;
                    height: 0;
                    padding: 0;
                    margin: 0;
                    overflow: hidden;
                }
                .sidebar-collapse-btn {
                    position: absolute;
                    top: 24px;
                    right: -13px;
                    width: 26px;
                    height: 26px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, var(--emerald) 0%, var(--emerald-dark) 100%);
                    border: 2px solid #0A1510;
                    color: #030806;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    z-index: 200;
                    box-shadow: 0 2px 8px rgba(0, 255, 136, 0.35);
                    transition: transform 0.2s, box-shadow 0.2s;
                }
                .sidebar-collapse-btn:hover {
                    transform: scale(1.15);
                    box-shadow: 0 4px 12px rgba(0, 255, 136, 0.5);
                }

                /* Topbar Styles */
                .topbar-container {
                    height: 64px;
                    background: rgba(241, 245, 249, 0.8);
                    backdrop-filter: blur(16px);
                    -webkit-backdrop-filter: blur(16px);
                    border-bottom: 1px solid var(--border-color);
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 0 28px;
                    position: sticky;
                    top: 0;
                    z-index: 90;
                }
                [data-theme='dark'] .topbar-container {
                    background: rgba(11, 17, 32, 0.75);
                }
                .search-box {
                    display: flex;
                    align-items: center;
                    background: var(--card-bg);
                    border: 1px solid var(--border-color);
                    border-radius: 12px;
                    padding: 8px 14px;
                    gap: 10px;
                    width: 340px;
                    transition: border-color 0.2s, box-shadow 0.2s;
                }
                .search-box:hover {
                    border-color: var(--primary);
                    box-shadow: 0 0 0 3px rgba(99,102,241,0.08);
                }
                .search-input {
                    background: transparent;
                    border: none;
                    outline: none;
                    color: var(--text-main);
                    font-size: 0.88rem;
                    width: 100%;
                    font-family: inherit;
                }
                .search-box span {
                    color: var(--text-muted);
                    font-size: 20px;
                }
                .status-badge {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 0.78rem;
                    font-weight: 600;
                    color: var(--text-muted);
                    background: var(--card-bg);
                    border: 1px solid var(--border-color);
                    padding: 6px 14px;
                    border-radius: 24px;
                    transition: all 0.2s;
                }
                .status-dot {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    display: inline-block;
                    animation: pulse-dot 2s ease-in-out infinite;
                }
                @keyframes pulse-dot {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.4; }
                }
                .theme-toggle {
                    background: var(--card-bg);
                    border: 1px solid var(--border-color);
                    color: var(--text-main);
                    padding: 8px;
                    border-radius: 10px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s;
                }
                .theme-toggle:hover {
                    background: var(--primary-light);
                    border-color: var(--primary);
                    color: var(--primary);
                }

                /* Cards and UI elements */
                .card-premium {
                    background: var(--card-bg);
                    border: 1px solid var(--border-color);
                    border-radius: 16px;
                    box-shadow: var(--shadow-sm);
                    padding: 24px;
                    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .card-premium:hover {
                    box-shadow: var(--shadow-md);
                    transform: translateY(-1px);
                }
                .input-premium {
                    background: var(--input-bg);
                    border: 1px solid var(--border-color);
                    border-radius: 8px;
                    color: var(--text-main);
                    padding: 8px 12px;
                    outline: none;
                    font-family: inherit;
                    font-size: 0.92rem;
                    box-sizing: border-box;
                    width: 100%;
                    transition: border-color 0.2s ease;
                }
                .input-premium:focus {
                    border-color: var(--primary);
                }
                .btn-primary-stripe {
                    background: var(--primary);
                    color: #FFFFFF !important;
                    font-weight: 500;
                    padding: 8px 16px;
                    border: none;
                    border-radius: 8px;
                    font-family: inherit;
                    font-size: 0.9rem;
                    cursor: pointer;
                    transition: background-color 0.2s ease;
                }
                .btn-primary-stripe:hover {
                    background: var(--primary-hover);
                }
                .btn-secondary-stripe {
                    background: var(--card-bg);
                    border: 1px solid var(--border-color);
                    color: var(--text-main);
                    font-weight: 500;
                    padding: 8px 16px;
                    border-radius: 8px;
                    font-family: inherit;
                    font-size: 0.9rem;
                    cursor: pointer;
                    transition: background-color 0.2s ease;
                }
                .btn-secondary-stripe:hover {
                    background: var(--bg-color);
                }

                /* Table styles */
                .table-premium {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 0.88rem;
                }
                .table-premium th {
                    background: var(--bg-color);
                    color: var(--text-muted);
                    font-weight: 600;
                    text-align: left;
                    padding: 12px 16px;
                    border-bottom: 1px solid var(--border-color);
                }
                .table-premium td {
                    padding: 12px 16px;
                    border-bottom: 1px solid var(--border-color);
                    color: var(--text-main);
                }
                .table-premium tr:hover td {
                    background: var(--primary-light);
                }

                /* Badges */
                .badge-stripe {
                    display: inline-block;
                    padding: 4px 8px;
                    font-size: 0.75rem;
                    font-weight: 600;
                    border-radius: 6px;
                }
                .badge-success {
                    background: rgba(16, 185, 129, 0.08);
                    color: #10B981;
                }
                .badge-danger {
                    background: rgba(239, 68, 68, 0.08);
                    color: #EF4444;
                }
                .badge-warning {
                    background: rgba(245, 158, 11, 0.08);
                    color: #F59E0B;
                }

                /* Calendar Grid */
                .calendar-header-grid {
                    display: grid;
                    grid-template-columns: repeat(7, 1fr);
                    border-bottom: 1px solid var(--border-color);
                    background: var(--bg-color);
                    padding: 8px 0;
                }
                .calendar-header-cell {
                    text-align: center;
                    font-weight: 600;
                    font-size: 0.8rem;
                    color: var(--text-muted);
                }
                .calendar-days-grid {
                    display: grid;
                    grid-template-columns: repeat(7, 1fr);
                    gap: 1px;
                    background: var(--border-color);
                }
                .calendar-day-cell {
                    background: var(--card-bg);
                    min-height: 100px;
                    padding: 8px;
                    display: flex;
                    flex-direction: column;
                    position: relative;
                }
                .calendar-day-cell.empty {
                    background: var(--bg-color);
                }
                .day-number {
                    font-weight: 700;
                    font-size: 0.8rem;
                    color: var(--text-muted);
                    margin-bottom: 6px;
                }
                .day-events-container {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    gap: 3px;
                    overflow-y: auto;
                }
                .calendar-event-tag {
                    font-size: 0.7rem;
                    background: var(--primary-light);
                    color: var(--primary);
                    padding: 2px 4px;
                    border-radius: 4px;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                /* Sub Tabs Nav */
                .sub-tab-link {
                    background: transparent;
                    border: none;
                    color: var(--text-muted);
                    font-weight: 500;
                    padding: 8px 12px;
                    font-size: 0.9rem;
                    cursor: pointer;
                    border-bottom: 2px solid transparent;
                }
                .sub-tab-link.active {
                    color: var(--primary);
                    border-bottom-color: var(--primary);
                    font-weight: 600;
                }

                /* Student CRM List */
                .student-crm-list-item {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    background: var(--card-bg);
                    border: 1px solid var(--border-color);
                    padding: 12px 16px;
                    border-radius: 8px;
                    cursor: pointer;
                    width: 100%;
                    transition: background-color 0.2s;
                }
                .student-crm-list-item:hover {
                    background: var(--bg-color);
                }
                .student-crm-list-item.active {
                    border-color: var(--primary);
                    background: var(--primary-light);
                }

                /* Alert Banners */
                .alert-premium {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 14px 18px;
                    border-radius: 8px;
                    margin-bottom: 20px;
                    font-size: 0.9rem;
                    font-weight: 500;
                }
                .alert-danger {
                    background: rgba(239, 68, 68, 0.08);
                    border: 1px solid rgba(239, 68, 68, 0.2);
                    color: #EF4444;
                }
                .alert-success {
                    background: rgba(16, 185, 129, 0.08);
                    border: 1px solid rgba(16, 185, 129, 0.2);
                    color: #10B981;
                }

                /* Loading card */
                .loading-card {
                    background: var(--card-bg);
                    border: 1px solid var(--border-color);
                    padding: 20px;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 12px;
                    margin-bottom: 20px;
                }
                .spinner {
                    border: 3px solid var(--border-color);
                    border-top: 3px solid var(--primary);
                    border-radius: 50%;
                    width: 20px;
                    height: 20px;
                    animation: spin 0.8s linear infinite;
                }
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }

                /* Modal Overlay */
                .receipt-modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(15, 23, 42, 0.65);
                    backdrop-filter: blur(4px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                }
                .receipt-modal-container {
                    background: #FFFFFF;
                    color: #0F172A;
                    width: 100%;
                    max-width: 500px;
                    padding: 24px;
                    border-radius: 12px;
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
                }
                .receipt-invoice-body h2 {
                    margin: 0;
                    font-weight: 800;
                    letter-spacing: 0.5px;
                }

                @media print {
                    body * {
                        visibility: hidden;
                    }
                    .receipt-modal-container, .receipt-modal-container *,
                    .bookings-report-modal, .bookings-report-modal * {
                        visibility: visible;
                    }
                    .receipt-modal-container, .bookings-report-modal {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        box-shadow: none !important;
                        background: #fff !important;
                        color: #000 !important;
                    }
                    .no-print {
                        display: none !important;
                    }
                    .print-only {
                        display: block !important;
                    }
                }
                .print-only {
                    display: none;
                }
                @page {
                    size: landscape;
                }



                .sidebar-venue-card {
                    padding: 10px 14px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    background: rgba(255,255,255,0.04);
                    border-radius: 10px;
                    margin: 8px 12px;
                    cursor: pointer;
                    border: 1px solid rgba(255,255,255,0.06);
                    transition: all 0.2s ease;
                    flex-shrink: 0;
                }
                .sidebar-venue-card:hover {
                    background: rgba(255,255,255,0.08);
                    border-color: rgba(255,255,255,0.12);
                }
                .topbar-notification {
                    position: relative;
                    background: var(--card-bg);
                    border: 1px solid var(--border-color);
                    color: var(--text-muted);
                    padding: 8px;
                    border-radius: 10px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s;
                }
                .topbar-notification:hover {
                    background: var(--primary-light);
                    color: var(--primary);
                    border-color: var(--primary);
                }
                .notification-badge {
                    position: absolute;
                    top: -4px;
                    right: -4px;
                    background: var(--danger);
                    color: #fff;
                    font-size: 0.6rem;
                    font-weight: 700;
                    width: 16px;
                    height: 16px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .user-profile-pill {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 4px 12px 4px 4px;
                    border: 1px solid var(--border-color);
                    border-radius: 24px;
                    cursor: pointer;
                    background: var(--card-bg);
                    transition: border-color 0.2s;
                }
                .user-profile-pill:hover {
                    border-color: var(--primary);
                }
                .user-avatar {
                    width: 34px;
                    height: 34px;
                    border-radius: 50%;
                    background: var(--gradient-1);
                    color: #fff;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 700;
                    font-size: 0.85rem;
                }
                .search-shortcut-badge {
                    font-size: 0.7rem;
                    font-weight: 600;
                    color: var(--text-muted);
                    background: var(--card-bg);
                    border: 1px solid var(--border-color);
                    border-radius: 4px;
                    padding: 2px 6px;
                    white-space: nowrap;
                }

                /* New-gen admin refresh */
                :root {
                    --bg-color: #F0F4F2;
                    --card-bg: rgba(255, 255, 255, 0.94);
                    --border-color: rgba(18, 28, 35, 0.14);
                    --primary: #047857;
                    --primary-hover: #065F46;
                    --primary-light: rgba(4, 120, 87, 0.09);
                    --success: #059669;
                    --success-light: rgba(5, 150, 105, 0.11);
                    --warning: #D97706;
                    --warning-light: rgba(217, 119, 6, 0.11);
                    --danger: #E11D48;
                    --danger-light: rgba(225, 29, 72, 0.1);
                    --text-main: #0F172A;
                    --text-muted: #475569;
                    --input-bg: #FFFFFF;
                    --surface-tint: rgba(226, 232, 240, 0.85);
                    --sidebar-bg: #07100D;
                    --sidebar-border: rgba(255, 255, 255, 0.08);
                    --shadow-sm: 0 1px 3px rgba(10, 18, 24, 0.06);
                    --shadow-md: 0 12px 30px rgba(10, 18, 24, 0.09);
                    --shadow-lg: 0 24px 70px rgba(10, 18, 24, 0.15);
                    --gradient-1: linear-gradient(135deg, #047857 0%, #059669 50%, #0F8F6A 100%);
                    --gradient-2: linear-gradient(135deg, #2563EB 0%, #1d4ed8 100%);
                    --gradient-3: linear-gradient(135deg, #D97706 0%, #b45309 100%);
                    --gradient-4: linear-gradient(135deg, #7C3AED 0%, #6d28d9 100%);
                    --gradient-5: linear-gradient(135deg, #E11D48 0%, #be123c 100%);
                    --success-text: #047857;
                    --success-bg: rgba(4, 120, 87, 0.1);
                    --success-border: rgba(4, 120, 87, 0.25);
                    --warning-border: rgba(217, 119, 6, 0.3);
                    --danger-border: rgba(225, 29, 72, 0.28);
                    --info: #1d4ed8;
                    --info-light: rgba(29, 78, 216, 0.1);
                    --purple: #6d28d9;
                    --purple-light: rgba(109, 40, 217, 0.1);
                    --white: #FFFFFF;
                    --text-on-primary: #FFFFFF;
                    --success-dark: #047857;
                    --danger-dark: #BE123C;
                }

                [data-theme='dark'] {
                    --bg-color: #070B10;
                    --card-bg: rgba(18, 28, 38, 0.88);
                    --border-color: rgba(255, 255, 255, 0.14);
                    --primary: #34D399;
                    --primary-hover: #6EE7B7;
                    --primary-light: rgba(52, 211, 153, 0.15);
                    --success: #34D399;
                    --success-light: rgba(52, 211, 153, 0.15);
                    --warning: #FBBF24;
                    --warning-light: rgba(251, 191, 36, 0.15);
                    --danger: #FB7185;
                    --danger-light: rgba(251, 113, 133, 0.15);
                    --text-main: #F8FAFC;
                    --text-muted: #94A3B8;
                    --input-bg: rgba(12, 20, 28, 0.92);
                    --surface-tint: rgba(255, 255, 255, 0.08);
                    --sidebar-bg: #040806;
                    --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.3);
                    --shadow-md: 0 18px 42px rgba(0, 0, 0, 0.4);
                    --shadow-lg: 0 28px 80px rgba(0, 0, 0, 0.5);
                    --success-text: #34D399;
                    --success-bg: rgba(52, 211, 153, 0.15);
                    --success-border: rgba(52, 211, 153, 0.3);
                    --warning-border: rgba(251, 191, 36, 0.3);
                    --danger-border: rgba(251, 113, 133, 0.3);
                    --info: #60A5FA;
                    --info-light: rgba(96, 165, 250, 0.15);
                    --purple: #A78BFA;
                    --purple-light: rgba(167, 139, 250, 0.15);
                    --white: #FFFFFF;
                    --text-on-primary: #030806;
                    --success-dark: #10B981;
                    --danger-dark: #EF4444;
                }

                body:has(.admin-erp-container) .floating-orb {
                    display: none;
                }

                .admin-erp-container {
                    isolation: isolate;
                    background:
                        linear-gradient(90deg, rgba(15, 143, 106, 0.045) 1px, transparent 1px),
                        linear-gradient(rgba(37, 99, 235, 0.035) 1px, transparent 1px),
                        radial-gradient(circle at 18% 4%, rgba(15, 143, 106, 0.18), transparent 30%),
                        radial-gradient(circle at 86% 14%, rgba(37, 99, 235, 0.14), transparent 28%),
                        var(--bg-color) !important;
                    background-size: 32px 32px, 32px 32px, auto, auto, auto;
                }

                [data-theme='dark'].admin-erp-container {
                    background:
                        linear-gradient(90deg, rgba(52, 211, 153, 0.045) 1px, transparent 1px),
                        linear-gradient(rgba(96, 165, 250, 0.035) 1px, transparent 1px),
                        radial-gradient(circle at 18% 4%, rgba(52, 211, 153, 0.12), transparent 30%),
                        radial-gradient(circle at 86% 14%, rgba(59, 130, 246, 0.1), transparent 28%),
                        var(--bg-color) !important;
                    background-size: 32px 32px, 32px 32px, auto, auto, auto;
                }

                .sidebar-container {
                    width: 292px;
                    background:
                        linear-gradient(180deg, rgba(10, 26, 20, 0.96), rgba(4, 8, 7, 0.98)),
                        var(--sidebar-bg);
                    border-right: 1px solid var(--sidebar-border);
                    box-shadow: 18px 0 56px rgba(4, 8, 7, 0.22);
                }
                .sidebar-container::before {
                    height: 360px;
                    background:
                        radial-gradient(circle at 24px 20px, rgba(52, 211, 153, 0.22), transparent 34%),
                        linear-gradient(180deg, rgba(255, 255, 255, 0.04), transparent);
                    opacity: 0.9;
                }
                .sidebar-brand {
                    min-height: 86px;
                }
                .sidebar-link {
                    min-height: 42px;
                    border-radius: 8px;
                    padding: 8px 10px;
                    color: rgba(238, 248, 244, 0.68);
                    font-size: 0.82rem;
                }
                .sidebar-link:hover {
                    background: rgba(255, 255, 255, 0.055);
                    transform: translateX(3px);
                }
                .sidebar-link .sidebar-icon-wrap {
                    width: 30px;
                    height: 30px;
                    border-radius: 8px;
                }
                .sidebar-link.active {
                    background: linear-gradient(135deg, rgba(52, 211, 153, 0.22), rgba(37, 99, 235, 0.08));
                    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.07), 0 12px 30px rgba(0, 0, 0, 0.15);
                }
                .sidebar-link.active .sidebar-icon-wrap {
                    background: #D8FFF0;
                    color: #063C2D;
                    box-shadow: 0 0 0 1px rgba(216, 255, 240, 0.35);
                }
                .active-indicator {
                    background: #8BFFC9;
                    box-shadow: 0 0 18px rgba(139, 255, 201, 0.74);
                }
                .sidebar-section-label {
                    color: rgba(216, 255, 240, 0.64);
                    font-size: 0.66rem;
                    padding: 14px 10px 6px;
                }
                .sidebar-venue-card,
                .sidebar-footer button {
                    border-radius: 8px !important;
                }

                .topbar-container {
                    height: 72px;
                    background: rgba(248, 251, 249, 0.76);
                    backdrop-filter: blur(24px) saturate(145%);
                    -webkit-backdrop-filter: blur(24px) saturate(145%);
                    border-bottom: 1px solid var(--border-color);
                    padding: 0 28px;
                }
                [data-theme='dark'] .topbar-container {
                    background: rgba(7, 11, 16, 0.72);
                }
                .mobile-menu-button {
                    display: none;
                    align-items: center;
                    justify-content: center;
                    width: 40px;
                    height: 40px;
                    border-radius: 8px;
                    border: 1px solid var(--border-color);
                    background: var(--card-bg);
                    color: var(--text-main);
                    cursor: pointer;
                }
                .search-box {
                    width: min(420px, 48vw);
                    height: 42px;
                    border-radius: 8px;
                    background: rgba(255, 255, 255, 0.72);
                    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.58);
                }
                [data-theme='dark'] .search-box {
                    background: rgba(18, 28, 38, 0.72);
                }
                .search-box:hover {
                    border-color: rgba(15, 143, 106, 0.42);
                    box-shadow: 0 0 0 4px var(--primary-light);
                }
                .status-badge,
                .topbar-notification,
                .theme-toggle,
                .user-profile-pill {
                    border-radius: 8px;
                    background: var(--card-bg);
                    box-shadow: var(--shadow-sm);
                }
                .user-avatar {
                    border-radius: 8px;
                }

                .admin-content-shell {
                    background: transparent;
                }
                .workspace-header {
                    display: grid;
                    grid-template-columns: minmax(0, 1fr) auto;
                    gap: 18px;
                    align-items: center;
                    margin-bottom: 22px;
                    padding: 18px 20px;
                    background: linear-gradient(135deg, rgba(255, 255, 255, 0.76), rgba(255, 255, 255, 0.38));
                    border: 1px solid var(--border-color);
                    border-radius: 8px;
                    box-shadow: var(--shadow-sm);
                    backdrop-filter: blur(20px) saturate(140%);
                    -webkit-backdrop-filter: blur(20px) saturate(140%);
                }
                [data-theme='dark'] .workspace-header {
                    background: linear-gradient(135deg, rgba(18, 28, 38, 0.82), rgba(18, 28, 38, 0.42));
                }
                .workspace-title-row {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    min-width: 0;
                }
                .workspace-icon {
                    width: 42px;
                    height: 42px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 8px;
                    background: var(--gradient-2);
                    color: #fff;
                    box-shadow: 0 12px 24px rgba(15, 143, 106, 0.2);
                    flex: 0 0 auto;
                }
                .workspace-eyebrow {
                    margin: 0 0 2px;
                    font-size: 0.68rem;
                    font-weight: 800;
                    letter-spacing: 0.12em;
                    text-transform: uppercase;
                    color: var(--primary);
                }
                .workspace-header h1 {
                    margin: 0;
                    color: var(--text-main);
                    font-family: 'Inter', system-ui, sans-serif !important;
                    font-size: 1.35rem;
                    letter-spacing: 0;
                    line-height: 1.15;
                }
                .workspace-description {
                    margin: 7px 0 0;
                    color: var(--text-muted);
                    font-size: 0.86rem;
                    max-width: 760px;
                }
                .workspace-chips {
                    display: flex;
                    justify-content: flex-end;
                    align-items: center;
                    gap: 8px;
                    flex-wrap: wrap;
                }
                .workspace-chip {
                    display: inline-flex;
                    align-items: center;
                    gap: 7px;
                    min-height: 34px;
                    padding: 7px 10px;
                    border: 1px solid var(--border-color);
                    border-radius: 8px;
                    background: var(--surface-tint);
                    color: var(--text-muted);
                    font-size: 0.76rem;
                    font-weight: 700;
                    white-space: nowrap;
                }
                .workspace-chip strong {
                    color: var(--text-main);
                }

                .dashboard-next {
                    gap: 20px !important;
                }
                .dashboard-hero {
                    display: grid !important;
                    grid-template-columns: minmax(0, 1fr) auto;
                    gap: 18px !important;
                    align-items: stretch !important;
                    padding: 18px;
                    border: 1px solid var(--border-color);
                    border-radius: 8px;
                    background:
                        linear-gradient(135deg, rgba(15, 143, 106, 0.12), rgba(37, 99, 235, 0.06)),
                        var(--card-bg);
                    box-shadow: var(--shadow-sm);
                    overflow: hidden;
                }
                .dashboard-hero h1 {
                    color: var(--text-main);
                    font-family: 'Inter', system-ui, sans-serif !important;
                    font-size: 1.45rem !important;
                    letter-spacing: 0 !important;
                }
                .dashboard-hero p {
                    max-width: 680px;
                }
                .dashboard-action-grid {
                    display: grid !important;
                    grid-template-columns: repeat(2, minmax(150px, 1fr));
                    gap: 8px !important;
                    align-content: center;
                    min-width: 330px;
                }
                .dashboard-action-grid button {
                    border-radius: 8px !important;
                    min-height: 44px;
                    background: rgba(255, 255, 255, 0.62) !important;
                    border: 1px solid var(--border-color) !important;
                    box-shadow: var(--shadow-sm);
                }
                [data-theme='dark'] .dashboard-action-grid button {
                    background: rgba(18, 28, 38, 0.64) !important;
                }
                .dashboard-kpi-grid {
                    grid-template-columns: repeat(auto-fit, minmax(174px, 1fr)) !important;
                    gap: 12px !important;
                }
                .metric-card {
                    border-radius: 8px !important;
                    padding: 16px !important;
                }
                .dashboard-bento-grid {
                    grid-template-columns: minmax(0, 1.35fr) minmax(280px, 0.9fr) minmax(260px, 0.8fr) !important;
                    gap: 14px !important;
                }

                .card-premium {
                    background: var(--card-bg);
                    border: 1px solid var(--border-color);
                    border-radius: 8px;
                    box-shadow: var(--shadow-sm);
                    backdrop-filter: blur(18px) saturate(135%);
                    -webkit-backdrop-filter: blur(18px) saturate(135%);
                    overflow: hidden;
                }
                .card-premium:hover {
                    transform: translateY(-1px);
                    box-shadow: var(--shadow-md);
                    border-color: rgba(15, 143, 106, 0.2);
                }
                .input-premium {
                    min-height: 40px;
                    border-radius: 10px !important;
                    background: var(--input-bg) !important;
                    border: 1.5px solid var(--border-color) !important;
                    color: var(--text-main) !important;
                    font-weight: 600;
                    font-size: 0.9rem;
                    padding: 8px 14px;
                    transition: all 0.2s ease;
                }
                .input-premium::placeholder {
                    color: var(--text-muted);
                    opacity: 0.85;
                }
                .input-premium:focus {
                    border-color: var(--primary) !important;
                    box-shadow: 0 0 0 4px var(--primary-light) !important;
                }
                .btn-primary-stripe,
                .btn-secondary-stripe {
                    min-height: 40px;
                    border-radius: 10px;
                    font-weight: 700;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    padding: 8px 20px;
                    font-size: 0.88rem;
                    letter-spacing: -0.01em;
                    transition: all 0.2s ease;
                }
                .btn-primary-stripe {
                    background: linear-gradient(135deg, #047857 0%, #059669 50%, #0F8F6A 100%) !important;
                    color: #FFFFFF !important;
                    border: 1px solid rgba(255, 255, 255, 0.25) !important;
                    box-shadow: 0 4px 14px rgba(4, 120, 87, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.3);
                }
                .btn-primary-stripe:hover {
                    background: linear-gradient(135deg, #065F46 0%, #047857 50%, #059669 100%) !important;
                    box-shadow: 0 6px 20px rgba(4, 120, 87, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.4);
                    transform: translateY(-1px);
                    color: #FFFFFF !important;
                }
                [data-theme='dark'] .btn-primary-stripe {
                    background: linear-gradient(135deg, #10B981 0%, #059669 100%) !important;
                    color: #030806 !important;
                    border: 1px solid rgba(255, 255, 255, 0.3) !important;
                    box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.35);
                }
                [data-theme='dark'] .btn-primary-stripe:hover {
                    background: linear-gradient(135deg, #34D399 0%, #10B981 100%) !important;
                    box-shadow: 0 6px 20px rgba(52, 211, 153, 0.5);
                    color: #030806 !important;
                }

                .btn-secondary-stripe {
                    background: var(--surface-tint) !important;
                    border: 1.5px solid var(--border-color) !important;
                    color: var(--text-main) !important;
                    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
                }
                .btn-secondary-stripe:hover {
                    background: var(--card-bg) !important;
                    border-color: var(--primary) !important;
                    color: var(--primary) !important;
                    transform: translateY(-1px);
                }
                .table-responsive {
                    border-radius: 8px;
                }
                .table-premium th {
                    background: rgba(4, 120, 87, 0.08);
                    color: var(--text-muted);
                    font-weight: 700;
                    font-size: 0.76rem;
                    letter-spacing: 0.05em;
                    text-transform: uppercase;
                }
                .table-premium td,
                .table-premium th {
                    border-color: var(--border-color);
                }
                .table-premium td {
                    color: var(--text-main);
                    font-weight: 500;
                }
                .table-premium tr:hover td {
                    background: var(--primary-light);
                }
                .badge-stripe,
                .badge-pill {
                    border-radius: 8px !important;
                    font-weight: 700 !important;
                }
                .sub-tab-link {
                    border-radius: 20px !important;
                    padding: 8px 18px !important;
                    border: 1.5px solid var(--border-color) !important;
                    background: var(--surface-tint) !important;
                    color: var(--text-muted) !important;
                    font-size: 0.82rem;
                    font-weight: 700;
                    transition: all 0.2s ease;
                }
                .sub-tab-link:hover:not(.active) {
                    background: var(--card-bg) !important;
                    color: var(--text-main) !important;
                    border-color: var(--primary) !important;
                }
                .sub-tab-link.active {
                    background: var(--primary) !important;
                    color: #FFFFFF !important;
                    border-color: var(--primary) !important;
                    box-shadow: 0 4px 14px rgba(4, 120, 87, 0.35);
                }
                [data-theme='dark'] .sub-tab-link.active {
                    background: var(--primary) !important;
                    color: #030806 !important;
                    box-shadow: 0 4px 14px rgba(52, 211, 153, 0.4);
                }

                .mobile-sidebar-scrim {
                    display: none;
                    position: fixed;
                    inset: 0;
                    z-index: 96;
                    border: none;
                    background: rgba(3, 7, 10, 0.55);
                    backdrop-filter: blur(4px);
                }

                @media (max-width: 1180px) {
                    .dashboard-bento-grid {
                        grid-template-columns: 1fr !important;
                    }
                    .dashboard-hero {
                        grid-template-columns: 1fr !important;
                    }
                    .dashboard-action-grid {
                        min-width: 0;
                    }
                }

                @media (max-width: 900px) {
                    .admin-erp-container {
                        height: 100dvh !important;
                    }
                    .sidebar-container {
                        position: fixed !important;
                        left: 0;
                        top: 0;
                        bottom: 0;
                        z-index: 110;
                        transform: translateX(-105%);
                        width: min(292px, 86vw);
                    }
                    .sidebar-container.mobile-open {
                        transform: translateX(0);
                    }
                    .mobile-sidebar-open .mobile-sidebar-scrim {
                        display: block;
                    }
                    .sidebar-collapse-btn {
                        display: none;
                    }
                    .mobile-menu-button {
                        display: inline-flex;
                    }
                    .topbar-container {
                        padding: 0 14px;
                        gap: 10px;
                    }
                    .search-box {
                        flex: 1;
                        width: auto;
                    }
                    .status-badge,
                    .topbar-notification[title='Messages'],
                    .user-profile-pill .material-icons-outlined,
                    .user-profile-pill > div:nth-child(2) {
                        display: none;
                    }
                    .user-profile-pill {
                        padding: 4px;
                    }
                    .admin-content-shell {
                        padding: 16px !important;
                    }
                    .workspace-header {
                        grid-template-columns: 1fr;
                        padding: 14px;
                    }
                    .workspace-chips {
                        justify-content: flex-start;
                    }
                    .dashboard-action-grid {
                        grid-template-columns: 1fr !important;
                    }
                    .dashboard-kpi-grid {
                        grid-template-columns: repeat(auto-fit, minmax(145px, 1fr)) !important;
                    }
                }

                @media (max-width: 620px) {
                    .topbar-container {
                        height: 64px;
                    }
                    .search-input::placeholder {
                        color: transparent;
                    }
                    .workspace-title-row {
                        align-items: flex-start;
                    }
                    .workspace-header h1 {
                        font-size: 1.1rem;
                    }
                    .workspace-description {
                        font-size: 0.8rem;
                    }
                    .workspace-chip {
                        width: 100%;
                        justify-content: space-between;
                    }
                    .dashboard-hero {
                        padding: 14px;
                    }
                    .dashboard-hero h1 {
                        font-size: 1.16rem !important;
                    }
                    .card-premium {
                        padding: 16px !important;
                    }
                }

                /* ═══════════════════════════════════════════════
                   INTERACTIVE POLISH LAYER
                   ═══════════════════════════════════════════════ */

                /* Tab content entrance animation */
                @keyframes tab-enter {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .admin-content-shell > *:not(.toast-stack) {
                    animation: tab-enter 0.35s cubic-bezier(0.22, 1, 0.36, 1) both;
                }

                /* KPI metric cards: lift + icon pop on hover */
                .metric-card {
                    transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.25s ease, border-color 0.25s ease;
                    cursor: default;
                }
                .metric-card:hover {
                    transform: translateY(-4px);
                    box-shadow: var(--shadow-md);
                    border-color: rgba(15, 143, 106, 0.28);
                }
                .metric-card:hover .material-icons-outlined {
                    animation: icon-pop 0.35s ease;
                }
                @keyframes icon-pop {
                    50% { transform: scale(1.18); }
                }

                /* All premium cards: subtle lift */
                .card-premium {
                    transition: box-shadow 0.25s ease, border-color 0.25s ease;
                }
                .card-premium:hover {
                    box-shadow: var(--shadow-md);
                }

                /* Tables: row hover highlight + smooth transitions */
                .admin-erp-container table tbody tr {
                    transition: background 0.15s ease;
                }
                .admin-erp-container table tbody tr:hover {
                    background: var(--primary-light);
                }

                /* Inputs and selects: focus glow */
                .admin-erp-container input:focus,
                .admin-erp-container select:focus,
                .admin-erp-container textarea:focus {
                    outline: none;
                    border-color: var(--primary) !important;
                    box-shadow: 0 0 0 4px var(--primary-light) !important;
                    transition: box-shadow 0.2s ease, border-color 0.2s ease;
                }

                /* Buttons: press feedback */
                .admin-erp-container button {
                    transition: transform 0.15s ease, box-shadow 0.2s ease, opacity 0.2s ease;
                }
                .admin-erp-container button:active:not(:disabled) {
                    transform: scale(0.97);
                }

                /* Custom scrollbars */
                .admin-erp-container ::-webkit-scrollbar {
                    width: 9px;
                    height: 9px;
                }
                .admin-erp-container ::-webkit-scrollbar-track {
                    background: transparent;
                }
                .admin-erp-container ::-webkit-scrollbar-thumb {
                    background: rgba(15, 143, 106, 0.24);
                    border-radius: 8px;
                    border: 2px solid transparent;
                    background-clip: content-box;
                }
                .admin-erp-container ::-webkit-scrollbar-thumb:hover {
                    background: rgba(15, 143, 106, 0.45);
                    background-clip: content-box;
                }

                /* ═══ Floating toast notifications ═══ */
                .toast-stack {
                    position: fixed;
                    top: 84px;
                    right: 24px;
                    z-index: 4000;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    max-width: min(420px, calc(100vw - 32px));
                    pointer-events: none;
                }
                .toast-item {
                    pointer-events: auto;
                    position: relative;
                    overflow: hidden;
                    margin: 0 !important;
                    box-shadow: var(--shadow-lg) !important;
                    backdrop-filter: blur(20px) saturate(160%);
                    -webkit-backdrop-filter: blur(20px) saturate(160%);
                    animation: toast-in 0.4s cubic-bezier(0.22, 1, 0.36, 1) both;
                }
                @keyframes toast-in {
                    from { opacity: 0; transform: translateX(40px) scale(0.96); }
                    to { opacity: 1; transform: translateX(0) scale(1); }
                }
                .toast-dismiss {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    width: 26px;
                    height: 26px;
                    border-radius: 6px;
                    border: none;
                    background: transparent;
                    color: inherit;
                    opacity: 0.6;
                    cursor: pointer;
                    flex-shrink: 0;
                }
                .toast-dismiss:hover {
                    opacity: 1;
                    background: rgba(0, 0, 0, 0.08);
                }
                .toast-progress {
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    height: 3px;
                    width: 100%;
                    background: var(--success);
                    opacity: 0.55;
                    transform-origin: left;
                    animation: toast-countdown 4.5s linear forwards;
                }
                @keyframes toast-countdown {
                    from { transform: scaleX(1); }
                    to { transform: scaleX(0); }
                }

                @media (prefers-reduced-motion: reduce) {
                    .admin-content-shell > *:not(.toast-stack),
                    .toast-item,
                    .toast-progress {
                        animation: none !important;
                    }
                    .metric-card:hover {
                        transform: none;
                    }
                }

                /* ═══ Shared premium summary chips (Memberships / Finance) ═══ */
                .summary-chip {
                    position: relative;
                    overflow: hidden;
                    border: 1px solid var(--border-color);
                    border-radius: 14px;
                    padding: 16px 18px;
                    background: linear-gradient(135deg, rgba(15, 143, 106, 0.06), rgba(255, 255, 255, 0.02) 55%);
                    display: flex;
                    align-items: center;
                    gap: 14px;
                    min-height: 76px;
                    transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.25s ease, border-color 0.25s ease;
                }
                .summary-chip::after {
                    content: '';
                    position: absolute;
                    inset: 0 0 auto 0;
                    height: 2px;
                    background: linear-gradient(90deg, transparent, var(--chip-accent, var(--primary)), transparent);
                    opacity: 0.5;
                }
                .summary-chip:hover {
                    transform: translateY(-3px);
                    box-shadow: var(--shadow-md);
                    border-color: rgba(15, 143, 106, 0.3);
                }
                .summary-chip:hover .summary-chip__icon {
                    transform: scale(1.08);
                    box-shadow: 0 0 18px var(--chip-glow, rgba(15, 143, 106, 0.25));
                }
                .summary-chip__icon {
                    width: 42px;
                    height: 42px;
                    border-radius: 12px;
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid var(--border-color);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 20px !important;
                    flex-shrink: 0;
                    transition: transform 0.25s ease, box-shadow 0.25s ease;
                }
                .summary-chip__value {
                    font-size: 1.3rem;
                    font-weight: 800;
                    line-height: 1.1;
                    letter-spacing: -0.02em;
                    color: var(--text-main);
                }
                .summary-chip__label {
                    font-size: 0.72rem;
                    color: var(--text-muted);
                    margin-top: 4px;
                    font-weight: 500;
                    text-transform: uppercase;
                    letter-spacing: 0.06em;
                }

                /* Finance profile account card */
                .finance-profile-card {
                    position: relative;
                    overflow: hidden;
                    border-radius: 16px !important;
                    background: linear-gradient(120deg, rgba(15, 143, 106, 0.10), rgba(255, 255, 255, 0.02) 45%) !important;
                    border: 1px solid rgba(15, 143, 106, 0.22) !important;
                    animation: tab-enter 0.35s cubic-bezier(0.22, 1, 0.36, 1) both;
                }
                .finance-profile-card::before {
                    content: '';
                    position: absolute;
                    top: -60px;
                    right: -60px;
                    width: 180px;
                    height: 180px;
                    border-radius: 50%;
                    background: radial-gradient(circle, rgba(15, 143, 106, 0.14), transparent 70%);
                    pointer-events: none;
                }

                @media (prefers-reduced-motion: reduce) {
                    .summary-chip:hover { transform: none; }
                    .finance-profile-card { animation: none; }
                }

                /* ═══ Form & panel refinement layer ═══ */

                /* Card headings: accent bar + tighter hierarchy */
                .card-premium > h3:first-child,
                .card-premium > h4:first-child,
                .card-premium > h5:first-child,
                .card-premium > .d-flex:first-child h3,
                .card-premium > .d-flex:first-child h5 {
                    position: relative;
                    padding-left: 14px;
                    letter-spacing: -0.01em;
                }
                .card-premium > h3:first-child::before,
                .card-premium > h4:first-child::before,
                .card-premium > h5:first-child::before,
                .card-premium > .d-flex:first-child h3::before,
                .card-premium > .d-flex:first-child h5::before {
                    content: '';
                    position: absolute;
                    left: 0;
                    top: 50%;
                    transform: translateY(-50%);
                    width: 4px;
                    height: 70%;
                    min-height: 16px;
                    border-radius: 4px;
                    background: linear-gradient(180deg, var(--primary), rgba(15, 143, 106, 0.35));
                }

                /* Form labels: refined micro-label treatment */
                .admin-erp-container form label,
                .admin-erp-container .card-premium label {
                    font-size: 0.72rem !important;
                    font-weight: 700 !important;
                    text-transform: uppercase;
                    letter-spacing: 0.07em;
                    color: var(--text-muted) !important;
                    margin-bottom: 6px !important;
                }

                /* Inputs: softer radius, hover feedback, filled feel */
                .input-premium {
                    border-radius: 10px !important;
                    transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
                }
                .input-premium:hover:not(:focus) {
                    border-color: rgba(15, 143, 106, 0.35) !important;
                }

                /* Sub-tabs: segmented pill control instead of flat text tabs */
                .sub-tab-link {
                    border-radius: 999px !important;
                    padding: 8px 16px !important;
                    border: 1px solid transparent !important;
                    background: transparent;
                    color: var(--text-muted);
                    font-size: 0.82rem;
                    transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease, transform 0.15s ease;
                }
                .sub-tab-link:hover:not(.active) {
                    background: var(--surface-tint);
                    color: var(--text-main);
                }
                .sub-tab-link.active {
                    background: var(--gradient-1) !important;
                    color: #fff !important;
                    border-color: transparent !important;
                    box-shadow: 0 6px 16px rgba(15, 143, 106, 0.28);
                }

                /* Primary buttons: sheen sweep on hover */
                .btn-primary-stripe {
                    position: relative;
                    overflow: hidden;
                }
                .btn-primary-stripe::after {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: -80%;
                    width: 50%;
                    height: 100%;
                    background: linear-gradient(100deg, transparent, rgba(255, 255, 255, 0.35), transparent);
                    transform: skewX(-20deg);
                    transition: left 0.45s ease;
                }
                .btn-primary-stripe:hover::after {
                    left: 130%;
                }
                .btn-primary-stripe:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 14px 30px rgba(15, 143, 106, 0.32);
                }

                /* Empty tables: give headers breathing room */
                .table-premium thead th {
                    padding-top: 12px;
                    padding-bottom: 12px;
                }

                @media (prefers-reduced-motion: reduce) {
                    .btn-primary-stripe::after { display: none; }
                    .btn-primary-stripe:hover { transform: none; }
                }
            `}</style>

            {/* Sidebar navigation */}
            {sidebarOpen && <button className="mobile-sidebar-scrim no-print" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}
            <aside className={`sidebar-container no-print ${sidebarCollapsed ? 'collapsed' : ''} ${sidebarOpen ? 'mobile-open' : ''}`} style={{ position: 'relative' }}>
                {/* Collapse toggle button */}
                <button className="sidebar-collapse-btn" onClick={() => setSidebarCollapsed(!sidebarCollapsed)} title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
                    <span className="material-icons-outlined" style={{ fontSize: '14px' }}>{sidebarCollapsed ? 'chevron_right' : 'chevron_left'}</span>
                </button>

                <div className="sidebar-brand" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '20px', marginBottom: '16px', flexShrink: 0 }}>
                    <div className="animated-turf-logo-container" style={{ width: '38px', height: '38px', borderRadius: '10px', flexShrink: 0, overflow: 'hidden' }}>
                        <img 
                            src="/logo.png" 
                            alt="Logo" 
                            className="animated-turf-logo-img"
                            style={{ 
                                width: '100%', 
                                height: '100%', 
                                objectFit: 'contain'
                            }} 
                        />
                    </div>
                    <div className="sidebar-brand-text">
                        <h1 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0, color: '#FFFFFF', letterSpacing: '-0.02em', fontFamily: 'Montserrat' }}>Khelo Patna</h1>
                        <span style={{ fontSize: '0.64rem', fontWeight: 700, color: 'var(--emerald)', letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', marginTop: '1px' }}>Elite Turf</span>
                    </div>
                </div>

                <nav className="sidebar-nav" style={{ paddingLeft: '18px', paddingRight: '18px' }}>
                    {/* COMMAND SECTION */}
                    {(() => {
                        const items = [
                            { id: 'dashboard', label: 'Dashboard', icon: 'grid_view' },
                            { id: 'turf-management', label: 'Turf Bookings', icon: 'sports_soccer', key: 'bookings' },
                            { id: 'turf-management', label: 'Turf Management', icon: 'settings_suggest', key: 'calendar' }
                        ].filter(item => hasTabAccess(item.id));
                        if (items.length === 0) return null;
                        return (
                            <>
                                <div className="sidebar-section-label">Command</div>
                                {items.map(item => (
                                    <button 
                                        key={item.key || item.id}
                                        className={`sidebar-link ${activeSidebarKey === (item.key || item.id) ? 'active' : ''}`}
                                        onClick={() => { setActiveTab(item.id); setActiveSidebarKey(item.key || item.id); setSidebarOpen(false); }}
                                        title={sidebarCollapsed ? item.label : ''}
                                    >
                                        {activeSidebarKey === (item.key || item.id) && (
                                            <div className="active-indicator" style={{ left: '-10px', borderRadius: '4px' }} />
                                        )}
                                        <div className="sidebar-icon-wrap">
                                            <span className="material-icons-outlined" style={{ fontSize: '18px' }}>{item.icon}</span>
                                        </div>
                                        <span className="sidebar-link-label">{item.label}</span>
                                    </button>
                                ))}

                                <Link
                                    href="/admin/scoreboard"
                                    className="sidebar-link"
                                    title={sidebarCollapsed ? 'Live Scoreboards' : ''}
                                    style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}
                                >
                                    <div className="sidebar-icon-wrap">
                                        <span className="material-icons-outlined" style={{ fontSize: '18px', color: 'var(--gold)' }}>sports_score</span>
                                    </div>
                                    <span className="sidebar-link-label" style={{ color: 'var(--text-primary)' }}>Live Scoreboards</span>
                                </Link>
                            </>
                        );
                    })()}

                    {/* ACADEMY SECTION */}
                    {(() => {
                        const items = [
                            { id: 'admission-studio', label: 'Admissions', icon: 'how_to_reg' },
                            { id: 'membership-management', label: 'Memberships', icon: 'people' },
                            { id: 'session-management', label: 'Sessions', icon: 'schedule' },
                            { id: 'batch-management', label: 'Batches', icon: 'groups' },
                            { id: 'coach-management', label: 'Coaches', icon: 'sports' },
                            { id: 'attendance-management', label: 'Attendance', icon: 'fact_check' }
                        ].filter(item => hasTabAccess(item.id));
                        if (items.length === 0) return null;
                        return (
                            <>
                                <div className="sidebar-section-label">Academy</div>
                                {items.map(item => (
                                    <button 
                                        key={item.key || item.id}
                                        className={`sidebar-link ${activeSidebarKey === (item.key || item.id) ? 'active' : ''}`}
                                        onClick={() => { setActiveTab(item.id); setActiveSidebarKey(item.key || item.id); setSidebarOpen(false); }}
                                        title={sidebarCollapsed ? item.label : ''}
                                    >
                                        {activeSidebarKey === (item.key || item.id) && (
                                            <div className="active-indicator" style={{ left: '-10px', borderRadius: '4px' }} />
                                        )}
                                        <div className="sidebar-icon-wrap">
                                            <span className="material-icons-outlined" style={{ fontSize: '18px' }}>{item.icon}</span>
                                        </div>
                                        <span className="sidebar-link-label">{item.label}</span>
                                    </button>
                                ))}
                            </>
                        );
                    })()}

                    {/* FINANCE SECTION */}
                    {(() => {
                        const items = [
                            { id: 'membership-billing', label: 'Billing', icon: 'receipt_long' },
                            { id: 'finance', label: 'Accounts', icon: 'account_balance_wallet' },
                            { id: 'coupons', label: 'Coupons', icon: 'local_offer' }
                        ].filter(item => hasTabAccess(item.id));
                        if (items.length === 0) return null;
                        return (
                            <>
                                <div className="sidebar-section-label">Finance</div>
                                {items.map(item => (
                                    <button 
                                        key={item.key || item.id}
                                        className={`sidebar-link ${activeSidebarKey === (item.key || item.id) ? 'active' : ''}`}
                                        onClick={() => { setActiveTab(item.id); setActiveSidebarKey(item.key || item.id); setSidebarOpen(false); }}
                                        title={sidebarCollapsed ? item.label : ''}
                                    >
                                        {activeSidebarKey === (item.key || item.id) && (
                                            <div className="active-indicator" style={{ left: '-10px', borderRadius: '4px' }} />
                                        )}
                                        <div className="sidebar-icon-wrap">
                                            <span className="material-icons-outlined" style={{ fontSize: '18px' }}>{item.icon}</span>
                                        </div>
                                        <span className="sidebar-link-label">{item.label}</span>
                                    </button>
                                ))}
                            </>
                        );
                    })()}

                    {/* OPERATIONS SECTION */}
                    {(() => {
                        const items = [
                            { id: 'inventory-management', label: 'Inventory', icon: 'inventory_2' },
                            { id: 'hr', label: 'Staff', icon: 'badge' },
                            { id: 'communication', label: 'Messages', icon: 'chat' },
                            { id: 'customers', label: 'Customers', icon: 'people' }
                        ].filter(item => hasTabAccess(item.id));
                        if (items.length === 0) return null;
                        return (
                            <>
                                <div className="sidebar-section-label">Operations</div>
                                {items.map(item => (
                                    <button 
                                        key={item.key || item.id}
                                        className={`sidebar-link ${activeSidebarKey === (item.key || item.id) ? 'active' : ''}`}
                                        onClick={() => { setActiveTab(item.id); setActiveSidebarKey(item.key || item.id); setSidebarOpen(false); }}
                                        title={sidebarCollapsed ? item.label : ''}
                                    >
                                        {activeSidebarKey === (item.key || item.id) && (
                                            <div className="active-indicator" style={{ left: '-10px', borderRadius: '4px' }} />
                                        )}
                                        <div className="sidebar-icon-wrap">
                                            <span className="material-icons-outlined" style={{ fontSize: '18px' }}>{item.icon}</span>
                                        </div>
                                        <span className="sidebar-link-label">{item.label}</span>
                                    </button>
                                ))}
                            </>
                        );
                    })()}

                    {/* SYSTEM SECTION */}
                    {(() => {
                        const items = [
                            { id: 'website', label: 'Website', icon: 'web' },
                            { id: 'google-reviews', label: 'Google Reviews', icon: 'star' },
                            { id: 'integrations', label: 'Integrations', icon: 'hub' },
                            { id: 'settings', label: 'Settings', icon: 'settings' },
                            { id: 'audit-logs', label: 'Audit Logs', icon: 'history' }
                        ].filter(item => hasTabAccess(item.id));
                        if (items.length === 0) return null;
                        return (
                            <>
                                <div className="sidebar-section-label">System</div>
                                {items.map(item => (
                                    <button 
                                        key={item.key || item.id}
                                        className={`sidebar-link ${activeSidebarKey === (item.key || item.id) ? 'active' : ''}`}
                                        onClick={() => { setActiveTab(item.id); setActiveSidebarKey(item.key || item.id); setSidebarOpen(false); }}
                                        title={sidebarCollapsed ? item.label : ''}
                                    >
                                        {activeSidebarKey === (item.key || item.id) && (
                                            <div className="active-indicator" style={{ left: '-10px', borderRadius: '4px' }} />
                                        )}
                                        <div className="sidebar-icon-wrap">
                                            <span className="material-icons-outlined" style={{ fontSize: '18px' }}>{item.icon}</span>
                                        </div>
                                        <span className="sidebar-link-label">{item.label}</span>
                                    </button>
                                ))}
                            </>
                        );
                    })()}
                </nav>

                {/* Venue Card - hidden when collapsed */}
                {!sidebarCollapsed && (
                    <div className="sidebar-venue-card">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <span className="material-icons-outlined" style={{ fontSize: '15px', color: '#34D399' }}>location_on</span>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>KheloPatna Turf</div>
                                <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.3)' }}>Patna, Bihar</div>
                            </div>
                        </div>
                        <span className="material-icons-outlined" style={{ fontSize: '16px', color: 'rgba(255,255,255,0.2)' }}>unfold_more</span>
                    </div>
                )}

                <div className="sidebar-footer">
                    {sidebarCollapsed ? (
                        <button style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: '10px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', width: '48px', height: '48px' }} onClick={handleSignOut} title="Sign Out">
                            <span className="material-icons-outlined" style={{ fontSize: '18px' }}>logout</span>
                        </button>
                    ) : (
                        <button style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '10px', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.82rem', fontWeight: 500, transition: 'all 0.2s', letterSpacing: '0em' }} onClick={handleSignOut}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = '#F87171'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.15)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; }}
                        >
                            <span className="material-icons-outlined" style={{ fontSize: '17px' }}>logout</span> Sign Out
                        </button>
                    )}
                </div>
            </aside>

            {/* Main pane content */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
                {/* Header bar */}
                <header className="topbar-container no-print">
                    <button className="mobile-menu-button" onClick={() => setSidebarOpen(true)} aria-label="Open navigation">
                        <span className="material-icons-outlined" style={{ fontSize: '22px' }}>menu</span>
                    </button>
                    <div className="search-box" onClick={() => setShowLauncher(true)} style={{ cursor: 'pointer' }}>
                        <span className="material-icons-outlined">search</span>
                        <input 
                            type="text" 
                            placeholder="Search bookings, payments, staff..." 
                            className="search-input" 
                            readOnly 
                            onClick={() => setShowLauncher(true)} 
                            onFocus={() => setShowLauncher(true)} 
                        />
                    </div>

                    <div className="d-flex align-items-center gap-3">
                        <div className="status-badge">
                            <span className={`status-dot ${whatsappStatus.status === 'CONNECTED' ? 'bg-success' : 'bg-danger'}`}></span>
                            <span>WA BOT</span>
                        </div>

                        <button className="topbar-notification" title="Notifications" onClick={() => { setActiveTab('inventory-management'); setActiveSidebarKey('stock-alerts'); }}>
                            <span className="material-icons-outlined" style={{ fontSize: '20px' }}>notifications</span>
                            {totalNotifications > 0 && <span className="notification-badge">{totalNotifications}</span>}
                        </button>

                        <a 
                            href="/khelo_patna_logo_animated.gif" 
                            download="khelo_patna_logo_animated.gif"
                            className="topbar-notification d-none d-sm-inline-flex"
                            title="Download Animated Logo GIF (500x500)"
                            style={{ 
                                textDecoration: 'none', 
                                color: theme === 'light' ? '#047857' : 'var(--emerald)', 
                                background: theme === 'light' ? 'rgba(4, 120, 87, 0.08)' : 'rgba(16,185,129,0.1)', 
                                border: theme === 'light' ? '1px solid rgba(4, 120, 87, 0.3)' : '1px solid rgba(16,185,129,0.25)', 
                                padding: '6px 12px', 
                                borderRadius: '10px', 
                                fontSize: '0.74rem', 
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                transition: 'all 0.2s'
                            }}
                        >
                            <span className="material-icons-outlined" style={{ fontSize: '16px' }}>download</span>
                            <span>Animated Logo</span>
                        </a>

                        <button className="theme-toggle" onClick={toggleTheme}>
                            <span className="material-icons-outlined">
                                {theme === 'light' ? 'dark_mode' : 'light_mode'}
                            </span>
                        </button>

                        <div 
                            className="user-profile-pill" 
                            style={{ cursor: 'pointer', position: 'relative' }} 
                            onClick={() => setShowUserMenu(!showUserMenu)}
                        >
                            <div className="user-avatar">
                                {username ? username.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'AD'}
                            </div>
                            <div style={{ lineHeight: 1.3 }}>
                                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>{username || 'Admin'}</div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{ROLE_LABELS[role] || role || 'Staff'}</div>
                            </div>
                            <span className="material-icons-outlined" style={{ fontSize: '16px', color: 'var(--text-muted)' }}>expand_more</span>

                            {showUserMenu && (
                                <div 
                                    style={{ 
                                        position: 'absolute', 
                                        top: 'calc(100% + 8px)', 
                                        right: 0, 
                                        background: 'var(--card-bg, #0A1510)', 
                                        border: '1px solid var(--border-color)', 
                                        borderRadius: '12px', 
                                        padding: '6px', 
                                        boxShadow: 'var(--shadow-lg)', 
                                        zIndex: 1000, 
                                        minWidth: '190px' 
                                    }}
                                >
                                    <button 
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); setShowChangePasswordModal(true); setShowUserMenu(false); }}
                                        style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--text-main)', padding: '10px 12px', borderRadius: '8px', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.82rem', cursor: 'pointer', fontWeight: 600 }}
                                    >
                                        <span className="material-icons-outlined" style={{ fontSize: '18px', color: 'var(--emerald)' }}>vpn_key</span>
                                        Change Password
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); handleLogout(); }}
                                        style={{ width: '100%', background: 'transparent', border: 'none', color: '#EF4444', padding: '10px 12px', borderRadius: '8px', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.82rem', cursor: 'pointer', fontWeight: 600 }}
                                    >
                                        <span className="material-icons-outlined" style={{ fontSize: '18px' }}>logout</span>
                                        Sign Out
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                <main className="admin-content-shell" style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
                    <section className="workspace-header no-print">
                        <div>
                            <div className="workspace-title-row">
                                <span className="workspace-icon">
                                    <span className="material-icons-outlined" style={{ fontSize: '22px' }}>{currentPage.icon}</span>
                                </span>
                                <div style={{ minWidth: 0 }}>
                                    <p className="workspace-eyebrow">{currentPage.eyebrow}</p>
                                    <h1>{currentPage.title}</h1>
                                </div>
                            </div>
                            <p className="workspace-description">{currentPage.description}</p>
                        </div>
                        <div className="workspace-chips">
                            <span className="workspace-chip">
                                <span className="material-icons-outlined" style={{ fontSize: '16px' }}>calendar_today</span>
                                <strong>{todayLabel}</strong>
                            </span>
                            <span className="workspace-chip">
                                <span className={`status-dot ${whatsappStatus.status === 'CONNECTED' ? 'bg-success' : 'bg-danger'}`}></span>
                                WhatsApp {whatsappStatus.status === 'CONNECTED' ? 'online' : 'offline'}
                            </span>
                            <span className="workspace-chip">
                                <span className="material-icons-outlined" style={{ fontSize: '16px' }}>notifications</span>
                                <strong>{totalNotifications}</strong> alerts
                            </span>
                        </div>
                    </section>
                    {(errorMessage || successMessage) && (
                        <div className="toast-stack" role="status" aria-live="polite">
                            {errorMessage && (
                                <div className="alert-premium alert-danger toast-item">
                                    <span className="material-icons-outlined">error</span>
                                    <span style={{ flex: 1 }}>{errorMessage}</span>
                                    <button className="toast-dismiss" onClick={() => setErrorMessage('')} aria-label="Dismiss error">
                                        <span className="material-icons-outlined" style={{ fontSize: '16px' }}>close</span>
                                    </button>
                                </div>
                            )}
                            {successMessage && (
                                <div className="alert-premium alert-success toast-item">
                                    <span className="material-icons-outlined">check_circle</span>
                                    <span style={{ flex: 1 }}>{successMessage}</span>
                                    <button className="toast-dismiss" onClick={() => setSuccessMessage('')} aria-label="Dismiss notification">
                                        <span className="material-icons-outlined" style={{ fontSize: '16px' }}>close</span>
                                    </button>
                                    <div className="toast-progress" />
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'admission-studio' && (
                        <AdmissionStudio
                            backendUrl={BACKEND_URL}
                            getHeaders={getHeaders}
                            batchesList={batchesList}
                            onRefresh={() => { loadAllStudents(); loadBatches(); }}
                            onCollectPayment={handleCollectPaymentRedirect}
                            notifySuccess={setSuccessMessage}
                            notifyError={setErrorMessage}
                        />
                    )}
                    {activeTab === 'academy-management' && <AcademyTab academySubTab={academySubTab} setAcademySubTab={setAcademySubTab} customerSearchQuery={customerSearchQuery} setCustomerSearchQuery={setCustomerSearchQuery} allStudents={allStudents} selectedCrmStudent={selectedCrmStudent} setSelectedCrmStudent={setSelectedCrmStudent} setActiveTab={setActiveTab} setActiveSidebarKey={setActiveSidebarKey} setPaymentsSubTab={setPaymentsSubTab} setPaymentSearchId={setPaymentSearchId} setSelectedStudentForPayment={setSelectedStudentForPayment} setShowEnquiryModal={setShowEnquiryModal} enquirySearchQuery={enquirySearchQuery} setEnquirySearchQuery={setEnquirySearchQuery} enquiriesList={enquiriesList} handleConvertEnquiry={handleConvertEnquiry} handleSaveAttendance={handleSaveAttendance} attendanceSport={attendanceSport} setAttendanceSport={setAttendanceSport} studentsList={studentsList} attendanceGrid={attendanceGrid} toggleStudentAttendance={toggleStudentAttendance} />}
                    {activeTab === 'dashboard' && <DashboardTab revenueAnalytics={revenueAnalytics} bookingsLog={bookingsLog} formatINR={formatINR} stats={stats} allStudents={allStudents} username={username} setActiveTab={setActiveTab} setActiveSidebarKey={setActiveSidebarKey} setShowOfflineBookingModal={setShowOfflineBookingModal} pendingFeesAmount={pendingFeesAmount} formatSlotTo12Hr={formatSlotTo12Hr} />}
                    {activeTab === 'turf-management' && <TurfTab activeSidebarKey={activeSidebarKey} bookingsLog={bookingsLog} selectedBooking={selectedBooking} generateCustomerId={generateCustomerId} bookingsFilter={bookingsFilter} setBookingsFilter={setBookingsFilter} bookingsDateRange={bookingsDateRange} setBookingsDateRange={setBookingsDateRange} bookingsCustomStartDate={bookingsCustomStartDate} setBookingsCustomStartDate={setBookingsCustomStartDate} bookingsCustomEndDate={bookingsCustomEndDate} setBookingsCustomEndDate={setBookingsCustomEndDate} setShowOfflineBookingModal={setShowOfflineBookingModal} setShowBookingsReportModal={setShowBookingsReportModal} formatINR={formatINR} formatSlotTo12Hr={formatSlotTo12Hr} setSelectedBookingState={setSelectedBookingState} turfSettings={turfSettings} closuresList={closuresList} handleSaveSettings={handleSaveSettings} setTurfSettings={setTurfSettings} handleCreateClosure={handleCreateClosure} newClosure={newClosure} setNewClosure={setNewClosure} handleDeleteClosure={handleDeleteClosure} />}
                    {activeTab === 'membership-management' && (
                        <MembershipTab 
                            allStudents={allStudents}
                            sessionsList={sessionsList}
                            coachesList={coachesList}
                            batchesList={batchesList}
                            onUpdateStudent={handleUpdateStudentWrapper}
                            onCollectPayment={handleCollectPaymentRedirect}
                            backendUrl={BACKEND_URL}
                            getHeaders={getHeaders}
                            initialSelectedMemberId={initialSelectedMemberId}
                            clearInitialSelectedMemberId={() => setInitialSelectedMemberId('')}
                            onOpenAdmissions={() => { setActiveTab('admission-studio'); setActiveSidebarKey('admission-studio'); }}
                            notifySuccess={setSuccessMessage}
                            notifyError={setErrorMessage}
                        />
                    )}
                    {activeTab === 'session-management' && <SessionTab setErrorMessage={setErrorMessage} setSuccessMessage={setSuccessMessage} setLoading={setLoading} BACKEND_URL={BACKEND_URL} getHeaders={getHeaders} newSessionData={newSessionData} setNewSessionData={setNewSessionData} loadSessions={loadSessions} sessionsList={sessionsList} />}
                    {activeTab === 'batch-management' && (
                        <BatchTab 
                            batchesList={batchesList}
                            sessionsList={sessionsList}
                            coachesList={coachesList}
                            allStudents={allStudents}
                            backendUrl={BACKEND_URL}
                            getHeaders={getHeaders}
                            onRefresh={() => { loadBatches(); loadSessions(); loadCoaches(); loadAllStudents(); }}
                        />
                    )}
                    {activeTab === 'coach-management' && (
                        <CoachTab 
                            coachesList={coachesList}
                            backendUrl={BACKEND_URL}
                            getHeaders={getHeaders}
                            onRefresh={() => { loadCoaches(); }}
                        />
                    )}
                    {activeTab === 'attendance-management' && <AttendanceTab handleSaveAttendance={handleSaveAttendance} attendanceSport={attendanceSport} setAttendanceSport={setAttendanceSport} studentsList={studentsList} attendanceGrid={attendanceGrid} toggleStudentAttendance={toggleStudentAttendance} />}
                    {activeTab === 'membership-billing' && (
                        <FinanceTab 
                            allStudents={allStudents}
                            coachesList={coachesList}
                            backendUrl={BACKEND_URL}
                            getHeaders={getHeaders}
                            feeTerms={feeTerms}
                            setFeeTerms={setFeeTerms}
                            feeTypes={feeTypes}
                            setFeeTypes={setFeeTypes}
                            feeRebates={feeRebates}
                            setFeeRebates={setFeeRebates}
                            feeGroups={feeGroups}
                            setFeeGroups={setFeeGroups}
                            onCollectPayment={handleCollectPaymentRedirect}
                            initialStudentId={initialStudentId}
                            clearInitialStudentId={() => setInitialStudentId('')}
                            activeSubTab="ledger"
                            onViewStudentProfile={(studentId) => {
                                setInitialSelectedMemberId(studentId);
                                setActiveTab('membership-management');
                                setActiveSidebarKey('membership-management');
                            }}
                        />
                    )}
                    {activeTab === 'finance' && (
                        <FinanceTab 
                            allStudents={allStudents}
                            coachesList={coachesList}
                            backendUrl={BACKEND_URL}
                            getHeaders={getHeaders}
                            feeTerms={feeTerms}
                            setFeeTerms={setFeeTerms}
                            feeTypes={feeTypes}
                            setFeeTypes={setFeeTypes}
                            feeRebates={feeRebates}
                            setFeeRebates={setFeeRebates}
                            feeGroups={feeGroups}
                            setFeeGroups={setFeeGroups}
                            onCollectPayment={handleCollectPaymentRedirect}
                            initialStudentId={initialStudentId}
                            clearInitialStudentId={() => setInitialStudentId('')}
                            activeSubTab="collect"
                            onViewStudentProfile={(studentId) => {
                                setInitialSelectedMemberId(studentId);
                                setActiveTab('membership-management');
                                setActiveSidebarKey('membership-management');
                            }}
                        />
                    )}
                    {activeTab === 'inventory-management' && <InventoryTab activeSidebarKey={activeSidebarKey} inventoryItems={inventoryItems} setSuccessMessage={setSuccessMessage} handlePOSCheckout={handlePOSCheckout} posSale={posSale} setPosSale={setPosSale} posItems={posItems} />}
                    {activeTab === 'hr' && (
                        <HRTab 
                            staffList={staffList}
                            onRegisterStaff={handleRegisterStaffWrapper}
                            backendUrl={BACKEND_URL}
                            getHeaders={getHeaders}
                            onRefresh={fetchStaffList}
                        />
                    )}
                    {activeTab === 'communication' && <CommunicationTab commType={commType} setCommType={setCommType} handleCommunicateSubmit={handleCommunicateSubmit} commStudentMsg={commStudentMsg} setCommStudentMsg={setCommStudentMsg} allStudents={allStudents} commGroupMsg={commGroupMsg} setCommGroupMsg={setCommGroupMsg} commStaffMsg={commStaffMsg} setCommStaffMsg={setCommStaffMsg} commEmail={commEmail} setCommEmail={setCommEmail} backendUrl={BACKEND_URL} getHeaders={getHeaders} />}
                    {activeTab === 'website' && (
                        <WebsiteTab />
                    )}
                    {activeTab === 'integrations' && (
                        <IntegrationsTab 
                            backendUrl={BACKEND_URL}
                            getHeaders={getHeaders}
                        />
                    )}
                    {activeTab === 'customers' && (
                        <CustomersTab 
                            backendUrl={BACKEND_URL}
                            getHeaders={getHeaders}
                        />
                    )}
                    {activeTab === 'settings' && hasTabAccess('settings') && (
                        <SettingsTab 
                            backendUrl={BACKEND_URL}
                            getHeaders={getHeaders}
                            notifySuccess={setSuccessMessage}
                            notifyError={setErrorMessage}
                        />
                    )}
                    {activeTab === 'audit-logs' && (
                        <AuditLogsTab 
                            backendUrl={BACKEND_URL}
                            getHeaders={getHeaders}
                        />
                    )}
                    {activeTab === 'google-reviews' && (
                        <GoogleReviewsTab 
                            backendUrl={BACKEND_URL}
                            getHeaders={getHeaders}
                        />
                    )}
                    {activeTab === 'coupons' && (
                        <CouponsTab 
                            backendUrl={BACKEND_URL}
                            getHeaders={getHeaders}
                            notifySuccess={setSuccessMessage}
                            notifyError={setErrorMessage}
                        />
                    )}
                </main>
            </div>

            {/* Printable Receipt Modal */}
            {activeReceipt && renderReceiptModal()}

            {/* Booking Details Modal */}
            {selectedBooking && renderBookingDetailsModal()}

            {/* Bookings Financial Report Modal */}
            {showBookingsReportModal && renderBookingsReportModal()}

            {/* Offline Turf Booking Modal */}
            {showOfflineBookingModal && renderOfflineBookingModal()}

            {/* Change Password Modal */}
            {showChangePasswordModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(3, 8, 6, 0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
                    <div style={{ background: 'var(--card-bg, #0A1510)', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '24px', width: '95%', maxWidth: '450px', boxShadow: 'var(--shadow-lg)' }}>
                        <div className="d-flex justify-content-between align-items-center mb-3 border-bottom pb-2" style={{ borderColor: 'var(--border-color)' }}>
                            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--emerald)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span className="material-icons-outlined">vpn_key</span>
                                Change My Password
                            </h4>
                            <button type="button" className="btn-close" aria-label="Close" onClick={() => setShowChangePasswordModal(false)} style={{ filter: 'var(--invert-icon)', opacity: 0.8 }}></button>
                        </div>

                        <form onSubmit={handleChangePasswordSubmit} className="d-flex flex-column gap-3">
                            <div>
                                <label className="d-block mb-1" style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)' }}>Current Password *</label>
                                <input 
                                    type="password" 
                                    required 
                                    placeholder="Enter your current password" 
                                    className="input-premium w-100" 
                                    value={changePasswordForm.currentPassword} 
                                    onChange={(e) => setChangePasswordForm({...changePasswordForm, currentPassword: e.target.value})} 
                                />
                            </div>

                            <div>
                                <label className="d-block mb-1" style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)' }}>New Password *</label>
                                <input 
                                    type="password" 
                                    required 
                                    placeholder="Enter new password (min 8 chars)" 
                                    className="input-premium w-100" 
                                    value={changePasswordForm.newPassword} 
                                    onChange={(e) => setChangePasswordForm({...changePasswordForm, newPassword: e.target.value})} 
                                />
                            </div>

                            <div>
                                <label className="d-block mb-1" style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)' }}>Confirm New Password *</label>
                                <input 
                                    type="password" 
                                    required 
                                    placeholder="Re-enter new password" 
                                    className="input-premium w-100" 
                                    value={changePasswordForm.confirmPassword} 
                                    onChange={(e) => setChangePasswordForm({...changePasswordForm, confirmPassword: e.target.value})} 
                                />
                            </div>

                            <div className="d-flex justify-content-end gap-2 border-top pt-3 mt-2" style={{ borderColor: 'var(--border-color)' }}>
                                <button 
                                    type="button" 
                                    onClick={() => setShowChangePasswordModal(false)} 
                                    className="btn btn-secondary py-2 px-3" 
                                    style={{ fontSize: '0.8rem', borderRadius: '8px' }}
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={changingPassword}
                                    className="btn-primary-stripe text-white py-2 px-4" 
                                    style={{ background: 'var(--success)', border: '1px solid var(--success)', fontSize: '0.8rem', borderRadius: '8px', fontWeight: 700 }}
                                >
                                    {changingPassword ? 'Updating...' : 'Update Password'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* GungunERP Inspired Launcher Command Center */}
            <Launcher 
                isOpen={showLauncher}
                onClose={() => setShowLauncher(false)}
                allStudents={allStudents}
                onSelectStudent={(student) => {
                    setInitialSelectedMemberId(student._id);
                    setActiveTab('membership-management');
                    setActiveSidebarKey('membership-management');
                }}
                onSelectTab={(tabId, key) => {
                    setActiveTab(tabId);
                    setActiveSidebarKey(key || tabId);
                }}
            />
        </div>
    );
}
