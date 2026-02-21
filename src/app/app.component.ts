import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './core/services/auth.service';
import { Router } from '@angular/router';
import { IdleTrackerService } from './core/services/idle-tracker.service';

/**
 * AppComponent
 *
 * Root component of the application.
 *
 * Responsibilities:
 * - Boots the application shell (`RouterOutlet`)
 * - Tracks user activity globally (mouse/keyboard/touch/scroll)
 * - Detects inactivity (idle state) using a timeout
 * - Publishes idle information via {@link IdleTrackerService}
 * - Provides a session check utility to redirect unauthenticated users
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit, OnDestroy {

  /** Application title (used for display / debugging). */
  title = 'DABubble';

  /** Reference to the active idle timeout. */
  private idleTimer: any;

  /**
   * Timestamp marking when the user first became idle.
   * `null` indicates the user is currently considered active.
   */
  private idleStartTime: number | null = null;

  /**
   * Idle threshold in milliseconds.
   * If no activity occurs for this duration, the user is marked as idle.
   */
  private readonly IDLE_TIMEOUT = 5000;

  constructor(
    private authService: AuthService,
    private router: Router,
    private idleTracker: IdleTrackerService
  ) {}

  /**
   * Angular lifecycle hook.
   *
   * Initializes the idle tracking timer on application startup.
   */
  ngOnInit(): void {
    this.resetIdleTimer();
  }

  /**
   * Angular lifecycle hook.
   *
   * Cleans up any pending idle timeout to avoid memory leaks
   * when the root component is destroyed.
   */
  ngOnDestroy(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
    }
  }

  /**
   * Global user activity handler.
   *
   * Triggered by multiple document-level events:
   * - mouse movement
   * - key presses
   * - clicks
   * - scroll events
   * - touch start (mobile)
   *
   * If the user was idle, this method:
   * - calculates the idle duration
   * - publishes the duration via {@link IdleTrackerService}
   * - marks the user as active again
   * - resets idle state tracking
   *
   * Finally, it restarts the idle timeout.
   */
  @HostListener('document:mousemove')
  @HostListener('document:keypress')
  @HostListener('document:click')
  @HostListener('document:scroll')
  @HostListener('document:touchstart')
  onUserActivity(): void {
    if (this.idleStartTime !== null) {
      const idleDuration = Date.now() - this.idleStartTime;
      this.idleTracker.updateIdleTime(idleDuration);
      this.idleTracker.setIdleStatus(false);
      this.idleStartTime = null;
    }
    this.resetIdleTimer();
  }

  /**
   * Resets the idle timeout.
   *
   * Clears an existing timeout (if present) and schedules a new one.
   * When the timeout elapses, the user is marked as idle and the idle
   * start time is recorded.
   */
  private resetIdleTimer(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
    }

    this.idleTimer = setTimeout(() => {
      this.idleStartTime = Date.now();
      this.idleTracker.setIdleStatus(true);
    }, this.IDLE_TIMEOUT);
  }

  /**
   * Checks whether session data exists in `sessionStorage`.
   *
   * If no session data is found, the user is redirected to the login route.
   *
   * Note:
   * - This method is currently not invoked in `ngOnInit()`.
   * - If you rely on it for auth guarding, consider calling it during startup
   *   or moving the logic into a route guard.
   */
  checkSessionStorage(): void {
    const sessionData = sessionStorage.getItem('sessionData');
    if (sessionData) {
    } else {
      this.router.navigate(['/login']);
    }
  }
}
