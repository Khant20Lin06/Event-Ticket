import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { UsersModule } from './modules/users/users.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { SeatsModule } from './modules/seats/seats.module';
import { EventsModule } from './modules/events/events.module';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './modules/users/entities/user.entity';
import { Seat } from './modules/seats/entities/seat.entity';
import { Event } from './modules/events/entities/event.entity';
import { RedisModule } from './modules/redis/redis.module';
import { QueuesModule } from './modules/queues/queues.module';
import { AuthModule } from './modules/auth/auth.module';
import { AiModule } from './modules/ai/ai.module';
import { QueueRoomModule } from './modules/queue-room/queue-room.module';
import { HealthModule } from './modules/health/health.module';
import { SeedService } from './database/seed.service';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 10000000, // Increased for 1M RPS load testing locally
    }]),
    DatabaseModule,
    UsersModule,
    BookingsModule,
    SeatsModule,
    EventsModule,
    TypeOrmModule.forFeature([Event, Seat, User]),
    RedisModule,
    QueuesModule,
    AuthModule,
    AiModule,
    QueueRoomModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    SeedService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule { }
