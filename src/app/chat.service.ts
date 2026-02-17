import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject, tap } from 'rxjs';
import { Channel } from './core/interfaces/channel';
import { ChatMessage } from './core/interfaces/chat-message';
import { GlobalSearchResult } from './core/interfaces/global-search-result';
import { ChatApiService } from './chat-api.service';

/**
 * ChatService
 *
 * Facade + UI state holder for chat.
 *
 * This service sits **above** {@link ChatApiService} and provides:
 * - UI-focused state (selected chat/channel metadata)
 * - reactive signals for components ({@link currentChat$}, {@link destroy$})
 * - light side effects (e.g. auto-select DALobby / first channel)
 * - in-memory caching for message streams
 *
 * It should **not** contain raw Firestore queries/writes; those belong in {@link ChatApiService}.
 */
@Injectable({ providedIn: 'root' })
export class ChatService {

  /** Display name/title of the currently selected chat (e.g. channel name). */
  currentChat: any = '';

  /** Internal id/path of the currently selected conversation (channelId or whisperId). */
  currentChannel: any = '';

  /** Creator name of the currently selected channel (if applicable). */
  currentCreator: string = '';

  /** Description of the currently selected channel (if applicable). */
  currentDescription: string = '';

  /**
   * Emits whenever the current chat selection changes.
   * Components can subscribe to update UI state.
   */
  currentChat$ = new BehaviorSubject(this.currentChat);

  /**
   * External cancel/destroy signal used by components.
   * Typical use: complete/tear down streams when switching chats.
   */
  destroy$ = new Subject<void>();

  /** Convenience: currently selected channel id (used across components). */
  currentChannelID: string = '';

  /** Temporary buffer used when editing channel membership. */
  pendingUsers: any[] = [];

  /** Optional UI state placeholder for channel member lists. */
  usersInChannel: any[] = [];

  /**
   * In-memory cache of message lists per conversation id.
   * Key: channelId, Value: latest emitted messages.
   */
  messageCache: Record<string, any[]> = {};

  /**
   * @param api Firestore-only API layer used for all reads/writes.
   */
  constructor(private api: ChatApiService) {}

  /**
   * Updates the currently selected chat metadata and notifies subscribers.
   *
   * @param chat Conversation id (channelId or whisperId).
   * @param name Display name shown in UI.
   * @param description Channel description (if applicable).
   * @param creator Channel creator (if applicable).
   */
  setCurrentChat(chat: any, name: string, description: string, creator: string) {
    this.currentChat = name;
    this.currentChannel = chat;
    this.currentCreator = creator;
    this.currentDescription = description;
    this.currentChat$.next(chat);
  }

  /**
   * Sends the same message to multiple recipients (channels and/or users).
   *
   * Delegates to {@link ChatApiService.sendBroadcastMessage}.
   *
   * @param recipients List of recipients.
   * @param message Message payload.
   */
  sendBroadcastMessage(recipients: any, message: { uid: string; text: string; user: string; timestamp: number; reaction: any }) {
    return this.api.sendBroadcastMessage(recipients, message);
  }

  /**
   * Updates thread metadata (reply count + last timestamp) on a root message.
   *
   * @param channelId Channel id.
   * @param threadId Root message id.
   * @param amount Reply count.
   * @param last Timestamp of most recent reply.
   */
  messageThreaded(channelId: string, threadId: string, amount: number, last: number) {
    return this.api.messageThreaded(channelId, threadId, amount, last);
  }

  /**
   * Creates a new channel and updates local selected channel id.
   *
   * @param fields Channel payload.
   * @returns The created Firestore document reference.
   */
  async createChannel(fields: { creator: string; description: string; name: string; users: any }) {
    const docRef = await this.api.createChannel(fields);
    this.currentChannelID = docRef.id;
    return docRef;
  }

  /**
   * Loads the channel user list into {@link pendingUsers}.
   *
   * @param channelId Channel id.
   */
  async searchUsers(channelId: string) {
    this.pendingUsers = await this.api.getChannelUsers(channelId);
  }

  /**
   * Adds users to a channel (and writes join system messages), via API.
   *
   * @param channelId Channel id.
   * @param users Users to add.
   * @param current Current user uid.
   * @param systemMsg System message template.
   */
  async addUsers(channelId: string, users: any[], current: any, systemMsg: { user: string; system: boolean; timestamp: number }) {
    await this.api.addUsers(channelId, users, current, systemMsg);
  }

  /**
   * Adds a new user to the lobby channel and posts a system message.
   *
   * @param user User object.
   * @param systemMsg System message payload.
   */
  addNewUser(user: any, systemMsg: { user: string; system: boolean; timestamp: number }) {
    return this.api.addNewUserToLobby(user, systemMsg);
  }

  /**
   * Leaves a channel and clears {@link pendingUsers} afterwards.
   *
   * @param lastUser Leaving user's uid.
   * @param channelId Channel id.
   * @param systemMsg System message payload.
   */
  async leaveChannel(lastUser: string, channelId: string, systemMsg: { user: string; system: boolean; timestamp: number }) {
    await this.api.leaveChannel(lastUser, channelId, systemMsg);
    this.pendingUsers = [];
  }

