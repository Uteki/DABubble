import { Component } from '@angular/core';
import { Location } from '@angular/common';

/**
 * LegalNoticeComponent
 *
 * Displays the application's legal notice / imprint page.
 *
 * Responsibilities:
 * - Renders static legal information content
 * - Provides simple back navigation to the previous route
 *
 * This component is standalone and does not depend on
 * external modules beyond Angular common utilities.
 */
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

  /**
   * @param location Angular Location service
   * Used to navigate back in browser history.
   */
  constructor(private location: Location) {}

  /**
   * Navigates back to the previous page in browser history.
   *
   * Typically used by a "Back" button in the legal notice UI.
   */
  goBack(): void {
    this.location.back();
  }
}
