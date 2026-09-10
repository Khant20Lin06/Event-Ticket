import { Module } from '@nestjs/common';
import { SeatsService } from './seats.service';
import { SeatController } from './seats.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Seat } from './entities/seat.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { BullModule } from '@nestjs/bullmq';
import { SEAT_EXPIRATION_QUEUE } from '../queues/seat-expiration.processor';

import { ASYNC_DB_WRITE_QUEUE } from '../queues/async-db-write.processor';
import { SeatsGateway } from './seats.gateway';

@Module({
  imports: [
    TypeOrmModule.forFeature([Seat, Booking]),
    BullModule.registerQueue({
      name: SEAT_EXPIRATION_QUEUE,
    }),
    BullModule.registerQueue({
      name: ASYNC_DB_WRITE_QUEUE,
    })
  ],
  providers: [SeatsService, SeatsGateway],
  controllers: [SeatController],
  exports: [SeatsService, SeatsGateway, TypeOrmModule]
})
export class SeatsModule { }
