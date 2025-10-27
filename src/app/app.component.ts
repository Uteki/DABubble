import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'DABubble';

  constructor(private authService: AuthService, private router: Router) {}

  checkSessionStorage(): void {
    const sessionData = sessionStorage.getItem('sessionData');
    if (sessionData) {
    } else {
      this.router.navigate(['/login']);
    }
  }
}
