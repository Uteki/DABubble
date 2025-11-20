import { Injectable } from '@angular/core';

const KEY = 'recent-emojis';

@Injectable({ providedIn: 'root' })
export class RecentEmojiService {
  get(max = 2): string[] {
    try {
      const raw = localStorage.getItem(KEY);
      const arr = raw ? (JSON.parse(raw) as string[]) : [];
      return Array.from(new Set(arr)).slice(0, max);
    } catch {
      return [];
    }
  }

  push(emoji: string) {
    try {
      const arr = this.get(100);
      const next = [emoji, ...arr.filter((e) => e !== emoji)];
      localStorage.setItem(KEY, JSON.stringify(next.slice(0, 50)));
    } catch {}
  }
}
