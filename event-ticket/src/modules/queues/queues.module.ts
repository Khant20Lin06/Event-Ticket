import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Seat } from '../seats/entities/seat.entity';
import { Booking } from '../bookings/entities/booking.entity';
import {
  SeatExpirationProcessor,
  SEAT_EXPIRATION_QUEUE,
} from './seat-expiration.processor';
import { 
  AsyncDbWriteProcessor, 
  ASYNC_DB_WRITE_QUEUE 
} from './async-db-write.processor';
import { RedisLockService } from '../redis/redis-lock.service';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
        },
      }),
    }),
    BullModule.registerQueue({
      name: SEAT_EXPIRATION_QUEUE,
    }),
    BullModule.registerQueue({
      name: ASYNC_DB_WRITE_QUEUE,
    }),
    TypeOrmModule.forFeature([Seat, Booking]),
    RedisModule,
  ],
  providers: [SeatExpirationProcessor, AsyncDbWriteProcessor, RedisLockService],
  exports: [BullModule],
})
export class QueuesModule { }
// Message 2025 - mern - october - 3pm