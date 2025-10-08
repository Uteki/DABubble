import { Component } from '@angular/core';
import {FormsModule} from "@angular/forms";

@Component({
  selector: 'app-thread',
  standalone: true,
    imports: [
        FormsModule
    ],
  templateUrl: './thread.component.html',
  styleUrl: './thread.component.scss'
})
export class ThreadComponent {
  message: string = '';

  sendMessage(event: Event): void {
    event.preventDefault();
    if (!this.message.trim()) return;
    console.log('Send:', this.message);
    this.message = '';
  }
}
