import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, tap } from 'rxjs';

export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  role?: 'FAN' | 'ORGANIZER' | 'ADMIN';
}

export interface AuthResponse {
  access_token: string;
  user: UserProfile;
}

export interface AuthModalContext {
  title?: string;
  message?: string;
  targetSeatNumber?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly baseUrl = 'http://localhost:3000/api/v1/auth';
  private readonly TOKEN_KEY = 'aura_access_token';
  private readonly USER_KEY = 'aura_current_user';

  readonly token = signal<string | null>(this.getStoredToken());
  readonly currentUser = signal<UserProfile | null>(this.getStoredUser());
  readonly isAuthenticated = computed(() => !!this.token());

  // Role-Based Access Control Computed Signals
  readonly userRole = computed<'FAN' | 'ORGANIZER' | 'ADMIN'>(
    () => this.currentUser()?.role || 'FAN'
  );
  readonly isOrganizer = computed<boolean>(
    () => this.userRole() === 'ORGANIZER' || this.userRole() === 'ADMIN'
  );
  readonly isAdmin = computed<boolean>(
    () => this.userRole() === 'ADMIN'
  );

  // In-Place Auth Modal State
  readonly isAuthModalOpen = signal<boolean>(false);
  readonly authModalContext = signal<AuthModalContext | null>(null);

  // Event stream emitted upon successful login / registration
  private readonly loginSuccessSubject = new Subject<UserProfile>();
  readonly loginSuccess$ = this.loginSuccessSubject.asObservable();

  constructor(private readonly http: HttpClient) {}

  private getStoredToken(): string | null {
    try {
      return localStorage.getItem(this.TOKEN_KEY);
    } catch {
      return null;
    }
  }

  private getStoredUser(): UserProfile | null {
    try {
      const raw = localStorage.getItem(this.USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  openAuthModal(context?: AuthModalContext): void {
    this.authModalContext.set(context || null);
    this.isAuthModalOpen.set(true);
  }

  closeAuthModal(): void {
    this.isAuthModalOpen.set(false);
    this.authModalContext.set(null);
  }

  login(dto: { email: string; password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/login`, dto).pipe(
      tap((res) => {
        if (res.access_token) {
          this.setSession(res.access_token, res.user);
        }
      })
    );
  }

  register(dto: { name: string; email: string; password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/register`, dto).pipe(
      tap((res) => {
        if (res.access_token) {
          this.setSession(res.access_token, res.user);
        }
      })
    );
  }

  loginAsDemoFan(): Observable<AuthResponse> {
    return this.loginAsRole('FAN');
  }

  loginAsRole(role: 'ADMIN' | 'ORGANIZER' | 'FAN'): Observable<AuthResponse> {
    let email = 'user1@gmail.com';
    let name = 'Demo Fan';
    if (role === 'ADMIN') {
      email = 'admin@aura.live';
      name = 'Platform Admin';
    } else if (role === 'ORGANIZER') {
      email = 'organizer@aura.live';
      name = 'Event Organizer';
    }

    return this.http.post<AuthResponse>(`${this.baseUrl}/login`, { email, password: 'password123' }).pipe(
      tap({
        next: (res) => {
          if (res.access_token) {
            this.setSession(res.access_token, res.user);
          }
        },
        error: () => {
          // Graceful offline fallback
          this.setDemoSessionDirectly({
            id: `mock-${role.toLowerCase()}-uuid`,
            email,
            name,
            role,
          });
        }
      })
    );
  }

  setDemoSessionDirectly(fallbackUser?: UserProfile): void {
    const user: UserProfile = fallbackUser || {
      id: 'demo-fan-' + Math.random().toString(36).substring(2, 8),
      email: 'fan@aura.live',
      name: 'Aura VIP Fan',
      role: 'FAN',
    };
    const mockToken = 'aura_demo_jwt_' + Math.random().toString(36).substring(2);
    this.setSession(mockToken, user);
  }

  private setSession(token: string, user: UserProfile): void {
    this.token.set(token);
    this.currentUser.set(user);
    try {
      localStorage.setItem(this.TOKEN_KEY, token);
      localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    } catch (e) {
      console.warn('Could not persist auth in localStorage', e);
    }
    this.loginSuccessSubject.next(user);
  }

  logout(): void {
    this.token.set(null);
    this.currentUser.set(null);
    try {
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.USER_KEY);
    } catch (e) {
      console.warn('Could not clear auth in localStorage', e);
    }
  }
}
