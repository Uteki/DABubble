import { Injectable } from '@angular/core';
import { Firestore, collection, addDoc, collectionData, orderBy, query } from '@angular/fire/firestore';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  constructor(private firestore: Firestore) {}

  sendMessage(channelId: string, message: { text: string; user: string; timestamp: number }) {
    const messagesRef = collection(this.firestore, `channels/${channelId}/messages`);
    return addDoc(messagesRef, message);
  }

  getMessages(channelId: string): Observable<any[]> {
    const messagesRef = collection(this.firestore, `channels/${channelId}/messages`);
    const q = query(messagesRef, orderBy('timestamp', 'asc'));
    return collectionData(q, { idField: 'id' }) as Observable<any[]>;
  }
}
