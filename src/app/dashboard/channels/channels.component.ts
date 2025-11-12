import {
  Component,
  ElementRef,
  EventEmitter,
  OnInit,
  Input,
  Output,
  ViewChild,
  SimpleChanges,
} from '@angular/core';
import { NgForOf, NgClass, NgIf } from '@angular/common';
import { ChatService } from '../../chat.service';
import { User } from '../../core/interfaces/user';
import { StopPropagationDirective } from '../../stop-propagation.directive';
import { AuthService } from '../../auth.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-channels',
  standalone: true,
  imports: [NgForOf, NgClass, StopPropagationDirective, NgIf, FormsModule],
  templateUrl: './channels.component.html',
  styleUrl: './channels.component.scss',
})
export class ChannelsComponent implements OnInit {
  @Output() partnerSelected = new EventEmitter<User>();
  @Output() toggleRequest = new EventEmitter<boolean>();

  @Input() users: any[] = [];

  @ViewChild('inputEl')
  inputEl!: ElementRef<HTMLInputElement>;

  selectedChannelUsers: any[] = [];
  foundIndexes: number[] = [];
  channelUsers: any[] = [];
  userAtIndex: any = {};
  channels: any[] = [];

  channelsShown: boolean = true;
  channelsNone: boolean = false;
  directMessagesShown: boolean = true;
  directMessagesNone: boolean = false;
  overlayActivated: boolean = false;
  switchOverlay: boolean = false;
  nameInputValue: boolean = false;
  inputFocused: boolean = false;

  newChannel: string = '';
  newChannelDescription: string = '';
  selectedValue: string = 'all-members';

  constructor(
    private chatService: ChatService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.chatService.getChannels().subscribe((data) => {
      const currentUser = this.authService.readCurrentUser();
      this.channels = data.filter((channel) =>
        channel.users?.includes(currentUser)
      );
    });
  }

ngOnChanges(changes: SimpleChanges) {
  if (changes['users'] && changes['users'].currentValue) {
    this.channelUsers = changes['users'].currentValue.map((u: User) => ({ ...u }));
    console.log(this.channelUsers);
    
  }
}

  async emitPartner(partnerUid: string) {
    const partnerObj: User = this.users.find((user) => user.uid === partnerUid);
    this.partnerSelected.emit(partnerObj);
    this.toggleRequest.emit(true);
  }

  async addMembers() {
    await this.chatService.searchUsers(this.chatService.currentChannelID);

    const usersToAdd =
      this.selectedValue !== 'all-members'
        ? this.selectedChannelUsers
        : this.users;
    const newUids = usersToAdd
      .map(user => user?.uid)
      .filter(uid => uid && !this.chatService.pendingUsers.includes(uid));

    this.chatService.pendingUsers.push(...newUids);

    await this.chatService.addUsers(
      this.chatService.currentChannelID,
      this.chatService.pendingUsers
    );
    this.chatService.pendingUsers = [];
  }

  swapChannel(id: any, name: string, description: string, creator: string) {
    this.chatService.setCurrentChat(id, name, description, creator);
    this.toggleRequest.emit(false);
  }

  toggleDirectMessages() {
    this.directMessagesShown = !this.directMessagesShown;
    this.directMessagesNone = false;
    if (!this.directMessagesShown) {
      setTimeout(() => {
        this.directMessagesNone = true;
      }, 300);
    }
  }

  toggleChannels() {
    this.channelsShown = !this.channelsShown;
    this.channelsNone = false;
    if (!this.channelsShown) {
      setTimeout(() => {
        this.channelsNone = true;
      }, 10);
    }
  }

  toggleOverlay() {
    this.overlayActivated = !this.overlayActivated;
  }

  onChange(event: Event) {
    let target = event.target as HTMLInputElement;

    if (target.value == 'all-members') {
      this.selectedValue = 'all-members';
    } else if (target.value == 'specific-members') {
      this.selectedValue = 'specific-members';
    }
  }

  onInputChange(value: string) {
    if (value.length > 0) {
      this.foundIndexes = this.channelUsers
        .map((user, index) =>
          user?.name && user.name.toLowerCase().includes(value.toLowerCase())
            ? index
            : -1
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

  createNewChannel() {
    if (this.newChannel.length > 0) {
      const currentUid = this.authService.readCurrentUser();
      const currentUser = this.users.find((user) => user.uid === currentUid);

      this.chatService
        .createChannel({
          creator: currentUser.name,
          description: this.newChannelDescription,
          name: this.newChannel,
          users: [currentUser.uid],
        })
        .then(() => {
          this.newChannelDescription = '';
          this.newChannel = '';
        });
    }
  }
}
