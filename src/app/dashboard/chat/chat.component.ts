import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../chat.service';
import { DatePipe, NgClass, NgForOf, NgIf } from '@angular/common';
import { ChangeDetectorRef } from '@angular/core';
import { StopPropagationDirective } from '../../stop-propagation.directive';
import {
  addDoc,
  collection,
  Firestore,
  getDocs,
  updateDoc,
} from '@angular/fire/firestore';
import {
  Subject,
  distinctUntilChanged,
  filter,
  map,
  switchMap,
  takeUntil,
  tap,
} from 'rxjs';
import { doc } from 'firebase/firestore';
import { AuthService } from '../../auth.service';
import { User } from '../../core/interfaces/user';
import { ProfileOverlayService } from '../../profile-overlay.service';
import { ReactionsComponent } from './../../shared/reactions/reactions.component';
import { AutoScrollDirective } from "../../auto-scroll.directive";
import { LinkifyPipe } from "../../linkify.pipe";
import {MentionService} from "../../mention.service";

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [
    FormsModule,
    NgClass,
    AutoScrollDirective,
    StopPropagationDirective,
    NgForOf,
    NgIf,
    DatePipe,
    ReactionsComponent,
    LinkifyPipe
  ],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.scss',
})
export class ChatComponent implements OnInit {
  @Output() partnerSelected = new EventEmitter<User>();
  @Output() threadSelected = new EventEmitter<string>();
  @Output() toggleRequest = new EventEmitter<boolean>();
  @Output() toggleRequestDirect = new EventEmitter<boolean>();

  @ViewChild('channelEdit') channelEdit!: ElementRef;

  @Input() users: any[] = [];
  @Input() channels: any[] = [];

  inputValue: string = '';
  messages: any[] = [];
  messageText: string = '';
  currentChat: string = '';
  today = new Date();

  overlayActivated: boolean = false;
  channelOverlay: boolean = false;
  viewMemberOverlay: boolean = false;
  addMemberOverlay: boolean = false;
  viewMemberMobileOverlay: boolean = false;
  viewMemberOverlayMobile: boolean = false;
  switchAddMemberOverlay: boolean = false;
  userInChannel: boolean = false;
  profileOverlay: boolean = false;
  editChannelName: boolean = false;
  editDescription: boolean = false;
  showPicker = false;
  showReactionPicker: { [messageId: string]: boolean } = {};
  addEmojiToMessage: { [messageId: string]: string } = {};
  wasEmpty: boolean = true;
  inputFocused: boolean = false;
  selectedChannelUsers: any[] = [];
  channelUsers: any[] = [];
  filteredUsers: any[] = [];
  filteredChannels: any[] = [];
  userAtIndex: any = {};
  activeMention: { trigger: '@' | '#'; startIndex: number; endIndex: number; } | null = null;

  editMessageMenuOpen: string | null = null;
  editingMessageId: string | null = null;
  editingMessageText: string = '';

  foundIndexes: number[] = [];
  currentMemberIndices: number[] = [];
  missingIndices: number[] = [];
  nameInputValue: boolean = false;

  channelDescription: string = '';
  channelFounder: string = '';
  channelName: string = '';
  editMessageIsOpen: boolean = false;

  public Object = Object;

  clickedUser: any;

  constructor(
    private chatService: ChatService,
    private cd: ChangeDetectorRef,
    private firestore: Firestore,
    private authService: AuthService,
    private profileOverlayService: ProfileOverlayService,
    private mentionService: MentionService
  ) {}

  ngOnInit(): void {
    this.chatService.currentChat$
      .pipe(
        distinctUntilChanged(),
        filter((chat) => !!chat && chat.trim() !== ''),
        switchMap((chat) => {
          this.messages = this.chatService.getCachedMessages(chat) || [];
          return this.chatService.getChannelById(chat).pipe(
            tap((channel) => {
              if (!channel) return;
              this.checkMeta(channel);
            }),
            switchMap(() =>
              this.chatService
                .getMessages(chat)
                .pipe(
                  map((messages) =>
                    messages.sort((a, b) => a.timestamp - b.timestamp)
                  )
                )
            ),
            takeUntil(this.chatService.destroy$)
          );
        })
      )
      .subscribe(async (messages) => await this.changeMeta(messages));
  }

  //TODO              reactions: this.stripEmptyReactions(m.reactions || {}),

