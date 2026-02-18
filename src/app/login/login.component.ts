import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { Router } from '@angular/router';
import {
  Auth,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
} from '@angular/fire/auth';
import { IntroService } from '../intro.service';
import { AuthService } from '../auth.service';
import { UserService } from '../user.service';

/**
 * LoginComponent
 *
 * Standalone login page handling:
 * - Email/password authentication (Firebase Auth)
 * - Google OAuth sign-in (Firebase Auth)
 * - Guest login shortcut
 * - Intro animation flow (shown once per session/app usage via IntroService)
 * - Navigation to register / password reset / legal pages
 *
 * UI state is controlled via several boolean flags to coordinate animations and visibility.
 */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss', './login.component.responsive.scss'],
})
export class LoginComponent implements OnInit {

  /** Reactive form backing the email/password login inputs. */
  loginForm: FormGroup;

  /** Controls visibility of the login UI section (after intro). */
  showLogin = false;

  /** Controls visibility of the intro "step" section. */
  showIntroStep = false;

  /** Disables intro animation transitions when skipping. */
  noAnimation = false;

  /** Controls visibility of the final intro state. */
  showFinal = false;

  /** Whether the "account created" success message should be shown. */
  accountCreated = false;

  /** Human-readable error message displayed in the UI (if login fails). */
  errorMessage: string | null = null;

  /**
   * Hardcoded guest UID used by the application.
   * When logging in as guest, this is stored in session storage and a guest role is set.
   */
  private guestId: string = 'FXtCqE0SQjTI7Lc9JzvARWEMy9T2';

  /**
   * @param formBuilder Builds the reactive form for login.
   * @param router Used for navigation and reading navigation state.
   * @param auth Firebase Auth instance.
   * @param introService Persists whether the intro animation was already shown.
   * @param authService App auth facade (guest sign-in, sign-out, etc.).
   * @param userService User data access (e.g., checking if Google user exists in Firestore).
   */
  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private auth: Auth,
    private introService: IntroService,
    private authService: AuthService,
    private userService: UserService,
  ) {
    const navigation = this.router.getCurrentNavigation();
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
    if (navigation?.extras?.state?.['accountCreated']) {
      this.accountCreated = true;
      setTimeout(() => {
        this.accountCreated = false;
      }, 2500);
    }
  }

  /**
   * Angular lifecycle hook.
   *
   * Either plays the intro animation (first visit) or skips it if already shown.
   */
  ngOnInit(): void {
    if (this.introService.getIntroShown()) {
      this.skipIntroAnimation();
    } else {
      this.playIntroAnimation();
    }
  }

  /**
   * Skips the intro animation and immediately shows the final/login UI.
   * Also disables animation transitions to avoid flickering.
   */
  skipIntroAnimation(): void {
    this.showIntroStep = true;
    this.showFinal = true;
    this.showLogin = true;
    this.noAnimation = true;
  }

  /**
   * Plays the staged intro animation and then reveals the login UI.
   * Once finished, it marks the intro as shown via {@link IntroService}.
   */
  playIntroAnimation(): void {
    setTimeout(() => (this.showIntroStep = true), 1500);
    setTimeout(() => (this.showFinal = true), 2500);
    setTimeout(() => {
      this.showLogin = true;
      this.introService.setIntroShown(true);
    }, 3500);
  }

  /**
   * Handles the submit event for email/password login.
   *
   * - If the form is valid, performs the login.
   * - Otherwise marks all controls as touched so validation errors are shown.
   */
  async onSubmit(): Promise<void> {
    if (this.loginForm.valid) {
      await this.performLogin();
    } else {
      this.markFormAsTouched();
    }
  }

  /**
   * Performs email/password login via Firebase Auth.
   *
   * On success:
   * - clears any previous error
   * - stores session data in sessionStorage
   * - navigates to dashboard
   *
   * On failure:
   * - maps Firebase error code to a user-friendly message
   */
  async performLogin(): Promise<void> {
    const { email, password } = this.loginForm.value;
    try {
      const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
      this.errorMessage = null;
      this.saveSessionStorage(userCredential.user.uid);
      this.router.navigate(['/dashboard']);
    } catch (error: any) {
      this.errorMessage = this.getErrorMessage(error.code);
    }
  }

  /**
   * Marks all form controls as touched so validation errors render in the UI.
   */
  markFormAsTouched(): void {
    Object.keys(this.loginForm.controls).forEach((key) => {
      this.loginForm.get(key)?.markAsTouched();
    });
  }

  /**
   * Logs in using Google OAuth (Firebase popup flow).
   *
   * After successful authentication:
   * - checks if the user already exists in Firestore
   * - if not, navigates to the avatar setup route
   * - otherwise, stores session and navigates to dashboard
   */
  async loginWithGoogle(): Promise<void> {
    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(this.auth, provider);
    const uid = userCredential.user.uid;
    const snap = await this.userService.checkGoogleUser(uid);
    this.errorMessage = null;
    if (!snap.exists()) {
      await this.router.navigate(['/avatar'], {state: { fromGoogle: true, userName: userCredential.user.displayName }});
    } else {
      this.saveSessionStorage(uid);
      await this.router.navigate(['/dashboard']);
    }
  }

  /**
   * Logs in as a guest user.
   *
   * Stores a guest role in sessionStorage and delegates the actual sign-in
   * flow to {@link AuthService.signInAsGuest}.
   */
  async guestLogin(): Promise<void> {
    this.errorMessage = null;
    this.saveSessionStorage(this.guestId);
    await this.authService.signInAsGuest();
  }

  /** Navigates to the registration page. */
  goToRegister(): void {
    this.router.navigate(['/register']);
  }

  /** Navigates to the "send mail" / password reset page. */
  goToSendMail(): void {
    this.router.navigate(['/send-mail']);
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
      case 'auth/wrong-password':
        return 'Falsches Passwort.';
      case 'auth/too-many-requests':
        return 'Zu viele Anmeldeversuche. Bitte versuche es später erneut.';
      default:
        return 'Ein Fehler ist aufgetreten. Bitte versuche es erneut.';
    }
  }

  /**
   * Persists session info in sessionStorage so the rest of the app can
   * identify the current user and role.
   *
   * @param uid Firebase Auth user id.
   */
  saveSessionStorage(uid: string) {
    sessionStorage.setItem('sessionData', uid);
    if (uid === this.guestId) {
      sessionStorage.setItem('role', 'guest');
    } else {
      sessionStorage.setItem('role', 'user');
    }
  }
}
