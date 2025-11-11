import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnInit,
  Output,
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
import { distinctUntilChanged, filter, map, switchMap } from 'rxjs';
import { doc } from 'firebase/firestore';
import { AuthService } from '../../auth.service';
import { User } from '../../core/interfaces/user';
import { ReactionsComponent } from './../../shared/reactions/reactions.component';

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
    ReactionsComponent,
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
  editChannelName: boolean = false;
  editDescription: boolean = false;
  showPicker = false;

  channelDescription: string = '';
  channelFounder: string = '';
  channelName: string = '';

  public Object = Object;

  constructor(
    private chatService: ChatService,
    private cd: ChangeDetectorRef,
    private firestore: Firestore,
    private authService: AuthService
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

        this.channelDescription = this.chatService.currentDescription;
        this.channelFounder = this.chatService.currentCreator;
      });
  }

  async sendMessage() {
    const logger: User = this.users.find(
      (user) => user.uid === this.authService.readCurrentUser()
    );
    if (!this.messageText.trim()) return;

    await this.chatService.sendMessage(this.chatService.currentChannel, {
      uid: logger.uid,
      text: this.messageText,
      user: logger.name,
      timestamp: Date.now(),
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
}
