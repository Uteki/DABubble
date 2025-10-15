import { Injectable, OnDestroy } from '@angular/core';
import { Auth, User, onAuthStateChanged } from '@angular/fire/auth';

@Injectable({
  providedIn: 'root'
})
export class AuthService implements OnDestroy {
  private currentUser: User | null = null;
  private beforeUnloadHandler: ((event: BeforeUnloadEvent) => void) | undefined;

  constructor(private auth: Auth) {
    onAuthStateChanged(this.auth, (user) => {
      this.currentUser = user;
      if (user && user.isAnonymous) {
        this.beforeUnloadHandler = this.deleteGuestUser.bind(this);
        window.addEventListener('beforeunload', this.beforeUnloadHandler);
        console.log('Guest-User-Listener aktiviert');
      } else {
        if (this.beforeUnloadHandler) {
          window.removeEventListener('beforeunload', this.beforeUnloadHandler);
        }
        console.log('Listener deaktiviert (nicht Guest)');
      }
    });
  }

  private deleteGuestUser(event: BeforeUnloadEvent): void {
    if (this.currentUser && this.currentUser.isAnonymous) {
      this.currentUser.delete()
        .then(() => {
          console.log('Guest-User erfolgreich gelöscht');
        })
        .catch((error) => {
          console.error('Fehler beim Löschen des Guest-Users:', error);
          this.auth.signOut();
        });
    }
  }

  ngOnDestroy(): void {
    if (this.beforeUnloadHandler) {
      window.removeEventListener('beforeunload', this.beforeUnloadHandler);
    }
  }
}