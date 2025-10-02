import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';

export const routes: Routes = [
  { path: '', component: LoginComponent },
  { path: 'login', component: LoginComponent },
  // Weitere Routen hier...
  // { path: 'dashboard', component: DashboardComponent },
  { path: '**', redirectTo: '' },
];
