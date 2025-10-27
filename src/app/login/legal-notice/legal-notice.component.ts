import { Component } from '@angular/core';
import { Location } from '@angular/common';

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
  constructor(private location: Location) {}

goBack(): void {
    this.location.back();
  }
}
