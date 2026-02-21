import { Injectable } from "@angular/core";
import { User } from "../../../../core/interfaces/user";
import { AuthService } from "../../../../core/services/auth.service";
import { ActionService } from "../../services/action.service";
import { ChatService } from "../../services/chat.service";
import { MentionService } from "../../services/mention.service";
import { doc } from "firebase/firestore";
import { Firestore, updateDoc } from "@angular/fire/firestore";

/**
 * ChatControllerService
 *
 * Component-scoped controller for the channel chat view.
 *
 * Responsibilities:
 * - Holds chat UI state that would otherwise bloat the component (composer text, edit mode, pickers, mentions).
 * - Executes common chat actions (send message, reactions, edit message).
 * - Provides helper methods for mention suggestions and simple avatar helpers.
 *
 * Notes:
 * - This service is intended to be provided at component level (e.g. `providers: [ChatControllerService]`)
 *   to avoid sharing state across multiple chat instances.
 * - Some methods touch the DOM directly (e.g. `document.getElementById(...)`), which keeps the component
 *   template simple but couples the service to browser UI. If you want to unit test this easily, pass
 *   element refs in or move DOM manipulation back to the component.
 */
@Injectable()
export class ChatControllerService {
  /** Currently displayed messages for the active channel (sorted by timestamp). */
  messages: any[] = [];
  /** Mention suggestion results for "@". */
  filteredUsers: any[] = [];
  /** Mention suggestion results for "#". */
  filteredChannels: any[] = [];
  /** Current composer text for the channel message textarea. */
  messageText: string = '';
  /** Temporary buffer used while editing an existing message. */
  editingMessageText: string = '';
  /** Whether the emoji picker for the composer is visible. */
  showPicker: boolean = false;
  /** Whether the "edit message" UI is open. */
  editMessageIsOpen: boolean = false;
  /** Message id currently being edited (if any). */
  editingMessageId: string | null = null;
  /** Message id whose "more/options" context menu is currently open (if any). */
  editMessageMenuOpen: string | null = null;
  /**
   * Optional per-message emoji state used by the UI (e.g., temporary selection).
   * Keyed by message id.
   */
  addEmojiToMessage: { [messageId: string]: string } = {};
  /**
   * Per-message reaction picker visibility state.
   * Keyed by message id.
   */
  showReactionPicker: { [messageId: string]: boolean } = {};
  /**
   * Active mention information for the composer.
   * - trigger: "@" or "#"
   * - startIndex/endIndex: range of the mention token in `messageText`
   */
  activeMention: { trigger: '@' | '#'; startIndex: number; endIndex: number; } | null = null;

  constructor(
    private firestore: Firestore,
    private authService: AuthService,
    private actionService: ActionService,
    private mentionService: MentionService,
    private chatService: ChatService
  ) {}

  /**
   * Current authenticated user's uid.
   * Used for reaction ownership, edit permissions, and message hover styling.
   */
  get meId() { return this.authService.readCurrentUser() }

  /**
   * Sends the current composer message to the active channel.
   *
   * Behavior:
   * - Validates logged-in user and non-empty input.
   * - Checks if the user is still a member of the channel before sending.
   * - If not a member, appends a local warning message instead of sending.
   *
   * @param users - Full user list used to resolve the current user (name/uid).
   */
  async sendMessage(users: User[]): Promise<void> {
    const currentUserId = this.authService.readCurrentUser();
    const logger: User | undefined = users.find((user) => user.uid === currentUserId);
    if (!logger) return;
    if (!this.messageText.trim()) return;
    await this.chatService.searchUsers(this.chatService.currentChannel);
    const isMember = this.chatService.pendingUsers.includes(currentUserId);
    if (!isMember) {
      this.messages.push({
        uid: logger.uid, text: '⚠️ Sie können in diesem Kanal keine Nachrichten mehr senden.', user: logger.name, timestamp: Date.now(),
      }); return;
    } await this.sendMessageExtension(logger);
  }

