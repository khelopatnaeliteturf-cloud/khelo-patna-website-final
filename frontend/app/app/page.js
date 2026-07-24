"use client";

import React, { useState, useEffect } from 'react';
import MobileAdminView from '@/app/admin/components/MobileAdminView';

export default function MobileAppPage() {
    const BACKEND_URL = 'https://api.khelopatna.in';
    const [stats, setStats] = useState({});
    const [bookingsLog, setBookingsLog] = useState([]);
    const [allStudents, setAllStudents] = useState([]);
    const [revenueAnalytics, setRevenueAnalytics] = useState([]);
    const [sessionsList, setSessionsList] = useState([]);
    const [coachesList, setCoachesList] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadAppData();
    }, []);

    const loadAppData = async () => {
        setLoading(true);
        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
            const headers = {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            };

            const [resDash, resBookings, resStudents, resRevenue, resSessions, resCoaches] = await Promise.all([
                fetch(`${BACKEND_URL}/api/reports/dashboard`, { headers }).catch(() => null),
                fetch(`${BACKEND_URL}/api/bookings?limit=30`, { headers }).catch(() => null),
                fetch(`${BACKEND_URL}/api/academy/students`, { headers }).catch(() => null),
                fetch(`${BACKEND_URL}/api/reports/revenue-analytics`, { headers }).catch(() => null),
                fetch(`${BACKEND_URL}/api/academy/sessions`, { headers }).catch(() => null),
                fetch(`${BACKEND_URL}/api/academy/coaches`, { headers }).catch(() => null)
            ]);

            if (resDash && resDash.ok) {
                const data = await resDash.json();
                setStats(data);
            }
            if (resBookings && resBookings.ok) {
                const data = await resBookings.json();
                const list = Array.isArray(data) ? data : data.bookings || [];
                setBookingsLog(list);
            }
            if (resStudents && resStudents.ok) {
                const data = await resStudents.json();
                setAllStudents(Array.isArray(data) ? data : []);
            }
            if (resRevenue && resRevenue.ok) {
                const data = await resRevenue.json();
                setRevenueAnalytics(Array.isArray(data) ? data : []);
            }
            if (resSessions && resSessions.ok) {
                const data = await resSessions.json();
                setSessionsList(Array.isArray(data) ? data : []);
            }
            if (resCoaches && resCoaches.ok) {
                const data = await resCoaches.json();
                setCoachesList(Array.isArray(data) ? data : []);
            }
        } catch (e) {
            console.error('Failed loading live database stats:', e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <main style={{ backgroundColor: '#050A10', minHeight: '100vh', width: '100vw', overflowX: 'hidden' }}>
            <MobileAdminView
                user={{ username: 'Admin' }}
                role="ADMIN"
                stats={stats}
                bookingsLog={bookingsLog}
                studentsList={allStudents}
                inventoryItems={[]}
                staffList={[]}
                attendanceData={{}}
                revenueAnalytics={revenueAnalytics}
                sessionsList={sessionsList}
                coachesList={coachesList}
                activeCheckins={[]}
                onOpenBookingModal={() => { window.location.href = '/book'; }}
                onOpenStudentModal={() => { window.location.href = '/enquiry'; }}
                onOpenFeeModal={() => { window.location.href = '/academy/pay-fees'; }}
                onOpenExpenseModal={() => { window.location.href = '/admin'; }}
                onToggleAttendance={() => {}}
                onLogout={() => {
                    if (typeof window !== 'undefined') localStorage.removeItem('token');
                    window.location.href = '/login';
                }}
            />
        </main>
    );
}
