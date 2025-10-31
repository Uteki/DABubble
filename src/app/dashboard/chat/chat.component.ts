import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnInit,
  Output,
  ViewChild,
  HostBinding,
  ChangeDetectorRef,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe, NgClass, NgForOf, NgIf } from '@angular/common';
import { ChatService } from '../../chat.service';
import {
  addDoc,
  collection,
  Firestore,
  getDocs,
  updateDoc,
} from '@angular/fire/firestore';
import { distinctUntilChanged, filter, map, switchMap } from 'rxjs';
import { doc } from 'firebase/firestore';
import { AuthService } from '../../auth.service';
import { User } from '../../core/interfaces/user';
import { StopPropagationDirective } from '../../stop-propagation.directive';
import { SidebarService } from './../../sidebar.service';

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

  @Output() toggleRequest = new EventEmitter<boolean>();
  @Output() threadSelected = new EventEmitter<string>();
  @ViewChild('channelEdit') channelEdit!: ElementRef;
  @Input() users: any[] = [];

  messages: any[] = [];
  messageText = '';
  currentChat = '';
  today = new Date();

  overlayActivated = false;
  channelOverlay = false;
  viewMemberOverlay = false;
  addMemberOverlay = false;
  switchAddMemberOverlay = false;
  editChannelName = false;
  editDescription = false;

  channelFounder = 'user[0]';
  channelName = '';
  channelDesc = '';

  @HostBinding('class.sidebar-closed')
  get sidebarClosed(): boolean {
    return !this.sidebarService.isOpen();
  }

  constructor(
    private chatService: ChatService,
    private cd: ChangeDetectorRef,
    private firestore: Firestore,
    private authService: AuthService,
    private sidebarService: SidebarService
  ) {}

  ngOnInit(): void {
    this.chatService.currentChat$
      .pipe(
        distinctUntilChanged(),
        filter((chat) => !!chat && chat.trim() !== ''),
        switchMap((chat) => this.chatService.getMessages(chat)),
        map((messages) => messages.sort((a, b) => a.timestamp - b.timestamp))
      )
      .subscribe((sortedMessages) => {
        this.messages = sortedMessages;
        this.currentChat = this.chatService.currentChat;
        this.cd.detectChanges();
      });
  }

  requestToggleThread(open: boolean) {
    this.toggleRequest.emit(open);
  }

  async sendMessage() {
    const logger: User | undefined = this.users.find(
      (user) => user.uid === this.authService.readCurrentUser()
    );
    if (!logger || !this.messageText.trim()) return;

    await this.chatService.sendMessage(this.chatService.currentChannel, {
      uid: logger.uid,
      text: this.messageText,
      user: logger.name,
      timestamp: Date.now(),
    });

    this.messageText = '';
  }

  async openThread(threadId: string, message: any) {
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

  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent) {
    if (
      this.editChannelName &&
      this.channelEdit &&
      !this.channelEdit.nativeElement.contains(event.target)
    ) {
      this.editChannelName = false;
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

  saveEditedName() {
    if (this.editChannelName) {
      const newName = this.channelName.trim();
      if (!newName) return;

      this.updateChannelName(this.chatService.currentChannel, newName);
    } else {
      this.channelName = this.currentChat;
    }

    this.editChannelName = !this.editChannelName;
  }

  overlayFunction(
    darkOverlay: boolean,
    overlay: string,
    overlayBoolean: boolean
  ) {
    this.overlayActivated = darkOverlay;
    this.cd.detectChanges();
    if (overlay === 'Entwicklung') {
      this.channelOverlay = overlayBoolean;
    } else if (overlay === 'Mitglieder') {
      this.viewMemberOverlay = overlayBoolean;
    } else if (overlay === 'Hinzufügen') {
      this.addMemberOverlay = overlayBoolean;
    }
  }

  saveEditedComment() {
    this.editDescription = !this.editDescription;
  }
}
