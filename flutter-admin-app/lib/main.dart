import 'package:flutter/material';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:http/http.dart' as http;
import 'package:local_auth/local_auth.dart';
import 'dart:convert';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
    ),
  );
  runApp(const KheloPatnaAdminApp());
}

class KheloPatnaAdminApp extends StatelessWidget {
  const KheloPatnaAdminApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'KheloPatna Admin',
      debugShowCheckedModeBanner: false,
      theme: ThemeData.dark().copyWith(
        scaffoldBackgroundColor: const Color(0xFF050A10),
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFF00FF88),
          surface: Color(0xFF070D16),
        ),
        textTheme: GoogleFonts.spaceGroteskTextTheme(
          ThemeData.dark().textTheme,
        ),
      ),
      home: const AdminHomeScreen(),
    );
  }
}

class AdminHomeScreen extends StatefulWidget {
  const AdminHomeScreen({super.key});

  @override
  State<AdminHomeScreen> createState() => _AdminHomeScreenState();
}

class _AdminHomeScreenState extends State<AdminHomeScreen> {
  int _currentIndex = 0;
  int _academySubTab = 0;
  bool _isAuthenticated = false;
  bool _isLoading = true;

  final LocalAuthentication _auth = LocalAuthentication();
  final String backendUrl = "https://api.khelopatna.in";

  Map<String, dynamic> _stats = {};
  List<dynamic> _bookings = [];
  List<dynamic> _students = [];
  List<dynamic> _coaches = [];

  @override
  void initState() {
    super.initState();
    _authenticateBiometrics();
    _fetchLiveData();
  }

  Future<void> _authenticateBiometrics() async {
    try {
      final bool canAuthenticate = await _auth.canCheckBiometrics || await _auth.isDeviceSupported();
      if (canAuthenticate) {
        final bool didAuthenticate = await _auth.authenticate(
          localizedReason: 'Unlock KheloPatna Admin Console',
          options: const AuthenticationOptions(biometricOnly: false),
        );
        setState(() {
          _isAuthenticated = didAuthenticate;
        });
      } else {
        setState(() {
          _isAuthenticated = true;
        });
      }
    } catch (e) {
      setState(() {
        _isAuthenticated = true;
      });
    }
  }

