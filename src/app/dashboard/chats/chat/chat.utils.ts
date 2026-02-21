/** Unused function for later purposes **/
export function toggleProfile() {}

/** Unused function for later purposes **/
export function keepMenuOpen() {}

/** Unused function **/
export function  stripEmptyReactions(reactions: Record<string, string[]>): Record<string, string[]> {
  const cleaned: Record<string, string[]> = {};
  for (const key of Object.keys(reactions)) {
    const arr = reactions[key];
    if (Array.isArray(arr) && arr.length > 0) cleaned[key] = arr;
  } return cleaned;
}
