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
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
export function checkResultType(value: string) {
  const searchResultsContacts = document.getElementById('search-results-contacts');
  const searchResultsChannels = document.getElementById('search-results-channels');
  if (value === '@') {
    searchResultsContacts?.classList.remove('no-display');
  } else if (value === '#') {
    searchResultsChannels?.classList.remove('no-display');
  }
}

/**
 * Returns the large avatar image path.
 *
 * If a small avatar path is provided, it replaces the size suffix
 * (`avatarSmall` → `avatar`) to load the large version.
 * Falls back to the default profile avatar when missing.
 *
 * @param avatarPath Path to the stored avatar image.
 * @returns Resolved large avatar path.
 */
export function getLargeAvatar(avatarPath: string | undefined): string {
  if (!avatarPath) return 'assets/avatars/profile.png';
  return avatarPath.replace('avatarSmall', 'avatar');
}

/**
 * Resolves the avatar path for display.
 *
 * Returns the provided avatar if available,
 * otherwise falls back to the default profile avatar.
 *
 * @param userAvatar Stored avatar path of the user.
 * @returns Avatar path safe for UI display.
 */
export function  returnAvatarPath(userAvatar: any): string {
  if (userAvatar && userAvatar.length > 0) {
    return userAvatar;
  } else {
    return 'assets/avatars/profile.png';
  }
}

/**
 * Subscribes to idle tracking streams and updates absence state.
 *
 * Unused function for later!
 *
 * @param idleTracker Idle tracking service instance.
 * @param isUserAbsent Mutable absence flag reference.
 */
export function trackIdle(idleTracker: any, isUserAbsent: any) {
  idleTracker.idleTime$.subscribe((idleTime: any) => {
    isUserAbsent = idleTime / 1000 > 30;
  });

  idleTracker.isIdle$.subscribe((isIdle: any) => {
    if (!isIdle) isUserAbsent = false;
  });
}
