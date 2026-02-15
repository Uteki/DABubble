import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { ElementRef, HostListener, ViewChild } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { Firestore } from '@angular/fire/firestore';
import { Router, RouterLink } from '@angular/router';
import { NgClass, NgForOf, NgIf } from '@angular/common';
import { MessageSearchBase } from "../../core/base/message-search.base";
import { UserService } from '../../user.service';
import { AuthService } from '../../auth.service';
import { ChatService } from "../../chat.service";
import { IdleTrackerService } from '../../idle-tracker.service';
import { ProfileOverlayService } from '../../profile-overlay.service';
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { BroadcastRecipient } from "../../core/type/recipient";
import { GlobalSearchResult } from "../../core/interfaces/global-search-result";
import { User } from "../../core/interfaces/user";

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [NgClass, NgForOf, NgIf, ReactiveFormsModule, FormsModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent extends MessageSearchBase implements OnInit, OnDestroy {
  @Input() users: any[] = [];
  @Input() channels: any[] = [];
  @Input() menu: boolean = false;

  @Output() channelsMenu = new EventEmitter<void>();
  @Output() toggleRequest = new EventEmitter<boolean>();
  @Output() partnerSelected = new EventEmitter<User>();

  @ViewChild('searchResult', { static: true }) searchWrapper!: ElementRef;

  username: string = 'Frederik Beck';
  useremail: string = ' fred.back@email.com ';
  userAvatar: string = '';
  toggleDropdownMenu: boolean = false;
  toggleProfileMenu: boolean = false;
  userStatus: boolean = false;
  edit: boolean = false;
  sessionData = sessionStorage.getItem('sessionData');
  isGuest = sessionStorage.getItem('role') === 'guest';
  isMobile = window.innerWidth < 768;
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
    private router: Router, private auth: Auth, private firestore: Firestore,
    private userService: UserService,
    private idleTracker: IdleTrackerService,
    private profileOverlayService: ProfileOverlayService,
    authService: AuthService,
    chatService: ChatService
  ) {
    super(chatService, authService);
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

  @HostListener('window:resize')
  onResize() {
    this.isMobile = window.innerWidth < 768;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const clickedInside = this.searchWrapper.nativeElement.contains(event.target);
    if (!clickedInside) this.hideSearchResults()
  }

  get filteredUsers() {
    const isUserSearch = this.recipientInput.startsWith('@');
    const isChannelSearch = this.recipientInput.startsWith('#');
    const isEmailSearch = !isUserSearch && !isChannelSearch && this.recipientInput.length > 0;

    if (!isUserSearch && !isEmailSearch) return [];

    const usedPartnerChats = new Set(
      this.recipient.filter(this.isUserRecipient).map(r => r.partnerChat)
    );

    return this.users.filter(user => !this.isAlreadyAdded(user, usedPartnerChats))
      .filter(user => this.isUserMatch(user, isUserSearch, isEmailSearch, this.recipientInput))
      .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
  }

  get filteredChannels() {
    if (!this.recipientInput.startsWith('#')) return [];

    const usedChannelIds = new Set(
      this.recipient.filter(this.isChannelRecipient).map(r => r.channelId)
    );
    let filtered = this.channels.filter(channel => !usedChannelIds.has(channel.id));
    let term = this.searchTerm;

    if (term) {
      filtered = filtered.filter(channel => channel.name.toLowerCase().includes(term));
    }
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }

  async emitPartner(whisperId: string | undefined) {
    if (!whisperId) return;
    let whisperChat = this.getPartnerUidFromWhisper(whisperId, this.authService.readCurrentUser());
    const partnerObj: User = this.users.find((user) => user.uid === whisperChat);
    this.partnerSelected.emit(partnerObj);
    this.toggleRequest.emit(true);
  }

  async openChannelResult(result: GlobalSearchResult) {
    const channelId = result.channelId ?? result.nativeId;
    if (channelId != null) this.chatService.currentChannelID = channelId;
    this.toggleRequest.emit(false);
    this.chatService.setCurrentChat(channelId, '', '', '');
    this.scrollToMessage(result.id);
  }

  async openWhisperResult(result: GlobalSearchResult) {
    const whisperId = result.whisperId ?? result.nativeId;
    await this.emitPartner(whisperId);
    this.scrollToMessage(result.id);
  }

  private isAlreadyAdded(user: any, usedPartnerChats: Set<string>): boolean {
    const partnerChat = this.buildPartnerChat(user.uid);
    return usedPartnerChats.has(partnerChat);
  }

  private isUserMatch(user: any, isUserSearch: boolean, isEmailSearch: boolean, value: string): boolean {
    if (isUserSearch) {
      if (!this.searchTerm) return true;
      return user.name?.toLowerCase().includes(this.searchTerm);
    }

    if (isEmailSearch) return user.email?.toLowerCase().includes(value.toLowerCase())

    return false;
  }

  isUserRecipient(r: BroadcastRecipient): r is Extract<BroadcastRecipient, { type: 'user' }> {
    return r.type === 'user';
  }

  isChannelRecipient(r: BroadcastRecipient): r is Extract<BroadcastRecipient, { type: 'channel' }> {
    return r.type === 'channel';
  }

  removeRecipient() {
    this.recipient = [];
  }

  addRecipient(userid: string, name: string, mail: string, avatar: string) {
    const partnerChat = this.buildPartnerChat(userid);

    if (this.recipient.some(r => r.type === 'user' && r.partnerChat === partnerChat)) return

    this.recipient = [{type: 'user', partnerChat, name: name, mail: mail, avatar: avatar}];
    this.recipientInput = "";
    this.onInputChange(this.recipientInput);
  }

  addChannelRecipient(channelId: string, name: string) {
    if (this.recipient.some(r => r.type === 'channel' && r.channelId === channelId)) return

    this.recipient = [{type: 'channel', channelId, name}];
    this.recipientInput = "";
    this.onInputChange(this.recipientInput);
  }

  getChannelName(channelId: string): string {
    const channel = this.channels.find(c => c.id === channelId);
    return channel?.name ?? 'Unbekannter Channel';
  }

  getWhisperName(whisperId: string): string {
    let test = this.getPartnerUidFromWhisper(whisperId, this.authService.readCurrentUser());
    const user = this.users.find(u => u.uid === test);
    return user?.name ?? 'Unknown user';
  }

  openFoundMessage(result: GlobalSearchResult) {
    const searchResults = document.getElementById('search-results');
    searchResults?.classList.add('no-display');

    if (result.channelId || result.type === 'channel') {
      this.openChannelResult(result).then();
    } else {
      this.openWhisperResult(result).then();
    }
  }

  scrollToMessage(messageId: string) {
    setTimeout(() => {
      const el = document.querySelector(
        `[data-message-id="${messageId}"]`
      );
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('highlight');
        setTimeout(() => el.classList.remove('highlight'), 2000);
      }
    }, 300);
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

  menuOn() {
    this.channelsMenu.emit()
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
    const searchResults = document.getElementById('search-results');
    searchResults?.classList.add('no-display');
    if (this.wasEmpty && value.length > 0) {
      this.searchBar(value);
      this.wasEmpty = false;
    }
    if (value.length === 0) {
      this.wasEmpty = true;
      this.hideSearchResults();
    }
  }

  searchBar(value: string) {
    const searchResultsContacts = document.getElementById('search-results-contacts');
    const searchResultsChannels = document.getElementById('search-results-channels');
    if (value === '@') {
      searchResultsContacts?.classList.remove('no-display');
    } else if (value === '#') {
      searchResultsChannels?.classList.remove('no-display');
    }
  }

toggleDropdown() {
  if (this.toggleDropdownMenu) {
    this.closeDropdown();
  } else {
    this.openDropdown();
  }
}

closeDropdown() {
  const dropdown = document.querySelector('.dropdown-item-mobile');
  if (dropdown) {
    dropdown.classList.add('no-display');
    setTimeout(() => {
      this.toggleDropdownMenu = false;
    }, 200);
  }
}

openDropdown() {
  this.toggleDropdownMenu = true;
  setTimeout(() => {
    const dropdown = document.querySelector('.dropdown-item-mobile');
    if (dropdown) {
      dropdown.classList.remove('no-display');
    }
  }, 10);
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
