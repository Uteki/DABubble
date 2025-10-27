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
import { IntroService } from '../../intro.service';

@Component({
  selector: 'app-send-mail',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './send-mail.component.html',
  styleUrls: ['./send-mail.component.scss', './send-mail.component.responsive.scss'],
})
export class SendMailComponent implements OnInit {
  forgotForm: FormGroup;
  showForm = false;
  noAnimation = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  showLogin = false;

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private auth: Auth,
    private introService: IntroService
  ) {
    this.forgotForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
    });
  }

  ngOnInit(): void {
    console.log(
      'SendMail Intro shown status:',
      this.introService.getIntroShown()
    );

    if (this.introService.getIntroShown()) {
      this.showForm = true;
      this.noAnimation = true;
      this.showLogin = true;
    } else {
      setTimeout(() => {
        this.showForm = true;
        this.showLogin = true;
        this.introService.setIntroShown(true);
        console.log('SendMail animation completed, status set to true');
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
    this.router.navigate(['/login']);
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
      default:
        return 'Ein Fehler ist aufgetreten. Bitte versuche es erneut.';
    }
  }
}
