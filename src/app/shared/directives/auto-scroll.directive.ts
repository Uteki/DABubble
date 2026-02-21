import { Directive, ElementRef, Input, OnChanges, SimpleChanges } from '@angular/core';

/**
 * AutoScrollDirective
 *
 * Directive that automatically scrolls a container
 * to the bottom whenever the bound message list changes.
 *
 * Commonly used in chat interfaces to ensure the latest
 * message is always visible without requiring manual scrolling.
 *
 * Usage example:
 * ```html
 * <div chat-scroll [messages]="messages"></div>
 * ```
 */
@Directive({
  standalone: true,
  selector: '[chat-scroll]'
})
export class AutoScrollDirective implements OnChanges {

  /**
   * Message collection bound from the parent component.
   *
   * The directive listens for changes in the array length
   * to determine when new messages have been added.
   */
  @Input() messages: any[] = [];

  /**
   * Reference to the host DOM element.
   *
   * Used to directly manipulate scroll position.
   */
  constructor(private el: ElementRef) {}

  /**
   * Angular lifecycle hook triggered when input properties change.
   *
   * Detects changes to the `messages` array and compares
   * the current and previous lengths.
   *
   * If the length differs, it assumes new messages were added
   * and scrolls the container to the bottom.
   *
   * @param changes - Object containing changed input properties.
   */
  ngOnChanges(changes: SimpleChanges) {
    const change = changes['messages'];
    if (change && change.currentValue?.length !== change.previousValue?.length) {
      this.scrollToBottom();
    }
  }

  /**
   * Scrolls the host element to its bottom.
   *
   * Uses a microtask (`Promise.resolve`) to ensure the DOM
   * has finished rendering new messages before calculating
   * scroll height.
   */
  private scrollToBottom() {
    Promise.resolve().then(() => {
      const native = this.el.nativeElement;
      native.scrollTop = native.scrollHeight;
    });
  }
}
