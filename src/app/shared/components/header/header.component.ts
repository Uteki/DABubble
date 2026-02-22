import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { ElementRef, HostListener, ViewChild } from '@angular/core';
import { NgClass, NgForOf, NgIf } from '@angular/common';
import { MessageSearchBase } from "../../../core/base/message-search.base";
import { UserService } from '../../../dashboard/user.service';
import { AuthService } from '../../../core/services/auth.service';
import { ChatService } from "../../../dashboard/chats/services/chat.service";
import { ProfileOverlayService } from './services/profile-overlay.service';
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { GlobalSearchResult } from "../../../core/interfaces/global-search-result";
import { User } from "../../../core/interfaces/user";
import { getLargeAvatar, returnAvatarPath, goToMessage, checkResultType } from './header.utils';
import { FilterService } from "./services/filter.service";

/**
 * HeaderComponent
 * Standalone header component that coordinates:
 * - Recipient selection UI (`@` users / email, `#` channels)
 * - Global message search results (open channel/whisper + scroll to message)
 * - Profile dropdown / profile overlay interactions
 * - User presence handling (mark active on load, mark inactive on tab close)
 * - Communication with parent layout (menu toggle, direct chat toggle, partner selection)
 * This component extends {@link MessageSearchBase} to reuse shared searching
 * and whisper/channel helper methods (e.g. building partner chat ids).
 */