  /**
   * Adds/removes a reaction on a channel message.
   *
   * @param channelId Channel id.
   * @param messageId Message id.
   * @param emoji Emoji key.
   * @param add `true` add, `false` remove.
   * @param userId Current user uid.
   */
  reactChannelMessage(channelId: string, messageId: string, emoji: string, add: boolean, userId: string) {
    return this.api.reactChannelMessage(channelId, messageId, emoji, add, userId);
  }

  /**
   * Adds/removes a reaction on a whisper/DM message.
   *
   * @param whisperId Whisper id.
   * @param messageId Message id.
   * @param emoji Emoji key.
   * @param add `true` add, `false` remove.
   * @param userId Current user uid.
   */
  reactWhisperMessage(whisperId: string, messageId: string, emoji: string, add: boolean, userId: string) {
    return this.api.reactWhisperMessage(whisperId, messageId, emoji, add, userId);
  }

  /**
   * Adds/removes a reaction on a thread message.
   *
   * @param channelId Channel id.
   * @param threadId Root message id.
   * @param messageId Thread message id.
   * @param emoji Emoji key.
   * @param add `true` add, `false` remove.
   * @param userId Current user uid.
   */
  reactThreadMessage(channelId: string, threadId: string, messageId: string, emoji: string, add: boolean, userId: string) {
    return this.api.reactThreadMessage(channelId, threadId, messageId, emoji, add, userId);
  }

  /**
   * Searches within a single conversation (channel or whisper).
   *
   * @param type Conversation type.
   * @param id Channel id or whisper id.
   * @param term Search term.
   */
  searchInConversation(type: 'channel' | 'user', id: string, term: string): Promise<ChatMessage[]> {
    return this.api.searchInConversation(type, id, term);
  }

  /**
   * Searches across many conversations (multiple channels + whispers).
   *
   * @param channelIds Channel ids to scan.
   * @param whisperIds Whisper ids to scan.
   * @param term Search term.
   */
  searchGlobally(channelIds: string[], whisperIds: string[], term: string): Promise<GlobalSearchResult[]> {
    return this.api.searchGlobally(channelIds, whisperIds, term);
  }

  /**
   * Sends a message to a channel.
   *
   * @param channelId Channel id.
   * @param message Message payload.
   */
  sendMessage(channelId: string, message: { uid: string; text: string; user: string; timestamp: number; reaction: any }) {
    return this.api.sendMessage(channelId, message);
  }

  /**
   * Sends a message to a whisper/DM conversation.
   *
   * @param whisperId Whisper id.
   * @param message Message payload.
   */
  sendWhisperMessage(whisperId: string, message: { uid: string; text: string; user: string; timestamp: number; reaction: any }) {
    return this.api.sendWhisperMessage(whisperId, message);
  }

  /**
   * Sends a message into a thread.
   *
   * @param channelId Channel id.
   * @param threadId Root message id.
   * @param message Message payload.
   */
  sendThreadMessage(channelId: string, threadId: string, message: { uid: string; text: string; user: string; timestamp: number; reaction: any }) {
    return this.api.sendThreadMessage(channelId, threadId, message);
  }

  /**
   * Returns a realtime stream of a channel document.
   *
   * @param channelId Channel id.
   */
  getChannelById(channelId: string): Observable<Channel | undefined> {
    return this.api.getChannelById(channelId);
  }

  /**
   * Returns the channels visible to the current user and keeps the original behavior:
   * - API filters channels
   * - Facade auto-selects the first channel (DALobby first) if nothing selected yet
   *
   * @param ownUid Current user uid.
   * @returns Observable of channels.
   */
  getChannels(ownUid: string): Observable<any[]> {
    return this.api.getChannels(ownUid).pipe(
      tap((filteredChannels) => {
        if (!this.currentChannel && filteredChannels.length > 0) {
          const sorted = [...filteredChannels].sort((a, b) =>
            a.id === 'DALobby' ? -1 : b.id === 'DALobby' ? 1 : 0
          );
          const first = sorted[0];
          this.setCurrentChat(first.id, first.name, first.description, first.creator);
          this.currentChannelID = first.id;
        }
      })
    );
  }

  /**
   * Returns realtime messages for a channel and stores the latest value in {@link messageCache}.
   *
   * @param channelId Channel id.
   * @returns Observable of messages.
   */
  getMessages(channelId: string): Observable<any[]> {
    return this.api.getMessages(channelId).pipe(
      tap((messages) => (this.messageCache[channelId] = messages))
    );
  }

  /**
   * Reads the last cached message list for a channel (if available).
   *
   * @param channelId Channel id.
   * @returns Cached messages or an empty array.
   */
  getCachedMessages(channelId: string): any[] {
    return this.messageCache[channelId] || [];
  }

  /**
   * Returns a realtime stream of a single channel message.
   *
   * @param channelId Channel id.
   * @param messageId Message id.
   */
  getChannelMessage(channelId: string, messageId: string): Observable<any> {
    return this.api.getChannelMessage(channelId, messageId);
  }

  /**
   * Returns realtime messages within a thread.
   *
   * @param channelId Channel id.
   * @param threadId Root message id.
   */
  getThreadMessage(channelId: string, threadId: string): Observable<any[]> {
    return this.api.getThreadMessage(channelId, threadId);
  }

  /**
   * Returns realtime messages for a whisper/DM conversation.
   *
   * @param whisperId Whisper id.
   */
  getWhisperMessage(whisperId: string): Observable<any[]> {
    return this.api.getWhisperMessage(whisperId);
  }
}
