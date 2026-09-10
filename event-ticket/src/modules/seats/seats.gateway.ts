import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnGatewayInit,
    MessageBody,
    ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { RedisPubSubService, SeatSocketEvent } from '../redis/redis-pubsub.service';

@WebSocketGateway({
    namespace: '/seats',
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
        credentials: true,
    },
})
export class SeatsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private readonly logger = new Logger(SeatsGateway.name);

    constructor(private readonly redisPubSubService: RedisPubSubService) { }

    afterInit(server: Server) {
        this.logger.log('⚡ SeatsGateway initialized (Namespace: /seats)');

        // Listen for Redis Pub/Sub events across all backend instances
        this.redisPubSubService.onSeatEvent((event: SeatSocketEvent) => {
            const room = `event:${event.eventId}`;
            this.logger.debug(
                `📢 Broadcasting ${event.type} to room [${room}] for seat ${event.seatId}`,
            );

            // Broadcast to all clients viewing this specific event
            this.server.to(room).emit('seat_update', event);

            // Also emit fine-grained named event for convenience
            if (event.type === 'SEAT_HELD') {
                this.server.to(room).emit('seat_held', event);
            } else if (event.type === 'SEAT_RELEASED') {
                this.server.to(room).emit('seat_released', event);
            } else if (event.type === 'SEAT_BOOKED') {
                this.server.to(room).emit('seat_booked', event);
            }
        });
    }

    handleConnection(client: Socket) {
        this.logger.log(`Client connected to SeatsGateway: ${client.id}`);
    }

    handleDisconnect(client: Socket) {
        this.logger.log(`Client disconnected from SeatsGateway: ${client.id}`);
    }

    @SubscribeMessage('join_event')
    handleJoinEvent(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { eventId: string },
    ) {
        if (!data?.eventId) return { status: 'error', message: 'eventId is required' };
        const room = `event:${data.eventId}`;
        client.join(room);
        this.logger.log(`Client ${client.id} joined room ${room}`);
        return { status: 'joined', room };
    }

    @SubscribeMessage('leave_event')
    handleLeaveEvent(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { eventId: string },
    ) {
        if (!data?.eventId) return;
        const room = `event:${data.eventId}`;
        client.leave(room);
        this.logger.log(`Client ${client.id} left room ${room}`);
        return { status: 'left', room };
    }
}
