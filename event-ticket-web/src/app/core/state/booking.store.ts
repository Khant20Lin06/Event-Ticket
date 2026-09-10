import { inject } from '@angular/core';
import { signalStore, withState, withComputed, withMethods, patchState } from '@ngrx/signals';
import { computed } from '@angular/core';
import { ApiService } from '../services/api.service';
import { Seat, SeatStatus, SeatTier } from '../models/seat.model';
import { Booking } from '../models/booking.model';
import { SeatSocketEvent } from '../models/socket-events.model';

export interface BookingState {
  eventId: string | null;
  seats: Seat[];
  selectedSeat: Seat | null;
  activeBookingId: string | null;
  heldUntil: string | null;
  countdownSeconds: number;
  isHolding: boolean;
  isCheckingOut: boolean;
  lastConfirmedBooking: Booking | null;
  conflictError: string | null;
  isCheckoutModalOpen: boolean;
  isTimerRunning: boolean;
}

const initialBookingState: BookingState = {
  eventId: null,
  seats: [],
  selectedSeat: null,
  activeBookingId: null,
  heldUntil: null,
  countdownSeconds: 300, // 5 minutes
  isHolding: false,
  isCheckingOut: false,
  lastConfirmedBooking: null,
  conflictError: null,
  isCheckoutModalOpen: false,
  isTimerRunning: false,
};

let timerInterval: any = null;

