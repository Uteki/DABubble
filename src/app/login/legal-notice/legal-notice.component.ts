import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-legal-notice',
  standalone: true,
  imports: [],
  templateUrl: './legal-notice.component.html',
  styleUrls: [
    './legal-notice.component.scss',
    './legal-notice.component.responsive.scss',
  ],
})
export class LegalNoticeComponent {
  constructor(private router: Router) {}

  goBack(): void {
    this.router.navigate(['/login'], { state: { skipAnimation: true } });
  }
}
