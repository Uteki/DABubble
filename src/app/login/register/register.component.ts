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
  createUserWithEmailAndPassword,
  updateProfile,
} from '@angular/fire/auth';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
})
export class RegisterComponent implements OnInit {
  registerForm: FormGroup;
  errorMessage: string | null = null;

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private auth: Auth
  ) {
    this.registerForm = this.formBuilder.group({
      fullName: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      privacyAccepted: [false, [Validators.requiredTrue]],
    });
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
        console.log('Registriert:', userCredential.user);
        this.errorMessage = null;
        this.router.navigate(['/avatar'], {
          state: { userName: fullName },
        });
      } catch (error: any) {
        this.errorMessage = this.getErrorMessage(error.code);
        console.error('Fehler bei der Registrierung:', error);
      }
    } else {
      Object.keys(this.registerForm.controls).forEach((key) => {
        this.registerForm.get(key)?.markAsTouched();
      });
    }
  }

  goBack(): void {
    this.router.navigate(['/login'], { state: { skipAnimation: true } });
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
