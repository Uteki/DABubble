import { Component, ElementRef, EventEmitter, HostListener, Input, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../chat.service';
import { DatePipe, NgClass, NgForOf, NgIf } from '@angular/common';
import { ChangeDetectorRef } from '@angular/core';
import { StopPropagationDirective } from '../../stop-propagation.directive';
import { addDoc, collection, Firestore, getDocs, updateDoc } from '@angular/fire/firestore';
import { Subject, distinctUntilChanged, filter, map, switchMap, takeUntil, tap } from 'rxjs';
import { doc } from 'firebase/firestore';
import { AuthService } from '../../auth.service';
import { User } from '../../core/interfaces/user';
import { ReactionsComponent } from '../../shared/reactions/reactions.component';
import { AutoScrollDirective } from "../../auto-scroll.directive";
import { LinkifyPipe } from "../../linkify.pipe";
import { MentionService } from "../../mention.service";
import { ChatOverlayService } from "./chat-overlay.service";
import { ChatControllerService } from "./chat-controller.service";

/**
 * ChatComponent
 * Standalone channel chat view that orchestrates:
 * - loading and rendering channel messages for the currently selected chat
 * - channel meta (name/description/creator) and membership state
 * - thread creation/opening for a message
 * - channel management (leave channel, rename, change description, add members)
 * - user interactions (open user profile overlay, direct chat selection)
 * - mention handling in the composer (@ users / # channels) via {@link MentionService}
 * This component delegates:
 * - transient UI overlay state to {@link ChatOverlayService}
 * - message/edit/mention UI state + helper methods to {@link ChatControllerService}
 */
@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [
    FormsModule, NgClass, AutoScrollDirective, StopPropagationDirective, NgForOf, NgIf, DatePipe, ReactionsComponent, LinkifyPipe
  ],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.scss',
  providers: [ChatOverlayService, ChatControllerService]
})
export class ChatComponent implements OnInit {

  /** Emits the selected user when starting/opening a direct message from the chat. */
  @Output() partnerSelected = new EventEmitter<User>();
  /** Emits the thread root message id when a thread view should be opened. */
  @Output() threadSelected = new EventEmitter<string>();
  /** Emits whether the thread pane should be opened/closed (parent controls layout). */
  @Output() toggleRequest = new EventEmitter<boolean>();
  /** Emits whether the direct chat view should be opened (parent controls layout). */
  @Output() toggleRequestDirect = new EventEmitter<boolean>();
  /** Reference to the inline edit container for channel name/description. Used to detect outside clicks and cancel edit mode. */
  @ViewChild('channelEdit') channelEdit!: ElementRef;
  /** All users available in the app (used for avatar lookup, mentions, member selection). */
  @Input() users: any[] = [];
  /** All channels available in the app (used for mention suggestions). */
  @Input() channels: any[] = [];
  /** Date reference used for templates (e.g., day separators). */
  today = new Date();
  /** Current "add member" input value. */
  inputValue: string = '';
  /** Current channel display name (mirrors channel meta). */
  currentChat: string = '';
  /** Editable channel name. */
  channelName: string = '';
  /** Channel creator display name. */
  channelFounder: string = '';
  /** Editable channel description. */
  channelDescription: string = '';
  /** Whether the current user is a member of the active channel. */
  userInChannel: boolean = false;
  /** Edit mode flag for channel name. */
  editChannelName: boolean = false;
  /** Edit mode flag for channel description. */
  editDescription: boolean = false;
  /** Whether the member dropdown should be shown (based on `foundIndexes`). */
  nameInputValue: boolean = false;
  /** Temp storage for a selected user entry (used while adding/removing). */
  userAtIndex: any = {};
  /** Working copy of users (used for member filtering / selection UI). */
  channelUsers: any[] = [];
  /** Users selected to be added to the channel. */
  selectedChannelUsers: any[] = [];
  /** Indices of users matching the "add member" filter input. */
  foundIndexes: number[] = [];
  /** Indices of users not in the channel (eligible to add). */
  missingIndices: number[] = [];
  /** Indices of users currently in the channel. */
  currentMemberIndices: number[] = [];
  /** Exposes `Object` to the template where needed. */
  public Object = Object;

