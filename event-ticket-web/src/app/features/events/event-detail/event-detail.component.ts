import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { SocketService } from '../../../core/services/socket.service';
import { AuthService } from '../../../core/services/auth.service';
import { BookingStore } from '../../../core/state/booking.store';
import { EventItem } from '../../../core/models/event.model';
import { SeatMapComponent } from '../components/seat-map/seat-map.component';
import { CountdownDrawerComponent } from '../components/countdown-drawer/countdown-drawer.component';
import { CheckoutModalComponent } from '../components/checkout-modal/checkout-modal.component';
import { ConflictToastComponent } from '../../../shared/components/conflict-toast/conflict-toast.component';
import { SeatSocketEvent } from '../../../core/models/socket-events.model';
import { Seat } from '../../../core/models/seat.model';

@Component({
  selector: 'app-event-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    SeatMapComponent,
    CountdownDrawerComponent,
    CheckoutModalComponent,
    ConflictToastComponent,
  ],
  template: `
    <!-- Top-Right Concurrency Conflict Toast -->
    <app-conflict-toast />

    <div class="event-detail-page">
      <!-- Breadcrumbs -->
      <div class="header-nav">
        <a routerLink="/events" class="back-link">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          <span>Back to Live Drops</span>
        </a>
      </div>

      <!-- Atmospheric Event Hero / Stage Banner -->
      <div class="event-hero glass-panel">
        <div class="hero-stage-backdrop">
          <img
            [src]="getHeroImageUrl()"
            [alt]="event()?.title || 'Arena Stage'"
            class="hero-backdrop-img"
          />
          <div class="hero-stage-scrim"></div>
          <div class="hero-stage-glow"></div>
        </div>

        <div class="hero-left">
          <div class="badge-stack">
            <span class="badge badge-emerald">
              <span class="status-dot live"></span>
              <span>ARENA REALTIME ACTIVE</span>
            </span>
            <span class="badge badge-indigo font-mono">
              {{ formatCategory() }}
            </span>
          </div>

          <h1 class="event-title font-display">{{ event()?.title || 'Arena Live Drop' }}</h1>

          <p class="event-description-hero">
            {{ event()?.description || 'High-energy live experience with Redis distributed lock concurrency protection.' }}
          </p>

          <p class="event-meta">
            <span class="meta-item">
              <svg class="meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
              <span><strong>Venue:</strong> {{ event()?.venue || 'Cyber Arena, Neo Tokyo' }}</span>
            </span>
            <span class="meta-divider">•</span>
            <span class="meta-item font-mono">
              <svg class="meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              <span>{{ event()?.eventDate | date:'medium' }}</span>
            </span>
          </p>
        </div>

        <div class="hero-right">
          <!-- Real-Time Metrics Badges -->
          <div class="metrics-row">
            <div class="metric-badge available font-mono">
              <span class="metric-num">{{ bookingStore.availableSeatsCount() }}</span>
              <span class="metric-name">AVAILABLE</span>
            </div>
            <div class="metric-badge held font-mono">
              <span class="metric-num">{{ bookingStore.heldSeatsCount() }}</span>
              <span class="metric-name">LOCKED (5M)</span>
            </div>
            <div class="metric-badge booked font-mono">
              <span class="metric-num">{{ bookingStore.bookedSeatsCount() }}</span>
              <span class="metric-name">BOOKED</span>
            </div>
          </div>
          <div class="room-pill font-mono" title="Redis Pub/Sub Channel: event:{{ eventId }}">
            <span class="status-dot live"></span>
            <span>CLUSTER SYNCED // EDGE AP-SG</span>
          </div>
        </div>
      </div>

      <!-- Arena Layout (SVG Map + Real-time Sidebar) -->
      <div class="arena-layout">
        <!-- Main Interactive SVG Amphitheater Map -->
        <div class="seating-container glass-card">
          <app-seat-map
            [seats]="bookingStore.seats()"
            [selectedSeat]="bookingStore.selectedSeat()"
            (seatSelected)="bookingStore.selectSeat($event)"
            (seatHovered)="hoveredSeat.set($event)"
          />
        </div>

        <!-- Sidebar: Active Selection & Real-Time Telemetry Stream -->
        <div class="sidebar-container">
          <!-- Selection & Hold Card -->
          <div class="action-card glass-panel">
            <div class="card-header">
              <h3 class="card-title font-display">Seat Reservation</h3>
              <span class="badge badge-indigo">REDIS ATOMIC</span>
            </div>

            @if (activeInspectedSeat(); as s) {
              <div class="selection-details">
                <div class="seat-badge-banner">
                  <div>
                    <div class="seat-code font-display">Seat {{ s.seatNumber }}</div>
                    <span
                      class="text-xs font-mono font-semibold"
                      [class.text-amber]="hoveredSeat() && hoveredSeat()?.id !== bookingStore.selectedSeat()?.id"
                      [class.text-emerald]="bookingStore.selectedSeat()?.id === s.id"
                    >
                      {{ hoveredSeat() && hoveredSeat()?.id !== bookingStore.selectedSeat()?.id ? '● LIVE HOVER PREVIEW' : '● SELECTED SEAT' }}
                    </span>
                  </div>
                  <span
                    class="badge"
                    [class.badge-indigo]="s.tier === 'VIP'"
                    [class.badge-primary]="s.tier === 'PLATINUM'"
                    [class.badge-emerald]="s.tier === 'STANDARD'"
                  >
                    {{ s.tier || 'VIP FRONT' }} ACCESS
                  </span>
                </div>

                <div class="specs-grid font-mono text-xs mt-3">
                  <div class="spec-item">
                    <span class="text-muted block">SIGHTLINE</span>
                    <span class="text-emerald font-bold">{{ s.tier === 'VIP' ? '100%' : s.tier === 'PLATINUM' ? '98%' : '94%' }} DIRECT</span>
                  </div>
                  <div class="spec-item">
                    <span class="text-muted block">AUDIO ZONE</span>
                    <span class="text-white font-bold">ATMOS 360°</span>
                  </div>
                  <div class="spec-item">
                    <span class="text-muted block">GATE ACCESS</span>
                    <span class="text-primary-light font-bold">GATE A // VIP</span>
                  </div>
                </div>

                <div class="price-row mt-4">
                  <span class="text-secondary text-sm">Lock Price:</span>
                  <span class="font-mono text-emerald font-bold text-2xl">{{ s.price | currency }}</span>
                </div>

                @if (bookingStore.selectedSeat()?.id === s.id) {
                  @if (!bookingStore.hasActiveHold()) {
                    <button
                      (click)="handleAcquireHold()"
                      class="btn btn-primary w-full mt-3 font-display py-3"
                      [disabled]="bookingStore.isHolding()"
                    >
                      @if (bookingStore.isHolding()) {
                        <span>Acquiring Atomic Lock...</span>
                      } @else {
                        <span>🔒 Lock & Hold Seat (5 Mins)</span>
                      }
                    </button>
                  } @else {
                    <div class="hold-active-note mt-3">
                      <span class="status-dot holding"></span>
                      <span class="font-mono text-amber text-xs font-semibold">
                        LOCK ACTIVE ({{ bookingStore.formattedCountdown() }})
                      </span>
                    </div>
                    <button
                      (click)="bookingStore.openCheckoutModal()"
                      class="btn btn-primary w-full mt-2 font-display py-3"
                    >
                      Proceed to Checkout →
                    </button>
                  }
                } @else {
                  <button
                    (click)="bookingStore.selectSeat(s)"
                    class="btn btn-secondary w-full mt-3 font-display py-3"
                  >
                    Select Seat {{ s.seatNumber }} to Reserve →
                  </button>
                }
              </div>
            } @else {
              <!-- Rich Unselected State: Arena Intelligence & Specs -->
              <div class="unselected-inspector">
                <div class="arena-intelligence-box">
                  <div class="section-badge font-mono text-xs">ARENA INTELLIGENCE & SIGHTLINES</div>
                  <h4 class="font-display text-white text-base mt-2 mb-1">Select an Armchair on the Map</h4>
                  <p class="text-secondary text-xs leading-relaxed">
                    Click any highlighted stadium chair to inspect pricing, acoustic sightlines, and acquire an exclusive 5-minute atomic lock.
                  </p>

                  <div class="arena-perks-list mt-3 font-mono text-xs">
                    <div class="perk-row">
                      <span class="perk-icon">🎧</span>
                      <span>Dolby Atmos 360° Certified Audio</span>
                    </div>
                    <div class="perk-row">
                      <span class="perk-icon">👁️</span>
                      <span>100% Unobstructed Line of Sight</span>
                    </div>
                    <div class="perk-row">
                      <span class="perk-icon">⚡</span>
                      <span>Zero-Latency Concurrency Protection</span>
                    </div>
                  </div>

                  <button
                    (click)="handleAutoPickBestSeat()"
                    class="btn btn-secondary w-full mt-4 font-mono text-xs py-2.5 flex items-center justify-center gap-2"
                  >
                    <span>⚡ Auto-Select Best Available Seat</span>
                  </button>
                </div>
              </div>
            }
          </div>

          <!-- Real-Time Telemetry Logs Terminal -->
          <div class="telemetry-card glass-card">
            <div class="telemetry-header">
              <span class="status-dot live"></span>
              <h4 class="telemetry-title font-mono">LIVE CLUSTER LOGS</h4>
              <span class="log-count font-mono text-muted text-xs">({{ realtimeLogs().length }})</span>
            </div>
            <div class="telemetry-logs font-mono">
              @if (realtimeLogs().length === 0) {
                <div class="log-empty text-muted">Listening for cluster Redis Pub/Sub events...</div>
              } @else {
                @for (log of realtimeLogs(); track log.id) {
                  <div
                    class="log-entry"
                    [class.log-held]="log.type === 'SEAT_HELD'"
                    [class.log-released]="log.type === 'SEAT_RELEASED'"
                    [class.log-booked]="log.type === 'SEAT_BOOKED'"
                  >
                    <span class="log-time">{{ log.time }}</span>
                    <span class="log-badge">{{ log.type }}</span>
                    <span class="log-msg">{{ log.message }}</span>
                  </div>
                }
              }
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Floating 5-Minute Countdown Drawer -->
    <app-countdown-drawer />

    <!-- Checkout Modal -->
    <app-checkout-modal [event]="event()" />
  `,
  styles: [`
    .event-detail-page {
      max-width: 1400px;
      margin: 0 auto;
      padding: 2rem 1.75rem 6rem;
    }

    .header-nav {
      margin-bottom: 1.5rem;

      .back-link {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        color: var(--text-secondary);
        text-decoration: none;
        font-size: 0.9rem;
        font-weight: 500;
        transition: color 0.2s ease;

        svg {
          width: 16px;
          height: 16px;
        }

        &:hover {
          color: #ffffff;
        }
      }
    }

    .event-hero {
      position: relative;
      overflow: hidden;
      padding: 2.25rem 2.5rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 2rem;
      margin-bottom: 2.25rem;
      border: 1px solid rgba(99, 102, 241, 0.35);
      border-radius: 20px;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6), 0 0 35px rgba(99, 102, 241, 0.15);

      .hero-stage-backdrop {
        position: absolute;
        inset: 0;
        z-index: 0;
        pointer-events: none;

        .hero-backdrop-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          opacity: 0.22;
          filter: blur(2px);
          transform: scale(1.05);
        }

        .hero-stage-scrim {
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, rgba(8, 11, 20, 0.96) 0%, rgba(14, 19, 32, 0.84) 50%, rgba(8, 11, 20, 0.96) 100%);
        }

        .hero-stage-glow {
          position: absolute;
          top: -50%;
          left: 15%;
          width: 550px;
          height: 350px;
          background: radial-gradient(circle, rgba(99, 102, 241, 0.3) 0%, transparent 70%);
          filter: blur(45px);
        }
      }

      .hero-left {
        position: relative;
        z-index: 1;
        max-width: 650px;

        .badge-stack {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          margin-bottom: 0.75rem;
        }

        .event-title {
          font-size: 2.2rem;
          font-weight: 800;
          color: #ffffff;
          line-height: 1.15;
          margin-bottom: 0.5rem;
        }

        .event-description-hero {
          font-size: 0.92rem;
          color: var(--text-secondary);
          line-height: 1.5;
          margin-bottom: 0.85rem;
        }

        .event-meta {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 0.86rem;
          color: var(--text-muted);

          .meta-item {
            display: inline-flex;
            align-items: center;
            gap: 0.4rem;

            .meta-icon {
              width: 15px;
              height: 15px;
              color: var(--primary-light);
            }
          }

          .meta-divider {
            color: var(--text-muted);
          }
        }
      }

      .hero-right {
        position: relative;
        z-index: 1;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 0.85rem;

        .metrics-row {
          display: flex;
          align-items: center;
          gap: 0.75rem;

          .metric-badge {
            background: rgba(255, 255, 255, 0.04);
            border: 1px solid var(--border-subtle);
            border-radius: 8px;
            padding: 0.35rem 0.65rem;
            display: flex;
            align-items: center;
            gap: 0.45rem;
            font-size: 0.75rem;

            .metric-num {
              font-weight: 800;
              font-size: 0.9rem;
            }

            &.available { color: #34d399; border-color: rgba(16, 185, 129, 0.25); }
            &.held { color: #fbbf24; border-color: rgba(245, 158, 11, 0.25); }
            &.booked { color: #94a3b8; }
          }
        }

        .room-pill {
          background: rgba(99, 102, 241, 0.12);
          color: var(--primary-light);
          padding: 0.25rem 0.65rem;
          border-radius: 6px;
          border: 1px solid rgba(99, 102, 241, 0.3);
          font-size: 0.72rem;
        }
      }
    }

    .arena-layout {
      display: grid;
      grid-template-columns: 1fr 380px;
      gap: 2rem;
    }

    .seating-container {
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .sidebar-container {
      display: flex;
      flex-direction: column;
      gap: 1.75rem;

      .action-card {
        padding: 1.75rem;

        .card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1.25rem;

          .card-title {
            font-size: 1.25rem;
            font-weight: 700;
            color: #ffffff;
          }
        }

        .selection-details {
          display: flex;
          flex-direction: column;

          .seat-badge-banner {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0.85rem 1rem;
            background: rgba(255, 255, 255, 0.04);
            border: 1px solid var(--border-subtle);
            border-radius: 10px;

            .seat-code {
              font-size: 1.4rem;
              font-weight: 800;
              color: #ffffff;
            }
          }

          .specs-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 0.5rem;
            background: rgba(0, 0, 0, 0.35);
            border: 1px solid var(--border-subtle);
            border-radius: 8px;
            padding: 0.65rem 0.75rem;

            .spec-item {
              text-align: center;
              font-size: 0.72rem;
            }
          }

          .price-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0.5rem 0;
            border-top: 1px solid var(--border-subtle);
          }
        }

        .hold-active-note {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(245, 158, 11, 0.12);
          border: 1px solid rgba(245, 158, 11, 0.3);
          padding: 0.45rem 0.75rem;
          border-radius: 6px;
        }

        .unselected-inspector {
          .arena-intelligence-box {
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid var(--border-subtle);
            border-radius: 12px;
            padding: 1.25rem;

            .section-badge {
              color: var(--primary-light);
              font-size: 0.68rem;
              letter-spacing: 0.08em;
            }

            .arena-perks-list {
              display: flex;
              flex-direction: column;
              gap: 0.5rem;

              .perk-row {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                color: var(--text-secondary);

                .perk-icon {
                  font-size: 0.9rem;
                }
              }
            }
          }
        }
      }

      .telemetry-card {
        padding: 1.5rem;
        flex-grow: 1;
        display: flex;
        flex-direction: column;

        .telemetry-header {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          margin-bottom: 1rem;

          .telemetry-title {
            font-size: 0.8rem;
            letter-spacing: 0.08em;
            color: var(--text-secondary);
          }
        }

        .telemetry-logs {
          background: #05070a;
          border: 1px solid var(--border-subtle);
          border-radius: 8px;
          padding: 0.75rem;
          height: 280px;
          overflow-y: auto;
          display: flex;
          flex-direction: column-reverse;
          gap: 0.5rem;
          font-size: 0.72rem;

          .log-empty {
            padding: 1rem;
            text-align: center;
          }

          .log-entry {
            display: flex;
            align-items: center;
            gap: 0.4rem;
            padding: 0.25rem 0.4rem;
            border-radius: 4px;
            background: rgba(255, 255, 255, 0.02);

            .log-time {
              color: var(--text-muted);
            }

            .log-badge {
              font-weight: 700;
              padding: 0.1rem 0.35rem;
              border-radius: 3px;
              font-size: 0.65rem;
            }

            &.log-held .log-badge {
              background: rgba(245, 158, 11, 0.2);
              color: #fbbf24;
            }

            &.log-released .log-badge {
              background: rgba(16, 185, 129, 0.2);
              color: #34d399;
            }

            &.log-booked .log-badge {
              background: rgba(99, 102, 241, 0.2);
              color: #a5b4fc;
            }

            .log-msg {
              color: var(--text-secondary);
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }
          }
        }
      }
    }

    .w-full {
      width: 100%;
    }

    @media (max-width: 1024px) {
      .arena-layout {
        grid-template-columns: 1fr;
      }
      .event-hero {
        flex-direction: column;
        align-items: flex-start;
      }
    }
  `],
})
export class EventDetailComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly apiService = inject(ApiService);
  readonly socketService = inject(SocketService);
  private readonly authService = inject(AuthService);
  readonly bookingStore = inject(BookingStore);

  eventId = '';
  readonly event = signal<EventItem | null>(null);
  readonly hoveredSeat = signal<Seat | null>(null);
  readonly activeInspectedSeat = computed(() => this.hoveredSeat() || this.bookingStore.selectedSeat());

  readonly realtimeLogs = signal<
    { id: string; time: string; type: string; message: string }[]
  >([
    { id: 'boot-1', time: '10:00:01', type: 'CLUSTER_INIT', message: 'PgBouncer connection pool primed (10,000 max conns)' },
    { id: 'boot-2', time: '10:00:02', type: 'ENGINE_READY', message: 'Redis Lua distributed atomic lock hot-path active' },
    { id: 'boot-3', time: '10:00:03', type: 'SUBSCRIBED', message: 'Subscribed to cluster Redis Pub/Sub channel: seat_events' },
  ]);

  private socketSub: Subscription | null = null;
  private loginSub: Subscription | null = null;
  private pendingSeatHold: Seat | null = null;

  ngOnInit(): void {
    this.eventId = this.route.snapshot.paramMap.get('id') || '';
    if (this.eventId) {
      this.bookingStore.setEventId(this.eventId);

      // 1. Join real-time WebSocket room
      this.socketService.joinEventRoom(this.eventId);

      // 2. Subscribe to real-time seat lock/release events
      this.socketSub = this.socketService.seatUpdate$.subscribe((event: SeatSocketEvent) => {
        this.handleRealtimeSeatUpdate(event);
      });

      // 3. Auto-resume seat reservation upon successful progressive authentication
      this.loginSub = this.authService.loginSuccess$.subscribe((user) => {
        if (this.pendingSeatHold && this.bookingStore.selectedSeat()?.id === this.pendingSeatHold.id) {
          const seatNum = this.pendingSeatHold.seatNumber;
          this.pendingSeatHold = null;
          this.bookingStore.holdSeat(user.id);
          this.realtimeLogs.update((logs) => [
            {
              id: Math.random().toString(36).substring(2),
              time: new Date().toLocaleTimeString(),
              type: 'FAN_AUTH',
              message: `Authenticated as ${user.email} -> Auto-locking Seat ${seatNum}`,
            },
            ...logs.slice(0, 19),
          ]);
        }
      });

      // 4. Load initial event details and seat matrix into SignalStore
      this.loadEventData();
    }
  }

  loadEventData(): void {
    this.apiService.getEvent(this.eventId).subscribe({
      next: (ev) => this.event.set(ev),
      error: () => {
        this.event.set({
          id: this.eventId,
          title: 'Neon Odyssey // Cyber Arena 2026',
          description: 'High-energy live synthwave drop with atomic concurrency locking.',
          venue: 'Cyber Stage Alpha, Neo Tokyo',
          eventDate: new Date().toISOString(),
          totalSeats: 48,
        });
      },
    });

    this.bookingStore.loadSeats(this.eventId);
  }

  private handleRealtimeSeatUpdate(event: SeatSocketEvent): void {
    const timeStr = new Date(event.timestamp || Date.now()).toLocaleTimeString();
    const newLog = {
      id: Math.random().toString(36).substring(2),
      time: timeStr,
      type: event.type,
      message: `Seat ${event.seatId.slice(0, 8)}... status -> ${event.type}`,
    };

    this.realtimeLogs.update((logs) => [newLog, ...logs.slice(0, 19)]);
    this.bookingStore.handleRealtimeEvent(event);
  }

  handleAcquireHold(): void {
    if (!this.authService.isAuthenticated()) {
      const seat = this.bookingStore.selectedSeat();
      this.pendingSeatHold = seat;
      this.authService.openAuthModal({
        title: `SEAT ${seat?.seatNumber || ''} SELECTED`,
        message: 'Sign in or create a fan account to start your 5-minute atomic lock.',
        targetSeatNumber: seat?.seatNumber,
      });
      return;
    }

    const currentUserId = this.authService.currentUser()!.id;
    this.bookingStore.holdSeat(currentUserId);
  }

  handleAutoPickBestSeat(): void {
    const available = this.bookingStore.seats().filter((s) => s.status === 'AVAILABLE');
    if (available.length === 0) return;

    // Prefer VIP, then Platinum, then Standard
    const bestSeat =
      available.find((s) => s.tier === 'VIP') ||
      available.find((s) => s.tier === 'PLATINUM') ||
      available[0];

    if (bestSeat) {
      this.bookingStore.selectSeat(bestSeat);
    }
  }

  getHeroImageUrl(): string {
    const ev = this.event();
    if (ev?.imageUrl) return ev.imageUrl;
    const title = (ev?.title || '').toLowerCase();
    if (title.includes('music') || title.includes('festival') || title.includes('dj')) {
      return 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1400&q=80';
    }
    if (title.includes('rock') || title.includes('concert')) {
      return 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=1400&q=80';
    }
    if (title.includes('orchestra') || title.includes('symphony')) {
      return 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=1400&q=80';
    }
    if (title.includes('jazz') || title.includes('blues')) {
      return 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?auto=format&fit=crop&w=1400&q=80';
    }
    if (title.includes('ai') || title.includes('machine learning')) {
      return 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=1400&q=80';
    }
    if (title.includes('game') || title.includes('gaming')) {
      return 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1400&q=80';
    }
    return 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1400&q=80';
  }

  formatCategory(): string {
    const ev = this.event();
    if (ev?.category) {
      return '#' + ev.category.replace(/_/g, ' ');
    }
    const t = (ev?.title || '').toLowerCase();
    if (t.includes('festival')) return '#ELECTRONIC FESTIVAL';
    if (t.includes('rock')) return '#ARENA ROCK';
    if (t.includes('orchestra')) return '#PHILHARMONIC';
    if (t.includes('jazz')) return '#JAZZ & BLUES';
    if (t.includes('ai')) return '#AI SYMPOSIUM';
    if (t.includes('game')) return '#ESPORTS ARENA';
    return '#TECH SUMMIT';
  }

  ngOnDestroy(): void {
    if (this.eventId) {
      this.socketService.leaveEventRoom(this.eventId);
    }
    if (this.socketSub) {
      this.socketSub.unsubscribe();
    }
    if (this.loginSub) {
      this.loginSub.unsubscribe();
    }
  }
}
