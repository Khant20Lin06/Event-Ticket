import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Seat, SeatStatus } from '../seats/entities/seat.entity';
import { Booking, BookingStatus } from '../bookings/entities/booking.entity';

export const ASYNC_DB_WRITE_QUEUE = 'async-db-write-queue';

export interface AsyncDbWriteJobData {
    bookingId: string;
    seatId: string;
    eventId: string;
    userId: string;
    price: number;
    heldUntil: Date;
}

@Processor(ASYNC_DB_WRITE_QUEUE)
export class AsyncDbWriteProcessor extends WorkerHost {
    private readonly logger = new Logger(AsyncDbWriteProcessor.name);

    constructor(
        @InjectRepository(Seat)
        private readonly seatRepository: Repository<Seat>,
        @InjectRepository(Booking)
        private readonly bookingRepository: Repository<Booking>,
    ) {
        super();
    }

    async process(job: Job<AsyncDbWriteJobData>): Promise<void> {
        this.logger.debug(`Processing async DB write for seat ${job.data.seatId}`);
        const { bookingId, seatId, eventId, userId, price, heldUntil } = job.data;

        // 1. Update Seat Status in PostgreSQL
        await this.seatRepository.update(
            { id: seatId },
            {
                status: SeatStatus.HELD,
                heldByUserId: userId,
                heldUntil: new Date(heldUntil),
            },
        );

        // 2. Create Booking in PostgreSQL using the ID pre-generated in the hot path,
        // so the client-facing bookingId returned synchronously matches the persisted row.
        const booking = this.bookingRepository.create({
            id: bookingId,
            userId,
            eventId,
            seatId,
            amount: price,
            status: BookingStatus.PENDING,
            expiresAt: new Date(heldUntil),
        });

        await this.bookingRepository.save(booking);
        
        this.logger.log(`✅ Successfully wrote Booking and Seat state for Seat ID: ${seatId} asynchronously.`);
    }
}
