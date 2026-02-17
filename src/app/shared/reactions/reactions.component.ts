import { Component, EventEmitter, input, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Reaction map model.
 *
 * Key: emoji (e.g. "👍")
 * Value: list of user IDs that reacted with this emoji.
 */
type ReMap = Record<string, string[]>;

/**
 * ReactionsComponent
 *
 * UI component to display and manage emoji reactions for a message.
 *
 * Features:
 * - Renders reaction "chips" with counts and "by me" highlighting
 * - Supports compact/desktop limits with "show more/less"
 * - Provides an emoji picker (internal toggle or externally controlled)
 * - Normalizes common ASCII aliases (":)", "<3", ":+1", ...)
 * - Emits events for toggling reactions and adding new reactions
 *
 * External picker control:
 * - Use `[externalPickerOpen]` to control the picker from outside
 * - Listen to `(externalPickerOpenChange)` to keep state in sync (two-way binding compatible)
 *   Example: `<app-reactions [(externalPickerOpen)]="showPicker"> ... </app-reactions>`
 */
@Component({
  selector: 'app-reactions',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reactions.component.html',
  styleUrls: ['./reactions.component.scss'],
})
export class ReactionsComponent {

  /**
   * Current reactions for the message.
   *
   * Format: `{ "👍": ["uid1","uid2"], "❤️": ["uid3"] }`
   */
  @Input() reactions: ReMap = {};

  /** UID of the current logged-in user (used to mark own reactions). */
  @Input() currentUserId!: string;

  /** List of users used to resolve names for hover hints. */
  @Input() users: Array<{ uid: string; name: string }> = [];

  /** If true, renders a smaller/denser layout. */
  @Input() compact = false;

  /** Maximum number of reaction chips on desktop before collapsing. */
  @Input() maxDesktop = 20;

  /** Maximum number of reaction chips in compact mode before collapsing. */
  @Input() maxCompact = 7;

  /**
   * If true, picker is forced open/closed by the parent (external control).
   * Pair with `(externalPickerOpenChange)` or `[(externalPickerOpen)]`.
   */
  @Input() externalPickerOpen = false;

  /**
   * Optional emoji to add from outside.
   * If provided while `externalPickerOpen` changes, the emoji will be added.
   */
  @Input() addEmoji:string | undefined;

  /** True if the message belongs to the current user (styling hook). */
  @Input() isOwnMessage = false;

  /** True if the message does NOT belong to the current user (styling hook). */
  @Input() notOwnMessage = false;

  /**
   * Emits whenever the picker open state changes.
   * Enables two-way binding with `[(externalPickerOpen)]`.
   */
  @Output() externalPickerOpenChange = new EventEmitter<boolean>();

  /**
   * Emits when a reaction should be toggled (add/remove) for the current user.
   * Parent is responsible for persisting the change (e.g., Firestore update).
   */
  @Output() toggled = new EventEmitter<{ emoji: string; add: boolean }>();

  /**
   * Emits when a new emoji was selected/added (normalized).
   * Useful for "recent emojis" or analytics.
   */
  @Output() addedNew = new EventEmitter<string>();

  /** Whether the reactions list is expanded beyond the base limit. */
  expanded = false;

  /** Internal picker open flag (also synced with `externalPickerOpen`). */
  pickerOpen = false;

  /** Emojis displayed in the quick picker UI. */
  quickEmojis = ['😀', '👍', '🎉', '❤️', '😊', '🙏', '🚀', '🤔', '😅', '🔥', '✓'];

  /** Currently hovered emoji for hint display. */
  hintEmoji: string | null = null;

  /** Map to resolve display names from user IDs for hints/tooltips. */
  private nameById = new Map<string, string>();

  /**
   * ASCII → emoji normalization map.
   * Allows users to type shortcuts like ":)" or "<3".
   */
  private asciiAliases: Record<string, string> = {
    ':)': '😀', ':-)': '😀',
    ':D': '😃', ':-D': '😃',
    ':(': '☹️', ':-(': '☹️',
    ';)': '😉', ';-)': '😉',
    ':P': '😛', ':-P': '😛',
    '<3': '❤️', ':o': '😮',
    ':-o': '😮', ':O': '😮',
    ':-O': '😮', ":'(": '😢',
    ':+1': '👍', ':-1': '👎',
  };

  /**
   * Syncs internal state whenever inputs change.
   *
   * - Rebuilds `nameById` for hint rendering.
   * - When `externalPickerOpen` changes, mirrors it to `pickerOpen`.
   * - If `addEmoji` is provided during an `externalPickerOpen` change, adds it.
   *
   * @param changes Angular changes object for @Input properties.
   */
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

  /**
   * Returns all reactions as a sorted list with metadata for rendering.
   *
   * Sort:
   * - Higher count first
   * - Then emoji lexicographically (stable secondary order)
   */
  get all() {
    return Object.entries(this.reactions)
      .map(([emoji, users]) => ({
        emoji, count: users.length, byMe: users.includes(this.currentUserId), users,
      })).sort((a, b) => b.count - a.count || a.emoji.localeCompare(b.emoji));
  }

  /** Base number of visible chips based on `compact` mode. */
  get baseLimit() {
    return this.compact ? this.maxCompact : this.maxDesktop;
  }

  /** Actual number of visible chips depending on expanded state. */
  get visibleLimit() {
    return this.expanded ? Number.POSITIVE_INFINITY : this.baseLimit;
  }

  /** Visible subset of reactions for rendering. */
  get visible() {
    return this.all.slice(0, this.visibleLimit);
  }

  /** Number of hidden reactions when collapsed. */
  get hiddenCount() {
    const over = this.all.length - this.baseLimit;
    return over > 0 && !this.expanded ? over : 0;
  }

  /**
   * Normalizes an emoji input:
   * - trims whitespace
   * - maps ASCII aliases (case-insensitive where relevant)
   *
   * @param input Emoji or ASCII alias.
   * @returns Normalized emoji string.
   */
  private normalizeEmoji(input: string): string {
    if (!input) return input;
    const trimmed = input.trim();
    if (this.asciiAliases[trimmed]) return this.asciiAliases[trimmed];
    const lower = trimmed.toLowerCase();
    if (this.asciiAliases[lower]) return this.asciiAliases[lower];
    return trimmed;
  }

  /**
   * Toggles the current user's reaction for the given emoji.
   * Emits a `{ emoji, add }` payload; parent handles persistence.
   *
   * @param emoji Emoji to toggle (will be normalized).
   */
  toggle(emoji: string) {
    const e = this.normalizeEmoji(emoji);
    const users = this.reactions[e] ?? [];
    const has = users.includes(this.currentUserId);
    this.toggled.emit({ emoji: e, add: !has });
  }

  /**
   * Opens/closes the picker (internal toggle) and notifies parent
   * via `externalPickerOpenChange`.
   */
  openPicker() {
    this.pickerOpen = !this.pickerOpen;
    this.externalPickerOpenChange.emit(this.pickerOpen);
  }

  /**
   * Adds a new reaction (always "add true") and closes the picker.
   *
   * Emits:
   * - `externalPickerOpenChange(false)` to sync parent state
   * - `addedNew(normalizedEmoji)` for "recent" features
   * - `toggled({emoji, add:true})` for persistence
   *
   * @param emoji Emoji to add (will be normalized).
   */
  add(emoji: string) {
    const e = this.normalizeEmoji(emoji);
    this.pickerOpen = false;
    this.externalPickerOpenChange.emit(false);
    this.addedNew.emit(e);
    this.toggled.emit({ emoji: e, add: true });
  }

  /**
   * trackBy function for emoji lists to reduce DOM churn.
   *
   * @param _ index
   * @param r reaction item
   */
  trackByEmoji = (_: number, r: { emoji: string }) => r.emoji;

  /** Sets the hovered emoji for hint display. */
  showHint(emoji: string) {
    this.hintEmoji = emoji;
  }

  /** Clears the hint state. */
  hideHint() {
    this.hintEmoji = null;
  }

  /**
   * Resolves user display names for a given emoji reaction.
   *
   * @param emoji Emoji key in `reactions`.
   * @returns Array of user names (falls back to uid if unknown).
   */
  namesFor(emoji: string): string[] {
    const ids = this.reactions[emoji] ?? [];
    return ids.map((id) => this.nameById.get(id) || id);
  }

  /**
   * Tooltip/hint title text (comma-separated user names).
   *
   * @param emoji Emoji key.
   */
  hintTitle(emoji: string): string {
    const names = this.namesFor(emoji);
    return names.join(', ');
  }

  /**
   * Tooltip/hint subtitle text in German ("hat reagiert" vs "haben reagiert").
   *
   * @param emoji Emoji key.
   */
  hintSubtitle(emoji: string): string {
    const n = this.namesFor(emoji).length;
    return n === 1 ? 'hat reagiert' : 'haben reagiert';
  }
}
