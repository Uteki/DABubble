import {Injectable} from "@angular/core";
import {User} from "../../core/interfaces/user";
import {AuthService} from "../../auth.service";
import {ActionService} from "../../action.service";
import {ChatService} from "../../chat.service";

@Injectable()
export class ChatControllerService {
  messages: any[] = [];
  messageText: string = '';

  showReactionPicker: { [messageId: string]: boolean } = {};
  addEmojiToMessage: { [messageId: string]: string } = {};
  showPicker = false;

  constructor(
    private authService: AuthService,
    private actionService: ActionService,
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

  private asciiToEmojiInText(s: string): string { return this.actionService.toEmoji(s) }
}
