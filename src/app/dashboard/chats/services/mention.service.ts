import { Injectable } from '@angular/core';
import { Subject } from "rxjs";
import { ChatService } from "./chat.service";
import { User } from "../../../core/interfaces/user";

/**
 * MentionService
 *
 * Central service handling:
 * - Click interactions on mentions inside messages
 * - Navigation to channels or direct messages
 * - Mention parsing while typing
 * - Mention filtering (users / channels)
 *
 * Used by:
 * - Message renderer / linkify output
 * - Chat input mention autocomplete
 * - Global navigation between chats
 */
@Injectable({ providedIn: 'root' })
export class MentionService {

  /**
   * Emits when a user mention is clicked
   * → Used to open direct message chats
   */
  private partnerSelectedSubject = new Subject<User>();

  /**
   * Emits toggle requests for switching
   * between channel chat and direct chat
   */
  private toggleRequestDirectSubject = new Subject<boolean>();

  /** Observable stream for selected partner events */
  partnerSelected$ = this.partnerSelectedSubject.asObservable();

  /** Observable stream for chat toggle requests */
  toggleRequestDirect$ = this.toggleRequestDirectSubject.asObservable();

  /**
   * @param chatService - Handles chat state + navigation
   */
  constructor(private chatService: ChatService) {}

  /**
   * Handles click events on mention elements.
   *
   * Detects whether the clicked mention is:
   * - A channel → opens channel chat
   * - A user → opens direct message
   *
   * @param event - Mouse click event
   * @param users - Available users for lookup
   */
  mentionClick(event: MouseEvent, users: User[] = []) {
    const el = (event.target as HTMLElement)?.closest('.mention') as HTMLElement;
    if (!el) return;

    const { type, id, uid } = el.dataset;
    /** Extract visible mention name */
    const name = ((event.target as HTMLElement | null)?.textContent ?? '').replace(/^#/, '').trim();
    /** Channel mention clicked */
    if (type === 'channel' && id) this.mentionChannel(id, name)
    /** User mention clicked */
    if (type === 'user' && uid) {
      const user = users.find(u => u.uid === uid);
      if (user) this.mentionUser(user);
    }
  }

  /**
   * Opens a mentioned channel.
   *
   * Updates current chat state and
   * switches UI to channel mode.
   *
   * @param channelId - Channel identifier
   * @param name - Channel display name
   */
  mentionChannel(channelId: string, name: string) {
    this.chatService.currentChannelID = channelId;
    this.chatService.setCurrentChat(channelId, name, '', '');

    /** Ensure direct chat view is closed */
    this.toggleRequestDirectSubject.next(false);
  }

  /**
   * Opens a direct message chat
   * with the mentioned user.
   *
   * @param user - Target user object
   */
  mentionUser(user: User) {
    this.partnerSelectedSubject.next(user);

    /** Switch UI into direct message mode */
    this.toggleRequestDirectSubject.next(true);
  }

  /**
   * Parses mention trigger while typing.
   *
   * Detects active mention queries like:
   * - "@john"
   * - "#general"
   *
   * Supports up to 2 words:
   * - "@john doe"
   *
   * @param value - Full input text
   * @param cursor - Current cursor position
   *
   * @returns Mention parsing result or null
   */
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

  /**
   * Filters users for mention autocomplete.
   *
   * Uses "startsWith" matching.
   *
   * @param query - Search query
   * @param users - Available users
   *
   * @returns Filtered user list
   */
  filterUsers(query: string, users: any[]) {
    const q = query.toLowerCase();
    return users.filter(u =>
      u.name?.toLowerCase().startsWith(q)
    );
  }

  /**
   * Filters channels for mention autocomplete.
   *
   * Uses "startsWith" matching.
   *
   * @param query - Search query
   * @param channels - Available channels
   *
   * @returns Filtered channel list
   */
  filterChannels(query: string, channels: any[]) {
    const q = query.toLowerCase();
    return channels.filter(c =>
      c.name?.toLowerCase().startsWith(q)
    );
  }
}

