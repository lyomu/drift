/** Shared "First Last" formatter for notification copy — falls back to a
 * generic label rather than an empty string if names aren't set. */
export function displayName(user: {
  firstName: string | null;
  lastName: string | null;
}): string {
  const parts = [user.firstName, user.lastName].filter((p): p is string => !!p);
  return parts.length > 0 ? parts.join(' ') : 'A player';
}
