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

@Component({
  selector: 'app-thread',
  standalone: true,
  imports: [FormsModule, DatePipe, NgForOf, NgIf, NgClass, ReactionsComponent],
  templateUrl: './thread.component.html',
  styleUrl: './thread.component.scss',
})
export class ThreadComponent implements OnChanges {
  @Output() toggleRequest = new EventEmitter<boolean>();

  @Input() messageId!: string | null;
  @Input() users: any[] = [];

  today = new Date();
  currentThread: string = '';
  stableThread: string = '';
  messageText: string = '';
  messages: any[] = [];
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
    reactions: Record<string, string[]> | undefined
  ): Record<string, string[]> {
    const src = reactions || {};
    const out: Record<string, string[]> = {};
    for (const k of Object.keys(src)) {
      const arr = src[k];
      if (Array.isArray(arr) && arr.length > 0) out[k] = arr;
    }
    return out;
  }

  private asciiToEmojiInText(s: string): string {
    if (!s) return s;
    return s
      .replace(/:-?\)/g, '😀')
      .replace(/:-?D/gi, '😃')
      .replace(/;-?\)/g, '😉')
      .replace(/:-?\(/g, '☹️')
      .replace(/:-?P/gi, '😛')
      .replace(/:o/gi, '😮')
      .replace(/:'\(/g, '😢')
      .replace(/\+1/g, '👍')
      .replace(/-1/g, '👎')
      .replace(/<3/g, '❤️');
  }

  onReactionToggle(msg: any, ev: { emoji: string; add: boolean }) {
    if (!this.messageId) return;
    msg.reactions = msg.reactions ?? {};
    const list = msg.reactions[ev.emoji] ?? (msg.reactions[ev.emoji] = []);
    const i = list.indexOf(this.meId);
    if (ev.add && i === -1) list.push(this.meId);
    if (!ev.add && i !== -1) list.splice(i, 1);
    if (list.length === 0) delete msg.reactions[ev.emoji];

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

  onReactionAdd(_msg: any, _emoji: string) {}

  async sendMessage() {
    const meId = this.authService.readCurrentUser();
    const logger: User | undefined = this.users.find(u => u.uid === meId);

    const raw = (this.messageText || '').trim();
    const threadRootChannelId = this.currentThread || this.chatService.currentChannel;
    const parentMsgId = this.messageId;

    if (!logger || !threadRootChannelId || !parentMsgId || !raw) return;

    const text = this.asciiToEmojiInText(raw);

    await this.chatService.sendThreadMessage(
      `${threadRootChannelId}`,
      `${parentMsgId}`,
      {
        uid: logger.uid,
        text,
        user: logger.name,
        timestamp: Date.now(),
      }
    );

    this.messageText = '';
  }

  ngOnChanges() {
    if (this.messageId) {
      this.currentThread = this.chatService.currentChannel;
      this.stableThread = this.chatService.currentChat;

      this.chatService
        .getThreadMessage(`${this.chatService.currentChannel}`, this.messageId)
        .subscribe((messages) => {
          this.messages = (messages || [])
            .map((m: any) => ({
              ...m,
              reactions: this.stripEmptyReactions(m.reactions),
            }))
            .sort((a: any, b: any) => a.timestamp - b.timestamp);
        });
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

  closeThread() {
    this.toggleRequest.emit(false);
  }
}
