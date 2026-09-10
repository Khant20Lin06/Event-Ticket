import { Controller, Post, Body, Patch, Param, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { HoldSeatDto } from './dto/hold-seat.dto';
import { SeatsService } from './seats.service';
import { SeatStatus } from './entities/seat.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller(['seats', 'seat'])
export class SeatController {
    constructor(private readonly seatService: SeatsService) { }

    /**
     * Admin-Only: Emergency Stuck-Lock Sweeper / Deadlock Recovery
     */
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    @Post('emergency-release-all-locks')
    @HttpCode(HttpStatus.OK)
    async emergencyReleaseAllLocks() {
        return this.seatService.emergencyReleaseAllStuckLocks();
    }

    @Post(':id/hold')
    @HttpCode(HttpStatus.OK)
    async holdSeat(
        @Param('id') seatId: string,
        @Body() holdSeatDto: HoldSeatDto,
    ) {
        return this.seatService.holdSeat(seatId, holdSeatDto.userId);
    }

    /**
     * Organizer & Admin: Update seat status (AVAILABLE, BLOCKED, MAINTENANCE)
     */
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
    @Patch(':id/status')
    async updateSeatStatus(
        @Param('id') seatId: string,
        @Body('status') status: SeatStatus,
    ) {
        return this.seatService.updateStatus(seatId, status);
    }

    /**
     * Organizer & Admin: Update seat pricing
     */
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
    @Patch(':id/price')
    async updateSeatPrice(
        @Param('id') seatId: string,
        @Body('price') price: number,
    ) {
        return this.seatService.updatePrice(seatId, Number(price));
    }
}
