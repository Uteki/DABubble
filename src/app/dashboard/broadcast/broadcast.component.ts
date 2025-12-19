import {
  Component,
  EventEmitter,
  Input,
  OnChanges, OnInit,
  Output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../chat.service';
import { DatePipe, NgClass, NgForOf, NgIf } from '@angular/common';
import { User } from '../../core/interfaces/user';
import { BroadcastRecipient } from '../../core/type/recipient';
import { ReactionsComponent } from './../../shared/reactions/reactions.component';
import { AuthService } from '../../auth.service';

type ReactionsMap = Record<string, string[]>;

interface Message {
  id?: string;
  uid: string;
  user?: string;
  text: string;
  timestamp: number;
  reactions?: ReactionsMap;
}

@Component({
  selector: 'app-broadcast',
  standalone: true,
  imports: [FormsModule, DatePipe, NgForOf, NgIf, NgClass, ReactionsComponent],
  templateUrl: './broadcast.component.html',
  styleUrl: './broadcast.component.scss',
})
export class BroadcastComponent {
  @Output() toggleRequest = new EventEmitter<boolean>();

  @Input() messageId!: string | null;

  @Input() users: any[] = [];
  @Input() channels: any[] = [];

  today = new Date();
  messageText: string = '';

  rootMessage: Message | null = null;

  sendingState: 'idle' | 'loading' | 'success' = 'idle';
  recipients: BroadcastRecipient[] = [];

  messages: Message[] = [];

  showPicker = false;
  pickerEmojis = ['😀', '👍', '🎉', '❤️', '😊', '🙏', '🚀', '🤔', '😅', '🔥'];

  private wasEmpty = true;

  public Object = Object;

  constructor(
    private chatService: ChatService,
    private authService: AuthService
  ) {}

  get meId() {
    return this.authService.readCurrentUser();
  }

  get filteredUsers() {
    const usedPartnerChats = new Set(
      this.recipients
        .filter(this.isUserRecipient)
        .map(r => r.partnerChat)
    );

    return this.users.filter(user => {
      const partnerChat = this.buildPartnerChat(user.uid);
      return !usedPartnerChats.has(partnerChat);
    });
  }

  get filteredChannels() {
    const usedChannelIds = new Set(
      this.recipients
        .filter(this.isChannelRecipient)
        .map(r => r.channelId)
    );

    return this.channels.filter(
      channel => !usedChannelIds.has(channel.id)
    );
  }

  insertEmojiIntoText(e: string) {
    this.messageText = (this.messageText || '') + e;
  }

  async sendBroadcastMessage() {
    const logger: User = this.users.find((user) => user.uid === this.authService.readCurrentUser());
    if (!this.messageText.trim() || this.recipients.length === 0) return;
    this.sendingState = 'loading';

    await this.chatService.sendBroadcastMessage(this.recipients, {
      uid: logger.uid, text: this.messageText, user: logger.name, timestamp: Date.now(), reaction: {},
    });

    this.sendingState = 'success';
    this.messageText = '';

    setTimeout(() => {
      this.sendingState = 'idle';
    }, 2000);
  }

  private buildPartnerChat(uid: string): string {
    return [uid, this.authService.readCurrentUser()].sort().join('_');
  }

  removeRecipient(index: number) {
    this.recipients.splice(index, 1);
  }

  addRecipient(userid: string, name: string, mail: string, avatar: string) {
    const partnerChat = this.buildPartnerChat(userid);

    if (
      this.recipients.some(
        r => r.type === 'user' && r.partnerChat === partnerChat
      )
    ) return;

    this.recipients.push({
      type: 'user', partnerChat,
      name: name, mail: mail,
      avatar: avatar
    });
  }

  addChannelRecipient(channelId: string, name: string) {
    if (
      this.recipients.some(
        r => r.type === 'channel' && r.channelId === channelId
      )
    ) return;

    this.recipients.push({
      type: 'channel',
      channelId, name
    });
  }

  isUserRecipient(r: BroadcastRecipient): r is Extract<BroadcastRecipient, { type: 'user' }> {
    return r.type === 'user';
  }

  isChannelRecipient(r: BroadcastRecipient): r is Extract<BroadcastRecipient, { type: 'channel' }> {
    return r.type === 'channel';
  }

  onInputChange(value: string) {
    const searchResultsContacts = document.getElementById(
      'search-broadcast-contacts'
    );
    const searchResultsChannels = document.getElementById(
      'search-broadcast-channels'
    );
    if (this.wasEmpty && value.length > 0) {
      this.searchBar(value);
      this.wasEmpty = false;
    }
    if (value.length === 0) {
      this.wasEmpty = true;
      searchResultsContacts?.classList.add('no-display');
      searchResultsChannels?.classList.add('no-display');
    }
  }

   searchBar(value: string) {
    console.log(value);
    const searchResultsContacts = document.getElementById(
      'search-broadcast-contacts'
    );
    const searchResultsChannels = document.getElementById(
      'search-broadcast-channels'
    );
     if (value && (value.startsWith('@') || /^[a-zA-Z]/.test(value))) {
       searchResultsContacts?.classList.remove('no-display');
     } else {
       searchResultsContacts?.classList.add('no-display');
     }
     if (value && value.startsWith('#')) {
       searchResultsChannels?.classList.remove('no-display');
     } else {
       searchResultsChannels?.classList.add('no-display');
     }
  }
}