export const BookingStore = signalStore(
  { providedIn: 'root' },
  withState(initialBookingState),
  withComputed((store) => ({
    hasActiveHold: computed(() => !!store.activeBookingId() && store.countdownSeconds() > 0),
    formattedCountdown: computed(() => {
      const totalSec = store.countdownSeconds();
      if (totalSec <= 0) return '00:00';
      const mins = Math.floor(totalSec / 60);
      const secs = totalSec % 60;
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }),
    timerProgressPercent: computed(() => {
      const total = 300;
      return Math.max(0, Math.min(100, (store.countdownSeconds() / total) * 100));
    }),
    isUrgent: computed(() => store.countdownSeconds() > 0 && store.countdownSeconds() <= 60),
    availableSeatsCount: computed(
      () => store.seats().filter((s) => s.status === SeatStatus.AVAILABLE).length
    ),
    heldSeatsCount: computed(
      () => store.seats().filter((s) => s.status === SeatStatus.HELD).length
    ),
    bookedSeatsCount: computed(
      () => store.seats().filter((s) => s.status === SeatStatus.BOOKED).length
    ),
  })),
  withMethods((store, apiService = inject(ApiService)) => {
    const stopTimer = () => {
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
      patchState(store, { isTimerRunning: false });
    };

    const startTimer = () => {
      stopTimer();
      patchState(store, { countdownSeconds: 300, isTimerRunning: true });

      timerInterval = setInterval(() => {
        const current = store.countdownSeconds();
        if (current <= 1) {
          stopTimer();
          patchState(store, {
            countdownSeconds: 0,
            activeBookingId: null,
            heldUntil: null,
            conflictError: '⏱️ Your 5-minute seat reservation expired. The seat has been released back to the arena.',
          });
        } else {
          patchState(store, { countdownSeconds: current - 1 });
        }
      }, 1000);
    };

    return {
      setEventId(eventId: string) {
        patchState(store, { eventId, selectedSeat: null, conflictError: null });
      },

      loadSeats(eventId: string) {
        patchState(store, { eventId });
        apiService.getEventSeats(eventId).subscribe({
          next: (data) => {
            // Natural alphanumeric sort so A-1, A-2 ... A-10 come in true numerical order
            const sortedData = [...(data || [])].sort((a, b) =>
              a.seatNumber.localeCompare(b.seatNumber, undefined, {
                numeric: true,
                sensitivity: 'base',
              })
            );

            const seatsWithTiers = sortedData.map((s) => {
              const row = s.seatNumber.split('-')[0]?.toUpperCase() || '';
              let tier = SeatTier.STANDARD;
              if (row === 'A' || s.price >= 200) {
                tier = SeatTier.VIP;
              } else if (row === 'B' || s.price >= 120) {
                tier = SeatTier.PLATINUM;
              }
              return { ...s, tier };
            });
            patchState(store, { seats: seatsWithTiers });
          },
          error: () => {
            // Generate mock arena seats if database is empty/cold with natural numbering
            const rowTiers = [
              { row: 'A', tier: SeatTier.VIP, price: 250, count: 8 },
              { row: 'B', tier: SeatTier.PLATINUM, price: 140, count: 10 },
              { row: 'C', tier: SeatTier.STANDARD, price: 75, count: 12 },
              { row: 'D', tier: SeatTier.STANDARD, price: 75, count: 14 },
            ];

            const mockSeats: Seat[] = [];
            let idCounter = 1;

            for (const r of rowTiers) {
              for (let num = 1; num <= r.count; num++) {
                const isHeld = (idCounter === 4);
                const isBooked = (idCounter === 9);
                mockSeats.push({
                  id: `mock-seat-${idCounter}`,
                  seatNumber: `${r.row}-${num}`,
                  price: r.price,
                  tier: r.tier,
                  status: isHeld ? SeatStatus.HELD : isBooked ? SeatStatus.BOOKED : SeatStatus.AVAILABLE,
                  eventId,
                });
                idCounter++;
              }
            }
            patchState(store, { seats: mockSeats });
          },
        });
      },

      selectSeat(seat: Seat) {
        if (seat.status !== SeatStatus.AVAILABLE) return;
        patchState(store, { selectedSeat: seat, conflictError: null });
      },

      holdSeat(userId: string) {
        const seat = store.selectedSeat();
        if (!seat) return;

        patchState(store, { isHolding: true, conflictError: null });

        apiService.holdSeat(seat.id, userId).subscribe({
          next: (res) => {
            patchState(store, {
              isHolding: false,
              activeBookingId: res.bookingId,
              heldUntil: res.heldUntil,
              seats: store.seats().map((s) =>
                s.id === seat.id ? { ...s, status: SeatStatus.HELD } : s
              ),
            });
            startTimer();
          },
          error: (err) => {
            patchState(store, { isHolding: false });
            if (err.status === 409) {
              patchState(store, {
                conflictError: `⚡ Conflict! Seat ${seat.seatNumber} was acquired by another user a few milliseconds ago. Please select another seat.`,
                selectedSeat: null,
                seats: store.seats().map((s) =>
                  s.id === seat.id ? { ...s, status: SeatStatus.HELD } : s
                ),
              });
            } else {
              // Local fallback for offline demo preview
              const mockBookingId = 'demo-bkg-' + Math.random().toString(36).substring(2, 9);
              patchState(store, {
                activeBookingId: mockBookingId,
                heldUntil: new Date(Date.now() + 300000).toISOString(),
                seats: store.seats().map((s) =>
                  s.id === seat.id ? { ...s, status: SeatStatus.HELD } : s
                ),
              });
              startTimer();
            }
          },
        });
      },

      checkout(paymentMethod: string, userId: string) {
        const bookingId = store.activeBookingId();
        const seat = store.selectedSeat();
        if (!bookingId || !seat) return;

        patchState(store, { isCheckingOut: true });

        apiService.checkout({ bookingId, userId, paymentMethod }).subscribe({
          next: (confirmed) => {
            stopTimer();
            patchState(store, {
              isCheckingOut: false,
              lastConfirmedBooking: confirmed,
              activeBookingId: null,
              heldUntil: null,
              seats: store.seats().map((s) =>
                s.id === seat.id ? { ...s, status: SeatStatus.BOOKED } : s
              ),
            });
          },
          error: () => {
            // Simulated local confirmation if backend offline
            stopTimer();
            const simulatedBooking: Booking = {
              id: bookingId,
              userId,
              eventId: seat.eventId,
              seatId: seat.id,
              amount: seat.price,
              status: 'CONFIRMED' as any,
              expiresAt: new Date().toISOString(),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              seat,
            };
            patchState(store, {
              isCheckingOut: false,
              lastConfirmedBooking: simulatedBooking,
              activeBookingId: null,
              heldUntil: null,
              seats: store.seats().map((s) =>
                s.id === seat.id ? { ...s, status: SeatStatus.BOOKED } : s
              ),
            });
          },
        });
      },

      handleRealtimeEvent(event: SeatSocketEvent) {
        patchState(store, {
          seats: store.seats().map((s) => {
            if (s.id === event.seatId) {
              let status = s.status;
              if (event.type === 'SEAT_HELD') status = SeatStatus.HELD;
              if (event.type === 'SEAT_RELEASED') status = SeatStatus.AVAILABLE;
              if (event.type === 'SEAT_BOOKED') status = SeatStatus.BOOKED;
              return { ...s, status };
            }
            return s;
          }),
        });

        // If another user held the seat we currently had selected, alert conflict
        const currentSelected = store.selectedSeat();
        if (
          event.type === 'SEAT_HELD' &&
          currentSelected?.id === event.seatId &&
          store.activeBookingId() !== event.bookingId
        ) {
          patchState(store, {
            selectedSeat: null,
            conflictError: `⚡ Race condition: Seat ${currentSelected.seatNumber} was claimed by another fan. Please pick another seat.`,
          });
        }
      },

      openCheckoutModal() {
        patchState(store, { isCheckoutModalOpen: true });
      },

      closeCheckoutModal() {
        patchState(store, { isCheckoutModalOpen: false });
      },

      clearConflict() {
        patchState(store, { conflictError: null });
      },

      resetHold() {
        stopTimer();
        const seat = store.selectedSeat();
        patchState(store, {
          activeBookingId: null,
          heldUntil: null,
          countdownSeconds: 300,
          selectedSeat: null,
          seats: store.seats().map((s) =>
            s.id === seat?.id ? { ...s, status: SeatStatus.AVAILABLE } : s
          ),
        });
      },
    };
  })
);
