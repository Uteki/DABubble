import { Injectable, OnDestroy } from '@angular/core';
import {
  Auth,
  User,
  onAuthStateChanged,
  browserSessionPersistence,
  setPersistence,
  signInAnonymously,
  user, signInWithEmailAndPassword,
} from '@angular/fire/auth';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';

/**
 * AuthService
 *
 * Central authentication service responsible for:
 * - Managing Firebase authentication state
 * - Providing reactive user streams
 * - Handling guest sign-in
 * - Managing session persistence
 * - Executing logout flows
 *
 * The service ensures authentication state is accessible
 * across the entire application.
 */
@Injectable({
  providedIn: 'root',
})
export class AuthService implements OnDestroy {

  /**
   * Reactive stream of the currently authenticated user.
   *
   * Emits whenever the Firebase auth state changes.
   * `null` indicates no authenticated user.
   */
  user$: Observable<User | null>;

  /**
   * Cached reference to the current authenticated user.
   *
   * Updated via Firebase `onAuthStateChanged`.
   */
  private currentUser: User | null = null;

  constructor(private auth: Auth, private router: Router) {

    /** Initialize reactive user stream. */
    this.user$ = user(this.auth);

    /**
     * Configure authentication persistence.
     *
     * Uses browser session persistence so the user remains
     * signed in only for the duration of the tab session.
     */
    setPersistence(this.auth, browserSessionPersistence)
      .then()
      .catch((error) =>
        (error)
      );

    /**
     * Listen for authentication state changes and cache
     * the current user locally.
     */
    onAuthStateChanged(this.auth, (user) => {
      this.currentUser = user;
    });
  }

  /**
   * Returns the UID of the currently authenticated user.
   *
   * @returns User UID or empty string if not authenticated.
   */
  readCurrentUser(): string {
    return this.currentUser?.uid ?? '';
  }

  /**
   * Signs in using predefined guest credentials.
   *
   * On success:
   * - Navigates to the dashboard route.
   *
   * On failure:
   * - Logs the error to console.
   */
  async signInAsGuest(): Promise<void> {
    try {
      await signInWithEmailAndPassword(
        this.auth,
        'guest@dabubble.de',
        '12345678'
      );
      await this.router.navigate(['/dashboard']);
    } catch (error) {
      console.error('Fehler beim Guest-SignIn:', error);
    }
  }

  /**
   * Signs out the current user.
   *
   * On success:
   * - Clears session storage
   * - Redirects to login page
   *
   * On failure:
   * - Logs error to console
   */
  signOut(): void {
    this.auth
      .signOut()
      .then(() => {
        sessionStorage.removeItem('sessionData');
        this.router.navigate(['/login']);
      })
      .catch((error) => {
        console.error('Fehler beim SignOut:', error);
      });
  }

  /**
   * Signs out the user when the browser tab is closed.
   *
   * Intended for session cleanup scenarios
   * (e.g., `window.beforeunload` listeners).
   */
  signOutOnTabClose(): void {
    this.auth
      .signOut()
      .then(() => {})
      .catch((error) => {
        console.error('Fehler beim SignOut beim Tab-Schließen:', error);
      });
  }

  /**
   * Angular lifecycle hook.
   *
   * Currently unused but implemented for potential
   * future cleanup logic (e.g., unsubscribing listeners).
   */
  ngOnDestroy(): void {}
}
