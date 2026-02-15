import {
  Component,
  ElementRef,
  EventEmitter,
  OnInit,
  Input,
  Output,
  ViewChild,
  SimpleChanges,
  input,
} from '@angular/core';
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
import { BroadcastRecipient } from "../../core/type/recipient";

@Component({
  selector: 'app-channels',
  standalone: true,
  imports: [NgForOf, NgClass, StopPropagationDirective, NgIf, FormsModule],
  templateUrl: './channels.component.html',
  styleUrl: './channels.component.scss',
})
export class ChannelsComponent extends MessageSearchBase implements OnInit {
  @Output() partnerSelected = new EventEmitter<User>();
  @Output() toggleRequest = new EventEmitter<boolean>();
  @Output() channelsMenu = new EventEmitter<void>();
  @Output() broadcast = new EventEmitter<void>();

  @Input() users: any[] = [];
  @Input() channels: any[] = [];

  @Input() selectedPartner: User | null = null;

  @ViewChild('inputEl')
  inputEl!: ElementRef<HTMLInputElement>;

  selectedChannelUsers: any[] = [];
  foundIndexes: number[] = [];
  channelUsers: any[] = [];
  userAtIndex: any = {};

  isUserAbsent: boolean = false;
  inputFocused: boolean = false;
  channelsNone: boolean = false;
  switchOverlay: boolean = false;
  nameInputValue: boolean = false;
  overlayActivated: boolean = false;
  directMessagesNone: boolean = false;
  directMessagesShown: boolean = true;
  channelsShown: boolean = true;
  wasEmpty: boolean = true;

  newChannel: string = '';
  inputValue: string = '';
  newChannelMobile: string = '';
  newChannelDescription: string = '';
  newChannelDescriptionMobile: string = '';
  selectedValue: string = 'all-members';

  constructor(
    chatService: ChatService,
    authService: AuthService,
    private idleTracker: IdleTrackerService
  ) {
    super(chatService, authService);
  }

  ngOnInit(): void {
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
   getUserId() {
    return this.authService.readCurrentUser();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['users'] && changes['users'].currentValue) {
      this.channelUsers = changes['users'].currentValue.map((u: User) => ({ ...u }));
    }
  }

  async emitPartner(partnerUid: string | undefined) {
    if (!partnerUid) return;
    if (window.innerWidth < 768) this.channelsMenu.emit();
    let whisperUid = this.getPartnerUidFromWhisper(partnerUid, this.authService.readCurrentUser());
    const partnerObj: User = this.users.find((user) => user.uid === whisperUid);
    this.partnerSelected.emit(partnerObj);
    this.toggleRequest.emit(true);
  }

  async addMembers() {
    const usersToAdd = this.selectedValue !== 'all-members' ? this.selectedChannelUsers : this.users;
    const newUids = usersToAdd
      .filter(user => !user?.guest)
      .map(user => ({ uid: user?.uid, name: user?.name }))
      .filter(uidObj => uidObj.uid && !this.chatService.pendingUsers.some(u => u.uid === uidObj.uid));
    await this.chatService.searchUsers(this.chatService.currentChannelID);
    this.chatService.pendingUsers.push(...newUids);
    await this.chatService.addUsers(
      this.chatService.currentChannelID, this.chatService.pendingUsers,
      this.authService.readCurrentUser(), {user: " hat den Kanal betreten.", system: true, timestamp: Date.now()}
    );
    this.chatService.pendingUsers = [];
    this.inputValue = '';
    this.selectedChannelUsers = [];
    this.channelUsers = [];
    this.channelUsers = [...this.users];
  }

  swapChannel(id: any, name: string, description: string, creator: string) {
    if (window.innerWidth < 768) this.channelsMenu.emit();
    this.chatService.destroy$.next();
    this.chatService.destroy$.complete();
    this.chatService.destroy$ = new Subject<void>();

    this.chatService.currentChannelID = id;
    this.chatService.setCurrentChat(id, name, description, creator);
    this.toggleRequest.emit(false);
  }

  openBroadcast() {
    this.broadcast.emit();
  }

  toggleDirectMessages() {
    this.directMessagesShown = !this.directMessagesShown;
    this.directMessagesNone = false;
    if (!this.directMessagesShown) {
      setTimeout(() => {
        this.directMessagesNone = true;
      }, 300);
    }
  }

  toggleChannels() {
    this.channelsShown = !this.channelsShown;
    this.channelsNone = false;
    if (!this.channelsShown) {
      setTimeout(() => {
        this.channelsNone = true;
      }, 10);
    }
  }

  toggleOverlay() {
    this.overlayActivated = !this.overlayActivated;
    this.newChannel = '';
    this.newChannelMobile = '';
    this.newChannelDescription = '';
    this.selectedChannelUsers = [];
    this.switchOverlay = false;
  }

  onChange(event: Event) {
    let target = event.target as HTMLInputElement;

    if (target.value == 'all-members') {
      this.selectedValue = 'all-members';
      this.inputValue = '';
      this.nameInputValue = false;
      this.foundIndexes = [];
    } else if (target.value == 'specific-members') {
      this.selectedValue = 'specific-members';
    }
  }

