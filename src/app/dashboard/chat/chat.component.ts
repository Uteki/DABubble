import {Component, ElementRef, EventEmitter, HostListener, OnInit, Output, ViewChild} from '@angular/core';
import {FormsModule} from "@angular/forms";
import {ChatService} from "../../chat.service";
import {DatePipe, NgClass, NgForOf, NgIf} from '@angular/common';
import { ChangeDetectorRef } from '@angular/core';
import { StopPropagationDirective } from "../../stop-propagation.directive";
import {addDoc, collection, Firestore, getDocs, updateDoc} from "@angular/fire/firestore";
import {distinctUntilChanged, filter, map, switchMap} from "rxjs";
import {doc} from "firebase/firestore";


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
  @ViewChild('channelEdit') channelEdit!: ElementRef;

  messages: any[] = [];
  messageText: string = '';
  currentChat: string = '';
  today = new Date();
  overlayActivated: boolean = false;
  channelOverlay: boolean = false;
  viewMemberOverlay: boolean = false;
  addMemberOverlay: boolean = false;
  switchAddMemberOverlay: boolean = false;
  editChannelName: boolean = false;
  editDescription: boolean = false

  channelFounder: string = 'user[0]';
  channelName: string = '';
  channelDesc: string = '';

  constructor(private chatService: ChatService, private cd: ChangeDetectorRef, private firestore: Firestore) {}

  ngOnInit(): void {
    this.chatService.currentChat$.pipe(
      distinctUntilChanged(),
      filter(chat => !!chat && chat.trim() !== ''),
      switchMap(chat => this.chatService.getMessages(chat)),
      map(messages => messages.sort((a, b) => a.timestamp - b.timestamp))
    ).subscribe(sortedMessages => {
      this.messages = sortedMessages;
      this.currentChat = this.chatService.currentChat;
    });
  }

  async sendMessage() {
    if (!this.messageText.trim()) return;

    await this.chatService.sendMessage(this.chatService.currentChannel, {
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
      this.firestore, `channels/${this.chatService.currentChannel}/messages/${threadId}/thread`
    );

    const snapshot = await getDocs(threadRef);
    if (!snapshot.empty) return;
    return addDoc(threadRef, { ...message, timestamp: message.timestamp || Date.now() });
  }

  async updateChannelName(channelId: string, newName: string) {
    const channelRef = doc(this.firestore, `channels/${channelId}`);
    this.currentChat = newName;
    await updateDoc(channelRef, { name: newName });
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent) {
    if (this.editChannelName && this.channelEdit && !this.channelEdit.nativeElement.contains(event.target)) {
      //TODO for desc
      this.editChannelName = false;
    }
  }

  saveEditedName() {
    if (this.editChannelName) {
      const newName = this.channelName.trim();
      if (!newName) return;

      this.updateChannelName(this.chatService.currentChannel, newName).then(() => {})
    } else {
      this.channelName = this.currentChat;
    }

    this.editChannelName = !this.editChannelName;
  }

  overlayFunction(darkOverlay: boolean, overlay: string, overlayBoolean: boolean ) {
    this.overlayActivated = darkOverlay;
    this.cd.detectChanges();
    if (overlay == "Entwicklung") {
      this.channelOverlay = overlayBoolean;
    } else if (overlay == "Mitglieder") {
      this.viewMemberOverlay = overlayBoolean;
    } else if (overlay == "Hinzufügen") {
      this.addMemberOverlay = overlayBoolean;
    }
  }

  saveEditedComment(){
    this.editDescription = !this.editDescription;
  }
}