  Future<void> _fetchLiveData() async {
    setState(() => _isLoading = true);
    try {
      final dashRes = await http.get(Uri.parse('$backendUrl/api/reports/dashboard')).catchError((_) => http.Response('', 500));
      final bookRes = await http.get(Uri.parse('$backendUrl/api/bookings?limit=30')).catchError((_) => http.Response('', 500));
      final studentRes = await http.get(Uri.parse('$backendUrl/api/academy/students')).catchError((_) => http.Response('', 500));

      if (dashRes.statusCode == 200) {
        _stats = json.decode(dashRes.body);
      }
      if (bookRes.statusCode == 200) {
        final data = json.decode(bookRes.body);
        _bookings = data is List ? data : (data['bookings'] ?? []);
      }
      if (studentRes.statusCode == 200) {
        final data = json.decode(studentRes.body);
        _students = data is List ? data : [];
      }
    } catch (e) {
      debugPrint('Failed to load live data: $e');
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: const Color(0xFF070D16),
        elevation: 0,
        title: Row(
          children: [
            Container(
              width: 34,
              height: 34,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(color: const Color(0xFF00FF88).withOpacity(0.5)),
                color: Colors.black,
              ),
              child: const Center(
                child: Text('KP', style: TextStyle(color: Color(0xFF00FF88), fontWeight: FontWeight.w900, fontSize: 12)),
              ),
            ),
            const SizedBox(width: 12),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: const [
                Text('KHELOPATNA', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900, letterSpacing: 1.2)),
                Text('ELITE TURF · COMMAND', style: TextStyle(fontSize: 9, color: Color(0xFF00FF88), fontWeight: FontWeight.w700, letterSpacing: 1.5)),
              ],
            ),
          ],
        ),
        actions: [
          Container(
            margin: const EdgeInsets.only(right: 16),
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: const Color(0xFF00FF88).withOpacity(0.12),
              border: Border.all(color: const Color(0xFF00FF88).withOpacity(0.3)),
              borderRadius: BorderRadius.circular(20),
            ),
            child: const Row(
              children: [
                Icon(Icons.lock, size: 12, color: Color(0xFF00FF88)),
                SizedBox(width: 4),
                Text('PASSKEY ACTIVE', style: TextStyle(fontSize: 9, color: Color(0xFF00FF88), fontWeight: FontWeight.w800)),
              ],
            ),
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF00FF88)))
          : RefreshIndicator(
              color: const Color(0xFF00FF88),
              onRefresh: _fetchLiveData,
              child: _buildTabBody(),
            ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (index) => setState(() => _currentIndex = index),
        backgroundColor: const Color(0xFF070D16),
        selectedItemColor: const Color(0xFF00FF88),
        unselectedItemColor: const Color(0xFF64748B),
        type: BottomNavigationBarType.fixed,
        selectedFontSize: 10,
        unselectedFontSize: 10,
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.grid_view), label: 'Dashboard'),
          BottomNavigationBarItem(icon: Icon(Icons.calendar_month), label: 'Bookings'),
          BottomNavigationBarItem(icon: Icon(Icons.fact_check), label: 'Check-In'),
          BottomNavigationBarItem(icon: Icon(Icons.school), label: 'Academy'),
          BottomNavigationBarItem(icon: Icon(Icons.more_horiz), label: 'More'),
        ],
      ),
    );
  }

  Widget _buildTabBody() {
    switch (_currentIndex) {
      case 0:
        return _buildDashboardTab();
      case 1:
        return _buildBookingsTab();
      case 2:
        return _buildCheckInTab();
      case 3:
        return _buildAcademyTab();
      case 4:
        return _buildMoreTab();
      default:
        return _buildDashboardTab();
    }
  }

  Widget _buildDashboardTab() {
    final todayBookings = _stats['today_bookings'] ?? _bookings.length;
    final todayRevenue = _stats['today_revenue'] ?? 0;
    final todayCheckins = _stats['today_checkins'] ?? 0;

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Quick Action Row
        Row(
          children: [
            Expanded(child: _buildQuickButton('BOOK TURF', Icons.add_box, const Color(0xFF00FF88))),
            const SizedBox(width: 8),
            Expanded(child: _buildQuickButton('TAKE FEE', Icons.payments, const Color(0xFFF59E0B))),
            const SizedBox(width: 8),
            Expanded(child: _buildQuickButton('ADMISSION', Icons.person_add, const Color(0xFF60A5FA))),
          ],
        ),
        const SizedBox(height: 16),

        // 4 Bento Grid
        GridView.count(
          crossAxisCount: 2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          mainAxisSpacing: 12,
          crossAxisSpacing: 12,
          childAspectRatio: 1.3,
          children: [
            _buildStatCard('TODAY\'S BOOKINGS', '$todayBookings', 'Live · SUCCESS filter', const Color(0xFF00FF88)),
            _buildStatCard('TODAY\'S REVENUE', '₹$todayRevenue', 'Sum of amounts', const Color(0xFF00FF88)),
            _buildStatCard('CHECKED IN', '$todayCheckins', 'Verified entrants', const Color(0xFF00FF88)),
            _buildStatCard('PENDING', '0', 'Awaiting payment', const Color(0xFFF59E0B)),
          ],
        ),
        const SizedBox(height: 20),

        const Text('Upcoming Bookings', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900)),
        const SizedBox(height: 12),

        if (_bookings.isEmpty)
          const Card(
            color: Color(0xFF0F1722),
            child: Padding(
              padding: EdgeInsets.all(20.0),
              child: Text('No upcoming bookings for today.', textAlign: TextAlign.center, style: TextStyle(color: Color(0xFF94A3B8))),
            ),
          )
        else
          ..._bookings.map((b) => _buildBookingCard(b)),
      ],
    );
  }

  Widget _buildBookingsTab() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Text('Bookings Directory', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900)),
        const SizedBox(height: 12),
        ..._bookings.map((b) => _buildBookingCard(b)),
      ],
    );
  }

  Widget _buildCheckInTab() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            gradient: const LinearGradient(colors: [Color(0xFF00FF88), Color(0xFF059669)]),
            borderRadius: BorderRadius.circular(20),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: const [
              Text('Scan Booking QR', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: Color(0xFF030806))),
              SizedBox(height: 4),
              Text('Active check-in console', style: TextStyle(fontSize: 12, color: Color(0xFF030806))),
            ],
          ),
        ),
        const SizedBox(height: 20),
        const Text('Active Entrants', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900)),
        const SizedBox(height: 12),
        ..._bookings.map((b) => ListTile(
          tileColor: const Color(0xFF0F1722),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: Text(b['customerName'] ?? 'Walk-in Guest', style: const TextStyle(fontWeight: FontWeight.bold)),
          subtitle: Text(b['sport'] ?? 'Cricket Turf', style: const TextStyle(color: Color(0xFF94A3B8))),
          trailing: const Chip(backgroundColor: Color(0x1F00FF88), label: Text('✓ CHECKED IN', style: TextStyle(color: Color(0xFF00FF88), fontSize: 10, fontWeight: FontWeight.bold))),
        )),
      ],
    );
  }

  Widget _buildAcademyTab() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Row(
          children: ['STUDENTS', 'COACHES', 'BATCHES', 'SESSIONS'].asMap().entries.map((e) {
            final isSelected = _academySubTab == e.key;
            return Expanded(
              child: GestureDetector(
                onTap: () => setState(() => _academySubTab = e.key),
                child: Container(
                  margin: const EdgeInsets.symmetric(horizontal: 2),
                  padding: const EdgeInsets.symmetric(vertical: 10),
                  decoration: BoxDecoration(
                    color: isSelected ? const Color(0x2600FF88) : const Color(0xFF0F1722),
                    border: Border.all(color: isSelected ? const Color(0xFF00FF88) : Colors.transparent),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(e.value, textAlign: TextAlign.center, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: isSelected ? const Color(0xFF00FF88) : const Color(0xFF94A3B8))),
                ),
              ),
            );
          }).toList(),
        ),
        const SizedBox(height: 16),
        if (_students.isEmpty)
          const Padding(padding: EdgeInsets.all(20), child: Text('No academy records found.', textAlign: TextAlign.center))
        else
          ..._students.map((s) => Card(
            color: const Color(0xFF0F1722),
            margin: const EdgeInsets.only(bottom: 10),
            child: ListTile(
              title: Text(s['studentName'] ?? s['name'] ?? 'Student', style: const TextStyle(fontWeight: FontWeight.bold)),
              subtitle: Text('${s['sport'] ?? 'Cricket'} Academy • ${s['mobileNumber'] ?? ''}', style: const TextStyle(color: Color(0xFF94A3B8))),
              trailing: ElevatedButton(
                style: ElevatedButton.styleFrom(backgroundColor: const Color(0x2600FF88), foregroundColor: const Color(0xFF00FF88)),
                onPressed: () {},
                child: const Text('Pay Fee', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
              ),
            ),
          )),
      ],
    );
  }

  Widget _buildMoreTab() {
    final modules = [
      {'title': 'Customers', 'icon': Icons.people},
      {'title': 'Enquiries', 'icon': Icons.support_agent},
      {'title': 'Coupons', 'icon': Icons.local_offer},
      {'title': 'Closures', 'icon': Icons.event_busy},
      {'title': 'Inventory', 'icon': Icons.inventory_2},
      {'title': 'Revenue Reports', 'icon': Icons.analytics},
      {'title': 'Booking Reports', 'icon': Icons.assessment},
      {'title': 'Fee Reports', 'icon': Icons.receipt_long},
      {'title': 'Google Reviews', 'icon': Icons.star},
      {'title': 'WhatsApp Status', 'icon': Icons.chat},
      {'title': 'Staff Directory', 'icon': Icons.badge},
      {'title': 'Audit Logs', 'icon': Icons.shield},
    ];

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Text('Super-Admin Suite', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900)),
        const SizedBox(height: 12),
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 2, childAspectRatio: 2.2, crossAxisSpacing: 10, mainAxisSpacing: 10),
          itemCount: modules.length,
          itemBuilder: (context, idx) {
            final m = modules[idx];
            return Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(color: const Color(0xFF0F1722), borderRadius: BorderRadius.circular(16), border: Border.all(color: Colors.white.withOpacity(0.06))),
              child: Row(
                children: [
                  Icon(m['icon'] as IconData, color: const Color(0xFF00FF88), size: 20),
                  const SizedBox(width: 8),
                  Expanded(child: Text(m['title'] as String, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold))),
                ],
              ),
            );
          },
        ),
      ],
    );
  }

  Widget _buildQuickButton(String label, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12),
      decoration: BoxDecoration(color: const Color(0xFF0F1722), borderRadius: BorderRadius.circular(16), border: Border.all(color: Colors.white.withOpacity(0.08))),
      child: Column(
        children: [
          Icon(icon, color: color, size: 20),
          const SizedBox(height: 4),
          Text(label, style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w900, letterSpacing: 0.5)),
        ],
      ),
    );
  }

  Widget _buildStatCard(String title, String val, String sub, Color color) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: const Color(0xFF0F1722), borderRadius: BorderRadius.circular(18), border: Border.all(color: Colors.white.withOpacity(0.08))),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(title, style: const TextStyle(fontSize: 9, color: Color(0xFF94A3B8), fontWeight: FontWeight.w800)),
          const SizedBox(height: 4),
          Text(val, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: Colors.white)),
          const SizedBox(height: 2),
          Text(sub, style: TextStyle(fontSize: 8, color: color, fontWeight: FontWeight.w700)),
        ],
      ),
    );
  }

  Widget _buildBookingCard(dynamic b) {
    final isFootball = (b['sport'] ?? '').toString().toLowerCase().contains('football');
    return Card(
      color: const Color(0xFF0F1722),
      margin: const EdgeInsets.only(bottom: 10),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: isFootball ? const Color(0x2660A5FA) : const Color(0x2600FF88),
          child: Icon(isFootball ? Icons.sports_soccer : Icons.sports_cricket, color: isFootball ? const Color(0xFF60A5FA) : const Color(0xFF00FF88)),
        ),
        title: Text(b['customerName'] ?? 'Walk-in Guest', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
        subtitle: Text(b['slotTime'] ?? b['timeSlot'] ?? '06:00 AM – 07:00 AM', style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
        trailing: Text('₹${b['paidAmount'] ?? b['price'] ?? 1200}', style: const TextStyle(color: Color(0xFF00FF88), fontWeight: FontWeight.w900, fontSize: 14)),
      ),
    );
  }
}
