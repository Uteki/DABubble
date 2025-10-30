import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import { NgForOf, NgClass } from '@angular/common';
import { UserService } from '../../user.service';
import { ChatService } from '../../chat.service';
import { User } from '../../core/interfaces/user';
import { StopPropagationDirective } from '../../stop-propagation.directive';

@Component({
  selector: 'app-channels',
  standalone: true,
  imports: [NgForOf, NgClass, StopPropagationDirective],
  templateUrl: './channels.component.html',
  styleUrl: './channels.component.scss',
})
export class ChannelsComponent implements OnInit {
  @Output() partnerSelected = new EventEmitter<User>();
  @Input() users: any[] = [];

  channels: any[] = [];
  directMessagesShown: boolean = true;
  directMessagesNone: boolean = false;
  overlayActivated: boolean = false;
  switchOverlay: boolean = false;
  selectedValue:string = 'all-members';
  nameInputValue:boolean = false;

  constructor(
    private UserService: UserService,
    private chatService: ChatService
  ) {}

  ngOnInit(): void {
    this.chatService.getChannels().subscribe((data) => {
      this.channels = data;
    });
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

  onInputChange(value: string) {
  if (value.length > 0) {
    this.nameInputValue= true;
  } else {
      this.nameInputValue= false;
  }
}
}
