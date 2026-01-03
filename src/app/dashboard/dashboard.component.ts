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
import { AuthService } from '../auth.service';
import { Subscription } from 'rxjs';
import { MentionService } from "../mention.service";

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
  channelList: any[] = [];

  chat = false;
  thread = true;
  direct = true;
  broadcast = true;

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
    private chatService: ChatService,
    private authService: AuthService,
    private mentionService: MentionService
  ) {}

  ngOnInit() {
    this.subs.add(this.userService.getUser().subscribe((data) => { this.userList = data }));

    this.chatService.getChannels(this.authService.readCurrentUser()).subscribe((data) => {
      const uid = this.authService.readCurrentUser();
      this.channelList = data.filter(channel => channel.users?.includes(uid) || channel.id === 'DALobby')
        .sort((a, b) => a.id === 'DALobby' ? -1 : b.id === 'DALobby' ? 1 : 0);
    });

    this.globalScopeToggle()
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
    this.broadcast = true;
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

  toggleBroadcast() {
    this.broadcast = false;

    this.thread = true;
    this.threadHidden = true;
    this.isThreadOpening = false;
    this.isThreadClosing = false;

    this.direct = true;
    this.chat = true;

    this.isOpening = false;
    this.isClosing = false;
  }

  globalScopeToggle() {
    this.mentionService.partnerSelected$.subscribe(user => this.onPartnerSelected(user));
    this.mentionService.toggleRequest$.subscribe(b => this.toggleThread(b));
    this.mentionService.toggleRequestDirect$.subscribe(b => this.toggleDirect(b));
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
