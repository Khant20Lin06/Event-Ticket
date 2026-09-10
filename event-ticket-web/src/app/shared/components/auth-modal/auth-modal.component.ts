import { Component, inject, signal, Output, EventEmitter, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService, UserProfile } from '../../../core/services/auth.service';

@Component({
  selector: 'app-auth-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (authService.isAuthModalOpen()) {
      <div class="auth-modal-backdrop" (click)="onBackdropClick($event)">
        <div class="auth-modal-card glass-panel" (click)="$event.stopPropagation()">
          <!-- Glow Accent Flare -->
          <div class="glow-accent-orb"></div>

          <!-- Modal Close Button -->
          <button class="modal-close-btn" (click)="close()" [disabled]="isLoading()" title="Close (Esc)">
            ✕
          </button>

          <!-- Contextual Seat Notification Banner if triggered by seat hold -->
          @if (authService.authModalContext(); as ctx) {
            <div class="seat-reservation-pill">
              <span class="pulse-indicator"></span>
              <div class="pill-text">
                <span class="pill-title font-display">
                  {{ ctx.title || 'SEAT SELECTION WAITING' }}
                </span>
                <span class="pill-sub font-mono">
                  {{ ctx.message || 'Authenticate to start your 5-minute atomic lock.' }}
                </span>
              </div>
            </div>
          }

          <!-- Header -->
          <div class="modal-header">
            <div class="brand-badge font-mono">
              <span class="badge-dot"></span>
              <span>AURA SECURE AUTHENTICATION</span>
            </div>
            <h2 class="modal-title font-display">
              {{ activeTab() === 'signin' ? 'Welcome Back, Fan' : 'Create Fan Account' }}
            </h2>
            <p class="modal-subtitle">
              {{ activeTab() === 'signin'
                ? 'Sign in to confirm your seat reservation and access instant checkout.'
                : 'Join the next-gen ticketing network with concurrency-protected passes.'
              }}
            </p>
          </div>

          <!-- Mode Switcher Tabs -->
          <div class="tab-switcher">
            <button
              type="button"
              class="tab-btn font-display"
              [class.active]="activeTab() === 'signin'"
              (click)="switchTab('signin')"
            >
              Sign In
            </button>
            <button
              type="button"
              class="tab-btn font-display"
              [class.active]="activeTab() === 'register'"
              (click)="switchTab('register')"
            >
              Create Fan Account
            </button>
          </div>

          <!-- Error Alert Banner -->
          @if (errorMessage()) {
            <div class="error-banner font-mono">
              <span class="error-icon">⚠️</span>
              <span class="error-text">{{ errorMessage() }}</span>
            </div>
          }

          <!-- 1-Click Role Logins (Enterprise Instant Eval) -->
          <div class="quick-demo-section">
            <div class="role-selector-label font-mono">⚡ QUICK DEMO ACCESS BY ROLE</div>
            <div class="role-cards-grid">
              <button
                type="button"
                (click)="quickLoginRole('FAN')"
                class="btn-demo-pill fan-pill"
                [disabled]="isLoading()"
                title="Login as Fan (user1@gmail.com)"
              >
                <span class="role-icon">👤</span>
                <div class="role-info">
                  <span class="role-name font-display">Fan</span>
                  <span class="role-email font-mono">user1&#64;gmail.com</span>
                </div>
              </button>

              <button
                type="button"
                (click)="quickLoginRole('ORGANIZER')"
                class="btn-demo-pill organizer-pill"
                [disabled]="isLoading()"
                title="Login as Organizer (organizer@aura.live)"
              >
                <span class="role-icon">🎪</span>
                <div class="role-info">
                  <span class="role-name font-display">Organizer</span>
                  <span class="role-email font-mono">organizer&#64;aura.live</span>
                </div>
              </button>

              <button
                type="button"
                (click)="quickLoginRole('ADMIN')"
                class="btn-demo-pill admin-pill"
                [disabled]="isLoading()"
                title="Login as Platform Admin (admin@aura.live)"
              >
                <span class="role-icon">🛡️</span>
                <div class="role-info">
                  <span class="role-name font-display">Admin</span>
                  <span class="role-email font-mono">admin&#64;aura.live</span>
                </div>
              </button>
            </div>

            <div class="divider-row">
              <span class="divider-line"></span>
              <span class="divider-label font-mono">OR CONTINUE WITH CREDENTIALS</span>
              <span class="divider-line"></span>
            </div>
          </div>

          <!-- Forms -->
          @if (activeTab() === 'signin') {
            <!-- Sign In Form -->
            <form (ngSubmit)="handleSignIn()" class="auth-form">
              <div class="form-group">
                <label class="form-label font-mono" for="signin-email">EMAIL ADDRESS</label>
                <input
                  id="signin-email"
                  type="email"
                  name="email"
                  [(ngModel)]="email"
                  placeholder="name@example.com"
                  required
                  class="form-input font-mono"
                  [disabled]="isLoading()"
                />
              </div>

              <div class="form-group">
                <label class="form-label font-mono" for="signin-password">PASSWORD</label>
                <input
                  id="signin-password"
                  type="password"
                  name="password"
                  [(ngModel)]="password"
                  placeholder="••••••••"
                  required
                  class="form-input"
                  [disabled]="isLoading()"
                />
              </div>

              <button
                type="submit"
                class="btn btn-primary w-full submit-btn font-display"
                [disabled]="isLoading() || !email || !password"
              >
                @if (isLoading()) {
                  <span class="spinner-inline"></span>
                  <span>Verifying Credentials...</span>
                } @else {
                  <span>Sign In & Continue →</span>
                }
              </button>
            </form>
          } @else {
            <!-- Register Form -->
            <form (ngSubmit)="handleRegister()" class="auth-form">
              <div class="form-group">
                <label class="form-label font-mono" for="reg-name">FAN / DISPLAY NAME</label>
                <input
                  id="reg-name"
                  type="text"
                  name="name"
                  [(ngModel)]="name"
                  placeholder="Alex Mercer"
                  required
                  class="form-input"
                  [disabled]="isLoading()"
                />
              </div>

              <div class="form-group">
                <label class="form-label font-mono" for="reg-email">EMAIL ADDRESS</label>
                <input
                  id="reg-email"
                  type="email"
                  name="email"
                  [(ngModel)]="email"
                  placeholder="alex@aura.live"
                  required
                  class="form-input font-mono"
                  [disabled]="isLoading()"
                />
              </div>

              <div class="form-group">
                <label class="form-label font-mono" for="reg-password">PASSWORD (MIN 6 CHARACTERS)</label>
                <input
                  id="reg-password"
                  type="password"
                  name="password"
                  [(ngModel)]="password"
                  placeholder="••••••••"
                  required
                  minlength="6"
                  class="form-input"
                  [disabled]="isLoading()"
                />
              </div>

              <button
                type="submit"
                class="btn btn-primary w-full submit-btn font-display"
                [disabled]="isLoading() || !name || !email || password.length < 6"
              >
                @if (isLoading()) {
                  <span class="spinner-inline"></span>
                  <span>Creating Fan Account...</span>
                } @else {
                  <span>Create Account & Lock Seat →</span>
                }
              </button>
            </form>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    .auth-modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(4, 7, 13, 0.88);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 300;
      padding: 1.5rem;
      animation: modalFadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .auth-modal-card {
      position: relative;
      width: 100%;
      max-width: 480px;
      padding: 2.25rem 2.25rem 2.5rem;
      border-radius: 20px;
      background: rgba(14, 19, 32, 0.95);
      border: 1px solid rgba(99, 102, 241, 0.35);
      box-shadow: 0 30px 80px rgba(0, 0, 0, 0.9), 0 0 50px rgba(99, 102, 241, 0.2);
      overflow: hidden;
      animation: cardPop 0.28s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .glow-accent-orb {
      position: absolute;
      top: -80px;
      right: -80px;
      width: 220px;
      height: 220px;
      background: radial-gradient(circle, rgba(99, 102, 241, 0.25) 0%, rgba(6, 182, 212, 0.1) 60%, transparent 80%);
      pointer-events: none;
      filter: blur(35px);
    }

    .modal-close-btn {
      position: absolute;
      top: 1.25rem;
      right: 1.25rem;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid var(--border-subtle);
      color: var(--text-secondary);
      font-size: 0.9rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;

      &:hover:not(:disabled) {
        background: rgba(255, 255, 255, 0.14);
        color: #ffffff;
        transform: rotate(90deg);
      }
    }

    .seat-reservation-pill {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid rgba(16, 185, 129, 0.35);
      border-radius: 10px;
      padding: 0.65rem 0.9rem;
      margin-bottom: 1.25rem;

      .pulse-indicator {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: var(--seat-available);
        box-shadow: 0 0 10px var(--seat-available);
        flex-shrink: 0;
        animation: pulseLive 1.5s infinite;
      }

      .pill-text {
        display: flex;
        flex-direction: column;

        .pill-title {
          font-size: 0.76rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          color: #34d399;
        }

        .pill-sub {
          font-size: 0.68rem;
          color: var(--text-secondary);
        }
      }
    }

    .modal-header {
      margin-bottom: 1.5rem;

      .brand-badge {
        display: inline-flex;
        align-items: center;
        gap: 0.45rem;
        font-size: 0.66rem;
        font-weight: 700;
        letter-spacing: 0.14em;
        color: var(--primary-light);
        margin-bottom: 0.5rem;

        .badge-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--primary-light);
        }
      }

      .modal-title {
        font-size: 1.65rem;
        font-weight: 800;
        color: #ffffff;
        letter-spacing: -0.01em;
        margin-bottom: 0.35rem;
      }

      .modal-subtitle {
        font-size: 0.84rem;
        color: var(--text-secondary);
        line-height: 1.45;
      }
    }

    .tab-switcher {
      display: grid;
      grid-template-columns: 1fr 1fr;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid var(--border-subtle);
      border-radius: 12px;
      padding: 0.25rem;
      margin-bottom: 1.5rem;

      .tab-btn {
        padding: 0.65rem 0.5rem;
        border: none;
        background: transparent;
        color: var(--text-secondary);
        font-size: 0.86rem;
        font-weight: 600;
        border-radius: 9px;
        cursor: pointer;
        transition: all 0.2s ease;

        &.active {
          background: var(--primary);
          color: #ffffff;
          box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);
        }

        &:hover:not(.active) {
          color: var(--text-primary);
        }
      }
    }

    .error-banner {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      background: rgba(239, 68, 68, 0.12);
      border: 1px solid rgba(239, 68, 68, 0.35);
      border-radius: 9px;
      padding: 0.6rem 0.85rem;
      margin-bottom: 1.25rem;
      font-size: 0.74rem;
      color: #fca5a5;
    }

    .quick-demo-section {
      margin-bottom: 1.5rem;

      .role-selector-label {
        font-size: 0.65rem;
        font-weight: 700;
        letter-spacing: 0.1em;
        color: var(--primary-light);
        margin-bottom: 0.6rem;
      }

      .role-cards-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 0.5rem;

        @media (max-width: 480px) {
          grid-template-columns: 1fr;
        }
      }

      .btn-demo-pill {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        padding: 0.65rem 0.75rem;
        border-radius: 10px;
        cursor: pointer;
        transition: all 0.2s ease;
        text-align: left;
        border: 1px solid var(--border-subtle);
        background: rgba(255, 255, 255, 0.03);

        .role-icon {
          font-size: 1.25rem;
          margin-bottom: 0.25rem;
        }

        .role-info {
          display: flex;
          flex-direction: column;

          .role-name {
            font-size: 0.8rem;
            font-weight: 700;
            color: #ffffff;
          }

          .role-email {
            font-size: 0.58rem;
            color: #94a3b8;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 110px;
          }
        }

        &:hover:not(:disabled) {
          transform: translateY(-2px);
        }

        &.fan-pill:hover:not(:disabled) {
          background: rgba(99, 102, 241, 0.15);
          border-color: rgba(99, 102, 241, 0.5);
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
        }

        &.organizer-pill:hover:not(:disabled) {
          background: rgba(168, 85, 247, 0.15);
          border-color: rgba(168, 85, 247, 0.5);
          box-shadow: 0 4px 12px rgba(168, 85, 247, 0.2);
        }

        &.admin-pill:hover:not(:disabled) {
          background: rgba(239, 68, 68, 0.15);
          border-color: rgba(239, 68, 68, 0.5);
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2);
        }
      }

      .divider-row {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        margin: 1.25rem 0 0.25rem;

        .divider-line {
          flex: 1;
          height: 1px;
          background: var(--border-subtle);
        }

        .divider-label {
          font-size: 0.62rem;
          font-weight: 700;
          color: var(--text-muted);
          letter-spacing: 0.1em;
        }
      }
    }

    .auth-form {
      display: flex;
      flex-direction: column;
      gap: 1.1rem;

      .form-group {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;

        .form-label {
          font-size: 0.68rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          color: var(--text-secondary);
        }

        .form-input {
          width: 100%;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-light);
          border-radius: 9px;
          padding: 0.75rem 0.95rem;
          font-size: 0.9rem;
          color: #ffffff;
          transition: all 0.2s ease;

          &:focus {
            outline: none;
            border-color: var(--primary);
            background: rgba(255, 255, 255, 0.06);
            box-shadow: 0 0 12px rgba(99, 102, 241, 0.3);
          }

          &::placeholder {
            color: var(--text-muted);
          }
        }
      }

      .submit-btn {
        padding: 0.85rem;
        font-size: 0.95rem;
        font-weight: 700;
        letter-spacing: 0.02em;
        border-radius: 10px;
        margin-top: 0.4rem;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
      }
    }

    .w-full {
      width: 100%;
    }

    .spinner-inline {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: #ffffff;
      border-radius: 50%;
      animation: spin 0.75s linear infinite;
      display: inline-block;
    }

    @keyframes modalFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes cardPop {
      from { opacity: 0; transform: scale(0.94) translateY(8px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }

    @keyframes pulseLive {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(0.85); }
    }

    @keyframes spin {
      100% { transform: rotate(360deg); }
    }
  `],
})
export class AuthModalComponent {
  readonly authService = inject(AuthService);

  @Output() loginSuccess = new EventEmitter<UserProfile>();

  activeTab = signal<'signin' | 'register'>('signin');
  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  // Form Fields
  name = '';
  email = '';
  password = '';

  @HostListener('window:keydown.escape')
  onEscape(): void {
    if (!this.isLoading() && this.authService.isAuthModalOpen()) {
      this.close();
    }
  }

  switchTab(tab: 'signin' | 'register'): void {
    this.activeTab.set(tab);
    this.errorMessage.set(null);
  }

  onBackdropClick(event: MouseEvent): void {
    if (!this.isLoading()) {
      this.close();
    }
  }

  close(): void {
    this.authService.closeAuthModal();
    this.errorMessage.set(null);
  }

  quickDemoFanLogin(): void {
    this.quickLoginRole('FAN');
  }

  quickLoginRole(role: 'ADMIN' | 'ORGANIZER' | 'FAN'): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.authService.loginAsRole(role).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.loginSuccess.emit(res.user);
        this.authService.closeAuthModal();
      },
      error: (err) => {
        console.warn('Backend offline or credentials not seeded, applying instant demo session fallback:', err);
        const fallbackUser: UserProfile = {
          id: `demo-${role.toLowerCase()}-01`,
          email: role === 'ADMIN' ? 'admin@aura.live' : role === 'ORGANIZER' ? 'organizer@aura.live' : 'user1@gmail.com',
          name: role === 'ADMIN' ? 'Platform Admin' : role === 'ORGANIZER' ? 'Event Organizer' : 'Demo Fan 01',
          role: role,
        };
        this.authService.setDemoSessionDirectly(fallbackUser);
        this.isLoading.set(false);
        this.loginSuccess.emit(fallbackUser);
        this.authService.closeAuthModal();
      },
    });
  }

  handleSignIn(): void {
    if (!this.email || !this.password) {
      this.errorMessage.set('Please enter both email and password.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.authService.login({ email: this.email, password: this.password }).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.loginSuccess.emit(res.user);
        this.authService.closeAuthModal();
      },
      error: (err) => {
        this.isLoading.set(false);
        const msg = err?.error?.message || 'Invalid email or password. Try 1-Click Demo Sign In above.';
        this.errorMessage.set(Array.isArray(msg) ? msg.join(', ') : msg);
      },
    });
  }

  handleRegister(): void {
    if (!this.name || !this.email || !this.password) {
      this.errorMessage.set('Please fill out all registration fields.');
      return;
    }
    if (this.password.length < 6) {
      this.errorMessage.set('Password must be at least 6 characters.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.authService.register({ name: this.name, email: this.email, password: this.password }).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.loginSuccess.emit(res.user);
        this.authService.closeAuthModal();
      },
      error: (err) => {
        this.isLoading.set(false);
        const msg = err?.error?.message || 'Registration failed. Email might already exist.';
        this.errorMessage.set(Array.isArray(msg) ? msg.join(', ') : msg);
      },
    });
  }
}
