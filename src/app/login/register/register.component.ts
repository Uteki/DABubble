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
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
})
export class RegisterComponent implements OnInit {
  registerForm: FormGroup;

  constructor(private formBuilder: FormBuilder, private router: Router) {
    this.registerForm = this.formBuilder.group({
      fullName: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      privacyAccepted: [false, [Validators.requiredTrue]],
    });
  }

  ngOnInit(): void {
    // Optional: Animation beim Laden
  }

  onSubmit(): void {
    if (this.registerForm.valid) {
      const formData = this.registerForm.value;
      console.log('Register attempt:', formData);

      // Hier würdest du normalerweise einen Auth-Service aufrufen
      // this.authService.register(formData)
      //   .subscribe(
      //     success => this.router.navigate(['/verify-email']),
      //     error => console.error('Registration failed:', error)
      //   );
    }
  }

  goBack(): void {
    this.router.navigate(['/login']);
  }
}
