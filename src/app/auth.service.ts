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
  user$: Observable<User | null> = user(this.auth);
  private currentUser: User | null = null;

  constructor(private auth: Auth, private router: Router) {
    this.user$ = user(this.auth);
    setPersistence(this.auth, browserSessionPersistence)
      .then(() => {
        console.log('Auth Persistence auf SESSION gesetzt');
      })
      .catch((error) => {
        console.error('Fehler beim Setzen der Persistence:', error);
      });

    onAuthStateChanged(this.auth, (user) => {
      this.currentUser = user;
      if (user && user.isAnonymous) {
        console.log('Guest-User aktiv (Session-only)');
      } else if (!user) {
        this.signInAsGuest();
      } else {
        console.log('Nicht-Guest-User aktiv');
      }
    });
  }

  private setupAuthStateListener(): void {
    onAuthStateChanged(this.auth, (user) => {
      this.currentUser = user;
      if (user && user.isAnonymous) {
        console.log('Guest-User aktiv (Session-only)');
        this.router.navigate(['/dashboard']);
      } else if (!user) {
        this.signInAsGuest();
      } else {
        console.log('Nicht-Guest-User aktiv');
      }
    });
  }

  private signInAsGuest(): void {
    signInAnonymously(this.auth)
      .then((credential) => {
        console.log('Neuer Guest-User erstellt:', credential.user.uid);
        sessionStorage.setItem('sessionData', JSON.stringify({ guest: true }));
        this.router.navigate(['/dashboard']);
      })
      .catch((error) => {
        console.error('Fehler beim Guest-SignIn:', error);
      });
  }

  signOut(): void {
    this.auth
      .signOut()
      .then(() => {
        console.log('User ausgeloggt');
      })
      .catch((error) => {
        console.error('Fehler beim SignOut:', error);
      });
  }

  ngOnDestroy(): void {}
}
