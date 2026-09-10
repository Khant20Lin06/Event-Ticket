import { Controller, Param, Post, Body, Get, UseGuards } from '@nestjs/common';
import { EventsService } from './events.service';
import { SeatsService } from '../seats/seats.service';
import { CreateEventDto } from './dto/create-event.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('events')
export class EventsController {
    constructor(
        private readonly eventsService: EventsService,
        private readonly seatsService: SeatsService,
    ) { }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
    @Post()
    async createEvent(@Body() dto: CreateEventDto) {
        return this.eventsService.create(dto);
    }

    @Get()
    async getEvents() {
        return this.eventsService.findAll();
    }

    @Get(':id')
    async getEventDetails(@Param('id') id: string) {
        return this.eventsService.findOne(id);
    }

    @Get(':id/seats')
    async getEventSeats(@Param('id') eventId: string) {
        await this.eventsService.findOne(eventId);
        return this.seatsService.findByEvent(eventId);
    }
}