  /**
   * Internal send helper that converts ASCII emoticons to emojis and writes to Firestore.
   * Resets the composer afterwards.
   *
   * @param logger - Current user object used as message author.
   */
  async sendMessageExtension(logger: any) {
    const raw = (this.messageText || '').trim();
    const text = this.asciiToEmojiInText(raw);
    await this.chatService.sendMessage(this.chatService.currentChannel, {uid: logger.uid, text: text, user: logger.name, timestamp: Date.now(), reaction: {},});
    this.messageText = '';
  }

  /**
   * Persists an edited message to Firestore and closes edit mode.
   *
   * @param messageId - Firestore message document id to update.
   */
  async saveEditedMessage(messageId: string) {
    if (!this.editingMessageText.trim()) return;
    const messageRef = doc(
      this.firestore,
      `channels/${this.chatService.currentChannel}/messages/${messageId}`
    );
    await updateDoc(messageRef, {
      text: this.editingMessageText.trim(),
      edited: true,
    }); this.cancelEdit();
  }

  /**
   * Inserts an emoji into the composer text at the current caret selection.
   * Delegates caret-aware insertion to {@link ActionService.emojiTextarea}.
   *
   * @param emoji - Emoji character to insert.
   */
  insertEmojiIntoText(emoji: string) { this.messageText = this.actionService.emojiTextarea(emoji, this.messageText) }

  /**
   * Opens the reaction picker for a specific message.
   *
   * @param msgId - Message id whose picker should open.
   */
  openReactionPicker(msgId: string) { this.showReactionPicker[msgId] = true }

  /**
   * Toggles a reaction on a message and persists it through {@link ChatService}.
   *
   * - Updates the local `msg.reactions` structure.
   * - Writes the reaction change to Firestore.
   *
   * @param msg - Message object being reacted to (must contain `id` for persistence).
   * @param ev - Reaction event payload.
   */
  onReactionToggle(msg: any, ev: { emoji: string; add: boolean }) {
    this.actionService.emojiRow(msg, ev, this.meId)
    const channelId = this.chatService.currentChannel;
    if (!channelId || !msg?.id) return;
    this.chatService.reactChannelMessage(channelId, msg.id, ev.emoji, ev.add, this.meId).catch(console.error);
  }

  /**
   * Convenience wrapper to add a reaction (instead of toggling add/remove manually).
   *
   * @param msg - Message object to react to.
   * @param emoji - Emoji character to add as reaction.
   */
  onReactionAdd(msg: any, emoji: string) {
    if (!emoji) return;
    this.onReactionToggle(msg, { emoji, add: true });
  }

  /**
   * Adds an emoji either as a reaction to a message OR into the composer,
   * depending on whether a `messageId` is provided.
   *
   * @param emoji - Emoji character to add.
   * @param messageId - Optional message id. If provided, emoji becomes a reaction.
   */
  addEmojiToMessageField(emoji: string, messageId?: string) {
    if (messageId) {
      const message = this.messages.find((m) => m.id === messageId);
      if (message) { this.onReactionAdd(message, emoji) }
    } else { this.insertEmojiIntoText(emoji) }
  }

  /**
   * Applies hover styling to a message bubble depending on ownership.
   * Delegates logic to {@link ActionService.hoverOnFocus}.
   *
   * @param messageId - Message id used to locate the DOM element.
   * @param messageUid - Author uid of the message.
   * @param event - Optional mouse event used to ignore hover on menu interactions.
   */
  hoverMessage(messageId: string, messageUid: string, event?: MouseEvent) {
    this.actionService.hoverOnFocus(messageId, messageUid, this.meId, event);
  }

  /**
   * Removes hover styling from a message bubble.
   *
   * @param messageId - Message id used to locate the DOM element.
   */
  leaveMessage(messageId: string) {
    const messageElement = document.getElementById('message-text-' + messageId);
    if (messageElement) {
      messageElement.classList.remove('hovered-message');
      messageElement.classList.remove('hovered-own-message');
    }
  }

  /**
   * Toggles the per-message context menu used for edit actions.
   *
   * @param messageId - Message id whose menu should toggle.
   * @param event - Click event; propagation is stopped to avoid outside click handlers closing it immediately.
   */
  toggleEditMessageMenu(messageId: string, event: Event) {
    event.stopPropagation();
    if (this.editMessageMenuOpen === messageId) {
      this.editMessageMenuOpen = null;
    } else {
      this.editMessageMenuOpen = messageId;
    }
  }

