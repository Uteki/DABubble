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

@Component({
  selector: 'app-reset',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './reset.component.html',
  styleUrls: ['./reset.component.scss'],
})
export class ResetComponent implements OnInit {
  resetForm: FormGroup;
  showForm = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  actionCode: string = '';
  showLogin = false;

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private auth: Auth
  ) {
    this.resetForm = this.formBuilder.group(
      {
        newPassword: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', [Validators.required]],
      },
      { validator: this.passwordMatchValidator }
    );

    const navigation = this.router.getCurrentNavigation();
    const skipAnimation = navigation?.extras?.state?.['skipAnimation'] ?? false;

    if (skipAnimation) {
      this.showForm = true;
    }
  }

  ngOnInit(): void {
    this.actionCode = this.route.snapshot.queryParams['oobCode'] || '';
    if (!this.actionCode) {
      this.errorMessage = 'Ungültiger Reset-Link.';
      return;
    }

    verifyPasswordResetCode(this.auth, this.actionCode)
      .then(() => {
        if (!this.showForm) {
          setTimeout(() => {
            this.showForm = true;
          }, 2500);
        }
      })
      .catch((error) => {
        this.errorMessage = 'Der Reset-Link ist ungültig oder abgelaufen.';
        console.error('Fehler bei der Code-Verifizierung:', error);
      });
  }

  async onSubmit(): Promise<void> {
    if (this.resetForm.valid && this.actionCode) {
      const { newPassword } = this.resetForm.value;
      try {
        await confirmPasswordReset(this.auth, this.actionCode, newPassword);
        this.successMessage = 'Passwort erfolgreich zurückgesetzt.';
        this.errorMessage = null;
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 3000);
      } catch (error: any) {
        this.errorMessage = this.getErrorMessage(error.code);
        this.successMessage = null;
        console.error('Fehler beim Zurücksetzen des Passworts:', error);
      }
    } else {
      Object.keys(this.resetForm.controls).forEach((key) => {
        this.resetForm.get(key)?.markAsTouched();
      });
    }
  }

  passwordMatchValidator(group: FormGroup): any {
    const password = group.get('newPassword')?.value;
    const confirm = group.get('confirmPassword')?.value;
    return password === confirm ? null : { notMatching: true };
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
      case 'auth/weak-password':
        return 'Das Passwort ist zu schwach.';
      case 'auth/invalid-action-code':
        return 'Der Reset-Code ist ungültig.';
      default:
        return 'Ein Fehler ist aufgetreten. Bitte versuche es erneut.';
    }
  }
}
