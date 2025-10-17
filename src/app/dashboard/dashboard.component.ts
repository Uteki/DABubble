import { Component } from '@angular/core';
import {HeaderComponent} from "../shared/header/header.component";
import {ThreadComponent} from "./thread/thread.component";
import {ChannelsComponent} from "./channels/channels.component";
import {ChatComponent} from "./chat/chat.component";

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    HeaderComponent,
    ThreadComponent,
    ChannelsComponent,
    ChatComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent {
  selectedThreadId: string | null = null;

  onThreadSelected(id: string) {
    this.selectedThreadId = id;
  }
}
