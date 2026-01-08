import { Injectable } from '@angular/core';
import { user } from '@angular/fire/auth';
import {
  Firestore,
  collection,
  collectionData,
  docData,
  orderBy,
  query, getDoc,
} from '@angular/fire/firestore';
import { doc, setDoc } from 'firebase/firestore';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  constructor(private firestore: Firestore) {}

  getUser(): Observable<any[]> {
    const userRef = collection(this.firestore, `users`);
    return collectionData(userRef, { idField: 'id' }) as Observable<any[]>;
  }

  getUserByUid(uid: string): Observable<any> {
    const userRef = doc(this.firestore, `users/${uid}`);
    return docData(userRef, { idField: 'id' }) as Observable<any>;
  }

  async updateUserStatus(uid: string, isActive: boolean): Promise<void> {
    const userRef = doc(this.firestore, `users/${uid}`);
    await setDoc(userRef, { status: isActive }, { merge: true });
  }

  async updateUserName(uid: string, newName: string): Promise<void> {
  const userRef = doc(this.firestore, `users/${uid}`);
  await setDoc(userRef, { name: newName }, { merge: true });
  }

  async checkGoogleUser(uid: string) {
    const userRef = doc(this.firestore, `users/${uid}`);
    return await getDoc(userRef);
  }
}
