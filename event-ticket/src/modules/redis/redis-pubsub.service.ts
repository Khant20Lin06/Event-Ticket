import { Injectable, OnModuleInit, OnModuleDestroy, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis-lock.service';

export interface SeatSocketEvent {
    type: 'SEAT_HELD' | 'SEAT_RELEASED' | 'SEAT_BOOKED';
    eventId: string;
    seatId: string;
    userId?: string;
    heldUntil?: string;
    bookingId?: string;
    timestamp: number;
}

export const SEAT_EVENTS_CHANNEL = 'seat_events';

@Injectable()
export class RedisPubSubService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(RedisPubSubService.name);
    private subscriberClient: Redis;
    private readonly listeners = new Map<string, ((event: SeatSocketEvent) => void)[]>();

    constructor(
        @Inject(REDIS_CLIENT)
        private readonly publisherClient: Redis,
        private readonly configService: ConfigService,
    ) {
        const host = this.configService.get<string>('REDIS_HOST', 'localhost');
        const port = this.configService.get<number>('REDIS_PORT', 6379);
        this.subscriberClient = new Redis({ host, port });
    }

    async onModuleInit() {
        this.subscriberClient.on('message', (channel, message) => {
            const handlers = this.listeners.get(channel);
            if (handlers && handlers.length > 0) {
                try {
                    const parsedEvent: SeatSocketEvent = JSON.parse(message);
                    handlers.forEach((handler) => handler(parsedEvent));
                } catch (err) {
                    this.logger.error(`Failed to parse Redis pubsub message on channel ${channel}: ${err}`);
                }
            }
        });

        await this.subscriberClient.subscribe(SEAT_EVENTS_CHANNEL);
        this.logger.log(`📡 Redis PubSub subscribed to channel: ${SEAT_EVENTS_CHANNEL}`);
    }

    async onModuleDestroy() {
        if (this.subscriberClient) {
            await this.subscriberClient.quit();
        }
    }

    /**
     * Publish an event to the Redis cluster channel
     */
    async publishSeatEvent(event: SeatSocketEvent): Promise<void> {
        try {
            await this.publisherClient.publish(SEAT_EVENTS_CHANNEL, JSON.stringify(event));
        } catch (error) {
            this.logger.error(`Error publishing seat event: ${error}`);
        }
    }

    /**
     * Subscribe a callback to seat events from Redis
     */
    onSeatEvent(callback: (event: SeatSocketEvent) => void): void {
        const current = this.listeners.get(SEAT_EVENTS_CHANNEL) || [];
        this.listeners.set(SEAT_EVENTS_CHANNEL, [...current, callback]);
    }
}
