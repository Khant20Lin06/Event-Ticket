import { Injectable, Logger, Inject } from '@nestjs/common';
import { DataSource } from 'typeorm';
import Redis from 'ioredis';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { REDIS_CLIENT } from '../redis/redis-lock.service';
import { SEAT_EXPIRATION_QUEUE } from '../queues/seat-expiration.processor';
import { ASYNC_DB_WRITE_QUEUE } from '../queues/async-db-write.processor';

export interface HealthCheckResult {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  uptimeSeconds: number;
  environment: string;
  services: {
    database: {
      status: 'up' | 'down';
      latencyMs: number;
      error?: string;
    };
    redis: {
      status: 'up' | 'down';
      latencyMs: number;
      error?: string;
    };
    queues: {
      seatExpiration: {
        waiting: number;
        active: number;
        failed: number;
        completed: number;
      };
      asyncDbWrite: {
        waiting: number;
        active: number;
        failed: number;
        completed: number;
      };
    };
  };
  system: {
    rssMb: number;
    heapUsedMb: number;
    heapTotalMb: number;
    nodeVersion: string;
  };
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private readonly dataSource: DataSource,
    @Inject(REDIS_CLIENT)
    private readonly redisClient: Redis,
    @InjectQueue(SEAT_EXPIRATION_QUEUE)
    private readonly expirationQueue: Queue,
    @InjectQueue(ASYNC_DB_WRITE_QUEUE)
    private readonly asyncDbWriteQueue: Queue,
  ) {}

  async checkHealth(): Promise<{ isHealthy: boolean; result: HealthCheckResult }> {
    let dbStatus: 'up' | 'down' = 'up';
    let dbLatencyMs = 0;
    let dbError: string | undefined;

    try {
      const start = performance.now();
      await this.dataSource.query('SELECT 1');
      dbLatencyMs = Math.round((performance.now() - start) * 100) / 100;
    } catch (err: any) {
      dbStatus = 'down';
      dbError = err.message || 'Database connection error';
      this.logger.error(`Database health check failed: ${dbError}`);
    }

    let redisStatus: 'up' | 'down' = 'up';
    let redisLatencyMs = 0;
    let redisError: string | undefined;

    try {
      const start = performance.now();
      await this.redisClient.ping();
      redisLatencyMs = Math.round((performance.now() - start) * 100) / 100;
    } catch (err: any) {
      redisStatus = 'down';
      redisError = err.message || 'Redis connection error';
      this.logger.error(`Redis health check failed: ${redisError}`);
    }

    let seatExpCounts = { waiting: 0, active: 0, failed: 0, completed: 0 };
    let asyncWriteCounts = { waiting: 0, active: 0, failed: 0, completed: 0 };

    try {
      const [c1, c2] = await Promise.all([
        this.expirationQueue.getJobCounts('waiting', 'active', 'failed', 'completed'),
        this.asyncDbWriteQueue.getJobCounts('waiting', 'active', 'failed', 'completed'),
      ]);
      seatExpCounts = {
        waiting: c1.waiting ?? 0,
        active: c1.active ?? 0,
        failed: c1.failed ?? 0,
        completed: c1.completed ?? 0,
      };
      asyncWriteCounts = {
        waiting: c2.waiting ?? 0,
        active: c2.active ?? 0,
        failed: c2.failed ?? 0,
        completed: c2.completed ?? 0,
      };
    } catch (queueErr) {
      this.logger.warn('Failed to retrieve BullMQ queue job counts during health check');
    }

    const mem = process.memoryUsage();
    const isHealthy = dbStatus === 'up' && redisStatus === 'up';

    const result: HealthCheckResult = {
      status: isHealthy ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      environment: process.env.NODE_ENV || 'development',
      services: {
        database: {
          status: dbStatus,
          latencyMs: dbLatencyMs,
          ...(dbError ? { error: dbError } : {}),
        },
        redis: {
          status: redisStatus,
          latencyMs: redisLatencyMs,
          ...(redisError ? { error: redisError } : {}),
        },
        queues: {
          seatExpiration: seatExpCounts,
          asyncDbWrite: asyncWriteCounts,
        },
      },
      system: {
        rssMb: Math.round((mem.rss / 1024 / 1024) * 100) / 100,
        heapUsedMb: Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100,
        heapTotalMb: Math.round((mem.heapTotal / 1024 / 1024) * 100) / 100,
        nodeVersion: process.version,
      },
    };

    return { isHealthy, result };
  }

  async getPrometheusMetrics(): Promise<string> {
    const { result } = await this.checkHealth();
    const mem = process.memoryUsage();

    return [
      '# HELP process_uptime_seconds Process uptime in seconds',
      '# TYPE process_uptime_seconds gauge',
      `process_uptime_seconds ${result.uptimeSeconds}`,
      '',
      '# HELP process_heap_bytes Process heap memory used in bytes',
      '# TYPE process_heap_bytes gauge',
      `process_heap_bytes ${mem.heapUsed}`,
      '',
      '# HELP process_rss_bytes Process resident set size in bytes',
      '# TYPE process_rss_bytes gauge',
      `process_rss_bytes ${mem.rss}`,
      '',
      '# HELP redis_ping_latency_ms Redis ping latency in milliseconds',
      '# TYPE redis_ping_latency_ms gauge',
      `redis_ping_latency_ms ${result.services.redis.latencyMs}`,
      '',
      '# HELP db_query_latency_ms Database test query latency in milliseconds',
      '# TYPE db_query_latency_ms gauge',
      `db_query_latency_ms ${result.services.database.latencyMs}`,
      '',
      '# HELP service_health_status Status indicator (1=up, 0=down)',
      '# TYPE service_health_status gauge',
      `service_health_status{service="database"} ${result.services.database.status === 'up' ? 1 : 0}`,
      `service_health_status{service="redis"} ${result.services.redis.status === 'up' ? 1 : 0}`,
      '',
      '# HELP bullmq_queue_jobs BullMQ job counts by queue and status',
      '# TYPE bullmq_queue_jobs gauge',
      `bullmq_queue_jobs{queue="seat_expiration",state="waiting"} ${result.services.queues.seatExpiration.waiting}`,
      `bullmq_queue_jobs{queue="seat_expiration",state="active"} ${result.services.queues.seatExpiration.active}`,
      `bullmq_queue_jobs{queue="seat_expiration",state="failed"} ${result.services.queues.seatExpiration.failed}`,
      `bullmq_queue_jobs{queue="async_db_write",state="waiting"} ${result.services.queues.asyncDbWrite.waiting}`,
      `bullmq_queue_jobs{queue="async_db_write",state="active"} ${result.services.queues.asyncDbWrite.active}`,
      `bullmq_queue_jobs{queue="async_db_write",state="failed"} ${result.services.queues.asyncDbWrite.failed}`,
    ].join('\n');
  }
}
