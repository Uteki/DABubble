import {Component, EventEmitter, OnInit, Output} from '@angular/core';
import {FormsModule} from "@angular/forms";
import {ChatService} from "../../chat.service";
import {DatePipe, NgClass, NgForOf, NgIf} from '@angular/common';
import { ChangeDetectorRef } from '@angular/core';
import { StopPropagationDirective } from "../../stop-propagation.directive";
import {addDoc, collection, Firestore, getDocs} from "@angular/fire/firestore";


@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [
    FormsModule,
    NgClass,
    StopPropagationDirective,
    NgForOf,
    NgIf,
    DatePipe
  ],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.scss'
})
export class ChatComponent implements OnInit {
  @Output() threadSelected = new EventEmitter<string>();

  messages: any[] = [];
  messageText: string = '';
  today = new Date();
  overlayActivated: boolean = false;
  channelOverlay: boolean = false;
  viewMemberOverlay: boolean = false;
  addMemberOverlay: boolean = false;
  switchAddMemberOverlay: boolean = false;
  editOne: boolean = false;
  editTwo: boolean = false
  channelFounder: string = "Noah Braun";

  constructor(private chatService: ChatService, private cd: ChangeDetectorRef, private firestore: Firestore) {}

  ngOnInit(): void {
    this.chatService.getMessages(this.chatService.currentChat).subscribe(messages => {
      this.messages = messages.sort((a, b) => a.timestamp - b.timestamp);
    });
  }

  async sendMessage() {
    if (!this.messageText.trim()) return;

    await this.chatService.sendMessage(this.chatService.currentChat, {
      text: this.messageText,
      //TODO: bind it with user logger
      user: 'Daniel Tran',
      timestamp: Date.now(),
    });

    this.messageText = '';
  }

  async openThread(threadId: string, message: any) {
    this.threadSelected.emit(threadId);

    const threadRef = collection(
      this.firestore, `channels/${this.chatService.currentChat}/messages/${threadId}/thread`
    );

    const snapshot = await getDocs(threadRef);
    if (!snapshot.empty) return;
    return addDoc(threadRef, { ...message, timestamp: message.timestamp || Date.now() });
  }

  overlayFunction(darkOverlay: boolean, overlay: string, overlayBoolean: boolean ) {
    this.overlayActivated = darkOverlay;
    this.cd.detectChanges();
    if (overlay == "Entwicklung") {
      this.channelOverlay = overlayBoolean;
      console.log(this.channelOverlay);

    } else if (overlay == "Mitglieder") {
      this.viewMemberOverlay = overlayBoolean;
    } else if (overlay == "Hinzufügen") {
      this.addMemberOverlay = overlayBoolean;
    }
  }
}