  ngOnChanges(changes: SimpleChanges) {
    if (changes['users'] && changes['users'].currentValue) {
      this.channelUsers = changes['users'].currentValue.map((u: User) => ({
        ...u,
      }));
    }
  }

  async changeMeta(messages: string[]): Promise<void> {
    this.messages = messages;
    this.cd.detectChanges();

    if (this.chatService.currentChannelID) {
      this.chatService.usersInChannel = [];
      await this.chatService.searchUsers(this.chatService.currentChannelID);
      this.chatService.usersInChannel.push(...this.chatService.pendingUsers);
      this.chatService.pendingUsers = [];
      this.filterMembersInChannel();
    }
  }

  filterMembersInChannel() {
    this.missingIndices = this.users
      .map((user, index) =>
        this.chatService.usersInChannel.includes(user.uid) ? -1 : index
      )
      .filter((index) => index !== -1);

    this.currentMemberIndices = this.users
      .map((user, index) =>
        this.chatService.usersInChannel.includes(user.uid) ? index : -1
      )
      .filter((index) => index !== -1);
  }

  getLargeAvatar(avatarPath: string | undefined): string {
    if (!avatarPath) return 'assets/avatars/profile.png';
    return avatarPath.replace('avatarSmall', 'avatar');
  }

  emitPartner(partnerUid: string) {
    const partnerObj: User = this.users.find((user) => user.uid === partnerUid);
    this.clickedUser = partnerObj;
    this.partnerSelected.emit(partnerObj);
    this.toggleRequestDirect.emit(true);
  }

  private stripEmptyReactions(
    reactions: Record<string, string[]>
  ): Record<string, string[]> {
    const cleaned: Record<string, string[]> = {};
    for (const key of Object.keys(reactions)) {
      const arr = reactions[key];
      if (Array.isArray(arr) && arr.length > 0) {
        cleaned[key] = arr;
      }
    }
    return cleaned;
  }

