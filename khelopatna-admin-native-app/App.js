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
  SafeAreaView,
  StatusBar,
  RefreshControl
} from 'react-native';
import {
  getWhatsappStatus,
  toggleWhatsappBot,
  getAvailableSlots,
  getAcademyApplications,
  approveAcademyApplication,
  getAuditLogs
} from './src/services/apiService';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  // App State
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [botEnabled, setBotEnabled] = useState(true);
  const [botStatus, setBotStatus] = useState('CONNECTED');
  const [slots, setSlots] = useState([]);
  const [selectedSport, setSelectedSport] = useState('cricket');
  const [applications, setApplications] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  // Load initial data
  useEffect(() => {
    loadAppData();
  }, [selectedSport]);

  const loadAppData = async () => {
    setLoading(true);
    try {
      // 1. WhatsApp Bot Status
      const waRes = await getWhatsappStatus();
      if (waRes.ok && waRes.data) {
        setBotEnabled(waRes.data.bot_enabled !== false);
        setBotStatus(waRes.data.status || 'CONNECTED');
      }

      // 2. Slots
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

  const handleBotToggle = async (val) => {
    setBotEnabled(val);
    const res = await toggleWhatsappBot(val);
    if (!res.ok) {
      setBotEnabled(!val); // revert on failure
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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#040609" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.brandGroup}>
          <View style={styles.brandBadge}>
            <Text style={styles.brandBadgeText}>STAFF</Text>
          </View>
          <Text style={styles.headerTitle}>KHELOPATNA <Text style={{ color: '#00FF88' }}>ADMIN</Text></Text>
        </View>
        <TouchableOpacity
          style={[styles.botPill, { borderColor: botEnabled ? '#00FF88' : '#FF4444' }]}
          onPress={() => handleBotToggle(!botEnabled)}
        >
          <View style={[styles.dot, { backgroundColor: botEnabled ? '#00FF88' : '#FF4444' }]} />
          <Text style={styles.botPillText}>WA BOT {botEnabled ? 'ON' : 'OFF'}</Text>
        </TouchableOpacity>
      </View>

      {/* Body Content */}
      <ScrollView
        style={styles.mainScroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadAppData(); }} tintColor="#00FF88" />
        }
      >
        {activeTab === 'dashboard' && (
          <View style={styles.tabSection}>
            <Text style={styles.sectionTitle}>Operations Overview</Text>

            {/* Quick Metrics Grid */}
            <View style={styles.metricsGrid}>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>TODAY'S REVENUE</Text>
                <Text style={[styles.metricValue, { color: '#00FF88' }]}>₹14,500</Text>
                <Text style={styles.metricSub}>12 Bookings + 2 Fees</Text>
              </View>

              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>TURF OCCUPANCY</Text>
                <Text style={[styles.metricValue, { color: '#00C8FF' }]}>85%</Text>
                <Text style={styles.metricSub}>Cricket & Football</Text>
              </View>

              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>ONLINE INTAKE</Text>
                <Text style={[styles.metricValue, { color: '#FFD700' }]}>{applications.length}</Text>
                <Text style={styles.metricSub}>₹1k Paid Applications</Text>
              </View>

              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>WHATSAPP BOT</Text>
                <Text style={[styles.metricValue, { color: botEnabled ? '#00FF88' : '#FF4444' }]}>
                  {botEnabled ? 'ENABLED' : 'DISABLED'}
                </Text>
                <Text style={styles.metricSub}>{botStatus}</Text>
              </View>
            </View>

            {/* Recent Audit Logs Stream */}
            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Recent Staff Activities</Text>
            {auditLogs.slice(0, 5).map((log, idx) => (
              <View key={log._id || idx} style={styles.logCard}>
                <View style={styles.logHeader}>
                  <Text style={styles.logOperator}>{log.userId || log.operator || 'Owner'}</Text>
                  <Text style={styles.logModule}>{log.module || 'System'}</Text>
                </View>
                <Text style={styles.logAction}>{log.action ? log.action.replace(/_/g, ' ') : 'Activity Action'}</Text>
              </View>
            ))}
          </View>
        )}

        {activeTab === 'turf' && (
          <View style={styles.tabSection}>
            <Text style={styles.sectionTitle}>Turf Slot Grid</Text>

            {/* Sport Switcher */}
            <View style={styles.sportBar}>
              <TouchableOpacity
                style={[styles.sportBtn, selectedSport === 'cricket' && styles.sportBtnActive]}
                onPress={() => setSelectedSport('cricket')}
              >
                <Text style={[styles.sportBtnText, selectedSport === 'cricket' && styles.sportBtnTextActive]}>Cricket Nets</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sportBtn, selectedSport === 'football' && styles.sportBtnActive]}
                onPress={() => setSelectedSport('football')}
              >
                <Text style={[styles.sportBtnText, selectedSport === 'football' && styles.sportBtnTextActive]}>Football Arena</Text>
              </TouchableOpacity>
            </View>

            {/* Slots Grid */}
            <View style={styles.slotGrid}>
              {slots.length > 0 ? (
                slots.map((slot, i) => (
                  <View
                    key={i}
                    style={[
                      styles.slotCard,
                      { borderColor: slot.available ? '#00FF88' : '#FF4444', backgroundColor: slot.available ? 'rgba(0, 255, 136, 0.06)' : 'rgba(255, 68, 68, 0.08)' }
                    ]}
                  >
                    <Text style={styles.slotTime}>{slot.time || slot.slotTime}</Text>
                    <Text style={[styles.slotStatus, { color: slot.available ? '#00FF88' : '#FF4444' }]}>
                      {slot.available ? '₹' + (slot.price || 600) + ' • OPEN' : 'BOOKED'}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>Loading slot availability...</Text>
              )}
            </View>
          </View>
        )}

        {activeTab === 'bot' && (
          <View style={styles.tabSection}>
            <Text style={styles.sectionTitle}>WhatsApp Auto-Bot Control</Text>

            <View style={styles.botControlBox}>
              <View style={styles.botRow}>
                <View>
                  <Text style={styles.botControlTitle}>Auto Conversational Bot</Text>
                  <Text style={styles.botControlSub}>Replies to 1-on-1 chats automatically</Text>
                </View>
                <Switch
                  value={botEnabled}
                  onValueChange={handleBotToggle}
                  trackColor={{ false: '#333', true: '#00FF88' }}
                  thumbColor="#fff"
                />
              </View>

              <View style={styles.divider} />

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Socket Status:</Text>
                <Text style={[styles.infoVal, { color: '#00FF88' }]}>{botStatus}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Group Exclusion Filter:</Text>
                <Text style={[styles.infoVal, { color: '#00C8FF' }]}>STRICTLY EXCLUDED (@g.us)</Text>
              </View>
            </View>
          </View>
        )}

        {activeTab === 'admissions' && (
          <View style={styles.tabSection}>
            <Text style={styles.sectionTitle}>Online Admissions (₹1k Paid)</Text>

            {applications.length > 0 ? (
              applications.map((app) => (
                <View key={app._id} style={styles.appCard}>
                  <View style={styles.appHeader}>
                    <Text style={styles.appName}>{app.studentName}</Text>
                    <View style={styles.paidBadge}>
                      <Text style={styles.paidBadgeText}>₹1,000 PAID</Text>
                    </View>
                  </View>
                  <Text style={styles.appMeta}>Sport: {app.sport?.toUpperCase()} • Batch: {app.batchTime}</Text>
                  <Text style={styles.appMeta}>Parent: {app.parentName} ({app.parentPhone})</Text>

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
                <Text style={styles.emptyText}>No pending online applications found.</Text>
              </View>
            )}
          </View>
        )}

        {activeTab === 'logs' && (
          <View style={styles.tabSection}>
            <Text style={styles.sectionTitle}>Administrative Audit Trail</Text>
            {auditLogs.map((log, idx) => (
              <View key={log._id || idx} style={styles.logCard}>
                <View style={styles.logHeader}>
                  <View style={styles.operatorPill}>
                    <Text style={styles.operatorPillText}>{log.userId || log.operator || 'Owner'}</Text>
                  </View>
                  <Text style={styles.logTime}>{new Date(log.timestamp || Date.now()).toLocaleTimeString()}</Text>
                </View>
                <Text style={styles.logActionTitle}>{log.action ? log.action.replace(/_/g, ' ') : 'System Action'}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Bottom Tab Bar */}
      <View style={styles.tabBar}>
        {[
          { key: 'dashboard', label: 'Dashboard' },
          { key: 'turf', label: 'Turf Slots' },
          { key: 'bot', label: 'WA Bot' },
          { key: 'admissions', label: 'Admissions' },
          { key: 'logs', label: 'Audit Logs' }
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={styles.tabItem}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#040609'
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(16, 185, 129, 0.2)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#08120e'
  },
  brandGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  brandBadge: {
    backgroundColor: '#1e3a8a',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6
  },
  brandBadgeText: {
    color: '#60A5FA',
    fontSize: 10,
    fontWeight: '800'
  },
  headerTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5
  },
  botPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: 'rgba(8, 16, 12, 0.8)'
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4
  },
  botPillText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800'
  },
  mainScroll: {
    flex: 1,
    paddingHorizontal: 16
  },
  tabSection: {
    paddingVertical: 20
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 16
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  metricCard: {
    width: '48%',
    backgroundColor: 'rgba(8, 18, 14, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    borderRadius: 14,
    padding: 14
  },
  metricLabel: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '900',
    marginVertical: 4
  },
  metricSub: {
    color: '#cbd5e1',
    fontSize: 11
  },
  sportBar: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16
  },
  sportBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    backgroundColor: '#08120e'
  },
  sportBtnActive: {
    borderColor: '#00FF88',
    backgroundColor: 'rgba(0, 255, 136, 0.12)'
  },
  sportBtnText: {
    color: '#94a3b8',
    fontWeight: '700',
    fontSize: 13
  },
  sportBtnTextActive: {
    color: '#00FF88'
  },
  slotGrid: {
    gap: 10
  },
  slotCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    justify: 'space-between',
    alignItems: 'center'
  },
  slotTime: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700'
  },
  slotStatus: {
    fontSize: 12,
    fontWeight: '800'
  },
  botControlBox: {
    backgroundColor: 'rgba(8, 18, 14, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: 16,
    padding: 20
  },
  botRow: {
    flexDirection: 'row',
    justify: 'space-between',
    alignItems: 'center'
  },
  botControlTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800'
  },
  botControlSub: {
    color: '#94a3b8',
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
    justify: 'space-between',
    marginBottom: 8
  },
  infoLabel: {
    color: '#94a3b8',
    fontSize: 12
  },
  infoVal: {
    fontWeight: '800',
    fontSize: 12
  },
  appCard: {
    backgroundColor: 'rgba(8, 18, 14, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12
  },
  appHeader: {
    flexDirection: 'row',
    justify: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  appName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800'
  },
  paidBadge: {
    backgroundColor: 'rgba(0, 255, 136, 0.15)',
    borderColor: '#00FF88',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8
  },
  paidBadgeText: {
    color: '#00FF88',
    fontSize: 10,
    fontWeight: '900'
  },
  appMeta: {
    color: '#cbd5e1',
    fontSize: 12,
    marginBottom: 4
  },
  approveBtn: {
    backgroundColor: '#00FF88',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10
  },
  approveBtnText: {
    color: '#040609',
    fontWeight: '900',
    fontSize: 12
  },
  logCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8
  },
  logHeader: {
    flexDirection: 'row',
    justify: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  operatorPill: {
    backgroundColor: 'rgba(67, 56, 202, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6
  },
  operatorPillText: {
    color: '#818CF8',
    fontSize: 10,
    fontWeight: '800'
  },
  logTime: {
    color: '#64748B',
    fontSize: 11
  },
  logActionTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600'
  },
  emptyBox: {
    padding: 30,
    alignItems: 'center'
  },
  emptyText: {
    color: '#64748B',
    fontSize: 13
  },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(16, 185, 129, 0.15)',
    backgroundColor: '#08120e',
    paddingVertical: 12
  },
  tabItem: {
    flex: 1,
    alignItems: 'center'
  },
  tabLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700'
  },
  tabLabelActive: {
    color: '#00FF88'
  }
});
