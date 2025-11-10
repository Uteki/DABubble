import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  addDoc,
  collectionData,
  orderBy,
  query,
  getDoc,
  updateDoc
} from '@angular/fire/firestore';
import { doc } from 'firebase/firestore';
import {BehaviorSubject, Observable, tap} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  currentChat: any = '';
  currentChannel: any = '';
  currentCreator: string = '';
  currentDescription: string = '';
  currentChat$ = new BehaviorSubject(this.currentChat);
  currentChannelID: string = '';

  pendingUsers: any[] = [];
  messageCache: Record<string, any[]> = {};

  constructor(private firestore: Firestore) {}

  setCurrentChat(chat: any, name: string, description: string, creator: string) {
    this.currentChat = name;
    this.currentChat$.next(chat);
    this.currentChannel = chat;

    this.currentCreator = creator;
    this.currentDescription = description;
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
    console.log('Created channel with ID:', docRef.id);
    this.currentChannelID = docRef.id;
    return docRef;
  }

  async searchUsers(channelId: string ) {
    const channelRef = doc(this.firestore, 'channels', channelId);
    const snapshot = await getDoc(channelRef );

    this.pendingUsers = [];
    this.pendingUsers.push(...(snapshot.data()?.['users'] || []));
  }

  async addUsers(channelId: string, users: any[]) {
    const channelRef = doc(this.firestore, 'channels', channelId);
    await updateDoc(channelRef, {
      users: users
    });
  }

  getChannels(): Observable<any[]> {
    const channelsRef = collection(this.firestore, 'channels');
    return collectionData(channelsRef, { idField: 'id' }).pipe(
      tap(channels => {
        if (!this.currentChannel && channels.length > 0) {
          this.setCurrentChat(channels[0].id, channels[0]['name'], channels[0]['description'], channels[0]['creator']);
        }
      })
    ) as Observable<any[]>;
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
