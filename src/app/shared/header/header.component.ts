import { Component, OnDestroy, OnInit } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { Firestore } from '@angular/fire/firestore';
import { Router, RouterLink } from '@angular/router';
import { UserService } from '../../user.service';
import { AuthService } from '../../auth.service';
import { IdleTrackerService } from '../../idle-tracker.service';
import { ProfileOverlayService } from '../../profile-overlay.service';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, NgClass],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent implements OnInit, OnDestroy {
  username: string = 'Frederik Beck';
  useremail: string = ' fred.back@email.com ';
  userAvatar: string = '';
  toggleDropdownMenu: boolean = false;
  toggleProfileMenu: boolean = false;
  userStatus: boolean = false;
  edit: boolean = false;
  sessionData = sessionStorage.getItem('sessionData');
  private wasEmpty = true;

  isUserAbsent: boolean = false;

  private beforeUnloadHandler = () => {
/*     if (this.sessionData) {
      const url = `/api/updateStatus?uid=${this.sessionData}&active=false`;
      navigator.sendBeacon(url);
    }

    this.authService.signOutOnTabClose(); */
  };

  constructor(
    private router: Router,
    private auth: Auth,
    private firestore: Firestore,
    private userService: UserService,
    private idleTracker: IdleTrackerService,
    private profileOverlayService: ProfileOverlayService,
    private authService: AuthService
  ) {
    this.getUserInformation();
    this.changeUserStatus();
  }

  ngOnInit(): void {
    if (this.sessionData) {
      window.addEventListener('beforeunload', this.beforeUnloadHandler);
    }

    this.profileOverlayService.openProfile$.subscribe(() => {
      this.openProfileMenu();
    });

  }

  ngOnDestroy(): void {
    window.removeEventListener('beforeunload', this.beforeUnloadHandler);
  }

  trackIdle() {
    this.idleTracker.idleTime$.subscribe((idleTime) => {
      this.isUserAbsent = idleTime / 1000 > 30;
    });

    this.idleTracker.isIdle$.subscribe((isIdle) => {
      if (!isIdle) {
        this.isUserAbsent = false;
      }
    });
  }

  getUserInformation() {
    if (this.sessionData) {
      this.userService.getUserByUid(this.sessionData).subscribe((user) => {
        this.username = user.name;
        this.useremail = user.email;
        this.userStatus = user.status;
        this.userAvatar = user.avatar;
      });
    }
  }

  getLargeAvatar(avatarPath: string | undefined): string {
    if (!avatarPath) return 'assets/avatars/profile.png';
    return avatarPath.replace('avatarSmall', 'avatar');
  }

  returnAvatarPath(): string {
    if (this.userAvatar && this.userAvatar.length > 0) {
      return this.userAvatar;
    } else {
      return 'assets/avatars/profile.png';
    }
  }

  changeUserStatus() {
    if (this.sessionData) {
      this.userService
        .updateUserStatus(this.sessionData, true)
        .catch((err) => console.error(err));
    }
  }

  logout() {
   /*  if (this.sessionData) {
      this.userService
        .updateUserStatus(this.sessionData, false)
        .catch((err) => console.error(err));
      sessionStorage.removeItem('sessionData');
    }
    this.authService.signOut(); */
  }

  onInputChange(value: string) {
    const searchResultsContacts = document.getElementById(
      'search-results-contacts'
    );
    const searchResultsChannels = document.getElementById(
      'search-results-channels'
    );
    if (this.wasEmpty && value.length > 0) {
      this.searchBar(value);
      this.wasEmpty = false;
    }
    if (value.length === 0) {
      this.wasEmpty = true;
      searchResultsContacts?.classList.add('no-display');
      searchResultsChannels?.classList.add('no-display');
    }
  }

  searchBar(value: string) {
    const searchResultsContacts = document.getElementById(
      'search-results-contacts'
    );
    const searchResultsChannels = document.getElementById(
      'search-results-channels'
    );
    if (value === '@') {
      searchResultsContacts?.classList.remove('no-display');
    } else if (value === '#') {
      searchResultsChannels?.classList.remove('no-display');
    }
  }

  toggleDropdown() {
    if (this.toggleDropdownMenu) {
      const dropdown = document.querySelector('.dropdown-item-mobile');
      if (dropdown) {
        dropdown.classList.add('no-display');
        setTimeout(() => {
          this.toggleDropdownMenu = false;
        }, 200); 
      }
    } else {

      this.toggleDropdownMenu = true;
      setTimeout(() => {
        const dropdown = document.querySelector('.dropdown-item-mobile');
        if (dropdown) {
          dropdown.classList.remove('no-display');
        }
      }, 10); 
    }
  }

  stopPropagation(event: Event) {
    event.stopPropagation();
  }

  toggleProfile() {
    this.edit = false;
    this.toggleProfileMenu = !this.toggleProfileMenu;
  }

  openProfileMenu() {
    this.edit = false;
   this.toggleProfileMenu = !this.toggleProfileMenu;
  }

  editProfile() {
    this.edit = true;
  }

  changeUserName() {
    const inputNameElement = document.getElementById(
      'input-name'
    ) as HTMLInputElement;
    let inputName = inputNameElement ? inputNameElement.value : '';

    if (this.sessionData) {
      this.userService
        .updateUserName(this.sessionData, inputName)
        .catch((err) => console.error(err));
    }
    inputName = '';
    this.edit = false;
  }
}
