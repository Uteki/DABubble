import {Injectable} from "@angular/core";
import {User} from "../../core/interfaces/user";
import {AuthService} from "../../auth.service";
import {ActionService} from "../../action.service";
import {ChatService} from "../../chat.service";

@Injectable()
export class ChatControllerService {
  messages: any[] = [];
  messageText: string = '';

  constructor(
    private authService: AuthService,
    private actionService: ActionService,
    private chatService: ChatService
  ) {}

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

  private asciiToEmojiInText(s: string): string { return this.actionService.toEmoji(s) }
}
