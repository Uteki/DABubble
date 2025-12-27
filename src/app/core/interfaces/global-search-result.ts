import {ChatMessage} from "./chat-message";

export interface GlobalSearchResult extends ChatMessage {
  channelId?: string;
  whisperId?: string;
  nativeId?: string;
  type?: string;
}
