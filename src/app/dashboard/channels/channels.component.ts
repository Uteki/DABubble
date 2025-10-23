import {Component, EventEmitter, OnInit, Output} from '@angular/core';
import { NgForOf, NgClass } from '@angular/common';
import { UserService } from '../../user.service';
import { ChatService } from '../../chat.service';
import { User } from '../../core/interfaces/user';

@Component({
  selector: 'app-channels',
  standalone: true,
  imports: [NgForOf, NgClass],
  templateUrl: './channels.component.html',
  styleUrl: './channels.component.scss',
})
export class ChannelsComponent implements OnInit {
  @Output() partnerSelected = new EventEmitter<User>();

  users: any[] = [];
  channels: any[] = [];
  directMessagesShown: boolean = true;
  directMessagesNone: boolean = false;
  overlayActivated: boolean = false;

  constructor(private UserService: UserService, private chatService: ChatService) {}

  ngOnInit(): void {
    this.UserService.getUser().subscribe((data) => {
      this.users = data;
    });

    this.chatService.getChannels().subscribe((data) => {
      this.channels = data;
    })
  }

  async emitPartner(partnerUid: string) {
    const partnerObj: User = this.users.find(user => user.uid === partnerUid);
    this.partnerSelected.emit(partnerObj);
  }

  swapChannel(id: any, name: string) {
    this.chatService.setCurrentChat(id, name);
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
