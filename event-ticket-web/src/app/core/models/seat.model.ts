export enum SeatStatus {
  AVAILABLE = 'AVAILABLE',
  HELD = 'HELD',
  BOOKED = 'BOOKED',
  BLOCKED = 'BLOCKED',
  MAINTENANCE = 'MAINTENANCE',
}

export enum SeatTier {
  VIP = 'VIP',
  PLATINUM = 'PLATINUM',
  GOLD = 'GOLD',
  STANDARD = 'STANDARD',
}

export interface Seat {
  id: string;
  seatNumber: string;
  price: number;
  status: SeatStatus;
  tier?: SeatTier;
  heldUntil?: string | null;
  heldByUserId?: string | null;
  eventId: string;
  event?: any;
  createdAt?: string;
  updatedAt?: string;
}
