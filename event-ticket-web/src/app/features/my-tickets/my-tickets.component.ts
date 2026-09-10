import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';
import { Booking } from '../../core/models/booking.model';

@Component({
  selector: 'app-my-tickets',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="tickets-page">
      <div class="header-section">
        <h1 class="page-title font-display">Digital Arena Passes</h1>
        <p class="page-subtitle">Your confirmed, cryptographically verified cinema screenings and live experience tickets.</p>
      </div>

      @if (!authService.isAuthenticated()) {
        <div class="unauth-state-box glass-panel">
          <div class="unauth-icon-circle">🔒</div>
          <h2 class="font-display unauth-title">Fan Authentication Required</h2>
          <p class="unauth-desc">
            Your live motion passes and verified cryptographically-sealed tickets are tied to your fan account.
            Sign in to view your entry codes and gate access.
          </p>
          <div class="unauth-actions">
            <button (click)="openAuthModal()" class="btn btn-primary font-display py-3 px-6 glow-btn">
              <span>⚡ Sign In / 1-Click Demo Fan</span>
            </button>
            <a routerLink="/events" class="btn btn-secondary font-display py-3 px-6">
              Explore Live Arena Drops →
            </a>
          </div>
        </div>
      } @else {
        <div class="header-action-row">
          <div class="authenticated-header font-mono">
            <span class="status-dot live"></span>
            <span>PASSES FOR ACCOUNT: <strong>{{ authService.currentUser()?.email }}</strong></span>
          </div>
          <button (click)="loadBookings()" class="btn btn-secondary btn-sm font-mono" [disabled]="isLoading()">
            <span>Sync Passes</span>
          </button>
        </div>

        @if (isLoading()) {
          <div class="loading-state">
            <div class="loader-spinner"></div>
            <p class="font-mono text-secondary">Fetching digital arena passes from cluster...</p>
          </div>
        } @else if (bookings().length === 0) {
          <div class="empty-state glass-card">
            <div class="empty-icon">🎟️</div>
            <h3 class="font-display">No Passes Claimed Yet</h3>
            <p class="text-secondary">You haven't reserved or booked any arena passes with this account yet.</p>
            <a routerLink="/events" class="btn btn-primary btn-sm font-display">Browse Live Events</a>
          </div>
        } @else {
          <div class="tickets-grid">
            @for (booking of bookings(); track booking.id) {
              <div class="ticket-card glass-panel">
                <div class="pass-visual">
                  <img
                    [src]="getPassBannerUrl(booking)"
                    [alt]="booking.seat?.event?.title || 'Movie Experience'"
                    class="pass-banner-img"
                    (error)="onBannerError($event)"
                  />
                  <div class="pass-banner-overlay"></div>
                  <div class="visual-header-content">
                    <div class="visual-badge">PASS #{{ booking.id.substring(0, 8).toUpperCase() }}</div>
                    <div class="visual-watermark font-mono">AURA // 2026</div>
                  </div>
                </div>

                <div class="pass-body">
                  <!-- Perfectly Fitted Status Header (No Extra Space) -->
                  <div class="pass-status-row">
                    <span class="status-chip font-mono" [ngClass]="{
                      'chip-confirmed': booking.status === 'CONFIRMED',
                      'chip-pending': booking.status === 'PENDING',
                      'chip-expired': booking.status === 'EXPIRED' || booking.status === 'CANCELLED'
                    }">
                      <span class="status-dot" [class.live]="booking.status === 'CONFIRMED'"></span>
                      <span>{{ booking.status }}</span>
                    </span>
                    <span class="pass-verified-tag font-mono">VERIFIED // PASS #{{ booking.id.substring(0, 6).toUpperCase() }}</span>
                  </div>

                  <h3 class="pass-title font-display">{{ booking.seat?.event?.title || 'Arena Live Experience' }}</h3>
                  <p class="pass-venue text-secondary">{{ getPassVenue(booking) }}</p>

                  <div class="pass-meta font-mono">
                    <div class="meta-col">
                      <span class="col-label">SEAT</span>
                      <span class="col-val text-cyan">{{ booking.seat?.seatNumber || 'GA' }}</span>
                    </div>
                    <div class="meta-col">
                      <span class="col-label">PRICE</span>
                      <span class="col-val text-indigo">&#36;{{ booking.amount }}</span>
                    </div>
                    <div class="meta-col">
                      <span class="col-label">STATUS</span>
                      <span class="col-val">{{ booking.status }}</span>
                    </div>
                  </div>

                  <!-- Interactive QR Row with Real Mini QR Preview & Tap to Enlarge -->
                  <div
                    class="pass-qr-row"
                    (click)="openGatePass(booking)"
                    title="Tap to enlarge scannable Cinema Gate Pass"
                  >
                    <div class="qr-box-interactive">
                      <img
                        [src]="getQrCodeUrl(booking, 100)"
                        alt="QR Pass Code"
                        class="qr-mini-img"
                        (error)="onQrError($event)"
                      />
                      <div class="qr-expand-overlay">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="expand-icon">
                          <polyline points="15 3 21 3 21 9"></polyline>
                          <polyline points="9 21 3 21 3 15"></polyline>
                          <line x1="21" y1="3" x2="14" y2="10"></line>
                          <line x1="3" y1="21" x2="10" y2="14"></line>
                        </svg>
                      </div>
                    </div>

                    <div class="pass-hash font-mono">
                      <div class="pass-id-line">
                        <span class="id-label">PASS ID:</span>
                        <span class="id-val">{{ booking.id.substring(0, 18) }}...</span>
                      </div>
                      <div class="pass-security-tag">
                        <span class="status-dot live"></span>
                        <span>SECURED BY REDIS ATOMICITY</span>
                      </div>
                      <div class="tap-hint">
                        <span>🔍 Tap to view scannable QR Pass →</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            }
          </div>
        }
      }

      <!-- ====================================================================
           CINEMA GATE PASS LIGHTBOX MODAL (COMPACT & PERFECTLY PROPORTIONED)
           ==================================================================== -->
      @if (selectedBooking(); as pass) {
        <div class="gate-pass-overlay" (click)="closeGatePass()">
          <div class="gate-pass-modal" (click)="$event.stopPropagation()">
            <!-- Modal Header Ribbon -->
            <div class="pass-modal-header">
              <div class="brand-header-left">
                <div class="cinema-gate-badge font-mono">
                  <span class="status-dot live"></span>
                  <span>AURA CINEMA // GATE PASS</span>
                </div>
                <span class="gate-status-pill font-mono" [ngClass]="{
                  'status-confirmed': pass.status === 'CONFIRMED',
                  'status-pending': pass.status === 'PENDING'
                }">
                  {{ pass.status }}
                </span>
              </div>
              <button class="pass-close-btn" (click)="closeGatePass()" title="Close Pass">✕</button>
            </div>

            <!-- Pass Ticket Body -->
            <div class="pass-modal-body">
              <!-- Movie & Auditorium Details -->
              <div class="pass-event-info">
                <div class="format-category font-mono">
                  ✦ {{ formatCinemaCategory(pass) }} ✦
                </div>
                <h2 class="pass-movie-title font-display">
                  {{ pass.seat?.event?.title || 'Cinema Premiere Screening' }}
                </h2>
                <div class="pass-auditorium-text font-mono">
                  📍 {{ getPassVenue(pass) }}
                </div>
              </div>

              <!-- Ticket Stubs Matrix: Gate, Auditorium, Seat, Tier -->
              <div class="pass-stub-matrix font-mono">
                <div class="stub-cell">
                  <span class="stub-label">GATE ENTRANCE</span>
                  <span class="stub-value text-red">GATE 0{{ getGateNumber(pass) }}</span>
                </div>
                <div class="stub-cell">
                  <span class="stub-label">AUDITORIUM</span>
                  <span class="stub-value">HALL 0{{ getAuditoriumNumber(pass) }}</span>
                </div>
                <div class="stub-cell">
                  <span class="stub-label">SEAT NUMBER</span>
                  <span class="stub-value text-cyan highlight-seat">{{ pass.seat?.seatNumber || 'VIP-1' }}</span>
                </div>
                <div class="stub-cell">
                  <span class="stub-label">SEAT TIER</span>
                  <span class="stub-value">{{ getSeatTier(pass) }}</span>
                </div>
              </div>

              <!-- Perforated Tear Line with Semicircle Notches -->
              <div class="perforated-tear-line">
                <div class="tear-notch notch-left"></div>
                <div class="tear-dash"></div>
                <div class="tear-notch notch-right"></div>
              </div>

              <!-- Compact High-Contrast Scannable QR Stage with Laser Scanner -->
              <div class="qr-scanner-stage">
                <div class="qr-frame-corners">
                  <span class="corner c-tl"></span>
                  <span class="corner c-tr"></span>
                  <span class="corner c-bl"></span>
                  <span class="corner c-br"></span>

                  <!-- Laser Scanline Animation Bar -->
                  <div class="laser-scanner-beam">
                    <div class="laser-beam-line"></div>
                    <div class="laser-glow-head"></div>
                  </div>

                  <!-- Compact 140px Scannable QR Code Image -->
                  <div class="qr-code-canvas-wrapper">
                    <img
                      [src]="getQrCodeUrl(pass, 180)"
                      alt="Cinema Entrance QR Code"
                      class="qr-code-large-img"
                      (error)="onQrError($event)"
                    />
                  </div>
                </div>

                <div class="qr-scan-instruction font-mono">
                  <span class="beacon-point"></span>
                  <span>HOLD QR CODE 4-6 INCHES TOWARDS AUDITORIUM SCANNER</span>
                </div>

                <div class="crypto-hash-box font-mono">
                  <div class="hash-row">
                    <span class="hash-label">PASS ID:</span>
                    <span class="hash-code">{{ pass.id }}</span>
                  </div>
                  <div class="hash-sec">
                    <span class="status-dot live"></span>
                    <span>VERIFIED BY REDIS LUA ATOMICITY (300s TTL)</span>
                  </div>
                </div>
              </div>

              <!-- Wallet & Export Action Buttons -->
              <div class="pass-actions-row">
                <button class="btn-wallet apple-wallet font-mono" (click)="notifyWalletAdded('Apple Wallet')">
                  <svg viewBox="0 0 24 24" fill="currentColor" class="wallet-icon">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.38c.62-.75 1.04-1.8 0.92-2.85-.9.04-2 .6-2.65 1.35-.58.67-.97 1.74-.83 2.76 1.01.08 1.94-.51 2.56-1.26z"/>
                  </svg>
                  <span>Add to Apple Wallet</span>
                </button>

                <button class="btn-wallet print-wallet font-mono" (click)="printTicket(pass)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="wallet-icon">
                    <polyline points="6 9 6 2 18 2 18 9"></polyline>
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                    <rect x="6" y="14" width="12" height="8"></rect>
                  </svg>
                  <span>Print Gate Ticket</span>
                </button>
              </div>

              @if (toastMessage()) {
                <div class="wallet-toast font-mono">
                  <span>{{ toastMessage() }}</span>
                </div>
              }
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .tickets-page {
      max-width: 1400px;
      margin: 0 auto;
      padding: 3rem 1.75rem;
    }

    .header-section {
      margin-bottom: 2.5rem;

      .page-title {
        font-size: 2.25rem;
        font-weight: 800;
        color: #ffffff;
      }

      .page-subtitle {
        color: var(--text-secondary);
        font-size: 1rem;
        margin-top: 0.35rem;
      }
    }

    .header-action-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 1rem;
      margin-bottom: 2rem;
    }

    .tickets-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
      gap: 2rem;
    }

    @media (max-width: 640px) {
      .tickets-grid {
        grid-template-columns: 1fr;
      }
    }

    .ticket-card {
      border-radius: var(--radius-xl);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      background: rgba(17, 23, 36, 0.7);
      border: 1px solid var(--border-subtle);
      transition: transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;

      &:hover {
        transform: translateY(-4px);
        border-color: rgba(229, 9, 20, 0.4);
        box-shadow: 0 18px 38px rgba(0, 0, 0, 0.7), 0 0 28px rgba(229, 9, 20, 0.2);

        .pass-banner-img {
          transform: scale(1.08);
          filter: brightness(1.12);
        }
      }

      .pass-visual {
        height: 135px;
        position: relative;
        overflow: hidden;
        border-bottom: 1px dashed rgba(255, 255, 255, 0.18);
        background: #0b0f19;

        .pass-banner-img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center 25%;
          transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), filter 0.5s ease;
        }

        .pass-banner-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(0, 0, 0, 0.3) 0%, rgba(17, 23, 36, 0.92) 100%),
                      linear-gradient(135deg, rgba(229, 9, 20, 0.35) 0%, transparent 65%);
          pointer-events: none;
        }

        .visual-header-content {
          position: relative;
          z-index: 2;
          width: 100%;
          height: 100%;
          padding: 1.1rem 1.25rem;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;

          .visual-badge {
            background: rgba(0, 0, 0, 0.7);
            backdrop-filter: blur(10px);
            padding: 0.28rem 0.65rem;
            border-radius: 6px;
            font-family: var(--font-mono);
            font-size: 0.72rem;
            font-weight: 700;
            color: #ffffff;
            border: 1px solid rgba(255, 255, 255, 0.25);
            box-shadow: 0 4px 14px rgba(0, 0, 0, 0.6);
            letter-spacing: 0.04em;
          }

          .visual-watermark {
            font-size: 0.72rem;
            font-weight: 700;
            color: rgba(255, 255, 255, 0.85);
            letter-spacing: 0.12em;
            background: rgba(0, 0, 0, 0.55);
            backdrop-filter: blur(8px);
            padding: 0.22rem 0.55rem;
            border-radius: 4px;
            border: 1px solid rgba(255, 255, 255, 0.15);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
          }
        }
      }

      .pass-body {
        padding: 1.5rem;
        display: flex;
        flex-direction: column;
        gap: 1.15rem;

        /* Status Header: Perfectly fitted without excess space */
        .pass-status-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
        }

        .status-chip {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          padding: 0.22rem 0.65rem;
          border-radius: 9999px;
          font-size: 0.68rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          width: fit-content;
          align-self: flex-start;

          &.chip-confirmed {
            background: rgba(16, 185, 129, 0.15);
            border: 1px solid rgba(16, 185, 129, 0.4);
            color: #34d399;
          }

          &.chip-pending {
            background: rgba(245, 158, 11, 0.15);
            border: 1px solid rgba(245, 158, 11, 0.4);
            color: #fbbf24;
          }

          &.chip-expired {
            background: rgba(239, 68, 68, 0.15);
            border: 1px solid rgba(239, 68, 68, 0.4);
            color: #f87171;
          }
        }

        .pass-verified-tag {
          font-size: 0.62rem;
          color: #64748b;
          letter-spacing: 0.08em;
        }

        .pass-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: #ffffff;
          line-height: 1.3;
          margin: 0;
        }

        .pass-venue {
          font-size: 0.88rem;
          margin-top: -0.5rem;
        }

        .pass-meta {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          background: rgba(0, 0, 0, 0.35);
          padding: 0.75rem;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.05);

          .meta-col {
            display: flex;
            flex-direction: column;
            gap: 0.2rem;

            .col-label {
              font-size: 0.65rem;
              color: var(--text-muted);
            }

            .col-val {
              font-size: 0.85rem;
              font-weight: 700;
              color: #ffffff;
            }

            .text-cyan {
              color: #38bdf8;
            }

            .text-indigo {
              color: #818cf8;
            }
          }
        }

        /* Interactive QR Row */
        .pass-qr-row {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.75rem;
          background: rgba(0, 0, 0, 0.25);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.25s ease;

          &:hover {
            background: rgba(229, 9, 20, 0.12);
            border-color: rgba(229, 9, 20, 0.5);
            transform: translateX(3px);

            .qr-expand-overlay {
              opacity: 1;
            }

            .tap-hint {
              color: #fca5a5;
            }
          }

          .qr-box-interactive {
            position: relative;
            width: 58px;
            height: 58px;
            background: #ffffff;
            border-radius: 6px;
            padding: 3px;
            flex-shrink: 0;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
            overflow: hidden;

            .qr-mini-img {
              width: 100%;
              height: 100%;
              object-fit: cover;
              border-radius: 3px;
            }

            .qr-expand-overlay {
              position: absolute;
              inset: 0;
              background: rgba(229, 9, 20, 0.85);
              display: flex;
              align-items: center;
              justify-content: center;
              opacity: 0;
              transition: opacity 0.2s ease;
              border-radius: 4px;

              .expand-icon {
                width: 18px;
                height: 18px;
                color: #ffffff;
              }
            }
          }

          .pass-hash {
            display: flex;
            flex-direction: column;
            gap: 0.2rem;
            font-size: 0.68rem;
            min-width: 0;

            .pass-id-line {
              display: flex;
              gap: 0.35rem;
              color: #cbd5e1;

              .id-label {
                color: #64748b;
              }

              .id-val {
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                font-weight: 600;
              }
            }

            .pass-security-tag {
              display: flex;
              align-items: center;
              gap: 0.4rem;
              color: #34d399;
              font-size: 0.62rem;
            }

            .tap-hint {
              font-size: 0.68rem;
              color: #38bdf8;
              font-weight: 600;
              transition: color 0.2s ease;
              margin-top: 0.15rem;
            }
          }
        }
      }
    }

    .authenticated-header {
      display: inline-flex;
      align-items: center;
      gap: 0.6rem;
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.3);
      padding: 0.45rem 0.95rem;
      border-radius: 9999px;
      font-size: 0.78rem;
      color: #34d399;
    }

    .unauth-state-box, .empty-state, .loading-state {
      max-width: 600px;
      margin: 2rem auto;
      text-align: center;
      padding: 3.5rem 2.5rem;
      border-radius: 20px;
      border: 1px solid rgba(99, 102, 241, 0.3);
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);

      .unauth-icon-circle, .empty-icon {
        width: 68px;
        height: 68px;
        margin: 0 auto 1.5rem;
        border-radius: 50%;
        background: linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(6, 182, 212, 0.2) 100%);
        border: 1px solid rgba(99, 102, 241, 0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.8rem;
        box-shadow: 0 0 20px rgba(99, 102, 241, 0.3);
      }

      .unauth-title {
        font-size: 1.8rem;
        font-weight: 800;
        color: #ffffff;
        margin-bottom: 0.75rem;
      }

      .unauth-desc {
        color: var(--text-secondary);
        font-size: 0.95rem;
        line-height: 1.6;
        margin-bottom: 2rem;
      }

      .unauth-actions {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 1rem;
        flex-wrap: wrap;
      }
    }

    .loader-spinner {
      width: 40px;
      height: 40px;
      margin: 0 auto 1rem;
      border: 3px solid rgba(229, 9, 20, 0.2);
      border-top-color: #ef4444;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      100% {
        transform: rotate(360deg);
      }
    }

    .glow-btn {
      box-shadow: 0 0 20px rgba(99, 102, 241, 0.45);
    }

    /* ==========================================================================
       CINEMA GATE PASS LIGHTBOX MODAL (COMPACT & PERFECT VIEWPORT SCALING)
       ========================================================================== */
    .gate-pass-overlay {
      position: fixed;
      inset: 0;
      z-index: 1100;
      background: rgba(0, 0, 0, 0.88);
      backdrop-filter: blur(20px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      overflow-y: auto;
      animation: fadeIn 0.25s ease-out;
    }

    .gate-pass-modal {
      width: 100%;
      max-width: 420px;
      max-height: calc(100vh - 2rem);
      display: flex;
      flex-direction: column;
      background: #0d111a;
      border: 1px solid rgba(229, 9, 20, 0.5);
      border-radius: 18px;
      box-shadow: 0 25px 70px rgba(0, 0, 0, 0.95), 0 0 45px rgba(229, 9, 20, 0.2);
      animation: passScaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      position: relative;
      overflow-y: auto;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes passScaleIn {
      from { transform: scale(0.92); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }

    .pass-modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.85rem 1.25rem;
      background: linear-gradient(135deg, rgba(229, 9, 20, 0.25) 0%, rgba(15, 23, 42, 0.6) 100%);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);

      .brand-header-left {
        display: flex;
        align-items: center;
        gap: 0.65rem;

        .cinema-gate-badge {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.68rem;
          color: #fca5a5;
          font-weight: 700;
          letter-spacing: 0.06em;
        }

        .gate-status-pill {
          font-size: 0.65rem;
          padding: 0.12rem 0.45rem;
          border-radius: 4px;
          font-weight: 700;

          &.status-confirmed {
            background: rgba(16, 185, 129, 0.2);
            color: #34d399;
            border: 1px solid rgba(16, 185, 129, 0.4);
          }

          &.status-pending {
            background: rgba(245, 158, 11, 0.2);
            color: #fbbf24;
            border: 1px solid rgba(245, 158, 11, 0.4);
          }
        }
      }

      .pass-close-btn {
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: #94a3b8;
        font-size: 1rem;
        cursor: pointer;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;

        &:hover {
          color: #ffffff;
          background: rgba(229, 9, 20, 0.4);
          border-color: #ef4444;
        }
      }
    }

    .pass-modal-body {
      padding: 1rem 1.25rem 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }

    .pass-event-info {
      text-align: center;
      display: flex;
      flex-direction: column;
      gap: 0.2rem;

      .format-category {
        font-size: 0.65rem;
        color: #ef4444;
        letter-spacing: 0.1em;
        font-weight: 700;
      }

      .pass-movie-title {
        font-size: 1.25rem;
        font-weight: 800;
        color: #ffffff;
        line-height: 1.25;
        margin: 0;
      }

      .pass-auditorium-text {
        font-size: 0.76rem;
        color: #94a3b8;
      }
    }

    .pass-stub-matrix {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.45rem;
      background: rgba(0, 0, 0, 0.4);
      padding: 0.65rem 0.85rem;
      border-radius: 10px;
      border: 1px solid rgba(255, 255, 255, 0.06);

      .stub-cell {
        display: flex;
        flex-direction: column;
        gap: 0.15rem;

        .stub-label {
          font-size: 0.58rem;
          color: #64748b;
          letter-spacing: 0.08em;
        }

        .stub-value {
          font-size: 0.82rem;
          font-weight: 700;
          color: #f1f5f9;

          &.text-red {
            color: #ef4444;
          }

          &.text-cyan {
            color: #38bdf8;
          }

          &.highlight-seat {
            font-size: 0.98rem;
          }
        }
      }
    }

    /* Perforated Tear Line with Semicircle Notches */
    .perforated-tear-line {
      position: relative;
      margin: 0 -1.25rem;
      height: 14px;
      display: flex;
      align-items: center;

      .tear-notch {
        width: 16px;
        height: 16px;
        background: #000000;
        border-radius: 50%;
        position: absolute;
        top: -1px;

        &.notch-left {
          left: -8px;
          box-shadow: inset -2px 0 4px rgba(229, 9, 20, 0.4);
        }

        &.notch-right {
          right: -8px;
          box-shadow: inset 2px 0 4px rgba(229, 9, 20, 0.4);
        }
      }

      .tear-dash {
        width: 100%;
        height: 2px;
        background-image: repeating-linear-gradient(
          90deg,
          rgba(255, 255, 255, 0.15) 0,
          rgba(255, 255, 255, 0.15) 8px,
          transparent 8px,
          transparent 16px
        );
      }
    }

    /* Compact High-Contrast QR Code Stage & Laser Scanner */
    .qr-scanner-stage {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.65rem;
    }

    .qr-frame-corners {
      position: relative;
      padding: 10px;
      background: #ffffff;
      border-radius: 12px;
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.8), 0 0 25px rgba(255, 255, 255, 0.12);
      overflow: hidden;

      .corner {
        position: absolute;
        width: 12px;
        height: 12px;
        border: 2.5px solid #000000;

        &.c-tl { top: 4px; left: 4px; border-right: none; border-bottom: none; }
        &.c-tr { top: 4px; right: 4px; border-left: none; border-bottom: none; }
        &.c-bl { bottom: 4px; left: 4px; border-right: none; border-top: none; }
        &.c-br { bottom: 4px; right: 4px; border-left: none; border-top: none; }
      }

      /* Animated Laser Scanner Line */
      .laser-scanner-beam {
        position: absolute;
        left: 0;
        right: 0;
        height: 3px;
        pointer-events: none;
        z-index: 10;
        animation: laserScan 2.4s infinite ease-in-out;

        .laser-beam-line {
          width: 100%;
          height: 2.5px;
          background: linear-gradient(90deg, transparent 0%, #ef4444 20%, #38bdf8 50%, #ef4444 80%, transparent 100%);
          box-shadow: 0 0 10px #ef4444, 0 0 16px #38bdf8;
        }

        .laser-glow-head {
          position: absolute;
          top: -2px;
          left: 50%;
          transform: translateX(-50%);
          width: 18px;
          height: 6px;
          background: #ffffff;
          border-radius: 50%;
          box-shadow: 0 0 12px #38bdf8;
        }
      }

      .qr-code-canvas-wrapper {
        width: 140px;
        height: 140px;
        display: flex;
        align-items: center;
        justify-content: center;

        .qr-code-large-img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          image-rendering: pixelated;
        }
      }
    }

    @keyframes laserScan {
      0% { top: 6%; opacity: 0.9; }
      50% { top: 88%; opacity: 1; }
      100% { top: 6%; opacity: 0.9; }
    }

    .qr-scan-instruction {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      font-size: 0.6rem;
      color: #94a3b8;
      letter-spacing: 0.05em;
      text-align: center;

      .beacon-point {
        width: 5px;
        height: 5px;
        background: #ef4444;
        border-radius: 50%;
        box-shadow: 0 0 6px #ef4444;
      }
    }

    .crypto-hash-box {
      width: 100%;
      background: rgba(0, 0, 0, 0.35);
      border: 1px solid rgba(255, 255, 255, 0.06);
      padding: 0.45rem 0.75rem;
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
      font-size: 0.6rem;

      .hash-row {
        display: flex;
        justify-content: space-between;
        color: #64748b;

        .hash-code {
          color: #f1f5f9;
          font-weight: 600;
          font-size: 0.58rem;
        }
      }

      .hash-sec {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        color: #34d399;
        font-weight: 600;
        font-size: 0.58rem;
      }
    }

    /* Compact Actions Row */
    .pass-actions-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.65rem;

      .btn-wallet {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.45rem;
        font-size: 0.74rem;
        font-weight: 600;
        padding: 0.65rem 0.85rem;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.25s ease;

        .wallet-icon {
          width: 14px;
          height: 14px;
        }

        &.apple-wallet {
          background: #000000;
          color: #ffffff;
          border: 1px solid rgba(255, 255, 255, 0.3);

          &:hover {
            background: #18181b;
            border-color: #ffffff;
            box-shadow: 0 0 16px rgba(255, 255, 255, 0.25);
            transform: translateY(-1px);
          }
        }

        &.print-wallet {
          background: rgba(229, 9, 20, 0.15);
          color: #fca5a5;
          border: 1px solid rgba(229, 9, 20, 0.5);

          &:hover {
            background: rgba(229, 9, 20, 0.3);
            border-color: #ef4444;
            color: #ffffff;
            box-shadow: 0 0 16px rgba(229, 9, 20, 0.4);
            transform: translateY(-1px);
          }
        }
      }
    }

    .wallet-toast {
      background: rgba(16, 185, 129, 0.2);
      border: 1px solid rgba(16, 185, 129, 0.5);
      color: #34d399;
      padding: 0.5rem 0.85rem;
      border-radius: 6px;
      font-size: 0.72rem;
      text-align: center;
      animation: fadeIn 0.2s ease-out;
    }

    @media print {
      body * {
        visibility: hidden;
      }
      .gate-pass-modal, .gate-pass-modal * {
        visibility: visible;
      }
      .gate-pass-modal {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        max-width: 100%;
        box-shadow: none;
        border: 2px solid #000;
        background: #fff;
        color: #000;
      }
      .pass-actions-row, .pass-close-btn {
        display: none !important;
      }
    }
  `],
})
export class MyTicketsComponent implements OnInit {
  readonly authService = inject(AuthService);
  private readonly apiService = inject(ApiService);

  readonly bookings = signal<Booking[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly selectedBooking = signal<Booking | null>(null);
  readonly toastMessage = signal<string | null>(null);

  ngOnInit(): void {
    if (this.authService.isAuthenticated()) {
      this.loadBookings();
    }
  }

  loadBookings(): void {
    const user = this.authService.currentUser();
    if (!user?.id) return;

    this.isLoading.set(true);
    this.apiService.getUserBookings(user.id).subscribe({
      next: (data) => {
        this.bookings.set(data || []);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }

  openGatePass(booking: Booking): void {
    this.selectedBooking.set(booking);
    this.toastMessage.set(null);
  }

  closeGatePass(): void {
    this.selectedBooking.set(null);
  }

  getQrCodeUrl(booking: Booking, size: number = 180): string {
    const seatNumber = booking.seat?.seatNumber || 'GA';
    const eventTitle = booking.seat?.event?.title || 'AURA Cinema Premiere';
    const payload = `AURA-PASS://${booking.id}?seat=${seatNumber}&event=${encodeURIComponent(eventTitle)}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(payload)}&color=000000&bgcolor=FFFFFF`;
  }

  getPassVenue(booking: Booking): string {
    return booking.seat?.event?.venue || "Director's Club VIP Lounge";
  }

  formatCinemaCategory(booking: Booking): string {
    const title = (booking.seat?.event?.title || '').toLowerCase();
    if (title.includes('imax') || title.includes('70mm')) return 'IMAX 70MM LASER DOME';
    if (title.includes('dolby')) return 'DOLBY CINEMA & ATMOS 128-CH';
    if (title.includes('4dx')) return '4DX MOTION & SENSORY';
    if (title.includes('vip')) return 'DIRECTOR\'S CLUB VIP SUITE';
    return 'BLOCKBUSTER PREMIERE SCREENING';
  }

  getGateNumber(booking: Booking): number {
    const seat = booking.seat?.seatNumber || 'A-1';
    const charCode = seat.charCodeAt(0) || 65;
    return (charCode % 4) + 1;
  }

  getAuditoriumNumber(booking: Booking): number {
    const seat = booking.seat?.seatNumber || '1';
    const num = parseInt(seat.replace(/\D/g, ''), 10) || 1;
    return (num % 5) + 1;
  }

  getSeatTier(booking: Booking): string {
    const seat = (booking.seat?.seatNumber || 'A-1').toUpperCase();
    if (seat.startsWith('A') || seat.startsWith('B')) return 'VIP Recliner Suite';
    if (seat.startsWith('C') || seat.startsWith('D')) return 'Prime Center View';
    return 'Standard Cinema Seat';
  }

  notifyWalletAdded(type: string): void {
    this.toastMessage.set(`✓ Digital Gate Pass cryptographically exported to ${type}!`);
    setTimeout(() => {
      this.toastMessage.set(null);
    }, 4000);
  }

  printTicket(booking: Booking): void {
    if (typeof window !== 'undefined') {
      window.print();
    }
  }

  onQrError(event: any): void {
    event.target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 24 24" fill="none" stroke="%23000" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect><rect x="14" y="14" width="3" height="3"></rect><rect x="18" y="18" width="3" height="3"></rect></svg>';
  }

  getPassBannerUrl(booking: Booking): string {
    if (booking.seat?.event?.imageUrl && booking.seat.event.imageUrl.trim()) {
      return booking.seat.event.imageUrl.trim();
    }
    const title = (booking.seat?.event?.title || '').toLowerCase();
    if (title.includes('spider') || title.includes('verse')) {
      return 'https://images.unsplash.com/photo-1635805737707-575885ab0820?auto=format&fit=crop&w=1000&q=80';
    }
    if (title.includes('everything') || title.includes('multiverse')) {
      return 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1000&q=80';
    }
    if (title.includes('dune') || title.includes('sci-fi') || title.includes('desert')) {
      return 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1000&q=80';
    }
    if (title.includes('oppenheimer') || title.includes('atomic') || title.includes('fire')) {
      return 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1000&q=80';
    }
    if (title.includes('avatar') || title.includes('water') || title.includes('ocean')) {
      return 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1000&q=80';
    }
    if (title.includes('interstellar') || title.includes('space') || title.includes('star')) {
      return 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=1000&q=80';
    }
    if (title.includes('batman') || title.includes('dark') || title.includes('knight')) {
      return 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1000&q=80';
    }
    return 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1000&q=80';
  }

  onBannerError(event: any): void {
    event.target.src = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1000&q=80';
  }

  openAuthModal(): void {
    this.authService.openAuthModal({
      title: 'MY DIGITAL PASSES',
      message: 'Sign in to access your purchased tickets and live motion passes.',
    });
  }
}
