import { Injectable } from '@angular/core';
import { Firestore, collection, addDoc, collectionData, orderBy, query, getDoc, updateDoc, deleteDoc, writeBatch, getDocs, docData } from '@angular/fire/firestore';
import { doc, arrayUnion, setDoc, deleteField } from 'firebase/firestore';
import { map, Observable } from 'rxjs';
import { Channel } from './core/interfaces/channel';
import { ChatMessage } from './core/interfaces/chat-message';
import { GlobalSearchResult } from './core/interfaces/global-search-result';

/**
 * ChatApiService
 *
 * Firestore-only API layer for chat data access.
 *
 * **Important:** This service should not contain UI/state logic (selected chat, caching, animations, etc.).
 * It is meant to be the "data gateway" used by a higher-level facade/service (e.g. `ChatService`).
 *
 * Responsibilities:
 * - Send messages (channel, whisper/DM, thread)
 * - Broadcast sending to multiple recipients
 * - Channel lifecycle helpers (create, add users, leave/delete)
 * - Reactions (add/remove) for channel/whisper/thread messages
 * - Search in a conversation and globally across many conversations
 * - Read streams (channels, messages, single message, thread, whisper)
 */
@Injectable({ providedIn: 'root' })
export class ChatApiService {

  /**
   * @param firestore AngularFire Firestore instance used for all reads/writes.
   */
  constructor(private firestore: Firestore) {}

  /**
   * Sends a message into a channel conversation.
   * @param channelId Firestore channel document id.
   * @param message Message payload to write into `channels/{channelId}/messages`.
   * @returns Promise that resolves with the created Firestore document reference.
   */
  sendMessage(channelId: string, message: { uid: string; text: string; user: string; timestamp: number; reaction: any }) {
    const messagesRef = collection(this.firestore, `channels/${channelId}/messages`);
    return addDoc(messagesRef, message);
  }

  /**
   * Sends a message into a whisper/DM conversation.
   * @param whisperId Whisper conversation id (e.g. partnerChat id).
   * @param message Message payload to write into `whispers/{whisperId}/messages`.
   * @returns Promise that resolves with the created Firestore document reference.
   */
  sendWhisperMessage(whisperId: string, message: { uid: string; text: string; user: string; timestamp: number; reaction: any }) {
    const messagesRef = collection(this.firestore, `whispers/${whisperId}/messages`);
    return addDoc(messagesRef, message);
  }

  /**
   * Sends a message into a thread under a root channel message.
   * @param channelId Channel id.
   * @param threadId Root message id of the thread.
   * @param message Message payload to write into `channels/{channelId}/messages/{threadId}/thread`.
   * @returns Promise that resolves with the created Firestore document reference.
   */
  sendThreadMessage(channelId: string, threadId: string, message: { uid: string; text: string; user: string; timestamp: number; reaction: any }) {
    const messagesRef = collection(this.firestore, `channels/${channelId}/messages/${threadId}/thread`);
    return addDoc(messagesRef, message);
  }

  /**
   * Sends the same message to multiple recipients.
   * Supported recipient shapes:
   * - `{ type: 'channel', channelId: string }`
   * - `{ type: 'user', partnerChat: string }`
   * @param recipients List of recipients (channels + users).
   * @param message Message payload to send.
   */
  async sendBroadcastMessage(recipients: any, message: { uid: string; text: string; user: string; timestamp: number; reaction: any }) {
    for (const r of recipients) {
      if (r.type === 'channel') await this.sendMessage(r.channelId, message);
      if (r.type === 'user') await this.sendWhisperMessage(r.partnerChat, message);
    }
  }

  /**
   * Updates thread metadata on a root channel message.
   * Storage model on root message:
   * `threaded: { amount: number, last: number }`
   * @param channelId Channel id.
   * @param threadId Root message id.
   * @param amount Reply count.
   * @param last Timestamp (ms) of the most recent reply.
   */
  async messageThreaded(channelId: string, threadId: string, amount: number, last: number) {
    const ref = doc(this.firestore, `channels/${channelId}/messages/${threadId}`);
    await setDoc(ref, { threaded: { amount, last } }, { merge: true });
  }

