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
import { IntroService } from '../../intro.service';

@Component({
  selector: 'app-reset',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './reset.component.html',
  styleUrls: ['./reset.component.scss', './reset.component.responsive.scss'],
})
export class ResetComponent implements OnInit {
  resetForm: FormGroup;
  showForm = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  actionCode: string = '';
  showLogin = false;
  noAnimation = false;

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private auth: Auth,
    private introService: IntroService
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
      this.showLogin = true;
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
            this.showLogin = true;
          }, 2500);
        }
      })
      .catch((error) => {
        this.errorMessage = 'Der Reset-Link ist ungültig oder abgelaufen.';
        console.error('Fehler bei der Code-Verifizierung:', error);
      });
    console.log('Initial form valid:', this.resetForm.valid);
  }

  async onSubmit(): Promise<void> {
    console.log('Form submitted, valid:', this.resetForm.valid);
    if (this.resetForm.invalid) {
      this.resetForm.markAllAsTouched();
      return;
    }

    if (this.actionCode) {
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
    }
  }

  passwordMatchValidator(group: FormGroup): any {
    const password = group.get('newPassword')?.value;
    const confirm = group.get('confirmPassword')?.value;
    return password === confirm ? null : { notMatching: true };
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
      case 'auth/weak-password':
        return 'Das Passwort ist zu schwach.';
      case 'auth/invalid-action-code':
        return 'Der Reset-Code ist ungültig.';
      default:
        return 'Ein Fehler ist aufgetreten. Bitte versuche es erneut.';
    }
  }
}
