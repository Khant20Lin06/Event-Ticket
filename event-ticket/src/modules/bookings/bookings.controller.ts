import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { CheckoutBookingDto } from './dto/checkout-booking.dto';
import { BookingsService } from './bookings.service';

@Controller('bookings')
export class BookingsController {
    constructor(
        private readonly bookingService: BookingsService
    ) { }

    @Post('checkout')
    @HttpCode(HttpStatus.OK)
    async checkout(@Body() dto: CheckoutBookingDto) {
        return this.bookingService.checkout(dto);
    }

    @Get('user/:userId')
    async getUserBookings(@Param('userId') userId: string) {
        return this.bookingService.getUserBookings(userId);
    }

    @Get(':id')
    async getBookingDetails(@Param('id') bookingId: string) {
        return this.bookingService.getBookingDetails(bookingId);
    }
}
