import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BookingStore } from '../../../../core/state/booking.store';

@Component({
  selector: 'app-countdown-drawer',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (bookingStore.hasActiveHold()) {
      <div class="drawer-overlay">
        <div class="countdown-bar glass-panel" [class.urgent]="bookingStore.isUrgent()">
          <!-- Animated Top Progress Line -->
          <div class="progress-track">
            <div
              class="progress-fill"
              [style.width.%]="bookingStore.timerProgressPercent()"
              [class.urgent]="bookingStore.isUrgent()"
            ></div>
          </div>

          <div class="drawer-content">
            <!-- Left Info -->
            <div class="seat-info-group">
              <div class="lock-indicator">
                <span class="status-dot holding"></span>
                <span class="lock-label font-mono">ATOMIC LOCK ACTIVE</span>
              </div>
              <div class="seat-details">
                <span class="seat-pill font-mono">SEAT {{ bookingStore.selectedSeat()?.seatNumber }}</span>
                <span class="seat-tier badge badge-indigo">{{ bookingStore.selectedSeat()?.tier || 'VIP' }}</span>
                <span class="seat-price font-mono font-bold">{{ bookingStore.selectedSeat()?.price | currency }}</span>
              </div>
            </div>

            <!-- Center Countdown Timer -->
            <div class="timer-display-group">
              <span class="timer-label font-display">TIME REMAINING TO COMPLETE ORDER:</span>
              <div class="timer-badge font-mono" [class.urgent]="bookingStore.isUrgent()">
                <svg class="timer-clock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                <span class="countdown-digits">{{ bookingStore.formattedCountdown() }}</span>
              </div>
            </div>

            <!-- Right CTA Actions -->
            <div class="action-buttons-group">
              <button
                (click)="bookingStore.resetHold()"
                class="btn btn-ghost btn-sm text-secondary"
                title="Release this seat lock back to the pool"
              >
                Release Hold
              </button>
              <button
                (click)="bookingStore.openCheckoutModal()"
                class="btn btn-primary font-display"
              >
                <span>Proceed to Checkout</span>
                <svg class="cta-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .drawer-overlay {
      position: fixed;
      bottom: 1.5rem;
      left: 0;
      right: 0;
      display: flex;
      justify-content: center;
      z-index: 90;
      padding: 0 1.5rem;
      pointer-events: none;
      animation: drawer-slide-up 0.35s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .countdown-bar {
      pointer-events: auto;
      width: 100%;
      max-width: 1100px;
      position: relative;
      overflow: hidden;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.7), 0 0 30px rgba(99, 102, 241, 0.2);
      border: 1px solid rgba(245, 158, 11, 0.4);
      background: rgba(15, 23, 42, 0.92);

      &.urgent {
        border-color: rgba(239, 68, 68, 0.6);
        box-shadow: 0 20px 50px rgba(0, 0, 0, 0.7), 0 0 30px rgba(239, 68, 68, 0.3);
      }
    }

    .progress-track {
      width: 100%;
      height: 3px;
      background: rgba(255, 255, 255, 0.08);
      position: absolute;
      top: 0;
      left: 0;

      .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #10b981 0%, #f59e0b 100%);
        transition: width 1s linear;

        &.urgent {
          background: #ef4444;
          box-shadow: 0 0 10px #ef4444;
        }
      }
    }

    .drawer-content {
      padding: 1rem 1.75rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1.5rem;
    }

    .seat-info-group {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;

      .lock-indicator {
        display: flex;
        align-items: center;
        gap: 0.45rem;
        font-size: 0.68rem;
        color: var(--seat-held);
        letter-spacing: 0.08em;
      }

      .seat-details {
        display: flex;
        align-items: center;
        gap: 0.65rem;

        .seat-pill {
          background: rgba(255, 255, 255, 0.08);
          font-weight: 700;
          font-size: 0.95rem;
          padding: 0.2rem 0.55rem;
          border-radius: 6px;
        }

        .seat-price {
          font-size: 1.15rem;
          color: #34d399;
        }
      }
    }

    .timer-display-group {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.25rem;

      .timer-label {
        font-size: 0.68rem;
        color: var(--text-secondary);
        letter-spacing: 0.06em;
      }

      .timer-badge {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        background: rgba(245, 158, 11, 0.15);
        color: #fbbf24;
        border: 1px solid rgba(245, 158, 11, 0.4);
        padding: 0.35rem 0.85rem;
        border-radius: 8px;

        .timer-clock-icon {
          width: 17px;
          height: 17px;
          animation: clock-pulse 1s infinite ease-in-out;
        }

        .countdown-digits {
          font-size: 1.4rem;
          font-weight: 800;
          letter-spacing: 0.05em;
        }

        &.urgent {
          background: rgba(239, 68, 68, 0.2);
          color: #f87171;
          border-color: rgba(239, 68, 68, 0.5);
          animation: urgent-shake 0.8s infinite ease-in-out;
        }
      }
    }

    .action-buttons-group {
      display: flex;
      align-items: center;
      gap: 1rem;

      .cta-arrow {
        width: 16px;
        height: 16px;
        transition: transform 0.2s ease;
      }

      &:hover .cta-arrow {
        transform: translateX(4px);
      }
    }

    @keyframes drawer-slide-up {
      from {
        transform: translateY(100%);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    @keyframes clock-pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.15); }
    }

    @keyframes urgent-shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-2px); }
      75% { transform: translateX(2px); }
    }

    @media (max-width: 860px) {
      .drawer-content {
        flex-direction: column;
        align-items: stretch;
      }
      .timer-display-group {
        align-items: flex-start;
      }
    }
  `],
})
export class CountdownDrawerComponent {
  readonly bookingStore = inject(BookingStore);
}
