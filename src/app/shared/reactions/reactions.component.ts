import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RecentEmojiService } from './recent-emoji.service';

type ReMap = Record<string, string[]>;

@Component({
  selector: 'app-reactions',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reactions.component.html',
  styleUrls: ['./reactions.component.scss'],
})
export class ReactionsComponent {
  @Input() reactions: ReMap = {};
  @Input() currentUserId!: string;
  @Input() users: Array<{ uid: string; name: string }> = [];

  @Input() compact = false;
  @Input() maxDesktop = 20;
  @Input() maxCompact = 7;

  @Output() toggled = new EventEmitter<{ emoji: string; add: boolean }>();
  @Output() addedNew = new EventEmitter<string>();

  expanded = false;
  pickerOpen = false;

  quickEmojis = ['😀', '👍', '🎉', '❤️', '😊', '🙏', '🚀', '🤔', '😅', '🔥'];

  hintEmoji: string | null = null;
  private nameById = new Map<string, string>();

  ngOnChanges() {
    this.nameById.clear();
    for (const u of this.users) this.nameById.set(u.uid, u.name);
  }

  get all() {
    return Object.entries(this.reactions)
      .map(([emoji, users]) => ({
        emoji,
        count: users.length,
        byMe: users.includes(this.currentUserId),
        users,
      }))
      .sort((a, b) => b.count - a.count || a.emoji.localeCompare(b.emoji));
  }

  get baseLimit() {
    return this.compact ? this.maxCompact : this.maxDesktop;
  }
  get visibleLimit() {
    return this.expanded ? Number.POSITIVE_INFINITY : this.baseLimit;
  }
  get visible() {
    return this.all.slice(0, this.visibleLimit);
  }
  get hiddenCount() {
    const over = this.all.length - this.baseLimit;
    return over > 0 && !this.expanded ? over : 0;
  }

  toggle(emoji: string) {
    const users = this.reactions[emoji] ?? [];
    const has = users.includes(this.currentUserId);
    this.toggled.emit({ emoji, add: !has });
  }

  openPicker() {
    this.pickerOpen = !this.pickerOpen;
  }
  add(emoji: string) {
    this.pickerOpen = false;
    this.addedNew.emit(emoji);
    this.toggled.emit({ emoji, add: true });
  }

  trackByEmoji = (_: number, r: { emoji: string }) => r.emoji;

  showHint(emoji: string) {
    this.hintEmoji = emoji;
  }
  hideHint() {
    this.hintEmoji = null;
  }
  namesFor(emoji: string): string[] {
    const ids = this.reactions[emoji] ?? [];
    return ids.map((id) => this.nameById.get(id) || id);
  }
  hintTitle(emoji: string): string {
    const names = this.namesFor(emoji);
    return names.join(', ');
  }
  hintSubtitle(emoji: string): string {
    const n = this.namesFor(emoji).length;
    return n === 1 ? 'hat reagiert' : 'haben reagiert';
  }
}
