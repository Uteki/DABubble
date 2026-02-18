import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { Router } from '@angular/router';
import {
  Auth,
  createUserWithEmailAndPassword,
  updateProfile,
} from '@angular/fire/auth';

/**
 * RegisterComponent
 *
 * Handles user account registration.
 *
 * Responsibilities:
 * - Provides a reactive registration form
 * - Validates user input (name, email, password, privacy acceptance)
 * - Creates a Firebase Authentication account
 * - Updates the user display name
 * - Navigates to avatar setup after successful registration
 *
 * This component focuses purely on account creation
 * and initial profile identity setup.
 */
@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './register.component.html',
  styleUrls: [
    './register.component.scss',
    './register.component.responsive.scss',
  ],
})
export class RegisterComponent implements OnInit {

  /** Reactive registration form instance. */
  registerForm: FormGroup;

  /** Error message displayed when registration fails. */
  errorMessage: string | null = null;

  /** Controls visibility of login link/section animations. */
  showLogin = false;

  /**
   * @param formBuilder Angular FormBuilder service
   * @param router Angular Router for navigation
   * @param auth Firebase Authentication instance
   */
  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private auth: Auth,
  ) {
    this.registerForm = this.formBuilder.group({
      fullName: ['', [Validators.required, this.fullNameValidator]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      privacyAccepted: [false, [Validators.requiredTrue]],
    });
  }

  /**
   * Custom validator for full name input.
   *
   * Rules:
   * - Must contain at least 2 words
   * - Must not exceed 3 words
   *
   * @param control Form control instance
   * @returns ValidationErrors | null
   */
  fullNameValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value?.trim();
    if (!value) {
      return null;
    }
    const words = value.split(/\s+/).filter((word: string) => word.length > 0);
    if (words.length < 2) {
      return { minWords: true };
    }
    if (words.length > 3) {
      return { maxWords: true };
    }
    return null;
  }

  /** Angular lifecycle hook (currently unused). */
  ngOnInit(): void {}

  /**
   * Handles form submission.
   *
   * - If valid → proceeds with registration
   * - If invalid → marks fields as touched to show validation errors
   */
  async onSubmit(): Promise<void> {
    if (this.registerForm.valid) {
      await this.performRegistration();
    } else {
      this.markFormAsTouched();
    }
  }

  /**
   * Performs Firebase registration flow.
   *
   * Steps:
   * 1. Creates Firebase auth account
   * 2. Updates display name
   * 3. Clears errors
   * 4. Navigates to avatar setup
   */
  async performRegistration(): Promise<void> {
    const { fullName, email, password } = this.registerForm.value;
    try {
      const userCredential = await createUserWithEmailAndPassword(
        this.auth, email, password,
      );
      await updateProfile(userCredential.user, { displayName: fullName });
      this.errorMessage = null;
      this.router.navigate(['/avatar'], { state: { userName: fullName } });
    } catch (error: any) {
      this.errorMessage = this.getErrorMessage(error.code);
    }
  }

  /**
   * Marks all form fields as touched
   * to trigger validation UI messages.
   */
  markFormAsTouched(): void {
    Object.keys(this.registerForm.controls).forEach((key) => {
      this.registerForm.get(key)?.markAsTouched();
    });
  }

  /** Navigates back to the login page. */
  goBack(): void {
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
   * Maps Firebase auth error codes
   * to user-friendly messages.
   *
   * @param errorCode Firebase error code
   * @returns Readable error message
   */
  private getErrorMessage(errorCode: string): string {
    switch (errorCode) {
      case 'auth/email-already-in-use':
        return 'Diese E-Mail-Adresse ist bereits registriert.';
      case 'auth/invalid-email':
        return 'Ungültige E-Mail-Adresse.';
      default:
        return 'Ein Fehler ist aufgetreten. Bitte versuche es erneut.';
    }
  }
}
