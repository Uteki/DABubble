import { Component } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { Firestore } from '@angular/fire/firestore';
import { Router, RouterLink } from '@angular/router';
import { UserService } from '../../user.service';
import { IdleTrackerService } from '../../idle-tracker.service';
import { ProfileOverlayService } from '../../profile-overlay.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent {
  username: string = 'Frederik Beck';
  useremail: string = ' fred.back@email.com ';
  userAvatar: string = '';
  userStatus: boolean = false;
  edit: boolean = false;
  sessionData = sessionStorage.getItem('sessionData');
  private wasEmpty = true;

  isUserAbsent: boolean = false;

  constructor(
    private router: Router,
    private auth: Auth,
    private firestore: Firestore,
    private userService: UserService,
    private idleTracker: IdleTrackerService,
    private profileOverlayService: ProfileOverlayService
  ) {
    this.getUserInformation();
    this.changeUserStatus();
    this.ngOnInit();
  }

  ngOnInit(): void {

  if (this.sessionData) {
    window.addEventListener('beforeunload', () => {

      const url = `/api/updateStatus?uid=${this.sessionData}&active=false`;
      navigator.sendBeacon(url);
    });
  }

  this.profileOverlayService.openProfile$.subscribe(() => {
    this.openProfileMenu();
  });

  this.trackIdle();
}

trackIdle() {
  this.idleTracker.idleTime$.subscribe(idleTime => {
    this.isUserAbsent = (idleTime / 1000) > 30;
   
  });

  this.idleTracker.isIdle$.subscribe(isIdle => {
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
   

  changeUserStatus() {
    if (this.sessionData) {
      this.userService
        .updateUserStatus(this.sessionData, true)
        .catch((err) => console.error(err));
    }
  }

  goToLogin() {
    window.location.href = '/login';
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
    const dropdown = document.getElementById('dropdownMenu');
    if (dropdown) {
      dropdown.classList.toggle('no-display');
    }
  }

  stopPropagation(event: Event) {
    event.stopPropagation();
  }

  toggleProfile() {
    this.edit = false;
    const profileMenu = document.getElementById('profile-menu');
    if (profileMenu) {
      profileMenu.classList.toggle('no-display');
    }
  }

  openProfileMenu() {
    this.edit = false;
    const profileMenu = document.getElementById('profile-menu');
    if (profileMenu) {
      profileMenu.classList.remove('no-display');
    }
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
