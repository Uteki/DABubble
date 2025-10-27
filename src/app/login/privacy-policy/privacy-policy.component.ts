import { Component } from '@angular/core';
import { Location } from '@angular/common';

@Component({
  selector: 'app-privacy-policy',
  standalone: true,
  imports: [],
  templateUrl: './privacy-policy.component.html',
  styleUrls: [
    './privacy-policy.component.scss',
    './privacy-policy.component.responsive.scss',
  ],
})
export class PrivacyPolicyComponent {
  constructor(private location: Location) {}

  goBack(): void {
    this.location.back();
  }
}
