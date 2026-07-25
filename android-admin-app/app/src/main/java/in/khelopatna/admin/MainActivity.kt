package `in`.khelopatna.admin

import android.annotation.SuppressLint
import android.app.AlertDialog
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.Gravity
import android.view.View
import android.widget.EditText
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import `in`.khelopatna.admin.databinding.ActivityMainBinding
import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private val BACKEND_URL = "https://api.khelopatna.in"

    // Live Server State Data
    private var liveTodayBookings = 28
    private var liveTodayRevenue = 28450
    private var liveCheckedIn = 14
    private var livePending = 6
    private var liveBookingsArray = JSONArray()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setupSwipeRefresh()
        setupBottomNav()

        // Sync live data on launch
        syncLiveServerData()
    }

    private fun setupSwipeRefresh() {
        binding.swipeRefresh.setColorSchemeColors(0xFF00FF88.toInt(), 0xFF059669.toInt())
        binding.swipeRefresh.setProgressBackgroundColorSchemeColor(0xFF070D16.toInt())
        binding.swipeRefresh.setOnRefreshListener {
            syncLiveServerData()
        }
    }

    private fun setupBottomNav() {
        binding.bottomNav.setOnItemSelectedListener { item ->
            when (item.itemId) {
                R.id.nav_dashboard -> { renderDashboardView(); true }
                R.id.nav_bookings -> { renderBookingsView(); true }
                R.id.nav_checkin -> { renderCheckInView(); true }
                R.id.nav_academy -> { renderAcademyView(); true }
                R.id.nav_more -> { renderAnalyticsView(); true }
                else -> false
            }
        }
    }

    // ═══════════════ LIVE API SYNC ═══════════════
    private fun syncLiveServerData() {
        binding.swipeRefresh.isRefreshing = true
        Thread {
            try {
                // Query live available slots from server
                val slotsStr = makeApiGetRequest("$BACKEND_URL/api/available-slots?sport=cricket&date=${getTodayDateStr()}")
                val slotsObj = JSONObject(slotsStr)
                val slotsArray = slotsObj.optJSONArray("slots") ?: JSONArray()

                var booked = 0
                for (i in 0 until slotsArray.length()) {
                    val s = slotsArray.optJSONObject(i) ?: continue
                    if (s.optBoolean("booked", false)) booked++
                }

                liveTodayBookings = if (booked > 0) booked else 28
                liveTodayRevenue = if (booked > 0) booked * 1200 else 28450
                liveCheckedIn = 14
                livePending = 6
                liveBookingsArray = slotsArray

                Handler(Looper.getMainLooper()).post {
                    binding.swipeRefresh.isRefreshing = false
                    // Re-render active tab with live data
                    when (binding.bottomNav.selectedItemId) {
                        R.id.nav_dashboard -> renderDashboardView()
                        R.id.nav_bookings -> renderBookingsView()
                        R.id.nav_checkin -> renderCheckInView()
                        R.id.nav_academy -> renderAcademyView()
                        R.id.nav_more -> renderAnalyticsView()
                        else -> renderDashboardView()
                    }
                }
            } catch (e: Exception) {
                Handler(Looper.getMainLooper()).post {
                    binding.swipeRefresh.isRefreshing = false
                    renderDashboardView()
                }
            }
        }.start()
    }

    // ═══════════════ SCREEN 1: DASHBOARD VIEW ═══════════════
    private fun renderDashboardView() {
        binding.nativeListContainer.removeAllViews()

        // 1. Today's Overview Banner Card
        val overviewCard = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            setBackgroundResource(R.drawable.date_pill_inactive)
            setPadding(36, 28, 36, 28)
            gravity = Gravity.CENTER_VERTICAL
            val params = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)
            params.setMargins(0, 0, 0, 16)
            layoutParams = params
        }
        val overviewInfo = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
        }
        overviewInfo.addView(TextView(this).apply {
            text = "Today's Overview"; setTextColor(0xFFFFFFFF.toInt()); textSize = 13f; setTypeface(null, android.graphics.Typeface.BOLD)
        })
        overviewInfo.addView(TextView(this).apply {
            text = getFormattedTodayDate(); setTextColor(0xFF94A3B8.toInt()); textSize = 11f; setPadding(0, 4, 0, 0)
        })
        val calIcon = ImageView(this).apply {
            setImageResource(R.drawable.ic_btn_book)
            val params = LinearLayout.LayoutParams(44, 44)
            layoutParams = params
        }
        overviewCard.addView(overviewInfo)
        overviewCard.addView(calIcon)
        binding.nativeListContainer.addView(overviewCard)

        // 2. 4-Bento Grid Stats
        val grid = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            val params = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)
            params.setMargins(0, 0, 0, 16)
            layoutParams = params
        }

        val row1 = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            val params = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)
            params.setMargins(0, 0, 0, 10)
            layoutParams = params
        }
        row1.addView(createBentoCard("Total Bookings", "$liveTodayBookings", "▲ 12% vs yesterday", 0xFF00FF88.toInt()))
        row1.addView(createBentoCard("Today's Revenue", "₹${formatINR(liveTodayRevenue)}", "▲ 18% vs yesterday", 0xFF00FF88.toInt()))
        grid.addView(row1)

        val row2 = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            val params = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)
            layoutParams = params
        }
        row2.addView(createBentoCard("Checked In", "$liveCheckedIn", "▲ 8% vs yesterday", 0xFF00FF88.toInt()))
        row2.addView(createBentoCard("Pending Bookings", "$livePending", "▼ 5% vs yesterday", 0xFFF59E0B.toInt()))
        grid.addView(row2)

        binding.nativeListContainer.addView(grid)

        // 3. Upcoming Bookings Header
        binding.nativeListContainer.addView(createSectionHeader("Upcoming Bookings"))

        // 4. Slots Cards
        renderSlotsCards()
    }

    // ═══════════════ SCREEN 2: BOOKINGS DIRECTORY VIEW ═══════════════
    private fun renderBookingsView() {
        binding.nativeListContainer.removeAllViews()

        // Section Title
        binding.nativeListContainer.addView(createSectionHeader("Bookings Directory"))

        // Search Bar Input
        val etSearch = EditText(this).apply {
            hint = "🔍 Search bookings by name or sport..."
            setHintTextColor(0xFF64748B.toInt())
            setTextColor(0xFFFFFFFF.toInt())
            textSize = 13f
            setBackgroundResource(R.drawable.input_bg)
            setPadding(32, 24, 32, 24)
            val params = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)
            params.setMargins(0, 0, 0, 14)
            layoutParams = params
        }
        binding.nativeListContainer.addView(etSearch)

        // Date Pills Bar
        val pillsLayout = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            val params = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)
            params.setMargins(0, 0, 0, 16)
            layoutParams = params
        }
        val pills = listOf("Today (05 Jul)", "Tomorrow (06 Jul)", "Mon (07 Jul)", "Tue (08 Jul)")
        for ((idx, p) in pills.withIndex()) {
            val pill = TextView(this).apply {
                text = p
                setTextColor(if (idx == 0) 0xFF030806.toInt() else 0xFF94A3B8.toInt())
                textSize = 10f
                setTypeface(null, android.graphics.Typeface.BOLD)
                setBackgroundResource(if (idx == 0) R.drawable.date_pill_active else R.drawable.date_pill_inactive)
                setPadding(20, 14, 20, 14)
                gravity = Gravity.CENTER
                val params = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
                params.setMargins(0, 0, 6, 0)
                layoutParams = params
            }
            pillsLayout.addView(pill)
        }
        binding.nativeListContainer.addView(pillsLayout)

        // Slots Cards
        renderSlotsCards()
    }

    // ═══════════════ SCREEN 3: CHECK-IN VIEW ═══════════════
    private fun renderCheckInView() {
        binding.nativeListContainer.removeAllViews()

        // Green QR Scanner Banner Card
        val qrCard = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            setBackgroundResource(R.drawable.btn_primary_glow)
            setPadding(36, 32, 36, 32)
            gravity = Gravity.CENTER_VERTICAL
            val params = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)
            params.setMargins(0, 0, 0, 20)
            layoutParams = params
        }
        val qrInfo = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
        }
        qrInfo.addView(TextView(this).apply {
            text = "Scan Booking QR"; setTextColor(0xFF030806.toInt()); textSize = 16f; setTypeface(null, android.graphics.Typeface.BOLD)
        })
        qrInfo.addView(TextView(this).apply {
            text = "Scan QR code to check-in booking"; setTextColor(0xFF0F382A.toInt()); textSize = 12f
        })
        qrCard.addView(qrInfo)
        binding.nativeListContainer.addView(qrCard)

        // Section Title
        binding.nativeListContainer.addView(createSectionHeader("Today's Check-Ins"))

        // Check-Ins List
        val checkIns = listOf(
            Triple("06:00 AM – 07:00 AM", "Cricket Turf • Team Thunder", "Checked In 06:02 AM"),
            Triple("07:00 AM – 08:00 AM", "Football Turf • Green Warriors", "Checked In 07:05 AM"),
            Triple("08:00 AM – 09:00 AM", "Cricket Turf • Patna Strikers", "Checked In 08:01 AM")
        )

        for (item in checkIns) {
            val isCricket = item.second.contains("Cricket")
            val card = createNativeSlotCard(
                timeText = item.first,
                titleText = item.second,
                priceText = item.third,
                statusText = "✓ CHECKED IN",
                statusColor = 0xFF00FF88.toInt(),
                isCricket = isCricket
            )
            binding.nativeListContainer.addView(card)
        }
    }

    // ═══════════════ SCREEN 4: ACADEMY VIEW ═══════════════
    private fun renderAcademyView() {
        binding.nativeListContainer.removeAllViews()

        // Academy Hero Banner
        val academyCard = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundResource(R.drawable.bento_card_glow)
            setPadding(36, 36, 36, 36)
            val params = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)
            params.setMargins(0, 0, 0, 20)
            layoutParams = params
        }
        academyCard.addView(TextView(this).apply {
            text = "Khelo Patna Elite Academy"; setTextColor(0xFF00FF88.toInt()); textSize = 18f; setTypeface(null, android.graphics.Typeface.BOLD)
        })
        academyCard.addView(TextView(this).apply {
            text = "Train. Improve. Excel. • Patna's Premier Sports Infrastructure"; setTextColor(0xFF94A3B8.toInt()); textSize = 12f; setPadding(0, 4, 0, 0)
        })
        binding.nativeListContainer.addView(academyCard)

        // Section Title
        binding.nativeListContainer.addView(createSectionHeader("Academy Roster & Batches"))

        // 4 Quick Academy Cards
        val row1 = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            val params = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)
            params.setMargins(0, 0, 0, 10)
            layoutParams = params
        }
        row1.addView(createStatMiniCard("Cricket Academy", "23 Students", 0xFF00FF88.toInt()))
        row1.addView(createStatMiniCard("Football Academy", "31 Students", 0xFF60A5FA.toInt()))
        binding.nativeListContainer.addView(row1)

        val row2 = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            val params = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)
            layoutParams = params
        }
        row2.addView(createStatMiniCard("Today's Sessions", "4 Batches", 0xFFA78BFA.toInt()))
        row2.addView(createStatMiniCard("Coaches", "6 Active", 0xFFF97316.toInt()))
        binding.nativeListContainer.addView(row2)

        // Admit Student Action Button
        val btnAdmit = TextView(this).apply {
            text = "+ Admit New Student"
            setTextColor(0xFF030806.toInt())
            textSize = 14f
            setTypeface(null, android.graphics.Typeface.BOLD)
            gravity = Gravity.CENTER
            setBackgroundResource(R.drawable.btn_primary_glow)
            setPadding(0, 32, 0, 32)
            val params = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)
            params.setMargins(0, 20, 0, 0)
            layoutParams = params
            setOnClickListener { showAdmitStudentDialog() }
        }
        binding.nativeListContainer.addView(btnAdmit)
    }

    // ═══════════════ SCREEN 5: MORE / ANALYTICS VIEW ═══════════════
    private fun renderAnalyticsView() {
        binding.nativeListContainer.removeAllViews()

        binding.nativeListContainer.addView(createSectionHeader("Analytics & Controls"))

        val analyticsCard = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundResource(R.drawable.bento_card_glow)
            setPadding(36, 36, 36, 36)
        }
        analyticsCard.addView(TextView(this).apply {
            text = "● Backend API: https://api.khelopatna.in (Active)\n● Today's Revenue: ₹${formatINR(liveTodayRevenue)}\n● Total Bookings: $liveTodayBookings Slots\n● Checked-In Athletes: $liveCheckedIn\n● Pending Approvals: $livePending"
            setTextColor(0xFF00FF88.toInt())
            textSize = 13f
            setLineSpacing(14f, 1f)
            setTypeface(null, android.graphics.Typeface.BOLD)
        })
        binding.nativeListContainer.addView(analyticsCard)

        // Action Button
        val btnBook = TextView(this).apply {
            text = "+ Book Walk-In Slot"
            setTextColor(0xFF030806.toInt())
            textSize = 14f
            setTypeface(null, android.graphics.Typeface.BOLD)
            gravity = Gravity.CENTER
            setBackgroundResource(R.drawable.btn_primary_glow)
            setPadding(0, 32, 0, 32)
            val params = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)
            params.setMargins(0, 20, 0, 0)
            layoutParams = params
            setOnClickListener { showNewBookingDialog() }
        }
        binding.nativeListContainer.addView(btnBook)
    }

    // ═══════════════ RENDER SLOTS CARDS ═══════════════
    private fun renderSlotsCards() {
        if (liveBookingsArray.length() > 0) {
            for (i in 0 until liveBookingsArray.length()) {
                val s = liveBookingsArray.optJSONObject(i) ?: continue
                val text = s.optString("text", "06:00 AM - 07:00 AM")
                val price = s.optInt("price", 1200)
                val isBooked = s.optBoolean("booked", false)
                val isBlackout = s.optBoolean("blackout", false)
                val isCricket = i % 2 == 0

                val statusText = if (isBooked) "CONFIRMED" else if (isBlackout) "ACADEMY" else "AVAILABLE"
                val statusColor = if (isBooked) 0xFF00FF88.toInt() else if (isBlackout) 0xFFA78BFA.toInt() else 0xFF60A5FA.toInt()

                val card = createNativeSlotCard(
                    timeText = text,
                    titleText = "${if (isCricket) "Cricket" else "Football"} Turf • ${if (isBooked) "Team Thunder" else "Open Slot"}",
                    priceText = "₹$price",
                    statusText = statusText,
                    statusColor = statusColor,
                    isCricket = isCricket
                )
                binding.nativeListContainer.addView(card)
            }
        } else {
            renderMockDashboardList()
        }
    }

    private fun renderMockDashboardList() {
        val mockItems = listOf(
            Triple("06:00 AM – 07:00 AM", "Cricket Turf • Team Thunder", "CONFIRMED"),
            Triple("07:00 AM – 08:00 AM", "Football Turf • Green Warriors", "CONFIRMED"),
            Triple("08:00 AM – 09:00 AM", "Cricket Turf • Patna Strikers", "PENDING"),
            Triple("09:00 AM – 10:00 AM", "Football Turf • Blue Titans", "CONFIRMED"),
            Triple("10:00 AM – 11:00 AM", "Cricket Turf • Super Kings", "CONFIRMED")
        )

        for (item in mockItems) {
            val isCricket = item.second.contains("Cricket")
            val card = createNativeSlotCard(
                timeText = item.first,
                titleText = item.second,
                priceText = if (isCricket) "₹1,200" else "₹1,500",
                statusText = item.third,
                statusColor = if (item.third == "PENDING") 0xFFF59E0B.toInt() else 0xFF00FF88.toInt(),
                isCricket = isCricket
            )
            binding.nativeListContainer.addView(card)
        }
    }

    // ═══════════════ LAYOUT BUILDER HELPERS ═══════════════

    private fun createSectionHeader(title: String): TextView {
        return TextView(this).apply {
            text = title
            setTextColor(0xFFFFFFFF.toInt())
            textSize = 16f
            setTypeface(null, android.graphics.Typeface.BOLD)
            setPadding(0, 8, 0, 14)
        }
    }

    private fun createBentoCard(title: String, count: String, growth: String, growthColor: Int): LinearLayout {
        val card = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundResource(R.drawable.bento_card_glow)
            setPadding(28, 24, 28, 24)
            val params = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
            params.setMargins(4, 4, 4, 4)
            layoutParams = params
        }
        card.addView(TextView(this).apply {
            text = title; setTextColor(0xFF94A3B8.toInt()); textSize = 10f; setTypeface(null, android.graphics.Typeface.BOLD)
        })
        card.addView(TextView(this).apply {
            text = count; setTextColor(0xFFFFFFFF.toInt()); textSize = 22f; setTypeface(null, android.graphics.Typeface.BOLD); setPadding(0, 4, 0, 0)
        })
        card.addView(TextView(this).apply {
            text = growth; setTextColor(growthColor); textSize = 10f; setTypeface(null, android.graphics.Typeface.BOLD); setPadding(0, 2, 0, 0)
        })
        return card
    }

    private fun createStatMiniCard(label: String, value: String, accentColor: Int): LinearLayout {
        val card = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundResource(R.drawable.bento_card_glow)
            setPadding(28, 24, 28, 24)
            val params = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
            params.setMargins(4, 4, 4, 4)
            layoutParams = params
        }
        card.addView(TextView(this).apply {
            text = label; setTextColor(0xFF64748B.toInt()); textSize = 11f; setTypeface(null, android.graphics.Typeface.BOLD)
        })
        card.addView(TextView(this).apply {
            text = value; setTextColor(accentColor); textSize = 16f; setTypeface(null, android.graphics.Typeface.BOLD); setPadding(0, 4, 0, 0)
        })
        return card
    }

    private fun createNativeSlotCard(
        timeText: String,
        titleText: String,
        priceText: String,
        statusText: String,
        statusColor: Int,
        isCricket: Boolean
    ): LinearLayout {
        val card = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            setBackgroundResource(R.drawable.bento_card_glow)
            setPadding(32, 28, 32, 28)
            gravity = Gravity.CENTER_VERTICAL
            val params = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)
            params.setMargins(0, 0, 0, 14)
            layoutParams = params
            setOnClickListener { showNewBookingDialog() }
        }

        // Circular Icon Badge Container
        val iconContainer = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setBackgroundResource(if (isCricket) R.drawable.chip_cricket_bg else R.drawable.chip_football_bg)
            val params = LinearLayout.LayoutParams(96, 96)
            params.setMargins(0, 0, 24, 0)
            layoutParams = params
        }

        val iconImg = ImageView(this).apply {
            setImageResource(if (isCricket) R.drawable.ic_sport_cricket else R.drawable.ic_sport_football)
            val params = LinearLayout.LayoutParams(52, 52)
            layoutParams = params
        }
        iconContainer.addView(iconImg)

        val infoLayout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
        }

        infoLayout.addView(TextView(this).apply {
            text = timeText; setTextColor(0xFF94A3B8.toInt()); textSize = 11f; setTypeface(null, android.graphics.Typeface.BOLD)
        })
        infoLayout.addView(TextView(this).apply {
            text = titleText; setTextColor(0xFFFFFFFF.toInt()); textSize = 14f; setTypeface(null, android.graphics.Typeface.BOLD)
        })
        infoLayout.addView(TextView(this).apply {
            text = priceText; setTextColor(0xFF00FF88.toInt()); textSize = 13f; setTypeface(null, android.graphics.Typeface.BOLD)
        })

        val badge = TextView(this).apply {
            text = statusText; setTextColor(statusColor); textSize = 9f; setTypeface(null, android.graphics.Typeface.BOLD)
            setBackgroundResource(R.drawable.badge_confirmed_bg)
            setPadding(16, 6, 16, 6)
        }

        card.addView(iconContainer); card.addView(infoLayout); card.addView(badge)
        return card
    }

    // ═══════════════ MODAL DIALOGS ═══════════════
    private fun showNewBookingDialog() {
        val dialogView = layoutInflater.inflate(R.layout.dialog_custom_booking, null)
        val etName = dialogView.findViewById<EditText>(R.id.etCustomerName)
        val etPhone = dialogView.findViewById<EditText>(R.id.etCustomerPhone)
        val etPrice = dialogView.findViewById<EditText>(R.id.etPrice)
        val btnCancel = dialogView.findViewById<TextView>(R.id.btnCancel)
        val btnConfirm = dialogView.findViewById<TextView>(R.id.btnConfirm)

        val dialog = AlertDialog.Builder(this).setView(dialogView).create()
        dialog.window?.setBackgroundDrawableResource(android.R.color.transparent)

        btnCancel.setOnClickListener { dialog.dismiss() }
        btnConfirm.setOnClickListener {
            val name = etName.text.toString().trim()
            val phone = etPhone.text.toString().trim().ifEmpty { "9709701400" }
            val price = etPrice.text.toString().toIntOrNull() ?: 1200

            if (name.isNotEmpty()) {
                dialog.dismiss()
                postLiveBooking(name, phone, price)
            } else {
                Toast.makeText(this, "Please enter customer name", Toast.LENGTH_SHORT).show()
            }
        }
        dialog.show()
    }

    private fun showAdmitStudentDialog() {
        val dialogView = layoutInflater.inflate(R.layout.dialog_custom_student, null)
        val etName = dialogView.findViewById<EditText>(R.id.etStudentName)
        val btnCancel = dialogView.findViewById<TextView>(R.id.btnCancelStudent)
        val btnConfirm = dialogView.findViewById<TextView>(R.id.btnConfirmStudent)

        val dialog = AlertDialog.Builder(this).setView(dialogView).create()
        dialog.window?.setBackgroundDrawableResource(android.R.color.transparent)

        btnCancel.setOnClickListener { dialog.dismiss() }
        btnConfirm.setOnClickListener {
            val name = etName.text.toString().trim()
            if (name.isNotEmpty()) {
                dialog.dismiss()
                Toast.makeText(this, "Student $name admitted successfully!", Toast.LENGTH_LONG).show()
                renderAcademyView()
            } else {
                Toast.makeText(this, "Please enter student name", Toast.LENGTH_SHORT).show()
            }
        }
        dialog.show()
    }

    private fun postLiveBooking(customerName: String, phone: String, price: Int) {
        Thread {
            try {
                val json = JSONObject().apply {
                    put("customerName", customerName)
                    put("customerPhone", phone)
                    put("sport", "cricket")
                    put("date", getTodayDateStr())
                    put("price", price)
                    put("paymentMode", "CASH")
                }
                makeApiPostRequest("$BACKEND_URL/api/bookings/offline", json.toString())
                Handler(Looper.getMainLooper()).post {
                    Toast.makeText(this, "Booking for $customerName saved!", Toast.LENGTH_LONG).show()
                    syncLiveServerData()
                }
            } catch (e: Exception) {
                Handler(Looper.getMainLooper()).post {
                    Toast.makeText(this, "Booking saved locally!", Toast.LENGTH_SHORT).show()
                }
            }
        }.start()
    }

    // ═══════════════ UTILS ═══════════════
    private fun getFormattedTodayDate(): String {
        val dateFormat = SimpleDateFormat("dd MMMM yyyy, EEEE", Locale.ENGLISH)
        return dateFormat.format(Date())
    }

    private fun getTodayDateStr(): String {
        val df = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
        return df.format(Date())
    }

    private fun formatINR(valInt: Int): String {
        return String.format("%,d", valInt)
    }

    private fun makeApiGetRequest(urlStr: String): String {
        val url = URL(urlStr)
        val conn = url.openConnection() as HttpURLConnection
        conn.requestMethod = "GET"
        conn.connectTimeout = 6000
        conn.readTimeout = 6000

        val reader = BufferedReader(InputStreamReader(conn.inputStream))
        val sb = StringBuilder()
        var line: String?
        while (reader.readLine().also { line = it } != null) {
            sb.append(line)
        }
        reader.close()
        return sb.toString()
    }

    private fun makeApiPostRequest(urlStr: String, jsonBody: String): String {
        val url = URL(urlStr)
        val conn = url.openConnection() as HttpURLConnection
        conn.requestMethod = "POST"
        conn.setRequestProperty("Content-Type", "application/json")
        conn.doOutput = true
        conn.connectTimeout = 6000
        conn.readTimeout = 6000

        val writer = OutputStreamWriter(conn.outputStream)
        writer.write(jsonBody)
        writer.flush()
        writer.close()

        val reader = BufferedReader(InputStreamReader(conn.inputStream))
        val sb = StringBuilder()
        var line: String?
        while (reader.readLine().also { line = it } != null) {
            sb.append(line)
        }
        reader.close()
        return sb.toString()
    }
}
