import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-privacy-policy',
  standalone: true,
  imports: [],
  templateUrl: './privacy-policy.component.html',
  styleUrl: './privacy-policy.component.scss',
})
export class PrivacyPolicyComponent {
  constructor(private router: Router) {}

  goBack(): void {
    this.router.navigate(['/login'], { state: { skipAnimation: true } });
  }
}
