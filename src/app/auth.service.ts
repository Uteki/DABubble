import { Injectable, OnDestroy } from '@angular/core';
import {
  Auth,
  User,
  onAuthStateChanged,
  browserSessionPersistence,
  setPersistence,
  signInAnonymously,
  user, signInWithEmailAndPassword,
} from '@angular/fire/auth';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthService implements OnDestroy {
  user$: Observable<User | null>;
  private currentUser: User | null = null;

  constructor(private auth: Auth, private router: Router) {
    this.user$ = user(this.auth);

    setPersistence(this.auth, browserSessionPersistence)
      .then()
      .catch((error) =>
        console.error('Fehler beim Setzen der Persistence:', error)
      );

    onAuthStateChanged(this.auth, (user) => {
      this.currentUser = user;
    });
  }

  readCurrentUser(): string {
    return this.currentUser?.uid ?? '';
  }

  async signInAsGuest(): Promise<void> {
    try {
      await signInWithEmailAndPassword(
        this.auth,
        'guest@dabubble.de',
        '12345678'
      );
      await this.router.navigate(['/dashboard']);
    } catch (error) {
      console.error('Fehler beim Guest-SignIn:', error);
    }
  }

  signOut(): void {
    this.auth
      .signOut()
      .then(() => {
        sessionStorage.removeItem('sessionData');
        this.router.navigate(['/login']);
      })
      .catch((error) => {
        console.error('Fehler beim SignOut:', error);
      });
  }

  signOutOnTabClose(): void {
    this.auth
      .signOut()
      .then(() => {})
      .catch((error) => {
        console.error('Fehler beim SignOut beim Tab-Schließen:', error);
      });
  }

  ngOnDestroy(): void {}
}
