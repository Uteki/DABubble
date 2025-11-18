import {Component, EventEmitter, Input, OnChanges, Output} from '@angular/core';
import {FormsModule} from "@angular/forms";
import {ChatService} from "../../chat.service";
import {DatePipe, NgClass, NgForOf, NgIf} from "@angular/common";
import {User} from "../../core/interfaces/user";
import {AuthService} from "../../auth.service";

@Component({
  selector: 'app-thread',
  standalone: true,
  imports: [
    FormsModule,
    DatePipe,
    NgForOf,
    NgIf,
    NgClass
  ],
  templateUrl: './thread.component.html',
  styleUrl: './thread.component.scss'
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

  constructor(private chatService: ChatService, private authService: AuthService) {}

  async sendMessage() {
    const logger: User = this.users.find(user => user.uid === this.authService.readCurrentUser());
    if (!this.messageText.trim() || this.messageId === null) return;

    await this.chatService.sendThreadMessage(`${this.currentThread}`, `${this.messageId}`, {
      uid: logger.uid, text: this.messageText, user: logger.name, timestamp: Date.now(),
    });
    await this.chatService.messageThreaded(`${this.currentThread}`, `${this.messageId}`, this.messages.length - 1, Date.now())

    this.messageText = '';
  }

  ngOnChanges() {
    if (this.messageId) {
      this.currentThread = this.chatService.currentChannel;
      this.stableThread = this.chatService.currentChat;

      this.chatService.getThreadMessage(`${this.chatService.currentChannel}`, this.messageId).subscribe(messages => {
        this.messages = messages.sort((a:any, b:any) => a.timestamp - b.timestamp);
      });
    }
  }

  getProfilePic(uid: string) {
    return this.users.find(user => user.uid === uid).avatar || 'assets/avatars/profile.png'
  }

  getUserId() {
    return this.authService.readCurrentUser();
  }

  closeThread() {
    this.toggleRequest.emit(false);
  }
}
