import {Injectable} from "@angular/core";
import {User} from "../../core/interfaces/user";
import {AuthService} from "../../auth.service";
import {ActionService} from "../../action.service";
import {ChatService} from "../../chat.service";
import { MentionService } from "../../mention.service";
import {doc} from "firebase/firestore";
import {Firestore, updateDoc} from "@angular/fire/firestore";

@Injectable()
export class ChatControllerService {
  messages: any[] = [];
  filteredUsers: any[] = [];
  filteredChannels: any[] = [];
  messageText: string = '';
  editingMessageText: string = '';
  showPicker: boolean = false;
  editMessageIsOpen: boolean = false;
  editingMessageId: string | null = null;
  editMessageMenuOpen: string | null = null;
  addEmojiToMessage: { [messageId: string]: string } = {};
  showReactionPicker: { [messageId: string]: boolean } = {};
  activeMention: { trigger: '@' | '#'; startIndex: number; endIndex: number; } | null = null;

  constructor(
    private firestore: Firestore,
    private authService: AuthService,
    private actionService: ActionService,
    private mentionService: MentionService,
    private chatService: ChatService
  ) {}

  get meId() { return this.authService.readCurrentUser() }

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

  async sendMessageExtension(logger: any) {
    const raw = (this.messageText || '').trim();
    const text = this.asciiToEmojiInText(raw);
    await this.chatService.sendMessage(this.chatService.currentChannel, {uid: logger.uid, text: text, user: logger.name, timestamp: Date.now(), reaction: {},});
    this.messageText = '';
  }

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

  insertEmojiIntoText(emoji: string) { this.messageText = this.actionService.emojiTextarea(emoji, this.messageText) }

  openReactionPicker(msgId: string) { this.showReactionPicker[msgId] = true }

  onReactionToggle(msg: any, ev: { emoji: string; add: boolean }) {
    this.actionService.emojiRow(msg, ev, this.meId)
    const channelId = this.chatService.currentChannel;
    if (!channelId || !msg?.id) return;
    this.chatService.reactChannelMessage(channelId, msg.id, ev.emoji, ev.add, this.meId).catch(console.error);
  }

  onReactionAdd(msg: any, emoji: string) {
    if (!emoji) return;
    this.onReactionToggle(msg, { emoji, add: true });
  }

  addEmojiToMessageField(emoji: string, messageId?: string) {
    if (messageId) {
      const message = this.messages.find((m) => m.id === messageId);
      if (message) { this.onReactionAdd(message, emoji) }
    } else { this.insertEmojiIntoText(emoji) }
  }

  hoverMessage(messageId: string, messageUid: string, event?: MouseEvent) {
    this.actionService.hoverOnFocus(messageId, messageUid, this.meId, event);
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
    const upcoming = this.actionService.beginEdit(messageId, this.messages, this.meId);
    if (!upcoming) return;
    this.editingMessageId = upcoming.editingMessageId; this.editingMessageText = upcoming.editingMessageText;
    this.editMessageMenuOpen = upcoming.editMessageMenuOpen; this.editMessageIsOpen = upcoming.editMessageIsOpen;
    this.actionService.highlightOwnMessage(messageId);
  }

  cancelEdit() {
    if (this.editingMessageId) {
      const messageElement = document.getElementById('message-text-' + this.editingMessageId);
      if (messageElement) messageElement.classList.remove('hovered-own-message')
    }
    this.editingMessageId = null;
    this.editingMessageText = '';
    this.editMessageIsOpen = false;
  }

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

  resetMentionUI() {
    document.getElementById('search-chat-members')?.classList.add('no-display');
    document.getElementById('search-chat-channels')?.classList.add('no-display');
    this.filteredUsers = [];
    this.filteredChannels = [];
    this.activeMention = null;
  }

  setActiveMention(mention: any) {
    this.activeMention = { trigger: mention.trigger, startIndex: mention.startIndex, endIndex: mention.endIndex };
  }

  handleUserMention(mention: any, users: any) {
    this.filteredUsers = this.mentionService.filterUsers(mention.query, users);
    if (this.filteredUsers.length === 0) return;
    document.getElementById('search-chat-members')?.classList.remove('no-display');
  }

  handleChannelMention(mention: any, channels: any) {
    this.filteredChannels = this.mentionService.filterChannels(mention.query, channels);
    if (this.filteredChannels.length === 0) return;
    document.getElementById('search-chat-channels')?.classList.remove('no-display');
  }

  getLargeAvatar(avatarPath: string | undefined): string {
    if (!avatarPath) return 'assets/avatars/profile.png';
    return avatarPath.replace('avatarSmall', 'avatar');
  }

  private asciiToEmojiInText(s: string): string { return this.actionService.toEmoji(s) }
}
