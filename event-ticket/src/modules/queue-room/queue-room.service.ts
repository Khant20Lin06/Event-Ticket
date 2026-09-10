import { Injectable, Logger, Inject } from '@nestjs/common';
import Redis from 'ioredis';
import { randomUUID } from 'crypto';
import { REDIS_CLIENT } from '../redis/redis-lock.service';

export interface QueueJoinResult {
    queueId: string;
    position: number;
    estimatedWaitSeconds: number;
    totalWaiting: number;
    status: 'WAITING' | 'ADMITTED';
    admissionToken?: string;
}

export interface QueueStatusResult {
    queueId: string;
    position: number;
    estimatedWaitSeconds: number;
    totalWaiting: number;
    status: 'WAITING' | 'ADMITTED';
    admissionToken?: string;
}

@Injectable()
export class QueueRoomService {
    private readonly logger = new Logger(QueueRoomService.name);

    constructor(
        @Inject(REDIS_CLIENT)
        private readonly redisClient: Redis,
    ) { }

    private getQueueKey(eventId: string): string {
        return `queue:event:${eventId}`;
    }

    private getAdmittedKey(eventId: string): string {
        return `admitted:event:${eventId}`;
    }

    /**
     * Join the Virtual Waiting Room (Queue-it Pattern)
     */
    async joinQueue(eventId: string, userId: string): Promise<QueueJoinResult> {
        const queueId = randomUUID();
        const score = Date.now();
        const queueKey = this.getQueueKey(eventId);

        // Add to Redis Sorted Set
        await this.redisClient.zadd(queueKey, score, queueId);

        // Determine current rank (0-indexed)
        const rank = await this.redisClient.zrank(queueKey, queueId);
        const total = await this.redisClient.zcard(queueKey);
        const position = (rank !== null ? rank : 0) + 1;

        // If the queue is small (e.g. within top 5), auto-admit immediately!
        if (position <= 3) {
            const token = await this.admitUser(eventId, queueId);
            return {
                queueId,
                position: 1,
                estimatedWaitSeconds: 0,
                totalWaiting: total,
                status: 'ADMITTED',
                admissionToken: token,
            };
        }

        const estimatedWaitSeconds = Math.max(5, position * 3);

        this.logger.log(`🚶 User ${userId} joined Virtual Queue for Event ${eventId}. Position: #${position}`);

        return {
            queueId,
            position,
            estimatedWaitSeconds,
            totalWaiting: total,
            status: 'WAITING',
        };
    }

    /**
     * Poll current status in the waiting room
     */
    async getQueueStatus(eventId: string, queueId: string): Promise<QueueStatusResult> {
        const queueKey = this.getQueueKey(eventId);
        const admittedKey = this.getAdmittedKey(eventId);

        // 1. Check if user has already been admitted
        const existingToken = await this.redisClient.hget(admittedKey, queueId);
        if (existingToken) {
            return {
                queueId,
                position: 0,
                estimatedWaitSeconds: 0,
                totalWaiting: await this.redisClient.zcard(queueKey),
                status: 'ADMITTED',
                admissionToken: existingToken,
            };
        }

        // 2. Check current rank in sorted set
        const rank = await this.redisClient.zrank(queueKey, queueId);
        const total = await this.redisClient.zcard(queueKey);

        if (rank === null) {
            // Not in queue, admit immediately
            const token = await this.admitUser(eventId, queueId);
            return {
                queueId,
                position: 0,
                estimatedWaitSeconds: 0,
                totalWaiting: total,
                status: 'ADMITTED',
                admissionToken: token,
            };
        }

        const position = rank + 1;

        // If turn has arrived (top 3 in queue)
        if (position <= 3) {
            const token = await this.admitUser(eventId, queueId);
            return {
                queueId,
                position: 0,
                estimatedWaitSeconds: 0,
                totalWaiting: total - 1,
                status: 'ADMITTED',
                admissionToken: token,
            };
        }

        return {
            queueId,
            position,
            estimatedWaitSeconds: position * 3,
            totalWaiting: total,
            status: 'WAITING',
        };
    }

    /**
     * Admit user and issue a signed admission pass
     */
    private async admitUser(eventId: string, queueId: string): Promise<string> {
        const queueKey = this.getQueueKey(eventId);
        const admittedKey = this.getAdmittedKey(eventId);
        const admissionToken = `ARENA-PASS-${randomUUID()}`;

        // Remove from queue and add to admitted hash (TTL 15 mins)
        await this.redisClient.zrem(queueKey, queueId);
        await this.redisClient.hset(admittedKey, queueId, admissionToken);
        await this.redisClient.expire(admittedKey, 900); // 15 mins

        this.logger.log(`🎟️ Queue turn reached for ${queueId}! Issued Admission Token.`);
        return admissionToken;
    }

    /**
     * Admit a batch of waiting users (used by system cron / admin)
     */
    async admitBatch(eventId: string, batchSize: number = 10): Promise<{ admittedCount: number }> {
        const queueKey = this.getQueueKey(eventId);
        const queueIds = await this.redisClient.zrange(queueKey, 0, batchSize - 1);

        for (const qId of queueIds) {
            await this.admitUser(eventId, qId);
        }

        return { admittedCount: queueIds.length };
    }
}
