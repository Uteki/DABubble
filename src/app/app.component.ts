import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './auth.service';
import { Router } from '@angular/router';
import { IdleTrackerService } from './idle-tracker.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'DABubble';
  private idleTimer: any;
  private idleStartTime: number | null = null;
  private readonly IDLE_TIMEOUT = 5000; // 5 seconds of inactivity

  constructor(
    private authService: AuthService,
    private router: Router,
    private idleTracker: IdleTrackerService
  ) {}

  ngOnInit(): void {
    this.resetIdleTimer();
  }

  ngOnDestroy(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
    }
  }

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

  private resetIdleTimer(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
    }

    this.idleTimer = setTimeout(() => {
      this.idleStartTime = Date.now();
      this.idleTracker.setIdleStatus(true);
    }, this.IDLE_TIMEOUT);
  }

  checkSessionStorage(): void {
    const sessionData = sessionStorage.getItem('sessionData');
    if (sessionData) {
    } else {
      this.router.navigate(['/login']);
    }
  }
}
