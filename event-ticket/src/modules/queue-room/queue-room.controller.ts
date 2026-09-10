import { Controller, Post, Get, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { QueueRoomService } from './queue-room.service';

@Controller('queue')
export class QueueRoomController {
    constructor(private readonly queueRoomService: QueueRoomService) { }

    @Post('join')
    @HttpCode(HttpStatus.OK)
    async joinQueue(@Body() body: { eventId: string; userId: string }) {
        return this.queueRoomService.joinQueue(body.eventId, body.userId);
    }

    @Get('status/:eventId/:queueId')
    async getQueueStatus(
        @Param('eventId') eventId: string,
        @Param('queueId') queueId: string,
    ) {
        return this.queueRoomService.getQueueStatus(eventId, queueId);
    }

    @Post('admit')
    @HttpCode(HttpStatus.OK)
    async admitBatch(@Body() body: { eventId: string; batchSize?: number }) {
        return this.queueRoomService.admitBatch(body.eventId, body.batchSize || 10);
    }
}
