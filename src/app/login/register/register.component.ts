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

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss', './register.component.responsive.scss'],
})
export class RegisterComponent implements OnInit {
  registerForm: FormGroup;
  errorMessage: string | null = null;
  showLogin = false;

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private auth: Auth
  ) {
    this.registerForm = this.formBuilder.group({
      fullName: ['', [Validators.required, this.fullNameValidator]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      privacyAccepted: [false, [Validators.requiredTrue]],
    });
  }

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

  ngOnInit(): void {}

  async onSubmit(): Promise<void> {
    if (this.registerForm.valid) {
      const { fullName, email, password } = this.registerForm.value;
      try {
        const userCredential = await createUserWithEmailAndPassword(
          this.auth,
          email,
          password
        );
        await updateProfile(userCredential.user, { displayName: fullName });
        this.errorMessage = null;
        this.router.navigate(['/avatar'], {
          state: { userName: fullName },
        });
      } catch (error: any) {
        this.errorMessage = this.getErrorMessage(error.code);
      }
    } else {
      Object.keys(this.registerForm.controls).forEach((key) => {
        this.registerForm.get(key)?.markAsTouched();
      });
    }
  }

  goBack(): void {
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
      case 'auth/email-already-in-use':
        return 'Diese E-Mail-Adresse ist bereits registriert.';
      case 'auth/invalid-email':
        return 'Ungültige E-Mail-Adresse.';
      default:
        return 'Ein Fehler ist aufgetreten. Bitte versuche es erneut.';
    }
  }
}