  /**
   * Creates a new channel document in `channels`.
   * @param fields Channel payload.
   * @returns Promise that resolves with the created Firestore document reference.
   */
  async createChannel(fields: { creator: string; description: string; name: string; users: any }) {
    const channelsRef = collection(this.firestore, 'channels');
    return await addDoc(channelsRef, fields);
  }

  /**
   * Reads the current `users` array from a channel document.
   * @param channelId Channel id.
   * @returns Promise resolving to the channel's users array (empty if missing).
   */
  async getChannelUsers(channelId: string): Promise<any[]> {
    const channelRef = doc(this.firestore, 'channels', channelId);
    const snap = await getDoc(channelRef);
    return (snap.data()?.['users'] || []) as any[];
  }

  /**
   * Adds/sets users on a channel and writes join system messages for added users.
   * Notes:
   * - Deduplicates uid list.
   * - Writes system message for each added user (except current user).
   * @param channelId Channel id.
   * @param users Users to set (uid strings or objects containing `uid` and `name`).
   * @param currentUid Current user uid.
   * @param systemMsg System message template used for join logs.
   */
  async addUsers(channelId: string, users: any[], currentUid: string, systemMsg: { user: string; system: boolean; timestamp: number }) {
    const channelRef = doc(this.firestore, 'channels', channelId);
    const messagesRef = collection(this.firestore, `channels/${channelId}/messages`);
    const uidList = Array.from(
      new Set(users.map((u) => String(u?.uid ?? u).trim()).filter((uid) => uid !== ''))
    );
    users.forEach((user: any) => {
      if (user.uid && user.uid !== currentUid) {
        addDoc(messagesRef, {
          user: user.name + systemMsg.user, system: systemMsg.system, timestamp: systemMsg.timestamp,
        });
      }});
    await updateDoc(channelRef, { users: uidList });
  }

  /**
   * Adds a new user to the default lobby channel (`DALobby`) and posts a system message.
   * @param user User object containing at least `uid` and `name`.
   * @param systemMsg System message template payload.
   */
  async addNewUserToLobby(user: any, systemMsg: { user: string; system: boolean; timestamp: number }) {
    const channelRef = doc(this.firestore, 'channels', 'DALobby');
    const messagesRef = collection(this.firestore, `channels/DALobby/messages`);
    await addDoc(messagesRef, {user: systemMsg.user + user.name + '!', system: systemMsg.system, timestamp: systemMsg.timestamp,});
    await updateDoc(channelRef, { users: arrayUnion(user.uid) });
  }

  /**
   * Handles leaving a channel:
   * - Posts a system message.
   * - Fetches current user list.
   * - Deletes channel if last user, otherwise removes the leaving user.
   * @param lastUserUid UID of leaving user.
   * @param channelId Channel id.
   * @param systemMsg System message payload.
   */
  async leaveChannel(lastUserUid: string, channelId: string, systemMsg: { user: string; system: boolean; timestamp: number }) {
    const channelRef = doc(this.firestore, 'channels', channelId);
    const messagesRef = collection(this.firestore, `channels/${channelId}/messages`);
    await addDoc(messagesRef, systemMsg);
    const users = await this.getChannelUsers(channelId);
    await this.deleteOrRemoveUserFromChannel(lastUserUid, channelRef, messagesRef, users);
  }

  /**
   * Deletes a channel (and all its messages) if the leaving user was the last member.
   * Otherwise, removes the leaving user uid from the channel doc.
   * @param lastUserUid UID of leaving user.
   * @param channelRef Firestore doc ref for the channel.
   * @param messagesRef Firestore collection ref for the channel messages.
   * @param currentUsers Current user uid list from the channel.
   */
  private async deleteOrRemoveUserFromChannel(lastUserUid: string, channelRef: any, messagesRef: any, currentUsers: any[]) {
    if (currentUsers.length <= 1 && currentUsers[0] === lastUserUid) {
      const messages = await getDocs(messagesRef);
      const batch = writeBatch(this.firestore);
      messages.forEach((m) => batch.delete(m.ref));
      await batch.commit();
      await deleteDoc(channelRef);
    } else {
      await updateDoc(channelRef, {
        users: currentUsers.filter((uid) => uid !== lastUserUid && !!uid),
      });
    }
  }