  constructor(
    public chatOverlay: ChatOverlayService, private chatService: ChatService, private cd: ChangeDetectorRef,
    private firestore: Firestore, private authService: AuthService, private mentionService: MentionService,
    protected chatController: ChatControllerService
  ) {}

  /**
   * Subscribes to the currently selected chat stream and keeps messages + meta in sync. Flow:
   * 1) listen to `currentChat$` 2) preload cached messages (fast UI)
   * 3) load channel meta and membership 4) stream messages and sort by timestamp
   * 5) unsubscribe automatically when `chatService.destroy$` emits
   */
  ngOnInit(): void {
    this.chatService.currentChat$.pipe(distinctUntilChanged(), filter((chat) => !!chat && chat.trim() !== ''),
        switchMap((chat) => {
          this.chatController.messages = this.chatService.getCachedMessages(chat) || [];
          return this.chatService.getChannelById(chat).pipe(
            tap((channel) => {
              if (!channel) return;
              this.checkMeta(channel).then();
            }),
            switchMap(() => this.chatService.getMessages(chat).pipe(map((messages) =>
              messages.sort((a, b) => a.timestamp - b.timestamp)))), takeUntil(this.chatService.destroy$)
          );
        })
      ).subscribe(async (messages) => await this.changeMeta(messages));
  }

  /**
   * Updates internal user working list whenever the `users` input changes.
   * @param changes - Angular changes map for inputs.
   */
  ngOnChanges(changes: SimpleChanges) {
    if (changes['users'] && changes['users'].currentValue) {
      this.channelUsers = changes['users'].currentValue.map((u: User) => ({...u,}));
    }
  }

