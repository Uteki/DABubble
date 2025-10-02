import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { Router } from '@angular/router';

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

  constructor(private formBuilder: FormBuilder, private router: Router) {
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  ngOnInit(): void {
    // Start intro animation after 2.5 seconds
    setTimeout(() => {
      this.showLogin = true;
    }, 2500);
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      const formData = this.loginForm.value;
      console.log('Login attempt:', formData);

      // Hier würdest du normalerweise einen Auth-Service aufrufen
      // this.authService.login(formData.email, formData.password)
      //   .subscribe(
      //     success => this.router.navigate(['/dashboard']),
      //     error => console.error('Login failed:', error)
      //   );
    } else {
      // Markiere alle Felder als touched um Fehler anzuzeigen
      Object.keys(this.loginForm.controls).forEach((key) => {
        this.loginForm.get(key)?.markAsTouched();
      });
    }
  }

  // Google Login Handler
  loginWithGoogle(): void {
    console.log('Google login initiated');
    // Hier würdest du die Google OAuth Integration implementieren
  }

  // Guest Login Handler
  guestLogin(): void {
    console.log('Guest login initiated');
    // Hier würdest du als Gast einloggen
    // this.router.navigate(['/dashboard']);
  }

  goToRegister(): void {
  this.router.navigate(['/register']);
}
}
