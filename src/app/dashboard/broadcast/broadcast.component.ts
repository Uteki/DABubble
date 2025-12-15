import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../chat.service';
import { DatePipe, NgClass, NgForOf, NgIf } from '@angular/common';
import { User } from '../../core/interfaces/user';
import { BroadcastRecipient } from "../../core/type/recipient";
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
  styleUrl: './broadcast.component.scss'
})
export class BroadcastComponent {
  @Output() toggleRequest = new EventEmitter<boolean>();

  @Input() messageId!: string | null;
  @Input() users: any[] = [];

  today = new Date();
  currentThread: string = '';
  stableThread: string = '';
  messageText: string = '';

  rootMessage: Message | null = null;

  sendingState: 'idle' | 'loading' | 'success' = 'idle';
  recipients: BroadcastRecipient[] = [];

  messages: Message[] = [];

  showPicker = false;
  pickerEmojis = ['😀', '👍', '🎉', '❤️', '😊', '🙏', '🚀', '🤔', '😅', '🔥'];

  public Object = Object;

  constructor(
    private chatService: ChatService,
    private authService: AuthService
  ) {}

  get meId() {
    return this.authService.readCurrentUser();
  }

  insertEmojiIntoText(e: string) {
    this.messageText = (this.messageText || '') + e;
  }

  private stripEmptyReactions(
    reactions: ReactionsMap | undefined
  ): ReactionsMap {
    const src = reactions || {};
    const out: ReactionsMap = {};
    for (const k of Object.keys(src)) {
      const arr = src[k];
      if (Array.isArray(arr) && arr.length > 0) out[k] = arr;
    }
    return out;
  }

  async sendBroadcastMessage() {
    this.recipients = [
      { type: 'channel', channelId: 'DALobby', name: 'DALobby' },
      { type: 'user', partnerChat: 'PB1KgqARUrMiIHdLq3GI1Mip3un2_wXzxp0ORtVbWptur9onPxNz0Uen1', name: 'Denzel Leinad', mail: 'denzelleinad@gmail.com' },
      // { type: 'mail', mail: 'test@example.com' }
    ];

    const logger: User = this.users.find(user => user.uid === this.authService.readCurrentUser());
    if (!this.messageText.trim() || this.recipients.length === 0) return;
    this.sendingState = 'loading';

    await this.chatService.sendBroadcastMessage(this.recipients, {
      uid: logger.uid, text: this.messageText, user: logger.name, timestamp: Date.now(), reaction: {}
    });

    this.sendingState = 'success';
    this.messageText = '';

    setTimeout(() => { this.sendingState = 'idle' }, 2000);
  }
}
