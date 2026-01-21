import { ChatMessage } from './chat-message';

/**
 * Represents a global search result that extends a chat message
 * and may belong to different contexts.
 */
export interface GlobalSearchResult extends ChatMessage {
  /** ID of the channel where the message was found */
  channelId?: string;

  /** ID of the whisper/private chat */
  whisperId?: string;

  /** Native message identifier (e.g. database-specific) */
  nativeId?: string;

  /** Type of the search result (e.g. channel, whisper, system) */
  type?: string;
}
