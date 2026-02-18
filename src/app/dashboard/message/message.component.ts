import { Component, EventEmitter, HostListener, Input, OnChanges, Output } from '@angular/core';
import { DatePipe, NgClass, NgForOf, NgIf } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { AuthService } from "../../auth.service";
import { ChatService } from "../../chat.service";
import { User } from "../../core/interfaces/user";
import { ReactionsComponent } from '../../shared/reactions/reactions.component';
import { Firestore } from '@angular/fire/firestore';
import { doc, updateDoc } from 'firebase/firestore';
import { StopPropagationDirective } from "../../stop-propagation.directive";
import { ProfileOverlayService } from "../../profile-overlay.service";
import { AutoScrollDirective } from "../../auto-scroll.directive";
import { LinkifyPipe } from "../../linkify.pipe";
import { MentionService } from "../../mention.service";
import { ActionService } from "../../action.service";

/**
 * MessageComponent
 * Direct message (whisper) view/controller.
 * Responsibilities:
 * - Loads and renders whisper messages for the currently selected partner.
 * - Sends new whisper messages (with ASCII-to-emoji normalization).
 * - Handles message reactions (optimistic UI + persistence to Firestore).
 * - Supports editing own messages and persisting edits to Firestore.
 * - Implements mention UI for users/channels inside the message composer.
 * - Controls profile overlay behavior for self vs. other user.
 * Emits:
 * - {@link partnerSelected} when a partner is selected from within the view.
 * - {@link toggleRequest} to request the parent layout to toggle direct chat UI.
 */
@Component({
  selector: 'app-message',
  standalone: true,
  imports: [
    DatePipe, FormsModule, NgForOf, NgIf, NgClass, ReactionsComponent, StopPropagationDirective, AutoScrollDirective, LinkifyPipe
  ],
  templateUrl: './message.component.html',
  styleUrl: './message.component.scss'
})
export class MessageComponent implements OnChanges {

  /** Emits the chosen chat partner (User) to the parent component. */
  @Output() partnerSelected = new EventEmitter<User>();
  /** Emits a toggle request (e.g. open/close direct chat view) to the parent component. */
  @Output() toggleRequest = new EventEmitter<boolean>();
  /** Currently selected partner for this whisper chat. */
  @Input() partner!: User | null;
  /** Full user list (used for rendering avatars/names and mention search). */
  @Input() users: any[] = [];
  /** Channel list (used for channel mention search). */
  @Input() channels: any[] = [];
  /** Filtered channels for channel mention dropdown. */
  filteredChannels: any[] = [];
  /** Filtered users for user mention dropdown. */
  filteredUsers: any[] = [];
  /** Current whisper message list (sorted ascending by timestamp). */
  messages: any[] = [];
  /** Two-way bound text input for the composer. */
  messageText: string = '';
  /** Used for date grouping / "today" checks in the template. */
  today = new Date();
  /** Whether the dark overlay is active (e.g. profile overlay shown). */
  overlayActivated: boolean = false;
  /** Overlay state: show "view members" overlay. */
  viewMemberOverlay: boolean = false;
  /** Overlay state: show "add member" overlay. */
  addMemberOverlay: boolean = false;
  /** Overlay state: show channel overlay. */
  channelOverlay: boolean = false;
  /** Overlay state: show partner profile overlay. */
  profileOverlay: boolean = false;
  /** Computed whisper id in the format "uidA_uidB" (sorted). */
  currentPartnerChat: string = "";
  /** Current logged-in user uid. */
  currentWhisperer: string = "";
  /** Cached partner object for convenience. */
  currentPartner: any;
  /** Whether the emoji picker for the composer is visible. */
  showPicker = false;
  /** Per-message reaction picker visibility flags. */
  showReactionPicker: { [messageId: string]: boolean } = {};
  /** Which message currently has its "edit menu" open. */
  editMessageMenuOpen: string | null = null;
  /** The message id that is currently being edited. */
  editingMessageId: string | null = null;
  /** Draft text for the edited message. */
  editingMessageText: string = '';
  /** Whether edit mode is active. */
  editMessageIsOpen: boolean = false;
  /** Active mention metadata for the composer. Defines the trigger and text range that will be replaced by the mention. */
  activeMention: { trigger: '@' | '#'; startIndex: number; endIndex: number; } | null = null;
  /** Exposes Object for template usage (e.g. Object.keys). */
  public Object = Object;

