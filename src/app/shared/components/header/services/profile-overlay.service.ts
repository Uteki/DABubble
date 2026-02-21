import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

/**
 * ProfileOverlayService
 *
 * Service responsible for triggering the profile overlay
 * across the application.
 *
 * It provides a reactive event stream that components
 * can subscribe to in order to open the profile view.
 *
 * This avoids tight coupling between components and enables
 * global UI communication (e.g., header → profile overlay).
 */
@Injectable({
  providedIn: 'root',
})
export class ProfileOverlayService {

  /**
   * Internal Subject used to emit profile open events.
   *
   * Emits whenever the profile overlay should be opened.
   * Kept private to prevent external emission.
   */
  private openProfileSubject = new Subject<void>();

  /**
   * Public observable stream for profile open events.
   *
   * Components subscribe to this observable to react
   * when the profile overlay is triggered.
   *
   * Example:
   * ```ts
   * this.profileOverlayService.openProfile$
   *   .subscribe(() => this.openOverlay());
   * ```
   */
  openProfile$ = this.openProfileSubject.asObservable();

  constructor() {}

  /**
   * Triggers the opening of the profile overlay.
   *
   * Emits an event through {@link openProfile$},
   * notifying all subscribed listeners.
   */
  triggerOpenProfile(): void {
    this.openProfileSubject.next();
  }
}
