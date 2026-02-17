import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { map, take } from 'rxjs/operators';
import { Observable } from 'rxjs';

/**
 * authGuard
 *
 * Route guard that protects authenticated routes.
 *
 * This guard checks the current Firebase authentication
 * state via {@link AuthService.user$}. If a user is authenticated,
 * navigation is allowed. Otherwise, the user is redirected
 * to the login route.
 *
 * Implemented as a functional guard using Angular's `inject()`
 * API (standalone guard pattern).
 *
 * Usage example in routing:
 * ```ts
 * {
 *   path: 'dashboard',
 *   canActivate: [authGuard],
 *   loadComponent: () => import('./dashboard.component')
 * }
 * ```
 *
 * @param route - Activated route snapshot.
 * @param state - Router state snapshot.
 *
 * @returns Observable<boolean>
 * - `true` → navigation allowed
 * - `false` → navigation blocked (redirect occurs)
 */
export const authGuard: CanActivateFn = (route, state): Observable<boolean> => {

  /**
   * Inject required services using Angular's functional DI.
   */
  const authService = inject(AuthService);
  const router = inject(Router);

  /**
   * Subscribe once to the authentication state.
   *
   * `take(1)` ensures the observable completes after
   * the first emission to prevent memory leaks.
   */
  return authService.user$.pipe(
    take(1),

    /**
     * Evaluate authentication state.
     */
    map((user) => {

      /** User authenticated → allow navigation */
      if (user) {
        return true;
      } else {

        /**
         * User not authenticated → redirect to login.
         *
         * Empty string route typically resolves to
         * the application's default (e.g., `/login`).
         */
        router.navigate(['']);
        return false;
      }
    })
  );
};
