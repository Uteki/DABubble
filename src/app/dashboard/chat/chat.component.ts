import { Component } from '@angular/core';
import {FormsModule} from "@angular/forms";

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [
    FormsModule
  ],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.scss'
})
export class ChatComponent {
  message: string = '';

  sendMessage(event: Event): void {
    event.preventDefault();
    if (!this.message.trim()) return;
    console.log('Send:', this.message);
    this.message = '';
  }
}
