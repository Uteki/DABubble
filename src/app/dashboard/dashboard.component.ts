import { Component, OnInit, OnDestroy } from '@angular/core';
import { HeaderComponent } from '../shared/header/header.component';
import { ThreadComponent } from './thread/thread.component';
import { ChannelsComponent } from './channels/channels.component';
import { BroadcastComponent } from "./broadcast/broadcast.component";
import { MessageComponent } from './message/message.component';
import { ChatComponent } from './chat/chat.component';
import { UserService } from '../user.service';
import { User } from '../core/interfaces/user';
import { ChatService } from '../chat.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    HeaderComponent,
    ThreadComponent,
    ChannelsComponent,
    ChatComponent,
    MessageComponent,
    BroadcastComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit, OnDestroy {
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

  private subs = new Subscription();

  constructor(
    private userService: UserService,
    private chatService: ChatService
  ) {}

  ngOnInit() {
    this.subs.add(
      this.userService.getUser().subscribe((data) => {
        this.userList = data;
      })
    );

    this.subs.add(
      this.chatService.currentChat$.subscribe((channelId) => {
        if (channelId) {
          this.openThreadPane();
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  onThreadSelected(id: string) {
    this.selectedThreadId = id;
    this.openThreadPane();
  }

  onPartnerSelected(obj: User) {
    this.selectedPartner = obj;
  }

  toggleThread($event: boolean) {
    this.thread = !$event;

    if ($event) {
      this.openThreadPane();
    } else {
      this.closeThreadPane();
    }
  }

  toggleDirect($event: boolean) {
    this.chat = $event;
    this.thread = true;
    this.direct = !$event;
    if ($event === false) {
      this.openThreadPane();
    }
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

  private openThreadPane() {
    this.thread = false;
    if (!this.threadHidden) return;
    this.isThreadOpening = true;
    this.isThreadClosing = false;
    this.threadHidden = false;
    setTimeout(() => (this.isThreadOpening = false), 420);
  }

  private closeThreadPane() {
    this.thread = true;
    if (this.threadHidden) return;
    this.isThreadClosing = true;
    this.isThreadOpening = false;
    this.threadHidden = true;
    setTimeout(() => (this.isThreadClosing = false), 420);
  }
}
