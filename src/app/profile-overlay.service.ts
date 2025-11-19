import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ProfileOverlayService {
  private openProfileSubject = new Subject<void>();
  
  openProfile$ = this.openProfileSubject.asObservable();

  constructor() {}

  triggerOpenProfile(): void {
    this.openProfileSubject.next();
  }
}
