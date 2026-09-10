import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-waiting-room',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="waiting-room-page">
      <div class="waiting-card glass-panel">
        <!-- Live Drop Indicator -->
        <div class="queue-status-bar">
          <div class="badge badge-amber">
            <span class="status-dot holding"></span>
            <span>HIGH-DEMAND TICKET DROP // QUEUE-IT PROTECTED</span>
          </div>
          <span class="room-clock font-mono text-muted text-xs">{{ currentTime() }}</span>
        </div>

        <!-- Event Meta -->
        <div class="event-info">
          <h1 class="event-title font-display">{{ eventTitle() }}</h1>
          <p class="event-venue text-secondary">{{ eventVenue() }}</p>
        </div>

        <!-- Animated Circular Queue Position Gauge -->
        <div class="gauge-container">
          <div class="outer-glow-ring"></div>
          <div class="gauge-center">
            @if (isAdmitted()) {
              <div class="admitted-state">
                <span class="check-icon">✓</span>
                <span class="admitted-text font-display font-bold">YOU'RE NEXT!</span>
                <span class="text-xs text-emerald font-mono">ADMISSION GRANTED</span>
              </div>
            } @else {
              <div class="waiting-state font-mono">
                <span class="position-label text-muted text-xs">YOUR QUEUE POSITION</span>
                <span class="position-number">#{{ queuePosition() }}</span>
                <span class="wait-time text-amber font-semibold">{{ formattedWaitTime() }}</span>
              </div>
            }
          </div>
        </div>

        <!-- Queue Status Summary -->
        <div class="queue-summary-box font-mono">
          <div class="summary-col">
            <span class="col-lbl">FANS AHEAD</span>
            <span class="col-num">{{ fansAhead() }}</span>
          </div>
          <div class="summary-col">
            <span class="col-lbl">ADMISSION VELOCITY</span>
            <span class="col-num text-emerald">~10 / SEC</span>
          </div>
          <div class="summary-col">
            <span class="col-lbl">SERVER ENGINE</span>
            <span class="col-num text-indigo">REDIS ATOMIC</span>
          </div>
        </div>

        <!-- Progress Description -->
        <div class="queue-notice text-sm text-secondary">
          <p>
            You are in a virtual waiting line to prevent server saturation and ensure fair seat selection.
            <strong>Please keep this window open.</strong> When your turn arrives, you will be smoothly redirected into the arena.
          </p>
        </div>

        <!-- Action / Bypass options -->
        <div class="action-footer">
          @if (isAdmitted()) {
            <a [routerLink]="['/events', eventId]" class="btn btn-primary w-full py-3 font-display">
              <span>Enter Arena Now →</span>
            </a>
          } @else {
            <button (click)="skipQueueForDev()" class="btn btn-ghost btn-sm text-muted font-mono">
              [⚡ Dev / VIP Instant Pass]
            </button>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .waiting-room-page {
      min-height: calc(100vh - 72px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem 1.5rem;
      background: radial-gradient(circle at 50% 30%, rgba(99, 102, 241, 0.12) 0%, transparent 60%);
    }

    .waiting-card {
      width: 100%;
      max-width: 580px;
      padding: 2.5rem;
      text-align: center;
      border: 1px solid rgba(245, 158, 11, 0.35);
      box-shadow: 0 25px 60px rgba(0, 0, 0, 0.8), 0 0 40px rgba(245, 158, 11, 0.15);
      position: relative;
    }

    .queue-status-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.5rem;
    }

    .event-info {
      margin-bottom: 2rem;

      .event-title {
        font-size: 1.85rem;
        font-weight: 800;
        color: #ffffff;
        margin-bottom: 0.25rem;
      }
    }

    .gauge-container {
      position: relative;
      width: 220px;
      height: 220px;
      margin: 0 auto 2rem;
      display: flex;
      align-items: center;
      justify-content: center;

      .outer-glow-ring {
        position: absolute;
        inset: 0;
        border-radius: 50%;
        border: 4px solid rgba(245, 158, 11, 0.3);
        border-top-color: #fbbf24;
        border-right-color: #f59e0b;
        animation: spin 3s linear infinite;
        box-shadow: 0 0 25px rgba(245, 158, 11, 0.3);
      }

      .gauge-center {
        position: relative;
        z-index: 2;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;

        .waiting-state {
          display: flex;
          flex-direction: column;
          align-items: center;

          .position-number {
            font-size: 3.2rem;
            font-weight: 800;
            color: #ffffff;
            line-height: 1;
            margin: 0.2rem 0;
            letter-spacing: -0.04em;
          }

          .wait-time {
            font-size: 0.95rem;
          }
        }

        .admitted-state {
          display: flex;
          flex-direction: column;
          align-items: center;

          .check-icon {
            font-size: 3rem;
            color: #10b981;
            animation: pop-scale 0.4s ease;
          }

          .admitted-text {
            font-size: 1.35rem;
            color: #ffffff;
          }
        }
      }
    }

    .queue-summary-box {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
      background: rgba(0, 0, 0, 0.4);
      border: 1px solid var(--border-subtle);
      border-radius: 10px;
      padding: 1rem;
      margin-bottom: 1.5rem;

      .summary-col {
        display: flex;
        flex-direction: column;
        align-items: center;

        .col-lbl {
          font-size: 0.65rem;
          color: var(--text-muted);
        }

        .col-num {
          font-size: 1rem;
          font-weight: 700;
          margin-top: 0.2rem;
        }
      }
    }

    .queue-notice {
      line-height: 1.55;
      margin-bottom: 2rem;

      strong {
        color: #ffffff;
      }
    }

    .action-footer {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;

      .w-full {
        width: 100%;
      }
    }

    @keyframes spin {
      100% { transform: rotate(360deg); }
    }

    @keyframes pop-scale {
      0% { transform: scale(0.5); }
      100% { transform: scale(1); }
    }
  `],
})
export class WaitingRoomComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly apiService = inject(ApiService);
  private readonly authService = inject(AuthService);

  eventId = '';
  queueId = '';
  private pollInterval: any = null;

  readonly eventTitle = signal<string>('Neon Odyssey // Cyber Drop 2026');
  readonly eventVenue = signal<string>('Cyber Arena, Neo Tokyo');
  readonly queuePosition = signal<number>(24);
  readonly estimatedSeconds = signal<number>(48);
  readonly isAdmitted = signal<boolean>(false);
  readonly currentTime = signal<string>(new Date().toLocaleTimeString());

  get fansAhead(): () => number {
    return () => Math.max(0, this.queuePosition() - 1);
  }

  get formattedWaitTime(): () => string {
    return () => {
      const sec = this.estimatedSeconds();
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      return `Estimated wait: ${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };
  }

  ngOnInit(): void {
    this.eventId = this.route.snapshot.paramMap.get('id') || 'default-event';

    // 1. Fetch Event Info
    this.apiService.getEvent(this.eventId).subscribe({
      next: (ev) => {
        this.eventTitle.set(ev.title);
        this.eventVenue.set(ev.venue);
      },
      error: () => {},
    });

    // 2. Join Virtual Queue
    const userId = this.authService.currentUser()?.id || 'fan-' + Math.random().toString(36).substring(2, 6);
    this.apiService.joinQueue(this.eventId, userId).subscribe({
      next: (res) => {
        this.queueId = res.queueId;
        this.queuePosition.set(res.position);
        this.estimatedSeconds.set(res.estimatedWaitSeconds);

        if (res.status === 'ADMITTED') {
          this.triggerAdmission();
        } else {
          this.startPolling();
        }
      },
      error: () => {
        // Simulated local fallback
        this.queueId = 'mock-q-' + Math.random().toString(36).substring(2, 6);
        this.queuePosition.set(18);
        this.estimatedSeconds.set(36);
        this.startPolling();
      },
    });
  }

  private startPolling(): void {
    this.pollInterval = setInterval(() => {
      this.currentTime.set(new Date().toLocaleTimeString());

      if (this.queueId) {
        this.apiService.getQueueStatus(this.eventId, this.queueId).subscribe({
          next: (res) => {
            this.queuePosition.set(res.position);
            this.estimatedSeconds.set(res.estimatedWaitSeconds);

            if (res.status === 'ADMITTED') {
              this.triggerAdmission();
            }
          },
          error: () => {
            // Smoothly decrease simulated wait
            const curPos = this.queuePosition();
            if (curPos > 1) {
              this.queuePosition.set(Math.max(1, curPos - 2));
              this.estimatedSeconds.set(Math.max(2, (curPos - 2) * 2));
            } else {
              this.triggerAdmission();
            }
          },
        });
      }
    }, 3000);
  }

  private triggerAdmission(): void {
    if (this.pollInterval) clearInterval(this.pollInterval);
    this.isAdmitted.set(true);
    this.queuePosition.set(0);

    // Auto-navigate after 1.5s
    setTimeout(() => {
      this.router.navigate(['/events', this.eventId]);
    }, 1500);
  }

  skipQueueForDev(): void {
    this.triggerAdmission();
  }

  ngOnDestroy(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
  }
}
