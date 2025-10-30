import {Component, OnInit} from '@angular/core';
import { HeaderComponent } from '../shared/header/header.component';
import { ThreadComponent } from './thread/thread.component';
import { ChannelsComponent } from './channels/channels.component';
import { ChatComponent } from './chat/chat.component';
import { MessageComponent } from './message/message.component';
import { UserService } from "../user.service";
import { User } from '../core/interfaces/user';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    HeaderComponent,
    ThreadComponent,
    ChannelsComponent,
    ChatComponent,
    MessageComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  userList: any[] = [];

  selectedThreadId: string | null = null;
  selectedPartner: User | null = null;

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
}
