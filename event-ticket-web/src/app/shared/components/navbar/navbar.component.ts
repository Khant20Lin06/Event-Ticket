import { Component, inject, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { SocketService } from '../../../core/services/socket.service';
import { AuthService } from '../../../core/services/auth.service';
import { LOGO_DATA_URI } from './logo-data';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <header class="navbar-wrapper" [class.scrolled]="isScrolled()">
      <div class="navbar-container">
        <!-- Brand & Logo -->
        <div class="brand-group">
          <a routerLink="/" class="brand-logo">
            <img [src]="logoUrl" alt="AURA Logo" class="custom-logo-img">
          </a>

          <!-- Real-Time WebSocket Telemetry Status -->
          <div class="telemetry-pill" [class.active]="socketService.isConnected()">
            <span class="status-dot" [class.live]="socketService.isConnected()" [class.holding]="!socketService.isConnected()"></span>
            <span class="telemetry-label font-mono">
              {{ socketService.isConnected() ? 'REALTIME: SYNCED' : 'CONNECTING...' }}
            </span>
            @if (socketService.activeEventRoom(); as room) {
              <span class="room-chip font-mono">ROOM: {{ room }}</span>
            }
          </div>
        </div>

        <!-- Navigation Links -->
        <nav class="nav-menu">
          <a routerLink="/events" routerLinkActive="active" class="nav-link">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
            </svg>
            <span>Now Showing</span>
          </a>
          <a routerLink="/my-tickets" routerLinkActive="active" class="nav-link">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"></path>
              <path d="M13 5v2"></path>
              <path d="M13 17v2"></path>
              <path d="M13 11v2"></path>
            </svg>
            <span>My Tickets</span>
          </a>
          @if (authService.isOrganizer()) {
            <a routerLink="/console" routerLinkActive="active" class="nav-link console-link">
              <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                <line x1="8" y1="21" x2="16" y2="21"></line>
                <line x1="12" y1="17" x2="12" y2="21"></line>
              </svg>
              <span>{{ authService.isAdmin() ? 'Admin Console' : 'Organizer Console' }}</span>
              <span class="role-badge font-mono" [class.admin-badge]="authService.isAdmin()">
                {{ authService.userRole() }}
              </span>
            </a>
          }
        </nav>

        <!-- User / Auth Actions -->
        <div class="user-actions">
          @if (authService.isAuthenticated()) {
            <div class="user-chip">
              <span class="user-avatar font-display" [class.admin-avatar]="authService.isAdmin()">
                {{ authService.currentUser()?.name?.[0]?.toUpperCase() || authService.currentUser()?.email?.[0]?.toUpperCase() || 'U' }}
              </span>
              <div class="user-meta">
                <div class="user-name-row">
                  <span class="user-name font-display">{{ authService.currentUser()?.name || 'User' }}</span>
                  <span class="role-pill font-mono" [class.admin]="authService.isAdmin()" [class.organizer]="authService.isOrganizer() && !authService.isAdmin()">
                    {{ authService.userRole() }}
                  </span>
                </div>
                <span class="user-email font-mono">{{ authService.currentUser()?.email }}</span>
              </div>
              <button (click)="authService.logout()" class="btn-ghost-sm" title="Sign out">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  <polyline points="16 17 21 12 16 7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
              </button>
            </div>
          } @else {
            <div class="guest-actions">
              <button
                (click)="openAuthModal()"
                class="btn btn-primary btn-sm font-display glow-hover"
              >
                Sign In
              </button>
            </div>
          }
        </div>
      </div>
    </header>
  `,
  styles: [`
    :host {
      display: block;
      position: sticky;
      top: 0;
      z-index: 1000;
    }

    .navbar-wrapper {
      position: relative;
      width: 100%;
      background: rgba(5, 7, 10, 0.85);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-bottom: 1px solid var(--border-subtle);
      transition: background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;

      &.scrolled {
        background: rgba(5, 7, 10, 0.95);
        border-bottom: 1px solid rgba(229, 9, 20, 0.4);
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.9), 0 0 25px rgba(229, 9, 20, 0.16);
      }
    }

    .navbar-container {
      max-width: 1400px;
      margin: 0 auto;
      height: 72px;
      padding: 0 1.75rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1.5rem;
    }

    .brand-group {
      display: flex;
      align-items: center;
      gap: 1.75rem;
    }

    .brand-logo {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      text-decoration: none;
    }

    .custom-logo-img {
      height: 52px;
      width: auto;
      object-fit: contain;
      border-radius: 8px;
      transition: transform 0.2s ease;

      &:hover {
        transform: scale(1.04);
      }
    }

    .telemetry-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.6rem;
      background: rgba(17, 23, 36, 0.85);
      border: 1px solid var(--border-subtle);
      padding: 0.35rem 0.8rem;
      border-radius: 9999px;
      transition: all 0.25s ease;

      &.active {
        border-color: rgba(16, 185, 129, 0.3);
      }

      .telemetry-label {
        font-size: 0.72rem;
        font-weight: 600;
        color: var(--text-secondary);
      }

      .room-chip {
        font-size: 0.65rem;
        padding: 0.15rem 0.45rem;
        background: rgba(99, 102, 241, 0.15);
        color: var(--primary-light);
        border-radius: 4px;
      }
    }

    .nav-menu {
      display: flex;
      align-items: center;
      gap: 0.75rem;

      .nav-link {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.55rem 1rem;
        border-radius: 8px;
        color: var(--text-secondary);
        text-decoration: none;
        font-weight: 500;
        font-size: 0.92rem;
        transition: all 0.2s ease;

        .nav-icon {
          width: 17px;
          height: 17px;
          opacity: 0.75;
        }

        &:hover {
          color: var(--text-primary);
          background: rgba(255, 255, 255, 0.04);
        }

        &.active {
          color: #ffffff;
          background: rgba(99, 102, 241, 0.12);
          border: 1px solid rgba(99, 102, 241, 0.25);
        }

        &.console-link {
          border: 1px solid rgba(168, 85, 247, 0.4);
          background: rgba(168, 85, 247, 0.08);

          &:hover {
            background: rgba(168, 85, 247, 0.16);
          }

          .role-badge {
            font-size: 0.6rem;
            font-weight: 800;
            padding: 0.15rem 0.45rem;
            border-radius: 4px;
            background: rgba(99, 102, 241, 0.25);
            color: #a5b4fc;
            letter-spacing: 0.08em;

            &.admin-badge {
              background: rgba(239, 68, 68, 0.25);
              color: #fca5a5;
              border: 1px solid rgba(239, 68, 68, 0.4);
            }
          }
        }
      }
    }

    .user-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;

      .btn-sm {
        padding: 0.45rem 0.95rem;
        font-size: 0.82rem;
      }

      .user-chip {
        display: flex;
        align-items: center;
        gap: 0.65rem;
        background: rgba(17, 23, 36, 0.9);
        border: 1px solid rgba(99, 102, 241, 0.3);
        padding: 0.3rem 0.75rem 0.3rem 0.4rem;
        border-radius: 9999px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);

        .user-avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: linear-gradient(135deg, #6366f1 0%, #06b6d4 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.75rem;
          color: #ffffff;
          box-shadow: 0 0 10px rgba(99, 102, 241, 0.4);

          &.admin-avatar {
            background: linear-gradient(135deg, #ef4444 0%, #f97316 100%);
            box-shadow: 0 0 10px rgba(239, 68, 68, 0.5);
          }
        }

        .user-meta {
          display: flex;
          flex-direction: column;
          line-height: 1.1;

          .user-name-row {
            display: flex;
            align-items: center;
            gap: 0.45rem;

            .user-name {
              font-size: 0.76rem;
              font-weight: 700;
              color: #ffffff;
            }

            .role-pill {
              font-size: 0.58rem;
              font-weight: 800;
              padding: 0.1rem 0.35rem;
              border-radius: 4px;
              background: rgba(255, 255, 255, 0.1);
              color: var(--text-secondary);

              &.admin {
                background: rgba(239, 68, 68, 0.2);
                color: #f87171;
                border: 1px solid rgba(239, 68, 68, 0.35);
              }

              &.organizer {
                background: rgba(168, 85, 247, 0.2);
                color: #c084fc;
                border: 1px solid rgba(168, 85, 247, 0.35);
              }
            }
          }

          .user-email {
            font-size: 0.66rem;
            color: var(--text-secondary);
          }
        }

        .btn-ghost-sm {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border-subtle);
          color: var(--text-muted);
          border-radius: 50%;
          width: 22px;
          height: 22px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          margin-left: 0.25rem;

          &:hover {
            background: rgba(239, 68, 68, 0.2);
            color: #ef4444;
            border-color: rgba(239, 68, 68, 0.4);
          }
        }
      }

      .guest-actions {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
    }

    .glow-hover {
      box-shadow: 0 0 16px rgba(99, 102, 241, 0.4);
      transition: all 0.2s ease;

      &:hover {
        box-shadow: 0 0 24px rgba(99, 102, 241, 0.65);
        transform: translateY(-1px);
      }
    }

    @media (max-width: 860px) {
      .telemetry-pill {
        display: none;
      }
      .brand-tag {
        display: none;
      }
    }
  `],
})
export class NavbarComponent {
  readonly logoUrl = LOGO_DATA_URI;
  readonly socketService = inject(SocketService);
  readonly authService = inject(AuthService);
  readonly isScrolled = signal<boolean>(false);

  @HostListener('window:scroll')
  onWindowScroll(): void {
    if (typeof window !== 'undefined') {
      this.isScrolled.set(window.scrollY > 20);
    }
  }

  openAuthModal(): void {
    this.authService.openAuthModal({
      title: 'AURA FAN PORTAL',
      message: 'Sign in to access your digital arena passes and priority seating.',
    });
  }
}
