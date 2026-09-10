import {
    Injectable,
    NotFoundException,
    ConflictException,
    Logger,
    Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { randomUUID } from 'crypto';
import { Seat, SeatStatus } from './entities/seat.entity';
import { RedisLockService, REDIS_CLIENT } from '../redis/redis-lock.service';
import { RedisPubSubService } from '../redis/redis-pubsub.service';
import { SEAT_EXPIRATION_QUEUE, SeatExpirationJobData } from '../queues/seat-expiration.processor';
import { Booking, BookingStatus } from '../bookings/entities/booking.entity';

import { ASYNC_DB_WRITE_QUEUE, AsyncDbWriteJobData } from '../queues/async-db-write.processor';

interface SeatMeta {
    eventId: string;
    price: number;
    seatNumber: string;
}

@Injectable()
export class SeatsService {
    private readonly logger = new Logger(SeatsService.name);

    constructor(
        @InjectRepository(Seat)
        private readonly seatRepository: Repository<Seat>,
        @InjectRepository(Booking)
        private readonly bookingRepository: Repository<Booking>,
        private readonly redisLockService: RedisLockService,
        private readonly redisPubSubService: RedisPubSubService,
        @Inject(REDIS_CLIENT)
        private readonly redisClient: Redis,
        @InjectQueue(SEAT_EXPIRATION_QUEUE)
        private readonly expirationQueue: Queue<SeatExpirationJobData>,
        @InjectQueue(ASYNC_DB_WRITE_QUEUE)
        private readonly asyncDbWriteQueue: Queue<AsyncDbWriteJobData>,
    ) { }

    /**
     * Redis Cache-Aside Pattern for Seat Layout Query
     */
    async findByEvent(eventId: string): Promise<Seat[]> {
        const cacheKey = `cache:event:${eventId}:seats`;

        // 1. Check Redis Cache
        const cached = await this.redisClient.get(cacheKey);
        if (cached) {
            this.logger.debug(`:zap: Redis Cache HIT: Event seats layout (${eventId})`);
            return JSON.parse(cached);
        }

        // 2. Query PostgreSQL Database on Cache Miss
        const seats = await this.seatRepository.find({
            where: { eventId },
            order: { seatNumber: 'ASC' },
        });

        // 3. Cache result in Redis for 10 seconds
        await this.redisClient.set(cacheKey, JSON.stringify(seats), 'EX', 10);
        this.logger.debug(`:turtle: Redis Cache MISS: Loaded from PostgreSQL and cached (${eventId})`);

        return seats;
    }

    async findOne(id: string): Promise<Seat> {
        const seat = await this.seatRepository.findOne({ where: { id } });
        if (!seat) {
            throw new NotFoundException(`Seat with ID ${id} not found`);
        }
        return seat;
    }

    private async invalidateCache(eventId: string): Promise<void> {
        const cacheKey = `cache:event:${eventId}:seats`;
        await this.redisClient.del(cacheKey);
        this.logger.debug(`:broom: Cleared Redis Cache for Event seats: ${eventId}`);
    }

    /**
     * 1M RPS Architecture: single atomic Redis Lua Script does the availability
     * check, the HELD transition, and returns eventId/price in ONE round trip.
     * No PostgreSQL hits in the hot path.
     */
    async holdSeat(seatId: string, userId: string): Promise<any> {
        // Lua Script: on a seat hash { status, eventId, price, seatNumber } —
        // check AVAILABLE, flip to HELD, and return the metadata, all atomically
        // and in a single network round trip (instead of a separate GET + EVAL).
        const luaScript = `
        local key = KEYS[1]
        local status = redis.call("HGET", key, "status")
        if not status then
            return { "NOT_FOUND" }
        end
        if status ~= "AVAILABLE" then
            return { "CONFLICT" }
        end
        redis.call("HSET", key, "status", "HELD")
        local eventId = redis.call("HGET", key, "eventId")
        local price = redis.call("HGET", key, "price")
        return { "OK", eventId, price }
        `;

        const seatKey = `seat:${seatId}`;
        const result = (await this.redisClient.eval(luaScript, 1, seatKey)) as [string, string?, string?];
        const [outcome, eventId, priceRaw] = result;

        if (outcome === 'NOT_FOUND') {
            throw new NotFoundException(`Seat with ID ${seatId} not found`);
        }
        if (outcome === 'CONFLICT') {
            throw new ConflictException(`Seat is no longer available.`);
        }

        const meta: SeatMeta = { eventId: eventId as string, price: Number(priceRaw), seatNumber: '' };

        const holdDurationMinutes = 5;
        const heldUntil = new Date(Date.now() + holdDurationMinutes * 60 * 1000);
        // Pre-generate the booking ID in the hot path so it can be returned to the
        // client immediately, while the actual row is written asynchronously.
        const bookingId = randomUUID();

        // Enqueue PostgreSQL DB Save (Async)
        // We do not wait for this to finish to return the response.
        await this.asyncDbWriteQueue.add(
            'async-write-seat',
            { bookingId, seatId, userId, price: meta.price, heldUntil, eventId: meta.eventId },
        );

        // Enqueue Expiration Job (5 mins)
        const delayMs = holdDurationMinutes * 60 * 1000;
        await this.expirationQueue.add(
            'expire-seat',
            { seatId, bookingId },
            { delay: delayMs },
        );

        // Publish real-time SEAT_HELD event across all backend instances to connected WebSockets
        this.redisPubSubService.publishSeatEvent({
            type: 'SEAT_HELD',
            eventId: meta.eventId,
            seatId,
            userId,
            heldUntil: heldUntil.toISOString(),
            bookingId,
            timestamp: Date.now(),
        }).catch((err) => this.logger.error(`Failed to publish SEAT_HELD event: ${err}`));

        this.logger.log(`:rocket: Seat ${seatId} successfully HELD in Redis for user ${userId}. Async DB Write queued.`);

        return {
            message: 'Seat reservation processing',
            seatId,
            bookingId,
            status: SeatStatus.HELD,
            heldUntil
        };
    }

    async updateStatus(seatId: string, status: SeatStatus): Promise<Seat> {
        const seat = await this.findOne(seatId);
        seat.status = status;
        if (status === SeatStatus.AVAILABLE) {
            seat.heldByUserId = null;
            seat.heldUntil = null;
        }
        const saved = await this.seatRepository.save(seat);

        // Update Redis hash so Lua script immediately respects new status
        await this.redisClient.hset(`seat:${seatId}`, 'status', status);
        await this.invalidateCache(seat.eventId);

        // Broadcast real-time WebSocket update
        this.redisPubSubService.publishSeatEvent({
            type: status === SeatStatus.AVAILABLE ? 'SEAT_RELEASED' : 'SEAT_HELD',
            eventId: seat.eventId,
            seatId,
            timestamp: Date.now(),
        }).catch((err) => this.logger.error(`Failed to publish status change: ${err}`));

        return saved;
    }

    async updatePrice(seatId: string, price: number): Promise<Seat> {
        const seat = await this.findOne(seatId);
        seat.price = price;
        const saved = await this.seatRepository.save(seat);

        await this.redisClient.hset(`seat:${seatId}`, 'price', price);
        await this.invalidateCache(seat.eventId);

        return saved;
    }

    async emergencyReleaseAllStuckLocks(): Promise<{ releasedCount: number; message: string }> {
        const stuckSeats = await this.seatRepository.find({
            where: { status: SeatStatus.HELD },
        });

        let count = 0;
        for (const seat of stuckSeats) {
            seat.status = SeatStatus.AVAILABLE;
            seat.heldByUserId = null;
            seat.heldUntil = null;
            await this.seatRepository.save(seat);

            await this.redisClient.hset(`seat:${seat.id}`, 'status', SeatStatus.AVAILABLE);
            await this.invalidateCache(seat.eventId);

            this.redisPubSubService.publishSeatEvent({
                type: 'SEAT_RELEASED',
                eventId: seat.eventId,
                seatId: seat.id,
                timestamp: Date.now(),
            }).catch((err) => this.logger.error(`Failed to publish emergency release: ${err}`));

            count++;
        }

        this.logger.warn(`:broom: Admin emergency lock sweep completed. Released ${count} stuck seats.`);
        return {
            releasedCount: count,
            message: `Emergency lock sweep successful. ${count} seats restored to AVAILABLE state.`,
        };
    }
}