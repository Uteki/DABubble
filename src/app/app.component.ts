import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet } from '@angular/router';
import { AuthService } from './auth.service';

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

  ngOnInit(): void {
    this.checkSessionStorage();
  }
    checkSessionStorage(): void {
    const sessionData = sessionStorage.getItem('sessionData');
    if (sessionData) {
     
    } else {
      this.router.navigate(['/login']);
    }
  }
}
