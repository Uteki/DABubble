/**
 * Scrolls to a specific message element in the DOM and temporarily highlights it.
 *
 * Behavior:
 * - Waits briefly to allow the view to render.
 * - Locates the message element via `data-message-id`.
 * - Smooth-scrolls the element into the center of the viewport.
 * - Applies a temporary highlight class for visual focus.
 *
 * @param messageId Unique id of the message to scroll to.
 */
export function goToMessage(messageId: string) {
  setTimeout(() => {
    const el = document.querySelector(`[data-message-id="${messageId}"]`);
    if (el) {
      const block: ScrollLogicalPosition = window.innerWidth < 768 ? 'nearest' : 'center';
      el.scrollIntoView({ behavior: 'smooth', block: block });
      el.classList.add('highlight');
      setTimeout(() => el.classList.remove('highlight'), 2000);
    }
  }, 300);
}

/**
 * Displays the correct search result chooser based on input trigger.
 *
 * Supported triggers:
 * - `@` → shows user/contacts results
 * - `#` → shows channel results
 *
 * This function directly manipulates DOM elements by id.
 *
 * @param value Raw input value from the search field.
 */
export function searchThrough(value: string) {
  const searchResultsContacts = document.getElementById('search-results-contacts-2');
  const searchResultsChannels = document.getElementById('search-results-channels-2');
  if (value === '@') {
    searchResultsContacts?.classList.remove('no-display');
  } else if (value === '#') {
    searchResultsChannels?.classList.remove('no-display');
  }
}