  /**
   * @param chatService - Facade for whisper message read/write and reaction updates.
   * @param authService - Authentication facade (current user id).
   * @param profileOverlayService - Opens the main profile overlay for the current user.
   * @param firestore - Firestore instance used for message edit persistence.
   * @param mentionService - Mention parsing/filtering and click handling.
   * @param actionService - UI helper actions (emoji insert, reaction mutation, edit state building, etc.).
   */
  constructor(
    private chatService: ChatService, private authService: AuthService, private profileOverlayService: ProfileOverlayService,
    private firestore: Firestore, private mentionService: MentionService, private actionService: ActionService
  ) {}

  /**
   * Lifecycle: reacts to input changes.
   * When a partner is present:
   * - computes whisper id (sorted uid pair) - subscribes to whisper messages
   * - normalizes reactions (removes empty reaction arrays) - keeps messages sorted by timestamp
   */
  ngOnChanges() {
    if (this.partner) {
      this.currentPartner = this.partner;
      this.currentWhisperer = this.authService.readCurrentUser();
      this.currentPartnerChat = [this.currentPartner.uid, this.currentWhisperer].sort().join('_');
      this.chatService.getWhisperMessage(this.currentPartnerChat).subscribe(messages => {
        this.messages = messages.sort((a:any, b:any) => a.timestamp - b.timestamp);
        const prevById = new Map(this.messages.map((m) => [m.id, m]));
        this.messages = (messages || []).map((m: any) => {
            const prev = prevById.get(m.id);
            const merged = this.stripEmptyReactions(m.reactions ?? prev?.reactions ?? {});
            return { ...m, reactions: merged };
          }).sort((a: any, b: any) => a.timestamp - b.timestamp);
      });
    }
  }

  /**
   * Handles mention-click interactions inside the message list (e.g. @user links).
   * Delegates parsing/behavior to MentionService.
   * @param event - Click event from the message container
   */
  @HostListener('click', ['$event'])
  onMessageClick(event: MouseEvent) { this.mentionService.mentionClick(event, this.users) }

  /** Current user id (convenience getter). */
  get meId(): string { return this.authService.readCurrentUser() }

  /**
   * Clears mention dropdowns and resets mention-related state. Used before re-parsing the input to ensure clean UI behavior.
   */
  private resetMentionUI() {
    document.getElementById('search-chat-members2')?.classList.add('no-display');
    document.getElementById('search-chat-channels2')?.classList.add('no-display');
    this.filteredUsers = []; this.filteredChannels = []; this.activeMention = null
  }

  /**
   * Stores mention metadata so {@link insertMention} can replace the correct text range.
   * @param mention - Mention parse result (trigger, range)
   */
  private setActiveMention(mention: any) {
    this.activeMention = { trigger: mention.trigger, startIndex: mention.startIndex, endIndex: mention.endIndex };
  }

  /**
   * Filters users based on the mention query and displays the user dropdown if matches exist.
   * @param mention - Mention parse result containing the query
   */
  private handleUserMention(mention: any) {
    this.filteredUsers = this.mentionService.filterUsers(mention.query, this.users);
    if (this.filteredUsers.length === 0) return;
    document.getElementById('search-chat-members2')?.classList.remove('no-display');
  }

  /**
   * Filters channels based on the mention query and displays the channel dropdown if matches exist.
   * @param mention - Mention parse result containing the query
   */
  private handleChannelMention(mention: any) {
    this.filteredChannels = this.mentionService.filterChannels(mention.query, this.channels);
    if (this.filteredChannels.length === 0) return;
    document.getElementById('search-chat-channels2')?.classList.remove('no-display');
  }

  /**
   * Removes reaction entries that have empty arrays. This keeps the UI clean and avoids rendering empty reaction bubbles.
   * @param reactions - Reaction map (emoji -> userIds)
   */
  private stripEmptyReactions(reactions: Record<string, string[]> | undefined): Record<string, string[]> {
    const src = reactions || {};
    const out: Record<string, string[]> = {};
    for (const k of Object.keys(src)) {
      const arr = src[k];
      if (Array.isArray(arr) && arr.length > 0) out[k] = arr;
    } return out;
  }

