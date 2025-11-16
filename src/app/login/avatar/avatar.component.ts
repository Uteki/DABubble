import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { Firestore, doc, setDoc } from '@angular/fire/firestore';
import {ChatService} from "../../chat.service";

@Component({
  selector: 'app-avatar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './avatar.component.html',
  styleUrls: ['./avatar.component.scss', './avatar.component.responsive.scss'],
})
export class AvatarComponent implements OnInit {
  userName: string = 'Frederik Beck';
  selectedAvatar: string = '';
  showError: boolean = false;
  showLogin = false;
  avatarOptions: string[] = [
    './../../../assets/avatars/avatarSmall1.png',
    './../../../assets/avatars/avatarSmall2.png',
    './../../../assets/avatars/avatarSmall3.png',
    './../../../assets/avatars/avatarSmall4.png',
    './../../../assets/avatars/avatarSmall5.png',
    './../../../assets/avatars/avatarSmall6.png',
  ];

  constructor(
    private router: Router,
    private auth: Auth,
    private firestore: Firestore,
    private chat: ChatService,
  ) {
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras?.state?.['userName']) {
      this.userName = navigation.extras.state['userName'];
    }
  }

  ngOnInit(): void {}

  selectAvatar(avatar: string): void {
    this.selectedAvatar = avatar;
    this.showError = false;
  }

  goBack(): void {
    this.router.navigate(['/register']);
  }

  goTolegalNotice(): void {
    this.router.navigate(['/legal-notice'], { state: { skipAnimation: true } });
  }

  goToPrivacyPolicy(): void {
    this.router.navigate(['/privacy-policy'], {
      state: { skipAnimation: true },
    });
  }

  async onContinue(): Promise<void> {
    if (this.selectedAvatar && this.auth.currentUser) {
      try {
        const userDoc = doc(
          this.firestore,
          `users/${this.auth.currentUser.uid}`
        );
        await setDoc(
          userDoc,
          {
            name: this.userName,
            avatar: this.selectedAvatar,
            email: this.auth.currentUser.email,
            uid: this.auth.currentUser.uid,
            status: false,
          },
          { merge: true }
        );
        await this.chat.addNewUser(
          { name: this.userName, uid: this.auth.currentUser.uid },
          { user: 'Willkommen zu DABubble ', system: true, timestamp: Date.now() }
        )
        this.router.navigate(['/login']);
      } catch (error) {
        console.error('Fehler beim Speichern des Avatars:', error);
      }
    } else {
      this.showError = true;
    }
  }

  sessionStorageSave(uid: string) {
    sessionStorage.setItem('sessionData', uid);
  }
}
