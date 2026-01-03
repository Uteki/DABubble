import {EventEmitter, Injectable, Output} from '@angular/core';
import {Subject} from "rxjs";
import {ChatService} from "./chat.service";
import {User} from "./core/interfaces/user";

@Injectable({ providedIn: 'root' })
export class MentionService {

  private partnerSelectedSubject = new Subject<User>();
  private toggleRequestSubject = new Subject<boolean>();
  private toggleRequestDirectSubject = new Subject<boolean>();

  partnerSelected$ = this.partnerSelectedSubject.asObservable();
  toggleRequest$ = this.toggleRequestSubject.asObservable();
  toggleRequestDirect$ = this.toggleRequestDirectSubject.asObservable();

  constructor(private chatService: ChatService) {}

  mentionClick(event: MouseEvent, users: User[] = []) {
    const el = (event.target as HTMLElement)?.closest('.mention') as HTMLElement;
    if (!el) return;

    const type = el.dataset['type'];

    if (type === 'channel') {
      const channelId = el.dataset['id'];
      if (!channelId) return;

      this.chatService.destroy$.next();
      this.chatService.destroy$.complete();
      this.chatService.destroy$ = new Subject<void>();

      this.chatService.currentChannelID = channelId;
      this.chatService.setCurrentChat(channelId, '', '', '');

      this.toggleRequestSubject.next(false);
      this.toggleRequestDirectSubject.next(false);

    }

    if (type === 'user') {
      const uid = el.dataset['uid'];
      if (!uid) return;

      const user = users.find(u => u.uid === uid);
      if (!user) return;

      this.partnerSelectedSubject.next(user);
      this.toggleRequestDirectSubject.next(true);
    }
  }
}

