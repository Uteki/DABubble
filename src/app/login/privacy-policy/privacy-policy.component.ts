import { Component } from '@angular/core';
import { Location } from '@angular/common';

/**
 * PrivacyPolicyComponent
 *
 * Static page component that displays the application's privacy policy.
 *
 * Responsibilities:
 * - Renders privacy policy content (HTML template–driven)
 * - Provides simple navigation back to the previous route
 *
 * This component does not manage any business logic or state.
 * It acts purely as a presentation + navigation helper view.
 */
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

  /**
   * @param location Angular Location service
   * Used for browser history navigation (back action).
   */
  constructor(private location: Location) {}

  /**
   * Navigates the user back to the previous page in browser history.
   *
   * Uses Angular's {@link Location} service rather than Router
   * to preserve native navigation behavior.
   */
  goBack(): void {
    this.location.back();
  }
}
