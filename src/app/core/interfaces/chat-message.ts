/**
 * Represents a single chat message.
 */
export interface ChatMessage {
  /** Unique message identifier */
  id: string;

  /** Message content */
  text: string;

  /** Display name of the sender */
  user: string;

  /** User ID of the sender */
  uid: string;

  /** Unix timestamp in milliseconds */
  timestamp: number;

  /** Indicates whether this is a system-generated message */
  system?: boolean;

  /** Emoji reactions mapped to users (implementation-specific) */
  reaction?: Record<string, string[]>;
}
