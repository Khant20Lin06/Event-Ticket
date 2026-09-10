import { Booking } from "../../bookings/entities/booking.entity";
import { Event } from "../../events/entities/event.entity";
import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn, VersionColumn } from "typeorm";

export enum SeatStatus {
    AVAILABLE = 'AVAILABLE',
    HELD = 'HELD',
    BOOKED = 'BOOKED',
    BLOCKED = 'BLOCKED',
    MAINTENANCE = 'MAINTENANCE',
}

@Entity('seats')
@Index(['eventId', 'status'])
export class Seat {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    eventId: string;

    @Column()
    seatNumber: string;    // e.g A-01, A-02, A-03, A-04, A-05

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    price: number;

    @Column({ type: 'enum', enum: SeatStatus, default: SeatStatus.AVAILABLE })
    status: SeatStatus;

    @Column({ type: 'uuid', nullable: true })
    heldByUserId?: string | null;

    @Column({ type: 'timestamp', nullable: true })
    heldUntil?: Date | null;

    @VersionColumn()
    version: number;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @ManyToOne(() => Event, (event) => event.seats, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'eventId' })
    event: Event;

    @OneToMany(() => Booking, (booking) => booking.seat)
    bookings: Booking[];
}