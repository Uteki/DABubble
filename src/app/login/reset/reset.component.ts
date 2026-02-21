import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import {
  Auth,
  verifyPasswordResetCode,
  confirmPasswordReset,
} from '@angular/fire/auth';
import { IntroService } from '../intro.service';

/**
 * ResetComponent
 *
 * Handles the password reset flow after a user clicks
 * the reset link received via email.
 *
 * Responsibilities:
 * - Reads Firebase reset action code from URL
 * - Verifies the reset code validity
 * - Provides password reset form
 * - Confirms password reset via Firebase
 * - Handles success/error messaging
 * - Controls intro animation visibility
 */
@Component({
  selector: 'app-reset',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './reset.component.html',
  styleUrls: ['./reset.component.scss', './reset.component.responsive.scss'],
})
export class ResetComponent implements OnInit {

  /** Reactive password reset form instance. */
  resetForm: FormGroup;

  /** Controls visibility of the reset form (animation entry). */
  showForm = false;

  /** Error message shown when reset fails. */
  errorMessage: string | null = null;

  /** Success message shown after password reset. */
  successMessage: string | null = null;

  /** Firebase password reset action code from URL. */
  actionCode: string = '';

  /** Controls login link visibility. */
  showLogin = false;

  /** Disables intro animation if navigation requested it. */
  noAnimation = false;

  /**
   * @param formBuilder Angular FormBuilder service
   * @param router Angular Router for navigation
   * @param route ActivatedRoute to read query params
   * @param auth Firebase Authentication instance
   * @param introService Intro animation state service
   */
  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private auth: Auth,
    private introService: IntroService
  ) {
    this.resetForm = this.formBuilder.group({
        newPassword: ['', [Validators.required, Validators.minLength(6)]], confirmPassword: ['', [Validators.required]],
      },
      { validator: this.passwordMatchValidator }
    );
    const navigation = this.router.getCurrentNavigation();
    const skipAnimation = navigation?.extras?.state?.['skipAnimation'] ?? false;
    if (skipAnimation) {
      this.showForm = true;
      this.showLogin = true;
    }
  }

  /**
   * Lifecycle hook:
   * - Reads reset code from URL
   * - Verifies code with Firebase
   * - Shows form after intro animation delay
   */
  ngOnInit(): void {
    this.actionCode = this.route.snapshot.queryParams['oobCode'] || '';
    if (!this.actionCode) {
      this.errorMessage = 'Ungültiger Reset-Link.';
      return;
    }
    verifyPasswordResetCode(this.auth, this.actionCode).then(() => {
        if (!this.showForm) {
          setTimeout(() => {this.showForm = true; this.showLogin = true}, 2500);
        }
      }).catch((error) => {
        this.errorMessage = 'Der Reset-Link ist ungültig oder abgelaufen.';
        console.error('Fehler bei der Code-Verifizierung:', error);
      });
  }

  /**
   * Handles form submission.
   *
   * Flow:
   * 1. Validates form
   * 2. Confirms password reset via Firebase
   * 3. Shows success message
   * 4. Redirects to login
   */
  async onSubmit(): Promise<void> {
    if (this.resetForm.invalid) { this.resetForm.markAllAsTouched(); return }
    if (this.actionCode) {
      const { newPassword } = this.resetForm.value;
      try {
        await confirmPasswordReset(this.auth, this.actionCode, newPassword);
        this.successMessage = 'Passwort erfolgreich zurückgesetzt.';
        this.errorMessage = null;
        setTimeout(() => {this.router.navigate(['/login']);}, 3000);
      } catch (error: any) {
        this.errorMessage = this.getErrorMessage(error.code);
        this.successMessage = null;
        console.error('Fehler beim Zurücksetzen des Passworts:', error);
      }
    }
  }

  /**
   * Custom validator ensuring both password fields match.
   *
   * @param group FormGroup instance
   * @returns Validation error if passwords differ
   */
  passwordMatchValidator(group: FormGroup): any {
    const password = group.get('newPassword')?.value;
    const confirm = group.get('confirmPassword')?.value;
    return password === confirm ? null : { notMatching: true };
  }

  /** Navigates back to login page. */
  goBackToLogin(): void {
    this.router.navigate(['/login']);
  }

  /** Navigates to legal notice page. */
  goTolegalNotice(): void {
    this.router.navigate(['/legal-notice']);
  }

  /** Navigates to privacy policy page. */
  goToPrivacyPolicy(): void {
    this.router.navigate(['/privacy-policy']);
  }

  /**
   * Maps Firebase error codes to readable messages.
   *
   * @param errorCode Firebase error code
   * @returns User-friendly error message
   */
  private getErrorMessage(errorCode: string): string {
    switch (errorCode) {
      case 'auth/weak-password':
        return 'Das Passwort ist zu schwach.';
      case 'auth/invalid-action-code':
        return 'Der Reset-Code ist ungültig.';
      default:
        return 'Ein Fehler ist aufgetreten. Bitte versuche es erneut.';
    }
  }
}
