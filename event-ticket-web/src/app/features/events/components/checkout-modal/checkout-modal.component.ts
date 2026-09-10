import { Component, inject, signal, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { BookingStore } from '../../../../core/state/booking.store';
import { AuthService } from '../../../../core/services/auth.service';
import { EventItem } from '../../../../core/models/event.model';

@Component({
  selector: 'app-checkout-modal',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    @if (bookingStore.isCheckoutModalOpen()) {
      <div class="checkout-backdrop" (click)="onBackdropClick($event)">
        <div class="checkout-modal-card" (click)="$event.stopPropagation()">
          <!-- Top 5-Minute Hold Progress Line -->
          <div class="ttl-progress-track">
            <div
              class="ttl-progress-bar"
              [style.width.%]="bookingStore.timerProgressPercent()"
              [class.urgent]="bookingStore.isUrgent()"
            ></div>
          </div>

          <!-- Close Button -->
          <button
            class="checkout-close-btn"
            (click)="bookingStore.closeCheckoutModal()"
            [disabled]="bookingStore.isCheckingOut()"
            title="Close Checkout"
          >
            ✕
          </button>

          @if (!bookingStore.lastConfirmedBooking()) {
            <!-- 1. Modal Header Bar with Redis Status & Countdown -->
            <div class="checkout-modal-header">
              <div class="header-status-left">
                <span class="status-dot live"></span>
                <span class="status-tag font-mono">REDIS ATOMIC LOCK RESERVED</span>
              </div>
              <div class="countdown-badge font-mono" [class.urgent]="bookingStore.isUrgent()">
                <svg class="clock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                <span>{{ bookingStore.formattedCountdown() }}</span>
              </div>
            </div>

            <!-- 2. Movie & Screening Showcase Banner -->
            <div class="movie-showcase-card">
              <div class="movie-banner-box">
                <img
                  [src]="getMovieBannerUrl()"
                  [alt]="getMovieTitle()"
                  class="movie-banner-img"
                  (error)="onBannerError($event)"
                />
                <div class="banner-gradient-overlay"></div>
                <div class="format-pill font-mono">✦ {{ getMovieFormat() }} ✦</div>
              </div>
              <div class="movie-info-body">
                <h3 class="movie-title font-display">{{ getMovieTitle() }}</h3>
                <div class="movie-venue-line font-mono">
                  <span>📍 {{ getMovieVenue() }}</span>
                </div>
                <div class="seat-badge-row font-mono">
                  <span class="seat-pill">SEAT {{ getSeatNumber() }}</span>
                  <span class="tier-pill badge-indigo">{{ getSeatTier() }}</span>
                  <span class="lock-verified">🔒 ATOMIC LOCK ACTIVE</span>
                </div>
              </div>
            </div>

            <!-- 3. Perforated Ticket Tear Line -->
            <div class="perforated-tear-line">
              <div class="tear-notch notch-left"></div>
              <div class="tear-dash"></div>
              <div class="tear-notch notch-right"></div>
            </div>

            <!-- 4. Accurate Order Summary Itemization -->
            <div class="order-receipt-box">
              <div class="receipt-header font-mono">ORDER SUMMARY // ITEMIZED RECEIPT</div>

              <div class="receipt-row">
                <div class="item-meta">
                  <span class="item-name">Cinema Admission Pass</span>
                  <span class="item-sub text-muted font-mono">Seat {{ getSeatNumber() }} • {{ getSeatTier() }}</span>
                </div>
                <span class="item-price font-mono font-bold">{{ basePrice() | currency }}</span>
              </div>

              <div class="receipt-row">
                <div class="item-meta">
                  <span class="item-name">Auditorium Spatial Audio & Laser Tech Fee</span>
                  <span class="item-sub text-muted font-mono">Dolby Atmos 128-CH & 4K Laser Master</span>
                </div>
                <span class="item-price font-mono">{{ facilityFee() | currency }}</span>
              </div>

              <div class="receipt-row">
                <div class="item-meta">
                  <span class="item-name">Redis Concurrency Guarantee & Insurance</span>
                  <span class="item-sub text-muted font-mono">Atomic Set-NX 0.00% Oversell Guarantee</span>
                </div>
                <span class="item-price font-mono">{{ techFee() | currency }}</span>
              </div>

              <div class="receipt-divider"></div>

              <div class="receipt-total-row">
                <div class="total-label-box">
                  <span class="total-title font-display">Total Amount Due</span>
                  <span class="total-sub font-mono">Inclusive of all local cinema duties</span>
                </div>
                <div class="total-value-box font-mono font-bold">
                  {{ totalPrice() | currency }}
                </div>
              </div>
            </div>

            <!-- 5. Payment Methods Selection -->
            <div class="payment-section">
              <label class="payment-title font-mono">SELECT SECURE PAYMENT METHOD</label>

              <div class="payment-options-grid">
                <!-- Method 1: Instant Demo Pay -->
                <label
                  class="payment-card"
                  [class.active]="selectedPaymentMethod() === 'DEMO_FAST_PAY'"
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="DEMO_FAST_PAY"
                    [checked]="selectedPaymentMethod() === 'DEMO_FAST_PAY'"
                    (change)="selectedPaymentMethod.set('DEMO_FAST_PAY')"
                  />
                  <div class="card-icon-box bolt">⚡</div>
                  <div class="card-content">
                    <div class="card-name font-display">Instant Demo Pay</div>
                    <div class="card-desc font-mono">Direct atomic authorization (Zero friction)</div>
                  </div>
                  <span class="popular-tag font-mono">FASTEST</span>
                </label>

                <!-- Method 2: Apple Pay Pass -->
                <label
                  class="payment-card"
                  [class.active]="selectedPaymentMethod() === 'APPLE_PAY'"
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="APPLE_PAY"
                    [checked]="selectedPaymentMethod() === 'APPLE_PAY'"
                    (change)="selectedPaymentMethod.set('APPLE_PAY')"
                  />
                  <div class="card-icon-box apple">
                    <svg viewBox="0 0 24 24" fill="currentColor" class="apple-svg">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.38c.62-.75 1.04-1.8 0.92-2.85-.9.04-2 .6-2.65 1.35-.58.67-.97 1.74-.83 2.76 1.01.08 1.94-.51 2.56-1.26z"/>
                    </svg>
                  </div>
                  <div class="card-content">
                    <div class="card-name font-display">Apple Pay Pass</div>
                    <div class="card-desc font-mono">Biometric Touch / Face ID • Apple Wallet export</div>
                  </div>
                </label>

                <!-- Method 3: Credit Card -->
                <label
                  class="payment-card"
                  [class.active]="selectedPaymentMethod() === 'CREDIT_CARD'"
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="CREDIT_CARD"
                    [checked]="selectedPaymentMethod() === 'CREDIT_CARD'"
                    (change)="selectedPaymentMethod.set('CREDIT_CARD')"
                  />
                  <div class="card-icon-box card">💳</div>
                  <div class="card-content">
                    <div class="card-name font-display">Credit / Debit Card</div>
                    <div class="card-desc font-mono">Visa • Mastercard • Amex (256-bit Encrypted)</div>
                  </div>
                </label>
              </div>
            </div>

            <!-- 6. Modal Footer & Authorize Action -->
            <div class="checkout-footer">
              <button
                (click)="confirmCheckout()"
                class="btn-authorize-cinema font-display"
                [disabled]="bookingStore.isCheckingOut()"
              >
                @if (bookingStore.isCheckingOut()) {
                  <div class="checkout-spinner"></div>
                  <span>Securing Seat via Redis Atomic Lock...</span>
                } @else {
                  <span>Authorize & Claim Cinema Pass → {{ totalPrice() | currency }}</span>
                }
              </button>

              <div class="security-guarantee-note font-mono">
                <span>🔒 256-BIT TLS • ZERO OVERSELL GUARANTEE • AUTOMATIC TIMEOUT ROLLBACK</span>
              </div>
            </div>
          } @else {
            <!-- Celebration Order Success Screen -->
            <div class="checkout-success-screen">
              <div class="success-halo-icon">
                <div class="check-mark-circle">✓</div>
              </div>

              <h2 class="font-display success-heading">Cinema Reservation Confirmed!</h2>
              <p class="success-tagline text-secondary">
                Seat <strong class="text-cyan">{{ getSeatNumber() }}</strong> is officially booked for
                <strong class="text-white">{{ getMovieTitle() }}</strong>.
              </p>

              <div class="confirmed-pass-card font-mono">
                <div class="pass-header-line">
                  <span class="pass-brand">AURA CINEMA // GATE PASS CONFIRMATION</span>
                  <span class="pass-status-badge">● CONFIRMED</span>
                </div>

                <div class="pass-grid-info">
                  <div class="grid-item">
                    <span class="grid-lbl">PASS ID:</span>
                    <span class="grid-val text-primary-light">{{ bookingStore.lastConfirmedBooking()?.id }}</span>
                  </div>
                  <div class="grid-item">
                    <span class="grid-lbl">SEAT NUMBER:</span>
                    <span class="grid-val text-cyan">{{ getSeatNumber() }} ({{ getSeatTier() }})</span>
                  </div>
                  <div class="grid-item">
                    <span class="grid-lbl">VENUE:</span>
                    <span class="grid-val">{{ getMovieVenue() }}</span>
                  </div>
                  <div class="grid-item">
                    <span class="grid-lbl">PAYMENT METHOD:</span>
                    <span class="grid-val text-emerald">{{ selectedPaymentMethod() }}</span>
                  </div>
                </div>

                <div class="qr-ready-notice">
                  <span>📱 Scannable Cinema Entry QR Pass is ready in your account.</span>
                </div>
              </div>

              <div class="success-actions-row">
                <a
                  routerLink="/my-tickets"
                  (click)="bookingStore.closeCheckoutModal()"
                  class="btn btn-primary font-display py-3"
                >
                  <span>🎟️ View Scannable Pass in My Tickets →</span>
                </a>
                <button
                  (click)="bookingStore.closeCheckoutModal()"
                  class="btn btn-secondary font-display py-3"
                >
                  Return to Seating Arena
                </button>
              </div>
            </div>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    .checkout-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(5, 7, 12, 0.88);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1200;
      padding: 1rem;
      animation: modal-fade 0.25s ease-out;
    }

    .checkout-modal-card {
      position: relative;
      width: 100%;
      max-width: 500px;
      max-height: calc(100vh - 2rem);
      overflow-y: auto;
      background: #0d111a;
      border: 1px solid rgba(229, 9, 20, 0.45);
      border-radius: 20px;
      box-shadow: 0 25px 70px rgba(0, 0, 0, 0.95), 0 0 50px rgba(229, 9, 20, 0.2);
      animation: card-pop 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }

    /* Top Progress Line */
    .ttl-progress-track {
      height: 3px;
      background: rgba(255, 255, 255, 0.08);
      width: 100%;
      overflow: hidden;
      position: sticky;
      top: 0;
      z-index: 10;

      .ttl-progress-bar {
        height: 100%;
        background: linear-gradient(90deg, #38bdf8 0%, #10b981 100%);
        transition: width 1s linear;

        &.urgent {
          background: linear-gradient(90deg, #ef4444 0%, #f59e0b 100%);
        }
      }
    }

    .checkout-close-btn {
      position: absolute;
      top: 0.9rem;
      right: 1rem;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: #94a3b8;
      width: 30px;
      height: 30px;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.95rem;
      transition: all 0.2s ease;
      z-index: 5;

      &:hover:not(:disabled) {
        background: rgba(229, 9, 20, 0.4);
        border-color: #ef4444;
        color: #ffffff;
      }
    }

    .checkout-modal-header {
      padding: 1rem 1.25rem 0.75rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      padding-right: 3.5rem;

      .header-status-left {
        display: flex;
        align-items: center;
        gap: 0.45rem;

        .status-tag {
          font-size: 0.65rem;
          color: #34d399;
          letter-spacing: 0.06em;
          font-weight: 700;
        }
      }

      .countdown-badge {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        background: rgba(245, 158, 11, 0.15);
        border: 1px solid rgba(245, 158, 11, 0.4);
        color: #fbbf24;
        font-size: 0.72rem;
        font-weight: 700;
        padding: 0.2rem 0.55rem;
        border-radius: 6px;

        .clock-icon {
          width: 13px;
          height: 13px;
        }

        &.urgent {
          background: rgba(239, 68, 68, 0.2);
          border-color: #ef4444;
          color: #fca5a5;
          animation: pulse-urgent 1s infinite alternate;
        }
      }
    }

    @keyframes pulse-urgent {
      from { transform: scale(1); box-shadow: 0 0 0 rgba(239, 68, 68, 0); }
      to { transform: scale(1.05); box-shadow: 0 0 12px rgba(239, 68, 68, 0.5); }
    }

    /* Movie Showcase Banner */
    .movie-showcase-card {
      margin: 1rem 1.25rem 0.85rem;
      border-radius: 12px;
      overflow: hidden;
      background: rgba(0, 0, 0, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.08);

      .movie-banner-box {
        height: 85px;
        position: relative;
        overflow: hidden;

        .movie-banner-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center 25%;
        }

        .banner-gradient-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(0, 0, 0, 0.2) 0%, rgba(13, 17, 26, 0.95) 100%);
        }

        .format-pill {
          position: absolute;
          top: 0.5rem;
          left: 0.65rem;
          background: rgba(0, 0, 0, 0.65);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(229, 9, 20, 0.4);
          color: #fca5a5;
          font-size: 0.6rem;
          font-weight: 700;
          padding: 0.15rem 0.45rem;
          border-radius: 4px;
        }
      }

      .movie-info-body {
        padding: 0.75rem 1rem 0.85rem;
        display: flex;
        flex-direction: column;
        gap: 0.35rem;

        .movie-title {
          font-size: 1.18rem;
          font-weight: 800;
          color: #ffffff;
          margin: 0;
          line-height: 1.25;
        }

        .movie-venue-line {
          font-size: 0.74rem;
          color: #94a3b8;
        }

        .seat-badge-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-top: 0.25rem;

          .seat-pill {
            background: rgba(56, 189, 248, 0.15);
            border: 1px solid rgba(56, 189, 248, 0.4);
            color: #38bdf8;
            font-size: 0.7rem;
            font-weight: 700;
            padding: 0.15rem 0.5rem;
            border-radius: 4px;
          }

          .tier-pill {
            font-size: 0.65rem;
            padding: 0.15rem 0.45rem;
            border-radius: 4px;
            font-weight: 600;
          }

          .lock-verified {
            font-size: 0.62rem;
            color: #10b981;
          }
        }
      }
    }

    /* Perforated Ticket Tear Line */
    .perforated-tear-line {
      position: relative;
      margin: 0.35rem 0;
      height: 14px;
      display: flex;
      align-items: center;

      .tear-notch {
        width: 16px;
        height: 16px;
        background: #05070c;
        border-radius: 50%;
        position: absolute;
        top: -1px;

        &.notch-left {
          left: -8px;
          box-shadow: inset -2px 0 4px rgba(229, 9, 20, 0.3);
        }

        &.notch-right {
          right: -8px;
          box-shadow: inset 2px 0 4px rgba(229, 9, 20, 0.3);
        }
      }

      .tear-dash {
        width: 100%;
        height: 2px;
        background-image: repeating-linear-gradient(
          90deg,
          rgba(255, 255, 255, 0.14) 0,
          rgba(255, 255, 255, 0.14) 8px,
          transparent 8px,
          transparent 16px
        );
      }
    }

    /* Order Summary Receipt Box */
    .order-receipt-box {
      margin: 0.5rem 1.25rem 1rem;
      background: rgba(0, 0, 0, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px;
      padding: 1rem 1.15rem;

      .receipt-header {
        font-size: 0.62rem;
        color: #64748b;
        letter-spacing: 0.08em;
        margin-bottom: 0.75rem;
      }

      .receipt-row {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 0.65rem;

        .item-meta {
          display: flex;
          flex-direction: column;
          gap: 0.1rem;

          .item-name {
            font-size: 0.82rem;
            color: #f1f5f9;
            font-weight: 500;
          }

          .item-sub {
            font-size: 0.68rem;
            color: #64748b;
          }
        }

        .item-price {
          font-size: 0.88rem;
          color: #ffffff;
        }
      }

      .receipt-divider {
        height: 1px;
        background: rgba(255, 255, 255, 0.08);
        margin: 0.75rem 0;
      }

      .receipt-total-row {
        display: flex;
        justify-content: space-between;
        align-items: center;

        .total-label-box {
          display: flex;
          flex-direction: column;

          .total-title {
            font-size: 1rem;
            font-weight: 800;
            color: #ffffff;
          }

          .total-sub {
            font-size: 0.62rem;
            color: #64748b;
          }
        }

        .total-value-box {
          font-size: 1.45rem;
          color: #34d399;
          text-shadow: 0 0 16px rgba(16, 185, 129, 0.4);
        }
      }
    }

    /* Payment Methods Section */
    .payment-section {
      margin: 0 1.25rem 1.25rem;

      .payment-title {
        display: block;
        font-size: 0.65rem;
        color: #94a3b8;
        letter-spacing: 0.08em;
        margin-bottom: 0.65rem;
      }

      .payment-options-grid {
        display: flex;
        flex-direction: column;
        gap: 0.55rem;
      }

      .payment-card {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.75rem 0.95rem;
        background: rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 10px;
        cursor: pointer;
        transition: all 0.2s ease;
        position: relative;

        input[type="radio"] {
          accent-color: #ef4444;
          width: 16px;
          height: 16px;
        }

        .card-icon-box {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.1rem;
          background: rgba(255, 255, 255, 0.06);

          &.bolt {
            background: rgba(245, 158, 11, 0.15);
            color: #fbbf24;
          }

          &.apple {
            background: #000000;
            color: #ffffff;
            border: 1px solid rgba(255, 255, 255, 0.2);

            .apple-svg {
              width: 16px;
              height: 16px;
            }
          }

          &.card {
            background: rgba(56, 189, 248, 0.15);
            color: #38bdf8;
          }
        }

        .card-content {
          display: flex;
          flex-direction: column;
          gap: 0.1rem;
          flex: 1;

          .card-name {
            font-size: 0.86rem;
            font-weight: 700;
            color: #ffffff;
          }

          .card-desc {
            font-size: 0.65rem;
            color: #64748b;
          }
        }

        .popular-tag {
          font-size: 0.58rem;
          font-weight: 700;
          color: #34d399;
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid rgba(16, 185, 129, 0.4);
          padding: 0.15rem 0.45rem;
          border-radius: 4px;
        }

        &:hover {
          background: rgba(229, 9, 20, 0.08);
          border-color: rgba(229, 9, 20, 0.35);
        }

        &.active {
          background: rgba(229, 9, 20, 0.12);
          border-color: rgba(229, 9, 20, 0.6);
          box-shadow: 0 0 16px rgba(229, 9, 20, 0.15);
        }
      }
    }

    /* Modal Footer */
    .checkout-footer {
      padding: 0 1.25rem 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.65rem;

      .btn-authorize-cinema {
        width: 100%;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.6rem;
        background: linear-gradient(135deg, #e50914 0%, #b91c1c 100%);
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: #ffffff;
        font-size: 1rem;
        font-weight: 800;
        padding: 0.95rem 1.5rem;
        border-radius: 10px;
        cursor: pointer;
        box-shadow: 0 8px 25px rgba(229, 9, 20, 0.45);
        transition: all 0.25s ease;

        &:hover:not(:disabled) {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          box-shadow: 0 10px 30px rgba(229, 9, 20, 0.65);
          transform: translateY(-2px);
        }

        &:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
      }

      .security-guarantee-note {
        font-size: 0.58rem;
        color: #64748b;
        text-align: center;
        letter-spacing: 0.04em;
      }
    }

    .checkout-spinner {
      width: 18px;
      height: 18px;
      border: 2.5px solid rgba(255, 255, 255, 0.3);
      border-top-color: #ffffff;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    /* Celebration Order Success Screen */
    .checkout-success-screen {
      padding: 2rem 1.5rem;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;

      .success-halo-icon {
        width: 72px;
        height: 72px;
        border-radius: 50%;
        background: linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(6, 182, 212, 0.2) 100%);
        border: 1px solid rgba(16, 185, 129, 0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 0 35px rgba(16, 185, 129, 0.45);
        margin-bottom: 1.25rem;
        animation: pop-scale 0.4s cubic-bezier(0.16, 1, 0.3, 1);

        .check-mark-circle {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: #10b981;
          color: #ffffff;
          font-size: 1.8rem;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
        }
      }

      .success-heading {
        font-size: 1.75rem;
        font-weight: 800;
        color: #ffffff;
        margin: 0 0 0.4rem;
      }

      .success-tagline {
        font-size: 0.88rem;
        line-height: 1.5;
        margin-bottom: 1.5rem;
      }

      .confirmed-pass-card {
        width: 100%;
        background: rgba(0, 0, 0, 0.5);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 12px;
        padding: 1rem 1.15rem;
        text-align: left;
        margin-bottom: 1.5rem;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;

        .pass-header-line {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.65rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          padding-bottom: 0.5rem;

          .pass-brand {
            color: #fca5a5;
            font-weight: 700;
          }

          .pass-status-badge {
            color: #34d399;
            font-weight: 700;
          }
        }

        .pass-grid-info {
          display: flex;
          flex-direction: column;
          gap: 0.45rem;
          font-size: 0.74rem;

          .grid-item {
            display: flex;
            justify-content: space-between;

            .grid-lbl {
              color: #64748b;
            }

            .grid-val {
              font-weight: 600;
            }
          }
        }

        .qr-ready-notice {
          font-size: 0.68rem;
          color: #38bdf8;
          text-align: center;
          border-top: 1px dashed rgba(255, 255, 255, 0.1);
          padding-top: 0.5rem;
        }
      }

      .success-actions-row {
        width: 100%;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }
    }

    @keyframes modal-fade {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes card-pop {
      from { transform: scale(0.92); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }

    @keyframes spin {
      100% { transform: rotate(360deg); }
    }
  `],
})
export class CheckoutModalComponent {
  readonly bookingStore = inject(BookingStore);
  private readonly authService = inject(AuthService);

  readonly event = input<EventItem | null>(null);

  readonly selectedPaymentMethod = signal<string>('DEMO_FAST_PAY');

  readonly basePrice = computed(() => this.bookingStore.selectedSeat()?.price || 24);
  readonly facilityFee = computed(() => 3.5);
  readonly techFee = computed(() => 1.5);
  readonly totalPrice = computed(() => this.basePrice() + this.facilityFee() + this.techFee());

  getMovieTitle(): string {
    return this.event()?.title || 'AURA Cinema Premiere Screening';
  }

  getMovieVenue(): string {
    return this.event()?.venue || "Director's Club VIP Lounge";
  }

  getMovieFormat(): string {
    const title = this.getMovieTitle().toLowerCase();
    if (title.includes('imax') || title.includes('70mm')) return 'IMAX 70MM LASER DOME';
    if (title.includes('dolby')) return 'DOLBY CINEMA 3D & ATMOS';
    if (title.includes('4dx')) return '4DX SENSORY & HAPTIC';
    if (title.includes('vip')) return 'DIRECTOR\'S CLUB VIP SUITE';
    return 'BLOCKBUSTER PREMIERE SCREENING';
  }

  getMovieBannerUrl(): string {
    if (this.event()?.imageUrl && this.event()!.imageUrl!.trim()) {
      return this.event()!.imageUrl!.trim();
    }
    const title = this.getMovieTitle().toLowerCase();
    if (title.includes('spider') || title.includes('verse')) {
      return 'https://images.unsplash.com/photo-1635805737707-575885ab0820?auto=format&fit=crop&w=1000&q=80';
    }
    if (title.includes('everything') || title.includes('multiverse')) {
      return 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1000&q=80';
    }
    if (title.includes('dune')) {
      return 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1000&q=80';
    }
    if (title.includes('matrix')) {
      return 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1000&q=80';
    }
    if (title.includes('furiosa') || title.includes('mad max')) {
      return 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1000&q=80';
    }
    if (title.includes('mission') || title.includes('reckoning')) {
      return 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1000&q=80';
    }
    return 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1000&q=80';
  }

  getSeatNumber(): string {
    return this.bookingStore.selectedSeat()?.seatNumber || 'VIP-1';
  }

  getSeatTier(): string {
    return this.bookingStore.selectedSeat()?.tier || 'VIP RECLINER';
  }

  onBannerError(event: any): void {
    event.target.src = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1000&q=80';
  }

  onBackdropClick(event: MouseEvent): void {
    if (!this.bookingStore.isCheckingOut()) {
      this.bookingStore.closeCheckoutModal();
    }
  }

  confirmCheckout(): void {
    const currentUserId = this.authService.currentUser()?.id || 'demo-user-uuid';
    this.bookingStore.checkout(this.selectedPaymentMethod(), currentUserId);
  }
}
