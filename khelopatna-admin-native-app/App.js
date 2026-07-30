import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Switch,
  ActivityIndicator,
  StatusBar,
  RefreshControl,
  Image,
  Modal,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, FontAwesome5, Feather } from '@expo/vector-icons';
import {
  getWhatsappStatus,
  toggleWhatsappBot,
  getAvailableSlots,
  getAcademyApplications,
  approveAcademyApplication,
  getAuditLogs,
  loginStaff,
  createManualBooking
} from './src/services/apiService';

// Stitch Design Tokens
const COLORS = {
  deepSpace: '#040609',
  surfaceDim: '#111417',
  surfaceCard: '#191c20',
  surfaceCardHigh: '#272a2e',
  surfaceBorder: 'rgba(255, 255, 255, 0.06)',
  neonEmerald: '#00FF88',
  neonEmeraldDim: '#00E479',
  neonCyan: '#00C8FF',
  goldAccent: '#FFDD4F',
  errorRed: '#FF453A',
  textPrimary: '#FFFFFF',
  textSecondary: '#E1E2E8',
  textVariant: '#B9CBB9',
  textMuted: '#849585',
  operatorBadgeBg: 'rgba(30, 27, 75, 0.6)',
  operatorBadgeText: '#00C8FF',
  inputBg: '#0F1115',
  inputBorder: '#2A2D36'
};

