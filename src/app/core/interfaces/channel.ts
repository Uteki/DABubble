/**
 * Represents a chat channel that can contain multiple users and messages.
 */
export interface Channel {
  /** Unique channel identifier */
  id: string;

  /** Human-readable channel name */
  name: string;

  /** Optional channel description */
  description: string;

  /** User ID of the channel creator */
  creator: string;

  /** List of user IDs that are members of this channel */
  users?: string[];
}
