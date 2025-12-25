export interface ChatMessage {
  id: string;
  text: string;
  user: string;
  uid: string;
  timestamp: number;
  system?: boolean;
  reaction?: any;
}
