import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { RegisterComponent } from './login/register/register.component';
import { AvatarComponent } from './login/avatar/avatar.component';
import { HeaderComponent } from './shared/header/header.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { SendMailComponent } from './login/send-mail/send-mail.component';
import { ResetComponent } from './login/reset/reset.component';
import { LegalNoticeComponent } from './login/legal-notice/legal-notice.component';
import { PrivacyPolicyComponent } from './login/privacy-policy/privacy-policy.component';
import { authGuard } from './auth.guard';

export const routes: Routes = [
  { path: '', component: LoginComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'avatar', component: AvatarComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
  { path: 'header', component: HeaderComponent },
  { path: 'send-mail', component: SendMailComponent },
  { path: 'reset', component: ResetComponent },
  { path: 'legal-notice', component: LegalNoticeComponent },
  { path: 'privacy-policy', component: PrivacyPolicyComponent },
  { path: '**', redirectTo: '' },
];
