import { Injectable } from '@angular/core';

export type ActiveMention = {
  /** Mention trigger character (user or channel). */
  trigger: '@' | '#';
  /** Index where the mention starts in the input text (inclusive). */
  startIndex: number;
  /** Index where the mention ends in the input text (exclusive). */
  endIndex: number;
};

export type InsertMentionResult = {
  /** Updated composer text after inserting the mention. */
  nextText: string;
  /** Caret position that should be set after insertion. */
  nextCursor: number;
};

/**
 * ActionService
 *
 * Small UI/action helpers for chat/message components.
 *
 * Notes:
 * - Some methods intentionally mutate the given message object (optimistic UI updates).
 * - A few helpers read/manipulate DOM elements by id (e.g. composer textarea). This keeps
 *   component code smaller, but it also means the service assumes those ids exist.
 */
@Injectable({
  providedIn: 'root'
})
export class ActionService {

  constructor() { }

  /**
   * Converts common ASCII emoticons in a string to emoji characters.
   *
   * Examples:
   * - ":)" -> "😀"
   * - "<3" -> "❤️"
   * - "+1" -> "👍"
   *
   * @param s - Raw input string
   * @returns The transformed string (or the original string if empty)
   */
  toEmoji(s: string) {
    if (!s) return s;
    return s.replace(/:-?\)/g, '😀').replace(/:-?D/gi, '😃')
      .replace(/;-?\)/g, '😉').replace(/:-?\(/g, '☹️')
      .replace(/:-?P/gi, '😛').replace(/:o/gi, '😮')
      .replace(/:'\(/g, '😢').replace(/\+1/g, '👍')
      .replace(/-1/g, '👎').replace(/<3/g, '❤️');
  }

  /**
   * Applies a reaction toggle to a message object (optimistic UI update).
   * Mutates `msg.reactions` in-place.
   *
   * @param msg - Message object to update
   * @param ev - Reaction event (`emoji` + whether to `add`)
   * @param meId - Current user id
   */
  emojiRow(msg: any, ev: any, meId: string) {
    msg.reactions = msg.reactions ?? {};
    const list: string[] = msg.reactions[ev.emoji] ?? (msg.reactions[ev.emoji] = []);
    const i = list.indexOf(meId);
    if (ev.add && i === -1) list.push(meId);
    if (!ev.add && i !== -1) list.splice(i, 1);
    if (list.length === 0) delete msg.reactions[ev.emoji];
  }

  /**
   * Inserts an emoji into the composer textarea at the current selection/caret.
   * If the textarea cannot be found, it falls back to appending at the end.
   *
   * This method also restores focus and places the caret after the inserted emoji.
   *
   * @param emoji - Emoji to insert
   * @param messageText - Current composer text
   * @returns Updated composer text
   */
  emojiTextarea(emoji: string, messageText: string): string {
    const ta = document.getElementById('composer-chat') as HTMLTextAreaElement | null;
    const v = messageText || '';
    if (!ta) {
      return v + emoji;
    }
    const start = ta.selectionStart ?? v.length;
    const end = ta.selectionEnd ?? v.length;
    messageText = v.slice(0, start) + emoji + v.slice(end);
    queueMicrotask(() => {
      ta.focus(); const pos = start + emoji.length; ta.setSelectionRange(pos, pos);
    });
    return messageText;
  }

  /**
   * Applies hover/highlight classes to a message based on:
   * - whether the message belongs to the current user
   * - whether the pointer is on an element inside `.message-event`
   *
   * @param messageId - Message id (used to find `#message-text-${id}`)
   * @param messageUid - Author uid of the message
   * @param userUid - Current user uid
   * @param event - Optional mouse event (used to detect `.message-event`)
   */
  hoverOnFocus(messageId: string, messageUid: string, userUid: string, event?: MouseEvent) {
    const messageElement = document.getElementById('message-text-' + messageId);
    if (messageElement && event) {
      const target = event.target as HTMLElement;
      const messageEvent = target.closest('.message-event');
      if (messageEvent) {
        messageElement.classList.remove('hovered-message');
        messageElement.classList.remove('hovered-own-message');
      } else {
        messageUid === userUid ? messageElement.classList.add('hovered-own-message') : messageElement.classList.add('hovered-message')
      }
    }
  }

  /**
   * Builds the next component state required to enter "edit message" mode.
   * Returns `null` if the message does not exist or is not owned by the user.
   *
   * @param messageId - Message to edit
   * @param messages - Message list to search in
   * @param userId - Current user id (ownership check)
   * @returns Edit state object or `null` if editing is not allowed
   */
  beginEdit(messageId: string, messages: any[], userId: string): { editingMessageId: string; editingMessageText: string; editMessageMenuOpen: string | null; editMessageIsOpen: boolean; } | null {
    const message = messages.find((m) => m.id === messageId);
    if (!message || message.uid !== userId) return null;
    return {
      editingMessageId: messageId, editingMessageText: message.text ?? '',
      editMessageMenuOpen: null, editMessageIsOpen: true,
    };
  }

  /**
   * Adds a CSS class to visually highlight an owned message.
   * Useful when switching into edit mode.
   *
   * @param messageId - Message id to highlight
   */
  highlightOwnMessage(messageId: string): void {
    const el = document.getElementById('message-text-' + messageId);
    el?.classList.add('hovered-own-message');
  }

  /**
   * Pure helper that returns the new text and caret position after inserting a mention.
   * Does not touch the DOM.
   *
   * @param name - Mention target (without trigger)
   * @param text - Current composer text
   * @param activeMention - Mention metadata describing which range should be replaced
   * @returns The updated text + next caret position, or `null` if no active mention exists
   */
  testInsertMention(name: string, text: string, activeMention: ActiveMention | null): InsertMentionResult | null {
    if (!activeMention) return null;
    const { trigger, startIndex, endIndex } = activeMention;
    const before = (text ?? '').slice(0, startIndex);
    const after = (text ?? '').slice(endIndex);
    const mentionText = `${trigger}${name} `;
    const nextText = before + mentionText + after;
    const nextCursor = before.length + mentionText.length;
    return { nextText, nextCursor };
  }
}
