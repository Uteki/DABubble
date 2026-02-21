import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

/**
 * IdleTrackerService
 *
 * Service responsible for tracking and broadcasting
 * the user's idle state and idle duration across
 * the application.
 *
 * It provides reactive streams that components can
 * subscribe to in order to respond to inactivity
 * (e.g., set user status to "away", trigger auto-logout,
 * pause live updates, etc.).
 *
 * Uses {@link BehaviorSubject} to always provide the
 * latest known idle values to new subscribers.
 */
@Injectable({
  providedIn: 'root',
})
export class IdleTrackerService {

  /**
   * Internal subject storing the current idle time in milliseconds.
   *
   * Initialized with `0` and updated whenever inactivity
   * duration changes.
   */
  private idleTimeSubject = new BehaviorSubject<number>(0);

  /**
   * Internal subject storing whether the user is currently idle.
   *
   * `true` → user inactive
   * `false` → user active
   */
  private isIdleSubject = new BehaviorSubject<boolean>(false);

  /**
   * Observable stream of the user's idle time.
   *
   * Components can subscribe to receive real-time
   * updates of inactivity duration.
   */
  idleTime$: Observable<number> = this.idleTimeSubject.asObservable();

  /**
   * Observable stream of the user's idle status.
   *
   * Emits whenever the user's idle state changes.
   */
  isIdle$: Observable<boolean> = this.isIdleSubject.asObservable();

  constructor() {}

  /**
   * Updates the current idle time.
   *
   * @param milliseconds - Duration of user inactivity in milliseconds.
   */
  updateIdleTime(milliseconds: number): void {
    this.idleTimeSubject.next(milliseconds);
  }

  /**
   * Sets the user's idle status.
   *
   * @param isIdle - Whether the user is currently idle.
   */
  setIdleStatus(isIdle: boolean): void {
    this.isIdleSubject.next(isIdle);
  }

  /**
   * Returns the current idle time synchronously.
   *
   * Useful when immediate access is needed without
   * subscribing to {@link idleTime$}.
   *
   * @returns Idle time in milliseconds.
   */
  getCurrentIdleTime(): number {
    return this.idleTimeSubject.value;
  }

  /**
   * Returns the current idle status synchronously.
   *
   * @returns `true` if user is idle, otherwise `false`.
   */
  getIdleStatus(): boolean {
    return this.isIdleSubject.value;
  }
}
