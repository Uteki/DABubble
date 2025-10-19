import { Injectable } from '@angular/core';
import { Firestore, collection, addDoc, collectionData, orderBy, query } from '@angular/fire/firestore';
import {BehaviorSubject, Observable} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  currentChat: any = '';
  currentChat$ = new BehaviorSubject(this.currentChat);

  constructor(private firestore: Firestore) {}

  setCurrentChat(chat: any) {
    this.currentChat = chat;
    this.currentChat$.next(chat);
  }

  sendMessage(channelId: string, message: { text: string; user: string; timestamp: number }) {
    const messagesRef = collection(this.firestore, `channels/${channelId}/messages`);
    return addDoc(messagesRef, message);
  }

  sendThreadMessage(channelId: string, threadId: string, message: { text: string; user: string; timestamp: number }) {
    const messagesRef = collection(this.firestore, `channels/${channelId}/messages/${threadId}/thread`);
    return addDoc(messagesRef, message);
  }

  getChannels(): Observable<any[]> {
    const channelsRef = collection(this.firestore, 'channels');
    return collectionData(channelsRef, { idField: 'id' }) as Observable<any[]>;
  }

  getMessages(channelId: string): Observable<any[]> {
    const messagesRef = collection(this.firestore, `channels/${channelId}/messages`);
    const q = query(messagesRef, orderBy('timestamp', 'asc'));
    return collectionData(q, { idField: 'id' }) as Observable<any[]>;
  }

  getThreadMessage(channelId: string, threadId: string): Observable<any> {
    const messagesRef = collection(this.firestore, `channels/${channelId}/messages/${threadId}/thread`);
    const q  = query(messagesRef, orderBy('timestamp', 'asc'));
    return collectionData(q, { idField: 'id' }) as Observable<any[]>;
  }
}
