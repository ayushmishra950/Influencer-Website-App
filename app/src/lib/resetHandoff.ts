interface ResetHandoff {
  token: string;
  email: string;
}

let pending: ResetHandoff | null = null;

/**
 * Carries the reset token from the email step to the set-password step.
 *
 * Deliberately not a route param: params end up in the address bar on web, and this
 * token is a 15-minute licence to change someone's password — not something to leave
 * in browser history. Single use, so reloading the second screen sends the visitor
 * back to the first, which is the right outcome anyway.
 */
export function setResetHandoff(value: ResetHandoff): void {
  pending = value;
}

export function takeResetHandoff(): ResetHandoff | null {
  const value = pending;
  pending = null;
  return value;
}
