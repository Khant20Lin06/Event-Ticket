export type SeatSocketEventType = 'SEAT_HELD' | 'SEAT_RELEASED' | 'SEAT_BOOKED';

export interface SeatSocketEvent {
  type: SeatSocketEventType;
  eventId: string;
  seatId: string;
  userId?: string;
  heldUntil?: string;
  bookingId?: string;
  timestamp: number;
}
