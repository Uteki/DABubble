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

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss', './login.component.responsive.scss'],
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  showLogin = false;
  showIntroStep = false;
  noAnimation = false;
  showFinal = false;
  accountCreated = false;
  errorMessage: string | null = null;
  private guestId: string = 'FXtCqE0SQjTI7Lc9JzvARWEMy9T2';

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

  ngOnInit(): void {
    if (this.introService.getIntroShown()) {
      this.skipIntroAnimation();
    } else {
      this.playIntroAnimation();
    }
  }

  skipIntroAnimation(): void {
    this.showIntroStep = true;
    this.showFinal = true;
    this.showLogin = true;
    this.noAnimation = true;
  }

  playIntroAnimation(): void {
    setTimeout(() => (this.showIntroStep = true), 1500);
    setTimeout(() => (this.showFinal = true), 2500);
    setTimeout(() => {
      this.showLogin = true;
      this.introService.setIntroShown(true);
    }, 3500);
  }

  async onSubmit(): Promise<void> {
    if (this.loginForm.valid) {
      await this.performLogin();
    } else {
      this.markFormAsTouched();
    }
  }

  async performLogin(): Promise<void> {
    const { email, password } = this.loginForm.value;
    try {
      const userCredential = await signInWithEmailAndPassword(
        this.auth,
        email,
        password,
      );
      this.errorMessage = null;
      this.saveSessionStorage(userCredential.user.uid);
      this.router.navigate(['/dashboard']);
    } catch (error: any) {
      this.errorMessage = this.getErrorMessage(error.code);
    }
  }

  markFormAsTouched(): void {
    Object.keys(this.loginForm.controls).forEach((key) => {
      this.loginForm.get(key)?.markAsTouched();
    });
  }

  async loginWithGoogle(): Promise<void> {
    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(this.auth, provider);
    const uid = userCredential.user.uid;
    const snap = await this.userService.checkGoogleUser(uid);
    this.errorMessage = null;
    if (!snap.exists()) {
      await this.router.navigate(['/avatar'], {
        state: { fromGoogle: true, userName: userCredential.user.displayName },
      });
    } else {
      this.saveSessionStorage(uid);
      await this.router.navigate(['/dashboard']);
    }
  }

  async guestLogin(): Promise<void> {
    this.errorMessage = null;
    this.saveSessionStorage(this.guestId);
    await this.authService.signInAsGuest();
  }

  goToRegister(): void {
    this.router.navigate(['/register']);
  }

  goToSendMail(): void {
    this.router.navigate(['/send-mail']);
  }

  goTolegalNotice(): void {
    this.router.navigate(['/legal-notice']);
  }

  goToPrivacyPolicy(): void {
    this.router.navigate(['/privacy-policy']);
  }

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

  saveSessionStorage(uid: string) {
    sessionStorage.setItem('sessionData', uid);
    if (uid === this.guestId) {
      sessionStorage.setItem('role', 'guest');
    } else {
      sessionStorage.setItem('role', 'user');
    }
  }
}
