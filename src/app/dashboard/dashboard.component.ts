import { Component, OnInit } from '@angular/core';
import { HeaderComponent } from '../shared/header/header.component';
import { ThreadComponent } from './thread/thread.component';
import { ChannelsComponent } from './channels/channels.component';
import { ChatComponent } from './chat/chat.component';
import { MessageComponent } from './message/message.component';
import { UserService } from '../user.service';
import { User } from '../core/interfaces/user';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    HeaderComponent,
    ThreadComponent,
    ChannelsComponent,
    ChatComponent,
    MessageComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit {
  userList: any[] = [];

  chat = false;
  thread = true;
  direct = true;

  selectedThreadId: string | null = null;
  selectedPartner: User | null = null;

  channelsHidden = false;
  isClosing = false;
  isOpening = false;

  threadHidden = true;
  isThreadOpening = false;
  isThreadClosing = false;

  constructor(private userService: UserService) {}

  ngOnInit() {
    this.userService.getUser().subscribe((data) => {
      this.userList = data;
    });
  }

  onThreadSelected(id: string) {
    this.selectedThreadId = id;
  }

  onPartnerSelected(obj: User) {
    this.selectedPartner = obj;
  }

  toggleThread($event: boolean) {
    this.thread = !$event;
    if (this.threadHidden) {
      this.isThreadOpening = true;
      this.isThreadClosing = false;
      this.threadHidden = false;
      setTimeout(() => (this.isThreadOpening = false), 420);
    } else {
      this.isThreadClosing = true;
      this.isThreadOpening = false;
      this.threadHidden = true;
      setTimeout(() => (this.isThreadClosing = false), 420);
    }
  }

  toggleDirect($event: boolean) {
    this.chat = $event;
    this.thread = true;
    this.direct = !$event;
  }

  toggleChannels() {
    if (this.channelsHidden) {
      this.isOpening = true;
      this.isClosing = false;
      this.channelsHidden = false;
      setTimeout(() => {
        this.isOpening = false;
      }, 420);
    } else {
      this.isClosing = true;
      this.isOpening = false;
      this.channelsHidden = true;
      setTimeout(() => {
        this.isClosing = false;
      }, 420);
    }
  }
}
