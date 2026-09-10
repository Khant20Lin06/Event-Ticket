import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { EventItem } from '../../core/models/event.model';
import { Seat, SeatStatus } from '../../core/models/seat.model';

interface ToastNotification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface RowGroup {
  rowLabel: string;
  tier: string;
  seats: Seat[];
}

@Component({
  selector: 'app-organizer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="enterprise-console">
      <!-- Floating Toast Notifications (Top Right) -->
      <div class="toast-container">
        @for (toast of toasts(); track toast.id) {
          <div class="toast-item" [ngClass]="toast.type">
            <div class="toast-indicator"></div>
            <div class="toast-body">
              <span class="toast-icon">
                @if (toast.type === 'success') { ✓ }
                @else if (toast.type === 'error') { ✕ }
                @else { ℹ }
              </span>
              <span class="toast-text font-display">{{ toast.message }}</span>
            </div>
            <button (click)="removeToast(toast.id)" class="toast-close-btn">×</button>
          </div>
        }
      </div>

      <!-- Top Executive HUD Bar -->
      <header class="console-header glass-card">
        <div class="header-main-row">
          <div class="brand-block">
            <div class="system-status-chip">
              <span class="status-pulse-dot"></span>
              <span class="font-mono text-xs">CLUSTER NODE: ONLINE // LATENCY 0.42ms</span>
            </div>
            <h1 class="console-title font-display">AURA ENTERPRISE OPERATIONS</h1>
            <p class="console-tagline">
              Mission-critical control console for real-time seat inventory, high-concurrency admission flow, and distributed Redis key lifecycle.
            </p>
          </div>

          <!-- Role & Superuser Identity -->
          <div class="identity-card">
            <div class="role-pill" [ngClass]="authService.isAdmin() ? 'role-admin' : 'role-organizer'">
              <span class="role-icon-badge">{{ authService.isAdmin() ? '🛡️' : '🎪' }}</span>
              <div class="role-meta">
                <span class="role-title font-mono">{{ authService.isAdmin() ? 'PLATFORM ADMIN' : 'ORGANIZER' }}</span>
                <span class="role-email font-mono">{{ authService.currentUser()?.email || 'admin@aura.live' }}</span>
              </div>
            </div>

            @if (!authService.isAdmin()) {
              <button (click)="quickSwitchAdmin()" class="btn-quick-admin font-mono">
                ⚡ Switch to Admin
              </button>
            }
          </div>
        </div>

        <!-- Telemetry HUD Metric Chips -->
        <div class="hud-stats-strip font-mono">
          <div class="hud-stat-box">
            <span class="hud-label">ACTIVE EVENTS</span>
            <span class="hud-val text-cyan">{{ events().length }} LIVE</span>
          </div>
          <div class="hud-stat-box">
            <span class="hud-label">TOTAL SEATS MANAGED</span>
            <span class="hud-val text-indigo">{{ totalSeatsCount() }} UNITS</span>
          </div>
          <div class="hud-stat-box">
            <span class="hud-label">LOCK PROTOCOL</span>
            <span class="hud-val text-emerald">ATOMIC REDIS LUA</span>
          </div>
          <div class="hud-stat-box">
            <span class="hud-label">DOUBLE-BOOKING GUARDS</span>
            <span class="hud-val text-emerald">100% PREVENTED</span>
          </div>
        </div>

        <!-- Sleek SVG Navigation Tabs -->
        <nav class="console-nav">
          <button
            class="nav-tab"
            [class.active]="activeTab() === 'seats'"
            (click)="selectTab('seats')"
          >
            <svg class="tab-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="7" height="7" rx="1.5"></rect>
              <rect x="14" y="3" width="7" height="7" rx="1.5"></rect>
              <rect x="14" y="14" width="7" height="7" rx="1.5"></rect>
              <rect x="3" y="14" width="7" height="7" rx="1.5"></rect>
            </svg>
            <span class="font-display">Seat Inventory Matrix</span>
          </button>

          <button
            class="nav-tab"
            [class.active]="activeTab() === 'events'"
            (click)="selectTab('events')"
          >
            <svg class="tab-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
              <path d="M12 4v16"></path>
              <path d="M4 12h16"></path>
            </svg>
            <span class="font-display">Events & Ticketing Hub</span>
          </button>

          <button
            class="nav-tab"
            [class.active]="activeTab() === 'traffic'"
            (click)="selectTab('traffic')"
          >
            <svg class="tab-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="4" y1="21" x2="4" y2="14"></line>
              <line x1="4" y1="10" x2="4" y2="3"></line>
              <line x1="12" y1="21" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12" y2="3"></line>
              <line x1="20" y1="21" x2="20" y2="16"></line>
              <line x1="20" y1="12" x2="20" y2="3"></line>
              <line x1="1" y1="14" x2="7" y2="14"></line>
              <line x1="9" y1="8" x2="15" y2="8"></line>
              <line x1="17" y1="16" x2="23" y2="16"></line>
            </svg>
            <span class="font-display">Traffic & Admission Limiter</span>
            @if (!authService.isAdmin()) {
              <span class="nav-lock-badge font-mono">ADMIN ONLY</span>
            }
          </button>

          <button
            class="nav-tab"
            [class.active]="activeTab() === 'sweeper'"
            (click)="selectTab('sweeper')"
          >
            <svg class="tab-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              <path d="M12 8v4"></path>
              <path d="M12 16h.01"></path>
            </svg>
            <span class="font-display">Deadlock Recovery Sweeper</span>
            @if (!authService.isAdmin()) {
              <span class="nav-lock-badge font-mono">ADMIN ONLY</span>
            }
          </button>
        </nav>
      </header>

      <!-- TAB 1: SEAT MATRIX CONTROLLER (DEFAULT) -->
      @if (activeTab() === 'seats') {
        <section class="tab-view-container animate-fade-in">
          <!-- Filter & Control Toolbar -->
          <div class="matrix-toolbar glass-card">
            <div class="event-selector-cluster">
              <label class="toolbar-label font-mono">TARGET EVENT</label>
              <div class="custom-select-wrapper">
                <select
                  [ngModel]="selectedEventId()"
                  (ngModelChange)="onEventChange($event)"
                  class="custom-select font-display"
                >
                  @for (evt of events(); track evt.id) {
                    <option [value]="evt.id">{{ evt.title }} — {{ evt.venue }}</option>
                  }
                </select>
                <span class="select-chevron">▾</span>
              </div>
            </div>

            <!-- Seat Status Legend -->
            <div class="legend-cluster font-mono text-xs">
              <div class="legend-pill"><span class="legend-indicator is-avail"></span> Available ({{ statusCounts().available }})</div>
              <div class="legend-pill"><span class="legend-indicator is-held"></span> Locked/Held ({{ statusCounts().held }})</div>
              <div class="legend-pill"><span class="legend-indicator is-booked"></span> Booked ({{ statusCounts().booked }})</div>
              <div class="legend-pill"><span class="legend-indicator is-blocked"></span> VIP Blocked ({{ statusCounts().blocked }})</div>
              <div class="legend-pill"><span class="legend-indicator is-maint"></span> Maintenance ({{ statusCounts().maintenance }})</div>
            </div>
          </div>

          <!-- Main Layout: Visual Arena on Left, Inspector on Right -->
          <div class="matrix-split-layout">
            <!-- Left: Visual Arena Map -->
            <div class="arena-canvas-card glass-card">
              <!-- Futuristic Stage Graphic -->
              <div class="stage-apron">
                <div class="stage-spotlight-beams"></div>
                <div class="stage-plate font-mono">
                  <span class="stage-title">STAGE & ACOUSTIC RIG // FRONT OF HOUSE</span>
                </div>
              </div>

              @if (isLoadingSeats()) {
                <div class="matrix-loader-state font-mono">
                  <span class="spinner-ring"></span>
                  <span>SYNCHRONIZING SEAT REGISTRY FROM POSTGRES & REDIS...</span>
                </div>
              } @else {
                <div class="arena-rows-wrapper">
                  @for (group of groupedSeats(); track group.rowLabel) {
                    <div class="arena-row-container">
                      <div class="row-badge-pill font-mono">
                        <span class="row-char">{{ group.rowLabel }}</span>
                        <span class="row-tier-label text-xs">{{ group.tier }}</span>
                      </div>

                      <div class="row-seats-track">
                        @for (seat of group.seats; track seat.id) {
                          <button
                            type="button"
                            class="seat-capsule font-mono"
                            [ngClass]="getSeatCapsuleClass(seat)"
                            [class.selected]="selectedSeat()?.id === seat.id"
                            (click)="selectSeat(seat)"
                            [title]="'Seat ' + seat.seatNumber + ' • $' + seat.price + ' • ' + seat.status"
                          >
                            <span class="seat-num">{{ seat.seatNumber }}</span>
                            <span class="seat-cost">\${{ seat.price }}</span>
                          </button>
                        }
                      </div>
                    </div>
                  } @empty {
                    <div class="empty-arena-state font-mono">
                      <span>No seats populated. Create an event in Events Hub to instantiate inventory.</span>
                    </div>
                  }
                </div>
              }
            </div>

            <!-- Right: Interactive Seat Inspector -->
            <aside class="seat-inspector-card glass-card">
              <div class="inspector-header">
                <span class="section-tag font-mono">INVENTORY INSPECTOR</span>
                <h2 class="inspector-title font-display">
                  {{ selectedSeat() ? 'Seat ' + selectedSeat()!.seatNumber : 'Select a Seat' }}
                </h2>
              </div>

              @if (selectedSeat(); as seat) {
                <div class="inspector-details-sheet font-mono">
                  <div class="spec-row">
                    <span class="spec-label">CURRENT STATUS</span>
                    <span class="spec-badge" [ngClass]="seat.status.toLowerCase()">
                      <span class="badge-dot"></span>
                      {{ seat.status }}
                    </span>
                  </div>

                  <div class="spec-row">
                    <span class="spec-label">SEAT TIER</span>
                    <span class="spec-val text-indigo font-bold">{{ seat.tier || 'STANDARD' }}</span>
                  </div>

                  <div class="spec-row">
                    <span class="spec-label">ACTIVE PRICE</span>
                    <span class="spec-val text-cyan font-bold text-lg">\${{ seat.price }}</span>
                  </div>

                  @if (seat.heldUntil) {
                    <div class="spec-row">
                      <span class="spec-label">TTL HOLD EXPIRES</span>
                      <span class="spec-val text-amber">{{ seat.heldUntil | date:'mediumTime' }}</span>
                    </div>
                  }
                </div>

                <!-- Price Management -->
                <div class="control-box">
                  <label class="control-label font-mono">OVERRIDE BASE PRICE ($USD)</label>
                  
                  <!-- Quick Preset Chips -->
                  <div class="quick-chips-row font-mono">
                    <button type="button" (click)="seatEditPrice = 45" [class.active]="seatEditPrice === 45" class="chip-btn">$45</button>
                    <button type="button" (click)="seatEditPrice = 75" [class.active]="seatEditPrice === 75" class="chip-btn">$75</button>
                    <button type="button" (click)="seatEditPrice = 120" [class.active]="seatEditPrice === 120" class="chip-btn">$120</button>
                    <button type="button" (click)="seatEditPrice = 250" [class.active]="seatEditPrice === 250" class="chip-btn">$250</button>
                  </div>

                  <div class="price-input-cluster">
                    <div class="currency-affix font-mono">$</div>
                    <input
                      type="number"
                      [(ngModel)]="seatEditPrice"
                      class="custom-input font-mono"
                      min="1"
                      max="5000"
                    />
                    <button
                      type="button"
                      (click)="saveSeatPrice()"
                      class="btn-primary-action font-display"
                      [disabled]="isUpdatingSeat()"
                    >
                      @if (isUpdatingSeat()) {
                        <span class="spinner-sm"></span>
                      } @else {
                        <span>Apply</span>
                      }
                    </button>
                  </div>
                </div>

                <!-- Manual Status Override -->
                <div class="control-box">
                  <label class="control-label font-mono">LIFECYCLE STATUS OVERRIDE</label>
                  <div class="status-action-grid font-mono">
                    <button
                      type="button"
                      (click)="setSeatStatus('AVAILABLE')"
                      class="action-pill pill-avail"
                      [class.current]="seat.status === 'AVAILABLE'"
                      [disabled]="seat.status === 'AVAILABLE' || isUpdatingSeat()"
                    >
                      ✓ Set Available
                    </button>

                    <button
                      type="button"
                      (click)="setSeatStatus('BLOCKED')"
                      class="action-pill pill-block"
                      [class.current]="seat.status === 'BLOCKED'"
                      [disabled]="seat.status === 'BLOCKED' || isUpdatingSeat()"
                    >
                      🔒 Hold for VIP / Sponsors
                    </button>

                    <button
                      type="button"
                      (click)="setSeatStatus('MAINTENANCE')"
                      class="action-pill pill-maint"
                      [class.current]="seat.status === 'MAINTENANCE'"
                      [disabled]="seat.status === 'MAINTENANCE' || isUpdatingSeat()"
                    >
                      ⚠️ Flag Maintenance
                    </button>
                  </div>
                </div>
              } @else {
                <div class="inspector-empty-guide font-mono">
                  <div class="empty-mouse-icon">🖱️</div>
                  <span>Click on any seat capsule in the arena map to inspect metadata, reprice tiers, or override availability.</span>
                </div>
              }
            </aside>
          </div>
        </section>
      }

      <!-- TAB 2: EVENTS & TICKETING HUB -->
      @if (activeTab() === 'events') {
        <section class="tab-view-container animate-fade-in">
          <div class="events-hub-grid">
            <!-- Create Event Form -->
            <div class="create-event-panel glass-card">
              <div class="panel-header">
                <span class="section-tag font-mono">CINEMA INGRESS PIPELINE</span>
                <h2 class="panel-title font-display">Instantiate Movie Screening</h2>
                <p class="panel-sub">Provisions high-concurrency movie tickets, auditorium seat matrix, and atomic Redis locks.</p>
              </div>

              <form (ngSubmit)="handleCreateEvent()" class="curated-form">
                <div class="form-field">
                  <div class="field-label-row">
                    <label class="field-label font-mono">MOVIE / SCREENING TITLE</label>
                    <span class="field-hint font-mono text-xs">REQUIRED</span>
                  </div>
                  <div class="input-with-icon-wrapper">
                    <svg class="input-lead-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                    </svg>
                    <input
                      type="text"
                      [(ngModel)]="newEventTitle"
                      name="title"
                      placeholder="e.g. Dune: Part Two (IMAX 3D Laser)"
                      required
                      class="custom-input font-display"
                    />
                  </div>
                </div>

                <div class="form-split-row">
                  <div class="form-field">
                    <div class="field-label-row">
                      <label class="field-label font-mono">AUDITORIUM / THEATER</label>
                      <span class="field-hint font-mono text-xs">SCREEN CONFIG</span>
                    </div>
                    <div class="input-with-icon-wrapper">
                      <svg class="input-lead-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
                        <circle cx="12" cy="10" r="3"></circle>
                      </svg>
                      <input
                        type="text"
                        [(ngModel)]="newEventVenue"
                        name="venue"
                        placeholder="e.g. IMAX Laser Auditorium 1 // Screen 4"
                        required
                        class="custom-input"
                      />
                    </div>
                  </div>

                  <div class="form-field">
                    <div class="field-label-row">
                      <label class="field-label font-mono">SHOWTIME DATE & TIME</label>
                      <span class="field-hint font-mono text-xs">SHOWTIME</span>
                    </div>
                    <div class="input-with-icon-wrapper">
                      <svg class="input-lead-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                      </svg>
                      <input
                        type="datetime-local"
                        [(ngModel)]="newEventDate"
                        name="eventDate"
                        required
                        class="custom-input font-mono date-styled"
                      />
                    </div>
                  </div>
                </div>

                <!-- Movie Poster Visual Selection (Presets, Direct URL, File Upload) -->
                <div class="form-field">
                  <div class="field-label-row">
                    <label class="field-label font-mono">MOVIE POSTER VISUAL</label>
                    <span class="field-hint font-mono text-xs">PRESET // URL // UPLOAD</span>
                  </div>

                  <!-- Source Mode Tabs -->
                  <div class="poster-mode-tabs font-mono">
                    <button
                      type="button"
                      (click)="setImageSourceMode('preset')"
                      class="mode-tab-btn"
                      [class.active]="imageSourceMode() === 'preset'"
                    >
                      🎬 Blockbuster Presets
                    </button>
                    <button
                      type="button"
                      (click)="setImageSourceMode('url')"
                      class="mode-tab-btn"
                      [class.active]="imageSourceMode() === 'url'"
                    >
                      🔗 Web Image URL
                    </button>
                    <button
                      type="button"
                      (click)="setImageSourceMode('upload')"
                      class="mode-tab-btn"
                      [class.active]="imageSourceMode() === 'upload'"
                    >
                      📁 Upload Local File
                    </button>
                  </div>

                  <!-- Mode 1: Cinema Presets -->
                  @if (imageSourceMode() === 'preset') {
                    <div class="poster-presets-grid animate-fade-in">
                      <button
                        type="button"
                        (click)="setPosterPreset('dune')"
                        class="poster-card-option"
                        [class.selected]="activePreset() === 'dune'"
                      >
                        <img src="https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=400&auto=format&fit=crop" alt="Dune" class="preset-thumb" />
                        <div class="preset-meta">
                          <span class="preset-name font-display">Dune: Part Two</span>
                          <span class="preset-genre font-mono">#IMAX_3D</span>
                        </div>
                      </button>

                      <button
                        type="button"
                        (click)="setPosterPreset('oppenheimer')"
                        class="poster-card-option"
                        [class.selected]="activePreset() === 'oppenheimer'"
                      >
                        <img src="https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=400&auto=format&fit=crop" alt="Oppenheimer" class="preset-thumb" />
                        <div class="preset-meta">
                          <span class="preset-name font-display">Oppenheimer</span>
                          <span class="preset-genre font-mono">#70MM_IMAX</span>
                        </div>
                      </button>

                      <button
                        type="button"
                        (click)="setPosterPreset('spiderman')"
                        class="poster-card-option"
                        [class.selected]="activePreset() === 'spiderman'"
                      >
                        <img src="https://images.unsplash.com/photo-1635805737707-575885ab0820?q=80&w=400&auto=format&fit=crop" alt="Spider-Man" class="preset-thumb" />
                        <div class="preset-meta">
                          <span class="preset-name font-display">Spider-Verse</span>
                          <span class="preset-genre font-mono">#DOLBY</span>
                        </div>
                      </button>

                      <button
                        type="button"
                        (click)="setPosterPreset('bladerunner')"
                        class="poster-card-option"
                        [class.selected]="activePreset() === 'bladerunner'"
                      >
                        <img src="https://images.unsplash.com/photo-1508739773434-c26b3d09e071?q=80&w=400&auto=format&fit=crop" alt="Blade Runner" class="preset-thumb" />
                        <div class="preset-meta">
                          <span class="preset-name font-display">Blade Runner 2049</span>
                          <span class="preset-genre font-mono">#4K_LASER</span>
                        </div>
                      </button>

                      <button
                        type="button"
                        (click)="setPosterPreset('interstellar')"
                        class="poster-card-option"
                        [class.selected]="activePreset() === 'interstellar'"
                      >
                        <img src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=400&auto=format&fit=crop" alt="Interstellar" class="preset-thumb" />
                        <div class="preset-meta">
                          <span class="preset-name font-display">Interstellar</span>
                          <span class="preset-genre font-mono">#IMAX_70MM</span>
                        </div>
                      </button>

                      <button
                        type="button"
                        (click)="setPosterPreset('batman')"
                        class="poster-card-option"
                        [class.selected]="activePreset() === 'batman'"
                      >
                        <img src="https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?q=80&w=400&auto=format&fit=crop" alt="The Batman" class="preset-thumb" />
                        <div class="preset-meta">
                          <span class="preset-name font-display">The Batman: Part II</span>
                          <span class="preset-genre font-mono">#DOLBY_ATMOS</span>
                        </div>
                      </button>
                    </div>
                  }

                  <!-- Mode 2: Direct Image URL -->
                  @if (imageSourceMode() === 'url') {
                    <div class="url-input-container animate-fade-in">
                      <div class="input-with-icon-wrapper">
                        <svg class="input-lead-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <circle cx="12" cy="12" r="10"></circle>
                          <line x1="2" y1="12" x2="22" y2="12"></line>
                          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                        </svg>
                        <input
                          type="url"
                          [(ngModel)]="customImageUrl"
                          (ngModelChange)="onCustomUrlChange()"
                          name="customImageUrl"
                          placeholder="https://images.unsplash.com/photo-example.jpg"
                          class="custom-input font-mono"
                        />
                        @if (customImageUrl) {
                          <button type="button" (click)="clearCustomImage()" class="clear-url-btn" title="Clear URL">✕</button>
                        }
                      </div>
                      <p class="input-sub-hint text-xs text-muted font-mono">
                        💡 Paste any direct image link (.jpg, .png, .webp). Preview updates instantly.
                      </p>
                    </div>
                  }

                  <!-- Mode 3: Local File Upload -->
                  @if (imageSourceMode() === 'upload') {
                    <div
                      class="upload-dropzone animate-fade-in"
                      (drop)="onFileDropped($event)"
                      (dragover)="onDragOver($event)"
                    >
                      <input
                        type="file"
                        id="moviePosterFileInput"
                        accept="image/png, image/jpeg, image/webp, image/gif"
                        (change)="onFileSelected($event)"
                        class="file-input-hidden"
                      />
                      <label for="moviePosterFileInput" class="dropzone-label">
                        <div class="dropzone-icon">📁</div>
                        <div class="dropzone-text">
                          <span class="dropzone-main">Drop movie poster here or <span class="browse-link">browse</span></span>
                          <span class="dropzone-sub font-mono text-xs">Supports PNG, JPG, WEBP (Max 2.5MB)</span>
                        </div>
                      </label>
                      @if (uploadedFileName) {
                        <div class="uploaded-file-tag font-mono">
                          <span>✓ {{ uploadedFileName }}</span>
                          <button type="button" (click)="clearCustomImage()" class="remove-file-btn">✕</button>
                        </div>
                      }
                    </div>
                  }

                  @if (imageUploadError) {
                    <p class="error-text font-mono text-xs text-rose">{{ imageUploadError }}</p>
                  }

                  <!-- Active Poster Live Preview Card -->
                  <div class="active-poster-preview-card">
                    <div class="preview-thumb-box">
                      <img [src]="newEventImage" alt="Poster Preview" class="preview-poster-img" (error)="onPosterPreviewError()" />
                      <div class="preview-overlay">
                        <span class="preview-badge font-mono">
                          {{ imageSourceMode() === 'upload' ? 'LOCAL UPLOAD' : (imageSourceMode() === 'url' ? 'CUSTOM URL' : 'CINEMA PRESET') }}
                        </span>
                      </div>
                    </div>
                    <div class="preview-meta-box">
                      <div class="preview-meta-title font-display">{{ newEventTitle || 'Untitled Movie Screening' }}</div>
                      <div class="preview-meta-venue font-mono text-xs">{{ newEventVenue || 'Select Cinema Auditorium' }}</div>
                      <div class="preview-meta-genre font-mono text-xs text-cyan">✦ {{ newEventCategory }}</div>
                      <button type="button" (click)="clearCustomImage()" class="btn-reset-preview font-mono text-xs">
                        ↺ Reset to Default
                      </button>
                    </div>
                  </div>
                </div>

                <div class="form-field">
                  <label class="field-label font-mono">CINEMA EXPERIENCE BRIEF / SYNOPSIS</label>
                  <textarea
                    [(ngModel)]="newEventDesc"
                    name="description"
                    rows="3"
                    placeholder="Describe the projection format, Dolby Atmos audio dynamics, and sensory features..."
                    class="custom-input textarea-styled"
                  ></textarea>
                </div>

                <div class="form-split-row">
                  <div class="form-field">
                    <div class="field-label-row">
                      <label class="field-label font-mono">THEATER SEAT CAPACITY</label>
                      <span class="field-hint font-mono text-xs">20 - 300 SEATS</span>
                    </div>
                    <div class="input-with-icon-wrapper">
                      <svg class="input-lead-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                      </svg>
                      <input
                        type="number"
                        [(ngModel)]="newEventSeats"
                        name="totalSeats"
                        min="20"
                        max="300"
                        class="custom-input font-mono"
                      />
                    </div>
                  </div>

                  <div class="form-field">
                    <div class="field-label-row">
                      <label class="field-label font-mono">AUDITORIUM FORMAT / GENRE</label>
                      <span class="field-hint font-mono text-xs">CINEMA FORMAT</span>
                    </div>
                    <div class="custom-select-container">
                      <svg class="input-lead-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path>
                        <line x1="4" y1="22" x2="4" y2="15"></line>
                      </svg>
                      <select [(ngModel)]="newEventCategory" name="category" class="custom-select font-mono">
                        <option value="IMAX_3D">🎬 IMAX 3D LASER AUDITORIUM</option>
                        <option value="DOLBY_CINEMA">🔊 DOLBY CINEMA & ATMOS</option>
                        <option value="BLOCKBUSTER">🍿 BLOCKBUSTER PREMIERE</option>
                        <option value="SCIFI_FANTASY">🚀 SCI-FI & EPIC FANTASY</option>
                        <option value="ACTION_4DX">⚡ ACTION & 4DX DYNAMICS</option>
                        <option value="ANIME_FEATURE">🎌 ANIME & ANIMATION FEATURE</option>
                        <option value="VIP_LOUNGE">🍸 VIP RECLINER SUITE</option>
                      </select>
                      <svg class="select-chevron-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  class="btn-submit-action font-display"
                  [disabled]="isSubmitting() || !newEventTitle || !newEventVenue"
                >
                  @if (isSubmitting()) {
                    <span class="spinner-sm"></span>
                    <span>Allocating Arena Matrix & Redis Keys...</span>
                  } @else {
                    <span>Publish Event & Generate Seating Matrix →</span>
                  }
                </button>
              </form>
            </div>

            <!-- Active Catalog List -->
            <div class="events-catalog-panel glass-card">
              <div class="catalog-panel-top">
                <div class="panel-header">
                  <div class="header-badge-row">
                    <span class="section-tag font-mono">CIRCULATION REGISTRY</span>
                    <span class="catalog-counter-pill font-mono">
                      <span class="status-dot live"></span>
                      {{ filteredCatalogEvents().length }} / {{ events().length }} SCREENINGS
                    </span>
                  </div>
                  <h2 class="panel-title font-display">Active Live Catalog</h2>
                  <p class="panel-sub">Select an event to load its real-time seat inventory into the Matrix Controller or preview live checkout flow.</p>
                </div>

                <!-- Search & Quick Filter Chips Toolbar -->
                <div class="catalog-search-cluster">
                  <div class="catalog-search-box">
                    <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="11" cy="11" r="8"></circle>
                      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                    <input
                      type="text"
                      [ngModel]="catalogSearchTerm()"
                      (ngModelChange)="catalogSearchTerm.set($event)"
                      placeholder="Search by title, auditorium, format..."
                      class="catalog-search-input font-display"
                    />
                    @if (catalogSearchTerm()) {
                      <button (click)="catalogSearchTerm.set('')" class="clear-search-btn" title="Clear Search">✕</button>
                    }
                  </div>

                  <div class="catalog-filter-chips">
                    <button
                      type="button"
                      (click)="catalogFilterGenre.set('ALL')"
                      class="chip-filter-btn font-mono"
                      [class.active]="catalogFilterGenre() === 'ALL'"
                    >
                      All ({{ events().length }})
                    </button>
                    <button
                      type="button"
                      (click)="catalogFilterGenre.set('IMAX_3D')"
                      class="chip-filter-btn font-mono"
                      [class.active]="catalogFilterGenre() === 'IMAX_3D'"
                    >
                      🎬 IMAX 3D
                    </button>
                    <button
                      type="button"
                      (click)="catalogFilterGenre.set('DOLBY_CINEMA')"
                      class="chip-filter-btn font-mono"
                      [class.active]="catalogFilterGenre() === 'DOLBY_CINEMA'"
                    >
                      🔊 Dolby
                    </button>
                    <button
                      type="button"
                      (click)="catalogFilterGenre.set('VIP_LOUNGE')"
                      class="chip-filter-btn font-mono"
                      [class.active]="catalogFilterGenre() === 'VIP_LOUNGE'"
                    >
                      🍸 VIP
                    </button>
                    <button
                      type="button"
                      (click)="catalogFilterGenre.set('BLOCKBUSTER')"
                      class="chip-filter-btn font-mono"
                      [class.active]="catalogFilterGenre() === 'BLOCKBUSTER'"
                    >
                      🍿 Blockbuster
                    </button>
                  </div>
                </div>
              </div>

              <!-- Full-Height Dynamic Stream List (No dead space) -->
              <div class="catalog-stream">
                @for (evt of filteredCatalogEvents(); track evt.id) {
                  <div class="catalog-card" [class.active-item]="selectedEventId() === evt.id">
                    <div class="poster-thumb-wrapper">
                      <img
                        [src]="evt.imageUrl || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=400&auto=format&fit=crop'"
                        [alt]="evt.title"
                        class="catalog-poster"
                        (error)="onCatalogPosterError($event)"
                      />
                      <span class="poster-format-badge font-mono">{{ evt.category || 'CINEMA' }}</span>
                    </div>

                    <div class="catalog-info">
                      <div class="catalog-title-row">
                        <h4 class="catalog-title font-display" [title]="evt.title">{{ evt.title }}</h4>
                        @if (selectedEventId() === evt.id) {
                          <span class="active-badge font-mono">SELECTED</span>
                        }
                      </div>

                      <div class="catalog-meta-row font-mono text-xs">
                        <span class="meta-item-tag">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                            <circle cx="12" cy="10" r="3"></circle>
                          </svg>
                          <span>{{ evt.venue }}</span>
                        </span>
                        <span class="meta-item-tag seats-tag">
                          🎟️ {{ evt.totalSeats || 50 }} Seats
                        </span>
                        @if (evt.eventDate) {
                          <span class="meta-item-tag date-tag">
                            ⏱ {{ evt.eventDate | date:'MMM d, h:mm a' }}
                          </span>
                        }
                      </div>
                    </div>

                    <div class="catalog-actions-cluster">
                      <button
                        type="button"
                        (click)="switchToSeatMatrix(evt.id)"
                        class="btn-matrix-shortcut font-mono"
                        [class.btn-active-matrix]="selectedEventId() === evt.id"
                      >
                        {{ selectedEventId() === evt.id ? '✓ In Matrix' : 'Inspect Matrix →' }}
                      </button>
                      <button
                        type="button"
                        (click)="openLiveEvent(evt.id)"
                        class="btn-live-icon-btn font-mono"
                        title="Open customer booking screen in new tab"
                      >
                        ↗
                      </button>
                    </div>
                  </div>
                } @empty {
                  <div class="catalog-empty-box glass-card font-mono">
                    <div class="empty-icon">🔍</div>
                    <span class="empty-title">No Screenings Match Filter</span>
                    <span class="empty-sub">Try changing your search keywords or genre filter.</span>
                    <button
                      type="button"
                      (click)="catalogSearchTerm.set(''); catalogFilterGenre.set('ALL')"
                      class="btn-reset-filters font-mono"
                    >
                      Reset Filters
                    </button>
                  </div>
                }
              </div>

              <!-- Footer Summary Bar -->
              <div class="catalog-footer-bar font-mono">
                <div class="footer-stat">
                  <span class="stat-dot-live"></span>
                  <span>TOTAL CAPACITY: <strong>{{ totalSeatsCount() }} SEATS</strong></span>
                </div>
                <div class="footer-divider">•</div>
                <div class="footer-stat">
                  <span>REDIS HOT-PATH SYNCED</span>
                </div>
                <button (click)="loadEvents()" class="btn-sync-catalog" title="Refresh Live Catalog">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                    <path d="M3 3v5h5"></path>
                    <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"></path>
                    <path d="M16 21h5v-5"></path>
                  </svg>
                  <span>Sync</span>
                </button>
              </div>
            </div>
          </div>
        </section>
      }

      <!-- TAB 3: TRAFFIC FLOW LIMITER (ADMIN ONLY) -->
      @if (activeTab() === 'traffic') {
        <section class="tab-view-container animate-fade-in">
          @if (!authService.isAdmin()) {
            <div class="elevated-guard-card glass-card">
              <div class="guard-shield">🛡️</div>
              <h2 class="guard-title font-display">Superuser Privilege Required</h2>
              <p class="guard-sub">
                Your authenticated session holds role <strong>ORGANIZER</strong>. Traffic flow throttling and cluster rate limits require <strong>PLATFORM ADMIN</strong> authorization.
              </p>
              <button (click)="quickSwitchAdmin()" class="btn-primary-action font-mono">
                ⚡ Elevate to Admin (admin&#64;aura.live)
              </button>
            </div>
          } @else {
            <div class="admin-traffic-grid">
              <!-- Flow Governor Controls -->
              <div class="rate-governor-card glass-card">
                <div class="panel-header">
                  <span class="section-tag font-mono text-cyan">CLUSTER FLOW GOVERNOR</span>
                  <h2 class="panel-title font-display">Virtual Queue Admission Rate</h2>
                  <p class="panel-sub">Dynamically throttles concurrent fan ingress into ticket reservation transactions.</p>
                </div>

                <div class="slider-box">
                  <div class="slider-readout font-mono">
                    <span class="readout-label">MAX ADMISSION VELOCITY</span>
                    <span class="readout-val text-cyan text-lg">{{ queueRate() }} USERS / SEC</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="1200"
                    step="20"
                    [ngModel]="queueRate()"
                    (ngModelChange)="queueRate.set($event)"
                    class="neon-range-slider"
                  />
                  <div class="range-milestones font-mono text-xs text-muted">
                    <span>20/sec (High Contention)</span>
                    <span>400/sec (Normal)</span>
                    <span>1,200/sec (Flash Drop)</span>
                  </div>
                </div>

                <div class="flow-presets-cluster">
                  <span class="font-mono text-xs text-muted">QUICK VELOCITY PROFILES:</span>
                  <div class="preset-chips-row font-mono">
                    <button type="button" (click)="queueRate.set(50)" [class.active]="queueRate() === 50" class="chip-btn">Quiet (50/s)</button>
                    <button type="button" (click)="queueRate.set(200)" [class.active]="queueRate() === 200" class="chip-btn">Balanced (200/s)</button>
                    <button type="button" (click)="queueRate.set(600)" [class.active]="queueRate() === 600" class="chip-btn">Arena Rush (600/s)</button>
                    <button type="button" (click)="queueRate.set(1000)" [class.active]="queueRate() === 1000" class="chip-btn">Peak Drop (1000/s)</button>
                  </div>
                </div>

                <div class="backpressure-toggle-card">
                  <div class="toggle-text">
                    <span class="toggle-name font-display">Automated Backpressure Valve</span>
                    <span class="toggle-sub text-xs text-muted">Auto-diverts fans to waiting room when Redis p99 exceeds 2.5ms.</span>
                  </div>
                  <button
                    type="button"
                    (click)="isBackpressureActive.set(!isBackpressureActive())"
                    class="valve-toggle-btn font-mono"
                    [class.armed]="isBackpressureActive()"
                  >
                    {{ isBackpressureActive() ? '● ARMED & ACTIVE' : '○ STANDBY' }}
                  </button>
                </div>

                <button type="button" (click)="applyTrafficRule()" class="btn-submit-action font-display">
                  Apply Admission Rate Limits
                </button>
              </div>

              <!-- Cluster Radar HUD -->
              <div class="telemetry-radar-card glass-card">
                <div class="panel-header">
                  <span class="section-tag font-mono text-emerald">TELEMETRY RADAR</span>
                  <h2 class="panel-title font-display">Distributed Node Performance</h2>
                  <p class="panel-sub">Real-time health of atomic lock coordination engines.</p>
                </div>

                <div class="radar-metrics-grid font-mono">
                  <div class="radar-metric-box">
                    <span class="radar-label">REDIS SENTINEL</span>
                    <span class="radar-value text-emerald font-bold">HEALTHY // PONG</span>
                  </div>

                  <div class="radar-metric-box">
                    <span class="radar-label">HOLD WINDOW TTL</span>
                    <span class="radar-value text-indigo font-bold">300 SECONDS</span>
                  </div>

                  <div class="radar-metric-box">
                    <span class="radar-label">LUA SCRIPT LATENCY</span>
                    <span class="radar-value text-amber font-bold">0.42 ms (p99)</span>
                  </div>

                  <div class="radar-metric-box">
                    <span class="radar-label">DOUBLE-BOOKING INCIDENTS</span>
                    <span class="radar-value text-emerald font-bold">0 DETECTIONS</span>
                  </div>
                </div>
              </div>
            </div>
          }
        </section>
      }

      <!-- TAB 4: DEADLOCK RECOVERY SWEEPER (ADMIN ONLY) -->
      @if (activeTab() === 'sweeper') {
        <section class="tab-view-container animate-fade-in">
          @if (!authService.isAdmin()) {
            <div class="elevated-guard-card glass-card">
              <div class="guard-shield">🛡️</div>
              <h2 class="guard-title font-display">Platform Admin Required</h2>
              <p class="guard-sub">
                Emergency lock purging and cache invalidation are restricted to <strong>ADMIN</strong> roles.
              </p>
              <button (click)="quickSwitchAdmin()" class="btn-primary-action font-mono">
                ⚡ Elevate to Admin (admin&#64;aura.live)
              </button>
            </div>
          } @else {
            <div class="sweeper-command-layout">
              <div class="sweeper-action-panel glass-card">
                <div class="panel-header">
                  <span class="section-tag font-mono text-rose">EMERGENCY PROTOCOL</span>
                  <h2 class="panel-title font-display">Redis Concurrency Deadlock Recovery</h2>
                  <p class="panel-sub">
                    If user sessions disconnect during network anomalies, orphaned Redis locks can block seats.
                    This command scans Redis keys and releases abandoned holds back to <strong>AVAILABLE</strong> status.
                  </p>
                </div>

                <div class="sweeper-stats-row font-mono">
                  <div class="stat-card">
                    <span class="stat-lbl">SEATS CURRENTLY HELD</span>
                    <span class="stat-big text-amber">{{ statusCounts().held }}</span>
                  </div>

                  <div class="stat-card">
                    <span class="stat-lbl">TARGET LOCK PATTERN</span>
                    <span class="stat-big text-cyan">seat:lock:*</span>
                  </div>

                  <div class="stat-card">
                    <span class="stat-lbl">DATA INTEGRITY</span>
                    <span class="stat-big text-emerald">BOOKED PASSES PROTECTED</span>
                  </div>
                </div>

                <div class="purge-trigger-zone">
                  <button
                    type="button"
                    (click)="triggerEmergencyRelease()"
                    class="btn-purge-action font-display"
                    [disabled]="isSweeping()"
                  >
                    @if (isSweeping()) {
                      <span class="spinner-sm"></span>
                      <span>PURGING ORPHANED REDIS KEYS & SYNCHRONIZING DB...</span>
                    } @else {
                      <span>⚡ EXECUTE DEADLOCK SWEEPER (PURGE STUCK LOCKS)</span>
                    }
                  </button>
                </div>
              </div>

              <!-- Terminal Audit Trail -->
              <div class="terminal-log-panel glass-card">
                <div class="panel-header">
                  <span class="section-tag font-mono">AUDIT CONSOLE</span>
                  <h3 class="panel-title font-display">Administrative Action Stream</h3>
                </div>

                <div class="terminal-stream font-mono">
                  @for (log of auditLogs(); track log.timestamp) {
                    <div class="terminal-line">
                      <span class="log-ts">[{{ log.timestamp | date:'HH:mm:ss' }}]</span>
                      <span class="log-tag">[OP_AUDIT]</span>
                      <span class="log-content">{{ log.message }}</span>
                    </div>
                  }
                </div>
              </div>
            </div>
          }
        </section>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
      background: radial-gradient(circle at 50% 0%, rgba(30, 41, 59, 0.4) 0%, rgba(9, 13, 22, 1) 75%);
      color: #f1f5f9;
    }

    .enterprise-console {
      max-width: 1440px;
      margin: 0 auto;
      padding: 1.5rem 1.75rem 5rem;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    /* Glass Panels */
    .glass-card {
      background: rgba(15, 23, 42, 0.72);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      box-shadow: 0 12px 36px rgba(0, 0, 0, 0.45);
    }

    /* Floating Toast System */
    .toast-container {
      position: fixed;
      top: 1.5rem;
      right: 1.5rem;
      z-index: 1000;
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
      pointer-events: none;
    }

    .toast-item {
      pointer-events: auto;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1.1rem;
      border-radius: 10px;
      background: rgba(15, 23, 42, 0.95);
      border: 1px solid rgba(255, 255, 255, 0.12);
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.6);
      animation: slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      min-width: 300px;
      max-width: 440px;

      &.success {
        border-color: rgba(16, 185, 129, 0.4);
        .toast-indicator { background: #10b981; box-shadow: 0 0 8px #10b981; }
        .toast-icon { color: #10b981; }
      }

      &.error {
        border-color: rgba(239, 68, 68, 0.4);
        .toast-indicator { background: #ef4444; box-shadow: 0 0 8px #ef4444; }
        .toast-icon { color: #ef4444; }
      }

      .toast-indicator {
        width: 4px;
        height: 24px;
        border-radius: 2px;
        flex-shrink: 0;
      }

      .toast-body {
        flex: 1;
        display: flex;
        align-items: center;
        gap: 0.6rem;
        font-size: 0.84rem;
        color: #f8fafc;
      }

      .toast-close-btn {
        background: none;
        border: none;
        color: #94a3b8;
        font-size: 1.1rem;
        cursor: pointer;
        &:hover { color: #ffffff; }
      }
    }

    /* Header & Executive HUD */
    .console-header {
      padding: 1.75rem 2rem 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;

      .header-main-row {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 1.5rem;
        flex-wrap: wrap;

        .brand-block {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;

          .system-status-chip {
            display: inline-flex;
            align-items: center;
            gap: 0.45rem;
            color: #10b981;
            font-weight: 700;
            letter-spacing: 0.08em;

            .status-pulse-dot {
              width: 6px;
              height: 6px;
              border-radius: 50%;
              background: #10b981;
              box-shadow: 0 0 8px #10b981;
              animation: pulse 2s infinite;
            }
          }

          .console-title {
            font-size: 1.75rem;
            font-weight: 800;
            letter-spacing: -0.02em;
            color: #ffffff;
          }

          .console-tagline {
            font-size: 0.85rem;
            color: #94a3b8;
            max-width: 680px;
            line-height: 1.45;
          }
        }

        .identity-card {
          display: flex;
          align-items: center;
          gap: 0.75rem;

          .role-pill {
            display: flex;
            align-items: center;
            gap: 0.65rem;
            padding: 0.45rem 0.85rem;
            border-radius: 10px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            background: rgba(255, 255, 255, 0.03);

            &.role-admin {
              border-color: rgba(239, 68, 68, 0.4);
              background: rgba(239, 68, 68, 0.08);
              .role-title { color: #fca5a5; }
            }

            &.role-organizer {
              border-color: rgba(168, 85, 247, 0.4);
              background: rgba(168, 85, 247, 0.08);
              .role-title { color: #d8b4fe; }
            }

            .role-icon-badge { font-size: 1.1rem; }
            .role-meta {
              display: flex;
              flex-direction: column;
              .role-title { font-size: 0.72rem; font-weight: 800; letter-spacing: 0.06em; }
              .role-email { font-size: 0.68rem; color: #94a3b8; }
            }
          }

          .btn-quick-admin {
            padding: 0.45rem 0.75rem;
            border-radius: 8px;
            border: 1px solid rgba(239, 68, 68, 0.35);
            background: rgba(239, 68, 68, 0.12);
            color: #fca5a5;
            font-size: 0.72rem;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s ease;
            &:hover { background: rgba(239, 68, 68, 0.22); }
          }
        }
      }

      .hud-stats-strip {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 0.75rem;
        padding-top: 0.85rem;
        border-top: 1px solid rgba(255, 255, 255, 0.06);

        @media (max-width: 840px) {
          grid-template-columns: 1fr 1fr;
        }

        .hud-stat-box {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
          padding: 0.5rem 0.75rem;
          background: rgba(255, 255, 255, 0.02);
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.04);

          .hud-label { font-size: 0.62rem; color: #64748b; font-weight: 700; letter-spacing: 0.06em; }
          .hud-val { font-size: 0.88rem; font-weight: 800; }
        }
      }

      .console-nav {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;

        .nav-tab {
          display: inline-flex;
          align-items: center;
          gap: 0.55rem;
          padding: 0.55rem 1.1rem;
          border-radius: 10px;
          border: 1px solid transparent;
          background: transparent;
          color: #94a3b8;
          font-size: 0.86rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;

          .tab-svg {
            width: 16px;
            height: 16px;
            stroke-width: 2;
          }

          &:hover {
            color: #ffffff;
            background: rgba(255, 255, 255, 0.04);
          }

          &.active {
            color: #ffffff;
            background: rgba(99, 102, 241, 0.15);
            border-color: rgba(99, 102, 241, 0.35);
            box-shadow: 0 4px 14px rgba(99, 102, 241, 0.2);

            .tab-svg { stroke: #818cf8; }
          }

          .nav-lock-badge {
            font-size: 0.58rem;
            font-weight: 800;
            padding: 0.15rem 0.4rem;
            border-radius: 4px;
            background: rgba(239, 68, 68, 0.2);
            color: #fca5a5;
            border: 1px solid rgba(239, 68, 68, 0.3);
          }
        }
      }
    }

    /* Common Form Inputs */
    .custom-input {
      width: 100%;
      background: rgba(15, 23, 42, 0.95);
      border: 1px solid rgba(99, 102, 241, 0.25);
      border-radius: 8px;
      padding: 0.65rem 0.85rem;
      color: #f8fafc;
      font-size: 0.86rem;
      outline: none;
      transition: all 0.2s ease;
      box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.4);

      &::placeholder {
        color: #475569;
        font-size: 0.82rem;
      }

      &:hover {
        border-color: rgba(99, 102, 241, 0.5);
        background: rgba(18, 26, 46, 0.98);
      }

      &:focus {
        border-color: #6366f1;
        background: rgba(20, 30, 52, 1);
        box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.25), 0 0 14px rgba(99, 102, 241, 0.2);
      }

      &.date-styled {
        color-scheme: dark;
        letter-spacing: 0.04em;
        font-size: 0.82rem;
        font-weight: 600;
        cursor: pointer;

        &::-webkit-calendar-picker-indicator {
          cursor: pointer;
          border-radius: 6px;
          padding: 3px 4px;
          margin-right: 2px;
          opacity: 0.88;
          filter: invert(0.8) sepia(1) saturate(5) hue-rotate(185deg);
          transition: all 0.2s ease;

          &:hover {
            opacity: 1;
            transform: scale(1.15);
            background: rgba(99, 102, 241, 0.25);
            filter: invert(0.95) sepia(1) saturate(10) hue-rotate(180deg);
            box-shadow: 0 0 10px rgba(56, 189, 248, 0.45);
          }
        }

        &::-webkit-datetime-edit-fields-wrapper {
          background: transparent;
        }

        &::-webkit-datetime-edit-text {
          color: #64748b;
          padding: 0 0.2rem;
        }

        &::-webkit-datetime-edit-month-field,
        &::-webkit-datetime-edit-day-field,
        &::-webkit-datetime-edit-year-field {
          color: #f8fafc;
          font-weight: 600;
          &:focus {
            background: #6366f1;
            color: #ffffff;
            border-radius: 3px;
          }
        }

        &::-webkit-datetime-edit-hour-field,
        &::-webkit-datetime-edit-minute-field,
        &::-webkit-datetime-edit-ampm-field {
          color: #38bdf8;
          font-weight: 600;
          &:focus {
            background: #06b6d4;
            color: #05070a;
            border-radius: 3px;
          }
        }
      }
    }

    .custom-select-wrapper {
      position: relative;
      display: inline-block;

      .custom-select {
        appearance: none;
        -webkit-appearance: none;
        background: rgba(15, 23, 42, 0.95);
        border: 1px solid rgba(99, 102, 241, 0.25);
        border-radius: 8px;
        padding: 0.55rem 2.2rem 0.55rem 0.9rem;
        color: #f8fafc;
        font-size: 0.86rem;
        cursor: pointer;
        outline: none;
        transition: all 0.2s ease;

        &:hover {
          border-color: rgba(99, 102, 241, 0.5);
        }

        &:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.25);
        }

        option {
          background-color: #0b1120;
          color: #f8fafc;
          padding: 0.5rem;
        }
      }

      .select-chevron {
        position: absolute;
        right: 0.75rem;
        top: 50%;
        transform: translateY(-50%);
        pointer-events: none;
        color: #818cf8;
        font-size: 0.75rem;
      }
    }

    /* TAB 1: SEAT MATRIX CONTROLLER */
    .matrix-toolbar {
      padding: 1rem 1.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
      margin-bottom: 1.25rem;

      .event-selector-cluster {
        display: flex;
        align-items: center;
        gap: 0.75rem;

        .toolbar-label {
          font-size: 0.65rem;
          color: #64748b;
          font-weight: 700;
          letter-spacing: 0.08em;
        }
      }

      .legend-cluster {
        display: flex;
        align-items: center;
        gap: 0.85rem;
        flex-wrap: wrap;

        .legend-pill {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          color: #cbd5e1;

          .legend-indicator {
            width: 8px;
            height: 8px;
            border-radius: 2px;
            &.is-avail { background: #10b981; }
            &.is-held { background: #f59e0b; }
            &.is-booked { background: #6366f1; }
            &.is-blocked { background: #a855f7; }
            &.is-maint { background: #ef4444; }
          }
        }
      }
    }

    .matrix-split-layout {
      display: grid;
      grid-template-columns: 1fr 340px;
      gap: 1.25rem;
      align-items: start;

      @media (max-width: 1024px) {
        grid-template-columns: 1fr;
      }
    }

    .arena-canvas-card {
      padding: 1.75rem;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      min-height: 520px;

      .stage-apron {
        position: relative;
        text-align: center;
        padding: 0.65rem;
        background: linear-gradient(180deg, rgba(56, 189, 248, 0.12) 0%, rgba(56, 189, 248, 0.02) 100%);
        border: 1px solid rgba(56, 189, 248, 0.25);
        border-radius: 10px;
        overflow: hidden;

        .stage-plate {
          font-size: 0.74rem;
          letter-spacing: 0.16em;
          color: #38bdf8;
          font-weight: 700;
        }
      }

      .arena-rows-wrapper {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        max-height: 600px;
        overflow-y: auto;
        padding-right: 0.5rem;

        .arena-row-container {
          display: flex;
          align-items: center;
          gap: 1rem;
          background: rgba(255, 255, 255, 0.015);
          padding: 0.6rem 0.85rem;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.04);

          .row-badge-pill {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-width: 48px;
            padding: 0.35rem 0.5rem;
            background: rgba(255, 255, 255, 0.04);
            border-radius: 6px;
            border: 1px solid rgba(255, 255, 255, 0.08);

            .row-char {
              font-size: 0.88rem;
              font-weight: 800;
              color: #f8fafc;
            }

            .row-tier-label {
              font-size: 0.55rem;
              color: #94a3b8;
            }
          }

          .row-seats-track {
            display: flex;
            flex-wrap: wrap;
            gap: 0.45rem;
            flex: 1;

            .seat-capsule {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-width: 52px;
              height: 42px;
              border-radius: 6px;
              border: 1px solid transparent;
              cursor: pointer;
              transition: all 0.16s ease;
              user-select: none;

              .seat-num {
                font-size: 0.72rem;
                font-weight: 800;
              }

              .seat-cost {
                font-size: 0.58rem;
                opacity: 0.85;
              }

              &:hover {
                transform: translateY(-2px);
                z-index: 2;
              }

              &.cap-available {
                background: rgba(16, 185, 129, 0.12);
                border-color: rgba(16, 185, 129, 0.35);
                color: #6ee7b7;
                &:hover { background: rgba(16, 185, 129, 0.25); }
              }

              &.cap-held {
                background: rgba(245, 158, 11, 0.16);
                border-color: rgba(245, 158, 11, 0.45);
                color: #fcd34d;
                &:hover { background: rgba(245, 158, 11, 0.3); }
              }

              &.cap-booked {
                background: rgba(99, 102, 241, 0.15);
                border-color: rgba(99, 102, 241, 0.35);
                color: #a5b4fc;
                &:hover { background: rgba(99, 102, 241, 0.25); }
              }

              &.cap-blocked {
                background: rgba(168, 85, 247, 0.15);
                border-color: rgba(168, 85, 247, 0.4);
                color: #d8b4fe;
                &:hover { background: rgba(168, 85, 247, 0.25); }
              }

              &.cap-maintenance {
                background: rgba(239, 68, 68, 0.15);
                border-color: rgba(239, 68, 68, 0.4);
                color: #fca5a5;
                &:hover { background: rgba(239, 68, 68, 0.25); }
              }

              &.selected {
                border-color: #ffffff !important;
                box-shadow: 0 0 14px rgba(255, 255, 255, 0.6);
                transform: scale(1.08);
              }
            }
          }
        }
      }
    }

    .seat-inspector-card {
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;

      .inspector-header {
        .section-tag { font-size: 0.62rem; color: #6366f1; font-weight: 700; letter-spacing: 0.1em; }
        .inspector-title { font-size: 1.35rem; font-weight: 800; color: #ffffff; }
      }

      .inspector-details-sheet {
        display: flex;
        flex-direction: column;
        gap: 0.65rem;
        background: rgba(0, 0, 0, 0.25);
        padding: 0.85rem;
        border-radius: 10px;
        border: 1px solid rgba(255, 255, 255, 0.06);

        .spec-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.76rem;

          .spec-label { color: #64748b; font-weight: 700; }
          .spec-badge {
            display: inline-flex;
            align-items: center;
            gap: 0.35rem;
            padding: 0.15rem 0.5rem;
            border-radius: 9999px;
            font-size: 0.68rem;
            font-weight: 700;

            &.available { background: rgba(16, 185, 129, 0.2); color: #6ee7b7; .badge-dot { background: #10b981; } }
            &.held { background: rgba(245, 158, 11, 0.2); color: #fcd34d; .badge-dot { background: #f59e0b; } }
            &.booked { background: rgba(99, 102, 241, 0.2); color: #a5b4fc; .badge-dot { background: #6366f1; } }
            &.blocked { background: rgba(168, 85, 247, 0.2); color: #d8b4fe; .badge-dot { background: #a855f7; } }
            &.maintenance { background: rgba(239, 68, 68, 0.2); color: #fca5a5; .badge-dot { background: #ef4444; } }

            .badge-dot { width: 5px; height: 5px; border-radius: 50%; }
          }
        }
      }

      .control-box {
        display: flex;
        flex-direction: column;
        gap: 0.55rem;

        .control-label {
          font-size: 0.65rem;
          color: #94a3b8;
          font-weight: 700;
          letter-spacing: 0.06em;
        }

        .quick-chips-row {
          display: flex;
          gap: 0.4rem;

          .chip-btn {
            flex: 1;
            padding: 0.3rem 0.4rem;
            border-radius: 6px;
            border: 1px solid rgba(255, 255, 255, 0.08);
            background: rgba(255, 255, 255, 0.02);
            color: #94a3b8;
            font-size: 0.72rem;
            cursor: pointer;
            transition: all 0.15s ease;

            &:hover, &.active {
              background: rgba(99, 102, 241, 0.2);
              border-color: rgba(99, 102, 241, 0.4);
              color: #ffffff;
            }
          }
        }

        .price-input-cluster {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          position: relative;

          .currency-affix {
            position: absolute;
            left: 0.75rem;
            color: #64748b;
            font-weight: 700;
            pointer-events: none;
          }

          .custom-input {
            padding-left: 1.6rem;
          }
        }

        .status-action-grid {
          display: flex;
          flex-direction: column;
          gap: 0.45rem;

          .action-pill {
            padding: 0.55rem 0.85rem;
            border-radius: 8px;
            border: 1px solid transparent;
            font-size: 0.76rem;
            font-weight: 700;
            cursor: pointer;
            text-align: left;
            transition: all 0.18s ease;

            &.pill-avail {
              background: rgba(16, 185, 129, 0.08);
              border-color: rgba(16, 185, 129, 0.25);
              color: #6ee7b7;
              &:hover:not(:disabled) { background: rgba(16, 185, 129, 0.18); }
            }

            &.pill-block {
              background: rgba(168, 85, 247, 0.08);
              border-color: rgba(168, 85, 247, 0.25);
              color: #d8b4fe;
              &:hover:not(:disabled) { background: rgba(168, 85, 247, 0.18); }
            }

            &.pill-maint {
              background: rgba(239, 68, 68, 0.08);
              border-color: rgba(239, 68, 68, 0.25);
              color: #fca5a5;
              &:hover:not(:disabled) { background: rgba(239, 68, 68, 0.18); }
            }

            &.current {
              opacity: 0.5;
              cursor: not-allowed;
            }
          }
        }
      }

      .inspector-empty-guide {
        padding: 3rem 1rem;
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.75rem;
        color: #64748b;
        font-size: 0.76rem;
        line-height: 1.45;

        .empty-mouse-icon { font-size: 1.6rem; opacity: 0.6; }
      }
    }

    /* Buttons */
    .btn-primary-action {
      padding: 0.65rem 1.15rem;
      border-radius: 8px;
      border: 1px solid #6366f1;
      background: #6366f1;
      color: #ffffff;
      font-size: 0.82rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s ease;
      white-space: nowrap;

      &:hover:not(:disabled) {
        background: #4f46e5;
        box-shadow: 0 4px 14px rgba(99, 102, 241, 0.35);
      }
    }

    .btn-submit-action {
      width: 100%;
      padding: 0.85rem;
      border-radius: 10px;
      border: 1px solid #6366f1;
      background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
      color: #ffffff;
      font-size: 0.92rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s ease;

      &:hover:not(:disabled) {
        box-shadow: 0 6px 20px rgba(99, 102, 241, 0.4);
        transform: translateY(-1px);
      }

      &:disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }
    }

    /* TAB 2: EVENTS HUB */
    .events-hub-grid {
      display: grid;
      grid-template-columns: 1.05fr 1fr;
      gap: 1.5rem;
      align-items: stretch;

      @media (max-width: 980px) {
        grid-template-columns: 1fr;
      }
    }

    .create-event-panel {
      padding: 1.75rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .events-catalog-panel {
      padding: 1.5rem 1.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      height: 100%;
      min-height: 0;
      box-sizing: border-box;
      overflow: hidden;

      .catalog-panel-top {
        display: flex;
        flex-direction: column;
        gap: 0.85rem;

        .header-badge-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.25rem;

          .catalog-counter-pill {
            display: inline-flex;
            align-items: center;
            gap: 0.45rem;
            background: rgba(16, 185, 129, 0.12);
            color: #6ee7b7;
            border: 1px solid rgba(16, 185, 129, 0.28);
            padding: 0.18rem 0.55rem;
            border-radius: 9999px;
            font-size: 0.65rem;
            font-weight: 700;
          }
        }
      }

      .catalog-search-cluster {
        display: flex;
        flex-direction: column;
        gap: 0.65rem;

        .catalog-search-box {
          position: relative;
          display: flex;
          align-items: center;
          width: 100%;

          .search-icon {
            position: absolute;
            left: 0.85rem;
            width: 15px;
            height: 15px;
            color: #818cf8;
            pointer-events: none;
          }

          .catalog-search-input {
            width: 100%;
            background: rgba(2, 6, 23, 0.6);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            padding: 0.55rem 2.2rem 0.55rem 2.4rem;
            color: #ffffff;
            font-size: 0.82rem;
            transition: all 0.2s ease;

            &:focus {
              outline: none;
              border-color: #6366f1;
              box-shadow: 0 0 12px rgba(99, 102, 241, 0.25);
              background: rgba(2, 6, 23, 0.85);
            }

            &::placeholder {
              color: #64748b;
              font-size: 0.78rem;
            }
          }

          .clear-search-btn {
            position: absolute;
            right: 0.65rem;
            background: rgba(255, 255, 255, 0.1);
            border: none;
            color: #94a3b8;
            width: 18px;
            height: 18px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.65rem;
            cursor: pointer;

            &:hover {
              background: rgba(239, 68, 68, 0.25);
              color: #fca5a5;
            }
          }
        }

        .catalog-filter-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 0.4rem;

          .chip-filter-btn {
            padding: 0.25rem 0.65rem;
            border-radius: 6px;
            border: 1px solid rgba(255, 255, 255, 0.08);
            background: rgba(255, 255, 255, 0.02);
            color: #94a3b8;
            font-size: 0.68rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.15s ease;

            &:hover {
              color: #ffffff;
              border-color: rgba(99, 102, 241, 0.35);
              background: rgba(99, 102, 241, 0.1);
            }

            &.active {
              color: #ffffff;
              background: rgba(99, 102, 241, 0.25);
              border-color: #818cf8;
              box-shadow: 0 0 10px rgba(99, 102, 241, 0.28);
            }
          }
        }
      }
    }

    .panel-header {
      .section-tag { font-size: 0.62rem; color: #6366f1; font-weight: 700; letter-spacing: 0.08em; }
      .panel-title { font-size: 1.35rem; font-weight: 800; color: #ffffff; }
      .panel-sub { font-size: 0.8rem; color: #94a3b8; line-height: 1.4; }
    }

    .curated-form {
      display: flex;
      flex-direction: column;
      gap: 1rem;

      .form-field {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;

        .field-label {
          font-size: 0.65rem;
          font-weight: 700;
          color: #64748b;
          letter-spacing: 0.06em;
        }

        .textarea-styled {
          resize: vertical;
          min-height: 70px;
        }
      }

      .field-label-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.25rem;

        .field-label {
          font-size: 0.65rem;
          font-weight: 700;
          color: #94a3b8;
          letter-spacing: 0.08em;
        }

        .field-hint {
          font-size: 0.58rem;
          font-weight: 700;
          color: #818cf8;
          background: rgba(99, 102, 241, 0.12);
          padding: 0.12rem 0.45rem;
          border-radius: 4px;
          border: 1px solid rgba(99, 102, 241, 0.25);
          letter-spacing: 0.06em;
        }
      }

      .input-with-icon-wrapper {
        position: relative;
        display: flex;
        align-items: center;
        width: 100%;

        .input-lead-icon {
          position: absolute;
          left: 0.85rem;
          width: 16px;
          height: 16px;
          color: #818cf8;
          pointer-events: none;
          opacity: 0.85;
          z-index: 2;
          transition: all 0.2s ease;
        }

        .custom-input {
          padding-left: 2.35rem;
        }

        &:focus-within {
          .input-lead-icon {
            color: #38bdf8;
            opacity: 1;
            transform: scale(1.08);
          }
        }
      }

      .custom-select-container {
        position: relative;
        display: flex;
        align-items: center;
        width: 100%;

        .input-lead-icon {
          position: absolute;
          left: 0.85rem;
          width: 16px;
          height: 16px;
          color: #818cf8;
          pointer-events: none;
          opacity: 0.85;
          z-index: 2;
          transition: all 0.2s ease;
        }

        .select-chevron-icon {
          position: absolute;
          right: 0.85rem;
          width: 16px;
          height: 16px;
          color: #818cf8;
          pointer-events: none;
          opacity: 0.85;
          z-index: 2;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .custom-select {
          width: 100%;
          appearance: none;
          -webkit-appearance: none;
          -moz-appearance: none;
          background: rgba(15, 23, 42, 0.95);
          border: 1px solid rgba(99, 102, 241, 0.28);
          border-radius: 8px;
          padding: 0.65rem 2.4rem 0.65rem 2.35rem;
          color: #f8fafc;
          font-size: 0.82rem;
          font-weight: 600;
          cursor: pointer;
          outline: none;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.4);

          &:hover {
            border-color: rgba(99, 102, 241, 0.6);
            background: rgba(18, 26, 46, 0.98);
            box-shadow: 0 0 14px rgba(99, 102, 241, 0.18);
          }

          &:focus {
            border-color: #6366f1;
            background: rgba(20, 30, 52, 1);
            box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.25), 0 0 18px rgba(99, 102, 241, 0.25);
          }

          option {
            background-color: #0b1120;
            color: #f8fafc;
            padding: 0.75rem;
            font-size: 0.84rem;
            font-weight: 500;
          }
        }

        &:focus-within {
          .input-lead-icon {
            color: #38bdf8;
            opacity: 1;
            transform: scale(1.08);
          }
          .select-chevron-icon {
            color: #38bdf8;
            opacity: 1;
            transform: rotate(180deg);
          }
        }
      }

      .form-split-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.85rem;
      }

      .poster-mode-tabs {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 0.6rem;

        .mode-tab-btn {
          flex: 1;
          padding: 0.45rem 0.6rem;
          border-radius: 6px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.02);
          color: #94a3b8;
          font-size: 0.72rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.35rem;

          &:hover {
            border-color: rgba(99, 102, 241, 0.4);
            color: #f8fafc;
            background: rgba(99, 102, 241, 0.08);
          }

          &.active {
            border-color: #6366f1;
            background: rgba(99, 102, 241, 0.18);
            color: #ffffff;
            box-shadow: 0 0 12px rgba(99, 102, 241, 0.25);
          }
        }
      }

      .url-input-container {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
        margin-bottom: 0.75rem;

        .clear-url-btn {
          position: absolute;
          right: 0.85rem;
          top: 50%;
          transform: translateY(-50%);
          background: rgba(255, 255, 255, 0.1);
          border: none;
          color: #94a3b8;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.7rem;
          cursor: pointer;
          transition: all 0.2s;

          &:hover {
            background: rgba(239, 68, 68, 0.25);
            color: #fca5a5;
          }
        }

        .input-sub-hint {
          font-size: 0.68rem;
          padding-left: 0.25rem;
        }
      }

      .upload-dropzone {
        border: 2px dashed rgba(99, 102, 241, 0.35);
        border-radius: 10px;
        background: rgba(15, 23, 42, 0.6);
        padding: 1.25rem;
        text-align: center;
        margin-bottom: 0.75rem;
        transition: all 0.2s ease;
        position: relative;

        &:hover {
          border-color: #38bdf8;
          background: rgba(15, 23, 42, 0.85);
          box-shadow: 0 0 16px rgba(56, 189, 248, 0.15);
        }

        .file-input-hidden {
          display: none;
        }

        .dropzone-label {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;

          .dropzone-icon {
            font-size: 1.8rem;
          }

          .dropzone-text {
            display: flex;
            flex-direction: column;
            gap: 0.2rem;

            .dropzone-main {
              font-size: 0.84rem;
              font-weight: 600;
              color: #f8fafc;

              .browse-link {
                color: #38bdf8;
                text-decoration: underline;
              }
            }

            .dropzone-sub {
              color: #64748b;
            }
          }
        }

        .uploaded-file-tag {
          margin-top: 0.75rem;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(16, 185, 129, 0.15);
          color: #34d399;
          border: 1px solid rgba(16, 185, 129, 0.3);
          border-radius: 6px;
          padding: 0.3rem 0.6rem;
          font-size: 0.72rem;

          .remove-file-btn {
            background: transparent;
            border: none;
            color: #34d399;
            cursor: pointer;
            font-weight: bold;
            &:hover { color: #f87171; }
          }
        }
      }

      .active-poster-preview-card {
        display: flex;
        gap: 1rem;
        align-items: center;
        padding: 0.75rem;
        border-radius: 10px;
        background: rgba(0, 0, 0, 0.35);
        border: 1px solid rgba(99, 102, 241, 0.25);
        margin-top: 0.5rem;

        .preview-thumb-box {
          position: relative;
          width: 90px;
          height: 62px;
          border-radius: 6px;
          overflow: hidden;
          flex-shrink: 0;
          border: 1px solid rgba(255, 255, 255, 0.1);

          .preview-poster-img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }

          .preview-overlay {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            background: rgba(0, 0, 0, 0.82);
            padding: 2px 4px;
            text-align: center;

            .preview-badge {
              font-size: 0.52rem;
              font-weight: 800;
              color: #38bdf8;
              letter-spacing: 0.05em;
            }
          }
        }

        .preview-meta-box {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.15rem;

          .preview-meta-title {
            font-size: 0.85rem;
            font-weight: 700;
            color: #ffffff;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .preview-meta-venue {
            color: #94a3b8;
          }

          .btn-reset-preview {
            align-self: flex-start;
            margin-top: 0.35rem;
            background: transparent;
            border: 1px solid rgba(255, 255, 255, 0.15);
            color: #94a3b8;
            padding: 0.15rem 0.5rem;
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.2s;

            &:hover {
              border-color: #6366f1;
              color: #ffffff;
              background: rgba(99, 102, 241, 0.15);
            }
          }
        }
      }

      .poster-presets-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 0.6rem;

        .poster-card-option {
          display: flex;
          flex-direction: column;
          padding: 0.4rem;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.02);
          cursor: pointer;
          text-align: left;
          transition: all 0.2s ease;

          .preset-thumb {
            width: 100%;
            height: 60px;
            object-fit: cover;
            border-radius: 5px;
            margin-bottom: 0.35rem;
          }

          .preset-meta {
            display: flex;
            flex-direction: column;
            .preset-name { font-size: 0.74rem; font-weight: 700; color: #f8fafc; }
            .preset-genre { font-size: 0.58rem; color: #38bdf8; }
          }

          &:hover, &.selected {
            border-color: #6366f1;
            background: rgba(99, 102, 241, 0.15);
            box-shadow: 0 4px 12px rgba(99, 102, 241, 0.25);
          }
        }
      }
    }

    .catalog-stream {
      flex: 1 1 auto;
      min-height: 420px;
      max-height: 620px;
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
      overflow-y: auto;
      overflow-x: hidden;
      padding-right: 0.5rem;
      margin: 0.35rem 0;

      /* Standard Firefox */
      scrollbar-width: thin;
      scrollbar-color: rgba(99, 102, 241, 0.75) rgba(15, 23, 42, 0.8);

      /* Webkit / Chrome / Edge Custom Sleek Cyber Scrollbar */
      &::-webkit-scrollbar {
        width: 7px;
      }

      &::-webkit-scrollbar-track {
        background: rgba(10, 15, 28, 0.8);
        border-radius: 9999px;
        margin: 4px 0;
      }

      &::-webkit-scrollbar-thumb {
        background: linear-gradient(180deg, #6366f1 0%, #06b6d4 100%);
        border-radius: 9999px;
        box-shadow: 0 0 8px rgba(99, 102, 241, 0.5);
      }

      &::-webkit-scrollbar-thumb:hover {
        background: linear-gradient(180deg, #818cf8 0%, #38bdf8 100%);
        box-shadow: 0 0 12px rgba(56, 189, 248, 0.7);
      }

      .catalog-card {
        flex: 0 0 auto; /* CRITICAL: Prevent flexbox from shrinking items to fit */
        display: flex;
        align-items: center;
        gap: 0.95rem;
        padding: 0.75rem 1rem;
        min-height: 68px;
        border-radius: 10px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(15, 23, 42, 0.6);
        transition: all 0.2s ease;
        position: relative;
        overflow: hidden;

        &::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 3px;
          background: transparent;
          transition: background 0.2s;
        }

        &:hover {
          border-color: rgba(99, 102, 241, 0.45);
          background: rgba(30, 41, 59, 0.7);
          transform: translateY(-1px);
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);

          &::before {
            background: #818cf8;
          }
        }

        &.active-item {
          border-color: #6366f1;
          background: rgba(99, 102, 241, 0.14);
          box-shadow: 0 0 16px rgba(99, 102, 241, 0.22);

          &::before {
            background: #38bdf8;
          }
        }

        .poster-thumb-wrapper {
          position: relative;
          width: 64px;
          height: 48px;
          border-radius: 7px;
          overflow: hidden;
          flex-shrink: 0;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: #020617;

          .catalog-poster {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
          }

          .poster-format-badge {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            background: rgba(0, 0, 0, 0.88);
            color: #38bdf8;
            font-size: 0.52rem;
            font-weight: 800;
            padding: 1px 2px;
            text-align: center;
            letter-spacing: 0.04em;
          }
        }

        .catalog-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
          min-width: 0;

          .catalog-title-row {
            display: flex;
            align-items: center;
            gap: 0.5rem;

            .catalog-title {
              font-size: 0.92rem;
              font-weight: 700;
              color: #ffffff;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              line-height: 1.3;
              margin: 0;
            }

            .active-badge {
              font-size: 0.55rem;
              font-weight: 800;
              padding: 0.1rem 0.35rem;
              border-radius: 4px;
              background: rgba(56, 189, 248, 0.2);
              color: #38bdf8;
              border: 1px solid rgba(56, 189, 248, 0.35);
              letter-spacing: 0.06em;
              flex-shrink: 0;
            }
          }

          .catalog-meta-row {
            display: flex;
            align-items: center;
            flex-wrap: wrap;
            gap: 0.55rem;
            color: #94a3b8;
            font-size: 0.74rem;
            line-height: 1.3;

            .meta-item-tag {
              display: inline-flex;
              align-items: center;
              gap: 0.25rem;
              white-space: nowrap;

              &.seats-tag {
                color: #6ee7b7;
                background: rgba(16, 185, 129, 0.12);
                border: 1px solid rgba(16, 185, 129, 0.22);
                padding: 0.08rem 0.35rem;
                border-radius: 4px;
                font-weight: 600;
              }

              &.date-tag {
                color: #cbd5e1;
              }
            }

            .meta-divider {
              color: rgba(255, 255, 255, 0.2);
            }
          }
        }

        .catalog-actions-cluster {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          flex-shrink: 0;

          .btn-matrix-shortcut {
            padding: 0.42rem 0.85rem;
            border-radius: 7px;
            border: 1px solid rgba(99, 102, 241, 0.4);
            background: rgba(99, 102, 241, 0.15);
            color: #a5b4fc;
            font-size: 0.76rem;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.18s ease;
            white-space: nowrap;

            &:hover {
              background: rgba(99, 102, 241, 0.35);
              border-color: #818cf8;
              color: #ffffff;
              box-shadow: 0 0 10px rgba(99, 102, 241, 0.3);
            }

            &.btn-active-matrix {
              background: #6366f1;
              border-color: #818cf8;
              color: #ffffff;
              box-shadow: 0 0 10px rgba(99, 102, 241, 0.4);
            }
          }

          .btn-live-icon-btn {
            width: 28px;
            height: 28px;
            border-radius: 7px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            background: rgba(255, 255, 255, 0.03);
            color: #94a3b8;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.78rem;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.15s ease;

            &:hover {
              background: rgba(56, 189, 248, 0.2);
              border-color: rgba(56, 189, 248, 0.4);
              color: #38bdf8;
            }
          }
        }
      }

      .catalog-empty-box {
        padding: 3rem 1.5rem;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.65rem;
        text-align: center;
        margin: auto;
        color: #94a3b8;

        .empty-icon { font-size: 2rem; }
        .empty-title { font-size: 0.95rem; font-weight: 700; color: #ffffff; }
        .empty-sub { font-size: 0.76rem; color: #64748b; }

        .btn-reset-filters {
          margin-top: 0.5rem;
          padding: 0.4rem 0.85rem;
          border-radius: 6px;
          border: 1px solid rgba(99, 102, 241, 0.4);
          background: rgba(99, 102, 241, 0.15);
          color: #a5b4fc;
          font-size: 0.74rem;
          cursor: pointer;
          &:hover { background: rgba(99, 102, 241, 0.3); color: #ffffff; }
        }
      }
    }

    .catalog-footer-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      padding: 0.65rem 0.95rem;
      border-radius: 8px;
      background: rgba(2, 6, 23, 0.45);
      border: 1px solid rgba(255, 255, 255, 0.05);
      font-size: 0.68rem;
      color: #64748b;
      margin-top: auto;

      .footer-stat {
        display: inline-flex;
        align-items: center;
        gap: 0.45rem;

        .stat-dot-live {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #10b981;
          box-shadow: 0 0 6px rgba(16, 185, 129, 0.6);
        }

        strong { color: #f8fafc; }
      }

      .footer-divider { color: rgba(255, 255, 255, 0.15); }

      .btn-sync-catalog {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: #94a3b8;
        padding: 0.25rem 0.6rem;
        border-radius: 5px;
        cursor: pointer;
        font-size: 0.68rem;
        transition: all 0.2s;

        &:hover {
          background: rgba(99, 102, 241, 0.2);
          border-color: #818cf8;
          color: #ffffff;
        }
      }
    }

    /* TAB 3: TRAFFIC FLOW LIMITER */
    .admin-traffic-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;

      @media (max-width: 980px) {
        grid-template-columns: 1fr;
      }
    }

    .rate-governor-card, .telemetry-radar-card {
      padding: 1.75rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .slider-box {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      background: rgba(0, 0, 0, 0.25);
      padding: 1.1rem;
      border-radius: 10px;
      border: 1px solid rgba(255, 255, 255, 0.06);

      .slider-readout {
        display: flex;
        justify-content: space-between;
        align-items: center;
        .readout-label { font-size: 0.65rem; color: #64748b; font-weight: 700; }
        .readout-val { font-weight: 800; }
      }

      .neon-range-slider {
        width: 100%;
        accent-color: #6366f1;
      }

      .range-milestones {
        display: flex;
        justify-content: space-between;
      }
    }

    .flow-presets-cluster {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;

      .preset-chips-row {
        display: flex;
        gap: 0.5rem;

        .chip-btn {
          flex: 1;
          padding: 0.45rem;
          border-radius: 6px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.03);
          color: #94a3b8;
          font-size: 0.72rem;
          cursor: pointer;

          &:hover, &.active {
            border-color: #06b6d4;
            background: rgba(6, 182, 212, 0.15);
            color: #ffffff;
          }
        }
      }
    }

    .backpressure-toggle-card {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.85rem;
      border-radius: 10px;
      border: 1px solid rgba(255, 255, 255, 0.06);
      background: rgba(255, 255, 255, 0.02);

      .toggle-text {
        display: flex;
        flex-direction: column;
        .toggle-name { font-size: 0.86rem; font-weight: 700; color: #ffffff; }
      }

      .valve-toggle-btn {
        padding: 0.4rem 0.75rem;
        border-radius: 6px;
        border: 1px solid rgba(255, 255, 255, 0.15);
        background: transparent;
        color: #94a3b8;
        font-size: 0.72rem;
        font-weight: 700;
        cursor: pointer;

        &.armed {
          border-color: rgba(239, 68, 68, 0.4);
          background: rgba(239, 68, 68, 0.15);
          color: #fca5a5;
        }
      }
    }

    .radar-metrics-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.85rem;

      .radar-metric-box {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
        padding: 1rem;
        border-radius: 10px;
        border: 1px solid rgba(255, 255, 255, 0.06);
        background: rgba(0, 0, 0, 0.25);

        .radar-label { font-size: 0.62rem; color: #64748b; font-weight: 700; }
        .radar-value { font-size: 0.92rem; }
      }
    }

    /* TAB 4: SWEEPER */
    .sweeper-command-layout {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .sweeper-action-panel {
      padding: 1.75rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      border: 1px solid rgba(239, 68, 68, 0.3);
      background: linear-gradient(135deg, rgba(239, 68, 68, 0.05) 0%, rgba(15, 23, 42, 0.75) 100%);

      .sweeper-stats-row {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 0.85rem;

        @media (max-width: 768px) {
          grid-template-columns: 1fr;
        }

        .stat-card {
          padding: 1rem;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.06);
          background: rgba(0, 0, 0, 0.35);
          display: flex;
          flex-direction: column;
          gap: 0.35rem;

          .stat-lbl { font-size: 0.62rem; color: #94a3b8; font-weight: 700; }
          .stat-big { font-size: 1.15rem; font-weight: 800; }
        }
      }

      .purge-trigger-zone {
        display: flex;
        justify-content: center;
        padding-top: 0.5rem;

        .btn-purge-action {
          padding: 0.95rem 2rem;
          border-radius: 10px;
          border: 1px solid #ef4444;
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          color: #ffffff;
          font-size: 0.94rem;
          font-weight: 800;
          letter-spacing: 0.04em;
          cursor: pointer;
          box-shadow: 0 6px 24px rgba(239, 68, 68, 0.4);
          transition: all 0.2s ease;

          &:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 10px 30px rgba(239, 68, 68, 0.55);
          }
        }
      }
    }

    .terminal-log-panel {
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;

      .terminal-stream {
        background: #020617;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 8px;
        padding: 1rem;
        max-height: 240px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
        font-size: 0.74rem;

        .terminal-line {
          display: flex;
          gap: 0.6rem;
          .log-ts { color: #64748b; }
          .log-tag { color: #38bdf8; font-weight: 700; }
          .log-content { color: #e2e8f0; }
        }
      }
    }

    .elevated-guard-card {
      padding: 4rem 2rem;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      max-width: 540px;
      margin: 2rem auto;
      border: 1px solid rgba(239, 68, 68, 0.35);

      .guard-shield { font-size: 3rem; }
      .guard-title { font-size: 1.45rem; color: #ffffff; }
      .guard-sub { font-size: 0.85rem; color: #94a3b8; line-height: 1.5; }
    }

    /* Common Utility Tokens */
    .text-cyan { color: #38bdf8; }
    .text-emerald { color: #34d399; }
    .text-indigo { color: #818cf8; }
    .text-amber { color: #fbbf24; }
    .text-rose { color: #f87171; }
    .text-muted { color: #64748b; }
    .text-xs { font-size: 0.72rem; }
    .text-lg { font-size: 1.15rem; }
    .font-bold { font-weight: 700; }
    .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .font-display { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }

    .spinner-sm {
      display: inline-block;
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: #ffffff;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    .spinner-ring {
      display: inline-block;
      width: 20px;
      height: 20px;
      border: 2px solid rgba(99, 102, 241, 0.2);
      border-top-color: #818cf8;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
    @keyframes slideInRight {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    .animate-fade-in {
      animation: fadeIn 0.2s ease;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class OrganizerComponent implements OnInit {
  public authService = inject(AuthService);
  private apiService = inject(ApiService);

  // Active Navigation Tab
  activeTab = signal<'seats' | 'events' | 'traffic' | 'sweeper'>('seats');

  // Floating Toasts
  toasts = signal<ToastNotification[]>([]);

  // Events & Selected
  events = signal<EventItem[]>([]);
  selectedEventId = signal<string>('');

  // Create Event Form
  newEventTitle = '';
  newEventVenue = '';
  newEventDate = '';
  newEventImage = 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1200&q=80';
  newEventDesc = '';
  newEventSeats = 50;
  newEventCategory = 'IMAX_3D';
  isSubmitting = signal(false);

  // Poster Image Selection System
  imageSourceMode = signal<'preset' | 'url' | 'upload'>('preset');
  activePreset = signal<string>('dune');
  customImageUrl = '';
  uploadedFileName = '';
  isUploadingFile = false;
  imageUploadError = '';

  // Seats
  currentSeats = signal<Seat[]>([]);
  isLoadingSeats = signal(false);
  selectedSeat = signal<Seat | null>(null);
  seatEditPrice = 120;
  isUpdatingSeat = signal(false);

  // Traffic Limiter
  queueRate = signal<number>(200);
  isBackpressureActive = signal<boolean>(true);

  // Sweeper
  isSweeping = signal(false);
  auditLogs = signal<{ timestamp: Date; message: string }[]>([
    { timestamp: new Date(Date.now() - 3600000), message: 'System boot: Redis Cluster attached on 127.0.0.1:6379.' },
    { timestamp: new Date(Date.now() - 1800000), message: 'Lock safety audit: Zero double-booking collisions recorded.' }
  ]);

  // Computed metrics
  totalSeatsCount = computed(() => {
    return this.events().reduce((acc, curr) => acc + (curr.totalSeats || 60), 0);
  });

  statusCounts = computed(() => {
    const seats = this.currentSeats();
    return {
      available: seats.filter(s => s.status === SeatStatus.AVAILABLE).length,
      held: seats.filter(s => s.status === SeatStatus.HELD).length,
      booked: seats.filter(s => s.status === SeatStatus.BOOKED).length,
      blocked: seats.filter(s => s.status === SeatStatus.BLOCKED).length,
      maintenance: seats.filter(s => s.status === SeatStatus.MAINTENANCE).length,
    };
  });

  // Catalog Search, Filter & Helper Signals
  catalogSearchTerm = signal<string>('');
  catalogFilterGenre = signal<string>('ALL');

  filteredCatalogEvents = computed(() => {
    const term = this.catalogSearchTerm().toLowerCase().trim();
    const genre = this.catalogFilterGenre();
    return this.events().filter(e => {
      const matchText = !term ||
        (e.title && e.title.toLowerCase().includes(term)) ||
        (e.venue && e.venue.toLowerCase().includes(term)) ||
        (e.category && e.category.toLowerCase().includes(term));
      const matchGenre = genre === 'ALL' || e.category === genre;
      return matchText && matchGenre;
    });
  });

  onCatalogPosterError(event: Event): void {
    const target = event.target as HTMLImageElement;
    if (target) {
      target.src = 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=400&auto=format&fit=crop';
    }
  }

  openLiveEvent(id: string): void {
    if (typeof window !== 'undefined') {
      window.open(`/events/${id}`, '_blank');
    }
  }

  // Group seats by natural sorted rows
  groupedSeats = computed<RowGroup[]>(() => {
    const seats = [...this.currentSeats()];
    if (seats.length === 0) return [];

    // Natural alphanumeric sort (A-1, A-2, ..., A-9, A-10)
    seats.sort((a, b) => {
      const matchA = a.seatNumber.match(/^([A-Za-z]+)[-_ ]*(\d+)$/);
      const matchB = b.seatNumber.match(/^([A-Za-z]+)[-_ ]*(\d+)$/);
      if (matchA && matchB) {
        if (matchA[1] !== matchB[1]) {
          return matchA[1].localeCompare(matchB[1]);
        }
        return parseInt(matchA[2], 10) - parseInt(matchB[2], 10);
      }
      return a.seatNumber.localeCompare(b.seatNumber);
    });

    const map = new Map<string, Seat[]>();
    for (const seat of seats) {
      const rowChar = (seat.seatNumber.match(/^([A-Za-z]+)/)?.[1] || 'Row').toUpperCase();
      if (!map.has(rowChar)) {
        map.set(rowChar, []);
      }
      map.get(rowChar)!.push(seat);
    }

    return Array.from(map.entries()).map(([rowLabel, rowSeats]) => {
      const tier = rowSeats[0]?.tier || (rowLabel === 'A' ? 'VIP' : rowLabel === 'B' ? 'PLATINUM' : 'STANDARD');
      return { rowLabel, tier, seats: rowSeats };
    });
  });

  ngOnInit(): void {
    this.initDefaultDate();
    this.loadEvents();
  }

  private initDefaultDate(): void {
    const nextWeek = new Date(Date.now() + 86400000 * 7);
    nextWeek.setHours(20, 0, 0, 0);
    const pad = (n: number) => n.toString().padStart(2, '0');
    const yyyy = nextWeek.getFullYear();
    const mm = pad(nextWeek.getMonth() + 1);
    const dd = pad(nextWeek.getDate());
    const hh = pad(nextWeek.getHours());
    const min = pad(nextWeek.getMinutes());
    this.newEventDate = `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  }

  selectTab(tab: 'seats' | 'events' | 'traffic' | 'sweeper'): void {
    this.activeTab.set(tab);
    if (tab === 'seats' && this.selectedEventId()) {
      this.loadSeatsForEvent(this.selectedEventId());
    }
  }

  showToast(message: string, type: 'success' | 'error' | 'info' = 'success'): void {
    const id = Math.random().toString(36).substring(2, 9);
    this.toasts.update(list => [...list, { id, message, type }]);
    setTimeout(() => this.removeToast(id), 4000);
  }

  removeToast(id: string): void {
    this.toasts.update(list => list.filter(t => t.id !== id));
  }

  loadEvents(): void {
    this.apiService.getEvents().subscribe({
      next: (evts) => {
        this.events.set(evts || []);
        if (evts && evts.length > 0 && !this.selectedEventId()) {
          this.selectedEventId.set(evts[0].id);
          this.loadSeatsForEvent(evts[0].id);
        }
      },
      error: (err) => {
        console.warn('Events load error:', err);
      }
    });
  }

  onEventChange(eventId: string): void {
    this.selectedEventId.set(eventId);
    this.selectedSeat.set(null);
    this.loadSeatsForEvent(eventId);
  }

  switchToSeatMatrix(eventId: string): void {
    this.selectedEventId.set(eventId);
    this.activeTab.set('seats');
    this.loadSeatsForEvent(eventId);
  }

  loadSeatsForEvent(eventId: string): void {
    this.isLoadingSeats.set(true);
    this.apiService.getEventSeats(eventId).subscribe({
      next: (seats) => {
        this.currentSeats.set(seats || []);
        this.isLoadingSeats.set(false);
      },
      error: (err) => {
        console.warn('Seats load error:', err);
        this.isLoadingSeats.set(false);
      }
    });
  }

  selectSeat(seat: Seat): void {
    this.selectedSeat.set(seat);
    this.seatEditPrice = seat.price;
  }

  getSeatCapsuleClass(seat: Seat): string {
    const status = (seat.status || 'AVAILABLE').toLowerCase();
    return `cap-${status}`;
  }

  saveSeatPrice(): void {
    const seat = this.selectedSeat();
    if (!seat) return;
    this.isUpdatingSeat.set(true);
    const newPrice = Number(this.seatEditPrice);

    // Optimistic UI update
    seat.price = newPrice;
    this.selectedSeat.set({ ...seat });

    this.apiService.updateSeatPrice(seat.id, newPrice).subscribe({
      next: () => {
        this.isUpdatingSeat.set(false);
        this.showToast(`Seat ${seat.seatNumber} price updated to $${newPrice}`, 'success');
      },
      error: (err) => {
        this.isUpdatingSeat.set(false);
        const msg = err?.error?.message || 'Price update failed. Check admin authorization.';
        this.showToast(Array.isArray(msg) ? msg.join(', ') : msg, 'error');
      }
    });
  }

  setSeatStatus(status: 'AVAILABLE' | 'BLOCKED' | 'MAINTENANCE'): void {
    const seat = this.selectedSeat();
    if (!seat) return;
    this.isUpdatingSeat.set(true);

    // Optimistic UI update
    seat.status = status as SeatStatus;
    this.selectedSeat.set({ ...seat });

    this.apiService.updateSeatStatus(seat.id, status).subscribe({
      next: () => {
        this.isUpdatingSeat.set(false);
        this.showToast(`Seat ${seat.seatNumber} status updated to ${status}`, 'success');
      },
      error: (err) => {
        this.isUpdatingSeat.set(false);
        const msg = err?.error?.message || 'Status override failed.';
        this.showToast(Array.isArray(msg) ? msg.join(', ') : msg, 'error');
      }
    });
  }

  setImageSourceMode(mode: 'preset' | 'url' | 'upload'): void {
    this.imageSourceMode.set(mode);
    this.imageUploadError = '';
  }

  setPosterPreset(preset: 'dune' | 'oppenheimer' | 'spiderman' | 'bladerunner' | 'interstellar' | 'batman'): void {
    this.activePreset.set(preset);
    if (preset === 'dune') {
      this.newEventImage = 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1200&q=80';
      this.newEventCategory = 'IMAX_3D';
      if (!this.newEventTitle) this.newEventTitle = 'Dune: Part Two (IMAX 3D Laser)';
      if (!this.newEventVenue) this.newEventVenue = 'IMAX Laser Auditorium 1';
    } else if (preset === 'oppenheimer') {
      this.newEventImage = 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1200&q=80';
      this.newEventCategory = 'BLOCKBUSTER';
      if (!this.newEventTitle) this.newEventTitle = 'Oppenheimer (70mm IMAX Exclusive)';
      if (!this.newEventVenue) this.newEventVenue = 'Grand 70mm Screen 2';
    } else if (preset === 'spiderman') {
      this.newEventImage = 'https://images.unsplash.com/photo-1635805737707-575885ab0820?auto=format&fit=crop&w=1200&q=80';
      this.newEventCategory = 'ANIME_FEATURE';
      if (!this.newEventTitle) this.newEventTitle = 'Spider-Man: Beyond the Spider-Verse';
      if (!this.newEventVenue) this.newEventVenue = 'Dolby Cinema Hall 3';
    } else if (preset === 'bladerunner') {
      this.newEventImage = 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=1200&q=80';
      this.newEventCategory = 'SCIFI_FANTASY';
      if (!this.newEventTitle) this.newEventTitle = 'Blade Runner 2049 (Special 4K Laser)';
      if (!this.newEventVenue) this.newEventVenue = "Director's Club VIP Lounge";
    } else if (preset === 'interstellar') {
      this.newEventImage = 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80';
      this.newEventCategory = 'SCIFI_FANTASY';
      if (!this.newEventTitle) this.newEventTitle = 'Interstellar (10th Anniversary Re-release)';
      if (!this.newEventVenue) this.newEventVenue = 'IMAX Laser Auditorium 1';
    } else if (preset === 'batman') {
      this.newEventImage = 'https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?auto=format&fit=crop&w=1200&q=80';
      this.newEventCategory = 'DOLBY_CINEMA';
      if (!this.newEventTitle) this.newEventTitle = 'The Batman: Part II (Dolby Atmos Night)';
      if (!this.newEventVenue) this.newEventVenue = 'Dolby Cinema Hall 3';
    }
  }

  onCustomUrlChange(): void {
    if (this.customImageUrl && this.customImageUrl.trim()) {
      this.newEventImage = this.customImageUrl.trim();
      this.imageUploadError = '';
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    this.processImageFile(input.files[0]);
  }

  onFileDropped(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer && event.dataTransfer.files.length > 0) {
      this.processImageFile(event.dataTransfer.files[0]);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  private processImageFile(file: File): void {
    this.imageUploadError = '';
    if (!file.type.startsWith('image/')) {
      this.imageUploadError = 'Please upload a valid image file (.jpg, .png, .webp, .gif).';
      return;
    }
    if (file.size > 2.5 * 1024 * 1024) {
      this.imageUploadError = 'Image exceeds 2.5MB limit. Please choose a smaller image file.';
      return;
    }

    this.isUploadingFile = true;
    this.uploadedFileName = file.name;

    const reader = new FileReader();
    reader.onload = (e) => {
      this.newEventImage = e.target?.result as string;
      this.isUploadingFile = false;
      this.showToast(`Poster "${file.name}" loaded successfully!`, 'success');
    };
    reader.onerror = () => {
      this.imageUploadError = 'Could not read image file. Please try another image.';
      this.isUploadingFile = false;
    };
    reader.readAsDataURL(file);
  }

  clearCustomImage(): void {
    this.customImageUrl = '';
    this.uploadedFileName = '';
    this.imageUploadError = '';
    this.setPosterPreset('dune');
  }

  onPosterPreviewError(): void {
    this.newEventImage = 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1200&q=80';
    this.imageUploadError = 'Failed to load image from URL. Reverted to default poster.';
  }

  handleCreateEvent(): void {
    if (!this.newEventTitle || !this.newEventVenue) return;
    this.isSubmitting.set(true);

    const payload = {
      title: this.newEventTitle,
      description: this.newEventDesc || 'High-concurrency live cinema screening with Redis distributed lock protection.',
      venue: this.newEventVenue,
      eventDate: this.newEventDate ? new Date(this.newEventDate).toISOString() : new Date(Date.now() + 86400000 * 7).toISOString(),
      totalSeats: Number(this.newEventSeats) || 50,
      imageUrl: this.newEventImage,
      category: this.newEventCategory,
    };

    this.apiService.createEvent(payload).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.showToast(`Movie "${res.event.title}" published with ${res.seatsCount} auditorium seats!`, 'success');
        this.newEventTitle = '';
        this.newEventVenue = '';
        this.newEventDesc = '';
        this.initDefaultDate();
        this.loadEvents();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        const msg = err?.error?.message || 'Screening creation failed. Please verify organizer token.';
        this.showToast(Array.isArray(msg) ? msg.join(', ') : msg, 'error');
      }
    });
  }

  applyTrafficRule(): void {
    this.showToast(`Traffic Governor armed: ${this.queueRate()} users/sec admission limit active.`, 'success');
  }

  triggerEmergencyRelease(): void {
    this.isSweeping.set(true);
    this.apiService.emergencyReleaseAllLocks().subscribe({
      next: (res) => {
        this.isSweeping.set(false);
        this.showToast(`Deadlock Sweeper Complete: ${res.releasedCount} stuck locks purged.`, 'success');
        this.auditLogs.update(logs => [
          {
            timestamp: new Date(),
            message: `EMERGENCY SWEEP: ${res.releasedCount} keys purged from Redis cache. User: ${this.authService.currentUser()?.email}.`
          },
          ...logs
        ]);
        if (this.selectedEventId()) {
          this.loadSeatsForEvent(this.selectedEventId());
        }
      },
      error: (err) => {
        this.isSweeping.set(false);
        const msg = err?.error?.message || 'Emergency release failed. Admin superuser role required.';
        this.showToast(Array.isArray(msg) ? msg.join(', ') : msg, 'error');
      }
    });
  }

  quickSwitchAdmin(): void {
    this.authService.loginAsRole('ADMIN').subscribe({
      next: () => {
        this.showToast('Elevated to Platform Admin account (admin@aura.live).', 'success');
      }
    });
  }
}