  private asciiToEmojiInText(s: string): string {
    if (!s) return s;
    return s
      .replace(/:-?\)/g, '😀')
      .replace(/:-?D/gi, '😃')
      .replace(/;-?\)/g, '😉')
      .replace(/:-?\(/g, '☹️')
      .replace(/:-?P/gi, '😛')
      .replace(/:o/gi, '😮')
      .replace(/:'\(/g, '😢')
      .replace(/\+1/g, '👍')
      .replace(/-1/g, '👎')
      .replace(/<3/g, '❤️');
  }

  async sendMessage() {
    const currentUserId = this.authService.readCurrentUser();
    const logger: User = this.users.find((user) => user.uid === currentUserId);
    if (!logger) return;
    if (!this.messageText.trim()) return;
    await this.chatService.searchUsers(this.chatService.currentChannel);
    const isMember = this.chatService.pendingUsers.includes(currentUserId);
    if (!isMember) {
      this.messages.push({
        uid: logger.uid,
        text: '⚠️ Sie können in diesem Kanal keine Nachrichten mehr senden.',
        user: logger.name,
        timestamp: Date.now(),
      });
      return;
    }
    await this.sendMessageExtension(logger);
  }

  async sendMessageExtension(logger: any) {
    const raw = (this.messageText || '').trim();
    const text = this.asciiToEmojiInText(raw);

    await this.chatService.sendMessage(this.chatService.currentChannel, {
      uid: logger.uid,
      text: text,
      user: logger.name,
      timestamp: Date.now(),
      reaction: {},
    });

    this.messageText = '';
  }

  async openThread(threadId: string, message: any) {
    this.toggleRequest.emit(true);
    this.threadSelected.emit(threadId);

    const threadRef = collection(
      this.firestore,
      `channels/${this.chatService.currentChannel}/messages/${threadId}/thread`
    );

    const snapshot = await getDocs(threadRef);
    if (!snapshot.empty) return;
    return addDoc(threadRef, {
      ...message,
      timestamp: message.timestamp || Date.now(),
    });
  }

  async updateChannelName(channelId: string, newName: string) {
    const channelRef = doc(this.firestore, `channels/${channelId}`);
    this.currentChat = newName;
    await updateDoc(channelRef, { name: newName });
  }

  async updateChannelDescription(channelId: string, newDescription: string) {
    const channelRef = doc(this.firestore, `channels/${channelId}`);
    await updateDoc(channelRef, { description: newDescription });
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;

    if (
      this.editMessageMenuOpen &&
      !target.closest('.edit-message-menu') &&
      !target.closest('.more-vert-button')
    ) {
      this.editMessageMenuOpen = null;
    }

    if (
      this.editChannelName &&
      this.channelEdit &&
      !this.channelEdit.nativeElement.contains(event.target)
    ) {
      this.editChannelName = false;
    } else if (
      this.editDescription &&
      this.channelEdit &&
      !this.channelEdit.nativeElement.contains(event.target)
    ) {
      this.editDescription = false;
    }
  }

  @HostListener('click', ['$event'])
  onMessageClick(event: MouseEvent) {
    this.mentionService.mentionClick(event, this.users)
  }

  async checkMeta(channel: any): Promise<void> {
    this.currentChat = channel.name;
    this.channelName = channel.name;
    this.channelDescription = channel.description;
    this.channelFounder = channel.creator;
    await this.checkMembership();

    this.cd.detectChanges();
  }

  getProfilePic(uid: string) {
    return (
      this.users.find((user) => user.uid === uid)?.avatar ||
      'assets/avatars/profile.png'
    );
  }

  getUserId() {
    return this.authService.readCurrentUser();
  }

  async leaveChannel() {
    const currentUserId = this.authService.readCurrentUser();
    const logger: User = this.users.find(user => user.uid === currentUserId);

    await this.chatService.leaveChannel(this.authService.readCurrentUser(), this.chatService.currentChannel, {user: logger.name + " hat den Kanal verlassen.", system: true, timestamp: Date.now()});

    await this.chatService.searchUsers(this.chatService.currentChannel)
    if (this.chatService.pendingUsers.length < 1) { await this.leaveChannelAsLastMember() }
    this.chatService.pendingUsers = [];

    setTimeout(() => this.resetSubscriptions(), 500);
  }

  async leaveChannelAsLastMember(): Promise<void> {
    await this.checkMeta({ name: "DALobby" });

    this.chatService.destroy$.next();
    this.chatService.destroy$.complete();

    this.chatService.currentChannelID = "DALobby";
    this.chatService.setCurrentChat("DALobby", "", "", "");
  }

  resetSubscriptions(): void {
    this.chatService.destroy$.next();
    this.chatService.destroy$.complete();
    this.chatService.destroy$ = new Subject<void>();
  }

  async checkMembership(): Promise<boolean> {
    const uid = this.authService.readCurrentUser();
    await this.chatService.searchUsers(this.chatService.currentChannel);

    const isMember = this.chatService.pendingUsers.some(
      (u) => (u?.uid ?? u) === uid
    );

    this.userInChannel = isMember;
    this.chatService.pendingUsers = [];
    return isMember;
  }

  saveEditedName() {
    if (this.editChannelName) {
      const newName = this.channelName.trim();
      if (!newName) return;

      this.updateChannelName(this.chatService.currentChannel, newName).then(
        () => {}
      );
    } else {
      this.channelName = this.currentChat;
    }

    this.editChannelName = !this.editChannelName;
  }

  saveEditedComment() {
    if (this.editDescription) {
      const newDesc = this.channelDescription.trim();
      if (!newDesc) return;

      this.updateChannelDescription(
        this.chatService.currentChannel,
        newDesc
      ).then(() => {});
    }

    this.editDescription = !this.editDescription;
  }

  overlayFunction(
    darkOverlay: boolean,
    overlay: string,
    overlayBoolean: boolean
  ) {
    this.overlayActivated = darkOverlay;
    this.cd.detectChanges();
    if (overlay == 'Entwicklung') {
      this.channelOverlay = overlayBoolean;
    } else if (overlay == 'Mitglieder') {
      this.viewMemberOverlay = overlayBoolean;
    } else if (overlay == 'Hinzufügen') {
      this.addMemberOverlay = overlayBoolean;
      this.viewMemberMobileOverlay = overlayBoolean;
    } else if (overlay == 'MitgliederWechseln') {
      this.switchAddMemberOverlay = overlayBoolean;
      this.viewMemberOverlay = overlayBoolean;
      this.viewMemberMobileOverlay = overlayBoolean;
      this.viewMemberOverlayMobile
    }
  }

  onFocus() {
    this.inputFocused = true;
  }

  onBlur() {
    this.inputFocused = false;
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

  deleteMember(index: number) {
    this.userAtIndex = this.selectedChannelUsers[index];
    this.channelUsers.push(this.userAtIndex);
    this.selectedChannelUsers.splice(index, 1);
  }

  onMemberInputChange(value: string) {
    if (value.length > 0) {
      this.foundIndexes = this.channelUsers
        .map((user, index) =>
          user?.name &&
          user.name.toLowerCase().includes(value.toLowerCase()) &&
          !this.currentMemberIndices.includes(index)
            ? index
            : -1
        )
        .filter((index) => index !== -1);

      this.nameInputValue = this.foundIndexes.length > 0;
    } else {
      this.nameInputValue = false;
      this.foundIndexes = [];
    }
  }

  onInputChange(value: string, ev?: Event) {
    const textarea = ev?.target as HTMLTextAreaElement;
    const cursor = textarea?.selectionStart ?? value.length;

    this.resetMentionUI();

    const mention = this.mentionService.parseMention(value, cursor);
    if (!mention) return;

    this.setActiveMention(mention);

    mention.trigger === '@' ? this.handleUserMention(mention) : this.handleChannelMention(mention);
  }

  private resetMentionUI() {
    document.getElementById('search-chat-members')?.classList.add('no-display');

    document.getElementById('search-chat-channels')?.classList.add('no-display');

    this.filteredUsers = [];
    this.filteredChannels = [];
    this.activeMention = null;
  }

  private setActiveMention(mention: any) {
    this.activeMention = { trigger: mention.trigger, startIndex: mention.startIndex, endIndex: mention.endIndex };
  }

  private handleUserMention(mention: any) {
    this.filteredUsers = this.mentionService.filterUsers(mention.query, this.users);

    if (this.filteredUsers.length === 0) return;

    document.getElementById('search-chat-members')?.classList.remove('no-display');
  }

  private handleChannelMention(mention: any) {
    this.filteredChannels = this.mentionService.filterChannels(mention.query, this.channels);

    if (this.filteredChannels.length === 0) return;

    document.getElementById('search-chat-channels')?.classList.remove('no-display');
  }

  insertMention(name: string, textarea: HTMLTextAreaElement) {
    if (!this.activeMention) return;
    const { trigger, startIndex, endIndex } = this.activeMention;
    const before = textarea.value.slice(0, startIndex);
    const after = textarea.value.slice(endIndex);
    const mentionText = `${trigger}${name} `;
    const updatedValue = before + mentionText + after;
    textarea.value = updatedValue;
    this.messageText = updatedValue;
    const newCursor = before.length + mentionText.length;
    textarea.setSelectionRange(newCursor, newCursor);
    textarea.focus();
    this.activeMention = null;
    document.getElementById('search-chat-members')?.classList.add('no-display');
    document.getElementById('search-chat-channels')?.classList.add('no-display');
  }

  toggleProfile() {}

  toggleEditMessageMenu(messageId: string, event: Event) {
    event.stopPropagation();
    if (this.editMessageMenuOpen === messageId) {
      this.editMessageMenuOpen = null;
    } else {
      this.editMessageMenuOpen = messageId;
    }
  }

  keepMenuOpen() {

  }

  editMessage(messageId: string) {
    const message = this.messages.find((m) => m.id === messageId);

    if (!message || message.uid !== this.getUserId()) {
      return;
    }

    this.editingMessageId = messageId;
    this.editingMessageText = message.text;
    this.editMessageMenuOpen = null;
    this.editMessageIsOpen = true;

    const messageElement = document.getElementById('message-text-' + messageId);
    if (messageElement) {
      messageElement.classList.add('hovered-own-message');
    }
  }

  cancelEdit() {
    if (this.editingMessageId) {
      const messageElement = document.getElementById(
        'message-text-' + this.editingMessageId
      );
      if (messageElement) {
        messageElement.classList.remove('hovered-own-message');
      }
    }

    this.editingMessageId = null;
    this.editingMessageText = '';
    this.editMessageIsOpen = false;
  }

  async saveEditedMessage(messageId: string) {
    if (!this.editingMessageText.trim()) return;
    const messageRef = doc(
      this.firestore,
      `channels/${this.chatService.currentChannel}/messages/${messageId}`
    );
    await updateDoc(messageRef, {
      text: this.editingMessageText.trim(),
      edited: true,
    });
    this.cancelEdit();
  }

  openProfile(user: User) {
    if (user.uid === this.getUserId()) {
      this.profileOverlayService.triggerOpenProfile();
    } else {
      this.clickedUser = user;
      this.overlayActivated = true;
      this.profileOverlay = true;
    }
  }

  closeProfile() {
    this.overlayActivated = false;
    this.profileOverlay = false;
  }

  async addMembersToChannel() {
    const usersToAdd = this.selectedChannelUsers;
    const newUids = usersToAdd
      .filter((user) => !user?.guest)
      .map((user) => ({ uid: user?.uid, name: user?.name }))
      .filter(
        (uidObj) =>
          uidObj.uid &&
          !this.chatService.pendingUsers.some((u) => u.uid === uidObj.uid)
      );
    await this.chatService.searchUsers(this.chatService.currentChannelID);
    this.chatService.pendingUsers.push(...newUids);
    await this.chatService.addUsers(
      this.chatService.currentChannelID,
      this.chatService.pendingUsers,
      this.authService.readCurrentUser(),
      { user: ' hat den Kanal betreten.', system: true, timestamp: Date.now() }
    );
    this.chatService.pendingUsers = [];
    this.clearSelectedUsers();
  }

  clearSelectedUsers() {
    this.selectedChannelUsers = [];
    this.channelUsers = [];
    this.channelUsers = [...this.users];
    this.closeAllOverlays();
  }

  closeAllOverlays() {
    this.overlayActivated = false;
    this.channelOverlay = false;
    this.viewMemberOverlay = false;
    this.viewMemberOverlayMobile = false;
    this.addMemberOverlay = false;
    this.switchAddMemberOverlay = false;
    this.inputValue = '';
    this.channelName = '';
    this.selectedChannelUsers = [];
  }

  hoverMessage(messageId: string, messageUid: string, event?: MouseEvent) {
    const messageElement = document.getElementById('message-text-' + messageId);
    if (messageElement && event) {
      const target = event.target as HTMLElement;
      const messageEvent = target.closest('.message-event');

      if (messageEvent) {
        messageElement.classList.remove('hovered-message');
        messageElement.classList.remove('hovered-own-message');
      } else {
        if (messageUid === this.getUserId()) {
          messageElement.classList.add('hovered-own-message');
        } else {
          messageElement.classList.add('hovered-message');
        }
      }
    }
  }

  leaveMessage(messageId: string) {
    const messageElement = document.getElementById('message-text-' + messageId);

    if (messageElement) {
      messageElement.classList.remove('hovered-message');
      messageElement.classList.remove('hovered-own-message');
    }
  }

  get meId() {
    return this.authService.readCurrentUser();
  }

  onReactionToggle(msg: any, ev: { emoji: string; add: boolean }) {
    msg.reactions = msg.reactions ?? {};
    const list: string[] =
      msg.reactions[ev.emoji] ?? (msg.reactions[ev.emoji] = []);
    const i = list.indexOf(this.meId);
    if (ev.add && i === -1) list.push(this.meId);
    if (!ev.add && i !== -1) list.splice(i, 1);
    if (list.length === 0) delete msg.reactions[ev.emoji];
    const channelId = this.chatService.currentChannel;
    if (!channelId || !msg?.id) return;
    this.chatService
      .reactChannelMessage(channelId, msg.id, ev.emoji, ev.add, this.meId)
      .catch(console.error);
  }

  onReactionAdd(msg: any, emoji: string) {
    if (!emoji) return;
    this.onReactionToggle(msg, { emoji, add: true });
  }

  insertEmojiIntoText(emoji: string) {
    const ta = document.getElementById(
      'composer-chat'
    ) as HTMLTextAreaElement | null;
    const v = this.messageText || '';
    if (!ta) {
      this.messageText = v + emoji;
      return;
    }
    const start = ta.selectionStart ?? v.length;
    const end = ta.selectionEnd ?? v.length;
    this.messageText = v.slice(0, start) + emoji + v.slice(end);
    queueMicrotask(() => {
      ta.focus();
      const pos = start + emoji.length;
      ta.setSelectionRange(pos, pos);
    });
  }

  addEmojiToMessageField(emoji: string, messageId?: string) {
    if (messageId) {
      const message = this.messages.find((m) => m.id === messageId);
      if (message) {
        this.onReactionAdd(message, emoji);
      }
    } else {
      this.insertEmojiIntoText(emoji);
    }
  }

  openReactionPicker(msgId: string) {
    this.showReactionPicker[msgId] = true;
  }
}
