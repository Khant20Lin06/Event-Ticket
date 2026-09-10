import { Seat } from './seat.model';
import { EventItem } from './event.model';

export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export interface Booking {
  id: string;
  userId: string;
  eventId: string;
  seatId: string;
  amount: number;
  status: BookingStatus;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  seat?: Seat;
  event?: EventItem;
}

export interface HoldSeatResponse {
  message: string;
  seatId: string;
  bookingId: string;
  status: string;
  heldUntil: string;
}