  /**
   * Converts ASCII emoticons (e.g. ":)", "<3") in text to emojis. Delegates transformation to {@link ActionService.toEmoji}.
   * @param s - Raw input text
   */
  private asciiToEmojiInText(s: string): string { return this.actionService.toEmoji(s) }

  /**
   * Sends a whisper message to the current partner chat.
   * Validates non-empty input - Converts ASCII emoticons to emojis - Persists message via ChatService - Clears composer on success
   */
  async sendMessage() {
    const logger: User = this.users.find(user => user.uid === this.authService.readCurrentUser());
    const raw = (this.messageText || '').trim();
    if (!this.messageText.trim() || this.currentPartnerChat === null) return;
    const text = this.asciiToEmojiInText(raw);
    await this.chatService.sendWhisperMessage(this.currentPartnerChat, {
      uid: logger.uid, text: text, user: logger.name, timestamp: Date.now(), reaction: {}
    });
    this.messageText = '';
  }

  /**
   * Resolves a user's avatar path for the message list. Falls back to the default profile avatar.
   * @param uid - User id
   */
  getProfilePic(uid: string) { return this.users.find(user => user.uid === uid).avatar || 'assets/avatars/profile.png'; }

  /**
   * Converts a small avatar path to its "large" variant.
   * @param avatarPath - Small avatar path
   */
  getLargeAvatar(avatarPath: string | undefined): string {
    if (!avatarPath) return 'assets/avatars/profile.png';
    return avatarPath.replace('avatarSmall', 'avatar');
  }

  /** Returns the current user id (alias for template usage). */
  getUserId() { return this.authService.readCurrentUser() }

  /**
   * Toggles a reaction on a message.
   * Applies optimistic UI changes via {@link ActionService.emojiRow} - Persists reaction update via ChatService
   * @param msg - Message object being modified
   * @param ev - Reaction event (emoji + add/remove)
   */
  onReactionToggle(msg: any, ev: { emoji: string; add: boolean }) {
    this.actionService.emojiRow(msg, ev, this.meId);
    if (!this.currentPartnerChat || !msg?.id) return;
    this.chatService.reactWhisperMessage(this.currentPartnerChat, msg.id, ev.emoji, ev.add, this.meId).catch(console.error);
  }

  /**
   * Convenience helper to always add a reaction.
   * @param msg - Message object being modified
   * @param emoji - Emoji to add
   */
  onReactionAdd(msg: any, emoji: string) {
    if (!emoji) return;
    this.onReactionToggle(msg, { emoji, add: true });
  }

  /**
   * Inserts an emoji into the composer at the current caret position.
   * Updates {@link messageText} with the returned value from the ActionService.
   * @param emoji - Emoji to insert
   */
  insertEmojiIntoText(emoji: string) { this.messageText = this.actionService.emojiTextarea(emoji, this.messageText) }

  /**
   * Emits a partner selection to the parent and requests opening direct chat view.
   * @param partnerUid - Selected partner user id
   */
  async emitPartner(partnerUid: string) {
    const partnerObj: User = this.users.find((user) => user.uid === partnerUid);
    this.partnerSelected.emit(partnerObj);
    this.toggleRequest.emit(true);
  }

  /**
   * Opens the profile overlay:
   * if user clicks themselves => opens the global profile overlay | otherwise => opens the local partner profile overlay
   */
  openProfile() {
    if (this.currentPartner?.uid === this.currentWhisperer) {
      this.profileOverlayService.triggerOpenProfile();
    } else {
      this.overlayActivated = true; this.profileOverlay = true
    }
  }

  /** Closes the local partner profile overlay. */
  closeProfile() { this.overlayActivated = false; this.profileOverlay = false }

  /**
   * Applies hover CSS classes based on message ownership and click target.
   * Delegates logic to {@link ActionService.hoverOnFocus}.
   * @param messageId - Message id
   * @param messageUid - Author id of the message
   * @param event - Mouse event (optional)
   */
  hoverMessage(messageId: string, messageUid: string, event?: MouseEvent) {
    this.actionService.hoverOnFocus(messageId, messageUid, this.getUserId(), event);
  }

