import { Injectable } from '@angular/core';

const KEY = 'recent-emojis';

/**
 * RecentEmojiService
 *
 * Small persistence helper for "recently used" emojis.
 *
 * Stores the list in `localStorage` under a fixed key and provides:
 * - {@link get} to read the most recent emojis (deduplicated)
 * - {@link push} to add/update an emoji as "most recent"
 *
 * Notes:
 * - Uses `try/catch` to stay safe in environments where `localStorage`
 *   is unavailable/blocked (private mode, SSR, browser restrictions).
 * - Maintains uniqueness and recency (most recent first).
 */
@Injectable({ providedIn: 'root' })
export class RecentEmojiService {

  /**
   * Returns the most recently used emojis.
   *
   * The returned list is:
   * - deduplicated
   * - ordered by recency (most recent first)
   * - limited to `max` entries
   *
   * @param max Maximum number of emojis to return (default: 2).
   * @returns Array of emoji strings (may be empty).
   */
  get(max = 2): string[] {
    try {
      const raw = localStorage.getItem(KEY);
      const arr = raw ? (JSON.parse(raw) as string[]) : [];
      return Array.from(new Set(arr)).slice(0, max);
    } catch {
      return [];
    }
  }

  /**
   * Adds an emoji to the recent list.
   *
   * Behavior:
   * - moves the emoji to the front if it already exists
   * - keeps the list length bounded (stores up to 50)
   *
   * @param emoji Emoji character to store.
   */
  push(emoji: string) {
    try {
      const arr = this.get(100);
      const next = [emoji, ...arr.filter((e) => e !== emoji)];
      localStorage.setItem(KEY, JSON.stringify(next.slice(0, 50)));
    } catch {}
  }
}