  onInputChange(value: string) {
    if (this.isEmpty(value)) {
      this.resetSearch();
      return;
    }
    this.handleSearchStart(value);
    this.filterUsers(value);
  }

  addUserToChannel(index: number) {
    let memberInputREF = document.getElementById(
      'member-input'
    ) as HTMLInputElement;
    this.userAtIndex = this.channelUsers[index];
    this.selectedChannelUsers.push(this.userAtIndex);
    this.channelUsers.splice(index, 1);
    this.nameInputValue = false;
    memberInputREF.value = '';
    this.inputValue = '';
  }

  onDivClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (target === event.currentTarget) {
      this.inputEl.nativeElement.focus();
    }
  }

  deleteMember(index: number) {
    this.userAtIndex = this.selectedChannelUsers[index];
    this.channelUsers.push(this.userAtIndex);
    this.selectedChannelUsers.splice(index, 1);
  }

  onFocus() {
    this.inputFocused = true;
  }

  onBlur() {
    this.inputFocused = false;
  }

  createNewChannel() {
    if (this.newChannel.length > 0) {
      const currentUid = this.authService.readCurrentUser();
      const currentUser = this.users.find((user) => user.uid === currentUid);

      this.chatService.createChannel({
          creator: currentUser.name, description: this.newChannelDescription,
          name: this.newChannel, users: [currentUser.uid],
        }).then(() => {
          this.newChannelDescription = '';
          this.newChannel = '';
        });
    }
  }

  createNewChannelMobile() {
    if (this.newChannelMobile.length > 0) {
      const currentUid = this.authService.readCurrentUser();
      const currentUser = this.users.find((user) => user.uid === currentUid);

      this.chatService.createChannel({
          creator: currentUser.name, description: this.newChannelDescriptionMobile,
          name: this.newChannelMobile, users: [currentUser.uid],
        }).then(() => {});
    }
  }

  isSelected(channel: any): boolean {
    return this.chatService.currentChannelID === channel.id;
  }

  isSelectedUser(user: any): boolean {
    return this.selectedPartner?.uid === user.uid;
  }

  private isEmpty(value: string): boolean {
    return value.trim().length === 0;
  }

  private resetSearch() {
    this.wasEmpty = true;
    this.nameInputValue = false;
    this.foundIndexes = [];
    this.hideSearchResults();
  }

  private handleSearchStart(value: string) {
    const trimmed = value.trim();

    if (this.wasEmpty) {
      this.searchBar(trimmed);
      this.wasEmpty = false;
    }
  }

  private filterUsers(value: string) {
    const term = value.toLowerCase();

    this.foundIndexes = this.channelUsers
      .map((user, index) => user?.name?.toLowerCase().includes(term) ? index : -1)
      .filter(index => index !== -1);

    this.nameInputValue = this.foundIndexes.length > 0;
  }

  searchBar(value: string) {
    const searchResultsContacts = document.getElementById('search-results-contacts-2');
    const searchResultsChannels = document.getElementById('search-results-channels-2');
    if (value === '@') {
      searchResultsContacts?.classList.remove('no-display');
    } else if (value === '#') {
      searchResultsChannels?.classList.remove('no-display');
    }
  }

  openFoundMessage(result: GlobalSearchResult) {
    const searchResults = document.getElementById('search-results-2');
    searchResults?.classList.add('no-display');

    if (result.channelId || result.type === 'channel') {
      this.openChannelResult(result).then();
    } else {
      this.openWhisperResult(result).then();
    }
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

  get filteredUsers() {
    const isUserSearch = this.recipientInput.startsWith('@');
    const isChannelSearch = this.recipientInput.startsWith('#');
    const isEmailSearch = !isUserSearch && !isChannelSearch && this.recipientInput.length > 0;

    if (!isUserSearch && !isEmailSearch) return [];

    const usedPartnerChats = new Set(this.recipient.filter(this.isUserRecipient).map(r => r.partnerChat));

    return this.users.filter(user => !this.isAlreadyAdded(user, usedPartnerChats))
      .filter(user => this.isUserMatch(user, isUserSearch, isEmailSearch, this.recipientInput))
      .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
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

  get filteredChannels() {
    if (!this.recipientInput.startsWith('#')) return [];
    const usedChannelIds = new Set(this.recipient.filter(this.isChannelRecipient).map(r => r.channelId));
    let filtered = this.channels.filter(channel => !usedChannelIds.has(channel.id));
    let term = this.searchTerm;
    if (term) filtered = filtered.filter(channel => channel.name.toLowerCase().includes(term));
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }

  isUserRecipient(r: BroadcastRecipient): r is Extract<BroadcastRecipient, { type: 'user' }> {
    return r.type === 'user';
  }

  isChannelRecipient(r: BroadcastRecipient): r is Extract<BroadcastRecipient, { type: 'channel' }> {
    return r.type === 'channel';
  }

  scrollToMessage(messageId: string) {
    setTimeout(() => {
      const el = document.querySelector(`[data-message-id="${messageId}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('highlight');
        setTimeout(() => el.classList.remove('highlight'), 2000);
      }
    }, 300);
  }
}
