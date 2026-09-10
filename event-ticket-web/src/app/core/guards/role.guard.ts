import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isOrganizer()) {
    return true;
  }

  // Not authorized as Organizer or Admin
  if (!authService.isAuthenticated()) {
    authService.openAuthModal({
      title: 'ORGANIZER & ADMIN ACCESS',
      message: 'Restricted portal: Please sign in with an Organizer or Platform Admin account to access the operations console.',
    });
  }

  router.navigate(['/events']);
  return false;
};
