import { Injectable, signal, OnDestroy } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Subject, Observable } from 'rxjs';
import { SeatSocketEvent } from '../models/socket-events.model';

@Injectable({
  providedIn: 'root',
})
export class SocketService implements OnDestroy {
  private socket: Socket | null = null;
  private readonly baseUrl = 'http://localhost:3000/seats';

  // Signals for fine-grained reactive state
  readonly isConnected = signal<boolean>(false);
  readonly activeEventRoom = signal<string | null>(null);

  // Observable stream for real-time seat lock/release events
  private readonly seatUpdateSubject = new Subject<SeatSocketEvent>();
  readonly seatUpdate$: Observable<SeatSocketEvent> = this.seatUpdateSubject.asObservable();

  constructor() {
    this.initSocket();
  }

  private initSocket(): void {
    if (this.socket) return;

    this.socket = io(this.baseUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('⚡ [WebSocket] Connected to /seats namespace. ID:', this.socket?.id);
      this.isConnected.set(true);

      // Re-join current room if reconnecting
      const currentRoom = this.activeEventRoom();
      if (currentRoom) {
        this.joinEventRoom(currentRoom);
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.warn('⚠️ [WebSocket] Disconnected:', reason);
      this.isConnected.set(false);
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ [WebSocket] Connection error:', error.message);
      this.isConnected.set(false);
    });

    // Handle generic seat updates broadcast from Redis Pub/Sub
    this.socket.on('seat_update', (event: SeatSocketEvent) => {
      console.log('📢 [WebSocket] Received seat_update:', event);
      this.seatUpdateSubject.next(event);
    });
  }

  /**
   * Join an event's real-time room to receive lock/release updates for its seats
   */
  joinEventRoom(eventId: string): void {
    if (!this.socket) return;
    this.activeEventRoom.set(eventId);
    this.socket.emit('join_event', { eventId }, (response: any) => {
      console.log(`📡 [WebSocket] Joined event room: event:${eventId}`, response);
    });
  }

  /**
   * Leave the event room when navigating away
   */
  leaveEventRoom(eventId: string): void {
    if (!this.socket) return;
    this.socket.emit('leave_event', { eventId });
    if (this.activeEventRoom() === eventId) {
      this.activeEventRoom.set(null);
    }
  }

  ngOnDestroy(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}
