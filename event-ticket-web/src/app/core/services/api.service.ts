import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { EventItem } from '../models/event.model';
import { Seat } from '../models/seat.model';
import { Booking, HoldSeatResponse } from '../models/booking.model';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private readonly baseUrl = 'http://localhost:3000/api/v1';

  constructor(private readonly http: HttpClient) {}

  getEvents(): Observable<EventItem[]> {
    return this.http.get<EventItem[]>(`${this.baseUrl}/events`);
  }

  getEvent(id: string): Observable<EventItem> {
    return this.http.get<EventItem>(`${this.baseUrl}/events/${id}`);
  }

  getEventSeats(eventId: string): Observable<Seat[]> {
    return this.http.get<Seat[]>(`${this.baseUrl}/events/${eventId}/seats`);
  }

  holdSeat(seatId: string, userId: string): Observable<HoldSeatResponse> {
    return this.http.post<HoldSeatResponse>(`${this.baseUrl}/seats/${seatId}/hold`, { userId });
  }

  checkout(payload: {
    bookingId: string;
    userId: string;
    paymentMethod: string;
  }): Observable<Booking> {
    return this.http.post<Booking>(`${this.baseUrl}/bookings/checkout`, payload);
  }

  getUserBookings(userId: string): Observable<Booking[]> {
    return this.http.get<Booking[]>(`${this.baseUrl}/bookings/user/${userId}`);
  }

  private getAuthHeaders(): { [header: string]: string } {
    try {
      const token = localStorage.getItem('aura_access_token');
      return token ? { Authorization: `Bearer ${token}` } : {};
    } catch {
      return {};
    }
  }

  createEvent(payload: {
    title: string;
    description: string;
    venue: string;
    eventDate: string;
    totalSeats?: number;
    videoTeaserUrl?: string;
    themeColor?: string;
    imageUrl?: string;
    category?: string;
  }): Observable<{ event: EventItem; seatsCount: number }> {
    return this.http.post<{ event: EventItem; seatsCount: number }>(
      `${this.baseUrl}/events`,
      payload,
      { headers: this.getAuthHeaders() }
    );
  }

  updateSeatStatus(seatId: string, status: string): Observable<any> {
    return this.http.patch<any>(
      `${this.baseUrl}/seats/${seatId}/status`,
      { status },
      { headers: this.getAuthHeaders() }
    );
  }

  updateSeatPrice(seatId: string, price: number): Observable<any> {
    return this.http.patch<any>(
      `${this.baseUrl}/seats/${seatId}/price`,
      { price },
      { headers: this.getAuthHeaders() }
    );
  }

  emergencyReleaseAllLocks(): Observable<{ releasedCount: number; message: string }> {
    return this.http.post<{ releasedCount: number; message: string }>(
      `${this.baseUrl}/seats/emergency-release-all-locks`,
      {},
      { headers: this.getAuthHeaders() }
    );
  }

  generateAiCampaign(payload: {
    prompt: string;
    genre?: string;
    venue?: string;
    artist?: string;
  }): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/ai/generate-campaign`, payload);
  }

  generateMotionPass(payload: {
    seatNumber: string;
    tier: string;
    eventTitle: string;
  }): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/ai/generate-motion-pass`, payload);
  }

  joinQueue(eventId: string, userId: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/queue/join`, { eventId, userId });
  }

  getQueueStatus(eventId: string, queueId: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/queue/status/${eventId}/${queueId}`);
  }

  getHealth(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/health`);
  }

  getMetrics(format: 'json' | 'prometheus' = 'json'): Observable<any> {
    if (format === 'prometheus') {
      return this.http.get(`${this.baseUrl}/metrics`, { responseType: 'text' });
    }
    return this.http.get<any>(`${this.baseUrl}/metrics?format=json`);
  }
}

