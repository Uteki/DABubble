import { Injectable } from '@angular/core';
import { Subject } from "rxjs";
import { ChatService } from "./chat.service";
import { User } from "./core/interfaces/user";

@Injectable({ providedIn: 'root' })
export class MentionService {

  private partnerSelectedSubject = new Subject<User>();
  private toggleRequestDirectSubject = new Subject<boolean>();

  partnerSelected$ = this.partnerSelectedSubject.asObservable();
  toggleRequestDirect$ = this.toggleRequestDirectSubject.asObservable();

  constructor(private chatService: ChatService) {}

  mentionClick(event: MouseEvent, users: User[] = []) {
    const el = (event.target as HTMLElement)?.closest('.mention') as HTMLElement;
    if (!el) return;

    const { type, id, uid } = el.dataset;
    const name = ((event.target as HTMLElement | null)?.textContent ?? '').replace(/^#/, '').trim();

    if (type === 'channel' && id) this.mentionChannel(id, name)

    if (type === 'user' && uid) {
      const user = users.find(u => u.uid === uid);
      if (user) this.mentionUser(user);
    }
  }

  mentionChannel(channelId: string, name: string) {
    this.chatService.currentChannelID = channelId;
    this.chatService.setCurrentChat(channelId, name, '', '');

    this.toggleRequestDirectSubject.next(false);
  }

  mentionUser(user: User) {
    this.partnerSelectedSubject.next(user);
    this.toggleRequestDirectSubject.next(true);
  }
}

