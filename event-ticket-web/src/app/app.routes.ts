import { Routes } from '@angular/router';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'events',
  },
  {
    path: 'events',
    loadComponent: () =>
      import('./features/events/events-list/events-list.component').then(
        (m) => m.EventsListComponent
      ),
  },
  {
    path: 'events/:id',
    loadComponent: () =>
      import('./features/events/event-detail/event-detail.component').then(
        (m) => m.EventDetailComponent
      ),
  },
  {
    path: 'seat-map/:id',
    loadComponent: () =>
      import('./features/events/event-detail/event-detail.component').then(
        (m) => m.EventDetailComponent
      ),
  },
  {
    path: 'my-tickets',
    loadComponent: () =>
      import('./features/my-tickets/my-tickets.component').then(
        (m) => m.MyTicketsComponent
      ),
  },
  {
    path: 'console',
    canActivate: [roleGuard],
    loadComponent: () =>
      import('./features/organizer/organizer.component').then(
        (m) => m.OrganizerComponent
      ),
  },
  {
    path: 'organizer',
    redirectTo: 'console',
  },
  {
    path: 'waiting-room/:id',
    loadComponent: () =>
      import('./features/waiting-room/waiting-room.component').then(
        (m) => m.WaitingRoomComponent
      ),
  },
  {
    path: '**',
    redirectTo: 'events',
  },
];
