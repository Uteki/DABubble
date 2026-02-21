import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { Router } from '@angular/router';
import { Auth, sendPasswordResetEmail } from '@angular/fire/auth';
import { IntroService } from '../intro.service';

/**
 * SendMailComponent
 *
 * Password reset page for requesting a reset email via Firebase Auth.
 *
 * Responsibilities:
 * - Renders a single-field form (email) with validation
 * - Calls Firebase `sendPasswordResetEmail` on submit
 * - Displays success/error feedback messages
 * - Navigates back to login after a successful request (with a short delay)
 * - Reuses the intro animation flow behavior via {@link IntroService}
 */
@Component({
  selector: 'app-send-mail',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './send-mail.component.html',
  styleUrls: ['./send-mail.component.scss', './send-mail.component.responsive.scss'],
})
export class SendMailComponent implements OnInit {

  /** Reactive form for the password reset request (email only). */
  forgotForm: FormGroup;

  /** Controls visibility of the form section (after intro animation). */
  showForm = false;

  /** Disables animations when skipping the intro sequence. */
  noAnimation = false;

  /** Error message shown in the UI when request fails. */
  errorMessage: string | null = null;

  /** Success message shown in the UI when request succeeds. */
  successMessage: string | null = null;

  /** Controls visibility of login-related UI elements (e.g., link/button). */
  showLogin = false;

  /**
   * @param formBuilder Builds the reactive form.
   * @param router Used for navigation (back to login, legal, privacy).
   * @param auth Firebase Auth instance used for sending reset emails.
   * @param introService Stores/reads whether intro animation was already shown.
   */
  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private auth: Auth,
    private introService: IntroService
  ) {
    this.forgotForm = this.formBuilder.group({email: ['', [Validators.required, Validators.email]]});
  }

  /**
   * Angular lifecycle hook.
   *
   * Shows the form either immediately (if intro already shown) or after a delay
   * to match the intro animation timing.
   */
  ngOnInit(): void {
    if (this.introService.getIntroShown()) {
      this.showForm = true;
      this.noAnimation = true;
      this.showLogin = true;
    } else {
      setTimeout(() => {
        this.showForm = true;
        this.showLogin = true;
        this.introService.setIntroShown(true);
      }, 2500);
    }
  }

  /**
   * Handles form submission.
   *
   * - If valid, requests a password reset email via Firebase Auth
   * - Shows a success message and navigates back to login after a short delay
   * - If invalid, marks all controls as touched to show validation errors
   */
  async onSubmit(): Promise<void> {
    if (this.forgotForm.valid) {
      const { email } = this.forgotForm.value;
      try {
        await sendPasswordResetEmail(this.auth, email);
        this.successMessage = 'Eine E-Mail zum Zurücksetzen des Passworts wurde gesendet.';
        this.errorMessage = null;
        setTimeout(() => {this.router.navigate(['/login'])}, 3000);
      } catch (error: any) {
        this.errorMessage = this.getErrorMessage(error.code);
        this.successMessage = null;
        console.error('Fehler beim Senden der Reset-E-Mail:', error);
      }
    } else { Object.keys(this.forgotForm.controls).forEach((key) => {this.forgotForm.get(key)?.markAsTouched()}) }
  }

  /** Navigates back to the login page. */
  goBackToLogin(): void {
    this.router.navigate(['/login']);
  }

  /** Navigates to the legal notice page. */
  goTolegalNotice(): void {
    this.router.navigate(['/legal-notice']);
  }

  /** Navigates to the privacy policy page. */
  goToPrivacyPolicy(): void {
    this.router.navigate(['/privacy-policy']);
  }

  /**
   * Maps Firebase Auth error codes to localized user-friendly messages.
   *
   * @param errorCode Firebase Auth error code (e.g. `auth/invalid-email`).
   * @returns Localized message suitable for UI display.
   */
  private getErrorMessage(errorCode: string): string {
    switch (errorCode) {
      case 'auth/invalid-email':
        return 'Ungültige E-Mail-Adresse.';
      case 'auth/user-not-found':
        return 'Kein Benutzer mit dieser E-Mail gefunden.';
      default:
        return 'Ein Fehler ist aufgetreten. Bitte versuche es erneut.';
    }
  }
}
