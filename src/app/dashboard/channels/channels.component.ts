import { Component, OnInit } from '@angular/core';
import { UserService } from '../../user.service';
import { NgForOf, NgClass } from '@angular/common';
import { ChatService } from '../../chat.service';
import { StopPropagationDirective } from '../../stop-propagation.directive';

@Component({
  selector: 'app-channels',
  standalone: true,
  imports: [NgForOf, NgClass, StopPropagationDirective],
  templateUrl: './channels.component.html',
  styleUrl: './channels.component.scss',
})
export class ChannelsComponent implements OnInit {
  users: any[] = [];
  channels: any[] = [];
  directMessagesShown: boolean = true;
  directMessagesNone: boolean = false;
  overlayActivated: boolean = false;
  switchOverlay: boolean = true;
  selectedValue:string = 'all-members';

  constructor(
    private UserService: UserService,
    private chatService: ChatService
  ) {}

  ngOnInit(): void {
    this.UserService.getUser().subscribe((data) => {
      this.users = data;
    });

    this.chatService.getChannels().subscribe((data) => {
      this.channels = data;
    });
  }

  test(a: any) {
    //TODO
    console.log(a);
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
    this.overlayActivated = !this.overlayActivated;
  }

  onChange(event: Event) {
    let target = event.target as HTMLInputElement;
  

    if (target.value == 'all-members') {
      this.selectedValue = 'all-members'
       console.log(this.selectedValue);
    } else if (target.value == 'specific-members') {
          this.selectedValue = 'specific-members';     
    }
  }
}
