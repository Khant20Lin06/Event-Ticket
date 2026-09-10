import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Redis from 'ioredis';
import { Seat, SeatStatus } from '../seats/entities/seat.entity';
import { Booking, BookingStatus } from '../bookings/entities/booking.entity';
import { REDIS_CLIENT } from '../redis/redis-lock.service';
import { RedisPubSubService } from '../redis/redis-pubsub.service';

export const SEAT_EXPIRATION_QUEUE = 'seat-expiration';

export interface SeatExpirationJobData {
    seatId: string;
    bookingId: string;
}

@Processor(SEAT_EXPIRATION_QUEUE)
export class SeatExpirationProcessor extends WorkerHost {
    private readonly logger = new Logger(SeatExpirationProcessor.name);

    constructor(
        @InjectRepository(Seat)
        private readonly seatRepository: Repository<Seat>,
        @InjectRepository(Booking)
        private readonly bookingRepository: Repository<Booking>,
        @Inject(REDIS_CLIENT)
        private readonly redisClient: Redis,
        private readonly redisPubSubService: RedisPubSubService,
    ) {
        super();
    }

    async process(job: Job<SeatExpirationJobData>): Promise<void> {
        const { seatId, bookingId } = job.data;
        this.logger.log(`:stopwatch: Processing 5-minute expiration check for Seat ID: ${seatId}, Booking ID: ${bookingId}`);

        const booking = await this.bookingRepository.findOne({ where: { id: bookingId } });
        if (!booking) {
            this.logger.warn(`Booking ID ${bookingId} not found. Skipping.`);
            return;
        }

        // Check if booking is still PENDING (Unpaid)
        if (booking.status === BookingStatus.PENDING) {
            booking.status = BookingStatus.EXPIRED;
            await this.bookingRepository.save(booking);

            // Revert Seat status back to AVAILABLE
            const seat = await this.seatRepository.findOne({ where: { id: seatId } });
            if (seat && seat.status === SeatStatus.HELD) {
                seat.status = SeatStatus.AVAILABLE;
                seat.heldByUserId = null;
                seat.heldUntil = null;
                await this.seatRepository.save(seat);

                // Release the Redis hot-path lock too, or the seat would stay
                // permanently HELD there even though Postgres now shows it free.
                await this.redisClient.hset(`seat:${seatId}`, 'status', SeatStatus.AVAILABLE);

                // Broadcast SEAT_RELEASED event across cluster
                await this.redisPubSubService.publishSeatEvent({
                    type: 'SEAT_RELEASED',
                    eventId: seat.eventId,
                    seatId,
                    bookingId,
                    timestamp: Date.now(),
                });

                this.logger.log(
                    `:alarm_clock: 5-Minute Timeout! Seat ${seat.seatNumber} automatically RELEASED back to AVAILABLE.`,
                );
            }
        } else {
            this.logger.log(
                `:white_check_mark: Booking ${bookingId} is already ${booking.status}. Skipping seat release.`,
            );
        }
    }
}