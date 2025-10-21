import { Component, OnInit } from '@angular/core';
import { UserService } from '../../user.service';
import { NgForOf, NgClass } from '@angular/common';
import {ChatService} from "../../chat.service";

@Component({
  selector: 'app-channels',
  standalone: true,
  imports: [NgForOf, NgClass],
  templateUrl: './channels.component.html',
  styleUrl: './channels.component.scss',
})
export class ChannelsComponent implements OnInit {
  users: any[] = [];
  channels: any[] = [];
  directMessagesShown: boolean = true;
  directMessagesNone: boolean = false;

  constructor(private UserService: UserService, private chatService: ChatService) {}

  ngOnInit(): void {
    this.UserService.getUser().subscribe((data) => {
      this.users = data;
    });

    this.chatService.getChannels().subscribe((data) => {
      this.channels = data;
    })
  }

  swapChannel(id: any) {
    this.chatService.setCurrentChat(id);
  }

  toggleDirectMessages() {
    this.directMessagesShown = !this.directMessagesShown;
    this.directMessagesNone = false;
    if (this.directMessagesShown == false) {
      setTimeout(() => {
        this.directMessagesNone = true;
      }, 300);
    }
  }

  toggleOverlay() {
    
  }
}
