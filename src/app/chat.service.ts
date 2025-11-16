import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  addDoc,
  collectionData,
  orderBy,
  query,
  getDoc,
  updateDoc, deleteDoc, writeBatch, getDocs
} from '@angular/fire/firestore';
import { doc, arrayUnion } from 'firebase/firestore';
import {BehaviorSubject, map, Observable, Subject, tap} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  currentChat: any = '';
  currentChannel: any = '';
  currentCreator: string = '';
  currentDescription: string = '';

  currentChat$ = new BehaviorSubject(this.currentChat);
  destroy$ = new Subject<void>();

  currentChannelID: string = '';

  pendingUsers: any[] = [];
  usersInChannel: any[] = [];

  messageCache: Record<string, any[]> = {};

  constructor(private firestore: Firestore) {}

  setCurrentChat(chat: any, name: string, description: string, creator: string) {
    this.currentChat = name;
    this.currentChannel = chat;
    this.currentCreator = creator;
    this.currentDescription = description;
    this.currentChat$.next(chat);
  }

  sendMessage(channelId: string, message: {uid: string, text: string; user: string; timestamp: number }) {
    const messagesRef = collection(this.firestore, `channels/${channelId}/messages`);
    return addDoc(messagesRef, message);
  }

  sendWhisperMessage(channelId: string, message: {uid: string, text: string; user: string; timestamp: number }) {
    const messagesRef = collection(this.firestore, `whispers/${channelId}/messages`);
    return addDoc(messagesRef, message);
  }

  sendThreadMessage(channelId: string, threadId: string, message: {uid: string, text: string; user: string; timestamp: number }) {
    const messagesRef = collection(this.firestore, `channels/${channelId}/messages/${threadId}/thread`);
    return addDoc(messagesRef, message);
  }

  async createChannel(fields: { creator: string; description: string; name: string; users: any }) {
    const channelsRef = collection(this.firestore, 'channels');
    const docRef = await addDoc(channelsRef, fields);
    this.currentChannelID = docRef.id;
    return docRef;
  }

  async searchUsers(channelId: string ) {
    const channelRef = doc(this.firestore, 'channels', channelId);
    const snapshot = await getDoc(channelRef);

    this.pendingUsers = [];
    this.pendingUsers.push(...(snapshot.data()?.['users'] || []));
  }

  async addUsers(channelId: string, users: any[], current: any, systemMsg: { user: string, system: boolean, timestamp: number }) {
    const channelRef = doc(this.firestore, 'channels', channelId);
    const messagesRef = collection(this.firestore, `channels/${channelId}/messages`);
    const uidList = Array.from(new Set(users.map(u => String(u?.uid ?? u).trim()).filter(uid => uid !== '')));
    users.forEach((user: any) => {
      if (user.uid && user.uid !== current) {
        addDoc(messagesRef, { user: user.name + systemMsg.user, system: systemMsg.system, timestamp: systemMsg.timestamp,});
      }
    })
    await updateDoc(channelRef, { users: uidList });
  }

  async addNewUser(user: any, systemMsg: { user: string, system: boolean, timestamp: number }) {
    const channelRef = doc(this.firestore, 'channels', 'DALobby');
    const messagesRef = collection(this.firestore, `channels/DALobby/messages`);

    await addDoc(messagesRef, { user: systemMsg.user + user.name + '!', system: systemMsg.system, timestamp: systemMsg.timestamp });
    await updateDoc(channelRef, {
      users: arrayUnion(user.uid)
    });
  }

  async leaveChannel(lastUser: string, channelId: string, systemMsg: { user: string, system: boolean, timestamp: number }) {
    const channelRef = doc(this.firestore, 'channels', channelId);
    const messagesRef = collection(this.firestore, `channels/${channelId}/messages`);
    await addDoc(messagesRef, systemMsg);
    await this.searchUsers(this.currentChannel);
    await this.deleteChannel(lastUser, channelRef, messagesRef);
  }

  async deleteChannel(lastUser: string, channelRef: any, messagesRef: any) {
    if (this.pendingUsers.length <= 1 && this.pendingUsers[0] === lastUser) {
      const messages = await getDocs(messagesRef);
      const batch = writeBatch(this.firestore);
      messages.forEach((m) => batch.delete(m.ref));
      await batch.commit();
      await deleteDoc(channelRef);
    } else {
      await updateDoc(channelRef, {users: this.pendingUsers.filter(uid => uid !== lastUser && !!uid)});
    }
    this.pendingUsers = [];
  }

  getChannels(ownUid: string): Observable<any[]> {
    const channelsRef = collection(this.firestore, 'channels');
    return collectionData(channelsRef, { idField: 'id' }).pipe(
      map((channels: any[]) => channels.filter(channel =>
          (Array.isArray(channel.users) && channel.users.includes(ownUid)) || channel.id === 'DALobby'
        )),
      tap(filteredChannels => {
        if (!this.currentChannel && filteredChannels.length > 0) {
          filteredChannels = filteredChannels.sort((a, b) =>
            a.id === 'DALobby' ? -1 : b.id === 'DALobby' ? 1 : 0
          );
          const first = filteredChannels[0];
          this.setCurrentChat(first.id, first.name, first.description, first.creator); this.currentChannelID = first.id
        }
      })) as Observable<any[]>;
  }

  getMessages(channelId: string): Observable<any[]> {
    const messagesRef = collection(this.firestore, `channels/${channelId}/messages`);
    const q = query(messagesRef, orderBy('timestamp', 'asc'));

    return collectionData(q, { idField: 'id' }).pipe(
      tap(messages => {
        this.messageCache[channelId] = messages;
      })
    ) as Observable<any[]>;
  }

  getCachedMessages(channelId: string): any[] {
    return this.messageCache[channelId] || [];
  }

  getThreadMessage(channelId: string, threadId: string): Observable<any> {
    const messagesRef = collection(this.firestore, `channels/${channelId}/messages/${threadId}/thread`);
    const q  = query(messagesRef, orderBy('timestamp', 'asc'));
    return collectionData(q, { idField: 'id' }) as Observable<any[]>;
  }

  getWhisperMessage(channelId: string): Observable<any> {
    const messagesRef = collection(this.firestore, `whispers/${channelId}/messages`);
    const q  = query(messagesRef, orderBy('timestamp', 'asc'));
    return collectionData(q, { idField: 'id' }) as Observable<any[]>;
  }
}
