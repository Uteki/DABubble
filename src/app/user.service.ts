import { Injectable } from '@angular/core';
import { user } from '@angular/fire/auth';
import {
  Firestore,
  collection,
  collectionData,
  orderBy,
  query,
} from '@angular/fire/firestore';
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
}
