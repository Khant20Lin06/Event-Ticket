import { Module } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from './entities/booking.entity';
import { Seat } from '../seats/entities/seat.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Booking, Seat])
  ],
  providers: [BookingsService],
  controllers: [BookingsController],
  exports: [BookingsService]
})
export class BookingsModule { }
