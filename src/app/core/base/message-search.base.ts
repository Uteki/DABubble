import { AuthService } from '../services/auth.service';
import { ChatService } from '../../dashboard/chats/services/chat.service';
import { GlobalSearchResult } from '../interfaces/global-search-result';
import { BroadcastRecipient } from '../type/recipient';

/**
 * Base class for message search functionality.
 *
 * This abstract class encapsulates the shared search logic used by multiple components
 * (e.g., Channels, Broadcast, etc.). It supports:
 * - Global search across channels and direct messages ("whispers")
 * - Targeted search inside a single selected recipient (channel or user chat)
 * - Minimal UI integration by toggling visibility of search result containers
 *
 * Notes:
 * - This is NOT an Angular service. It is intended to be extended via `extends`.
 * - It directly accesses DOM elements via `document.getElementById(...)`.
 *   If you later want to make it more Angular-ish, replace those with bindings/booleans
 *   or `@ViewChild/@ViewChildren` in the extending component.
 */
export abstract class MessageSearchBase {

  /**
   * Raw input value from the search field.
   * Can include prefixes like `@` or `#` depending on the UI.
   */
  recipientInput = '';

  /**
   * Selected recipient(s) for targeted search.
   * If empty, the search runs globally across all channels/whispers.
   */
  recipient: BroadcastRecipient[] = [];

  /**
   * Results returned by the search.
   * Populated by either global search or conversation search.
   */
  foundMessages: GlobalSearchResult[] = [];

  /**
   * Creates a new instance of MessageSearchBase.
   *
   * @param chatService Service used to query messages (global and per conversation).
   * @param authService Service used to access current user identity (uid).
   */
  protected constructor(
    protected chatService: ChatService,
    protected authService: AuthService
  ) {}

  /**
   * Entry point for searching messages.
   *
   * Behavior:
   * - Reads and trims the current `recipientInput`
   * - If empty: hides results and stops
   * - If `recipient` is empty: performs a global search (channels + whispers)
   * - Otherwise: searches within the selected recipient conversation
   * - Finally: shows the main search result containers (desktop/mobile variants)
   *
   * @param users List of available users (used to build whisper ids).
   * @param channels List of available channels (used to collect channel ids).
   * @returns A promise that resolves when the search completes.
   */
  async searchMsg(users: any[], channels: any[]) {
    const term = this.getSearchTerm();
    if (!term) {
      this.hideSearchResults();
      return;
    }
    if (this.isGlobalSearch()) {
      await this.searchGlobal(term, users, channels);
    } else {
      await this.searchSingleRecipient(term);
    }
    ['search-results', 'search-results-2'].forEach(id => document.getElementById(id)?.classList.remove('no-display'));
  }

  /**
   * Normalized search term for matching/filtering.
   *
   * Removes leading `@` or `#`, converts to lowercase and trims whitespace.
   * Useful when the UI uses prefixes to indicate different search modes.
   */
  protected get searchTerm(): string {
    return this.recipientInput.replace(/^[@#]/, '').toLowerCase().trim();
  }

  /**
   * Performs a global search across:
   * - all channels (by channel id)
   * - all direct-message conversations (whispers) derived from users
   *
   * @param term Search term to query.
   * @param users User list used to derive whisper ids.
   * @param channels Channel list used to derive channel ids.
   * @returns A promise that resolves when results are fetched and assigned.
   */
  protected async searchGlobal(term: string, users: any[], channels: any[]) {
    const channelIds = channels.map(c => c.id);
    const whisperIds = users.map(u => this.buildPartnerChat(u.uid));

    this.foundMessages = await this.chatService.searchGlobally(channelIds, whisperIds, term);
  }

  /**
   * Performs a search inside the currently selected recipient conversation.
   *
   * Uses the first element of `recipient` as the target.
   * - If recipient is a channel: searches the channel conversation
   * - If recipient is a user: searches the whisper conversation
   *
   * @param term Search term to query.
   * @returns A promise that resolves when results are fetched and assigned.
   */
  protected async searchSingleRecipient(term: string) {
    const r = this.recipient[0];
    if (!r) return;

    if (r.type === 'channel') {
      await this.searchChannel(r.channelId, term);
    }
    if (r.type === 'user') {
      await this.searchWhisper(r.partnerChat, term);
    }
  }

  /**
   * Searches within a channel conversation.
   *
   * @param channelId Channel id of the conversation.
   * @param term Search term to query.
   * @returns A promise that resolves when results are fetched and assigned.
   */
  protected async searchChannel(channelId: string, term: string) {
    this.foundMessages = await this.chatService.searchInConversation('channel', channelId, term);
  }

  /**
   * Searches within a direct-message ("whisper") conversation.
   *
   * @param whisperId Whisper conversation id.
   * @param term Search term to query.
   * @returns A promise that resolves when results are fetched and assigned.
   */
  protected async searchWhisper(whisperId: string, term: string) {
    this.foundMessages = await this.chatService.searchInConversation('user', whisperId, term);
  }

  /**
   * Returns the raw user-entered search input trimmed of whitespace.
   *
   * @returns Trimmed input string.
   */
  protected getSearchTerm(): string {
    return this.recipientInput.trim();
  }

  /**
   * Determines whether the search should be global.
   *
   * Global search occurs when no recipient is selected.
   *
   * @returns True if `recipient` is empty, otherwise false.
   */
  protected isGlobalSearch(): boolean {
    return this.recipient.length === 0;
  }

  /**
   * Hides all search result containers (desktop + mobile variants).
   *
   * This method toggles CSS visibility by adding the `no-display` class
   * to known result containers.
   *
   * DOM ids used:
   * - search-results, search-results-2
   * - search-results-contacts, search-results-channels
   * - search-results-contacts-2, search-results-channels-2
   */
  protected hideSearchResults() {
    ['search-results', 'search-results-2',
      'search-results-contacts', 'search-results-channels',
        'search-results-contacts-2', 'search-results-channels-2'].forEach(id =>
          document.getElementById(id)?.classList.add('no-display'));
  }

  /**
   * Builds a deterministic whisper (direct message) conversation id between
   * the current user and another user.
   *
   * The ids are sorted to ensure both users generate the same conversation id.
   *
   * @param uid The other user's uid.
   * @returns The whisper conversation id in the form "uidA_uidB".
   */
  protected buildPartnerChat(uid: string): string {
    return [uid, this.authService.readCurrentUser()].sort().join('_');
  }

  /**
   * Extracts the partner uid from a whisper id (e.g. "uidA_uidB") given the current user's uid.
   *
   * @param whisperId Whisper id in the form "uidA_uidB".
   * @param myUid Current user's uid.
   * @returns The other participant's uid.
   */
  protected getPartnerUidFromWhisper(whisperId: string, myUid: string): string {
    const [a, b] = whisperId.split('_');
    return a === myUid ? b : a;
  }
}
