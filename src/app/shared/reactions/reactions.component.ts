import { Component, EventEmitter, input, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

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
  @Input() externalPickerOpen = false;
  @Input() addEmoji:string | undefined;
  @Input() isOwnMessage = false;
  @Input() notOwnMessage = false;

  @Output() externalPickerOpenChange = new EventEmitter<boolean>();
  @Output() toggled = new EventEmitter<{ emoji: string; add: boolean }>();
  @Output() addedNew = new EventEmitter<string>();

  expanded = false;
  pickerOpen = false;

  quickEmojis = ['😀', '👍', '🎉', '❤️', '😊', '🙏', '🚀', '🤔', '😅', '🔥', '✓'];

  hintEmoji: string | null = null;
  private nameById = new Map<string, string>();

  private asciiAliases: Record<string, string> = {
    ':)': '😀',
    ':-)': '😀',
    ':D': '😃',
    ':-D': '😃',
    ':(': '☹️',
    ':-(': '☹️',
    ';)': '😉',
    ';-)': '😉',
    ':P': '😛',
    ':-P': '😛',
    '<3': '❤️',
    ':o': '😮',
    ':-o': '😮',
    ':O': '😮',
    ':-O': '😮',
    ":'(": '😢',
    ':+1': '👍',
    ':-1': '👎',
  };

  ngOnChanges(changes: any) {
    this.nameById.clear();
    for (const u of this.users) this.nameById.set(u.uid, u.name);

    if (changes.externalPickerOpen) {
      this.pickerOpen = this.externalPickerOpen;

      if (this.addEmoji !== undefined) {
        this.add(this.addEmoji);
      }
    }
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

  private normalizeEmoji(input: string): string {
    if (!input) return input;
    const trimmed = input.trim();
    if (this.asciiAliases[trimmed]) return this.asciiAliases[trimmed];
    const lower = trimmed.toLowerCase();
    if (this.asciiAliases[lower]) return this.asciiAliases[lower];
    return trimmed;
  }

  toggle(emoji: string) {
    const e = this.normalizeEmoji(emoji);
    const users = this.reactions[e] ?? [];
    const has = users.includes(this.currentUserId);
    this.toggled.emit({ emoji: e, add: !has });
  }

  openPicker() {
    this.pickerOpen = !this.pickerOpen;
    this.externalPickerOpenChange.emit(this.pickerOpen);
  }

  add(emoji: string) {
    const e = this.normalizeEmoji(emoji);
    this.pickerOpen = false;
    this.externalPickerOpenChange.emit(false);
    this.addedNew.emit(e);
    this.toggled.emit({ emoji: e, add: true });
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