  /**
   * Adds/removes a reaction on a channel message.
   * @param channelId Channel id.
   * @param messageId Message id.
   * @param emoji Emoji key.
   * @param add `true` to add, `false` to remove.
   * @param userId Current user uid.
   */
  async reactChannelMessage(channelId: string, messageId: string, emoji: string, add: boolean, userId: string): Promise<void> {
    const ref = doc(this.firestore, `channels/${channelId}/messages/${messageId}`);
    return this.writeReactionSafe(ref, emoji, add, userId);
  }

  /**
   * Adds/removes a reaction on a whisper/DM message.
   * @param whisperId Whisper conversation id.
   * @param messageId Message id.
   * @param emoji Emoji key.
   * @param add `true` to add, `false` to remove.
   * @param userId Current user uid.
   */
  async reactWhisperMessage(whisperId: string, messageId: string, emoji: string, add: boolean, userId: string): Promise<void> {
    const ref = doc(this.firestore, `whispers/${whisperId}/messages/${messageId}`);
    return this.writeReactionSafe(ref, emoji, add, userId);
  }

  /**
   * Adds/removes a reaction on a thread message.
   * @param channelId Channel id.
   * @param threadId Root message id.
   * @param messageId Thread message id.
   * @param emoji Emoji key.
   * @param add `true` to add, `false` to remove.
   * @param userId Current user uid.
   */
  async reactThreadMessage(channelId: string, threadId: string, messageId: string, emoji: string, add: boolean, userId: string): Promise<void> {
    const ref = doc(this.firestore, `channels/${channelId}/messages/${threadId}/thread/${messageId}`);
    return this.writeReactionSafe(ref, emoji, add, userId);
  }

