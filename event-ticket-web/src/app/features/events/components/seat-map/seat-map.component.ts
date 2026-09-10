import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Seat, SeatStatus, SeatTier } from '../../../../core/models/seat.model';

interface SeatSvgNode {
  seat: Seat;
  cx: number;
  cy: number;
  rowLabel: string;
  seatNumDisplay: string;
}

interface RowMarker {
  label: string;
  tier: string;
  lx: number;
  ly: number;
  rx: number;
  ry: number;
}

@Component({
  selector: 'app-seat-map',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="seat-map-wrapper">
      <!-- Top Control & Filter Toolbar -->
      <div class="map-toolbar">
        <div class="filter-chips-group">
          <button
            class="filter-chip"
            [class.active]="selectedTierFilter() === 'ALL'"
            (click)="setTierFilter('ALL')"
          >
            <span>All Seats</span>
            <span class="chip-count font-mono">{{ totalSeatsCount() }}</span>
          </button>
          <button
            class="filter-chip vip"
            [class.active]="selectedTierFilter() === 'VIP'"
            (click)="setTierFilter('VIP')"
          >
            <span class="dot"></span>
            <span>VIP Recliner ($28)</span>
          </button>
          <button
            class="filter-chip platinum"
            [class.active]="selectedTierFilter() === 'PLATINUM'"
            (click)="setTierFilter('PLATINUM')"
          >
            <span class="dot"></span>
            <span>Prime View ($20)</span>
          </button>
          <button
            class="filter-chip standard"
            [class.active]="selectedTierFilter() === 'STANDARD'"
            (click)="setTierFilter('STANDARD')"
          >
            <span class="dot"></span>
            <span>Standard ($14)</span>
          </button>
          <button
            class="filter-chip avail-only"
            [class.active]="availableOnlyFilter()"
            (click)="toggleAvailableOnly()"
          >
            <span class="dot pulse"></span>
            <span>Available Only</span>
          </button>
        </div>

        <div class="quick-action-group">
          <button
            class="btn btn-sm btn-primary auto-pick-btn font-mono"
            (click)="onAutoPick()"
            title="Automatically selects the closest available premium seat"
          >
            <span>⚡ Auto-Pick Best</span>
          </button>
        </div>
      </div>

      <!-- Arena SVG Canvas -->
      <div class="svg-canvas-container">
        <svg
          class="arena-svg"
          viewBox="0 0 1000 620"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <!-- Stage Glow Filter -->
            <filter id="stageGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="10" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            <!-- Radial Spotlight Cone Gradient -->
            <radialGradient id="spotlightCone" cx="50%" cy="0%" r="90%">
              <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.16" />
              <stop offset="45%" stop-color="#6366f1" stop-opacity="0.06" />
              <stop offset="100%" stop-color="#05070a" stop-opacity="0" />
            </radialGradient>

            <linearGradient id="stageArcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="#6366f1" stop-opacity="0.1" />
              <stop offset="25%" stop-color="#38bdf8" stop-opacity="0.9" />
              <stop offset="50%" stop-color="#a855f7" stop-opacity="1" />
              <stop offset="75%" stop-color="#38bdf8" stop-opacity="0.9" />
              <stop offset="100%" stop-color="#6366f1" stop-opacity="0.1" />
            </linearGradient>

            <!-- Seat Outer Glow on Selection -->
            <filter id="seatSelectGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="0" stdDeviation="6" flood-color="#38bdf8" flood-opacity="1" />
            </filter>
          </defs>

          <!-- Spotlight Radiating Beams from Stage -->
          <path d="M 420 40 L 80 580 L 920 580 Z" fill="url(#spotlightCone)" pointer-events="none" />

          <!-- Acoustic Focal Guide Lines & Center Walkway Indicator -->
          <line x1="500" y1="40" x2="160" y2="540" stroke="rgba(99, 102, 241, 0.1)" stroke-dasharray="6 6" />
          <line x1="500" y1="40" x2="840" y2="540" stroke="rgba(99, 102, 241, 0.1)" stroke-dasharray="6 6" />
          <!-- Center Aisle Line -->
          <line x1="500" y1="70" x2="500" y2="550" stroke="rgba(56, 189, 248, 0.18)" stroke-dasharray="4 4" />
          <text x="500" y="565" text-anchor="middle" class="aisle-label font-mono">✦ CENTER AISLE WALKWAY ✦</text>

          <!-- Stage Curved Apron Glowing Rim -->
          <path
            d="M 240 50 Q 500 110 760 50"
            fill="none"
            stroke="url(#stageArcGrad)"
            stroke-width="5"
            filter="url(#stageGlow)"
          />

          <!-- Stage Platform Body -->
          <g class="stage-svg-platform">
            <rect
              x="320"
              y="15"
              width="360"
              height="45"
              rx="12"
              fill="rgba(15, 23, 42, 0.9)"
              stroke="rgba(99, 102, 241, 0.45)"
              stroke-width="1.5"
            />
            <text
              x="500"
              y="37"
              text-anchor="middle"
              class="stage-svg-text font-display"
            >
              ✦ CINEMA SCREEN // CURVED IMAX PROJECTION ✦
            </text>
            <text
              x="500"
              y="52"
              text-anchor="middle"
              class="stage-sub-text font-mono"
            >
              AUDITORIUM PROJECTION AXIS // 100% IMMERSIVE SIGHTLINE
            </text>
          </g>

          <!-- Left & Right Minimalist Row Markers (Non-overlapping) -->
          @for (m of rowMarkers(); track m.label) {
            <!-- Left Marker -->
            <g class="row-marker left">
              <circle
                [attr.cx]="m.lx"
                [attr.cy]="m.ly"
                r="13"
                class="marker-circle"
                [class.tier-vip]="m.tier === 'VIP'"
                [class.tier-platinum]="m.tier === 'PLATINUM'"
                [class.tier-standard]="m.tier === 'STANDARD'"
              />
              <text
                [attr.x]="m.lx"
                [attr.y]="m.ly + 4"
                text-anchor="middle"
                class="marker-text font-mono"
              >
                {{ m.label }}
              </text>
            </g>

            <!-- Right Marker -->
            <g class="row-marker right">
              <circle
                [attr.cx]="m.rx"
                [attr.cy]="m.ry"
                r="13"
                class="marker-circle"
                [class.tier-vip]="m.tier === 'VIP'"
                [class.tier-platinum]="m.tier === 'PLATINUM'"
                [class.tier-standard]="m.tier === 'STANDARD'"
              />
              <text
                [attr.x]="m.rx"
                [attr.y]="m.ry + 4"
                text-anchor="middle"
                class="marker-text font-mono"
              >
                {{ m.label }}
              </text>
            </g>
          }

          <!-- Seats Layer -->
          @for (node of seatNodes(); track node.seat.id) {
            <g
              class="seat-node-group"
              [class.is-dimmed]="isSeatDimmed(node.seat)"
              [class.is-selected]="selectedSeat?.id === node.seat.id"
              (click)="onSeatClick(node.seat)"
              (mouseenter)="onHoverSeat(node)"
              (mouseleave)="onLeaveSeat()"
            >
              <!-- Stationary Transparent Hitbox (Guarantees zero cursor slippage / zero jitter) -->
              <rect
                [attr.x]="node.cx - 23"
                [attr.y]="node.cy - 22"
                width="46"
                height="44"
                fill="transparent"
                class="seat-hitbox"
              />

              <!-- Outer Glowing Halo for Selected Seat -->
              @if (selectedSeat?.id === node.seat.id) {
                <rect
                  [attr.x]="node.cx - 24"
                  [attr.y]="node.cy - 23"
                  width="48"
                  height="46"
                  rx="14"
                  fill="none"
                  stroke="#38bdf8"
                  stroke-width="2.5"
                  filter="url(#seatSelectGlow)"
                  class="select-halo"
                />
              }

              <!-- Chair Armchair Cushion Body (38px x 36px) -->
              <rect
                [attr.x]="node.cx - 19"
                [attr.y]="node.cy - 18"
                width="38"
                height="36"
                rx="10"
                class="seat-cushion"
                [class.status-available]="node.seat.status === 'AVAILABLE'"
                [class.status-held]="node.seat.status === 'HELD'"
                [class.status-booked]="node.seat.status === 'BOOKED'"
                [class.status-selected]="selectedSeat?.id === node.seat.id"
                [class.tier-vip]="node.seat.tier === 'VIP'"
                [class.tier-platinum]="node.seat.tier === 'PLATINUM'"
                [class.tier-standard]="node.seat.tier === 'STANDARD'"
              />

              <!-- Top Backrest Highlight Bar -->
              <rect
                [attr.x]="node.cx - 13"
                [attr.y]="node.cy - 14"
                width="26"
                height="3.5"
                rx="1.75"
                class="seat-backrest-bar"
                [class.bar-vip]="node.seat.tier === 'VIP'"
                [class.bar-plat]="node.seat.tier === 'PLATINUM'"
                [class.bar-std]="node.seat.tier === 'STANDARD'"
              />

              <!-- High-Contrast Clean Seat Number Typography -->
              <text
                [attr.x]="node.cx"
                [attr.y]="node.cy + 5"
                text-anchor="middle"
                class="seat-label-text font-mono"
              >
                {{ node.seatNumDisplay }}
              </text>
            </g>
          }

          <!-- SVG-Native Non-Jittering Micro Tooltip Tag (Renders at exact coordinates with zero delay) -->
          @if (hoveredSeatNode(); as hn) {
            <g class="svg-floating-tag" pointer-events="none">
              <rect
                [attr.x]="hn.cx - 48"
                [attr.y]="hn.cy - 46"
                width="96"
                height="22"
                rx="11"
                fill="rgba(5, 7, 10, 0.95)"
                stroke="#38bdf8"
                stroke-width="1.5"
                filter="url(#stageGlow)"
              />
              <text
                [attr.x]="hn.cx"
                [attr.y]="hn.cy - 31"
                text-anchor="middle"
                class="tag-text font-mono font-bold"
              >
                {{ hn.seat.seatNumber }} • \${{ hn.seat.price }}
              </text>
            </g>
          }
        </svg>
      </div>
    </div>
  `,
  styles: [`
    .seat-map-wrapper {
      position: relative;
      width: 100%;
      background: radial-gradient(circle at 50% 5%, rgba(99, 102, 241, 0.12) 0%, rgba(5, 7, 10, 0.98) 80%);
      border-radius: 20px;
      padding: 1.25rem 1rem 2rem;
      border: 1px solid rgba(255, 255, 255, 0.06);
    }

    /* Top Control Toolbar */
    .map-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 0.75rem;
      margin-bottom: 1.25rem;
      padding: 0.5rem 0.75rem;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border-subtle);
      border-radius: 12px;

      .filter-chips-group {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 0.45rem;

        .filter-chip {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--border-subtle);
          color: var(--text-secondary);
          font-size: 0.75rem;
          font-weight: 600;
          padding: 0.35rem 0.75rem;
          border-radius: 9999px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.45rem;
          transition: all 0.2s ease;

          .chip-count {
            background: rgba(255, 255, 255, 0.1);
            padding: 0.1rem 0.4rem;
            border-radius: 9999px;
            font-size: 0.68rem;
          }

          .dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            display: inline-block;
          }

          &.vip .dot { background: #c084fc; box-shadow: 0 0 6px #c084fc; }
          &.platinum .dot { background: #38bdf8; box-shadow: 0 0 6px #38bdf8; }
          &.standard .dot { background: #34d399; box-shadow: 0 0 6px #34d399; }
          &.avail-only .dot { background: #10b981; }

          &:hover {
            color: #ffffff;
            border-color: rgba(255, 255, 255, 0.2);
          }

          &.active {
            background: rgba(99, 102, 241, 0.25);
            border-color: rgba(99, 102, 241, 0.6);
            color: #ffffff;
            box-shadow: 0 0 12px rgba(99, 102, 241, 0.3);
          }
        }
      }

      .auto-pick-btn {
        background: linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%);
        border: none;
        color: #ffffff;
        font-weight: 700;
        box-shadow: 0 4px 14px rgba(6, 182, 212, 0.3);
        transition: transform 0.2s ease;

        &:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(6, 182, 212, 0.5);
        }
      }
    }

    /* SVG Canvas */
    .svg-canvas-container {
      position: relative;
      width: 100%;
      display: flex;
      justify-content: center;

      .arena-svg {
        width: 100%;
        height: auto;
        max-height: 570px;
        overflow: visible;
      }
    }

    /* Stage Platform Text */
    .stage-svg-text {
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.18em;
      fill: #f1f5f9;
    }

    .stage-sub-text {
      font-size: 7.5px;
      font-weight: 600;
      letter-spacing: 0.12em;
      fill: #38bdf8;
    }

    .aisle-label {
      font-size: 8px;
      font-weight: 700;
      letter-spacing: 0.16em;
      fill: rgba(56, 189, 248, 0.4);
    }

    /* Row Markers */
    .row-marker {
      .marker-circle {
        fill: rgba(15, 23, 42, 0.9);
        stroke: var(--border-subtle);
        stroke-width: 1.5;

        &.tier-vip { stroke: #c084fc; }
        &.tier-platinum { stroke: #38bdf8; }
        &.tier-standard { stroke: #34d399; }
      }

      .marker-text {
        font-size: 10px;
        font-weight: 800;
        fill: #ffffff;
      }
    }

    /* Zero-Jitter Seat Group */
    .seat-node-group {
      cursor: pointer;
      user-select: none;

      /* Hitbox is stationary so cursor never slips */
      .seat-hitbox {
        pointer-events: all;
      }

      .seat-cushion {
        transform-box: fill-box;
        transform-origin: center center;
        transition: transform 0.18s cubic-bezier(0.16, 1, 0.3, 1), fill 0.2s, stroke 0.2s, stroke-width 0.2s;
        stroke-width: 1.5;
      }

      &:hover:not(.is-dimmed) {
        .seat-cushion {
          transform: translateY(-3px) scale(1.04);
          filter: drop-shadow(0 4px 12px rgba(56, 189, 248, 0.6));
          stroke-width: 2.2;
        }

        .seat-backrest-bar {
          transform: translateY(-3px);
        }

        .seat-label-text {
          transform: translateY(-3px);
        }
      }

      &.is-dimmed {
        opacity: 0.18;
        filter: grayscale(80%);
        pointer-events: none;
      }
    }

    .seat-cushion {
      /* Available VIP */
      &.status-available.tier-vip {
        fill: #3b0764;
        stroke: #c084fc;
        fill-opacity: 0.88;

        &:hover {
          fill: #6b21a8;
          stroke: #e9d5ff;
        }
      }

      /* Available Platinum */
      &.status-available.tier-platinum {
        fill: #083344;
        stroke: #22d3ee;
        fill-opacity: 0.88;

        &:hover {
          fill: #0e7490;
          stroke: #67e8f9;
        }
      }

      /* Available Standard */
      &.status-available.tier-standard {
        fill: #022c22;
        stroke: #34d399;
        fill-opacity: 0.88;

        &:hover {
          fill: #047857;
          stroke: #6ee7b7;
        }
      }

      /* Held / Locked (5-Min Atomic) */
      &.status-held {
        fill: #451a03;
        stroke: #f59e0b;
        fill-opacity: 0.9;
        cursor: not-allowed;
      }

      /* Booked */
      &.status-booked {
        fill: #0f172a;
        stroke: #334155;
        fill-opacity: 0.45;
        cursor: not-allowed;
      }

      /* Selected */
      &.status-selected {
        fill: #0369a1;
        stroke: #38bdf8;
        stroke-width: 3;
        fill-opacity: 1;
      }
    }

    .seat-backrest-bar {
      opacity: 0.7;
      transform-box: fill-box;
      transform-origin: center center;
      transition: transform 0.18s cubic-bezier(0.16, 1, 0.3, 1);
      pointer-events: none;

      &.bar-vip { fill: #e9d5ff; }
      &.bar-plat { fill: #a5f3fc; }
      &.bar-std { fill: #a7f3d0; }
    }

    .seat-label-text {
      font-size: 10.5px;
      font-weight: 800;
      fill: #ffffff;
      pointer-events: none;
      transform-box: fill-box;
      transform-origin: center center;
      transition: transform 0.18s cubic-bezier(0.16, 1, 0.3, 1);
      letter-spacing: -0.02em;
    }

    .select-halo {
      animation: halo-pulse 1.8s infinite ease-in-out;
      pointer-events: none;
    }

    @keyframes halo-pulse {
      0% { transform: scale(1); opacity: 0.9; }
      50% { transform: scale(1.1); opacity: 0.4; }
      100% { transform: scale(1); opacity: 0.9; }
    }

    /* SVG Floating Micro-Tag */
    .svg-floating-tag {
      .tag-text {
        font-size: 9.5px;
        fill: #38bdf8;
      }
    }
  `],
})
export class SeatMapComponent {
  @Input({ required: true }) set seats(seatsList: Seat[]) {
    this._seats = seatsList || [];
    this.computeCurvedLayout(this._seats);
  }
  @Input() selectedSeat: Seat | null = null;

  @Output() seatSelected = new EventEmitter<Seat>();
  @Output() seatHovered = new EventEmitter<Seat | null>();

  private _seats: Seat[] = [];
  readonly seatNodes = signal<SeatSvgNode[]>([]);
  readonly rowMarkers = signal<RowMarker[]>([]);

  readonly hoveredSeatNode = signal<SeatSvgNode | null>(null);

  readonly selectedTierFilter = signal<'ALL' | 'VIP' | 'PLATINUM' | 'STANDARD'>('ALL');
  readonly availableOnlyFilter = signal<boolean>(false);

  readonly totalSeatsCount = computed(() => this._seats.length);

  private computeCurvedLayout(seats: Seat[]): void {
    const nodes: SeatSvgNode[] = [];
    const markers: RowMarker[] = [];

    const centerX = 500;
    const centerY = 40;

    // Configured amphitheater with center aisle gap
    const rowConfig = [
      { row: 'A', tier: 'VIP', count: 8, radius: 175, angleStart: 42, angleEnd: 138 },
      { row: 'B', tier: 'PLATINUM', count: 10, radius: 255, angleStart: 36, angleEnd: 144 },
      { row: 'C', tier: 'STANDARD', count: 12, radius: 335, angleStart: 30, angleEnd: 150 },
      { row: 'D', tier: 'STANDARD', count: 14, radius: 415, angleStart: 26, angleEnd: 154 },
      { row: 'E', tier: 'STANDARD', count: 16, radius: 495, angleStart: 22, angleEnd: 158 },
    ];

    let seatIndex = 0;
    for (const config of rowConfig) {
      // Place row markers at the outer flanks with safe 28px clearance
      const lAngleRad = (config.angleStart - 7) * (Math.PI / 180);
      const rAngleRad = (config.angleEnd + 7) * (Math.PI / 180);

      markers.push({
        label: config.row,
        tier: config.tier,
        lx: Math.round(centerX + config.radius * Math.cos(lAngleRad)),
        ly: Math.round(centerY + config.radius * Math.sin(lAngleRad)),
        rx: Math.round(centerX + config.radius * Math.cos(rAngleRad)),
        ry: Math.round(centerY + config.radius * Math.sin(rAngleRad)),
      });

      const half = config.count / 2;
      const aisleGapDeg = 6; // Angular gap for center walkway aisle
      const totalSpan = config.angleEnd - config.angleStart - aisleGapDeg;
      const step = totalSpan / (config.count - 2);

      for (let i = 0; i < config.count; i++) {
        if (seatIndex >= seats.length) break;
        const seat = seats[seatIndex];

        // Apply aisle shift for right half
        let angleDeg: number;
        if (i < half) {
          angleDeg = config.angleStart + i * step;
        } else {
          angleDeg = config.angleStart + (i - 1) * step + aisleGapDeg;
        }

        const angleRad = (angleDeg * Math.PI) / 180;
        const cx = centerX + config.radius * Math.cos(angleRad);
        const cy = centerY + config.radius * Math.sin(angleRad);

        // Format clean seat label e.g. "A1", "B4"
        const numPart = seat.seatNumber.includes('-')
          ? seat.seatNumber.split('-')[1]
          : seat.seatNumber.replace(/^[A-Za-z]+/, '');
        const seatNumDisplay = `${config.row}${numPart || i + 1}`;

        nodes.push({
          seat,
          cx: Math.round(cx),
          cy: Math.round(cy),
          rowLabel: config.row,
          seatNumDisplay,
        });

        seatIndex++;
      }
    }

    this.seatNodes.set(nodes);
    this.rowMarkers.set(markers);
  }

  setTierFilter(tier: 'ALL' | 'VIP' | 'PLATINUM' | 'STANDARD'): void {
    this.selectedTierFilter.set(tier);
  }

  toggleAvailableOnly(): void {
    this.availableOnlyFilter.update((v) => !v);
  }

  isSeatDimmed(seat: Seat): boolean {
    const tier = this.selectedTierFilter();
    const availOnly = this.availableOnlyFilter();

    if (availOnly && seat.status !== SeatStatus.AVAILABLE) {
      return true;
    }
    if (tier !== 'ALL' && (seat.tier || 'STANDARD') !== tier) {
      return true;
    }
    return false;
  }

  onAutoPick(): void {
    const available = this._seats.filter((s) => s.status === SeatStatus.AVAILABLE);
    if (available.length === 0) return;

    // Prioritize VIP Front, then Platinum, then Standard
    const best =
      available.find((s) => s.tier === 'VIP') ||
      available.find((s) => s.tier === 'PLATINUM') ||
      available[0];

    if (best) {
      this.seatSelected.emit(best);
    }
  }

  onSeatClick(seat: Seat): void {
    if (seat.status === SeatStatus.AVAILABLE) {
      this.seatSelected.emit(seat);
    }
  }

  onHoverSeat(node: SeatSvgNode): void {
    this.hoveredSeatNode.set(node);
    this.seatHovered.emit(node.seat);
  }

  onLeaveSeat(): void {
    this.hoveredSeatNode.set(null);
    this.seatHovered.emit(null);
  }
}
