export type BroadcastRecipient =
  | {
  type: 'channel';
  channelId: string;
  name: string;
}
  | {
  type: 'user';
  partnerChat: string;
  name: string;
  mail: string;
  avatar: string;
};
