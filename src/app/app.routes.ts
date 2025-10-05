import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { RegisterComponent } from './login/register/register.component';
import { AvatarComponent } from './login/avatar/avatar.component';
import { HeaderComponent } from './shared/header/header.component';
import {DashboardComponent} from "./dashboard/dashboard.component";

export const routes: Routes = [
  { path: '', component: LoginComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'avatar', component: AvatarComponent },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'header', component: HeaderComponent },
  { path: '**', redirectTo: '' },
];
