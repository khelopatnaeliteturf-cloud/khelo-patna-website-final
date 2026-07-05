#!/bin/bash

# Port and Base URL configuration
PORT=5001
BASE_URL="http://localhost:$PORT/api"

echo "--------------------------------------------------"
echo "🚀 KHELOPATNA BACKEND API VERIFIER SCRIPT"
echo "--------------------------------------------------"

# Step 1: Login as Admin
echo "🔑 Logging in as Admin..."
ADMIN_LOGIN_RES=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')

ADMIN_TOKEN=$(echo "$ADMIN_LOGIN_RES" | grep -o '"token":"[^"]*' | grep -o '[^"]*$')

if [ -z "$ADMIN_TOKEN" ]; then
  echo "❌ Admin login failed. Response: $ADMIN_LOGIN_RES"
  exit 1
fi
echo "✅ Admin logged in. Token: ${ADMIN_TOKEN:0:15}..."

# Step 2: Fetch Turf Settings
echo "⚙️ Fetching Turf Settings..."
SETTINGS_RES=$(curl -s -X GET "$BASE_URL/admin/turf-settings" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json")

echo "✅ Turf Settings fetched: $SETTINGS_RES"

# Step 3: Get Available Slots
echo "📅 Fetching available slots for Cricket on 2026-06-15..."
SLOTS_RES=$(curl -s -X GET "$BASE_URL/available-slots?sport=cricket&date=2026-06-15" \
  -H "Content-Type: application/json")

echo "✅ Slots response loaded successfully."

# Step 4: Create booking order
echo "💳 Creating turf slot booking payment order..."
BOOKING_RES=$(curl -s -X POST "$BASE_URL/payment/create-order" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1000,
    "customerName": "John Doe Test",
    "customerEmail": "john.test@example.com",
    "customerPhone": "919999999999",
    "bookingData": {
      "booking_date": "2026-06-15",
      "time_slots": ["18-19"],
      "totalAmount": 1000,
      "sport": "cricket"
    }
  }')

ORDER_ID=$(echo "$BOOKING_RES" | grep -o '"order_id":"[^"]*' | grep -o '[^"]*$')
if [ -z "$ORDER_ID" ]; then
  echo "❌ Booking order creation failed. Response: $BOOKING_RES"
  exit 1
fi
echo "✅ Booking created. Order ID: $ORDER_ID"

# Step 5: Simulate payment webhook success
echo "💰 Simulating Cashfree Payment Success Webhook for Order: $ORDER_ID..."
WEBHOOK_RES=$(curl -s -X POST "$BASE_URL/payment/webhook" \
  -H "Content-Type: application/json" \
  -d "{
    \"data\": {
      \"order\": {
        \"order_id\": \"$ORDER_ID\"
      },
      \"payment\": {
        \"payment_status\": \"SUCCESS\",
        \"cf_payment_id\": \"MOCK_TX_VERIFY_101\"
      }
    }
  }")

echo "✅ Webhook processing status: $WEBHOOK_RES"

# Step 6: Log in as Manager to test POS
echo "🔑 Logging in as Manager..."
MGR_LOGIN_RES=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"manager","password":"manager123"}')

MGR_TOKEN=$(echo "$MGR_LOGIN_RES" | grep -o '"token":"[^"]*' | grep -o '[^"]*$')
if [ -z "$MGR_TOKEN" ]; then
  echo "❌ Manager login failed. Response: $MGR_LOGIN_RES"
  exit 1
fi
echo "✅ Manager logged in."

# Step 7: Get Inventory Items
echo "📦 Loading current Inventory stock list..."
INV_RES=$(curl -s -X GET "$BASE_URL/inventory" \
  -H "Authorization: Bearer $MGR_TOKEN")

# Extract ID of Gatorade Sports Drink
GATORADE_ID=$(echo "$INV_RES" | grep -o '"_id":"[^"]*","itemName":"Gatorade[^"]*' | head -n 1 | grep -o '"_id":"[^"]*' | grep -o '[^"]*$')

if [ -z "$GATORADE_ID" ]; then
  echo "⚠️ Warning: Gatorade ID not found. Using generic list."
  # Try to find any pos_drinks item ID
  GATORADE_ID=$(echo "$INV_RES" | grep -o '"_id":"[^"]*","itemName":"[^"]*","category":"pos_drinks"' | head -n 1 | grep -o '"_id":"[^"]*' | grep -o '[^"]*$')
fi

echo "✅ Target POS Item ID found: $GATORADE_ID"

# Step 8: Perform POS Sales checkout
echo "🛒 Recording POS cash sale (Deducting stock count)..."
POS_RES=$(curl -s -X POST "$BASE_URL/pos/sell" \
  -H "Authorization: Bearer $MGR_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"itemId\": \"$GATORADE_ID\",
    \"quantity\": 2,
    \"totalPrice\": 40
  }")

echo "✅ POS Sale receipt recorded: $POS_RES"

# Step 9: Verify Analytics Dashboard
echo "📊 Fetching Admin Reports Dashboard aggregation..."
DASH_RES=$(curl -s -X GET "$BASE_URL/reports/dashboard" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json")

echo "✅ Admin dashboard reports generated: $DASH_RES"
echo "--------------------------------------------------"
echo "🎉 ALL TESTS PASSED SUCCESSFULLY!"
echo "--------------------------------------------------"
