const axios = require('axios');

async function test() {
    const SYNC_FROM = '2025-07-01';
    const SYNC_TO = '2026-07-08';
    const startDate = new Date(SYNC_FROM);
    const endDate   = new Date(SYNC_TO);
    endDate.setDate(endDate.getDate() + 1);

    let cursor = new Date(startDate);
    const orderIds = new Map();
    let totalFetched = 0;

    while (cursor < endDate) {
        const next = new Date(cursor);
        next.setDate(next.getDate() + 7);

        const dateFrom = cursor.toISOString().split('T')[0];
        const dateTo   = (next > endDate ? endDate : next).toISOString().split('T')[0];

        try {
            const response = await axios.get(
                `https://admin.khelopatna.in/admin_api.php?action=search_bookings&search=&date_from=${dateFrom}&date_to=${dateTo}`,
                { timeout: 15000 }
            );

            const legacyBookings = response.data?.bookings || [];
            totalFetched += legacyBookings.length;

            for (const legacy of legacyBookings) {
                const orderId = `LEGACY_${legacy.id}`;
                if (!orderIds.has(orderId)) {
                    orderIds.set(orderId, []);
                }
                orderIds.get(orderId).push(legacy);
            }
        } catch (err) {
            console.error(`Failed interval ${dateFrom}→${dateTo}: ${err.message}`);
        }

        cursor = next;
    }

    console.log('Total Fetched:', totalFetched);
    console.log('Unique Order IDs:', orderIds.size);

    let duplicateCount = 0;
    for (const [orderId, list] of orderIds.entries()) {
        if (list.length > 1) {
            duplicateCount++;
            if (duplicateCount <= 5) {
                console.log(`Duplicate orderId: ${orderId} (found ${list.length} times)`);
                console.log(list.map(l => ({ booking_date: l.booking_date, full_name: l.full_name })));
            }
        }
    }
    console.log('Number of unique order_id entries with duplicate records in response:', duplicateCount);
}

test();
