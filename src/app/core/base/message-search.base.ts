import { AuthService } from '../../auth.service';
import { ChatService } from '../../chat.service';
import { GlobalSearchResult } from '../interfaces/global-search-result';
import { BroadcastRecipient } from '../type/recipient';

export abstract class MessageSearchBase {

  recipientInput = '';
  recipient: BroadcastRecipient[] = [];
  foundMessages: GlobalSearchResult[] = [];

  protected constructor(
    protected chatService: ChatService,
    protected authService: AuthService
  ) {}

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

    document.getElementById('search-results')?.classList.remove('no-display');
    document.getElementById('search-results-2')?.classList.remove('no-display');
  }

  protected get searchTerm(): string {
    return this.recipientInput.replace(/^[@#]/, '').toLowerCase().trim();
  }

  protected async searchGlobal(term: string, users: any[], channels: any[]) {
    const channelIds = channels.map(c => c.id);
    const whisperIds = users.map(u => this.buildPartnerChat(u.uid));

    this.foundMessages = await this.chatService.searchGlobally(channelIds, whisperIds, term);
  }

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

  protected async searchChannel(channelId: string, term: string) {
    this.foundMessages = await this.chatService.searchInConversation('channel', channelId, term);
  }

  protected async searchWhisper(whisperId: string, term: string) {
    this.foundMessages = await this.chatService.searchInConversation('user', whisperId, term);
  }

  protected getSearchTerm(): string {
    return this.recipientInput.trim();
  }

  protected isGlobalSearch(): boolean {
    return this.recipient.length === 0;
  }

  protected hideSearchResults() {
    ['search-results', 'search-results-2',
      'search-results-contacts', 'search-results-channels',
      'search-results-contacts-2', 'search-results-channels-2'].forEach(id =>
        document.getElementById(id)?.classList.add('no-display')
      );
  }

  protected buildPartnerChat(uid: string): string {
    return [uid, this.authService.readCurrentUser()].sort().join('_');
  }

  protected getPartnerUidFromWhisper(whisperId: string, myUid: string): string {
    const [a, b] = whisperId.split('_');
    return a === myUid ? b : a;
  }
}
