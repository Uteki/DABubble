import {Component, OnInit} from '@angular/core';
import {FormsModule} from "@angular/forms";
import {ChatService} from "../../chat.service";

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [
    FormsModule
  ],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.scss'
})
export class ChatComponent implements OnInit {
  messages: any[] = [];
  messageText: string = '';

  constructor(private chatService: ChatService) {}

  ngOnInit(): void {
    this.chatService.getMessages('general').subscribe(messages => {
      this.messages = messages;
    });
  }

  async sendMessage() {
    if (!this.messageText.trim()) return;

    await this.chatService.sendMessage('general', {
      text: this.messageText,
      //TODO: bind it with user logger
      user: 'Daniel',
      timestamp: Date.now(),
    });

    this.messageText = '';
  }
}
