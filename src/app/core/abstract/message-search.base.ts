export abstract class MessageSearchBase {

  recipientInput = '';
  recipient: any[] = [];
  foundMessages: any[] = [];

  protected buildPartnerChat(uid: string, myUid: string): string {
    return [uid, myUid].sort().join('_');
  }

  protected getPartnerUidFromWhisper(whisperId: string, myUid: string): string {
    const [a, b] = whisperId.split('_');
    return a === myUid ? b : a;
  }

  protected isUserSearch(value: string) {
    return value.startsWith('@');
  }

  protected isChannelSearch(value: string) {
    return value.startsWith('#');
  }

  protected get searchTerm(): string {
    return this.recipientInput.replace(/^[@#]/, '').toLowerCase().trim();
  }
}
