// k6 load test for the 3 hottest endpoints in a real ticket-sale traffic spike:
//   1) POST /seats/:id/hold          <- highest contention, the whole architecture targets this
//   2) GET  /events/:id/seats        <- seat-map polling, Redis cache-aside (10s TTL)
//   3) POST /auth/login              <- login stampede right before sale start, bcrypt = CPU-bound
//
// Run with Docker (no local k6 install needed):
//   docker run --rm -i --network=event-ticket_app-network \
//     -e BASE_URL=http://nginx:80/api/v1 \
//     -e HOLD_RATE=50 -e SEATS_RATE=200 -e LOGIN_RATE=20 \
//     grafana/k6 run - < scripts/k6-hotpath-load-test.js
//
// Running inside the compose network (hitting `nginx:80` directly) skips the
// Windows Docker Desktop host-port NAT layer entirely, which is where a lot of
// the local overhead we measured earlier was coming from — use that path for
// the most realistic throughput numbers on this machine.
//
// If you have k6 installed natively instead:
//   k6 run -e BASE_URL=http://localhost:3000/api/v1 -e HOLD_RATE=50 scripts/k6-hotpath-load-test.js

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api/v1';

// Target rates (requests/sec) per scenario. Start low and step these up —
// see the staged execution plan below. Do NOT start at 1,000,000.
const HOLD_RATE = Number(__ENV.HOLD_RATE || 50);
const SEATS_RATE = Number(__ENV.SEATS_RATE || 200);
const LOGIN_RATE = Number(__ENV.LOGIN_RATE || 20);
const DURATION = __ENV.DURATION || '30s';

const holdConflicts = new Counter('hold_conflicts_409');
const holdSuccess = new Counter('hold_success_2xx');

export const options = {
    scenarios: {
        seat_hold: {
            executor: 'constant-arrival-rate',
            rate: HOLD_RATE,
            timeUnit: '1s',
            duration: DURATION,
            preAllocatedVUs: Math.max(20, HOLD_RATE * 2),
            maxVUs: HOLD_RATE * 10,
            exec: 'holdSeat',
        },
        seat_browse: {
            executor: 'constant-arrival-rate',
            rate: SEATS_RATE,
            timeUnit: '1s',
            duration: DURATION,
            preAllocatedVUs: Math.max(20, SEATS_RATE * 2),
            maxVUs: SEATS_RATE * 10,
            exec: 'browseSeats',
        },
        login_stampede: {
            executor: 'constant-arrival-rate',
            rate: LOGIN_RATE,
            timeUnit: '1s',
            duration: DURATION,
            preAllocatedVUs: Math.max(10, LOGIN_RATE * 2),
            maxVUs: LOGIN_RATE * 10,
            exec: 'login',
        },
    },
    thresholds: {
        http_req_failed: ['rate<0.5'], // 409 conflicts count as "failed" HTTP status-wise; expected to be high
        http_req_duration: ['p(95)<3000'],
    },
};

// setup() runs once before the load starts — pull real seat/event/user data
// so the hold scenario spreads across MANY distinct seats instead of hammering
// a single lock key (that single-key case is what test:1m already covers).
export function setup() {
    const eventsRes = http.get(`${BASE_URL}/events`);
    const events = eventsRes.json();
    if (!events || events.length === 0) {
        throw new Error('No events found — run the app once to seed data first.');
    }

    let allSeats = [];
    for (const ev of events) {
        const seatsRes = http.get(`${BASE_URL}/events/${ev.id}/seats`);
        const seats = seatsRes.json().map((s) => ({ id: s.id, eventId: ev.id }));
        allSeats = allSeats.concat(seats);
    }

    const usersRes = http.get(`${BASE_URL}/users`);
    const users = usersRes.json();

    return { events, seats: allSeats, users };
}

export function holdSeat(data) {
    const seat = data.seats[Math.floor(Math.random() * data.seats.length)];
    const user = data.users[Math.floor(Math.random() * data.users.length)];

    const res = http.post(
        `${BASE_URL}/seats/${seat.id}/hold`,
        JSON.stringify({ userId: user.id }),
        { headers: { 'Content-Type': 'application/json' } },
    );

    if (res.status === 200 || res.status === 201) {
        holdSuccess.add(1);
    } else if (res.status === 409) {
        holdConflicts.add(1);
    }

    check(res, { 'hold: status is 200/201/409': (r) => [200, 201, 409].includes(r.status) });
}

export function browseSeats(data) {
    const ev = data.events[Math.floor(Math.random() * data.events.length)];
    const res = http.get(`${BASE_URL}/events/${ev.id}/seats`);
    check(res, { 'seats: status is 200': (r) => r.status === 200 });
}

export function login(data) {
    const user = data.users[Math.floor(Math.random() * data.users.length)];
    const res = http.post(
        `${BASE_URL}/auth/login`,
        JSON.stringify({ email: user.email, password: 'password123' }),
        { headers: { 'Content-Type': 'application/json' } },
    );
    check(res, { 'login: status is 200/201': (r) => [200, 201].includes(r.status) });
}
