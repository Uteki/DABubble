import {ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, Output} from '@angular/core';
import { DatePipe, NgClass, NgForOf, NgIf } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { AuthService } from "../../auth.service";
import { ChatService } from "../../chat.service";
import { User } from "../../core/interfaces/user";
import { Subscription } from 'rxjs';
import { ReactionsComponent } from './../../shared/reactions/reactions.component';
import { Firestore } from '@angular/fire/firestore';
import { doc, updateDoc } from 'firebase/firestore';

import { StopPropagationDirective } from "../../stop-propagation.directive";
import { ProfileOverlayService } from "../../profile-overlay.service";
import {AutoScrollDirective} from "../../auto-scroll.directive";


@Component({
  selector: 'app-message',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    NgForOf,
    NgIf,
    NgClass,
    ReactionsComponent,
    StopPropagationDirective,
    AutoScrollDirective
  ],
  templateUrl: './message.component.html',
  styleUrl: './message.component.scss'
})
export class MessageComponent implements OnChanges {
  @Output() partnerSelected = new EventEmitter<User>();
  @Output() toggleRequest = new EventEmitter<boolean>();

  @Input() partner!: User | null;
  @Input() users: any[] = [];

  messages: any[] = [];
  messageText: string = '';
  today = new Date();
  overlayActivated: boolean = false;
  viewMemberOverlay: boolean = false;
  addMemberOverlay: boolean = false;
  channelOverlay: boolean = false;
  profileOverlay: boolean = false;
  currentPartnerChat: string = "";
  currentWhisperer: string = "";
  currentPartner: any;
  showPicker = false;

  editMessageMenuOpen: string | null = null;
  editingMessageId: string | null = null;
  editingMessageText: string = '';
  editMessageIsOpen: boolean = false;

  public Object = Object;

  private msgSub?: Subscription;

  constructor(private chatService: ChatService, private cd: ChangeDetectorRef, private authService: AuthService, private profileOverlayService: ProfileOverlayService, private firestore: Firestore) {}
  //TODO: Editable messages

  ngOnChanges() {
    if (this.partner) {
      this.currentPartner = this.partner;
      this.currentWhisperer = this.authService.readCurrentUser();
      this.currentPartnerChat = [this.currentPartner.uid, this.currentWhisperer].sort().join('_');

      this.chatService.getWhisperMessage(this.currentPartnerChat).subscribe(messages => {
        this.messages = messages.sort((a:any, b:any) => a.timestamp - b.timestamp);
        const prevById = new Map(this.messages.map((m) => [m.id, m]));
        this.messages = (messages || [])
          .map((m: any) => {
            const prev = prevById.get(m.id);
            const merged = this.stripEmptyReactions(m.reactions ?? prev?.reactions ?? {});
            return { ...m, reactions: merged };
          })
          .sort((a: any, b: any) => a.timestamp - b.timestamp);
      });
    }
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
    const logger: User = this.users.find(user => user.uid === this.authService.readCurrentUser());
    const raw = (this.messageText || '').trim();
    if (!this.messageText.trim() || this.currentPartnerChat === null) return;

    const text = this.asciiToEmojiInText(raw);
    await this.chatService.sendWhisperMessage(this.currentPartnerChat, {
      uid: logger.uid,
      text: text,
      user: logger.name,
      timestamp: Date.now(),
      reaction: {}
    });

    this.messageText = '';
  }

  getProfilePic(uid: string) {
    return this.users.find(user => user.uid === uid).avatar || 'assets/avatars/profile.png';
  }

  getLargeAvatar(avatarPath: string | undefined): string {
    if (!avatarPath) return 'assets/avatars/profile.png';
    return avatarPath.replace('avatarSmall', 'avatar');
  }

  getUserId() {
    return this.authService.readCurrentUser();
  }

  overlayFunction(darkOverlay: boolean, overlay: string, overlayBoolean: boolean ) {
    this.overlayActivated = darkOverlay;
    this.cd.detectChanges();
    if (overlay == "Entwicklung") {
      this.channelOverlay = overlayBoolean;
    } else if (overlay == "Mitglieder") {
      this.viewMemberOverlay = overlayBoolean;
    } else if (overlay == "Hinzufügen") {
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

  async emitPartner(partnerUid: string) {
    const partnerObj: User = this.users.find((user) => user.uid === partnerUid);
    this.partnerSelected.emit(partnerObj);
    this.toggleRequest.emit(true);
  }


  openProfile() {
    if (this.currentPartner?.uid === this.currentWhisperer) {
      this.profileOverlayService.triggerOpenProfile();
    } else {
      this.overlayActivated = true;
      this.profileOverlay = true;
    }
  }

  closeProfile() {
    this.overlayActivated = false;
    this.profileOverlay = false;
  }

   hoverMessage(messageId: string, messageUid: string, event?: MouseEvent) {
    const messageElement = document.getElementById('message-text-' + messageId);
    if (messageElement && event) {
      const target = event.target as HTMLElement;
      const messageEvent = target.closest('.message-event');

      if (messageEvent) {
        messageElement.classList.remove('hovered-message');
        messageElement.classList.remove('hovered-own-message');
      } else {
        if (messageUid === this.getUserId()) {
          messageElement.classList.add('hovered-own-message');
        } else {
          messageElement.classList.add('hovered-message');
        }
      }
    }
  }

  leaveMessage(messageId: string) {
    const messageElement = document.getElementById('message-text-' + messageId);
    if (messageElement) {
      messageElement.classList.remove('hovered-message');
      messageElement.classList.remove('hovered-own-message');
    }
  }

  toggleEditMessageMenu(messageId: string, event: Event) {
    event.stopPropagation();
    if (this.editMessageMenuOpen === messageId) {
      this.editMessageMenuOpen = null;
    } else {
      this.editMessageMenuOpen = messageId;
    }
  }

  editMessage(messageId: string) {
    const message = this.messages.find((m) => m.id === messageId);

    if (!message || message.uid !== this.getUserId()) {
      return;
    }

    this.editingMessageId = messageId;
    this.editingMessageText = message.text;
    this.editMessageMenuOpen = null;
    this.editMessageIsOpen = true;

    const messageElement = document.getElementById('message-text-' + messageId);
    if (messageElement) {
      messageElement.classList.add('hovered-own-message');
    }
  }

  cancelEdit() {
    if (this.editingMessageId) {
      const messageElement = document.getElementById(
        'message-text-' + this.editingMessageId
      );
      if (messageElement) {
        messageElement.classList.remove('hovered-own-message');
      }
    }

    this.editingMessageId = null;
    this.editingMessageText = '';
    this.editMessageIsOpen = false;
  }

  async saveEditedMessage(messageId: string) {
    if (!this.editingMessageText.trim()) return;

    const messageRef = doc(
      this.firestore,
      `whispers/${this.currentPartnerChat}/messages/${messageId}`
    );

    await updateDoc(messageRef, {
      text: this.editingMessageText.trim(),
      edited: true,
    });

    this.cancelEdit();
  }
}
