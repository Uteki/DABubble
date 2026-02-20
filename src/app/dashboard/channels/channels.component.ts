import { Component, ElementRef, EventEmitter, OnInit, Input, Output, ViewChild, SimpleChanges } from '@angular/core';
import { NgForOf, NgClass, NgIf } from '@angular/common';
import { ChatService } from '../../chat.service';
import { User } from '../../core/interfaces/user';
import { StopPropagationDirective } from '../../stop-propagation.directive';
import { AuthService } from '../../auth.service';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { MessageSearchBase } from "../../core/base/message-search.base";
import { IdleTrackerService } from '../../idle-tracker.service';
import { GlobalSearchResult } from "../../core/interfaces/global-search-result";
import { FilterService } from "../../filter.service";
import { goToMessage, searchThrough } from "./channels.utils";

/**
 * ChannelsComponent
 * Sidebar controller for:
 * - switching between channels and direct messages
 * - creating channels and adding members
 * - handling global search results (channel messages + whispers)
 * - emitting UI events to the parent (open/close menu, open broadcast, toggle direct)
 * Extends {@link MessageSearchBase} to reuse recipient handling + message search helpers.
 */
@Component({
  selector: 'app-channels',
  standalone: true,
  imports: [NgForOf, NgClass, StopPropagationDirective, NgIf, FormsModule],
  templateUrl: './channels.component.html',
  styleUrl: './channels.component.scss',
})
export class ChannelsComponent extends MessageSearchBase implements OnInit {

  /** Emits selected user when a direct chat/whisper is opened. */
  @Output() partnerSelected = new EventEmitter<User>();
  /** Emits whether the parent should show/hide the direct chat area. */
  @Output() toggleRequest = new EventEmitter<boolean>();
  /** Emits when the channels menu should toggle (mobile layout). */
  @Output() channelsMenu = new EventEmitter<void>();
  /** Emits when the broadcast view should open. */
  @Output() broadcast = new EventEmitter<void>();
  /** Full user list for direct messages and member selection. */
  @Input() users: any[] = [];
  /** Full channel list for channel switching and search. */
  @Input() channels: any[] = [];
  /** Currently selected DM partner (used for highlighting in UI). */
  @Input() selectedPartner: User | null = null;
  /** Input element reference used for focusing when clicking empty area. */
  @ViewChild('inputEl') inputEl!: ElementRef<HTMLInputElement>;
  /** Selected members to add when creating/updating a channel. */
  selectedChannelUsers: any[] = [];
  /** Search hit indexes in {@link channelUsers} list (member chooser search). */
  foundIndexes: number[] = [];
  /** Working copy of users used in the member chooser (adds/removes). */
  channelUsers: any[] = [];
  /** Temporary selected user object for add/remove operations. */
  userAtIndex: any = {};
  /** True if user has been idle long enough to be considered away. */
  isUserAbsent = false;
  /** True while the member input is focused (used for UI styling). */
  inputFocused = false;
  /** UI flags for collapse animations. */
  channelsNone = false;
  directMessagesNone = false;
  /** Overlay + UI state for creating channels / switching modes. */
  overlayActivated = false;
  switchOverlay = false;
  /** True when the member input has a valid match list. */
  nameInputValue = false;
  /** Section visibility toggles. */
  directMessagesShown = true; channelsShown = true
  /** Internal flag to detect transition from empty -> non-empty search input. */
  wasEmpty = true;
  /** New channel form state (desktop + mobile). */
  newChannel = ''; newChannelMobile = ''
  newChannelDescription = ''; newChannelDescriptionMobile = ''
  /** Member search input state. */
  inputValue = '';
  /** Current selector mode for adding members. */
  selectedValue: string = 'all-members';

  constructor( chatService: ChatService, authService: AuthService, private idleTracker: IdleTrackerService, private filterService: FilterService )
  { super(chatService, authService) }

  /** Lifecycle: starts idle tracking. */
  ngOnInit(): void { this.trackIdle() }

  /**
   * Lifecycle: syncs the internal member chooser list whenever users input changes.
   * @param changes - Angular changes object
   */
  ngOnChanges(changes: SimpleChanges) {
    if (changes['users'] && changes['users'].currentValue) {
      this.channelUsers = changes['users'].currentValue.map((u: User) => ({ ...u }));
    }
  }