  /**
   * Global document click handler for closing transient UI:
   * - closes the "edit message" context menu if click is outside
   * - exits edit mode for channel name/description when click is outside `channelEdit`
   * @param event - DOM click event
   */
  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (this.chatController.editMessageMenuOpen && !target.closest('.edit-message-menu') && !target.closest('.more-vert-button')) this.chatController.editMessageMenuOpen = null
    if (this.editChannelName && this.channelEdit && !this.channelEdit.nativeElement.contains(event.target)) {
      this.editChannelName = false;
    } else if (this.editDescription && this.channelEdit && !this.channelEdit.nativeElement.contains(event.target)) this.editDescription = false
  }

  /**
   * Delegates mention click handling (e.g., clicking @user in a message) to {@link MentionService}.
   * @param event - DOM click event
   */
  @HostListener('click', ['$event'])
  onMessageClick(event: MouseEvent) { this.mentionService.mentionClick(event, this.users) }

  /**
   * Applies new message list, refreshes channel membership state, and recalculates member indices.
   * @param messages - Sorted list of channel messages.
   */
  async changeMeta(messages: string[]): Promise<void> {
    this.chatController.messages = messages;
    this.cd.detectChanges();
    if (this.chatService.currentChannelID) {
      this.chatService.usersInChannel = [];
      await this.chatService.searchUsers(this.chatService.currentChannelID);
      this.chatService.usersInChannel.push(...this.chatService.pendingUsers);
      this.chatService.pendingUsers = [];
      this.filterMembersInChannel();
    }
  }

  /**
   * Opens/initializes a thread under a message:
   * 1. requests thread pane open 2. emits the thread root id to parent 3. creates an initial thread document if none exists yet
   * @param threadId - Root message id used as thread id.
   * @param message - Root message payload to seed the thread collection.
   */
  async openThread(threadId: string, message: any) {
    this.toggleRequest.emit(true);
    this.threadSelected.emit(threadId);
    const threadRef = collection(this.firestore, `channels/${this.chatService.currentChannel}/messages/${threadId}/thread`);
    const snapshot = await getDocs(threadRef);
    if (!snapshot.empty) return;
    return addDoc(threadRef, {...message, timestamp: message.timestamp || Date.now(),});
  }

  /**
   * Persists a new channel name in Firestore and updates local state.
   * @param channelId - Channel document id.
   * @param newName - New channel name.
   */
  async updateChannelName(channelId: string, newName: string) {
    const channelRef = doc(this.firestore, `channels/${channelId}`);
    this.currentChat = newName;
    await updateDoc(channelRef, { name: newName });
  }

  /**
   * Persists a new channel description in Firestore.
   * @param channelId - Channel document id.
   * @param newDescription - New channel description.
   */
  async updateChannelDescription(channelId: string, newDescription: string) {
    const channelRef = doc(this.firestore, `channels/${channelId}`);
    await updateDoc(channelRef, { description: newDescription });
  }

  /**
   * Loads channel meta into local state and updates membership state.
   * @param channel - Channel object as returned by {@link ChatService.getChannelById}.
   */
  async checkMeta(channel: any): Promise<void> {
    this.currentChat = channel.name; this.channelName = channel.name
    this.channelDescription = channel.description; this.channelFounder = channel.creator
    await this.checkMembership();
    this.cd.detectChanges();
  }

  /**
   * Leaves the current channel and resets subscriptions afterwards. If the channel becomes empty afterwards, falls back to "DALobby".
   */
  async leaveChannel() {
    const currentUserId = this.authService.readCurrentUser();
    const logger: User = this.users.find(user => user.uid === currentUserId);
    await this.chatService.leaveChannel(this.authService.readCurrentUser(), this.chatService.currentChannel, {user: logger.name + " hat den Kanal verlassen.", system: true, timestamp: Date.now()});
    await this.chatService.searchUsers(this.chatService.currentChannel)
    if (this.chatService.pendingUsers.length < 1) { await this.leaveChannelAsLastMember() }
    this.chatService.pendingUsers = [];
    setTimeout(() => this.resetSubscriptions(), 500);
  }

  /**
   * Fallback behavior when the user leaves and no members remain in the channel:
   * switches to the default lobby channel and resets destroy stream.
   */
  async leaveChannelAsLastMember(): Promise<void> {
    await this.checkMeta({ name: "DALobby" });
    this.chatService.destroy$.next();
    this.chatService.destroy$.complete();
    this.chatService.currentChannelID = "DALobby";
    this.chatService.setCurrentChat("DALobby", "", "", "");
  }

  /** Adds selected users to the current channel and clears local selection state. */
  async addMembersToChannel() {
    const usersToAdd = this.selectedChannelUsers;
    const newUids = usersToAdd.filter((user) => !user?.guest).map((user) => ({ uid: user?.uid, name: user?.name }))
      .filter((uidObj) => uidObj.uid && !this.chatService.pendingUsers.some((u) => u.uid === uidObj.uid));
    await this.chatService.searchUsers(this.chatService.currentChannelID);
    this.chatService.pendingUsers.push(...newUids);
    await this.chatService.addUsers(
      this.chatService.currentChannelID, this.chatService.pendingUsers,
      this.authService.readCurrentUser(), { user: ' hat den Kanal betreten.', system: true, timestamp: Date.now() }
    );
    this.chatService.pendingUsers = [];
    this.clearSelectedUsers();
  }

  /**
   * Checks whether the current user is still a member of the active channel. Also updates {@link userInChannel}.
   * @returns `true` if the current user is a member of the channel.
   */
  async checkMembership(): Promise<boolean> {
    const uid = this.authService.readCurrentUser();
    await this.chatService.searchUsers(this.chatService.currentChannel);
    const isMember = this.chatService.pendingUsers.some((u) => (u?.uid ?? u) === uid);
    this.userInChannel = isMember;
    this.chatService.pendingUsers = [];
    return isMember;
  }

  /**
   * Returns a user's avatar url/path or a default placeholder.
   * @param uid - User id to look up.
   */
  getProfilePic(uid: string) { return (this.users.find((user) => user.uid === uid)?.avatar || 'assets/avatars/profile.png') }
  /** Returns the currently authenticated user's uid. */
  getUserId() { return this.authService.readCurrentUser() }

  /**
   * Computes member/non-member indices for `users` based on `chatService.usersInChannel`.
   * Used to drive UI for member lists and "add member" eligibility.
   */
  filterMembersInChannel() {
    this.missingIndices = this.users.map((user, index) =>
      this.chatService.usersInChannel.includes(user.uid) ? -1 : index
    ).filter((index) => index !== -1);
    this.currentMemberIndices = this.users.map((user, index) =>
      this.chatService.usersInChannel.includes(user.uid) ? index : -1
    ).filter((index) => index !== -1);
  }

  /**
   * Starts a direct chat with a selected user:
   * 1. stores clicked user for overlays 2. emits partner selection to parent 3. requests direct chat UI
   * @param partnerUid - User id of the selected partner.
   */
  emitPartner(partnerUid: string) {
    const partnerObj: User = this.users.find((user) => user.uid === partnerUid);
    this.chatOverlay.clickedUser = partnerObj;
    this.partnerSelected.emit(partnerObj); this.toggleRequestDirect.emit(true)
  }

  /**
   * Resets the chat destroy stream to force re-subscribing to Firestore streams. Useful after leaving/switching channels.
   */
  resetSubscriptions(): void {
    this.chatService.destroy$.next(); this.chatService.destroy$.complete()
    this.chatService.destroy$ = new Subject<void>();
  }

  /**
   * Saves (or cancels) inline edit for the channel name.
   * when entering save mode, persists name to Firestore - when canceling, restores display name from {@link currentChat}
   */
  saveEditedName() {
    if (this.editChannelName) {
      const newName = this.channelName.trim();
      if (!newName) return;
      this.updateChannelName(this.chatService.currentChannel, newName).then(() => {});
    } else { this.channelName = this.currentChat }
    this.editChannelName = !this.editChannelName;
  }

  /**
   * Saves (or cancels) inline edit for the channel description. Persists description to Firestore when saving.
   */
  saveEditedComment() {
    if (this.editDescription) {
      const newDesc = this.channelDescription.trim();
      if (!newDesc) return;
      this.updateChannelDescription(this.chatService.currentChannel, newDesc).then(() => {});
    } this.editDescription = !this.editDescription;
  }

  /**
   * Adds a user from the filtered list into `selectedChannelUsers` and removes them from `channelUsers`.
   * @param index - Index in `channelUsers`.
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

  /**
   * Removes a user from `selectedChannelUsers` and adds them back to `channelUsers`.
   * @param index - Index in `selectedChannelUsers`.
   */
  deleteMember(index: number) {
    this.userAtIndex = this.selectedChannelUsers[index];
    this.channelUsers.push(this.userAtIndex); this.selectedChannelUsers.splice(index, 1)
  }

  /**
   * Filters `channelUsers` for the "add member" input and updates suggestion visibility. Excludes users already present in the channel.
   * @param value - Raw input value.
   */
  onMemberInputChange(value: string) {
    if (value.length > 0) {
      this.foundIndexes = this.channelUsers.map((user, index) =>
          user?.name && user.name.toLowerCase().includes(value.toLowerCase()) && !this.currentMemberIndices.includes(index) ? index : -1
        ).filter((index) => index !== -1);
      this.nameInputValue = this.foundIndexes.length > 0;
    } else {
      this.nameInputValue = false; this.foundIndexes = []
    }
  }

  /**
   * Composer input handler for mention suggestions.
   * Resets mention UI and delegates mention filtering to {@link ChatControllerService}.
   * @param value - Current textarea value.
   * @param ev - Optional input event (used to read cursor position).
   */
  onInputChange(value: string, ev?: Event) {
    const textarea = ev?.target as HTMLTextAreaElement;
    const cursor = textarea?.selectionStart ?? value.length;
    this.chatController.resetMentionUI();
    const mention = this.mentionService.parseMention(value, cursor);
    if (!mention) return;
    this.chatController.setActiveMention(mention);
    mention.trigger === '@' ? this.chatController.handleUserMention(mention, this.users)
      : this.chatController.handleChannelMention(mention, this.channels);
  }

  /**
   * Clears selection state after adding members and closes any open overlays. Also resets relevant inputs.
   */
  clearSelectedUsers() {
    this.selectedChannelUsers = [];
    this.channelUsers = []; this.channelUsers = [...this.users]
    this.chatOverlay.closeAllOverlays();
    this.inputValue = ''; this.channelName = ''; this.selectedChannelUsers = []
  }
}
