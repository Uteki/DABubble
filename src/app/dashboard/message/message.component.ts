import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
} from '@angular/core';
import { DatePipe, NgClass, NgForOf, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

import { AuthService } from '../../auth.service';
import { ChatService } from '../../chat.service';
import { User } from '../../core/interfaces/user';
import { ReactionsComponent } from './../../shared/reactions/reactions.component';

@Component({
  selector: 'app-message',
  standalone: true,
  imports: [DatePipe, FormsModule, NgForOf, NgIf, NgClass, ReactionsComponent],
  templateUrl: './message.component.html',
  styleUrl: './message.component.scss',
})
export class MessageComponent implements OnChanges {
  @Output() toggleRequest = new EventEmitter<boolean>();

  @Input() partner!: User | null;
  @Input() users: any[] = [];

  messages: any[] = [];
  messageText: string = '';
  today = new Date();
  overlayActivated = false;
  viewMemberOverlay = false;
  addMemberOverlay = false;
  channelOverlay = false;

  currentPartnerChat = '';
  currentWhisperer = '';
  currentPartner: any;
  showPicker = false;

  public Object = Object;

  private msgSub?: Subscription;

  constructor(
    private chatService: ChatService,
    private cd: ChangeDetectorRef,
    private authService: AuthService
  ) {}

  ngOnChanges() {
    if (!this.partner) return;

    this.currentPartner = this.partner;
    this.currentWhisperer = this.authService.readCurrentUser();
    this.currentPartnerChat = [this.currentPartner.uid, this.currentWhisperer]
      .sort()
      .join('_');
    this.msgSub?.unsubscribe();
    this.msgSub = this.chatService
      .getWhisperMessage(this.currentPartnerChat)
      .subscribe((incoming) => {
        const prevById = new Map(this.messages.map((m) => [m.id, m]));
        this.messages = (incoming || [])
          .map((m: any) => {
            const prev = prevById.get(m.id);
            const merged = this.stripEmptyReactions(m.reactions ?? prev?.reactions ?? {});
            return { ...m, reactions: merged };
          })
          .sort((a: any, b: any) => a.timestamp - b.timestamp);
      });
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

  async sendMessage() {
    const meId = this.authService.readCurrentUser();
    const logger: User | undefined = this.users.find((u) => u.uid === meId);
    const raw = (this.messageText || '').trim();
    if (!logger || !this.currentPartnerChat || !raw) return;

    const text = this.asciiToEmojiInText(raw);
    await this.chatService.sendWhisperMessage(this.currentPartnerChat, {
      uid: logger.uid,
      text,
      user: logger.name,
      timestamp: Date.now(),
    });

    this.messageText = '';
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

    if (!this.currentPartnerChat || !msg?.id) return;
    this.chatService
      .reactWhisperMessage(this.currentPartnerChat, msg.id, ev.emoji, ev.add, this.meId)
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
