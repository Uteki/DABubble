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
  @Output() partnerSelected = new EventEmitter<User>();
  @Output() threadSelected = new EventEmitter<string>();
  @Output() toggleRequest = new EventEmitter<boolean>();
  @Output() toggleRequestDirect = new EventEmitter<boolean>();

  @ViewChild('channelEdit') channelEdit!: ElementRef;

  @Input() users: any[] = [];
  @Input() channels: any[] = [];

  inputValue: string = '';
  currentChat: string = '';
  today = new Date();

  userInChannel: boolean = false;
  editChannelName: boolean = false;
  editDescription: boolean = false;
  wasEmpty: boolean = true;
  selectedChannelUsers: any[] = [];
  channelUsers: any[] = [];
  userAtIndex: any = {};

  foundIndexes: number[] = [];
  currentMemberIndices: number[] = [];
  missingIndices: number[] = [];
  nameInputValue: boolean = false;
  channelDescription: string = '';
  channelFounder: string = '';
  channelName: string = '';
  public Object = Object;

  constructor(
    public chatOverlay: ChatOverlayService,
    private chatService: ChatService,
    private cd: ChangeDetectorRef,
    private firestore: Firestore,
    private authService: AuthService,
    private mentionService: MentionService,
    protected chatController: ChatControllerService
  ) {}

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

  ngOnChanges(changes: SimpleChanges) {
    if (changes['users'] && changes['users'].currentValue) {
      this.channelUsers = changes['users'].currentValue.map((u: User) => ({...u,}));
    }
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (this.chatController.editMessageMenuOpen && !target.closest('.edit-message-menu') && !target.closest('.more-vert-button')) this.chatController.editMessageMenuOpen = null
    if (this.editChannelName && this.channelEdit && !this.channelEdit.nativeElement.contains(event.target)) {
      this.editChannelName = false;
    } else if (this.editDescription && this.channelEdit && !this.channelEdit.nativeElement.contains(event.target)) this.editDescription = false
  }

  @HostListener('click', ['$event'])
  onMessageClick(event: MouseEvent) { this.mentionService.mentionClick(event, this.users) }

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

  async openThread(threadId: string, message: any) {
    this.toggleRequest.emit(true);
    this.threadSelected.emit(threadId);
    const threadRef = collection(this.firestore, `channels/${this.chatService.currentChannel}/messages/${threadId}/thread`);
    const snapshot = await getDocs(threadRef);
    if (!snapshot.empty) return;
    return addDoc(threadRef, {...message, timestamp: message.timestamp || Date.now(),});
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

  async checkMeta(channel: any): Promise<void> {
    this.currentChat = channel.name;
    this.channelName = channel.name;
    this.channelDescription = channel.description;
    this.channelFounder = channel.creator;
    await this.checkMembership();
    this.cd.detectChanges();
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

  async checkMembership(): Promise<boolean> {
    const uid = this.authService.readCurrentUser();
    await this.chatService.searchUsers(this.chatService.currentChannel);
    const isMember = this.chatService.pendingUsers.some((u) => (u?.uid ?? u) === uid);
    this.userInChannel = isMember;
    this.chatService.pendingUsers = [];
    return isMember;
  }

  getProfilePic(uid: string) { return (this.users.find((user) => user.uid === uid)?.avatar || 'assets/avatars/profile.png') }
  getUserId() { return this.authService.readCurrentUser() }

  filterMembersInChannel() {
    this.missingIndices = this.users.map((user, index) =>
      this.chatService.usersInChannel.includes(user.uid) ? -1 : index
    ).filter((index) => index !== -1);
    this.currentMemberIndices = this.users.map((user, index) =>
      this.chatService.usersInChannel.includes(user.uid) ? index : -1
    ).filter((index) => index !== -1);
  }

  emitPartner(partnerUid: string) {
    const partnerObj: User = this.users.find((user) => user.uid === partnerUid);
    this.chatOverlay.clickedUser = partnerObj;
    this.partnerSelected.emit(partnerObj);
    this.toggleRequestDirect.emit(true);
  }

  resetSubscriptions(): void {
    this.chatService.destroy$.next();
    this.chatService.destroy$.complete();
    this.chatService.destroy$ = new Subject<void>();
  }

  saveEditedName() {
    if (this.editChannelName) {
      const newName = this.channelName.trim();
      if (!newName) return;
      this.updateChannelName(this.chatService.currentChannel, newName).then(() => {});
    } else { this.channelName = this.currentChat }
    this.editChannelName = !this.editChannelName;
  }

  saveEditedComment() {
    if (this.editDescription) {
      const newDesc = this.channelDescription.trim();
      if (!newDesc) return;
      this.updateChannelDescription(this.chatService.currentChannel, newDesc).then(() => {});
    } this.editDescription = !this.editDescription;
  }

  addUserToChannel(index: number) {
    let memberInputREF = document.getElementById('member-input') as HTMLInputElement;
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
      this.foundIndexes = this.channelUsers.map((user, index) =>
          user?.name && user.name.toLowerCase().includes(value.toLowerCase()) && !this.currentMemberIndices.includes(index) ? index : -1
        ).filter((index) => index !== -1);
      this.nameInputValue = this.foundIndexes.length > 0;
    } else {
      this.nameInputValue = false;
      this.foundIndexes = [];
    }
  }

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

  clearSelectedUsers() {
    this.selectedChannelUsers = [];
    this.channelUsers = []; this.channelUsers = [...this.users]
    this.chatOverlay.closeAllOverlays();
    this.inputValue = ''; this.channelName = ''
    this.selectedChannelUsers = [];
  }
}
