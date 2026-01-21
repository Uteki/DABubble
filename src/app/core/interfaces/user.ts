/**
 * Represents an application user.
 */
export interface User {
  /** URL or path to the user's avatar image */
  avatar: string;

  /** Email address of the user */
  email: string;

  /** Internal user identifier */
  id: string;

  /** Display name of the user */
  name: string;

  /** Current user status (e.g. online, offline, away) */
  status: string;

  /** Authentication user ID */
  uid: string;
}
