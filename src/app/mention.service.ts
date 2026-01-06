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

  parseMention(value: string, cursor: number) {
    const before = value.slice(0, cursor);
    const lastAt = before.lastIndexOf('@');
    const lastHash = before.lastIndexOf('#');
    const triggerIndex = Math.max(lastAt, lastHash);

    if (triggerIndex === -1) return null
    const trigger = before[triggerIndex] as '@' | '#';
    if (triggerIndex > 0 && !/\s/.test(before[triggerIndex - 1])) return null
    const rawQuery = before.slice(triggerIndex + 1);
    const trimmed = rawQuery.trim();
    const parts = trimmed.split(/\s+/).filter(Boolean);
    if (parts.length > 2) return null;

    return { trigger, rawQuery, query: trimmed, startIndex: triggerIndex, endIndex: cursor }
  }

  filterUsers(query: string, users: any[]) {
    const q = query.toLowerCase();
    return users.filter(u =>
      u.name?.toLowerCase().startsWith(q)
    );
  }

  filterChannels(query: string, channels: any[]) {
    const q = query.toLowerCase();
    return channels.filter(c =>
      c.name?.toLowerCase().startsWith(q)
    );
  }
}

