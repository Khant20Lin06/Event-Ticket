import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BookingStore } from '../../../core/state/booking.store';

@Component({
  selector: 'app-conflict-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (bookingStore.conflictError(); as errorMsg) {
      <div class="toast-container">
        <div class="conflict-card glass-panel">
          <div class="conflict-icon-box">
            <span class="lightning-icon">⚡</span>
          </div>
          <div class="conflict-content">
            <div class="conflict-header">
              <span class="conflict-title font-display">CONCURRENCY RACE DETECTED</span>
              <button
                class="dismiss-btn"
                (click)="bookingStore.clearConflict()"
                title="Dismiss"
              >
                ✕
              </button>
            </div>
            <p class="conflict-message">{{ errorMsg }}</p>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .toast-container {
      position: fixed;
      top: 5.5rem;
      right: 1.75rem;
      z-index: 150;
      max-width: 440px;
      width: calc(100% - 3.5rem);
      animation: toast-slide-in 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .conflict-card {
      background: rgba(24, 18, 14, 0.94);
      border: 1px solid rgba(245, 158, 11, 0.5);
      border-radius: 12px;
      padding: 1rem 1.25rem;
      display: flex;
      gap: 1rem;
      box-shadow: 0 16px 36px rgba(0, 0, 0, 0.7), 0 0 20px rgba(245, 158, 11, 0.25);
    }

    .conflict-icon-box {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      background: rgba(245, 158, 11, 0.15);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      .lightning-icon {
        font-size: 1.25rem;
      }
    }

    .conflict-content {
      flex-grow: 1;

      .conflict-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 0.35rem;

        .conflict-title {
          font-size: 0.78rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          color: #fbbf24;
        }

        .dismiss-btn {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          font-size: 0.9rem;
          padding: 0 0.2rem;

          &:hover {
            color: #ffffff;
          }
        }
      }

      .conflict-message {
        font-size: 0.85rem;
        color: var(--text-secondary);
        line-height: 1.45;
      }
    }

    @keyframes toast-slide-in {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
  `],
})
export class ConflictToastComponent {
  readonly bookingStore = inject(BookingStore);
}
