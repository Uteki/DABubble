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

/**
 * UserService
 *
 * Handles all Firestore operations related to application users.
 *
 * Responsibilities:
 * - Fetch all users
 * - Fetch single user by UID
 * - Update user status
 * - Update user profile data
 * - Check if a Google user document exists
 *
 * Provided in root → singleton across the entire app.
 */
@Injectable({
  providedIn: 'root',
})
export class UserService {

  /**
   * Creates an instance of UserService.
   *
   * @param firestore - Angular Fire Firestore instance
   */
  constructor(private firestore: Firestore) {}

  /**
   * Returns a realtime stream of all users.
   *
   * Uses Firestore `collectionData` to listen for
   * live updates.
   *
   * @returns Observable emitting an array of users
   */
  getUser(): Observable<any[]> {
    const userRef = collection(this.firestore, `users`);
    return collectionData(userRef, { idField: 'id' }) as Observable<any[]>;
  }

  /**
   * Returns realtime data for a single user by UID.
   *
   * @param uid - Firebase Authentication UID
   * @returns Observable emitting the user document
   */
  getUserByUid(uid: string): Observable<any> {
    const userRef = doc(this.firestore, `users/${uid}`);
    return docData(userRef, { idField: 'id' }) as Observable<any>;
  }

  /**
   * Updates the online/active status of a user.
   *
   * Uses merge → does not overwrite other fields.
   *
   * @param uid - User UID
   * @param isActive - Online status flag
   */
  async updateUserStatus(uid: string, isActive: boolean): Promise<void> {
    const userRef = doc(this.firestore, `users/${uid}`);
    await setDoc(userRef, { status: isActive }, { merge: true });
  }

  /**
   * Updates the display name of a user.
   *
   * Uses merge → preserves other document fields.
   *
   * @param uid - User UID
   * @param newName - New display name
   */
  async updateUserName(uid: string, newName: string): Promise<void> {
    const userRef = doc(this.firestore, `users/${uid}`);
    await setDoc(userRef, { name: newName }, { merge: true });
  }

  /**
   * Checks whether a Google-authenticated user
   * already has a Firestore user document.
   *
   * Commonly used after OAuth login to decide
   * whether to create a new profile.
   *
   * @param uid - User UID from Firebase Auth
   * @returns Promise resolving with the document snapshot
   */
  async checkGoogleUser(uid: string) {
    const userRef = doc(this.firestore, `users/${uid}`);
    return await getDoc(userRef);
  }
}
