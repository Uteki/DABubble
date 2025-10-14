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
  signInAnonymously,
} from '@angular/fire/auth';
import { IntroService } from '../intro.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  showLogin = false;
  showIntroStep = false;
  noAnimation = false;
  showFinal = false;
  errorMessage: string | null = null;

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private auth: Auth,
    private introService: IntroService
  ) {
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  ngOnInit(): void {
    console.log('Intro shown status:', this.introService.getIntroShown());
    if (this.introService.getIntroShown()) {
      this.showIntroStep = true;
      this.showFinal = true;
      this.showLogin = true;
      this.noAnimation = true;
    } else {
      setTimeout(() => {
        this.showIntroStep = true;
      }, 1500);
      setTimeout(() => {
        this.showFinal = true;
      }, 2500);
      setTimeout(() => {
        this.showLogin = true;
        this.introService.setIntroShown(true);
        console.log('Intro animation completed, status set to true');
      }, 3500);
    }
  }

  async onSubmit(): Promise<void> {
    if (this.loginForm.valid) {
      const { email, password } = this.loginForm.value;
      try {
        const userCredential = await signInWithEmailAndPassword(
          this.auth,
          email,
          password
        );
        console.log('Eingeloggt:', userCredential.user);
        this.errorMessage = null;
        this.router.navigate(['/dashboard']);
      } catch (error: any) {
        this.errorMessage = this.getErrorMessage(error.code);
        console.error('Fehler beim Login:', error);
      }
    } else {
      Object.keys(this.loginForm.controls).forEach((key) => {
        this.loginForm.get(key)?.markAsTouched();
      });
    }
  }

  async loginWithGoogle(): Promise<void> {
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(this.auth, provider);
      console.log('Google-Login erfolgreich:', userCredential.user);
      this.errorMessage = null;
      this.router.navigate(['/dashboard']);
    } catch (error: any) {
      this.errorMessage = this.getErrorMessage(error.code);
      console.error('Fehler beim Google-Login:', error);
    }
  }

  async guestLogin(): Promise<void> {
    try {
      const userCredential = await signInAnonymously(this.auth);
      console.log('Gäste-Login erfolgreich:', userCredential.user);
      this.errorMessage = null;
      this.router.navigate(['/dashboard']);
    } catch (error: any) {
      this.errorMessage = this.getErrorMessage(error.code);
      console.error('Fehler beim Gäste-Login:', error);
    }
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
}