  /**
   * Users filtered for header-style recipient input (delegates to {@link FilterService}).
   * Excludes already-added recipients by partnerChat id.
   */
  get filteredUsers() {
    return this.filterService.getFilteredUsers({
      users: this.users, recipient: this.recipient, recipientInput: this.recipientInput,
      searchTerm: this.searchTerm, buildPartnerChat: (uid) => this.buildPartnerChat(uid),
    });
  }

  /**
   * Channels filtered for header-style recipient input (delegates to {@link FilterService}).
   * Excludes already-added channel recipients.
   */
  get filteredChannels() {
    return this.filterService.getFilteredChannels({
      channels: this.channels, recipient: this.recipient, recipientInput: this.recipientInput, searchTerm: this.searchTerm
    });
  }

  /**
   * Opens a DM partner from a whisper id (uidA_uidB) and requests the parent to show the DM view.
   * Also closes the sidebar on mobile.
   * @param partnerUid - whisper id or partner uid (depending on caller usage)
   */
  async emitPartner(partnerUid: string | undefined) {
    if (!partnerUid) return;
    if (window.innerWidth < 768) this.channelsMenu.emit();
    let whisperUid: string;
    partnerUid === this.getUserId() ?  whisperUid = partnerUid
      : whisperUid = this.getPartnerUidFromWhisper(partnerUid, this.authService.readCurrentUser())
    const partnerObj: User = this.users.find((user) => user.uid === whisperUid);
    this.partnerSelected.emit(partnerObj);
    this.toggleRequest.emit(true);
  }

  /**
   * Adds members to the current channel.
   * - Uses either "all members" or the currently selected users list.
   * - Skips guests and avoids duplicates in pendingUsers and resets UI state after completion.
   */
  async addMembers() {
    const usersToAdd = this.selectedValue !== 'all-members' ? this.selectedChannelUsers : this.users;
    const newUids = usersToAdd.filter(user => !user?.guest)
      .map(user => ({ uid: user?.uid, name: user?.name }))
      .filter(uidObj => uidObj.uid && !this.chatService.pendingUsers.some(u => u.uid === uidObj.uid));
    await this.chatService.searchUsers(this.chatService.currentChannelID);
    this.chatService.pendingUsers.push(...newUids);
    await this.chatService.addUsers(
      this.chatService.currentChannelID, this.chatService.pendingUsers,
      this.authService.readCurrentUser(), {user: " hat den Kanal betreten.", system: true, timestamp: Date.now()}
    );
    this.inputValue = '';
    this.selectedChannelUsers = []; this.chatService.pendingUsers = []
    this.channelUsers = []; this.channelUsers = [...this.users]
  }

  /**
   * Opens a channel message search result:
   * 1. selects the channel 2. requests the parent to close DM view 3. scrolls to the message
   * @param result - global search result pointing to a channel message
   */
  async openChannelResult(result: GlobalSearchResult) {
    const channelId = result.channelId ?? result.nativeId;
    if (channelId != null) this.chatService.currentChannelID = channelId;
    this.toggleRequest.emit(false);
    this.chatService.setCurrentChat(channelId, '', '', '');
    this.scrollToMessage(result.id);
  }

  /**
   * Opens a whisper message search result: 1. opens partner DM 2. scrolls to the message
   * @param result - global search result pointing to a whisper message
   */
  async openWhisperResult(result: GlobalSearchResult) {
    const whisperId = result.whisperId ?? result.nativeId;
    await this.emitPartner(whisperId);
    this.scrollToMessage(result.id);
  }

  /**
   * Switches the active channel and resets any active subscriptions via destroy$. Also closes the sidebar on mobile.
   */
  swapChannel(id: any, name: string, description: string, creator: string) {
    if (window.innerWidth < 768) this.channelsMenu.emit();
    this.chatService.destroy$.next(); this.chatService.destroy$.complete(); this.chatService.destroy$ = new Subject<void>()
    this.chatService.currentChannelID = id; this.chatService.setCurrentChat(id, name, description, creator);
    this.toggleRequest.emit(false);
  }

  /** Opens the broadcast view (and closes sidebar on mobile). */
  openBroadcast() {
    if (window.innerWidth < 768) this.channelsMenu.emit();
    this.broadcast.emit();
  }

