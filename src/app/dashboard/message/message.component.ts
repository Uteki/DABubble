import {ChangeDetectorRef, Component, Input, OnChanges} from '@angular/core';
import { DatePipe, NgClass, NgForOf, NgIf } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { AuthService } from "../../auth.service";
import { ChatService } from "../../chat.service";
import { User } from "../../core/interfaces/user";

@Component({
  selector: 'app-message',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    NgForOf,
    NgIf,
    NgClass
  ],
  templateUrl: './message.component.html',
  styleUrl: './message.component.scss'
})
export class MessageComponent implements OnChanges {
  @Input() partner!: User | null;
  @Input() users: any[] = [];

  messages: any[] = [];
  messageText: string = '';
  today = new Date();
  overlayActivated: boolean = false;
  viewMemberOverlay: boolean = false;
  addMemberOverlay: boolean = false;
  channelOverlay: boolean = false;

  currentPartnerChat: string = "";
  currentWhisperer: string = "";
  currentPartner: any;

  constructor(private chatService: ChatService, private cd: ChangeDetectorRef, private authService: AuthService) {}
  //TODO: Editable messages

  ngOnChanges() {
    if (this.partner) {
      this.currentPartner = this.partner;
      this.currentWhisperer = this.authService.readCurrentUser();
      this.currentPartnerChat = [this.currentPartner.uid, this.currentWhisperer].sort().join('_');

      this.chatService.getWhisperMessage(this.currentPartnerChat).subscribe(messages => {
        this.messages = messages.sort((a:any, b:any) => a.timestamp - b.timestamp);
      });
    }
  }

  async sendMessage() {
    const logger: User = this.users.find(user => user.uid === this.authService.readCurrentUser());
    if (!this.messageText.trim() || this.currentPartnerChat === null) return;

    await this.chatService.sendWhisperMessage(this.currentPartnerChat, {
      uid: logger.uid,
      text: this.messageText,
      user: logger.name,
      timestamp: Date.now(),
    });

    this.messageText = '';
  }

  getProfilePic(uid: string) {
    return this.users.find(user => user.uid === uid).avatar || 'assets/avatars/profile.png';
  }

  getUserId() {
    return this.authService.readCurrentUser();
  }

  //TODO: Emre
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
}
