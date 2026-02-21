import { Directive, HostListener } from '@angular/core';

/**
 * StopPropagationDirective
 *
 * Directive that prevents click events from bubbling
 * up the DOM tree.
 *
 * Useful when:
 * - Clicking inside modals / overlays
 * - Preventing parent click handlers
 * - Avoiding unintended UI closes (e.g. dropdowns)
 *
 * Example usage:
 * ```html
 * <div click-stop-propagation>
 *   <!-- clicks here won't reach parent -->
 * </div>
 * ```
 *
 * Standalone directive → can be imported directly
 * into Angular standalone components.
 */
@Directive({
  selector: '[click-stop-propagation]',
  standalone: true
})
export class StopPropagationDirective {

  /**
   * Intercepts click events on the host element
   * and stops them from propagating to parent elements.
   *
   * @param event - Native DOM click event
   */
  @HostListener("click", ["$event"])
  public onClick(event: any): void
  {
      event.stopPropagation();
  }
}