  /** Toggles the direct messages section with a delayed "none" flag for animation. */
  toggleDirectMessages() {
    this.directMessagesShown = !this.directMessagesShown;
    this.directMessagesNone = false;
    if (!this.directMessagesShown) {
      setTimeout(() => { this.directMessagesNone = true }, 300);
    }
  }

  /** Toggles the channels section with a delayed "none" flag for animation. */
  toggleChannels() {
    this.channelsShown = !this.channelsShown;
    this.channelsNone = false;
    if (!this.channelsShown) {
      setTimeout(() => { this.channelsNone = true }, 10);
    }
  }

  /** Toggles the create-channel overlay and resets overlay form state. */
  toggleOverlay() {
    this.overlayActivated = !this.overlayActivated;
    this.newChannel = ''; this.newChannelMobile = ''
    this.newChannelDescription = ''; this.selectedChannelUsers = []
    this.switchOverlay = false;
  }

  /**
   * Updates member selection mode ("all-members" vs "specific-members").
   * @param event - native change event from select/radio input
   */
  onChange(event: Event) {
    let target = event.target as HTMLInputElement;
    if (target.value == 'all-members') {
      this.selectedValue = 'all-members'; this.inputValue = ''
      this.nameInputValue = false; this.foundIndexes = []
    } else if (target.value == 'specific-members') {
      this.selectedValue = 'specific-members';
    }
  }

  /**
   * Member input handler for the channel member chooser:
   * 1. resets search if empty 2. shows chooser dropdown on first input 3. collects matching user indexes by name
   */
  onInputChange(value: string) {
    if (this.isEmpty(value)) { this.resetSearch(); return }
    this.handleSearchStart(value); this.filterUsers(value)
  }

  /**
   * Adds a user from the search list into {@link selectedChannelUsers}.
   * @param index - index in {@link channelUsers}
   */
  addUserToChannel(index: number) {
    let memberInputREF = document.getElementById('member-input') as HTMLInputElement;
    this.userAtIndex = this.channelUsers[index];
    this.selectedChannelUsers.push(this.userAtIndex);
    this.channelUsers.splice(index, 1);
    this.nameInputValue = false;
    memberInputREF.value = '';
    this.inputValue = '';
  }

