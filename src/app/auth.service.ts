import { Injectable, OnDestroy } from '@angular/core';
import {
  Auth,
  User,
  onAuthStateChanged,
  browserSessionPersistence,
  setPersistence,
  signInAnonymously,
  user,
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
      .then(() => console.log('Auth Persistence auf SESSION gesetzt'))
      .catch((error) =>
        console.error('Fehler beim Setzen der Persistence:', error)
      );

    onAuthStateChanged(this.auth, (user) => {
      this.currentUser = user;

      if (user && user.isAnonymous) {
        console.log('Guest-User aktiv (Session-only)');
      } else if (!user) {
        console.log('Kein User eingeloggt');
      } else {
        console.log('Nicht-Guest-User aktiv');
      }
    });
  }

  readCurrentUser(): string {
    return this.currentUser?.uid ?? '';
  }

  async signInAsGuest(): Promise<void> {
    try {
      const credential = await signInAnonymously(this.auth);
      this.router.navigate(['/dashboard']);
    } catch (error) {
      console.error('Fehler beim Guest-SignIn:', error);
    }
  }

  signOut(): void {
    this.auth
      .signOut()
      .then(() => {
        console.log('User ausgeloggt');
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
      .then(() => {
        console.log('User beim Tab-Schließen ausgeloggt');
      })
      .catch((error) => {
        console.error('Fehler beim SignOut beim Tab-Schließen:', error);
      });
  }

  ngOnDestroy(): void {}
}
