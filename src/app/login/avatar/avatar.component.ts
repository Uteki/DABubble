import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { Firestore, doc, setDoc } from '@angular/fire/firestore';
import { ChatService } from '../../chat.service';
import { FormsModule } from '@angular/forms';

/**
 * AvatarComponent
 *
 * Handles avatar selection and initial profile setup
 * after registration or Google sign-in.
 *
 * Responsibilities:
 * - Displays selectable avatar options
 * - Stores selected avatar in Firestore user document
 * - Saves basic user profile data (name, email, uid, status)
 * - Adds the new user to the default chat/channel
 * - Redirects to login after successful setup
 *
 * Supports onboarding flows from:
 * - Email registration
 * - Google OAuth registration
 */
@Component({
  selector: 'app-avatar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './avatar.component.html',
  styleUrls: ['./avatar.component.scss', './avatar.component.responsive.scss'],
})
export class AvatarComponent implements OnInit {

  /** Display name of the user being onboarded. */
  userName: string = 'Frederik Beck';

  /** Currently selected avatar image path. */
  selectedAvatar: string = '';

  /** Whether the onboarding originated from Google OAuth. */
  fromGoogle: boolean = false;

  /** Shows validation error if no avatar is selected. */
  showError: boolean = false;

  /** Controls login button visibility (used by intro/layout logic). */
  showLogin = false;

  /** Available avatar image options for selection. */
  avatarOptions: string[] = [
    './../../../assets/avatars/avatarSmall1.png',
    './../../../assets/avatars/avatarSmall2.png',
    './../../../assets/avatars/avatarSmall3.png',
    './../../../assets/avatars/avatarSmall4.png',
    './../../../assets/avatars/avatarSmall5.png',
    './../../../assets/avatars/avatarSmall6.png',
  ];

  /**
   * @param router Angular Router for navigation
   * @param auth Firebase Auth instance
   * @param firestore Firebase Firestore instance
   * @param chat ChatService for onboarding channel integration
   */
  constructor(
    private router: Router,
    private auth: Auth,
    private firestore: Firestore,
    private chat: ChatService,
  ) {
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras?.state) {
      this.fromGoogle = !!navigation.extras.state['fromGoogle'];
      this.userName = navigation.extras.state['userName'] ?? this.userName;
    }
  }

  /** Lifecycle hook (reserved for future initialization logic). */
  ngOnInit(): void {}

  /**
   * Selects an avatar from the available options.
   * Clears validation error if previously shown.
   *
   * @param avatar Avatar image path
   */
  selectAvatar(avatar: string): void {
    this.selectedAvatar = avatar;
    this.showError = false;
  }

  /** Navigates back to the registration page. */
  goBack(): void {
    this.router.navigate(['/register']);
  }

  /**
   * Navigates to the legal notice page.
   * Skips intro animation via router state.
   */
  goTolegalNotice(): void {
    this.router.navigate(['/legal-notice'], { state: { skipAnimation: true } });
  }

  /**
   * Navigates to the privacy policy page.
   * Skips intro animation via router state.
   */
  goToPrivacyPolicy(): void {
    this.router.navigate(['/privacy-policy'], {
      state: { skipAnimation: true },
    });
  }

  /**
   * Continues onboarding:
   * - Validates avatar selection
   * - Saves user data
   */
  async onContinue(): Promise<void> {
    if (this.selectedAvatar && this.auth.currentUser) {
      await this.saveUserData();
    } else {
      this.showError = true;
    }
  }

  /**
   * Persists onboarding data and completes setup.
   *
   * Steps:
   * 1. Save user Firestore document
   * 2. Add user to default channel
   * 3. Redirect to login with success state
   */
  async saveUserData(): Promise<void> {
    try {
      await this.saveUserDocument();
      await this.addUserToChannel();
      await this.router.navigate(['/login'], {
        state: { accountCreated: true },
      });
    } catch (error) {
      console.error('Fehler beim Speichern des Avatars:', error);
    }
  }

  /**
   * Creates or updates the Firestore user document.
   *
   * Stored fields:
   * - name
   * - avatar
   * - email
   * - uid
   * - status (default: offline)
   */
  async saveUserDocument(): Promise<void> {
    const userDoc = doc(this.firestore, `users/${this.auth.currentUser!.uid}`);
    await setDoc(
      userDoc,
      {
        name: this.userName, avatar: this.selectedAvatar,
        email: this.auth.currentUser!.email,
        uid: this.auth.currentUser!.uid,
        status: false,
      },
      { merge: true },
    );
  }

  /**
   * Adds the new user to the default onboarding channel
   * and posts a welcome system message.
   */
  async addUserToChannel(): Promise<void> {
    await this.chat.addNewUser(
      { name: this.userName, uid: this.auth.currentUser!.uid },
      { user: 'Willkommen zu DABubble ', system: true, timestamp: Date.now() },
    );
  }

  /**
   * Saves the session UID locally.
   *
   * @param uid Firebase user id
   */
  sessionStorageSave(uid: string) {
    sessionStorage.setItem('sessionData', uid);
  }
}
