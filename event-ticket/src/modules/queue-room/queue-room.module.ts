import { Module } from '@nestjs/common';
import { QueueRoomService } from './queue-room.service';
import { QueueRoomController } from './queue-room.controller';

@Module({
    controllers: [QueueRoomController],
    providers: [QueueRoomService],
    exports: [QueueRoomService],
})
export class QueueRoomModule { }
