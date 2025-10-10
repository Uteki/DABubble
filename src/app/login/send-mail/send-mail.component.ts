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

@Component({
  selector: 'app-send-mail',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './send-mail.component.html',
  styleUrls: ['./send-mail.component.scss'],
})
export class SendMailComponent implements OnInit {
  forgotForm: FormGroup;
  showForm = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  showLogin = false;

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private auth: Auth
  ) {
    this.forgotForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
    });

    const navigation = this.router.getCurrentNavigation();
    const skipAnimation = navigation?.extras?.state?.['skipAnimation'] ?? false;

    if (skipAnimation) {
      this.showForm = true;
    }
  }

  ngOnInit(): void {
    if (!this.showForm) {
      setTimeout(() => {
        this.showForm = true;
      }, 2500);
    }
  }

  async onSubmit(): Promise<void> {
    if (this.forgotForm.valid) {
      const { email } = this.forgotForm.value;
      try {
        await sendPasswordResetEmail(this.auth, email);
        this.successMessage =
          'Eine E-Mail zum Zurücksetzen des Passworts wurde gesendet.';
        this.errorMessage = null;
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 3000);
      } catch (error: any) {
        this.errorMessage = this.getErrorMessage(error.code);
        this.successMessage = null;
        console.error('Fehler beim Senden der Reset-E-Mail:', error);
      }
    } else {
      Object.keys(this.forgotForm.controls).forEach((key) => {
        this.forgotForm.get(key)?.markAsTouched();
      });
    }
  }

  goBackToLogin(): void {
    this.router.navigate(['/login'], { state: { skipAnimation: true } });
  }

  goTolegalNotice(): void {
    this.router.navigate(['/legal-notice'], { state: { skipAnimation: true } });
  }

  goToPrivacyPolicy(): void {
    this.router.navigate(['/privacy-policy'], {
      state: { skipAnimation: true },
    });
  }

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
