import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class IntroService {
  private introShownSubject = new BehaviorSubject<boolean>(false);
  introShown$ = this.introShownSubject.asObservable();

  setIntroShown(shown: boolean): void {
    this.introShownSubject.next(shown);
  }

  getIntroShown(): boolean {
    return this.introShownSubject.value;
  }
}
