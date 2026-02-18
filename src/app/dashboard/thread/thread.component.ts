import { Component, EventEmitter, HostListener, Input, OnChanges, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../chat.service';
import { DatePipe, NgClass, NgForOf, NgIf } from '@angular/common';
import { User } from '../../core/interfaces/user';
import { AuthService } from '../../auth.service';
import { ReactionsComponent } from '../../shared/reactions/reactions.component';
import { AutoScrollDirective } from "../../auto-scroll.directive";
import { LinkifyPipe } from "../../linkify.pipe";
import { MentionService } from "../../mention.service";

type ReactionsMap = Record<string, string[]>;

/**
 * Thread message model used by the thread view.
 * Represents either the root message (thread starter) or a reply.
 */
interface Message {
  /** Firestore document id (optional for locally constructed objects). */
  id?: string;
  /** Sender uid. */
  uid: string;
  /** Sender display name (if stored with the message). */
  user?: string;
  /** Message text content. */
  text: string;
  /** Unix timestamp in milliseconds. */
  timestamp: number;
  /** Reaction map keyed by emoji. Each value is an array of user ids who reacted with that emoji. */
  reactions?: ReactionsMap;
}

@Component({
  selector: 'app-thread',
  standalone: true,
  imports: [FormsModule, DatePipe, NgForOf, NgIf, NgClass, ReactionsComponent, AutoScrollDirective, LinkifyPipe],
  templateUrl: './thread.component.html',
  styleUrl: './thread.component.scss'
})
export class ThreadComponent implements OnChanges {
  /**
   * Emits when the user requests to close/open the thread panel.
   * `false` typically means "close the thread".
   */
  @Output() toggleRequest = new EventEmitter<boolean>();
  /** Root channel message id that this thread belongs to. */
  @Input() messageId!: string | null;
  /** Full user list used for avatars, mentions, and resolving names. */
  @Input() users: any[] = [];
  /** Channel list (available for template usage / context). */
  @Input() channels: any[] = [];
  /** Current date reference (often used in templates for date comparisons). */
  today = new Date();
  /** Internal channel id for the thread context (derived from ChatService). */
  currentThread: string = '';
  /** Display name/title of the current channel (derived from ChatService). */
  stableThread: string = '';
  /** Two-way bound input text for new thread replies. */
  messageText: string = '';
  /** Root message (thread starter). */
  rootMessage: Message | null = null;
  /** Replies in the thread (excludes the root message). */
  messages: Message[] = [];
  /** Whether the emoji picker is currently shown. */
  showPicker = false;
  /** Emoji options for the (simple) picker UI. */
  pickerEmojis = ['😀', '👍', '🎉', '❤️', '😊', '🙏', '🚀', '🤔', '😅', '🔥'];
  /** Exposes Object for templates (e.g., Object.keys). */
  public Object = Object;

  /**
   * @param chatService Chat facade used for loading/sending thread messages and writing reactions.
   * @param authService Auth facade used for current user id.
   * @param mentionService Handles click-to-open mentions inside rendered message content.
   */
  constructor(
    private chatService: ChatService,
    private authService: AuthService,
    private mentionService: MentionService
  ) {}

  /**
   * Delegates click handling to MentionService so mentions inside messages
   * can open partner chats / trigger navigation.
   *
   * @param event Click event from the component host.
   */
  @HostListener('click', ['$event'])
  onMessageClick(event: MouseEvent) {
    this.mentionService.mentionClick(event, this.users)
  }

  /**
   * Current user's uid.
   */
  get meId() {
    return this.authService.readCurrentUser();
  }

  /**
   * Appends an emoji to the current reply draft.
   *
   * @param e Emoji to insert.
   */
  insertEmojiIntoText(e: string) {
    this.messageText = (this.messageText || '') + e;
  }

  /**
   * Removes empty reaction entries so the UI doesn't render emojis with 0 users.
   *
   * @param reactions Reaction map (possibly undefined).
   * @returns Cleaned reaction map with only non-empty arrays.
   */
  private stripEmptyReactions(reactions: ReactionsMap | undefined): ReactionsMap {
    const src = reactions || {};
    const out: ReactionsMap = {};
    for (const k of Object.keys(src)) {
      const arr = src[k];
      if (Array.isArray(arr) && arr.length > 0) out[k] = arr;
    }
    return out;
  }

  /**
   * Checks whether a message is the root message of the thread.
   *
   * @param msg Message to check.
   */
  private isRoot(msg: Message): boolean {
    return !!this.messageId && msg.id === this.messageId;
  }

  /**
   * Handles reaction toggles emitted by the ReactionsComponent.
   *
   * Behavior:
   * - Optimistically updates local message state (adds/removes current uid)
   * - Persists the change to Firestore via ChatService:
   *   - root message => reactChannelMessage
   *   - reply message => reactThreadMessage
   *
   * @param msg Target message (root or reply).
   * @param ev Reaction toggle event.
   */
  onReactionToggle(msg: Message, ev: { emoji: string; add: boolean }) {
    if (!this.messageId) return;
    msg.reactions = msg.reactions ?? {};
    const list = msg.reactions[ev.emoji] ?? (msg.reactions[ev.emoji] = []);
    const i = list.indexOf(this.meId);
    if (ev.add && i === -1) list.push(this.meId);
    if (!ev.add && i !== -1) list.splice(i, 1);
    if (list.length === 0) delete msg.reactions[ev.emoji];
    if (this.isRoot(msg)) {
      this.chatService.reactChannelMessage(this.chatService.currentChannel, this.messageId!, ev.emoji, ev.add, this.meId).catch(console.error);
    } else {
      if (!msg.id) return;
      this.chatService.reactThreadMessage(this.chatService.currentChannel, this.messageId!, msg.id, ev.emoji, ev.add, this.meId).catch(console.error);
    }
  }

  /**
   * Convenience helper to add a reaction (always "add: true").
   *
   * @param msg Target message.
   * @param emoji Emoji to add.
   */
  onReactionAdd(msg: Message, emoji: string) {
    if (!emoji) return;
    this.onReactionToggle(msg, { emoji, add: true });
  }

  /**
   * Sends the current reply text as a thread message.
   *
   * - Validates non-empty input and existing messageId
   * - Resolves current user info from the provided users list
   * - Writes reply to `channels/{channelId}/messages/{rootId}/thread`
   * - Updates thread metadata on the root message (reply count + last activity)
   * - Clears the input field on success
   */
  async sendMessage() {
    const logger: User = this.users.find(user => user.uid === this.authService.readCurrentUser());
    if (!this.messageText.trim() || this.messageId === null) return;
    await this.chatService.sendThreadMessage(`${this.currentThread}`, `${this.messageId}`, {
      uid: logger.uid, text: this.messageText, user: logger.name, timestamp: Date.now(), reaction: {}
    });
    await this.chatService.messageThreaded(`${this.currentThread}`, `${this.messageId}`, this.messages.length, Date.now())
    this.messageText = '';
  }

  /**
   * Lifecycle hook triggered when inputs change.
   *
   * When `messageId` is set:
   * - Captures current channel context from ChatService
   * - Subscribes to the root message document
   * - Subscribes to the thread message collection
   * - Cleans reactions and sorts replies by timestamp ascending
   * - Removes duplicates if the root message appears inside the thread list
   */
  ngOnChanges() {
    if (this.messageId) {
      this.currentThread = this.chatService.currentChannel;
      this.stableThread = this.chatService.currentChat;
      this.chatService.getChannelMessage(this.currentThread, this.messageId)
        .subscribe((root: Message) => {this.rootMessage = root ? { ...root, reactions: this.stripEmptyReactions(root.reactions) } : null});
      this.chatService.getThreadMessage(`${this.currentThread}`, this.messageId).subscribe((msgs: Message[]) => {
          const cleaned: Message[] = (msgs || [])
            .map((m: Message) => ({...m, reactions: this.stripEmptyReactions(m.reactions)}))
            .sort((a: Message, b: Message) => a.timestamp - b.timestamp);
          this.messages = this.rootMessage ? cleaned.filter((m: Message) => !(
            m.uid === this.rootMessage!.uid && m.text === this.rootMessage!.text && m.timestamp === this.rootMessage!.timestamp)
          ) : cleaned;
        });
    }
  }

  /**
   * Returns the avatar path for a given user id.
   *
   * @param uid User id.
   * @returns Avatar path or default placeholder.
   */
  getProfilePic(uid: string) {
    return (
      this.users.find((user: any) => user.uid === uid)?.avatar ||
      'assets/avatars/profile.png'
    );
  }

  /**
   * Current user's uid (template helper).
   */
  getUserId() {
    return this.authService.readCurrentUser();
  }

  /**
   * Requests closing the thread panel.
   */
  closeThread() {
    this.toggleRequest.emit(false);
  }
}
