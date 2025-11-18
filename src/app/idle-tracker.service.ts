import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class IdleTrackerService {
  private idleTimeSubject = new BehaviorSubject<number>(0);
  private isIdleSubject = new BehaviorSubject<boolean>(false);
  
  idleTime$: Observable<number> = this.idleTimeSubject.asObservable();
  isIdle$: Observable<boolean> = this.isIdleSubject.asObservable();

  constructor() {}

  updateIdleTime(milliseconds: number): void {
    this.idleTimeSubject.next(milliseconds);
  }

  setIdleStatus(isIdle: boolean): void {
    this.isIdleSubject.next(isIdle);
  }

  getCurrentIdleTime(): number {
    return this.idleTimeSubject.value;
  }

  getIdleStatus(): boolean {
    return this.isIdleSubject.value;
  }
}
