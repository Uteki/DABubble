import {ChangeDetectorRef, Injectable} from "@angular/core";

@Injectable()
export class ChatOverlayService {
  channelOverlay: boolean = false;
  viewMemberOverlay: boolean = false;
  addMemberOverlay: boolean = false;
  viewMemberMobileOverlay: boolean = false;
  viewMemberOverlayMobile: boolean = false;
  switchAddMemberOverlay: boolean = false;
  overlayActivated: boolean = false;

  constructor(private cd: ChangeDetectorRef) {}

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
}
