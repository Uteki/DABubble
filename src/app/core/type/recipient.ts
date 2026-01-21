/**
 * Defines a recipient of a broadcast message.
 */
export type BroadcastRecipient =
  | {
  /** Identifies a channel recipient */
  type: 'channel';

  /** Channel ID */
  channelId: string;

  /** Display name of the channel */
  name: string;
}
  | {
  /** Identifies a user recipient */
  type: 'user';

  /** Unique partner chat identifier */
  partnerChat: string;

  /** Display name of the user */
  name: string;

  /** Email address of the user */
  mail: string;

  /** Avatar image of the user */
  avatar: string;
};
