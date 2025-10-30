import {
  Component,
  ElementRef,
  EventEmitter,
  OnInit,
  Input,
  Output,
  ViewChild,
} from '@angular/core';
import { NgForOf, NgClass, NgIf } from '@angular/common';
import { UserService } from '../../user.service';
import { ChatService } from '../../chat.service';
import { User } from '../../core/interfaces/user';
import { StopPropagationDirective } from '../../stop-propagation.directive';

@Component({
  selector: 'app-channels',
  standalone: true,
  imports: [NgForOf, NgClass, StopPropagationDirective, NgIf],
  templateUrl: './channels.component.html',
  styleUrl: './channels.component.scss',
})
export class ChannelsComponent implements OnInit {
  @Output() partnerSelected = new EventEmitter<User>();
  @ViewChild('inputEl')
  inputEl!: ElementRef<HTMLInputElement>;  @Input() users: any[] = [];
 
  channels: any[] = [];
  directMessagesShown: boolean = true;
  directMessagesNone: boolean = false;
  overlayActivated: boolean = false;
  switchOverlay: boolean = false;
  selectedValue: string = 'all-members';
  nameInputValue: boolean = false;
  foundIndexes: number[] = [];
  channelUsers: any[] = [];
  selectedChannelUsers: any[] = [];
  userAtIndex: any = {};
  inputFocused: boolean = false;

  constructor(
    private UserService: UserService,
    private chatService: ChatService
  ) {}

  ngOnInit(): void {
    this.UserService.getUser().subscribe((data) => {
      this.users = data;
      this.getUsers();
    });

    this.chatService.getChannels().subscribe((data) => {
      this.channels = data;
    });
  }

  getUsers() {
    console.log(this.users);

    this.channelUsers = this.users.map((user) => ({ ...user }));
  }

  async emitPartner(partnerUid: string) {
    const partnerObj: User = this.users.find((user) => user.uid === partnerUid);
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
      this.selectedValue = 'all-members';
      console.log(this.selectedValue);
    } else if (target.value == 'specific-members') {
      this.selectedValue = 'specific-members';
    }
  }

  onInputChange(value: string) {
    if (value.length > 0) {
      this.foundIndexes = this.users
        .map((user, index) =>
          user.name.toLowerCase().includes(value.toLowerCase()) ? index : -1
        )
        .filter((index) => index !== -1);

      this.nameInputValue = this.foundIndexes.length > 0;
    } else {
      this.nameInputValue = false;
      this.foundIndexes = [];
    }
  }

  addUserToChannel(index: number) {
    let memberInputREF = document.getElementById(
      'member-input'
    ) as HTMLInputElement;
    this.userAtIndex = this.channelUsers[index];
    this.selectedChannelUsers.push(this.userAtIndex);
    this.channelUsers.splice(index, 1);
    this.nameInputValue = false;
    memberInputREF.value = '';
    console.log(this.users);
  }

  onDivClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (target === event.currentTarget) {
      this.inputEl.nativeElement.focus();
    }
  }

  deleteMember(index: number) {
    this.userAtIndex = this.selectedChannelUsers[index];
    this.channelUsers.push(this.userAtIndex);
    this.selectedChannelUsers.splice(index, 1);
  }

  onFocus() {
    this.inputFocused = true;
  }

  onBlur() {
    this.inputFocused = false;
  }
}