  /**
   * Removes hover classes when the pointer leaves a message.
   * @param messageId - Message id
   */
  leaveMessage(messageId: string) {
    const messageElement = document.getElementById('message-text-' + messageId);
    if (messageElement) { messageElement.classList.remove('hovered-message'); messageElement.classList.remove('hovered-own-message') }
  }

  /**
   * Toggles the per-message edit menu (e.g. kebab menu).
   * @param messageId - Message id
   * @param event - Click event (stopped from bubbling)
   */
  toggleEditMessageMenu(messageId: string, event: Event) {
    event.stopPropagation();
    this.editMessageMenuOpen === messageId ? this.editMessageMenuOpen = null : this.editMessageMenuOpen = messageId;
  }

  /**
   * Enters edit mode for an owned message.
   * Retrieves edit state from {@link ActionService.beginEdit} - Highlights the message being edited
   * @param messageId - Message id
   */
  editMessage(messageId: string) {
    const next = this.actionService.beginEdit(messageId, this.messages, this.getUserId());
    if (!next) return;
    this.editingMessageId = next.editingMessageId; this.editingMessageText = next.editingMessageText
    this.editMessageMenuOpen = next.editMessageMenuOpen; this.editMessageIsOpen = next.editMessageIsOpen
    this.actionService.highlightOwnMessage(messageId);
  }

  /** Cancels edit mode and resets edit state. Also removes highlight class from the edited message. */
  cancelEdit() {
    if (this.editingMessageId) {
      const messageElement = document.getElementById('message-text-' + this.editingMessageId);
      if (messageElement) messageElement.classList.remove('hovered-own-message');
    } this.editingMessageId = null; this.editingMessageText = ''; this.editMessageIsOpen = false
  }

  /**
   * Persists an edited message to Firestore and exits edit mode. Marks the message as edited.
   * @param messageId - Message id
   */
  async saveEditedMessage(messageId: string) {
    if (!this.editingMessageText.trim()) return;
    const messageRef = doc(this.firestore, `whispers/${this.currentPartnerChat}/messages/${messageId}`);
    await updateDoc(messageRef, {text: this.editingMessageText.trim(), edited: true,});
    this.cancelEdit();
  }

  /**
   * Composer input handler for mentions.
   * Determines cursor position - Resets mention UI - Parses active mention (if any) from text+cursor - Shows user/channel dropdown based on trigger
   * @param value - Current textarea value
   * @param ev - Input/keyup event (optional)
   */
  onInputChange(value: string, ev?: Event) {
    const textarea = ev?.target as HTMLTextAreaElement;
    const cursor = textarea?.selectionStart ?? value.length;
    this.resetMentionUI();
    const mention = this.mentionService.parseMention(value, cursor);
    if (!mention) return;
    this.setActiveMention(mention);
    mention.trigger === '@' ? this.handleUserMention(mention) : this.handleChannelMention(mention);
  }

  /**
   * Inserts the selected mention into the composer and places the caret after it.
   * Delegates string manipulation to {@link ActionService.testInsertMention}.
   * @param name - Mention target name (without trigger)
   * @param textarea - Composer textarea element (used to control caret)
   */
  insertMention(name: string, textarea: HTMLTextAreaElement) {
    const res = this.actionService.testInsertMention(name, this.messageText, this.activeMention);
    if (!res) return;
    this.messageText = res.nextText;
    textarea.value = res.nextText;
    textarea.setSelectionRange(res.nextCursor, res.nextCursor);
    textarea.focus();
    this.activeMention = null;
    document.getElementById('search-chat-members2')?.classList.add('no-display');
    document.getElementById('search-chat-channels2')?.classList.add('no-display');
  }

  /**
   * Routes emoji actions either to: add a reaction to a message, or insert an emoji into the composer.
   * @param emoji - Emoji character
   * @param messageId - Optional message id; if present, emoji becomes a reaction
   */
  addEmojiToMessageField(emoji: string, messageId?: string) {
    if (messageId) {
      const message = this.messages.find((m) => m.id === messageId);
      if (message) this.onReactionAdd(message, emoji);
    } else { this.insertEmojiIntoText(emoji) }
  }

  /**
   * Opens the per-message reaction picker UI for a given message.
   * @param msgId - Message id
   */
  openReactionPicker(msgId: string) { this.showReactionPicker[msgId] = true }
}
