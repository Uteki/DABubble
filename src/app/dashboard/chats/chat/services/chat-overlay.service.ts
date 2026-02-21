import { ChangeDetectorRef, Injectable } from "@angular/core";
import { User } from "../../../../core/interfaces/user";
import { ProfileOverlayService } from '../../../../shared/components/header/services/profile-overlay.service';
import { AuthService } from "../../../../core/services/auth.service";

/**
 * ChatOverlayService
 *
 * Component-scoped state holder for the ChatComponent overlays and related UI toggles.
 *
 * Responsibilities:
 * - Centralizes all overlay booleans (channel details, members list, add members, mobile variants).
 * - Provides a single entry point ({@link overlayFunction}) to open/close overlays consistently.
 * - Manages profile overlay behavior (open own profile via ProfileOverlayService vs. open other user overlay).
 * - Exposes small UI helpers (focus/blur flags, current user id).
 *
 * Typical usage:
 * - Provide this service at component level (`providers: [ChatOverlayService]`) so each ChatComponent
 *   instance gets its own isolated overlay state.
 */
@Injectable()
export class ChatOverlayService {

  /** Channel details overlay (e.g., "Entwicklung"). */
  channelOverlay: boolean = false;
  /** Members list overlay (desktop). */
  viewMemberOverlay: boolean = false;
  /** Add members overlay (desktop). */
  addMemberOverlay: boolean = false;
  /** Add members overlay flag used by mobile layout. */
  viewMemberMobileOverlay: boolean = false;
  /** Members list overlay flag used by mobile layout. */
  viewMemberOverlayMobile: boolean = false;
  /** Overlay mode used when switching between member views ("MitgliederWechseln"). */
  switchAddMemberOverlay: boolean = false;
  /** Whether the dimmed background overlay is active. */
  overlayActivated: boolean = false;
  /** Tracks whether a relevant input is focused (used for styling / UX decisions). */
  inputFocused: boolean = false;
  /** Whether the in-chat profile overlay (for other users) is currently open. */
  profileOverlay: boolean = false;
  /**
   * User selected/clicked in the UI (used by the profile overlay to render details).
   * Prefer typing this as `User | null` when possible.
   */
  clickedUser: any;

  constructor(
    private cd: ChangeDetectorRef,
    private profileOverlayService: ProfileOverlayService,
    private authService: AuthService
  ) {}

  /**
   * Opens/closes a specific overlay while also controlling the dimmed background.
   *
   * Implementation detail:
   * The `overlay` argument uses UI labels (German strings) to decide which overlay to toggle.
   * If you want stronger typing, replace this with a union type or enum.
   *
   * @param darkOverlay - Whether the dark background overlay should be active.
   * @param overlay - Which overlay to toggle (e.g. "Entwicklung", "Mitglieder", "Hinzufügen", "MitgliederWechseln").
   * @param overlayBoolean - Desired open/close state for the target overlay.
   */
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

  /**
   * Closes all channel/member related overlays and resets the dark background overlay.
   * (Profile overlay is intentionally not toggled here; use {@link closeProfile} for that.)
   */
  closeAllOverlays() {
    this.overlayActivated = false;
    this.channelOverlay = false;
    this.viewMemberOverlay = false;
    this.viewMemberOverlayMobile = false;
    this.addMemberOverlay = false;
    this.switchAddMemberOverlay = false;
  }

  /** Check if mobile + **/
  viewMemberMedia() { if (window.innerWidth < 1024) this.viewMemberOverlay = true }

  /**
   * Opens a user profile.
   *
   * Behavior:
   * - If the clicked user is the current user, triggers the global/self profile overlay.
   * - Otherwise opens the local in-chat profile overlay and stores the clicked user.
   *
   * @param user - The user whose profile should be shown.
   */
  openProfile(user: User) {
    if (user.uid === this.getUserId()) {
      this.profileOverlayService.triggerOpenProfile();
    } else {
      this.clickedUser = user;
      this.overlayActivated = true;
      this.profileOverlay = true;
    }
  }

  /**
   * Closes the in-chat profile overlay (for other users) and removes the dark background.
   */
  closeProfile() {
    this.overlayActivated = false;
    this.profileOverlay = false;
  }

  /**
   * Returns the uid of the current authenticated user.
   */
  getUserId() { return this.authService.readCurrentUser() }

  /**
   * Marks the related input as focused (used for UI styling/behavior).
   */
  onFocus() { this.inputFocused = true }

  /**
   * Marks the related input as blurred (used for UI styling/behavior).
   */
  onBlur() { this.inputFocused = false }
}
