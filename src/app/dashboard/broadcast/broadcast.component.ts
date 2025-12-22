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
  recipientInput = "";

  rootMessage: Message | null = null;

  sendingState: 'idle' | 'loading' | 'success' = 'idle';
  recipients: BroadcastRecipient[] = [];

  messages: Message[] = [];

  showPicker = false;
  inputFocused: boolean = false;
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

  get searchTerm(): string {
    return this.recipientInput
      .replace(/^[@#]/, '')
      .toLowerCase()
      .trim();
  }

  get filteredUsers() {
    const isUserSearch = this.recipientInput.startsWith('@');
    const isChannelSearch = this.recipientInput.startsWith('#');
    const isEmailSearch = !isUserSearch && !isChannelSearch && this.recipientInput.length > 0;

    if (!isUserSearch && !isEmailSearch) return [];

    const usedPartnerChats = new Set(
      this.recipients.filter(this.isUserRecipient).map(r => r.partnerChat)
    );

    return this.users.filter(user => !this.isAlreadyAdded(user, usedPartnerChats))
      .filter(user => this.isUserMatch(user, isUserSearch, isEmailSearch, this.recipientInput))
      .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
  }

  get filteredChannels() {
    if (!this.recipientInput.startsWith('#')) return [];

    const usedChannelIds = new Set(
      this.recipients.filter(this.isChannelRecipient).map(r => r.channelId)
    );
    let filtered = this.channels.filter(channel => !usedChannelIds.has(channel.id));
    let term = this.searchTerm;

    if (term) {
      filtered = filtered.filter(channel => channel.name.toLowerCase().includes(term));
    }
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }

  get recipientPlaceholder(): string {
    if (this.recipients.length > 4) {
      return 'Maximale Anzahl an Empfängern erreicht';
    }
    return 'An: #channel, @jemand oder E-Mail-Adresse';
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

    setTimeout(() => {this.sendingState = 'idle'}, 2000);
  }

  private buildPartnerChat(uid: string): string {
    return [uid, this.authService.readCurrentUser()].sort().join('_');
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

    if (isEmailSearch) {
      return user.email?.toLowerCase().includes(value.toLowerCase());
    }

    return false;
  }

  insertEmojiIntoText(e: string) {
    this.messageText = (this.messageText || '') + e;
  }

  removeRecipient(index: number) {
    this.recipients.splice(index, 1);
  }

  addRecipient(userid: string, name: string, mail: string, avatar: string) {
    const partnerChat = this.buildPartnerChat(userid);

    if (this.recipients.some(r => r.type === 'user' && r.partnerChat === partnerChat)) {
      return;
    }
    else if (this.recipients.length > 4) {
      return;
    }

    this.recipients.push({type: 'user', partnerChat, name: name, mail: mail, avatar: avatar});
    this.recipientInput = "";
    this.onInputChange(this.recipientInput);
  }

  addChannelRecipient(channelId: string, name: string) {
    if (this.recipients.some(r => r.type === 'channel' && r.channelId === channelId)) {
      return;
    }
    else if (this.recipients.length > 4) {
      return;
    }

    this.recipients.push({type: 'channel', channelId, name});
    this.recipientInput = "";
    this.onInputChange(this.recipientInput);
  }

  isUserRecipient(r: BroadcastRecipient): r is Extract<BroadcastRecipient, { type: 'user' }> {
    return r.type === 'user';
  }

  isChannelRecipient(r: BroadcastRecipient): r is Extract<BroadcastRecipient, { type: 'channel' }> {
    return r.type === 'channel';
  }

  onInputChange(value: string) {
    const contacts = document.getElementById('search-broadcast-contacts');
    const channels = document.getElementById('search-broadcast-channels');

    const isUser = value.startsWith('@');
    const isChannel = value.startsWith('#');
    const isEmail = !isUser && !isChannel && value.length > 0;

    contacts?.classList.toggle('no-display', !(isUser || isEmail));
    channels?.classList.toggle('no-display', !isChannel);

    this.wasEmpty = value.length === 0;
  }

  onFocus() {
    if (this.recipients.length > 4) return
    this.inputFocused = true;
  }

  onBlur() {
    if (this.recipients.length > 4) return
    this.inputFocused = false;
  }
}
