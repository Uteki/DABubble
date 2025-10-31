import {
  Component,
  ElementRef,
  EventEmitter,
  OnInit,
  Input,
  Output,
  ViewChild,
  HostBinding,
} from '@angular/core';
import { NgForOf, NgClass, NgIf } from '@angular/common';
import { UserService } from '../../user.service';
import { ChatService } from '../../chat.service';
import { User } from '../../core/interfaces/user';
import { StopPropagationDirective } from '../../stop-propagation.directive';
import { SidebarService } from '../../sidebar.service';

@Component({
  selector: 'app-channels',
  standalone: true,
  imports: [NgForOf, NgClass, StopPropagationDirective, NgIf],
  templateUrl: './channels.component.html',
  styleUrls: ['./channels.component.scss'],
})
export class ChannelsComponent implements OnInit {
  @Output() partnerSelected = new EventEmitter<User>();
  @ViewChild('inputEl') inputEl!: ElementRef<HTMLInputElement>;
  @Input() users: any[] = [];
  @Output() toggleRequest = new EventEmitter<boolean>();

  channels: any[] = [];
  directMessagesShown = true;
  directMessagesNone = false;
  overlayActivated = false;
  switchOverlay = false;
  selectedValue = 'all-members';
  nameInputValue = false;
  foundIndexes: number[] = [];
  channelUsers: any[] = [];
  selectedChannelUsers: any[] = [];
  userAtIndex: any = {};
  inputFocused = false;

  sidebarOpen = true;

  @HostBinding('class.closed')
  get closed() {
    return !this.sidebarOpen;
  }

  constructor(
    private userService: UserService,
    private chatService: ChatService,
    private sidebarService: SidebarService
  ) {}

  ngOnInit(): void {
    this.userService.getUser().subscribe((data) => {
      this.users = data;
      this.getUsers();
    });

    this.chatService.getChannels().subscribe((data) => {
      this.channels = data;
    });

    if ((this.sidebarService as any).sidebarOpen$) {
      (this.sidebarService as any).sidebarOpen$.subscribe((open: boolean) => {
        this.sidebarOpen = open;
      });
    } else if ((this.sidebarService as any).isOpen instanceof Function) {
      this.sidebarOpen = (this.sidebarService as any).isOpen();
    } else if ((this.sidebarService as any).menuOpen !== undefined) {
      this.sidebarOpen = (this.sidebarService as any).menuOpen;
    }
  }

  toggleMenu() {
    if (typeof (this.sidebarService as any).toggleSidebar === 'function') {
      (this.sidebarService as any).toggleSidebar();
      if (typeof (this.sidebarService as any).isOpen === 'function') {
        this.sidebarOpen = (this.sidebarService as any).isOpen();
      }
    } else if ((this.sidebarService as any).menuOpen !== undefined) {
      (this.sidebarService as any).menuOpen = !(this.sidebarService as any).menuOpen;
      this.sidebarOpen = (this.sidebarService as any).menuOpen;
    } else {
      this.sidebarOpen = !this.sidebarOpen;
    };
  }

  toggleOverlay() {
    this.overlayActivated = !this.overlayActivated;
  }

  toggleDirectMessages() {
    this.directMessagesShown = !this.directMessagesShown;
    this.directMessagesNone = !this.directMessagesShown;
    if (!this.directMessagesShown) {
      setTimeout(() => (this.directMessagesNone = true), 300);
    }
  }

  getUsers() {
    this.channelUsers = this.users.map((user) => ({ ...user }));
  }

  async emitPartner(partnerUid: string) {
    const partnerObj: User = this.users.find((user) => user.uid === partnerUid);
    this.partnerSelected.emit(partnerObj);
  }

  swapChannel(id: any, name: string) {
    this.chatService.setCurrentChat(id, name);
  }

  onChange(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target.value === 'all-members') {
      this.selectedValue = 'all-members';
    } else if (target.value === 'specific-members') {
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
    const memberInputREF = document.getElementById('member-input') as HTMLInputElement;
    this.userAtIndex = this.channelUsers[index];
    this.selectedChannelUsers.push(this.userAtIndex);
    this.channelUsers.splice(index, 1);
    this.nameInputValue = false;
    if (memberInputREF) {
      memberInputREF.value = '';
    }
  }

  onDivClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (target === event.currentTarget && this.inputEl) {
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
