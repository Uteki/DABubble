import {ChangeDetectorRef, Injectable} from "@angular/core";
import {User} from "../../core/interfaces/user";
import { ProfileOverlayService } from '../../profile-overlay.service';
import {AuthService} from "../../auth.service";

@Injectable()
export class ChatOverlayService {
  channelOverlay: boolean = false;
  viewMemberOverlay: boolean = false;
  addMemberOverlay: boolean = false;
  viewMemberMobileOverlay: boolean = false;
  viewMemberOverlayMobile: boolean = false;
  switchAddMemberOverlay: boolean = false;
  overlayActivated: boolean = false;
  inputFocused: boolean = false;
  profileOverlay: boolean = false;

  clickedUser: any;

  constructor(
    private cd: ChangeDetectorRef,
    private profileOverlayService: ProfileOverlayService,
    private authService: AuthService
  ) {}

  overlayFunction(darkOverlay: boolean, overlay: string, overlayBoolean: boolean) {
    this.overlayActivated = darkOverlay;
    this.cd.detectChanges();
    if (overlay == 'Entwicklung') {
      this.channelOverlay = overlayBoolean;
    } else if (overlay == 'Mitglieder') {
      this.viewMemberOverlay = overlayBoolean;
    } else if (overlay == 'Hinzufügen') {
      this.addMemberOverlay = overlayBoolean;
      this.viewMemberMobileOverlay = overlayBoolean;
    } else if (overlay == 'MitgliederWechseln') {
      this.switchAddMemberOverlay = overlayBoolean;this.viewMemberOverlay = overlayBoolean;
      this.viewMemberMobileOverlay = overlayBoolean;this.viewMemberOverlayMobile = overlayBoolean;
    }
  }

  closeAllOverlays() {
    this.overlayActivated = false;
    this.channelOverlay = false;
    this.viewMemberOverlay = false;
    this.viewMemberOverlayMobile = false;
    this.addMemberOverlay = false;
    this.switchAddMemberOverlay = false;
  }

  openProfile(user: User) {
    if (user.uid === this.getUserId()) {
      this.profileOverlayService.triggerOpenProfile();
    } else {
      this.clickedUser = user;
      this.overlayActivated = true;
      this.profileOverlay = true;
    }
  }

  closeProfile() {
    this.overlayActivated = false;
    this.profileOverlay = false;
  }

  getUserId() { return this.authService.readCurrentUser() }
  onFocus() { this.inputFocused = true }
  onBlur() { this.inputFocused = false }
}