  /**
   * Writes reaction updates safely for any message document.
   * Reaction storage model:
   * `reactions: { [emoji: string]: string[] }`
   * Behavior:
   * - If doc doesn't exist: creates it (only on add).
   * - Adds/removes `userId` in the emoji array.
   * - Deletes `reactions.{emoji}` when the resulting array is empty.
   * @param ref Firestore message doc reference.
   * @param emoji Emoji key.
   * @param add `true` to add, `false` to remove.
   * @param userId Current user uid.
   */
  private async writeReactionSafe(ref: ReturnType<typeof doc>, emoji: string, add: boolean, userId: string) {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      if (!add) return;
      await setDoc(ref, { reactions: { [emoji]: [userId] } }, { merge: true });
      return;
    }
    const data = snap.data() as any;
    const current: string[] = data?.reactions?.[emoji] ?? [];
    const next = add ? Array.from(new Set([...current, userId])) : current.filter((id) => id !== userId);
    if (next.length === 0) {
      await updateDoc(ref, { [`reactions.${emoji}`]: deleteField() });
    } else {
      await setDoc(ref, { reactions: { [emoji]: next } }, { merge: true });
    }
  }

  /**
   * Searches messages within a single conversation (channel or whisper).
   * Implementation detail:
   * - Loads all messages ordered by timestamp DESC
   * - Filters locally with `includes(term)`
   * @param type Conversation type.
   * @param id Channel id or whisper id.
   * @param term Search term.
   * @returns Promise of messages that match the term.
   */
  async searchInConversation(type: 'channel' | 'user', id: string, term: string): Promise<ChatMessage[]> {
    const basePath = type === 'channel' ? `channels/${id}/messages` : `whispers/${id}/messages`;
    const ref = collection(this.firestore, basePath);
    const q = query(ref, orderBy('timestamp', 'desc'));
    const snap = await getDocs(q);

    return snap.docs.map((d) => ({
        type, nativeId: id, id: d.id, ...(d.data() as Omit<ChatMessage, 'id'>),}))
      .filter((msg) => msg.text?.toLowerCase().includes(term.toLowerCase()));
  }

  /**
   * Searches globally across multiple channels and whispers.
   * @param channelIds Channel ids to scan.
   * @param whisperIds Whisper ids to scan.
   * @param term Search term.
   * @returns Promise of combined results (channels + whispers).
   */
  async searchGlobally(channelIds: string[], whisperIds: string[], term: string): Promise<GlobalSearchResult[]> {
    const lower = term.toLowerCase();
    const channelResults = await Promise.all(channelIds.map((id) => this.searchChannelMessages(id, lower)));
    const whisperResults = await Promise.all(whisperIds.map((id) => this.searchWhisperMessages(id, lower)));
    return [...channelResults.flat(), ...whisperResults.flat()];
  }

  /**
   * Searches all messages inside one channel and returns matches.
   * @param channelId Channel id.
   * @param lower Lowercased search term.
   */
  private async searchChannelMessages(channelId: string, lower: string): Promise<GlobalSearchResult[]> {
    const ref = collection(this.firestore, `channels/${channelId}/messages`);
    const snap = await getDocs(ref);
    return snap.docs.map((d) => {
        const data = d.data() as Omit<ChatMessage, 'id'>;
        return data.text?.toLowerCase().includes(lower) ? { id: d.id, ...data, channelId } : null;
      }).filter(Boolean) as GlobalSearchResult[];
  }

  /**
   * Searches all messages inside one whisper/DM and returns matches.
   * @param whisperId Whisper conversation id.
   * @param lower Lowercased search term.
   */
  private async searchWhisperMessages(whisperId: string, lower: string): Promise<GlobalSearchResult[]> {
    const ref = collection(this.firestore, `whispers/${whisperId}/messages`);
    const snap = await getDocs(ref);
    return snap.docs.map((d) => {
        const data = d.data() as Omit<ChatMessage, 'id'>;
        return data.text?.toLowerCase().includes(lower) ? { id: d.id, ...data, whisperId } : null;
      }).filter(Boolean) as GlobalSearchResult[];
  }

  /**
   * Returns a realtime stream of a channel document.
   * @param channelId Channel id.
   * @returns Observable emitting the channel document (or undefined if missing).
   */
  getChannelById(channelId: string): Observable<Channel | undefined> {
    const channelRef = doc(this.firestore, 'channels', channelId);
    return docData(channelRef, { idField: 'id' }) as Observable<Channel | undefined>;
  }

  /**
   * Returns a realtime stream of channels visible to the user.
   * Visibility rule:
   * - Member of the channel OR channel is `DALobby`
   * @param ownUid Current user uid.
   * @returns Observable of filtered channels list.
   */
  getChannels(ownUid: string): Observable<any[]> {
    const channelsRef = collection(this.firestore, 'channels');
    return collectionData(channelsRef, { idField: 'id' }).pipe(
      map((channels: any[]) => channels.filter((channel) =>
        (Array.isArray(channel.users) && channel.users.includes(ownUid)) || channel.id === 'DALobby'))) as Observable<any[]>;
  }

  /**
   * Returns realtime messages for a channel ordered ASC by timestamp.
   * @param channelId Channel id.
   * @returns Observable of channel messages.
   */

  getMessages(channelId: string): Observable<any[]> {
    const messagesRef = collection(this.firestore, `channels/${channelId}/messages`);
    const q = query(messagesRef, orderBy('timestamp', 'asc'));
    return collectionData(q, { idField: 'id' }) as Observable<any[]>;
  }

  /**
   * Returns a realtime stream of a single channel message.
   * @param channelId Channel id.
   * @param messageId Message id.
   * @returns Observable emitting the message document.
   */
  getChannelMessage(channelId: string, messageId: string): Observable<any> {
    const ref = doc(this.firestore, `channels/${channelId}/messages/${messageId}`);
    return docData(ref, { idField: 'id' }) as Observable<any>;
  }

  /**
   * Returns realtime messages within a thread ordered ASC by timestamp.
   * @param channelId Channel id.
   * @param threadId Root message id.
   * @returns Observable of thread messages.
   */
  getThreadMessage(channelId: string, threadId: string): Observable<any[]> {
    const messagesRef = collection(this.firestore, `channels/${channelId}/messages/${threadId}/thread`);
    const q = query(messagesRef, orderBy('timestamp', 'asc'));
    return collectionData(q, { idField: 'id' }) as Observable<any[]>;
  }

  /**
   * Returns realtime messages of a whisper/DM conversation ordered ASC by timestamp.
   * @param whisperId Whisper conversation id.
   * @returns Observable of whisper messages.
   */
  getWhisperMessage(whisperId: string): Observable<any[]> {
    const messagesRef = collection(this.firestore, `whispers/${whisperId}/messages`);
    const q = query(messagesRef, orderBy('timestamp', 'asc'));
    return collectionData(q, { idField: 'id' }) as Observable<any[]>;
  }
}
