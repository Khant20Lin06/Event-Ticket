import { Module } from '@nestjs/common';
import { HealthService } from './health.service';
import { HealthController, MetricsController } from './health.controller';
import { QueuesModule } from '../queues/queues.module';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [QueuesModule, RedisModule],
  controllers: [HealthController, MetricsController],
  providers: [HealthService],
  exports: [HealthService],
})
export class HealthModule {}
