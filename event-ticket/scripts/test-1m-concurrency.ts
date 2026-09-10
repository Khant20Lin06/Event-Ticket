import axios from 'axios';
import autocannon from 'autocannon';

const API_BASE_URL = 'http://localhost:3000/api/v1';
// Measured throughput on this server is ~1,200 req/s, and a held seat expires
// back to AVAILABLE after 5 minutes (see SeatsService.holdSeat). 1,000,000
// requests took ~13.5 minutes to fire, so the seat expired and reopened
// mid-flood, producing multiple "successful" holds that were not concurrent
// double-bookings but legitimate sequential holds. Keep the request count low
// enough that the whole run finishes well within the 5-minute hold TTL.
const CONCURRENT_REQUESTS_COUNT = 200_000;
const CONNECTIONS = 500; // Number of concurrent connections to keep open

interface UserItem {
    id: string;
    email: string;
}

interface EventItem {
    id: string;
    title: string;
}

interface SeatItem {
    id: string;
    seatNumber: string;
    status: string;
}

async function run1MConcurrencyTest() {
    console.log('========================================================================');
    console.log(`🚀 STRESS TEST: SIMULTANEOUS HIGH-CONCURRENCY SEAT LOCKING TEST`);
    console.log(`🎯 Testing ${CONCURRENT_REQUESTS_COUNT.toLocaleString()} simultaneous requests for the EXACT same seat`);
    console.log('========================================================================\n');

    try {
        // 1. Fetch Valid Test User
        console.log('1️⃣ Fetching valid test users...');
        const usersResponse = await axios.get<UserItem[]>(`${API_BASE_URL}/users`);
        if (!usersResponse.data || usersResponse.data.length === 0) {
            console.error('❌ No users found in database! Please run dev server to seed initial users.');
            process.exit(1);
        }
        const testUser = usersResponse.data[0];
        console.log(`   ✅ Test User: ${testUser.email} (ID: ${testUser.id})`);

        // 2. Get List of Events
        console.log('\n2️⃣ Fetching active events...');
        const eventsResponse = await axios.get<EventItem[]>(`${API_BASE_URL}/events`);
        if (!eventsResponse.data || eventsResponse.data.length === 0) {
            console.error('❌ No events found in database!');
            process.exit(1);
        }

        const testEvent = eventsResponse.data[0];
        console.log(`   ✅ Target Event: "${testEvent.title}" (ID: ${testEvent.id})`);

        // 3. Fetch Seats for the Event
        console.log('\n3️⃣ Fetching seat layout for event...');
        const seatsResponse = await axios.get<SeatItem[]>(`${API_BASE_URL}/events/${testEvent.id}/seats`);
        const availableSeats = seatsResponse.data.filter((s) => s.status === 'AVAILABLE');

        if (availableSeats.length === 0) {
            console.error('❌ No AVAILABLE seats found for this event! Resetting seed recommended.');
            process.exit(1);
        }

        // We pick the first available seat
        const targetSeat = availableSeats[0];
        console.log(`   🎯 Target Seat: "${targetSeat.seatNumber}" (ID: ${targetSeat.id})`);

        // 4. Fire 1 Million Requests using autocannon
        console.log(`\n4️⃣ Firing ${CONCURRENT_REQUESTS_COUNT.toLocaleString()} requests to hold seat ${targetSeat.seatNumber}...`);
        console.log(`   Using ${CONNECTIONS} concurrent connections. This may take a while...`);

        const instance = autocannon({
            url: `${API_BASE_URL}/seats/${targetSeat.id}/hold`,
            connections: CONNECTIONS,
            amount: CONCURRENT_REQUESTS_COUNT,
            method: 'POST',
            headers: {
                'content-type': 'application/json',
            },
            body: JSON.stringify({ userId: testUser.id }),
        }, (err, result) => {
            if (err) {
                console.error('❌ Load test error:', err);
                return;
            }

            console.log('\n========================================================================');
            console.log('📊 CONCURRENCY TEST RESULTS SUMMARY');
            console.log('========================================================================');

            const successCount = result['2xx'] || 0;
            const conflictCount = result['4xx'] || 0;
            const errorCount = result['5xx'] || 0;

            console.log(`🟢 Successful Holds (200/201)    : ${successCount}`);
            console.log(`🔴 Rejected Conflicts (4xx)      : ${conflictCount}`);
            console.log(`⚠️ Unexpected Errors (5xx)       : ${errorCount}`);
            console.log(`⏱️ Total Time Taken              : ${result.duration} seconds`);
            console.log(`🌐 Requests Per Second           : ${result.requests.average}`);
            console.log('========================================================================\n');

            // 6. Verification Assertion
            if (successCount === 1) {
                console.log('🏆 VERIFICATION SUCCESSFUL!');
                console.log(`✅ DOUBLE-BOOKING PREVENTED! Exactly 1 user held the seat, ${conflictCount} were safely rejected.`);
                console.log('✅ Redis Distributed Atomic Locking + DB Transaction performed flawlessly under EXTREME load!');
            } else if (successCount > 1) {
                console.error(`❌ VERIFICATION FAILED! Double-booking detected: ${successCount} successful locks.`);
            } else {
                console.error(`❌ VERIFICATION FAILED! No successful locks acquired. 5xx errors: ${errorCount}`);
            }
        });

        autocannon.track(instance, { renderProgressBar: true });

    } catch (err: any) {
        console.error('❌ Concurrency test script error:', err.message);
    }
}

run1MConcurrencyTest();