  /**
   * Starts editing a message if the current user is the author.
   * Delegates permission and state computation to {@link ActionService.beginEdit}.
   *
   * @param messageId - Target message id to edit.
   */
  editMessage(messageId: string) {
    const upcoming = this.actionService.beginEdit(messageId, this.messages, this.meId);
    if (!upcoming) return;
    this.editingMessageId = upcoming.editingMessageId; this.editingMessageText = upcoming.editingMessageText;
    this.editMessageMenuOpen = upcoming.editMessageMenuOpen; this.editMessageIsOpen = upcoming.editMessageIsOpen;
    this.actionService.highlightOwnMessage(messageId);
  }

  /**
   * Cancels edit mode and resets edit state.
   * Also removes the "editing highlight" class from the message element (if present).
   */
  cancelEdit() {
    if (this.editingMessageId) {
      const messageElement = document.getElementById('message-text-' + this.editingMessageId);
      if (messageElement) messageElement.classList.remove('hovered-own-message')
    }
    this.editingMessageId = null;
    this.editingMessageText = '';
    this.editMessageIsOpen = false;
  }

  /**
   * Inserts a selected mention into the composer and updates caret position.
   * Uses {@link ActionService.testInsertMention} to compute the resulting text and cursor.
   *
   * @param name - Mention display name to insert (without the trigger).
   * @param textarea - The composer textarea element (used to set value + caret).
   */
  insertMention(name: string, textarea: HTMLTextAreaElement) {
    const res = this.actionService.testInsertMention(name, this.messageText, this.activeMention);
    if (!res) return;
    this.messageText = res.nextText;
    textarea.value = res.nextText;
    textarea.setSelectionRange(res.nextCursor, res.nextCursor);
    textarea.focus();
    this.activeMention = null;
    document.getElementById('search-chat-members')?.classList.add('no-display');
    document.getElementById('search-chat-channels')?.classList.add('no-display');
  }

  /**
   * Clears mention suggestion UI and resets mention state.
   * Hides suggestion containers and empties filtered result arrays.
   */
  resetMentionUI() {
    document.getElementById('search-chat-members')?.classList.add('no-display');
    document.getElementById('search-chat-channels')?.classList.add('no-display');
    this.filteredUsers = [];
    this.filteredChannels = [];
    this.activeMention = null;
  }

  /**
   * Stores the active mention metadata (trigger and indices).
   *
   * @param mention - Parsed mention object from {@link MentionService.parseMention}.
   */
  setActiveMention(mention: any) {
    this.activeMention = { trigger: mention.trigger, startIndex: mention.startIndex, endIndex: mention.endIndex };
  }

  /**
   * Filters user mention suggestions and shows the corresponding suggestion UI.
   *
   * @param mention - Parsed mention object containing the query.
   * @param users - User list to search within.
   */
  handleUserMention(mention: any, users: any) {
    this.filteredUsers = this.mentionService.filterUsers(mention.query, users);
    if (this.filteredUsers.length === 0) return;
    document.getElementById('search-chat-members')?.classList.remove('no-display');
  }

  /**
   * Filters channel mention suggestions and shows the corresponding suggestion UI.
   *
   * @param mention - Parsed mention object containing the query.
   * @param channels - Channel list to search within.
   */
  handleChannelMention(mention: any, channels: any) {
    this.filteredChannels = this.mentionService.filterChannels(mention.query, channels);
    if (this.filteredChannels.length === 0) return;
    document.getElementById('search-chat-channels')?.classList.remove('no-display');
  }

  /**
   * Returns a large avatar path variant (replaces `avatarSmall` with `avatar`).
   *
   * @param avatarPath - Original avatar path (usually small).
   * @returns Large avatar path or a default placeholder.
   */
  getLargeAvatar(avatarPath: string | undefined): string {
    if (!avatarPath) return 'assets/avatars/profile.png';
    return avatarPath.replace('avatarSmall', 'avatar');
  }

  /**
   * Converts ASCII emoticons in text into their emoji equivalents.
   * Delegates to {@link ActionService.toEmoji}.
   *
   * @param s - Raw text.
   */
  private asciiToEmojiInText(s: string): string { return this.actionService.toEmoji(s) }
}