@Component({
  selector: 'app-header',
  standalone: true,
  imports: [NgClass, NgForOf, NgIf, ReactiveFormsModule, FormsModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent extends MessageSearchBase implements OnInit, OnDestroy {

  /** Full user list used for filtering recipients and resolving whisper partner names. */
  @Input() users: any[] = [];
  /** Channel list used for filtering recipients and resolving channel names. */
  @Input() channels: any[] = [];
  /** Enables menu-specific UI mode (e.g. mobile header). */
  @Input() menu: boolean = false;
  /** Emits when the channels menu button is clicked (parent controls layout). */
  @Output() channelsMenu = new EventEmitter<void>();
  /** Emits whether the UI should switch to direct chat mode.`true` = direct chat view, `false` = channel view */
  @Output() toggleRequest = new EventEmitter<boolean>();
  /** Emits the selected chat partner when opening a whisper result. */
  @Output() partnerSelected = new EventEmitter<User>();
  /** Search wrapper element used to detect clicks outside of the search UI and close result dropdowns. */
  @ViewChild('searchResult', { static: true }) searchWrapper!: ElementRef;
  /** Current user display name shown in the header. */
  username: string = 'Frederik Beck';
  /** Current user email shown in the header. */
  useremail: string = ' fred.back@email.com ';
  /** Avatar path of the current user (stored in DB). */
  userAvatar: string = '';
  /** Controls the mobile dropdown menu visibility. */
  toggleDropdownMenu: boolean = false;
  /** Controls the profile menu/overlay visibility. */
  toggleProfileMenu: boolean = false;
  /** Current user presence/status from DB (e.g. online/offline). */
  userStatus: boolean = false;
  /** Whether the profile name edit UI is active. */
  edit: boolean = false;
  /** UID from session storage (app session identifier). */
  sessionData = sessionStorage.getItem('sessionData');
  /** Whether the current session is a guest session. */
  isGuest = sessionStorage.getItem('role') === 'guest';
  /** Responsive flag for mobile behavior (updated on resize). */
  isMobile = window.innerWidth < 768;
  /** Validation error message for name input field. */
  nameError: string | null = null;
  /** Edited username value bound to the input field. */
  editedUsername: string = '';
  /**
   * Tracks whether the recipient input was previously empty.
   * Used to only open chooser lists (`@` / `#`) on the first character entry.
   */
  private wasEmpty = true;
  /** Currently selected avatar image path. */
  selectedAvatar: string = '';
  /** Original avatar path before editing (used for cancel operation). */
  private originalAvatar: string = '';

  /** Available avatar image options for selection. */
   avatarOptions: string[] = ['./../../../assets/avatars/avatarSmall1.png','./../../../assets/avatars/avatarSmall2.png', './../../../assets/avatars/avatarSmall3.png', './../../../assets/avatars/avatarSmall4.png', './../../../assets/avatars/avatarSmall5.png', './../../../assets/avatars/avatarSmall6.png',];

  /**
   * beforeunload handler:
   * - Marks the user inactive via `sendBeacon`
   * - Signs out Firebase session on tab close
   * Note: `sendBeacon` is used because it is more reliable during unload.
   */
  private beforeUnloadHandler = () => {
   if (this.sessionData) {
      const url = `/api/updateStatus?uid=${this.sessionData}&active=false`;
      navigator.sendBeacon(url);
   }
   this.authService.signOutOnTabClose();
  };

  /**
   * Creates the HeaderComponent.
   * @param userService Provides user profile + presence updates.
   * @param profileOverlayService Emits events to open the profile overlay from elsewhere.
   * @param filterService Encapsulates filtering logic for users/channels recipient dropdowns.
   * @param authService Authentication facade (current uid, sign-out).
   * @param chatService Chat facade used by {@link MessageSearchBase} and for opening results.
   */
  constructor(
    private userService: UserService, private profileOverlayService: ProfileOverlayService, private filterService: FilterService,
    authService: AuthService, chatService: ChatService
  ) {
    super(chatService, authService);
    this.getUserInformation();
    this.changeUserStatus();
  }

  /**
   * Angular lifecycle hook.
   * Initializes:
   * - beforeunload handler (only when session exists)
   * - profile overlay open subscription
   */
  ngOnInit(): void {
    if (this.sessionData) {window.addEventListener('beforeunload', this.beforeUnloadHandler)}
    this.profileOverlayService.openProfile$.subscribe(() => {
      this.openProfileMenu();
    });
  }

  /**
   * Angular lifecycle hook.
   * Cleans up:
   * - beforeunload handler
   * Note: If you subscribe manually in this component, consider cleaning up subscriptions too.
   */
  ngOnDestroy(): void {
    window.removeEventListener('beforeunload', this.beforeUnloadHandler);
  }

   /**
   * Selects an avatar from the available options.
   * Clears validation error if previously shown.
   *
   * @param avatar Avatar image path
   */
  selectAvatar(avatar: string): void {
    this.selectedAvatar = avatar;
  }

  /** Updates {@link isMobile} when the window size changes. */
  @HostListener('window:resize')
  onResize() {
    this.isMobile = window.innerWidth < 768;
  }

  /**
   * Closes search dropdowns when a click happens outside the search wrapper.
   * @param event Document click event.
   */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const clickedInside = this.searchWrapper.nativeElement.contains(event.target);
    if (!clickedInside) this.hideSearchResults()
  }

  /**
   * Returns the filtered/sorted list of users for the recipient dropdown.
   * Delegates to {@link FilterService.getFilteredUsers}.
   */
  get filteredUsers() {
    return this.filterService.getFilteredUsers({
      users: this.users, recipient: this.recipient, recipientInput: this.recipientInput, searchTerm: this.searchTerm, buildPartnerChat: (uid) => this.buildPartnerChat(uid),
    });
  }

  /**
   * Returns the filtered/sorted list of channels for the recipient dropdown.
   * Delegates to {@link FilterService.getFilteredChannels}.
   */
  get filteredChannels() {
    return this.filterService.getFilteredChannels({
      channels: this.channels, recipient: this.recipient, recipientInput: this.recipientInput, searchTerm: this.searchTerm
    });
  }

  /**
   * Emits the whisper partner to the parent and switches UI to direct chat mode.
   * @param whisperId Whisper conversation id (format: `uidA_uidB`).
   */
  async emitPartner(whisperId: string | undefined) {
    if (!whisperId) return;
    let whisperChat = this.getPartnerUidFromWhisper(whisperId, this.authService.readCurrentUser());
    const partnerObj: User = this.users.find((user) => user.uid === whisperChat);
    this.partnerSelected.emit(partnerObj);
    this.toggleRequest.emit(true);
  }

  /**
   * Opens a channel result from global search:
   * - selects channel in chat service
   * - switches UI to channel mode
   * - scrolls to the target message
   * @param result Search result pointing to a channel message.
   */
  async openChannelResult(result: GlobalSearchResult) {
    const channelId = result.channelId ?? result.nativeId;
    if (channelId != null) this.chatService.currentChannelID = channelId;
    this.toggleRequest.emit(false);
    this.chatService.setCurrentChat(channelId, '', '', '');
    this.scrollToMessage(result.id);
  }

  /**
   * Opens a whisper result from global search:
   * - selects whisper partner
   * - scrolls to the target message
   * @param result Search result pointing to a whisper message.
   */
  async openWhisperResult(result: GlobalSearchResult) {
    const whisperId = result.whisperId ?? result.nativeId;
    await this.emitPartner(whisperId);
    this.scrollToMessage(result.id);
  }

  /** Clears the currently selected recipient. */
  removeRecipient() { this.recipient = [] }

  /**
   * Adds a user recipient (direct/whisper) to the recipient selection.
   * @param userid Target user uid.
   * @param name Target user name.
   * @param mail Target user email.
   * @param avatar Target user avatar path.
   */
  addRecipient(userid: string, name: string, mail: string, avatar: string) {
    const partnerChat = this.buildPartnerChat(userid);
    if (this.recipient.some(r => r.type === 'user' && r.partnerChat === partnerChat)) return
    this.recipient = [{type: 'user', partnerChat, name: name, mail: mail, avatar: avatar}];
    this.recipientInput = "";
    this.onInputChange(this.recipientInput);
  }

  /**
   * Adds a channel recipient to the recipient selection.
   * @param channelId Target channel id.
   * @param name Target channel name.
   */
  addChannelRecipient(channelId: string, name: string) {
    if (this.recipient.some(r => r.type === 'channel' && r.channelId === channelId)) return
    this.recipient = [{type: 'channel', channelId, name}];
    this.recipientInput = "";
    this.onInputChange(this.recipientInput);
  }

  /**
   * Resolves a channel display name by id.
   * @param channelId Channel id.
   * @returns Channel name or a fallback label.
   */
  getChannelName(channelId: string): string {
    const channel = this.channels.find(c => c.id === channelId);
    return channel?.name ?? 'Unbekannter Channel';
  }

  /**
   * Resolves whisper partner display name by whisper id.
   * @param whisperId Whisper id (format: `uidA_uidB`).
   * @returns Partner name or fallback.
   */
  getWhisperName(whisperId: string): string {
    let test = this.getPartnerUidFromWhisper(whisperId, this.authService.readCurrentUser());
    const user = this.users.find(u => u.uid === test);
    return user?.name ?? 'Unknown user';
  }

  /**
   * Opens a selected search result:
   * - closes the search dropdown
   * - routes the result to channel or whisper open logic
   * @param result Global search result to open.
   */
  openFoundMessage(result: GlobalSearchResult) {
    const searchResults = document.getElementById('search-results');
    searchResults?.classList.add('no-display');
    if (result.channelId || result.type === 'channel') {
      this.openChannelResult(result).then();
    } else { this.openWhisperResult(result).then() }
  }

  /**
   * Scrolls to a message in the DOM and highlights it.
   * Delegates to {@link goToMessage}.
   * @param messageId Message id used in `[data-message-id="..."]`.
   */
  scrollToMessage(messageId: string) { goToMessage(messageId) }

  /** Emits the channels menu toggle request to the parent. */
  menuOn() { this.channelsMenu.emit() }

  /** Loads current user profile data into the header state. Reads from DB: name, email, status, avatar */
  getUserInformation() {
    if (this.sessionData) {
      this.userService.getUserByUid(this.sessionData).subscribe((user) => {
        this.username = user.name; this.useremail = user.email
        this.userStatus = user.status; this.userAvatar = user.avatar
      });
    }
  }

  /**
   * Returns the large avatar path variant.
   * Delegates to {@link getLargeAvatar}.
   * @param avatarPath Small avatar path.
   * @returns Large avatar path (or default avatar).
   */
  getLargeAvatar(avatarPath: string | undefined): string { return getLargeAvatar(avatarPath) }

  /**
   * Returns a safe avatar path for display.
   * Delegates to {@link returnAvatarPath}.
   * @returns Avatar path or default avatar.
   */
  returnAvatarPath(): string  { return returnAvatarPath(this.userAvatar) }

  /** Marks the current user as active in the database. */
  changeUserStatus() {
    if (this.sessionData) {
      this.userService.updateUserStatus(this.sessionData, true).catch((err) => console.error(err));
    }
  }

  /**
   * Logs out the current user:
   * - marks user inactive
   * - clears session data
   * - signs out via {@link AuthService}
   */
  logout() {
    if (this.sessionData) {
      this.userService.updateUserStatus(this.sessionData, false).catch((err) => console.error(err));
      sessionStorage.removeItem('sessionData');
    } this.authService.signOut();
  }

  /**
   * Handles recipient input changes. Behavior:
   * - Hides message search results immediately
   * - Shows chooser dropdown on first character (`@` or `#`)
   * - When cleared, hides all search result containers
   * @param value Current input value.
   */
  onInputChange(value: string) {
    const searchResults = document.getElementById('search-results');
    searchResults?.classList.add('no-display');
    if (this.wasEmpty && value.length > 0) {
      this.searchBar(value); this.wasEmpty = false
    }
    if (value.length === 0) {
      this.wasEmpty = true; this.hideSearchResults()
    }
  }

  /**
   * Shows chooser lists based on trigger characters.
   * Delegates to {@link checkResultType}.
   * @param value Raw input value.
   */
  searchBar(value: string) { checkResultType(value) }
  /** Toggles the mobile dropdown menu open/close. */
  toggleDropdown() { this.toggleDropdownMenu ? this.closeDropdown() : this.openDropdown() }

  /** Closes the dropdown menu using the `no-display` class (for animation). */
  closeDropdown() {
    const dropdown = document.querySelector('.dropdown-item-mobile');
    if (dropdown) {
      dropdown.classList.add('no-display');
      setTimeout(() => { this.toggleDropdownMenu = false }, 200)
    }
  }

  /** Opens the dropdown menu and removes the `no-display` class after a tick. */
  openDropdown() {
    this.toggleDropdownMenu = true;
    setTimeout(() => {
      const dropdown = document.querySelector('.dropdown-item-mobile');
      if (dropdown) dropdown.classList.remove('no-display');
    }, 10);
  }

  /**
   * Prevents click event bubbling (useful for dropdown/menu interaction).
   * @param event DOM event.
   */
  stopPropagation(event: Event) { event.stopPropagation() }

  /** Toggles the profile menu and disables edit mode. Resets avatar to original if canceled. */
  toggleProfile() {
  if (this.edit) { this.userAvatar = this.originalAvatar; this.selectedAvatar = ''; }
  this.edit = false; this.toggleProfileMenu = !this.toggleProfileMenu;
}

  /** Opens the profile menu and disables edit mode. */
  openProfileMenu() {
   this.edit = false; 
   this.toggleProfileMenu = !this.toggleProfileMenu; 
  }

  /** Enables profile edit mode and prefills the input with current username and avatar. */
  editProfile() { 
    this.edit = true;
    this.editedUsername = this.username;
    this.selectedAvatar = this.userAvatar;
    this.originalAvatar = this.userAvatar;
    this.nameError = null;
  }

  /**
   * Validates the name input in real-time.
   * Checks if the trimmed name is empty or contains less than 2 words.
   */
  validateName() {
    const trimmedName = this.editedUsername.trim();
    const words = trimmedName.split(/\s+/).filter(word => word.length > 0);
    
    if (trimmedName === '') {
      this.nameError = 'Der Name darf nicht leer sein.';
    } else if (words.length < 2) {
      this.nameError = 'Der Name muss mindestens zwei Wörter enthalten.';
    } else {
      this.nameError = null;
    }
  }

  /**
   * Updates the user name and avatar in the database.
   * Validates that the name contains at least 2 words before updating.
   * Updates avatar if a new one was selected.
   * Disables edit mode afterwards.
   */
  changeUserName() {
    this.validateName();
    if (this.nameError !== null || this.editedUsername.trim() === '') {
      return;
    }
    const inputName = this.editedUsername.trim();
    if (this.sessionData) {
      this.userService.updateUserName(this.sessionData, inputName).catch((err) => console.error(err));
      if (this.selectedAvatar) {
        this.userService.updateUserAvatar(this.sessionData, this.selectedAvatar).catch((err) => console.error(err));
        this.originalAvatar = this.selectedAvatar; 
      }
    }
    this.username = inputName;
    this.edit = false;
    this.toggleProfileMenu = !this.toggleProfileMenu;
  }
}
