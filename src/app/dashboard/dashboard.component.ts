import {Component, OnInit, OnDestroy, HostListener} from '@angular/core';
import { HeaderComponent } from '../shared/header/header.component';
import { ThreadComponent } from './thread/thread.component';
import { ChannelsComponent } from './channels/channels.component';
import { BroadcastComponent } from "./broadcast/broadcast.component";
import { MessageComponent } from './message/message.component';
import { ChatComponent } from './chat/chat.component';
import { UserService } from '../user.service';
import { User } from '../core/interfaces/user';
import { ChatService } from '../chat.service';
import { AuthService } from '../auth.service';
import { Subscription } from 'rxjs';
import { MentionService } from "../mention.service";

/**
 * DashboardComponent
 *
 * Main application shell for the chat UI.
 *
 * Responsibilities:
 * - Loads initial data needed for the dashboard (users, channels)
 * - Hosts and coordinates the main UI areas:
 *   header, channels list, chat view, thread panel, broadcast view
 * - Manages responsive layout state (desktop/tablet/mobile)
 * - Controls visibility and animation flags for panels (channels/thread)
 * - Reacts to cross-component events (e.g., mention clicks triggering direct chat)
 *
 * Notes:
 * - This component primarily manages UI state and orchestration.
 * - Firestore/data operations are delegated to injected services.
 */
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    HeaderComponent,
    ThreadComponent,
    ChannelsComponent,
    ChatComponent,
    MessageComponent,
    BroadcastComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit, OnDestroy {

  /** All users loaded from Firestore (used for mentions, partner selection, UI). */
  userList: any[] = [];
  /** Channels visible to the current user (DALobby included). */
  channelList: any[] = [];
  /** Thread panel hidden state (used for open/close animation). */
  threadHidden = true;
  /** When true, thread view is collapsed/closed (UI flag). */
  thread = true;
  /** When true, direct/DM panel is collapsed/closed (UI flag). */
  direct = true;
  /** When true, broadcast panel is collapsed/closed (UI flag). */
  broadcast = true;
  /** When true, chat view is active (UI flag). */
  chat = false;
  /** When true, channels panel is active (UI flag). */
  channels = false;
  /** Channels panel hidden state (used for open/close animation). */
  channelsHidden = false;
  /** Animation flag for closing channels panel. */
  isClosing = false;
  /** Animation flag for opening channels panel. */
  isOpening = false;
  /** Animation flag for opening thread panel. */
  isThreadOpening = false;
  /** Animation flag for closing thread panel. */
  isThreadClosing = false;
  /** Currently selected thread message id. */
  selectedThreadId: string | null = null;
  /** Currently selected DM partner (whisper chat). */
  selectedPartner: User | null = null;
  /** Subscription container to cleanly unsubscribe on destroy. */
  private subs = new Subscription();

  /**
   * @param userService Provides the user list stream.
   * @param chatService Provides channel list stream and chat state facade.
   * @param authService Provides access to the current user's uid.
   * @param mentionService Emits global mention events (open partner / toggle direct view).
   */
  constructor(
    private userService: UserService,
    private chatService: ChatService,
    private authService: AuthService,
    private mentionService: MentionService
  ) {}

  /**
   * Handles window resize to recompute responsive layout state.
   */
  @HostListener('window:resize')
  onResize() {
    this.checkThreadWidth();
  }

  /**
   * Lifecycle: initializes dashboard state.
   *
   * - Applies initial responsive layout rules
   * - Subscribes to user list updates
   * - Subscribes to channel list updates (filters to membership + DALobby)
   * - Registers global mention listeners
   */
  ngOnInit() {
    this.checkThreadWidth();
    this.subs.add(this.userService.getUser().subscribe((data) => { this.userList = data }));
    this.chatService.getChannels(this.authService.readCurrentUser()).subscribe((data) => {
      const uid = this.authService.readCurrentUser();
      this.channelList = data.filter(channel => channel.users?.includes(uid) || channel.id === 'DALobby')
        .sort((a, b) => a.id === 'DALobby' ? -1 : b.id === 'DALobby' ? 1 : 0);
    });
    this.globalScopeToggle()
  }

  /**
   * Lifecycle: cleans up subscriptions.
   */
  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  /**
   * Sets the currently selected thread and opens the thread panel.
   *
   * @param id Thread root message id.
   */
  onThreadSelected(id: string) {
    this.selectedThreadId = id;
    this.openThreadPane();
  }

  /**
   * Updates the current DM partner selection.
   *
   * @param obj Selected user.
   */
  onPartnerSelected(obj: User) {
    this.selectedPartner = obj;
  }

  /**
   * Toggles the thread panel open/closed.
   *
   * @param $event True means thread should open; false means close.
   */
  toggleThread($event: boolean) {
    this.thread = !$event;
    if ($event) {
      this.openThreadPane();
    } else {
      this.closeThreadPane();
    }
  }

  /**
   * Toggles direct chat mode.
   *
   * On smaller widths, it also closes the thread pane to free space.
   *
   * @param $event True means open direct chat; false means close.
   */
  toggleDirect($event: boolean) {
    if (window.innerWidth < 1440) this.closeThreadPane();
    this.chat = $event;
    this.thread = true;
    this.broadcast = true;
    this.direct = !$event;
  }

  /**
   * Toggles the channels sidebar open/close with animation flags.
   */
  toggleChannels() {
    if (this.channelsHidden) {
      this.isOpening = true;
      this.isClosing = false;
      this.channelsHidden = false;
      setTimeout(() => {this.isOpening = false}, 420);
    } else {
      this.isClosing = true;
      this.isOpening = false;
      this.channelsHidden = true;
      setTimeout(() => {this.isClosing = false}, 420);
    }
  }

  /**
   * Switches UI into broadcast mode and resets other panel states.
   */
  toggleBroadcast() {
    this.broadcast = false;
    this.thread = true;
    this.threadHidden = true;
    this.isThreadOpening = false;
    this.isThreadClosing = false;
    this.direct = true;
    this.chat = true;
    this.isOpening = false;
    this.isClosing = false;
  }

  /**
   * Subscribes to global mention events:
   * - Selecting a user mention sets the current partner
   * - Clicking a mention that requires direct chat toggles direct view
   *
   * Note: These subscriptions live for the lifetime of the dashboard.
   */
  globalScopeToggle() {
    this.mentionService.partnerSelected$.subscribe(user => this.onPartnerSelected(user));
    this.mentionService.toggleRequestDirect$.subscribe(b => this.toggleDirect(b));
  }

  /**
   * Mobile UI helper: hides the channels menu.
   */
  mobileMenuOff() {
    this.channels = true;
    this.channelsHidden = true;
  }

  /**
   * Mobile UI helper: shows the channels menu and resets other views.
   */
  mobileMenuOn() {
    this.chat = true;
    this.direct = true;
    this.thread = true;
    this.threadHidden = true;
    this.channels = false;
    this.channelsHidden = false;
  }

  /**
   * Opens the thread panel with animation flags.
   * On smaller widths, ensures the chat view remains visible.
   */
  private openThreadPane() {
    if (window.innerWidth < 1440) {
      this.isThreadOpening = false;
      this.chat = true;
    }
    this.thread = false;
    if (!this.threadHidden) return;
    this.isThreadOpening = true;
    this.isThreadClosing = false;
    this.threadHidden = false;
    setTimeout(() => (this.isThreadOpening = false), 420);
  }

  /**
   * Closes the thread panel with animation flags.
   */
  private closeThreadPane() {
    window.innerWidth < 1440 ? this.isThreadClosing = false : this.isThreadClosing = true;
    this.thread = true;
    if (this.threadHidden) return;
    this.isThreadOpening = false;
    this.threadHidden = true;
    setTimeout(() => (this.isThreadClosing = false), 420);
  }

  /**
   * Applies responsive layout rules based on window width.
   *
   * Breakpoints:
   * - Desktop: >= 1440px
   * - Mobile:  < 768px
   *
   * Behavior:
   * - On non-desktop widths: thread may auto-close depending on chat state
   * - On mobile: forces minimal UI by hiding panels
   * - On desktop: chat and thread panes coordinate visibility
   */
  private checkThreadWidth() {
    const isDesktop = window.innerWidth >= 1440;
    const isMobile = window.innerWidth >= 768;
    if (!isDesktop && !this.chat) { this.channels = false; this.channelsHidden = false; this.closeThreadPane() }
    if (!isMobile) this.chat = this.direct = this.thread = this.threadHidden = true;
    if (isDesktop && !this.threadHidden) this.chat = false;
    if (isMobile) this.channelsHidden = false;
  }
}
