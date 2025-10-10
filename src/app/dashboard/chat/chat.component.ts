import {Component, OnInit} from '@angular/core';
import {FormsModule} from "@angular/forms";
import {ChatService} from "../../chat.service";
import { NgClass } from '@angular/common';


@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [
    FormsModule,
    NgClass
],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.scss'
})
export class ChatComponent implements OnInit {
  messages: any[] = [];
  messageText: string = '';
  overlayActivated: boolean = false;
  channelOverlay: boolean = false;
  viewMemberOverlay: boolean = false;
  addMemberOverlay: boolean = false;

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

  overlayFunction(darkOverlay: boolean, overlay: string, overlayBoolean: boolean ) {
    this.overlayActivated = darkOverlay;
    if (overlay == "Entwicklung") {
      this.channelOverlay = overlayBoolean;
    } else if (overlay == "Mitglieder") {
      this.viewMemberOverlay = overlayBoolean;
    } else if (overlay == "Hinzufügen") {
      this.addMemberOverlay == overlayBoolean;
    }
  }
}
