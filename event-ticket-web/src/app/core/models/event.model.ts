import { Seat } from './seat.model';

export interface EventItem {
  id: string;
  title: string;
  description: string;
  venue: string;
  eventDate: string;
  totalSeats: number;
  imageUrl?: string;
  category?: string;
  seats?: Seat[];
  createdAt?: string;
  updatedAt?: string;
}
