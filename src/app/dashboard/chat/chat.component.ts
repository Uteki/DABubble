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
import { distinctUntilChanged, filter, map, switchMap, takeUntil } from 'rxjs';
import { doc } from 'firebase/firestore';
import { AuthService } from '../../auth.service';
import { User } from '../../core/interfaces/user';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [
    FormsModule,
    NgClass,
    StopPropagationDirective,
    NgForOf,
    NgIf,
    DatePipe,
  ],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.scss',
})
export class ChatComponent implements OnInit {
  @Output() threadSelected = new EventEmitter<string>();
  @Output() toggleRequest = new EventEmitter<boolean>();

  @ViewChild('channelEdit') channelEdit!: ElementRef;
  @Input() users: any[] = [];

  messages: any[] = [];
  messageText: string = '';
  currentChat: string = '';
  today = new Date();

  overlayActivated: boolean = false;
  channelOverlay: boolean = false;
  viewMemberOverlay: boolean = false;
  addMemberOverlay: boolean = false;
  switchAddMemberOverlay: boolean = false;
  profileOverlay: boolean = false;
  editChannelName: boolean = false;
  editDescription: boolean = false;
  wasEmpty: boolean = true;
  inputFocused: boolean = false;
  selectedChannelUsers: any[] = [];
  channelUsers: any[] = [];
  userAtIndex: any = {};


  foundIndexes: number[] = [];
  nameInputValue: boolean = false;

  channelDescription: string = '';
  channelFounder: string = '';
  channelName: string = '';

  constructor(
    private chatService: ChatService,
    private cd: ChangeDetectorRef,
    private firestore: Firestore,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.chatService.currentChat$.pipe(
        distinctUntilChanged(),
        filter(chat => !!chat && chat.trim() !== ''),
        switchMap(chat => {
          this.messages = this.chatService.getCachedMessages(chat) || []; this.currentChat = this.chatService.currentChat
          this.channelDescription = this.chatService.currentDescription; this.channelFounder = this.chatService.currentCreator
          this.cd.detectChanges();
          return this.chatService.getMessages(chat).pipe(
            map(messages => messages.sort((a, b) => a.timestamp - b.timestamp)),
            takeUntil(this.chatService.destroy$)
          );
        })
      ).subscribe(messages => { this.messages = messages; this.cd.detectChanges()});
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['users'] && changes['users'].currentValue) {
      this.channelUsers = changes['users'].currentValue.map((u: User) => ({
        ...u,
      }));
    }
  }

  async sendMessage() {
    const currentUserId = this.authService.readCurrentUser();
    const logger: User = this.users.find(user => user.uid === currentUserId);
    if (!logger) return
    if (!this.messageText.trim()) return
    await this.chatService.searchUsers(this.chatService.currentChannel)
    const isMember = this.chatService.pendingUsers.includes(currentUserId);
    if (!isMember) {
      this.messages.push({
        uid: logger.uid, text: '⚠️ Sie können in diesem Kanal keine Nachrichten mehr senden.',
        user: logger.name, timestamp: Date.now()
      }); return;
    }
    await this.sendMessageExtension(logger)
  }

  async sendMessageExtension(logger: any) {
    await this.chatService.sendMessage(this.chatService.currentChannel, {
      uid: logger.uid, text: this.messageText,
      user: logger.name, timestamp: Date.now(),
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
      //TODO ?
    }
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
    if (this.chatService.pendingUsers.length <= 1) {
      //TODO CHANGE
      this.channelDescription = '';
      this.channelFounder = '';
      this.channelName = '';
    }
    this.chatService.destroy$.next();
    this.chatService.destroy$.complete();
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
    } else if (overlay == 'MitgliederWechseln') {
      this.switchAddMemberOverlay = overlayBoolean;
      this.viewMemberOverlay = overlayBoolean;
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
          user?.name && user.name.toLowerCase().includes(value.toLowerCase())
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

  onInputChange(value: string) {
    const searchResultsMembers = document.getElementById('search-chat-members');
    const searchResultsChannels = document.getElementById(
      'search-chat-channels'
    );
    if (this.wasEmpty && value.length > 0) {
      this.chatBar(value);
      this.wasEmpty = false;
    }
    if (value.length === 0) {
      this.wasEmpty = true;
      searchResultsMembers?.classList.add('no-display');
      searchResultsChannels?.classList.add('no-display');
    }
  }

  chatBar(value: string) {
    const searchResultsMembers = document.getElementById('search-chat-members');
    const searchResultsChannels = document.getElementById(
      'search-chat-channels'
    );
    if (value === '@') {
      searchResultsMembers?.classList.remove('no-display');
    } else if (value === '#') {
      searchResultsChannels?.classList.remove('no-display');
    }
  }


  toggleProfile() {

  }

  async addMembersToChannel() {
    const usersToAdd = this.selectedChannelUsers;
    const newUids = usersToAdd
      .filter((user) => !user?.guest).map((user) => ({ uid: user?.uid, name: user?.name }))
      .filter(
        (uidObj) =>
          uidObj.uid &&
          !this.chatService.pendingUsers.some((u) => u.uid === uidObj.uid)
      );
    await this.chatService.searchUsers(this.chatService.currentChannelID);
    this.chatService.pendingUsers.push(...newUids);
    await this.chatService.addUsers(
      this.chatService.currentChannelID, this.chatService.pendingUsers,
      this.authService.readCurrentUser(), {user: " hat den Kanal betreten.", system: true, timestamp: Date.now()});
    this.chatService.pendingUsers = [];
  }
}