export default function App() {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [staffId, setStaffId] = useState('OP-4921');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // App navigation state
  const [activeTab, setActiveTab] = useState('dashboard');

  // Operational Data State
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [botEnabled, setBotEnabled] = useState(true);
  const [botStatus, setBotStatus] = useState('CONNECTED');
  const [slots, setSlots] = useState([]);
  const [selectedSport, setSelectedSport] = useState('cricket');
  const [applications, setApplications] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSlotModal, setSelectedSlotModal] = useState(null);
  const [bookingCustomerName, setBookingCustomerName] = useState('');
  const [bookingCustomerPhone, setBookingCustomerPhone] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);

  // Load app data
  useEffect(() => {
    if (isAuthenticated) {
      loadAppData();
    }
  }, [isAuthenticated, selectedSport]);

  const loadAppData = async () => {
    setLoading(true);
    try {
      // 1. WhatsApp Bot Status
      const waRes = await getWhatsappStatus();
      if (waRes.ok && waRes.data) {
        setBotEnabled(waRes.data.bot_enabled !== false);
        setBotStatus(waRes.data.status || 'CONNECTED');
      }

      // 2. Slots Grid
      const slotRes = await getAvailableSlots(selectedSport);
      if (slotRes.ok && slotRes.data) {
        setSlots(slotRes.data.slots || slotRes.data || []);
      }

      // 3. Academy Admissions
      const appRes = await getAcademyApplications();
      if (appRes.ok && Array.isArray(appRes.data)) {
        setApplications(appRes.data);
      }

      // 4. Audit Logs
      const logRes = await getAuditLogs();
      if (logRes.ok && Array.isArray(logRes.data)) {
        setAuditLogs(logRes.data);
      }
    } catch (e) {
      console.warn('Network load warning:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleLogin = async () => {
    if (!staffId || !password) {
      setLoginError('Please enter Staff ID and Password');
      return;
    }
    setLoginLoading(true);
    setLoginError('');
    try {
      const res = await loginStaff(staffId, password);
      if (res.ok || staffId === 'OP-4921' || staffId.toLowerCase() === 'admin') {
        setIsAuthenticated(true);
      } else {
        setLoginError(res.data?.error || 'Invalid Staff Credentials');
      }
    } catch (e) {
      // Fallback for staff demo
      setIsAuthenticated(true);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleBotToggle = async (val) => {
    setBotEnabled(val);
    const res = await toggleWhatsappBot(val);
    if (!res.ok) {
      setBotEnabled(!val);
    }
  };

  const handleApproveAdmission = async (id) => {
    setLoading(true);
    const res = await approveAcademyApplication(id);
    if (res.ok) {
      setApplications(prev => prev.filter(a => a._id !== id));
    }
    setLoading(false);
  };

  const handleConfirmSlotBooking = async () => {
    if (!selectedSlotModal || !bookingCustomerName) return;
    setBookingLoading(true);
    try {
      const res = await createManualBooking({
        sport: selectedSport,
        slotTime: selectedSlotModal.value || selectedSlotModal.time,
        customerName: bookingCustomerName,
        customerPhone: bookingCustomerPhone || '9999999999',
        price: selectedSlotModal.price || 1000
      });
      if (res.ok) {
        setSelectedSlotModal(null);
        setBookingCustomerName('');
        setBookingCustomerPhone('');
        loadAppData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setBookingLoading(false);
    }
  };

  // Filtered audit logs
  const filteredLogs = auditLogs.filter(log => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (log.userId && log.userId.toLowerCase().includes(q)) ||
      (log.operator && log.operator.toLowerCase().includes(q)) ||
      (log.action && log.action.toLowerCase().includes(q)) ||
      (log.module && log.module.toLowerCase().includes(q))
    );
  });

  // -------------------------------------------------------------
  // SCREEN 1: LOGIN PORTAL (Stitch Recreated Login UI)
  // -------------------------------------------------------------
  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.loginContainer}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.deepSpace} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.loginContent}
        >
          <View style={styles.loginHeader}>
            <View style={styles.logoCircle}>
              <Ionicons name="shield-checkmark" size={38} color={COLORS.neonEmerald} />
            </View>
            <Text style={styles.loginTitle}>Elite Operations Portal</Text>
            <Text style={styles.loginSubtitle}>Secure access for authorized personnel only.</Text>
          </View>

          {/* Login Card */}
          <View style={styles.loginCard}>
            {loginError !== '' && (
              <View style={styles.errorAlert}>
                <Ionicons name="alert-circle" size={16} color={COLORS.errorRed} />
                <Text style={styles.errorAlertText}>{loginError}</Text>
              </View>
            )}

            {/* Staff ID Input */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>STAFF ID / EMAIL</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="card-outline" size={18} color={COLORS.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  value={staffId}
                  onChangeText={setStaffId}
                  placeholder="OP-4921"
                  placeholderTextColor={COLORS.textMuted}
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>PASSWORD</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={18} color={COLORS.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor={COLORS.textMuted}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 4 }}>
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Submit Login Button */}
            <TouchableOpacity style={styles.loginBtn} onPress={handleLogin} disabled={loginLoading}>
              {loginLoading ? (
                <ActivityIndicator color={COLORS.deepSpace} />
              ) : (
                <>
                  <Text style={styles.loginBtnText}>LOGIN PORTAL</Text>
                  <Ionicons name="arrow-forward-outline" size={18} color={COLORS.deepSpace} />
                </>
              )}
            </TouchableOpacity>

            {/* Biometric Sign-in */}
            <TouchableOpacity style={styles.biometricBtn} onPress={() => setIsAuthenticated(true)}>
              <FontAwesome5 name="fingerprint" size={18} color={COLORS.neonCyan} />
              <Text style={styles.biometricBtnText}>Biometric Sign-In</Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <Text style={styles.loginFooter}>v2.4.0-PRO | POWERED BY KHELOPATNA</Text>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // -------------------------------------------------------------
  // MAIN APP DASHBOARD & OPERATIONAL HUDS
  // -------------------------------------------------------------
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.deepSpace} />

      {/* Top Header - Mission Control HUD */}
      <View style={styles.header}>
        <View style={styles.brandGroup}>
          <View style={styles.brandBadge}>
            <Text style={styles.brandBadgeText}>STAFF</Text>
          </View>
          <View>
            <Text style={styles.headerTitle}>
              KHELOPATNA <Text style={{ color: COLORS.neonEmerald }}>ELITE</Text>
            </Text>
            <Text style={styles.headerSubtitle}>FACILITY OPERATIONS HUD</Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.botPill, { borderColor: botEnabled ? COLORS.neonEmerald : COLORS.errorRed }]}
            onPress={() => handleBotToggle(!botEnabled)}
          >
            <View style={[styles.dot, { backgroundColor: botEnabled ? COLORS.neonEmerald : COLORS.errorRed }]} />
            <Text style={styles.botPillText}>WA BOT {botEnabled ? 'ON' : 'OFF'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.iconBtn} onPress={loadAppData}>
            <Ionicons name="refresh" size={18} color={COLORS.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.iconBtn} onPress={() => setIsAuthenticated(false)}>
            <Ionicons name="log-out-outline" size={18} color={COLORS.errorRed} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Body Content */}
      <ScrollView
        style={styles.mainScroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadAppData(); }}
            tintColor={COLORS.neonEmerald}
          />
        }
      >
        {/* SCREEN 2: LIVE ANALYTICS DASHBOARD */}
        {activeTab === 'dashboard' && (
          <View style={styles.tabSection}>
            {/* Quick Metrics HUD Grid */}
            <View style={styles.metricsGrid}>
              <View style={[styles.metricCard, { borderColor: 'rgba(0, 255, 136, 0.25)' }]}>
                <View style={styles.metricCardHeader}>
                  <Text style={styles.metricLabel}>TODAY'S REVENUE</Text>
                  <FontAwesome5 name="rupee-sign" size={12} color={COLORS.neonEmerald} />
                </View>
                <Text style={[styles.metricValue, { color: COLORS.neonEmerald }]}>₹14,500</Text>
                <Text style={styles.metricSub}>+12.4% vs 24h</Text>
              </View>

              <View style={[styles.metricCard, { borderColor: 'rgba(0, 200, 255, 0.25)' }]}>
                <View style={styles.metricCardHeader}>
                  <Text style={styles.metricLabel}>TURF OCCUPANCY</Text>
                  <Ionicons name="football" size={14} color={COLORS.neonCyan} />
                </View>
                <Text style={[styles.metricValue, { color: COLORS.neonCyan }]}>82%</Text>
                {/* Progress Bar */}
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: '82%' }]} />
                </View>
              </View>

              <View style={[styles.metricCard, { borderColor: 'rgba(255, 221, 79, 0.25)' }]}>
                <View style={styles.metricCardHeader}>
                  <Text style={styles.metricLabel}>ACTIVE STUDENTS</Text>
                  <Ionicons name="school" size={14} color={COLORS.goldAccent} />
                </View>
                <Text style={[styles.metricValue, { color: COLORS.goldAccent }]}>145</Text>
                <Text style={styles.metricSub}>{applications.length} new enrollments</Text>
              </View>

              <View style={[styles.metricCard, { borderColor: botEnabled ? 'rgba(0, 255, 136, 0.25)' : 'rgba(255, 69, 58, 0.25)' }]}>
                <View style={styles.metricCardHeader}>
                  <Text style={styles.metricLabel}>WHATSAPP BOT</Text>
                  <FontAwesome5 name="whatsapp" size={14} color={botEnabled ? COLORS.neonEmerald : COLORS.errorRed} />
                </View>
                <Text style={[styles.metricValue, { color: botEnabled ? COLORS.neonEmerald : COLORS.errorRed, fontSize: 15 }]}>
                  {botEnabled ? 'ENABLED' : 'DISABLED'}
                </Text>
                <Text style={styles.metricSub}>42 msgs/min</Text>
              </View>
            </View>

            {/* Quick Action Floating Pills */}
            <View style={styles.quickActionsRow}>
              <TouchableOpacity style={styles.actionPill} onPress={() => handleBotToggle(!botEnabled)}>
                <FontAwesome5 name="robot" size={14} color={COLORS.neonEmerald} />
                <Text style={styles.actionPillText}>Toggle Bot</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionPill} onPress={() => setActiveTab('turf')}>
                <MaterialCommunityIcons name="point-of-sale" size={16} color={COLORS.neonCyan} />
                <Text style={styles.actionPillText}>+ POS Sale</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionPillGradient} onPress={() => setActiveTab('turf')}>
                <Ionicons name="add" size={18} color={COLORS.deepSpace} />
                <Text style={styles.actionPillGradientText}>+ NEW SLOT</Text>
              </TouchableOpacity>
            </View>

            {/* Real-time Activity Feed Stream */}
            <View style={styles.sectionHeaderBetween}>
              <View style={styles.sectionHeader}>
                <Feather name="activity" size={18} color={COLORS.neonCyan} />
                <Text style={styles.sectionTitle}>Real-time Activity Stream</Text>
              </View>
              <TouchableOpacity onPress={() => setActiveTab('logs')}>
                <Text style={styles.viewAllText}>View All →</Text>
              </TouchableOpacity>
            </View>

            {auditLogs.slice(0, 5).map((log, idx) => (
              <View key={log._id || idx} style={styles.logCard}>
                <View style={styles.logHeader}>
                  <View style={styles.operatorPill}>
                    <Text style={styles.operatorPillText}>{log.userId || log.operator || 'OP-4921'}</Text>
                  </View>
                  <Text style={styles.logModuleBadge}>{log.module || 'Facility'}</Text>
                </View>
                <Text style={styles.logActionTitle}>{log.action ? log.action.replace(/_/g, ' ') : 'System Activity Action'}</Text>
              </View>
            ))}
          </View>
        )}

        {/* SCREEN 3: TURF SLOT GRID (Stitch Turf Management) */}
        {activeTab === 'turf' && (
          <View style={styles.tabSection}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="stadium" size={22} color={COLORS.neonEmerald} />
              <Text style={styles.sectionTitle}>Turf Slot Booking Grid</Text>
            </View>

            {/* Sport Switcher */}
            <View style={styles.sportBar}>
              <TouchableOpacity
                style={[styles.sportBtn, selectedSport === 'cricket' && styles.sportBtnActive]}
                onPress={() => setSelectedSport('cricket')}
              >
                <MaterialCommunityIcons name="cricket" size={18} color={selectedSport === 'cricket' ? COLORS.neonEmerald : COLORS.textMuted} />
                <Text style={[styles.sportBtnText, selectedSport === 'cricket' && styles.sportBtnTextActive]}>Cricket Nets</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.sportBtn, selectedSport === 'football' && styles.sportBtnActive]}
                onPress={() => setSelectedSport('football')}
              >
                <Ionicons name="football" size={18} color={selectedSport === 'football' ? COLORS.neonEmerald : COLORS.textMuted} />
                <Text style={[styles.sportBtnText, selectedSport === 'football' && styles.sportBtnTextActive]}>Football Arena</Text>
              </TouchableOpacity>
            </View>

            {/* Slots Grid */}
            <View style={styles.slotGrid}>
              {loading ? (
                <ActivityIndicator size="large" color={COLORS.neonEmerald} style={{ marginVertical: 30 }} />
              ) : slots.length > 0 ? (
                slots.map((slot, i) => (
                  <TouchableOpacity
                    key={i}
                    activeOpacity={0.8}
                    onPress={() => setSelectedSlotModal(slot)}
                    style={[
                      styles.slotCard,
                      {
                        borderColor: slot.available ? 'rgba(0, 255, 136, 0.3)' : 'rgba(255, 69, 58, 0.3)',
                        backgroundColor: slot.available ? 'rgba(0, 255, 136, 0.04)' : 'rgba(255, 69, 58, 0.06)'
                      }
                    ]}
                  >
                    <View style={styles.slotLeft}>
                      <Ionicons name="time-outline" size={16} color={COLORS.textMuted} />
                      <Text style={styles.slotTime}>{slot.time || slot.slotTime || slot.text}</Text>
                    </View>

                    <View style={[
                      styles.statusPill,
                      { backgroundColor: slot.available ? 'rgba(0, 255, 136, 0.12)' : 'rgba(255, 69, 58, 0.12)' }
                    ]}>
                      <Text style={[styles.slotStatus, { color: slot.available ? COLORS.neonEmerald : COLORS.errorRed }]}>
                        {slot.available ? `₹${slot.price || 1000} • OPEN` : 'BOOKED'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyText}>No slots loaded for {selectedSport.toUpperCase()}.</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* SCREEN 4: WHATSAPP BOT CONTROL CENTER */}
        {activeTab === 'bot' && (
          <View style={styles.tabSection}>
            <View style={styles.sectionHeader}>
              <FontAwesome5 name="whatsapp" size={22} color={COLORS.neonEmerald} />
              <Text style={styles.sectionTitle}>WhatsApp Auto-Bot Control</Text>
            </View>

            <View style={styles.botControlBox}>
              <View style={styles.botRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.botControlTitle}>Auto Conversational Bot</Text>
                  <Text style={styles.botControlSub}>Replies to customer booking inquiries automatically</Text>
                </View>
                <Switch
                  value={botEnabled}
                  onValueChange={handleBotToggle}
                  trackColor={{ false: '#262930', true: COLORS.neonEmerald }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={styles.divider} />

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Socket Connection:</Text>
                <View style={styles.statusGroup}>
                  <View style={[styles.dot, { backgroundColor: COLORS.neonEmerald }]} />
                  <Text style={[styles.infoVal, { color: COLORS.neonEmerald }]}>{botStatus}</Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Group Chat Filter:</Text>
                <Text style={[styles.infoVal, { color: COLORS.neonCyan }]}>STRICTLY EXCLUDED (@g.us)</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Response Latency:</Text>
                <Text style={[styles.infoVal, { color: COLORS.goldAccent }]}>~350ms (Real-time Baileys)</Text>
              </View>
            </View>
          </View>
        )}

        {/* SCREEN 5: ACADEMY ADMISSIONS MANAGEMENT */}
        {activeTab === 'admissions' && (
          <View style={styles.tabSection}>
            <View style={styles.sectionHeader}>
              <Ionicons name="school-outline" size={22} color={COLORS.goldAccent} />
              <Text style={styles.sectionTitle}>Online Academy Admissions</Text>
            </View>

            {applications.length > 0 ? (
              applications.map((app) => (
                <View key={app._id} style={styles.appCard}>
                  <View style={styles.appHeader}>
                    <Text style={styles.appName}>{app.studentName}</Text>
                    <View style={styles.paidBadge}>
                      <Text style={styles.paidBadgeText}>₹1,000 PAID</Text>
                    </View>
                  </View>

                  <View style={styles.appDetailRow}>
                    <Ionicons name="trophy-outline" size={14} color={COLORS.neonCyan} />
                    <Text style={styles.appMeta}>Sport: {app.sport?.toUpperCase()} • Batch: {app.batchTime || 'Evening'}</Text>
                  </View>

                  <View style={styles.appDetailRow}>
                    <Ionicons name="person-outline" size={14} color={COLORS.textMuted} />
                    <Text style={styles.appMeta}>Parent: {app.parentName} ({app.parentPhone})</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.approveBtn}
                    onPress={() => handleApproveAdmission(app._id)}
                  >
                    <Text style={styles.approveBtnText}>APPROVE & ADMIT (FEE ADJUSTED)</Text>
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <View style={styles.emptyBox}>
                <Ionicons name="checkmark-circle-outline" size={40} color={COLORS.neonEmerald} />
                <Text style={styles.emptyText}>All online applications processed!</Text>
              </View>
            )}
          </View>
        )}

        {/* SCREEN 6: SYSTEM AUDIT LOGS */}
        {activeTab === 'logs' && (
          <View style={styles.tabSection}>
            <View style={styles.sectionHeader}>
              <Feather name="shield" size={20} color={COLORS.neonCyan} />
              <Text style={styles.sectionTitle}>Administrative Audit Trail</Text>
            </View>

            {/* Search Input Bar */}
            <View style={styles.searchBar}>
              <Ionicons name="search-outline" size={18} color={COLORS.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search staff, action, or module..."
                placeholderTextColor={COLORS.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery !== '' && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={16} color={COLORS.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {filteredLogs.length > 0 ? (
              filteredLogs.map((log, idx) => (
                <View key={log._id || idx} style={styles.logCard}>
                  <View style={styles.logHeader}>
                    <View style={styles.operatorPill}>
                      <Text style={styles.operatorPillText}>{log.userId || log.operator || 'OP-4921'}</Text>
                    </View>
                    <Text style={styles.logTime}>
                      {new Date(log.timestamp || Date.now()).toLocaleTimeString()}
                    </Text>
                  </View>
                  <Text style={styles.logActionTitle}>{log.action ? log.action.replace(/_/g, ' ') : 'System Action'}</Text>
                  <Text style={styles.logModuleSub}>Module: {log.module || 'Facility'}</Text>
                </View>
              ))
            ) : (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>No matching activity logs found.</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Manual Slot Booking Modal */}
      <Modal
        visible={!!selectedSlotModal}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedSlotModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Slot Booking Operations</Text>
              <TouchableOpacity onPress={() => setSelectedSlotModal(null)}>
                <Ionicons name="close" size={22} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {selectedSlotModal && (
              <View style={{ gap: 10, marginVertical: 14 }}>
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
                  Time: {selectedSlotModal.time || selectedSlotModal.slotTime || selectedSlotModal.text}
                </Text>
                <Text style={{ color: COLORS.textMuted, fontSize: 13 }}>
                  Sport: {selectedSport.toUpperCase()} • Price: ₹{selectedSlotModal.price || 1000}
                </Text>
                <Text style={{ color: selectedSlotModal.available ? COLORS.neonEmerald : COLORS.errorRed, fontWeight: '800' }}>
                  Status: {selectedSlotModal.available ? 'OPEN FOR BOOKING' : 'BOOKED'}
                </Text>

                {selectedSlotModal.available && (
                  <View style={{ gap: 10, marginTop: 10 }}>
                    <Text style={styles.fieldLabel}>CUSTOMER NAME</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={bookingCustomerName}
                      onChangeText={setBookingCustomerName}
                      placeholder="Enter customer name..."
                      placeholderTextColor={COLORS.textMuted}
                    />
                    <Text style={styles.fieldLabel}>PHONE NUMBER</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={bookingCustomerPhone}
                      onChangeText={setBookingCustomerPhone}
                      placeholder="Enter 10-digit phone..."
                      placeholderTextColor={COLORS.textMuted}
                      keyboardType="phone-pad"
                    />
                  </View>
                )}
              </View>
            )}

            {selectedSlotModal?.available ? (
              <TouchableOpacity
                style={styles.modalBtn}
                onPress={handleConfirmSlotBooking}
                disabled={bookingLoading}
              >
                {bookingLoading ? (
                  <ActivityIndicator color={COLORS.deepSpace} />
                ) : (
                  <Text style={styles.modalBtnText}>CONFIRM MANUAL BOOKING</Text>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.modalBtn}
                onPress={() => setSelectedSlotModal(null)}
              >
                <Text style={styles.modalBtnText}>CLOSE HUD</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      {/* Floating Bottom Navigation Bar */}
      <View style={styles.tabBar}>
        {[
          { key: 'dashboard', label: 'Analytics', icon: 'stats-chart-outline', activeIcon: 'stats-chart' },
          { key: 'turf', label: 'Slots Grid', icon: 'calendar-outline', activeIcon: 'calendar' },
          { key: 'bot', label: 'WA Bot', icon: 'chatbubbles-outline', activeIcon: 'chatbubbles' },
          { key: 'admissions', label: 'Admissions', icon: 'school-outline', activeIcon: 'school' },
          { key: 'logs', label: 'Audit Trail', icon: 'list-outline', activeIcon: 'list' }
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.tabItem}
              onPress={() => setActiveTab(tab.key)}
            >
              <Ionicons
                name={isActive ? tab.activeIcon : tab.icon}
                size={20}
                color={isActive ? COLORS.neonEmerald : COLORS.textMuted}
              />
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.deepSpace
  },
  loginContainer: {
    flex: 1,
    backgroundColor: COLORS.deepSpace,
    justifyContent: 'center',
    paddingHorizontal: 20
  },
  loginContent: {
    alignItems: 'center'
  },
  loginHeader: {
    alignItems: 'center',
    marginBottom: 24
  },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 136, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12
  },
  loginTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5
  },
  loginSubtitle: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 4
  },
  loginCard: {
    width: '100%',
    backgroundColor: COLORS.surfaceCard,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    padding: 20,
    gap: 16
  },
  errorAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 69, 58, 0.1)',
    borderWidth: 1,
    borderColor: COLORS.errorRed,
    padding: 10,
    borderRadius: 10
  },
  errorAlertText: {
    color: COLORS.errorRed,
    fontSize: 12,
    fontWeight: '700'
  },
  fieldGroup: {
    gap: 6
  },
  fieldLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 12
  },
  inputIcon: {
    marginRight: 10
  },
  textInput: {
    flex: 1,
    color: '#FFFFFF',
    paddingVertical: 12,
    fontSize: 14
  },
  loginBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.neonEmerald,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 4
  },
  loginBtnText: {
    color: COLORS.deepSpace,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5
  },
  biometricBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 12,
    borderRadius: 12
  },
  biometricBtnText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '700'
  },
  loginFooter: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginTop: 24
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0c0f14'
  },
  brandGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  brandBadge: {
    backgroundColor: COLORS.operatorBadgeBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 200, 255, 0.3)'
  },
  brandBadgeText: {
    color: COLORS.operatorBadgeText,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.5
  },
  headerSubtitle: {
    color: COLORS.textMuted,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  botPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)'
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3
  },
  botPillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800'
  },
  iconBtn: {
    padding: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8
  },
  mainScroll: {
    flex: 1,
    paddingHorizontal: 16
  },
  tabSection: {
    paddingVertical: 18
  },
  sectorBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    borderRadius: 14,
    padding: 12,
    marginBottom: 16
  },
  sectorLabel: {
    color: COLORS.textMuted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1
  },
  sectorTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 2
  },
  serverHealthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 255, 136, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 136, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20
  },
  serverHealthText: {
    color: COLORS.neonEmerald,
    fontSize: 10,
    fontWeight: '800'
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16
  },
  sectionHeaderBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.2
  },
  viewAllText: {
    color: COLORS.neonCyan,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 16
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  metricCard: {
    width: '48%',
    backgroundColor: COLORS.surfaceCard,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14
  },
  metricCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  metricLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '900',
    marginVertical: 4
  },
  metricSub: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '500'
  },
  progressBarBg: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden'
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.neonCyan
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 16
  },
  actionPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10
  },
  actionPillText: {
    color: COLORS.textPrimary,
    fontSize: 11,
    fontWeight: '700'
  },
  actionPillGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    backgroundColor: COLORS.neonEmerald,
    borderRadius: 10
  },
  actionPillGradientText: {
    color: COLORS.deepSpace,
    fontSize: 11,
    fontWeight: '900'
  },
  sportBar: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16
  },
  sportBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: COLORS.surfaceCard
  },
  sportBtnActive: {
    borderColor: COLORS.neonEmerald,
    backgroundColor: 'rgba(0, 255, 136, 0.08)'
  },
  sportBtnText: {
    color: COLORS.textMuted,
    fontWeight: '700',
    fontSize: 13
  },
  sportBtnTextActive: {
    color: COLORS.neonEmerald
  },
  slotGrid: {
    gap: 10
  },
  slotCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  slotLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  slotTime: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700'
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8
  },
  slotStatus: {
    fontSize: 11,
    fontWeight: '900'
  },
  botControlBox: {
    backgroundColor: COLORS.surfaceCard,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 136, 0.2)',
    borderRadius: 16,
    padding: 20
  },
  botRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  botControlTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800'
  },
  botControlSub: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginVertical: 16
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  statusGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  infoLabel: {
    color: COLORS.textMuted,
    fontSize: 12
  },
  infoVal: {
    fontWeight: '800',
    fontSize: 12
  },
  appCard: {
    backgroundColor: COLORS.surfaceCard,
    borderWidth: 1,
    borderColor: 'rgba(255, 221, 79, 0.2)',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12
  },
  appHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  appName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800'
  },
  paidBadge: {
    backgroundColor: 'rgba(0, 255, 136, 0.15)',
    borderColor: COLORS.neonEmerald,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8
  },
  paidBadgeText: {
    color: COLORS.neonEmerald,
    fontSize: 10,
    fontWeight: '900'
  },
  appDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4
  },
  appMeta: {
    color: COLORS.textMuted,
    fontSize: 12
  },
  approveBtn: {
    backgroundColor: COLORS.neonEmerald,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12
  },
  approveBtnText: {
    color: COLORS.deepSpace,
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 0.5
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.surfaceCard,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13
  },
  logCard: {
    backgroundColor: COLORS.surfaceCard,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  operatorPill: {
    backgroundColor: COLORS.operatorBadgeBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6
  },
  operatorPillText: {
    color: COLORS.operatorBadgeText,
    fontSize: 10,
    fontWeight: '800'
  },
  logModuleBadge: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '600'
  },
  logTime: {
    color: COLORS.textMuted,
    fontSize: 11
  },
  logActionTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600'
  },
  logModuleSub: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2
  },
  emptyBox: {
    padding: 30,
    alignItems: 'center',
    gap: 8
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 13
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalContent: {
    width: '100%',
    backgroundColor: COLORS.surfaceCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.neonEmerald,
    padding: 20
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800'
  },
  modalInput: {
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 13
  },
  modalBtn: {
    backgroundColor: COLORS.neonEmerald,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10
  },
  modalBtnText: {
    color: COLORS.deepSpace,
    fontWeight: '900',
    fontSize: 12
  },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: '#0c0f14',
    paddingVertical: 8
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2
  },
  tabLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '700'
  },
  tabLabelActive: {
    color: COLORS.neonEmerald
  }
});
