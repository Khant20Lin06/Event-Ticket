import { Injectable, NotFoundException, Inject, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Redis from 'ioredis';
import { Event } from './entities/event.entity';
import { Seat, SeatStatus } from '../seats/entities/seat.entity';
import { REDIS_CLIENT } from '../redis/redis-lock.service';
import { CreateEventDto } from './dto/create-event.dto';

@Injectable()
export class EventsService {
    private readonly logger = new Logger(EventsService.name);

    constructor(
        @InjectRepository(Event)
        private readonly eventRepository: Repository<Event>,
        @InjectRepository(Seat)
        private readonly seatRepository: Repository<Seat>,
        @Inject(REDIS_CLIENT)
        private readonly redisClient: Redis,
    ) { }

    async findAll(): Promise<Event[]> {
        return this.eventRepository.find({
            order: {
                createdAt: 'DESC',
            },
        });
    }

    async findOne(id: string): Promise<Event> {
        const event = await this.eventRepository.findOne({
            where: { id },
        });

        if (!event) {
            throw new NotFoundException(`Event with ID ${id} not found`);
        }

        return event;
    }

    /**
     * Create a new Event, auto-generate arena seating layout, and
     * pipeline all seats into Redis hashes for immediate atomic locking.
     */
    async create(dto: CreateEventDto): Promise<{ event: Event; seatsCount: number }> {
        // 1. Create and save Event
        const event = this.eventRepository.create({
            title: dto.title,
            description: dto.description,
            venue: dto.venue,
            eventDate: new Date(dto.eventDate),
            totalSeats: dto.totalSeats || 48,
            imageUrl: dto.imageUrl,
            category: dto.category || 'LIVE_EXPERIENCE',
        });
        const savedEvent = await this.eventRepository.save(event);

        // 2. Generate 48 tiered seats (Rows A to F)
        const rowConfigs = [
            { row: 'A', count: 8, price: 250 },   // VIP
            { row: 'B', count: 8, price: 250 },   // VIP
            { row: 'C', count: 8, price: 140 },   // Platinum
            { row: 'D', count: 8, price: 140 },   // Platinum
            { row: 'E', count: 8, price: 75 },    // Standard
            { row: 'F', count: 8, price: 75 },    // Standard
        ];

        const seatsToCreate: Partial<Seat>[] = [];
        for (const config of rowConfigs) {
            for (let num = 1; num <= config.count; num++) {
                seatsToCreate.push({
                    seatNumber: `${config.row}-${num}`,
                    price: config.price,
                    status: SeatStatus.AVAILABLE,
                    eventId: savedEvent.id,
                });
            }
        }

        const savedSeats = await this.seatRepository.save(seatsToCreate);

        // 3. Pipeline all seats into Redis hot-path hashes
        const pipeline = this.redisClient.pipeline();
        for (const s of savedSeats) {
            pipeline.hset(`seat:${s.id}`, {
                status: s.status,
                eventId: savedEvent.id,
                price: Number(s.price),
                seatNumber: s.seatNumber,
            });
        }
        await pipeline.exec();

        this.logger.log(
            `🚀 Event '${savedEvent.title}' created with ${savedSeats.length} seats synced to Redis hot-path.`,
        );

        return {
            event: savedEvent,
            seatsCount: savedSeats.length,
        };
    }
}
