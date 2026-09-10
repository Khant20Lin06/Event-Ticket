import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { User } from '../modules/users/entities/user.entity';
import { Event } from '../modules/events/entities/event.entity';
import { Seat } from '../modules/seats/entities/seat.entity';
import { Booking } from '../modules/bookings/entities/booking.entity';

@Module({
    imports: [
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                type: 'postgres',
                host: configService.get<string>('DB_HOST', 'localhost'),
                port: configService.get<number>('DB_PORT', 5432),
                username: configService.get<string>('DB_USERNAME', 'postgres'),
                password: configService.get<string>('DB_PASSWORD', 'postgres'),
                database: configService.get<string>('DB_DATABASE', 'ticket_booking'),
                entities: [User, Event, Seat, Booking],
                synchronize: true, // Automatically sync schema in dev mode
                logging: false,
                // Keep each replica's own pool small: PgBouncer (transaction pooling,
                // DEFAULT_POOL_SIZE=100 into real Postgres) is what actually absorbs
                // concurrency across horizontally-scaled pods. If every replica opened
                // a large pool directly, N replicas x a large pool would blow past
                // PgBouncer's MAX_CLIENT_CONN and Postgres's own connection limit.
                extra: {
                    max: configService.get<number>('DB_POOL_SIZE', 10),
                    idleTimeoutMillis: 30000,
                    connectionTimeoutMillis: 5000,
                },
            }),
        }),
    ],
})
export class DatabaseModule { }