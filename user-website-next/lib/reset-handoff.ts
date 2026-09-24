interface ResetHandoff {
  token: string;
  email: string;
}

let pending: ResetHandoff | null = null;

/**
 * Carries the reset token from the email step to the set-password step.
 *
 * Deliberately not a query parameter: that token is a short licence to change someone's
 * password, and a URL ends up in browser history, in the referrer header of the next
 * request, and in any proxy log on the way. Single use, so reloading the second screen
 * sends the visitor back to the first — which is the right outcome anyway.
 */
export function setResetHandoff(value: ResetHandoff): void {
  pending = value;
}

export function takeResetHandoff(): ResetHandoff | null {
  const value = pending;
  pending = null;
  return value;
}
