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
import { AuthService } from '../../auth.service';
import { ReactionsComponent } from './../../shared/reactions/reactions.component';

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
export class BroadcastComponent implements OnChanges {
  @Output() toggleRequest = new EventEmitter<boolean>();

  @Input() messageId!: string | null;
  @Input() users: any[] = [];

  today = new Date();
  currentThread: string = '';
  stableThread: string = '';
  messageText: string = '';

  rootMessage: Message | null = null;

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

  private isRoot(msg: Message): boolean {
    return !!this.messageId && msg.id === this.messageId;
  }

  onReactionToggle(msg: Message, ev: { emoji: string; add: boolean }) {
    if (!this.messageId) return;

    msg.reactions = msg.reactions ?? {};
    const list = msg.reactions[ev.emoji] ?? (msg.reactions[ev.emoji] = []);
    const i = list.indexOf(this.meId);
    if (ev.add && i === -1) list.push(this.meId);
    if (!ev.add && i !== -1) list.splice(i, 1);
    if (list.length === 0) delete msg.reactions[ev.emoji];

    if (this.isRoot(msg)) {
      this.chatService
        .reactChannelMessage(
          this.chatService.currentChannel,
          this.messageId!,
          ev.emoji,
          ev.add,
          this.meId
        )
        .catch(console.error);
    } else {
      if (!msg.id) return;
      this.chatService
        .reactThreadMessage(
          this.chatService.currentChannel,
          this.messageId!,
          msg.id,
          ev.emoji,
          ev.add,
          this.meId
        )
        .catch(console.error);
    }
  }

  onReactionAdd(msg: Message, emoji: string) {
    if (!emoji) return;
    this.onReactionToggle(msg, { emoji, add: true });
  }

  async sendMessage() {
    const logger: User = this.users.find(user => user.uid === this.authService.readCurrentUser());
    if (!this.messageText.trim() || this.messageId === null) return;

    await this.chatService.sendThreadMessage(`${this.currentThread}`, `${this.messageId}`, {
      uid: logger.uid, text: this.messageText, user: logger.name, timestamp: Date.now(), reaction: {}
    });
    await this.chatService.messageThreaded(`${this.currentThread}`, `${this.messageId}`, this.messages.length - 1, Date.now())

    this.messageText = '';
  }

  ngOnChanges() {
    if (this.messageId) {
      this.currentThread = this.chatService.currentChannel;
      this.stableThread = this.chatService.currentChat;

      this.chatService
        .getChannelMessage(this.currentThread, this.messageId)
        .subscribe((root: Message) => {
          this.rootMessage = root
            ? { ...root, reactions: this.stripEmptyReactions(root.reactions) }
            : null;
        });

      this.chatService
        .getThreadMessage(`${this.currentThread}`, this.messageId)
        .subscribe((msgs: Message[]) => {
          const cleaned: Message[] = (msgs || [])
            .map((m: Message) => ({
              ...m,
              reactions: this.stripEmptyReactions(m.reactions),
            }))
            .sort((a: Message, b: Message) => a.timestamp - b.timestamp);

          this.messages = this.rootMessage
            ? cleaned.filter(
              (m: Message) =>
                !(
                  m.uid === this.rootMessage!.uid &&
                  m.text === this.rootMessage!.text &&
                  m.timestamp === this.rootMessage!.timestamp
                )
            )
            : cleaned;
        });
    }
  }

  getProfilePic(uid: string) {
    return (
      this.users.find((user: any) => user.uid === uid)?.avatar ||
      'assets/avatars/profile.png'
    );
  }

  getUserId() {
    return this.authService.readCurrentUser();
  }

  closeThread() {
    this.toggleRequest.emit(false);
  }
}
