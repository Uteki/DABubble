import { Injectable, OnDestroy } from '@angular/core';
import {
  Auth,
  User,
  onAuthStateChanged,
  browserSessionPersistence,
  setPersistence,
  signInAnonymously,
} from '@angular/fire/auth';

@Injectable({
  providedIn: 'root',
})
export class AuthService implements OnDestroy {
  private currentUser: User | null = null;

  constructor(private auth: Auth) {
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

  private signInAsGuest(): void {
    signInAnonymously(this.auth)
      .then((credential) => {
        console.log('Neuer Guest-User erstellt:', credential.user.uid);
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

  ngOnDestroy(): void {
  }
}
