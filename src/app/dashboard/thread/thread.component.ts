import {Component, Input, OnChanges} from '@angular/core';
import {FormsModule} from "@angular/forms";
import {ChatService} from "../../chat.service";
import {DatePipe, NgClass, NgForOf, NgIf} from "@angular/common";

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
  @Input() messageId!: string | null;

  today = new Date();
  messageText: string = '';
  messages: any[] = [];

  constructor(private chatService: ChatService) {}

  async sendMessage() {
    if (!this.messageText.trim()) return;

    await this.chatService.sendThreadMessage(`${this.chatService.currentChat}`, `${this.messageId}`, {
      text: this.messageText,
      //TODO: bind it with user logger
      user: 'Daniel Tran',
      timestamp: Date.now(),
    });

    this.messageText = '';
  }

  ngOnChanges() {
    if (this.messageId) {
      this.chatService.getThreadMessage(`${this.chatService.currentChat}`, this.messageId).subscribe(messages => {
        this.messages = messages.sort((a:any, b:any) => a.timestamp - b.timestamp);
      });
    }
  }
}
