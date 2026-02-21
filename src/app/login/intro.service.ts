import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

/**
 * IntroService
 *
 * Service responsible for managing the visibility state
 * of the application intro / onboarding screen.
 *
 * Uses a {@link BehaviorSubject} to:
 * - Store the current intro visibility state
 * - Provide reactive updates to subscribers
 *
 * This allows components to react in real time when
 * the intro has been shown or dismissed.
 *
 * Provided in the root injector → singleton instance
 * available throughout the entire application.
 */
@Injectable({
  providedIn: 'root',
})
export class IntroService {

  /**
   * Internal state holder for intro visibility.
   *
   * Default value: `false`
   * → Intro has not been shown yet.
   */
  private introShownSubject = new BehaviorSubject<boolean>(false);

  /**
   * Public observable stream of the intro state.
   *
   * Components can subscribe to reactively respond
   * to intro visibility changes.
   *
   * Example:
   * ```ts
   * this.introService.introShown$.subscribe(...)
   * ```
   */
  introShown$ = this.introShownSubject.asObservable();

  /**
   * Updates the intro visibility state.
   *
   * @param shown - Whether the intro has been shown.
   *
   * Example:
   * ```ts
   * this.introService.setIntroShown(true);
   * ```
   */
  setIntroShown(shown: boolean): void {
    this.introShownSubject.next(shown);
  }

  /**
   * Returns the current intro visibility state synchronously.
   *
   * Useful for guards, initial checks, or non-reactive logic.
   *
   * @returns boolean - Current intro shown status.
   */
  getIntroShown(): boolean {
    return this.introShownSubject.value;
  }
}