  /** Focuses the input when clicking on the container background (not on child elements). */
  onDivClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (target === event.currentTarget) {
      this.inputEl.nativeElement.focus();
    }
  }

  /**
   * Removes a selected member and places them back into the available list.
   * @param index - index in {@link selectedChannelUsers}
   */
  deleteMember(index: number) {
    this.userAtIndex = this.selectedChannelUsers[index];
    this.channelUsers.push(this.userAtIndex);
    this.selectedChannelUsers.splice(index, 1);
  }

  /** Creates a new channel (desktop form). */
  createNewChannel() {
    const similarNames = this.channels.some( (channel) => { return channel.name.toLowerCase() == this.newChannel.toLowerCase() })
    if (this.newChannel.length > 0 && !similarNames) {
      this.switchOverlay = true;
      const currentUid = this.authService.readCurrentUser();
      const currentUser = this.users.find((user) => user.uid === currentUid);
      this.chatService.createChannel({
        creator: currentUser.name, description: this.newChannelDescription,
        name: this.newChannel, users: [currentUser.uid],
      }).then(() => { this.newChannelDescription = ''; this.newChannel = '' });
    } else { document.querySelector("#creation-warning")?.classList.remove("d-none");
      setTimeout(()=> { document.querySelector("#creation-warning")?.classList.add("d-none") },2000)}
  }

  /** Creates a new channel (mobile form). */
  createNewChannelMobile() {
    const similarNames = this.channels.some( (channel) => { return channel.name.toLowerCase() == this.newChannelMobile.toLowerCase() })
    if (this.newChannelMobile.length > 0 && !similarNames) {
      this.switchOverlay = true;
      const currentUid = this.authService.readCurrentUser();
      const currentUser = this.users.find((user) => user.uid === currentUid);
      this.chatService.createChannel({
        creator: currentUser.name, description: this.newChannelDescriptionMobile,
        name: this.newChannelMobile, users: [currentUser.uid],
      }).then(() => {});
    } else { document.querySelector("#creation-warning-mobile")?.classList.remove("d-none");
      setTimeout(()=> { document.querySelector("#creation-warning-mobile")?.classList.add("d-none") },2000)}
  }

  /**
   * Handles click on a global search result inside the channels sidebar.
   * Delegates to channel/whisper open handlers and hides dropdown first.
   */
  openFoundMessage(result: GlobalSearchResult) {
    const searchResults = document.getElementById('search-results-2');
    searchResults?.classList.add('no-display');
    if (window.innerWidth < 768) this.channelsMenu.emit();
    if (result.channelId || result.type === 'channel') {
      this.openChannelResult(result).then();
    } else { this.openWhisperResult(result).then() }
  }

  /** Returns a channel display name for a channel id (fallback: "Unbekannter Channel"). */
  getChannelName(channelId: string): string {
    const channel = this.channels.find(c => c.id === channelId);
    return channel?.name ?? 'Unbekannter Channel';
  }

  /** Returns whisper partner name from whisperId (fallback: "Unknown user"). */
  getWhisperName(whisperId: string): string {
    let test = this.getPartnerUidFromWhisper(whisperId, this.authService.readCurrentUser());
    const user = this.users.find(u => u.uid === test);
    return user?.name ?? 'Unknown user';
  }

  /** Subscribes to idle state streams and updates {@link isUserAbsent}. */
  trackIdle() {
    this.idleTracker.idleTime$.subscribe(idleTime => {
      this.isUserAbsent = (idleTime / 1000) > 30;
    });
    this.idleTracker.isIdle$.subscribe(isIdle => {
      if (!isIdle) this.isUserAbsent = false;
    });
  }

  /** Adds a user as recipient for message search / mention flows. Resets recipient input after adding. */
  addRecipient(userid: string, name: string, mail: string, avatar: string) {
    const partnerChat = this.buildPartnerChat(userid);
    if (this.recipient.some(r => r.type === 'user' && r.partnerChat === partnerChat)) return
    this.recipient = [{type: 'user', partnerChat, name: name, mail: mail, avatar: avatar}];
    this.recipientInput = "";
    this.onInputChange(this.recipientInput);
  }

  /** Adds a channel as recipient for message search / mention flows. Resets recipient input after adding. */
  addChannelRecipient(channelId: string, name: string) {
    if (this.recipient.some(r => r.type === 'channel' && r.channelId === channelId)) return
    this.recipient = [{type: 'channel', channelId, name}];
    this.recipientInput = "";
    this.onInputChange(this.recipientInput);
  }

  /** Marks the input as focused (UI styling). */
  onFocus() { this.inputFocused = true }
  /** Marks the input as blurred (UI styling). */
  onBlur() { this.inputFocused = false }
  /** Returns the current logged-in user uid. */
  getUserId() { return this.authService.readCurrentUser() }
  /** Clears recipient selection. */
  removeRecipient() { this.recipient = [] }
  /** Scrolls to a message in the chat view and highlights it. */
  scrollToMessage(messageId: string) { goToMessage(messageId) }
  /** True if the given channel is currently selected. */
  isSelected(channel: any): boolean { return this.chatService.currentChannelID === channel.id }
  /** True if the given user is the currently selected DM partner. */
  isSelectedUser(user: any): boolean { return this.selectedPartner?.uid === user.uid }
  /** Shows the appropriate search chooser based on input prefix. Delegates to {@link searchThrough}. */
  searchBar(value: string) { searchThrough(value) }

  /** Returns true if the input is empty/whitespace. */
  private isEmpty(value: string): boolean { return value.trim().length === 0 }

  /** Resets member search UI and hides any search dropdowns. */
  private resetSearch() {
    this.wasEmpty = true; this.nameInputValue = false; this.foundIndexes = []
    this.hideSearchResults();
  }

  /** Triggers chooser UI on first input after being empty. */
  private handleSearchStart(value: string) {
    const trimmed = value.trim();
    if (this.wasEmpty) {
      this.searchBar(trimmed); this.wasEmpty = false
    }
  }

  /** Updates {@link foundIndexes} by matching users by name (case-insensitive). */
  private filterUsers(value: string) {
    const term = value.toLowerCase();
    this.foundIndexes = this.channelUsers.map((user, index) => user?.name?.toLowerCase().includes(term) ? index : -1)
      .filter(index => index !== -1);
    this.nameInputValue = this.foundIndexes.length > 0;
  }
}
