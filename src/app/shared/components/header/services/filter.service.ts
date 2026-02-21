import { Injectable } from '@angular/core';
import { BroadcastRecipient } from '../../../../core/type/recipient';

/**
 * FilterService
 *
 * Pure filtering/sorting helpers used by the Header recipient input.
 * Keeps the component lean by moving non-UI logic into a testable service.
 *
 * Notes:
 * - No DOM access here.
 * - No state is stored here.
 * - Methods are deterministic based on inputs.
 */
@Injectable({ providedIn: 'root' })
export class FilterService {

  /**
   * Filters and sorts users for the header recipient search input.
   *
   * Supported search modes:
   * - `@name`  → search by user name
   * - `text`   → search by email (when the input does NOT start with '@' or '#')
   *
   * Also:
   * - excludes already added user recipients (based on `partnerChat` id)
   * - sorts alphabetically by name
   *
   * @param params Configuration object.
   * @param params.users Full user list to search in.
   * @param params.recipient Currently selected recipients (users/channels).
   * @param params.recipientInput Raw input value from the UI.
   * @param params.searchTerm Normalized search term (e.g. lowercased, stripped '@').
   * @param params.buildPartnerChat Function that builds the whisper/partnerChat id for a user uid.
   *
   * @returns A filtered and sorted list of user objects matching the search.
   */
  getFilteredUsers(params: { users: any[]; recipient: BroadcastRecipient[]; recipientInput: string; searchTerm: string; buildPartnerChat: (uid: string) => string; }): any[] {
    const { users, recipient, recipientInput, searchTerm, buildPartnerChat } = params;
    const isUserSearch = recipientInput.startsWith('@');
    const isChannelSearch = recipientInput.startsWith('#');
    const isEmailSearch = !isUserSearch && !isChannelSearch && recipientInput.length > 0;
    if (!isUserSearch && !isEmailSearch) return [];
    const usedPartnerChats = new Set(recipient.filter((r) => r.type === 'user').map((r) => (r as any).partnerChat));
    return users.filter((u) => !usedPartnerChats.has(buildPartnerChat(u.uid))).filter((u) => {
        if (isUserSearch) {
          if (!searchTerm) return true;
          return u.name?.toLowerCase().includes(searchTerm);
        }
        return u.email?.toLowerCase().includes(recipientInput.toLowerCase());
      }).sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
  }

  /**
   * Filters and sorts channels for the header recipient search input.
   *
   * Active only when the input starts with `#`.
   *
   * Also:
   * - excludes already added channel recipients (based on channelId)
   * - filters by channel name
   * - sorts alphabetically by name
   *
   * @param params Configuration object.
   * @param params.channels Full channel list to search in.
   * @param params.recipient Currently selected recipients (users/channels).
   * @param params.recipientInput Raw input value from the UI.
   * @param params.searchTerm Normalized search term (e.g. lowercased, stripped '#').
   *
   * @returns A filtered and sorted list of channel objects matching the search.
   */
  getFilteredChannels(params: { channels: any[]; recipient: BroadcastRecipient[]; recipientInput: string; searchTerm: string; }): any[] {
    const { channels, recipient, recipientInput, searchTerm } = params;
    if (!recipientInput.startsWith('#')) return [];
    const usedChannelIds = new Set(
      recipient.filter((r) => r.type === 'channel').map((r) => (r as any).channelId)
    );
    return channels.filter((c) => !usedChannelIds.has(c.id))
      .filter((c) => !searchTerm || c.name?.toLowerCase().includes(searchTerm))
      .sort((a, b) => a.name.localeCompare(b.name));
  }
}
