import {
  Component,
  EventEmitter,
  Input,
  OnChanges, OnInit,
  Output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../chat.service';
import { DatePipe, NgClass, NgForOf, NgIf } from '@angular/common';
import { User } from '../../core/interfaces/user';
import { BroadcastRecipient } from '../../core/type/recipient';
import { ReactionsComponent } from './../../shared/reactions/reactions.component';
import { AuthService } from '../../auth.service';

type ReactionsMap = Record<string, string[]>;

interface Message {
  id?: string;
  uid: string;
  user?: string;
  text: string;
  timestamp: number;
  reactions?: ReactionsMap;
}

@Component({
  selector: 'app-broadcast',
  standalone: true,
  imports: [FormsModule, DatePipe, NgForOf, NgIf, NgClass, ReactionsComponent],
  templateUrl: './broadcast.component.html',
  styleUrl: './broadcast.component.scss',
})
export class BroadcastComponent implements OnInit{
  @Output() toggleRequest = new EventEmitter<boolean>();

  @Input() messageId!: string | null;
  @Input() users: any[] = [];

  today = new Date();
  messageText: string = '';

  rootMessage: Message | null = null;

  sendingState: 'idle' | 'loading' | 'success' = 'idle';
  recipients: BroadcastRecipient[] = [];

  messages: Message[] = [];
  channels: any[] = [];

  showPicker = false;
  pickerEmojis = ['😀', '👍', '🎉', '❤️', '😊', '🙏', '🚀', '🤔', '😅', '🔥'];

  private wasEmpty = true;

  public Object = Object;

  constructor(
    private chatService: ChatService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.chatService.getChannels(this.authService.readCurrentUser()).subscribe((data) => {
      const uid = this.authService.readCurrentUser();
      this.channels = data
        .filter(channel =>
          channel.users?.includes(uid) || channel.id === 'DALobby'
        )
        .sort((a, b) =>
          a.id === 'DALobby' ? -1 :
            b.id === 'DALobby' ? 1 :
              0
        );
    });
  }

  get meId() {
    return this.authService.readCurrentUser();
  }

  insertEmojiIntoText(e: string) {
    this.messageText = (this.messageText || '') + e;
  }


  async sendBroadcastMessage() {
    console.log(this.channels);
    return

    this.recipients = [
      { type: 'channel', channelId: 'DALobby', name: 'DALobby' },
      {
        type: 'user',
        partnerChat:
          'PB1KgqARUrMiIHdLq3GI1Mip3un2_wXzxp0ORtVbWptur9onPxNz0Uen1',
        name: 'Denzel Leinad',
        mail: 'denzelleinad@gmail.com',
      },
      // { type: 'mail', mail: 'test@example.com' }
    ];

    const logger: User = this.users.find(
      (user) => user.uid === this.authService.readCurrentUser()
    );
    if (!this.messageText.trim() || this.recipients.length === 0) return;
    this.sendingState = 'loading';

    await this.chatService.sendBroadcastMessage(this.recipients, {
      uid: logger.uid,
      text: this.messageText,
      user: logger.name,
      timestamp: Date.now(),
      reaction: {},
    });

    this.sendingState = 'success';
    this.messageText = '';

    setTimeout(() => {
      this.sendingState = 'idle';
    }, 2000);
  }

  onInputChange(value: string) {
    const searchResultsContacts = document.getElementById(
      'search-broadcast-contacts'
    );
    const searchResultsChannels = document.getElementById(
      'search-broadcast-channels'
    );
    if (this.wasEmpty && value.length > 0) {
      this.searchBar(value);
      this.wasEmpty = false;
    }
    if (value.length === 0) {
      this.wasEmpty = true;
      searchResultsContacts?.classList.add('no-display');
      searchResultsChannels?.classList.add('no-display');
    }
  }

   searchBar(value: string) {
    const searchResultsContacts = document.getElementById(
      'search-broadcast-contacts'
    );
    const searchResultsChannels = document.getElementById(
      'search-broadcast-channels'
    );
    if (value === '@') {
      searchResultsContacts?.classList.remove('no-display');
    } else if (value === '#') {
      searchResultsChannels?.classList.remove('no-display');
    }
  }
}
