import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  inject,
  signal,
  computed,
  ViewChild,
  ElementRef,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { EventItem } from '../../../core/models/event.model';

export interface SpotlightMovie {
  id: string;
  title: string;
  description: string;
  backdropUrl: string;
  posterUrl: string;
  venue: string;
  auditorium: string;
  showtimeFormatted: string;
  formatBadges: string[];
  rating: string;
  duration: string;
  occupancyPercent: number;
  availableSeats: number;
  totalSeats: number;
  director: string;
}

export interface FilterCategory {
  id: string;
  label: string;
}

@Component({
  selector: 'app-events-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="events-page">
      <!-- ====================================================================
           1. CINEMATIC PREMIERE SPOTLIGHT CAROUSEL (APPLE TV+ / IMAX STYLE)
           ==================================================================== -->
      <section class="cinema-hero-billboard" (mouseenter)="pauseAutoRotate()" (mouseleave)="resumeAutoRotate()">
        <!-- Dynamic Cinema Backdrop with Anamorphic Glow & Scrims -->
        <div class="backdrop-art-container">
          <img
            [src]="activeMovie().backdropUrl"
            [alt]="activeMovie().title"
            class="backdrop-art-img"
            (error)="onBackdropError($event)"
          />
          <div class="backdrop-gradient-left"></div>
          <div class="backdrop-gradient-bottom"></div>
          <div class="backdrop-vignette"></div>
          <div class="anamorphic-streak"></div>
        </div>

        <!-- Carousel Content Grid: Left Spotlight Info + Right Film Reel Strip -->
        <div class="hero-content-grid">
          <!-- Left Column: Spotlight Info -->
          <div class="spotlight-info-column">
            <!-- Cinema Format & Status Badges -->
            <div class="format-badges-strip">
              <span class="spotlight-badge live-pulse">
                <span class="pulse-beacon"></span>
                PREMIERE SPOTLIGHT
              </span>
              @for (badge of activeMovie().formatBadges; track badge) {
                <span class="format-chip font-mono">{{ badge }}</span>
              }
              <span class="rating-badge font-mono">{{ activeMovie().rating }}</span>
              <span class="duration-badge font-mono">⏱ {{ activeMovie().duration }}</span>
            </div>

            <!-- Big Blockbuster Movie Title -->
            <h1 class="spotlight-title">
              {{ activeMovie().title }}
            </h1>

            <!-- High-Impact Synopsis -->
            <p class="spotlight-synopsis">
              {{ activeMovie().description }}
            </p>

            <!-- Screening Details Bar -->
            <div class="screening-details-strip">
              <div class="detail-item">
                <span class="detail-label">AUDITORIUM</span>
                <span class="detail-value font-mono">{{ activeMovie().auditorium }}</span>
              </div>
              <div class="detail-divider"></div>
              <div class="detail-item">
                <span class="detail-label">SHOWTIME</span>
                <span class="detail-value font-mono">{{ activeMovie().showtimeFormatted }}</span>
              </div>
              <div class="detail-divider"></div>
              <div class="detail-item">
                <span class="detail-label">SEATS AVAILABLE</span>
                <span class="detail-value font-mono text-cyan">{{ activeMovie().availableSeats }} / {{ activeMovie().totalSeats }}</span>
              </div>
            </div>

            <!-- Live Auditorium Booking Velocity Bar -->
            <div class="velocity-box">
              <div class="velocity-header">
                <span class="velocity-status font-mono">
                  <span class="status-dot live"></span>
                  LIVE AUDITORIUM VELOCITY: {{ activeMovie().occupancyPercent }}% RESERVED
                </span>
                <span class="velocity-tech font-mono">REDIS CONCURRENCY ACTIVE</span>
              </div>
              <div class="velocity-bar-track">
                <div class="velocity-bar-fill" [style.width.%]="activeMovie().occupancyPercent">
                  <div class="fill-glow-tip"></div>
                </div>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="spotlight-cta-row">
              <a [routerLink]="['/events', activeMovie().id]" class="btn btn-cinema-primary">
                <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect>
                  <path d="M17 2l-5 5-5-5"></path>
                </svg>
                <span>Reserve Cinema Seats →</span>
              </a>

              <button (click)="openTrailerTeaser(activeMovie())" class="btn btn-cinema-teaser">
                <svg class="btn-icon play-icon" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
                <span>▷ Trailer Teaser</span>
              </button>

              <a [routerLink]="['/waiting-room', activeMovie().id]" class="btn btn-cinema-ghost font-mono">
                <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                <span>Virtual Queue</span>
              </a>
            </div>
          </div>

          <!-- Right Column: Interactive Mini Film Reel -->
          <div class="spotlight-reel-column">
            <div class="reel-header">
              <div class="reel-title-tag">
                <svg class="reel-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect>
                  <line x1="7" y1="2" x2="7" y2="22"></line>
                  <line x1="17" y1="2" x2="17" y2="22"></line>
                  <line x1="2" y1="12" x2="22" y2="12"></line>
                  <line x1="2" y1="7" x2="7" y2="7"></line>
                  <line x1="2" y1="17" x2="7" y2="17"></line>
                  <line x1="17" y1="17" x2="22" y2="17"></line>
                  <line x1="17" y1="7" x2="22" y2="7"></line>
                </svg>
                <span>NOW PREMIERING</span>
              </div>
              <span class="reel-counter font-mono">0{{ activeSpotlightIndex() + 1 }} / 0{{ spotlightMovies().length }}</span>
            </div>

            <div class="reel-cards-stack">
              @for (item of spotlightMovies(); track item.id; let idx = $index) {
                <div
                  class="reel-card"
                  [class.active]="idx === activeSpotlightIndex()"
                  (click)="selectSpotlight(idx)"
                >
                  <!-- Active Auto-Rotate Progress Bar -->
                  @if (idx === activeSpotlightIndex() && !isPaused()) {
                    <div class="reel-timer-bar">
                      <div class="timer-progress"></div>
                    </div>
                  }

                  <div class="reel-thumb-box">
                    <img [src]="item.posterUrl" [alt]="item.title" class="reel-thumb-img" (error)="onThumbError($event)" />
                    @if (idx === activeSpotlightIndex()) {
                      <div class="reel-active-badge">
                        <span class="active-dot"></span>
                      </div>
                    }
                  </div>

                  <div class="reel-info-box">
                    <div class="reel-meta-tag font-mono">{{ item.formatBadges[0] || 'IMAX' }}</div>
                    <h4 class="reel-movie-title">{{ item.title }}</h4>
                    <div class="reel-footer-meta font-mono">
                      <span>{{ item.rating }}</span>
                      <span class="dot-sep">•</span>
                      <span>{{ item.duration }}</span>
                    </div>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>

        <!-- Cinema Enterprise Ticker HUD at Base -->
        <div class="hero-ticker-hud">
          <div class="ticker-content">
            <div class="ticker-item">
              <span class="ticker-led"></span>
              <span class="ticker-label font-mono">REDIS ATOMIC ENGINE:</span>
              <span class="ticker-value font-mono">SET NX PX (0.00% OVERSELL)</span>
            </div>
            <div class="ticker-separator">✦</div>
            <div class="ticker-item">
              <span class="ticker-led"></span>
              <span class="ticker-label font-mono">CART HOLD GUARANTEE:</span>
              <span class="ticker-value font-mono">300s TTL BULLMQ PRECISION</span>
            </div>
            <div class="ticker-separator">✦</div>
            <div class="ticker-item">
              <span class="ticker-led"></span>
              <span class="ticker-label font-mono">PROJECTION FORMATS:</span>
              <span class="ticker-value font-mono">IMAX 70MM • DOLBY CINEMA • 4DX</span>
            </div>
            <div class="ticker-separator">✦</div>
            <div class="ticker-item">
              <span class="ticker-led"></span>
              <span class="ticker-label font-mono">VIP HOSPITALITY:</span>
              <span class="ticker-value font-mono">D-BOX HAPTIC & RECLINER LOUNGE</span>
            </div>
          </div>
        </div>
      </section>

      <!-- ====================================================================
           2. NOW SHOWING SECTION WITH 15-BATCH INFINITE SCROLL & FILTERS
           ==================================================================== -->
      <section class="events-section" id="now-showing-catalog">
        <div class="section-header">
          <div>
            <div class="section-tag font-mono">
              <span class="status-dot live"></span>
              <span>LIVE CINEMA BROADCAST FEED</span>
            </div>
            <h2 class="section-title">Now Showing & Cinema Screenings</h2>
            <p class="section-desc">
              Select an auditorium screening below to experience atomic seat locking and 5-minute checkout guarantees.
            </p>
          </div>
          <button (click)="loadEvents()" class="btn btn-secondary btn-sm" [disabled]="isLoading()">
            <svg class="refresh-icon" [class.spinning]="isLoading()" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
              <path d="M3 3v5h5"></path>
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"></path>
              <path d="M16 21h5v-5"></path>
            </svg>
            <span>Sync Catalog</span>
          </button>
        </div>

        <!-- Cinema Format Filter Tabs & Catalog Progress Bar -->
        <div class="catalog-control-bar">
          <div class="filter-pills-group">
            @for (cat of filterCategories; track cat.id) {
              <button
                class="filter-pill font-mono"
                [class.active]="selectedCategory() === cat.id"
                (click)="setCategory(cat.id)"
              >
                <span class="pill-dot" [class.active]="selectedCategory() === cat.id"></span>
                <span>{{ cat.label }}</span>
                <span class="pill-count font-mono">{{ getCategoryCount(cat.id) }}</span>
              </button>
            }
          </div>

          <!-- 15-Pagination Progress Counter -->
          <div class="catalog-progress-hud font-mono">
            <div class="progress-labels">
              <span class="progress-counts">
                SHOWING <strong class="text-white">{{ displayedEvents().length }}</strong> OF {{ filteredEvents().length }} SCREENINGS
              </span>
              <span class="batch-tag">BATCH: 15 / INFINITE SCROLL</span>
            </div>
            <div class="progress-track">
              <div class="progress-fill" [style.width.%]="progressPercent()"></div>
            </div>
          </div>
        </div>

        @if (isLoading()) {
          <div class="loading-state">
            <div class="loader-spinner"></div>
            <p class="font-mono text-secondary">Synchronizing live cinema schedules with Redis...</p>
          </div>
        } @else if (filteredEvents().length === 0) {
          <div class="empty-state glass-card">
            <div class="empty-icon">🎟️</div>
            <h3>No Screenings Found In This Category</h3>
            <p>Try switching to another format or reload the full catalog.</p>
            <button (click)="setCategory('ALL')" class="btn btn-primary btn-sm">View All Screenings</button>
          </div>
        } @else {
          <!-- Responsive Grid: 3 columns on desktop (15 items = 5 full rows) -->
          <div class="events-grid">
            @for (event of displayedEvents(); track event.id) {
              <div class="event-card glass-card">
                <!-- 16:9 Cinematic Visual Poster Banner -->
                <div class="event-poster-wrapper">
                  <img
                    [src]="getEventImageUrl(event)"
                    [alt]="event.title"
                    loading="lazy"
                    class="event-poster-img"
                    (error)="onImgError($event, event)"
                  />
                  <div class="poster-overlay-scrim"></div>

                  <!-- Floating Top Bar: Category Pill + Total Seats -->
                  <div class="poster-top-bar">
                    <span class="category-chip font-mono">
                      {{ formatCategory(event) }}
                    </span>
                    <span class="seats-pill font-mono">
                      {{ event.totalSeats || 50 }} SEATS
                    </span>
                  </div>

                  <!-- Floating Bottom Bar: Venue Location -->
                  <div class="poster-bottom-bar">
                    <span class="venue-location">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="loc-icon">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                        <circle cx="12" cy="10" r="3"></circle>
                      </svg>
                      {{ event.venue || 'AURA Grand Dome, Neo Tokyo' }}
                    </span>
                  </div>
                </div>

                <!-- Event Details Content -->
                <div class="event-body">
                  <div class="event-meta">
                    <span class="event-date font-mono">
                      {{ event.eventDate | date:'mediumDate' }} • {{ event.eventDate | date:'shortTime' }}
                    </span>
                    <span class="status-indicator">
                      <span class="status-dot live"></span>
                      <span class="font-mono text-xs">ONLINE</span>
                    </span>
                  </div>

                  <h3 class="event-title">{{ event.title }}</h3>
                  <p class="event-desc">{{ event.description }}</p>

                  <div class="event-footer">
                    <div class="price-box">
                      <span class="price-label">STARTING FROM</span>
                      <span class="price-val font-mono">$24.00</span>
                    </div>

                    <div class="card-action-stack">
                      <a [routerLink]="['/events', event.id]" class="btn btn-primary w-full btn-sm font-mono">
                        <span>Select Seats</span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="arrow-icon">
                          <line x1="5" y1="12" x2="19" y2="12"></line>
                          <polyline points="12 5 19 12 12 19"></polyline>
                        </svg>
                      </a>
                      <a [routerLink]="['/waiting-room', event.id]" class="btn btn-secondary w-full btn-sm font-mono">
                        <span>🚶 Virtual Queue (Queue-it)</span>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            }
          </div>

          <!-- ================================================================
               3. SMART INFINITE SCROLL SENTINEL & STREAM CONTROLS
               ================================================================ -->
          @if (hasMore()) {
            <div #scrollSentinel class="infinite-scroll-sentinel">
              @if (isLoadingMore()) {
                <div class="loading-more-container glass-card">
                  <div class="dual-pulse-loader">
                    <span class="pulse-ring ring-1"></span>
                    <span class="pulse-ring ring-2"></span>
                    <span class="pulse-center">🍿</span>
                  </div>
                  <div class="loading-more-text font-mono">
                    STREAMING NEXT 15 BLOCKBUSTERS // REDIS HOT-CACHE SYNC...
                  </div>
                </div>
              } @else {
                <div class="manual-load-more-box">
                  <button (click)="loadMore()" class="btn-load-more font-mono">
                    <svg class="down-arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                    <span>Load Next 15 Cinema Screenings ({{ filteredEvents().length - displayedEvents().length }} Remaining)</span>
                  </button>
                  <div class="scroll-hint font-mono text-muted">↓ Or scroll down to auto-fetch next batch</div>
                </div>
              }
            </div>
          } @else if (displayedEvents().length > 0) {
            <!-- End of Stream Celebration Badge -->
            <div class="all-loaded-badge glass-card">
              <div class="all-loaded-stars">✦ ✦ ✦</div>
              <h4 class="all-loaded-title font-display">ALL SCREENINGS BROADCASTED</h4>
              <p class="all-loaded-subtitle font-mono">
                Showing all {{ displayedEvents().length }} of {{ filteredEvents().length }} screenings currently in active circulation.
              </p>
              <button (click)="scrollToTop()" class="btn-back-to-top font-mono">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <polyline points="18 15 12 9 6 15"></polyline>
                </svg>
                <span>Back to Premiere Spotlight ↑</span>
              </button>
            </div>
          }
        }
      </section>

      <!-- ====================================================================
           4. TRAILER TEASER LIGHTBOX MODAL
           ==================================================================== -->
      @if (activeTeaserMovie(); as teaser) {
        <div class="teaser-modal-overlay" (click)="closeTrailerTeaser()">
          <div class="teaser-modal-card" (click)="$event.stopPropagation()">
            <!-- Modal Header -->
            <div class="teaser-modal-header">
              <div class="teaser-header-left">
                <span class="teaser-live-tag font-mono">
                  <span class="pulse-beacon"></span>
                  CINEMA SCREENING TEASER
                </span>
                <span class="teaser-format font-mono">{{ teaser.formatBadges[0] }}</span>
              </div>
              <button class="teaser-close-btn" (click)="closeTrailerTeaser()">✕</button>
            </div>

            <!-- Simulated Video Stage -->
            <div class="teaser-stage">
              <img [src]="teaser.backdropUrl" [alt]="teaser.title" class="teaser-stage-bg" />
              <div class="teaser-stage-scrim"></div>
              <div class="teaser-play-center">
                <div class="teaser-pulse-ring"></div>
                <div class="teaser-play-disc">
                  <svg viewBox="0 0 24 24" fill="currentColor" class="teaser-play-icon">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                  </svg>
                </div>
                <span class="teaser-play-hint font-mono">4K LASER MASTER AUDIO PREVIEW</span>
              </div>

              <!-- Audio visualizer animation -->
              <div class="teaser-audio-wave">
                <span class="wave-bar b1"></span>
                <span class="wave-bar b2"></span>
                <span class="wave-bar b3"></span>
                <span class="wave-bar b4"></span>
                <span class="wave-bar b5"></span>
                <span class="wave-bar b6"></span>
                <span class="wave-bar b7"></span>
                <span class="wave-bar b8"></span>
                <span class="wave-bar b9"></span>
              </div>
            </div>

            <!-- Teaser Details & Booking Action -->
            <div class="teaser-modal-body">
              <div class="teaser-info">
                <div class="teaser-badges">
                  @for (badge of teaser.formatBadges; track badge) {
                    <span class="chip-sm font-mono">{{ badge }}</span>
                  }
                  <span class="chip-sm font-mono text-cyan">{{ teaser.rating }}</span>
                  <span class="chip-sm font-mono">{{ teaser.duration }}</span>
                </div>
                <h2 class="teaser-title">{{ teaser.title }}</h2>
                <p class="teaser-synopsis">{{ teaser.description }}</p>
                <div class="teaser-venue font-mono">
                  📍 {{ teaser.venue }} • {{ teaser.auditorium }}
                </div>
              </div>

              <div class="teaser-actions">
                <a [routerLink]="['/events', teaser.id]" (click)="closeTrailerTeaser()" class="btn btn-cinema-primary w-full">
                  <span>Pick Cinema Seats for This Screening →</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- ====================================================================
           5. FLOATING "BACK TO TOP" QUICK-SCROLL BUTTON
           ==================================================================== -->
      @if (showBackToTop()) {
        <button (click)="scrollToTop()" class="floating-back-to-top" title="Back to Top">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="18 15 12 9 6 15"></polyline>
          </svg>
          <span class="font-mono">TOP</span>
        </button>
      }
    </div>
  `,
  styles: [`
    .events-page {
      max-width: 1440px;
      margin: 0 auto;
      padding: 1.5rem 1.75rem 4rem;
    }

    /* ==========================================================================
       CINEMA HERO BILLBOARD (CONCEPT 1: CINEMATIC PREMIERE SPOTLIGHT CAROUSEL)
       ========================================================================== */
    .cinema-hero-billboard {
      position: relative;
      border-radius: 20px;
      overflow: hidden;
      margin-bottom: 3.5rem;
      min-height: 560px;
      background: #090a0f;
      border: 1px solid rgba(229, 9, 20, 0.35);
      box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.85), 0 0 55px rgba(229, 9, 20, 0.2);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      transition: box-shadow 0.4s ease, border-color 0.4s ease;

      &:hover {
        border-color: rgba(229, 9, 20, 0.55);
        box-shadow: 0 30px 70px -10px rgba(0, 0, 0, 0.95), 0 0 75px rgba(229, 9, 20, 0.32);
      }
    }

    .backdrop-art-container {
      position: absolute;
      inset: 0;
      pointer-events: none;
      z-index: 1;
      overflow: hidden;
    }

    .backdrop-art-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center 25%;
      filter: brightness(0.92) contrast(1.1) saturate(1.22);
      transition: opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 1.2s cubic-bezier(0.16, 1, 0.3, 1), filter 0.8s ease;
      transform: scale(1.02);
    }

    .cinema-hero-billboard:hover .backdrop-art-img {
      transform: scale(1.04);
      filter: brightness(0.98) contrast(1.12) saturate(1.28);
    }

    .backdrop-gradient-left {
      position: absolute;
      inset: 0;
      background: linear-gradient(
        90deg,
        rgba(9, 10, 15, 0.92) 0%,
        rgba(9, 10, 15, 0.78) 28%,
        rgba(9, 10, 15, 0.38) 48%,
        rgba(9, 10, 15, 0.08) 68%,
        transparent 82%
      );
    }

    .backdrop-gradient-bottom {
      position: absolute;
      inset: 0;
      background: linear-gradient(
        0deg,
        rgba(9, 10, 15, 0.95) 0%,
        rgba(9, 10, 15, 0.4) 14%,
        transparent 38%
      );
    }

    .backdrop-vignette {
      position: absolute;
      inset: 0;
      box-shadow: inset 0 0 50px rgba(0, 0, 0, 0.45);
    }

    .anamorphic-streak {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: linear-gradient(
        90deg,
        transparent 0%,
        rgba(229, 9, 20, 0.7) 20%,
        rgba(56, 189, 248, 0.9) 50%,
        rgba(229, 9, 20, 0.7) 80%,
        transparent 100%
      );
      box-shadow: 0 0 20px rgba(56, 189, 248, 0.85);
    }

    .hero-content-grid {
      position: relative;
      z-index: 2;
      display: grid;
      grid-template-columns: 1.45fr 0.85fr;
      gap: 2.5rem;
      padding: 3rem 3rem 2rem;
      align-items: center;
    }

    @media (max-width: 1024px) {
      .hero-content-grid {
        grid-template-columns: 1fr;
        gap: 2rem;
        padding: 2rem 1.75rem 1.5rem;
      }
    }

    .spotlight-info-column {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .format-badges-strip {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.6rem;
    }

    .spotlight-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      background: linear-gradient(135deg, rgba(229, 9, 20, 0.3) 0%, rgba(185, 28, 28, 0.4) 100%);
      border: 1px solid rgba(229, 9, 20, 0.6);
      color: #fca5a5;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      padding: 0.3rem 0.75rem;
      border-radius: 9999px;
      box-shadow: 0 0 14px rgba(229, 9, 20, 0.25);
    }

    .pulse-beacon {
      width: 7px;
      height: 7px;
      background: #ef4444;
      border-radius: 50%;
      box-shadow: 0 0 8px #ef4444;
      animation: beaconPulse 1.6s infinite ease-in-out;
    }

    @keyframes beaconPulse {
      0% { transform: scale(0.9); opacity: 0.6; }
      50% { transform: scale(1.3); opacity: 1; box-shadow: 0 0 12px #ef4444; }
      100% { transform: scale(0.9); opacity: 0.6; }
    }

    .format-chip {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #e2e8f0;
      font-size: 0.7rem;
      padding: 0.25rem 0.55rem;
      border-radius: 4px;
      letter-spacing: 0.04em;
    }

    .rating-badge {
      background: rgba(245, 158, 11, 0.15);
      border: 1px solid rgba(245, 158, 11, 0.4);
      color: #fbbf24;
      font-size: 0.7rem;
      font-weight: 700;
      padding: 0.25rem 0.55rem;
      border-radius: 4px;
    }

    .duration-badge {
      background: rgba(148, 163, 184, 0.1);
      border: 1px solid rgba(148, 163, 184, 0.25);
      color: #94a3b8;
      font-size: 0.7rem;
      padding: 0.25rem 0.55rem;
      border-radius: 4px;
    }

    .spotlight-title {
      font-size: 2.85rem;
      font-weight: 850;
      line-height: 1.1;
      letter-spacing: -0.025em;
      color: #ffffff;
      margin: 0;
      text-shadow: 0 4px 25px rgba(0, 0, 0, 0.95), 0 0 45px rgba(0, 0, 0, 0.9);
      background: linear-gradient(180deg, #ffffff 40%, #e2e8f0 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      filter: drop-shadow(0 4px 18px rgba(0, 0, 0, 0.95));
    }

    @media (max-width: 768px) {
      .spotlight-title {
        font-size: 2rem;
      }
    }

    .spotlight-synopsis {
      font-size: 1rem;
      color: #f1f5f9;
      line-height: 1.6;
      max-width: 680px;
      margin: 0;
      text-shadow: 0 2px 14px rgba(0, 0, 0, 0.95), 0 0 20px rgba(0, 0, 0, 0.9);
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .screening-details-strip {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 1.25rem;
      padding: 0.85rem 1.15rem;
      background: rgba(10, 12, 18, 0.75);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 10px;
      backdrop-filter: blur(16px);
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
      width: fit-content;
      max-width: 100%;

      .detail-item {
        display: flex;
        flex-direction: column;
        gap: 0.15rem;

        .detail-label {
          font-size: 0.68rem;
          color: #64748b;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .detail-value {
          font-size: 0.88rem;
          font-weight: 600;
          color: #f1f5f9;
        }

        .text-cyan {
          color: #38bdf8;
        }
      }

      .detail-divider {
        width: 1px;
        height: 24px;
        background: rgba(255, 255, 255, 0.1);
      }
    }

    .velocity-box {
      max-width: 620px;
      display: flex;
      flex-direction: column;
      gap: 0.4rem;

      .velocity-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 0.72rem;

        .velocity-status {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          color: #fca5a5;
          font-weight: 600;
          letter-spacing: 0.04em;
        }

        .velocity-tech {
          color: #06b6d4;
          letter-spacing: 0.06em;
          font-size: 0.68rem;
        }
      }

      .velocity-bar-track {
        height: 8px;
        background: rgba(255, 255, 255, 0.08);
        border-radius: 9999px;
        overflow: hidden;
        position: relative;
        border: 1px solid rgba(255, 255, 255, 0.06);

        .velocity-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #e50914 0%, #f43f5e 60%, #38bdf8 100%);
          border-radius: 9999px;
          position: relative;
          transition: width 0.6s cubic-bezier(0.16, 1, 0.3, 1);

          .fill-glow-tip {
            position: absolute;
            right: 0;
            top: 0;
            bottom: 0;
            width: 12px;
            background: #ffffff;
            box-shadow: 0 0 10px #38bdf8, 0 0 18px #f43f5e;
            border-radius: 50%;
          }
        }
      }
    }

    .spotlight-cta-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 1rem;
      margin-top: 0.5rem;

      .btn-cinema-primary {
        display: inline-flex;
        align-items: center;
        gap: 0.6rem;
        background: linear-gradient(135deg, #e50914 0%, #b91c1c 100%);
        color: #ffffff;
        font-weight: 700;
        font-size: 0.95rem;
        padding: 0.85rem 1.6rem;
        border-radius: 8px;
        text-decoration: none;
        box-shadow: 0 0 25px rgba(229, 9, 20, 0.45);
        transition: all 0.25s ease;
        border: 1px solid rgba(255, 255, 255, 0.15);

        &:hover {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          box-shadow: 0 0 35px rgba(229, 9, 20, 0.7);
          transform: translateY(-2px);
        }

        .btn-icon {
          width: 18px;
          height: 18px;
        }
      }

      .btn-cinema-teaser {
        display: inline-flex;
        align-items: center;
        gap: 0.55rem;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.22);
        backdrop-filter: blur(10px);
        color: #ffffff;
        font-weight: 600;
        font-size: 0.9rem;
        padding: 0.85rem 1.4rem;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.25s ease;

        &:hover {
          background: rgba(255, 255, 255, 0.16);
          border-color: rgba(56, 189, 248, 0.6);
          box-shadow: 0 0 20px rgba(56, 189, 248, 0.25);
          transform: translateY(-2px);
        }

        .play-icon {
          width: 15px;
          height: 15px;
          color: #38bdf8;
        }
      }

      .btn-cinema-ghost {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        background: rgba(15, 23, 42, 0.5);
        border: 1px solid rgba(148, 163, 184, 0.25);
        color: #94a3b8;
        font-size: 0.85rem;
        padding: 0.85rem 1.25rem;
        border-radius: 8px;
        text-decoration: none;
        transition: all 0.2s ease;

        &:hover {
          color: #f1f5f9;
          border-color: rgba(255, 255, 255, 0.35);
          background: rgba(15, 23, 42, 0.8);
        }

        .btn-icon {
          width: 16px;
          height: 16px;
        }
      }
    }

    .spotlight-reel-column {
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
      background: rgba(10, 12, 18, 0.7);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 14px;
      padding: 1.15rem;
      backdrop-filter: blur(16px);
      box-shadow: 0 15px 35px rgba(0, 0, 0, 0.6);
    }

    .reel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 0.75rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.07);

      .reel-title-tag {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.74rem;
        font-weight: 700;
        letter-spacing: 0.1em;
        color: #cbd5e1;

        .reel-icon {
          width: 15px;
          height: 15px;
          color: #ef4444;
        }
      }

      .reel-counter {
        font-size: 0.74rem;
        color: #64748b;
      }
    }

    .reel-cards-stack {
      display: flex;
      flex-direction: column;
      gap: 0.55rem;
    }

    .reel-card {
      position: relative;
      display: flex;
      align-items: center;
      gap: 0.85rem;
      padding: 0.65rem 0.75rem;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 8px;
      cursor: pointer;
      overflow: hidden;
      transition: all 0.25s ease;

      &:hover {
        background: rgba(255, 255, 255, 0.06);
        border-color: rgba(255, 255, 255, 0.15);
        transform: translateX(4px);
      }

      &.active {
        background: linear-gradient(90deg, rgba(229, 9, 20, 0.15) 0%, rgba(15, 23, 42, 0.5) 100%);
        border-color: rgba(229, 9, 20, 0.65);
        box-shadow: 0 0 20px rgba(229, 9, 20, 0.2);
      }
    }

    .reel-timer-bar {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 2.5px;
      background: rgba(255, 255, 255, 0.08);

      .timer-progress {
        height: 100%;
        background: linear-gradient(90deg, #e50914, #38bdf8);
        animation: autoRotateBar 7s linear infinite;
      }
    }

    @keyframes autoRotateBar {
      0% { width: 0%; }
      100% { width: 100%; }
    }

    .reel-thumb-box {
      position: relative;
      width: 48px;
      height: 64px;
      flex-shrink: 0;
      border-radius: 5px;
      overflow: hidden;
      background: #000;

      .reel-thumb-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .reel-active-badge {
        position: absolute;
        top: 4px;
        right: 4px;
        width: 8px;
        height: 8px;
        background: #ef4444;
        border-radius: 50%;
        box-shadow: 0 0 6px #ef4444;
      }
    }

    .reel-info-box {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 0.15rem;

      .reel-meta-tag {
        font-size: 0.62rem;
        color: #ef4444;
        font-weight: 700;
        letter-spacing: 0.05em;
      }

      .reel-movie-title {
        font-size: 0.85rem;
        font-weight: 600;
        color: #ffffff;
        margin: 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .reel-footer-meta {
        font-size: 0.68rem;
        color: #94a3b8;
        display: flex;
        align-items: center;
        gap: 0.35rem;

        .dot-sep {
          color: #475569;
        }
      }
    }

    .hero-ticker-hud {
      position: relative;
      z-index: 2;
      background: rgba(5, 7, 10, 0.85);
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      padding: 0.75rem 2rem;
      backdrop-filter: blur(10px);
      overflow-x: auto;
    }

    .ticker-content {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1.5rem;
      white-space: nowrap;
      min-width: max-content;

      .ticker-item {
        display: flex;
        align-items: center;
        gap: 0.45rem;
        font-size: 0.72rem;

        .ticker-led {
          width: 6px;
          height: 6px;
          background: #22c55e;
          border-radius: 50%;
          box-shadow: 0 0 6px #22c55e;
        }

        .ticker-label {
          color: #64748b;
          font-weight: 600;
        }

        .ticker-value {
          color: #e2e8f0;
          font-weight: 500;
        }
      }

      .ticker-separator {
        color: #ef4444;
        font-size: 0.65rem;
        opacity: 0.7;
      }
    }

    /* ==========================================================================
       NOW SHOWING EVENTS GRID SECTION & 15-BATCH INFINITE SCROLL
       ========================================================================== */
    .events-section {
      scroll-margin-top: 90px;

      .section-header {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        margin-bottom: 1.75rem;
        gap: 1rem;

        .section-tag {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          font-size: 0.68rem;
          color: #ef4444;
          letter-spacing: 0.12em;
          margin-bottom: 0.35rem;
        }

        .section-title {
          font-size: 1.85rem;
          font-weight: 750;
          color: #ffffff;
        }

        .section-desc {
          font-size: 0.95rem;
          color: var(--text-secondary);
          margin-top: 0.35rem;
        }
      }
    }

    /* Catalog Filter Bar & Progress HUD */
    .catalog-control-bar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 1.25rem;
      padding: 0.85rem 1.25rem;
      background: rgba(17, 24, 39, 0.65);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      backdrop-filter: blur(12px);
      margin-bottom: 2rem;
    }

    .filter-pills-group {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem;
    }

    .filter-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #94a3b8;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.4rem 0.8rem;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s ease;

      &:hover {
        color: #ffffff;
        background: rgba(255, 255, 255, 0.08);
        border-color: rgba(255, 255, 255, 0.25);
      }

      &.active {
        background: rgba(229, 9, 20, 0.15);
        border-color: rgba(229, 9, 20, 0.65);
        color: #fca5a5;
        box-shadow: 0 0 12px rgba(229, 9, 20, 0.2);
      }

      .pill-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #64748b;

        &.active {
          background: #ef4444;
          box-shadow: 0 0 6px #ef4444;
        }
      }

      .pill-count {
        font-size: 0.68rem;
        background: rgba(0, 0, 0, 0.35);
        padding: 0.1rem 0.35rem;
        border-radius: 4px;
        color: inherit;
      }
    }

    .catalog-progress-hud {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      min-width: 260px;

      .progress-labels {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 0.68rem;
        color: #64748b;

        .text-white {
          color: #ffffff;
        }

        .batch-tag {
          color: #06b6d4;
          letter-spacing: 0.05em;
        }
      }

      .progress-track {
        height: 5px;
        background: rgba(255, 255, 255, 0.08);
        border-radius: 9999px;
        overflow: hidden;

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #e50914 0%, #38bdf8 100%);
          border-radius: 9999px;
          transition: width 0.4s ease;
        }
      }
    }

    /* Events Grid */
    .events-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
      gap: 1.75rem;
    }

    @media (max-width: 640px) {
      .events-grid {
        grid-template-columns: 1fr;
      }
    }

    .event-card {
      display: flex;
      flex-direction: column;
      overflow: hidden;
      border-radius: var(--radius-lg);
      transition: transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
      background: rgba(17, 24, 39, 0.6);
      border: 1px solid var(--border-subtle);

      &:hover {
        transform: translateY(-4px);
        border-color: rgba(229, 9, 20, 0.4);
        box-shadow: 0 12px 30px rgba(0, 0, 0, 0.5), 0 0 20px rgba(229, 9, 20, 0.15);

        .event-poster-img {
          transform: scale(1.05);
        }
      }
    }

    .event-poster-wrapper {
      position: relative;
      width: 100%;
      height: 200px;
      overflow: hidden;
      background: #000;

      .event-poster-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform 0.5s ease;
      }

      .poster-overlay-scrim {
        position: absolute;
        inset: 0;
        background: linear-gradient(180deg, rgba(0,0,0,0.65) 0%, transparent 40%, rgba(0,0,0,0.85) 100%);
      }

      .poster-top-bar {
        position: absolute;
        top: 0.75rem;
        left: 0.75rem;
        right: 0.75rem;
        display: flex;
        justify-content: space-between;
        align-items: center;

        .category-chip {
          background: rgba(229, 9, 20, 0.85);
          backdrop-filter: blur(8px);
          color: #ffffff;
          font-size: 0.68rem;
          font-weight: 700;
          padding: 0.2rem 0.55rem;
          border-radius: 4px;
          letter-spacing: 0.05em;
        }

        .seats-pill {
          background: rgba(15, 23, 42, 0.85);
          backdrop-filter: blur(8px);
          color: #38bdf8;
          border: 1px solid rgba(56, 189, 248, 0.4);
          font-size: 0.68rem;
          font-weight: 600;
          padding: 0.2rem 0.55rem;
          border-radius: 4px;
        }
      }

      .poster-bottom-bar {
        position: absolute;
        bottom: 0.65rem;
        left: 0.75rem;
        right: 0.75rem;

        .venue-location {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.78rem;
          color: #e2e8f0;
          font-weight: 500;
          text-shadow: 0 1px 4px rgba(0,0,0,0.9);

          .loc-icon {
            width: 14px;
            height: 14px;
            color: #f87171;
          }
        }
      }
    }

    .event-body {
      padding: 1.25rem 1.5rem 1.5rem;
      display: flex;
      flex-direction: column;
      flex: 1;

      .event-meta {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.65rem;

        .event-date {
          font-size: 0.78rem;
          color: var(--text-muted);
        }

        .status-indicator {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          color: var(--accent-emerald);
        }
      }

      .event-title {
        font-size: 1.25rem;
        font-weight: 700;
        color: #ffffff;
        margin-bottom: 0.5rem;
        line-height: 1.3;
      }

      .event-desc {
        font-size: 0.88rem;
        color: var(--text-secondary);
        line-height: 1.5;
        margin-bottom: 1.25rem;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .event-footer {
        margin-top: auto;
        padding-top: 1.25rem;
        border-top: 1px solid var(--border-subtle);
        display: flex;
        flex-direction: column;
        gap: 1rem;

        .price-box {
          display: flex;
          justify-content: space-between;
          align-items: baseline;

          .price-label {
            font-size: 0.72rem;
            color: var(--text-muted);
            letter-spacing: 0.05em;
          }

          .price-val {
            font-size: 1.25rem;
            font-weight: 700;
            color: #ffffff;
          }
        }

        .card-action-stack {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;

          .arrow-icon {
            width: 14px;
            height: 14px;
            margin-left: 0.4rem;
            transition: transform 0.2s ease;
          }

          .btn-primary:hover .arrow-icon {
            transform: translateX(3px);
          }
        }
      }
    }

    /* ==========================================================================
       SMART INFINITE SCROLL SENTINEL & STREAM CONTROLS
       ========================================================================== */
    .infinite-scroll-sentinel {
      margin-top: 2.5rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100px;
    }

    .loading-more-container {
      display: flex;
      align-items: center;
      gap: 1.25rem;
      padding: 1.25rem 2rem;
      border-radius: 12px;
      border: 1px solid rgba(229, 9, 20, 0.35);
      background: rgba(17, 24, 39, 0.75);
      backdrop-filter: blur(14px);
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);

      .dual-pulse-loader {
        position: relative;
        width: 38px;
        height: 38px;
        display: flex;
        align-items: center;
        justify-content: center;

        .pulse-ring {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          border: 2px solid #ef4444;
          animation: ringExpand 1.5s infinite ease-out;

          &.ring-2 {
            animation-delay: 0.75s;
            border-color: #38bdf8;
          }
        }

        .pulse-center {
          font-size: 1.1rem;
        }
      }

      .loading-more-text {
        font-size: 0.82rem;
        color: #fca5a5;
        letter-spacing: 0.08em;
      }
    }

    @keyframes ringExpand {
      0% { transform: scale(0.6); opacity: 0.9; }
      100% { transform: scale(1.6); opacity: 0; }
    }

    .manual-load-more-box {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.65rem;

      .btn-load-more {
        display: inline-flex;
        align-items: center;
        gap: 0.65rem;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(229, 9, 20, 0.4);
        color: #f1f5f9;
        font-size: 0.85rem;
        font-weight: 600;
        padding: 0.85rem 1.75rem;
        border-radius: 10px;
        cursor: pointer;
        backdrop-filter: blur(10px);
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
        transition: all 0.25s ease;

        &:hover {
          background: rgba(229, 9, 20, 0.15);
          border-color: rgba(229, 9, 20, 0.8);
          box-shadow: 0 0 25px rgba(229, 9, 20, 0.35);
          transform: translateY(-2px);

          .down-arrow-icon {
            transform: translateY(2px);
          }
        }

        .down-arrow-icon {
          width: 16px;
          height: 16px;
          color: #ef4444;
          transition: transform 0.2s ease;
        }
      }

      .scroll-hint {
        font-size: 0.72rem;
        letter-spacing: 0.05em;
      }
    }

    .all-loaded-badge {
      margin-top: 3rem;
      padding: 2.5rem 2rem;
      text-align: center;
      border-radius: 16px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      background: rgba(17, 24, 39, 0.5);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.65rem;

      .all-loaded-stars {
        color: #ef4444;
        letter-spacing: 0.5em;
        font-size: 0.9rem;
      }

      .all-loaded-title {
        font-size: 1.25rem;
        font-weight: 750;
        color: #ffffff;
        letter-spacing: 0.06em;
      }

      .all-loaded-subtitle {
        font-size: 0.8rem;
        color: #94a3b8;
        max-width: 500px;
      }

      .btn-back-to-top {
        margin-top: 0.5rem;
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.15);
        color: #f1f5f9;
        font-size: 0.78rem;
        padding: 0.5rem 1.15rem;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s ease;

        &:hover {
          background: rgba(229, 9, 20, 0.2);
          border-color: rgba(229, 9, 20, 0.6);
          color: #fca5a5;
        }
      }
    }

    /* Floating Back to Top Action Button */
    .floating-back-to-top {
      position: fixed;
      bottom: 2rem;
      right: 2rem;
      z-index: 999;
      width: 46px;
      height: 46px;
      border-radius: 50%;
      background: rgba(17, 24, 39, 0.9);
      border: 1px solid rgba(229, 9, 20, 0.6);
      color: #ffffff;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.7), 0 0 20px rgba(229, 9, 20, 0.35);
      backdrop-filter: blur(12px);
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1px;
      transition: all 0.25s ease;
      animation: fadeIn 0.3s ease-out;

      svg {
        width: 16px;
        height: 16px;
      }

      span {
        font-size: 0.55rem;
        font-weight: 700;
        letter-spacing: 0.08em;
      }

      &:hover {
        background: #e50914;
        border-color: #ffffff;
        box-shadow: 0 0 30px rgba(229, 9, 20, 0.8);
        transform: translateY(-4px);
      }
    }

    /* ==========================================================================
       TRAILER TEASER LIGHTBOX MODAL
       ========================================================================== */
    .teaser-modal-overlay {
      position: fixed;
      inset: 0;
      z-index: 1000;
      background: rgba(0, 0, 0, 0.85);
      backdrop-filter: blur(16px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
      animation: fadeIn 0.25s ease-out;
    }

    .teaser-modal-card {
      background: #0d1117;
      border: 1px solid rgba(229, 9, 20, 0.4);
      border-radius: 16px;
      max-width: 760px;
      width: 100%;
      overflow: hidden;
      box-shadow: 0 25px 60px rgba(0, 0, 0, 0.9), 0 0 50px rgba(229, 9, 20, 0.25);
      animation: scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes scaleIn {
      from { transform: scale(0.92); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }

    .teaser-modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 1.5rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      background: rgba(15, 23, 42, 0.4);

      .teaser-header-left {
        display: flex;
        align-items: center;
        gap: 0.75rem;

        .teaser-live-tag {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          font-size: 0.72rem;
          color: #fca5a5;
          font-weight: 700;
        }

        .teaser-format {
          font-size: 0.68rem;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #94a3b8;
          padding: 0.15rem 0.45rem;
          border-radius: 4px;
        }
      }

      .teaser-close-btn {
        background: transparent;
        border: none;
        color: #94a3b8;
        font-size: 1.25rem;
        cursor: pointer;
        padding: 0.25rem 0.5rem;
        border-radius: 4px;

        &:hover {
          color: #ffffff;
          background: rgba(255, 255, 255, 0.1);
        }
      }
    }

    .teaser-stage {
      position: relative;
      width: 100%;
      height: 320px;
      overflow: hidden;
      background: #000000;

      .teaser-stage-bg {
        width: 100%;
        height: 100%;
        object-fit: cover;
        filter: brightness(0.5) contrast(1.2);
      }

      .teaser-stage-scrim {
        position: absolute;
        inset: 0;
        background: radial-gradient(circle, transparent 40%, rgba(0, 0, 0, 0.8) 100%);
      }

      .teaser-play-center {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.85rem;

        .teaser-pulse-ring {
          position: absolute;
          width: 80px;
          height: 80px;
          border-radius: 50%;
          border: 2px solid rgba(229, 9, 20, 0.6);
          animation: ringPulse 2s infinite ease-out;
        }

        .teaser-play-disc {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: linear-gradient(135deg, #e50914 0%, #b91c1c 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 25px rgba(229, 9, 20, 0.6);
          cursor: pointer;
          transition: transform 0.2s ease;

          &:hover {
            transform: scale(1.1);
          }

          .teaser-play-icon {
            width: 26px;
            height: 26px;
            color: #ffffff;
            margin-left: 3px;
          }
        }

        .teaser-play-hint {
          font-size: 0.72rem;
          color: #cbd5e1;
          letter-spacing: 0.1em;
          background: rgba(0, 0, 0, 0.6);
          padding: 0.3rem 0.8rem;
          border-radius: 9999px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
      }

      .teaser-audio-wave {
        position: absolute;
        bottom: 15px;
        right: 20px;
        display: flex;
        align-items: flex-end;
        gap: 3px;
        height: 22px;

        .wave-bar {
          width: 3px;
          background: #38bdf8;
          border-radius: 2px;
          animation: waveAnim 1.2s infinite ease-in-out alternate;

          &.b1 { height: 35%; animation-delay: 0.1s; }
          &.b2 { height: 75%; animation-delay: 0.3s; }
          &.b3 { height: 100%; animation-delay: 0.2s; }
          &.b4 { height: 45%; animation-delay: 0.4s; }
          &.b5 { height: 90%; animation-delay: 0.15s; }
          &.b6 { height: 60%; animation-delay: 0.35s; }
          &.b7 { height: 85%; animation-delay: 0.25s; }
          &.b8 { height: 40%; animation-delay: 0.45s; }
          &.b9 { height: 70%; animation-delay: 0.05s; }
        }
      }
    }

    @keyframes ringPulse {
      0% { transform: scale(0.8); opacity: 0.8; }
      100% { transform: scale(1.6); opacity: 0; }
    }

    @keyframes waveAnim {
      0% { transform: scaleY(0.3); }
      100% { transform: scaleY(1); }
    }

    .teaser-modal-body {
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;

      .teaser-info {
        display: flex;
        flex-direction: column;
        gap: 0.65rem;

        .teaser-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 0.4rem;

          .chip-sm {
            font-size: 0.68rem;
            background: rgba(255, 255, 255, 0.06);
            border: 1px solid rgba(255, 255, 255, 0.12);
            color: #e2e8f0;
            padding: 0.2rem 0.5rem;
            border-radius: 4px;
          }

          .text-cyan {
            color: #38bdf8;
            border-color: rgba(56, 189, 248, 0.3);
          }
        }

        .teaser-title {
          font-size: 1.45rem;
          font-weight: 750;
          color: #ffffff;
          margin: 0;
        }

        .teaser-synopsis {
          font-size: 0.88rem;
          color: #94a3b8;
          line-height: 1.55;
          margin: 0;
        }

        .teaser-venue {
          font-size: 0.76rem;
          color: #64748b;
        }
      }

      .teaser-actions {
        padding-top: 0.5rem;
        border-top: 1px solid rgba(255, 255, 255, 0.08);

        .btn-cinema-primary {
          display: block;
          text-align: center;
          text-decoration: none;
          background: linear-gradient(135deg, #e50914 0%, #b91c1c 100%);
          color: #ffffff;
          font-weight: 700;
          padding: 0.85rem 1rem;
          border-radius: 8px;
          box-shadow: 0 0 25px rgba(229, 9, 20, 0.45);
        }
      }
    }

    .loading-state,
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 5rem 2rem;
      text-align: center;
      gap: 1rem;

      .empty-icon {
        font-size: 3rem;
      }
    }

    .loader-spinner {
      width: 40px;
      height: 40px;
      border: 3px solid rgba(229, 9, 20, 0.2);
      border-top-color: #ef4444;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      100% { transform: rotate(360deg); }
    }
  `],
})
export class EventsListComponent implements OnInit, OnDestroy, AfterViewInit {
  private readonly apiService = inject(ApiService);

  @ViewChild('scrollSentinel') scrollSentinel?: ElementRef<HTMLDivElement>;

  readonly events = signal<EventItem[]>([]);
  readonly isLoading = signal<boolean>(true);

  // Spotlight Carousel State
  readonly activeSpotlightIndex = signal<number>(0);
  readonly isPaused = signal<boolean>(false);
  readonly activeTeaserMovie = signal<SpotlightMovie | null>(null);
  private autoRotateTimer: any = null;

  // 15-Pagination & Infinite Scroll State
  readonly pageSize = 15;
  readonly currentPage = signal<number>(1);
  readonly isLoadingMore = signal<boolean>(false);
  readonly selectedCategory = signal<string>('ALL');
  readonly showBackToTop = signal<boolean>(false);

  private sentinelObserver?: IntersectionObserver;

  readonly filterCategories: FilterCategory[] = [
    { id: 'ALL', label: 'All Formats' },
    { id: 'IMAX', label: 'IMAX Laser 3D' },
    { id: 'DOLBY', label: 'Dolby Cinema' },
    { id: '70MM', label: '70mm Film' },
    { id: 'VIP', label: 'VIP Recliner' },
    { id: '4DX', label: '4DX & ScreenX' },
  ];

  // Curated Premiere Movie Fallback Presets
  private readonly fallbackSpotlights: SpotlightMovie[] = [
    {
      id: 'dune-part-two-imax',
      title: 'Dune: Part Two (IMAX 70mm Laser Experience)',
      description: 'Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family in glorious 1.43:1 expanded aspect ratio.',
      backdropUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1920&q=85',
      posterUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80',
      venue: 'AURA Grand Dome • Neo Tokyo',
      auditorium: 'AUDITORIUM 01 // 70MM DUAL LASER',
      showtimeFormatted: 'TODAY 20:30 CST',
      formatBadges: ['IMAX LASER 3D', 'DOLBY ATMOS 128-CH', '1.43:1 FULL DOME'],
      rating: 'PG-13',
      duration: '2h 46m',
      occupancyPercent: 86,
      availableSeats: 7,
      totalSeats: 50,
      director: 'Denis Villeneuve',
    },
    {
      id: 'oppenheimer-70mm',
      title: 'Oppenheimer (70mm Ultra Resolution Revival)',
      description: 'The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb, projected in authentic photochemically printed 70mm film stock.',
      backdropUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1920&q=85',
      posterUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=600&q=80',
      venue: 'Metropolis Heritage Cinema • Hall 1',
      auditorium: 'AUDITORIUM 02 // HISTORIC 70MM',
      showtimeFormatted: 'TODAY 21:15 CST',
      formatBadges: ['70MM FILM STOCK', 'UNCOMPRESSED AUDIO', 'DIRECTOR MASTER'],
      rating: 'R-RATED',
      duration: '3h 00m',
      occupancyPercent: 92,
      availableSeats: 4,
      totalSeats: 50,
      director: 'Christopher Nolan',
    },
    {
      id: 'avatar-way-of-water',
      title: 'Avatar: The Way of Water (HFR 3D Laser Dome)',
      description: 'Jake Sully lives with his newfound family formed on the extrasolar moon Pandora. Experience Pandora in revolutionary 48fps High Frame Rate and Dolby Atmos multi-plane sound.',
      backdropUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1920&q=85',
      posterUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80',
      venue: 'Cyberplex Megadome • Shanghai',
      auditorium: 'AUDITORIUM 03 // 4K HFR 3D',
      showtimeFormatted: 'TOMORROW 18:00 CST',
      formatBadges: ['HFR 4K 48FPS', 'DOLBY CINEMA 3D', 'D-BOX MOTION'],
      rating: 'PG-13',
      duration: '3h 12m',
      occupancyPercent: 78,
      availableSeats: 11,
      totalSeats: 50,
      director: 'James Cameron',
    },
    {
      id: 'interstellar-anniversary',
      title: 'Interstellar (10th Anniversary IMAX Re-Release)',
      description: 'When Earth becomes uninhabitable in the future, a farmer and ex-NASA pilot is tasked to pilot a spacecraft along with a team of researchers to find a new planet for humans.',
      backdropUrl: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=1920&q=85',
      posterUrl: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=600&q=80',
      venue: 'Starlight Galactic Theater • Hall A',
      auditorium: 'AUDITORIUM 04 // COSMOS HORIZON',
      showtimeFormatted: 'FRI 20:00 CST',
      formatBadges: ['IMAX 70MM', 'DOLBY ATMOS', '10TH ANNIV SPEC'],
      rating: 'PG-13',
      duration: '2h 49m',
      occupancyPercent: 94,
      availableSeats: 3,
      totalSeats: 50,
      director: 'Christopher Nolan',
    },
    {
      id: 'spider-man-spider-verse',
      title: 'Spider-Man: Across the Spider-Verse (Dolby Cinema)',
      description: 'Miles Morales catapults across the Multiverse, where he encounters a team of Spider-People charged with protecting its very existence. Unmatched Dolby Vision HDR color gamut.',
      backdropUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1920&q=85',
      posterUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&q=80',
      venue: 'AURA Cinema City • Hall 5',
      auditorium: 'AUDITORIUM 05 // DOLBY VISION HDR',
      showtimeFormatted: 'SAT 15:30 CST',
      formatBadges: ['DOLBY VISION', 'DOLBY ATMOS', 'ANIMATED MASTERPIECE'],
      rating: 'PG',
      duration: '2h 20m',
      occupancyPercent: 82,
      availableSeats: 9,
      totalSeats: 50,
      director: 'Joaquim Dos Santos, Kemp Powers',
    },
  ];

  // Dynamic computation of spotlight movies
  readonly spotlightMovies = computed<SpotlightMovie[]>(() => {
    const list = this.events();
    if (!list || list.length === 0) {
      return this.fallbackSpotlights;
    }

    const top5 = list.slice(0, 5);
    return top5.map((evt, idx) => {
      const fallback = this.fallbackSpotlights[idx % this.fallbackSpotlights.length];
      const img = this.getSpotlightBackdropUrl(evt, idx, fallback);
      const total = evt.totalSeats || 50;
      const occPercent = 75 + (idx * 5) % 20;
      const avail = Math.max(1, Math.round(total * (1 - occPercent / 100)));

      let badges = ['IMAX LASER 3D', 'DOLBY ATMOS'];
      const titleLower = evt.title.toLowerCase();
      if (titleLower.includes('70mm')) {
        badges = ['IMAX 70MM', 'DOLBY ATMOS', 'ULTRA RES'];
      } else if (titleLower.includes('3d') || titleLower.includes('hfr')) {
        badges = ['HFR 4K 60FPS', 'DOLBY 3D', 'VIP RECLINER'];
      } else if (titleLower.includes('4dx')) {
        badges = ['4DX MOTION', 'DOLBY ATMOS', 'HAPTIC SURROUND'];
      } else if (titleLower.includes('dolby')) {
        badges = ['DOLBY VISION HDR', 'DOLBY ATMOS 128-CH', 'PREMIERE'];
      }

      const dateObj = evt.eventDate ? new Date(evt.eventDate) : new Date();
      const showtimeFormatted = dateObj.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      return {
        id: evt.id,
        title: evt.title,
        description: evt.description || fallback.description,
        backdropUrl: img,
        posterUrl: img,
        venue: evt.venue || fallback.venue,
        auditorium: `AUDITORIUM 0${idx + 1} // ${badges[0]} DOME`,
        showtimeFormatted,
        formatBadges: badges,
        rating: idx % 2 === 0 ? 'PG-13' : 'R-RATED',
        duration: ['2h 46m', '3h 00m', '2h 15m', '2h 38m', '2h 55m'][idx % 5],
        occupancyPercent: occPercent,
        availableSeats: avail,
        totalSeats: total,
        director: fallback.director,
      };
    });
  });

  readonly activeMovie = computed<SpotlightMovie>(() => {
    const list = this.spotlightMovies();
    if (!list || list.length === 0) return this.fallbackSpotlights[0];
    const idx = this.activeSpotlightIndex() % list.length;
    return list[idx] || list[0];
  });

  // Filtered screenings based on category tab
  readonly filteredEvents = computed<EventItem[]>(() => {
    const all = this.events();
    const cat = this.selectedCategory();
    if (cat === 'ALL') return all;

    return all.filter((e) => {
      const t = (e.title || '').toLowerCase();
      const c = (e.category || '').toLowerCase();
      if (cat === 'IMAX') return t.includes('imax') || c.includes('imax') || t.includes('laser');
      if (cat === 'DOLBY') return t.includes('dolby') || c.includes('dolby') || t.includes('atmos');
      if (cat === '70MM') return t.includes('70mm') || c.includes('70mm');
      if (cat === 'VIP') return t.includes('vip') || c.includes('vip') || t.includes('recliner');
      if (cat === '4DX') return t.includes('4dx') || c.includes('4dx') || t.includes('screenx');
      return true;
    });
  });

  // 15-Items Paged Slicing for Infinite Scroll
  readonly displayedEvents = computed<EventItem[]>(() => {
    const filtered = this.filteredEvents();
    const limit = this.currentPage() * this.pageSize;
    return filtered.slice(0, limit);
  });

  readonly hasMore = computed<boolean>(() => {
    return this.displayedEvents().length < this.filteredEvents().length;
  });

  readonly progressPercent = computed<number>(() => {
    const total = this.filteredEvents().length;
    if (total === 0) return 0;
    return Math.min(100, Math.round((this.displayedEvents().length / total) * 100));
  });

  @HostListener('window:scroll')
  onWindowScroll(): void {
    if (typeof window !== 'undefined') {
      this.showBackToTop.set(window.scrollY > 450);
    }
  }

  ngOnInit(): void {
    this.loadEvents();
    this.startAutoRotate();
  }

  ngAfterViewInit(): void {
    this.initIntersectionObserver();
  }

  ngOnDestroy(): void {
    this.stopAutoRotate();
    if (this.sentinelObserver) {
      this.sentinelObserver.disconnect();
    }
  }

  private initIntersectionObserver(): void {
    if (typeof window !== 'undefined' && 'IntersectionObserver' in window) {
      this.sentinelObserver = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (entry && entry.isIntersecting && this.hasMore() && !this.isLoadingMore() && !this.isLoading()) {
            this.loadMore();
          }
        },
        { rootMargin: '250px' }
      );

      // Connect observer if sentinel is present
      setTimeout(() => {
        if (this.scrollSentinel?.nativeElement && this.sentinelObserver) {
          this.sentinelObserver.observe(this.scrollSentinel.nativeElement);
        }
      }, 300);
    }
  }

  // Infinite Scroll Trigger
  loadMore(): void {
    if (!this.hasMore() || this.isLoadingMore()) return;

    this.isLoadingMore.set(true);
    setTimeout(() => {
      this.currentPage.update((p) => p + 1);
      this.isLoadingMore.set(false);

      // Re-bind sentinel if more items remain
      if (this.hasMore() && this.scrollSentinel?.nativeElement && this.sentinelObserver) {
        this.sentinelObserver.observe(this.scrollSentinel.nativeElement);
      }
    }, 450);
  }

  setCategory(catId: string): void {
    this.selectedCategory.set(catId);
    this.currentPage.set(1);
    setTimeout(() => {
      if (this.hasMore() && this.scrollSentinel?.nativeElement && this.sentinelObserver) {
        this.sentinelObserver.observe(this.scrollSentinel.nativeElement);
      }
    }, 200);
  }

  getCategoryCount(catId: string): number {
    const all = this.events();
    if (catId === 'ALL') return all.length;
    return all.filter((e) => {
      const t = (e.title || '').toLowerCase();
      const c = (e.category || '').toLowerCase();
      if (catId === 'IMAX') return t.includes('imax') || c.includes('imax') || t.includes('laser');
      if (catId === 'DOLBY') return t.includes('dolby') || c.includes('dolby') || t.includes('atmos');
      if (catId === '70MM') return t.includes('70mm') || c.includes('70mm');
      if (catId === 'VIP') return t.includes('vip') || c.includes('vip') || t.includes('recliner');
      if (catId === '4DX') return t.includes('4dx') || c.includes('4dx') || t.includes('screenx');
      return true;
    }).length;
  }

  scrollToTop(): void {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  startAutoRotate(): void {
    this.stopAutoRotate();
    this.autoRotateTimer = setInterval(() => {
      if (!this.isPaused() && !this.activeTeaserMovie()) {
        const total = this.spotlightMovies().length;
        if (total > 0) {
          this.activeSpotlightIndex.update((curr) => (curr + 1) % total);
        }
      }
    }, 7000);
  }

  stopAutoRotate(): void {
    if (this.autoRotateTimer) {
      clearInterval(this.autoRotateTimer);
      this.autoRotateTimer = null;
    }
  }

  selectSpotlight(idx: number): void {
    this.activeSpotlightIndex.set(idx);
    this.startAutoRotate();
  }

  pauseAutoRotate(): void {
    this.isPaused.set(true);
  }

  resumeAutoRotate(): void {
    this.isPaused.set(false);
  }

  openTrailerTeaser(movie: SpotlightMovie): void {
    this.activeTeaserMovie.set(movie);
  }

  closeTrailerTeaser(): void {
    this.activeTeaserMovie.set(null);
  }

  loadEvents(): void {
    this.isLoading.set(true);
    this.apiService.getEvents().subscribe({
      next: (data) => {
        this.events.set(data || []);
        this.isLoading.set(false);
        this.currentPage.set(1);
        setTimeout(() => {
          if (this.hasMore() && this.scrollSentinel?.nativeElement && this.sentinelObserver) {
            this.sentinelObserver.observe(this.scrollSentinel.nativeElement);
          }
        }, 300);
      },
      error: (err) => {
        console.warn('Backend events not loaded, using fallback blockbuster movie catalog:', err.message);
        this.events.set([
          {
            id: 'dune-part-two',
            title: 'Dune: Part Two (IMAX 70mm Laser Experience)',
            category: 'IMAX_70MM',
            imageUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1200&q=80',
            description: 'Denis Villeneuve epic sci-fi conclusion in pristine 1.43:1 dual laser projection.',
            venue: 'AURA Grand Dome • Hall 1',
            eventDate: new Date().toISOString(),
            totalSeats: 50,
          },
          {
            id: 'oppenheimer-70mm',
            title: 'Oppenheimer (70mm Ultra Resolution Revival)',
            category: 'HISTORIC_70MM',
            imageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80',
            description: 'Christopher Nolan masterpiece presented on high-contrast 70mm 5-perf celluloid prints.',
            venue: 'Metropolis Heritage Cinema • Hall 1',
            eventDate: new Date(Date.now() + 86400000).toISOString(),
            totalSeats: 50,
          },
          {
            id: 'avatar-way-of-water',
            title: 'Avatar: The Way of Water (HFR 3D Laser Dome)',
            category: 'DOLBY_CINEMA_3D',
            imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80',
            description: 'Explore the oceanic reefs of Pandora with High Frame Rate 48fps and Dolby Atmos.',
            venue: 'Cyberplex Megadome • Hall 3',
            eventDate: new Date(Date.now() + 86400000 * 2).toISOString(),
            totalSeats: 50,
          },
          {
            id: 'interstellar-anniv',
            title: 'Interstellar (10th Anniversary IMAX Re-Release)',
            category: 'IMAX_70MM',
            imageUrl: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=1200&q=80',
            description: 'Mankind was born on Earth. It was never meant to die here. 10th anniversary limited screening.',
            venue: 'Starlight Galactic Theater • Hall A',
            eventDate: new Date(Date.now() + 86400000 * 3).toISOString(),
            totalSeats: 50,
          },
          {
            id: 'spider-verse',
            title: 'Spider-Man: Across the Spider-Verse (Dolby Cinema)',
            category: 'DOLBY_VISION_HDR',
            imageUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1200&q=80',
            description: 'Groundbreaking visual art with Dolby Vision HDR and immersive positional audio.',
            venue: 'AURA Cinema City • Hall 5',
            eventDate: new Date(Date.now() + 86400000 * 4).toISOString(),
            totalSeats: 50,
          },
        ]);
        this.isLoading.set(false);
      },
    });
  }

  getSpotlightBackdropUrl(evt: EventItem, idx: number, fallback: SpotlightMovie): string {
    const title = (evt.title || '').toLowerCase();
    if (title.includes('mission') || title.includes('reckoning')) {
      return 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1920&q=85';
    }
    if (title.includes('matrix')) {
      return 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1920&q=85';
    }
    if (title.includes('furiosa') || title.includes('mad max')) {
      return 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1920&q=85';
    }
    if (title.includes('everything') || title.includes('multiverse')) {
      return 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1920&q=85';
    }
    if (title.includes('quiet place')) {
      return 'https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=1920&q=85';
    }
    if (title.includes('dune')) {
      return 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1920&q=85';
    }
    if (title.includes('oppenheimer')) {
      return 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1920&q=85';
    }
    if (title.includes('spider')) {
      return 'https://images.unsplash.com/photo-1635805737707-575885ab0820?auto=format&fit=crop&w=1920&q=85';
    }
    if (title.includes('interstellar')) {
      return 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=1920&q=85';
    }
    if (evt.imageUrl && !evt.imageUrl.includes('photo-1519074069444-1ba4eae16e60')) {
      return evt.imageUrl;
    }
    return fallback.backdropUrl;
  }

  getEventImageUrl(event: EventItem): string {
    if (event.imageUrl) return event.imageUrl;
    const title = (event.title || '').toLowerCase();
    if (title.includes('dune') || title.includes('sci-fi') || title.includes('desert')) {
      return 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1200&q=80';
    }
    if (title.includes('oppenheimer') || title.includes('atomic') || title.includes('fire')) {
      return 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80';
    }
    if (title.includes('avatar') || title.includes('water') || title.includes('ocean')) {
      return 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80';
    }
    if (title.includes('interstellar') || title.includes('space') || title.includes('star')) {
      return 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=1200&q=80';
    }
    if (title.includes('spider') || title.includes('hero') || title.includes('multiverse')) {
      return 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1200&q=80';
    }
    if (title.includes('batman') || title.includes('dark')) {
      return 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1200&q=80';
    }
    return 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=80';
  }

  formatCategory(event: EventItem): string {
    if (event.category) {
      return '#' + event.category.replace(/_/g, ' ');
    }
    const t = (event.title || '').toLowerCase();
    if (t.includes('imax') || t.includes('70mm')) return '#IMAX 70MM';
    if (t.includes('dolby')) return '#DOLBY CINEMA';
    if (t.includes('3d') || t.includes('hfr')) return '#HFR 3D DOME';
    if (t.includes('4dx')) return '#4DX MOTION';
    return '#BLOCKBUSTER';
  }

  onImgError(event: any, item: EventItem): void {
    event.target.src = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=80';
  }

  onBackdropError(event: any): void {
    event.target.src = 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1920&q=85';
  }

  onThumbError(event: any): void {
    event.target.src = 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80';
  }
}
