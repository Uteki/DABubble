import {
  Component,
  EventEmitter,
  Input,
  Output
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../services/chat.service';
import { NgClass, NgForOf, NgIf } from '@angular/common';
import { User } from '../../../core/interfaces/user';
import { BroadcastRecipient } from '../../../core/type/recipient';
import { AuthService } from '../../../core/services/auth.service';

type ReactionsMap = Record<string, string[]>;

interface Message {
  id?: string;
  text: string;
  user?: string;
  uid: string;
  timestamp: number;
  reactions?: ReactionsMap;
}

/**
 * BroadcastComponent
 *
 * Allows creating and sending a broadcast message
 * to multiple recipients (users, channels or email addresses).
 *
 * Features:
 * - User & channel autocomplete
 * - Emoji picker
 * - Recipient validation (max. 5 recipients)
 * - Sending state handling (idle | loading | success)
 */
@Component({
  selector: 'app-broadcast',
  standalone: true,
  imports: [FormsModule, NgForOf, NgIf, NgClass],
  templateUrl: './broadcast.component.html',
  styleUrl: './broadcast.component.scss',
})
export class BroadcastComponent {

  /**
   * Emits a toggle event (e.g. to open or close the broadcast view)
   */
  @Output() toggleRequest = new EventEmitter<boolean>();

  /**
   * Optional ID of a root message (e.g. when replying)
   */
  @Input() messageId!: string | null;

  /**
   * List of all available users
   */
  @Input() users: any[] = [];

  /**
   * List of all available channels
   */
  @Input() channels: any[] = [];

  /** Current date (used for display purposes) */
  today = new Date();

  /** Text content of the broadcast message */
  messageText: string = '';

  /** Input value for recipient search (@user, #channel, email) */
  recipientInput = "";

  /**
   * Current sending state of the message
   * - idle: no action
   * - loading: message is being sent
   * - success: message sent successfully
   */
  sendingState: 'idle' | 'loading' | 'success' = 'idle';

  /** List of selected recipients */
  recipients: BroadcastRecipient[] = [];

  /** List of messages (e.g. preview or thread) */
  messages: Message[] = [];

  /** Controls visibility of the emoji picker */
  showPicker = false;

  /** Indicates whether the input field is focused */
  inputFocused: boolean = false;

  /** Available emojis for the picker */
  pickerEmojis = ['😀', '👍', '🎉', '❤️', '😊', '🙏', '🚀', '🤔', '😅', '🔥'];

  /** Tracks whether the input field was previously empty */
  private wasEmpty = true;

  /** Exposes Object for template usage (e.g. Object.keys) */
  public Object = Object;

  constructor(
    private chatService: ChatService,
    private authService: AuthService
  ) {}

  /**
   * Normalized search term without prefix (@ or #)
   */
  get searchTerm(): string {
    return this.recipientInput
      .replace(/^[@#]/, '')
      .toLowerCase()
      .trim();
  }

  /**
   * Returns filtered users based on search type (@user or email)
   */
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

  /**
   * Returns filtered channels based on # search
   */
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

  /**
   * Placeholder text for the recipient input field
   */
  get recipientPlaceholder(): string {
    if (this.recipients.length > 4) {
      return 'Maximale Anzahl an Empfängern erreicht';
    }
    return 'An: #channel, @jemand oder E-Mail-Adresse';
  }

  /**
   * Sends the broadcast message to all selected recipients
   */
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

  /**
   * Builds a unique partner chat ID for two users
   */
  private buildPartnerChat(uid: string): string {
    return [uid, this.authService.readCurrentUser()].sort().join('_');
  }

  /**
   * Checks whether a user is already added as a recipient
   */
  private isAlreadyAdded(user: any, usedPartnerChats: Set<string>): boolean {
    const partnerChat = this.buildPartnerChat(user.uid);
    return usedPartnerChats.has(partnerChat);
  }

  /**
   * Checks whether a user matches the current search criteria
   */
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

  /**
   * Appends an emoji to the message text
   */
  insertEmojiIntoText(e: string) {
    this.messageText = (this.messageText || '') + e;
  }

  /**
   * Removes a recipient by index
   */
  removeRecipient(index: number) {
    this.recipients.splice(index, 1);
  }

  /**
   * Adds a user recipient
   */
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

  /**
   * Adds a channel recipient
   */
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

  /**
   * Type guard for user recipients
   */
  isUserRecipient(r: BroadcastRecipient): r is Extract<BroadcastRecipient, { type: 'user' }> {
    return r.type === 'user';
  }

  /**
   * Type guard for channel recipients
   */
  isChannelRecipient(r: BroadcastRecipient): r is Extract<BroadcastRecipient, { type: 'channel' }> {
    return r.type === 'channel';
  }

  /**
   * Handles changes in the recipient input field
   */
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

  /**
   * Handles input focus state
   */
  onFocus() {
    if (this.recipients.length > 4) return
    this.inputFocused = true;
  }

  /**
   * Handles input blur state
   */
  onBlur() {
    if (this.recipients.length > 4) return
    this.inputFocused = false;
  }
}
