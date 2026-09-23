import type { ConfirmOptions } from '@/context/ConfirmContext';
import type { BulkAction } from './types';

/**
 * Every confirmation the dashboard asks for, in one place.
 *
 * Wording matters here: a dialog that just says "Are you sure?" trains people to
 * click through without reading. Each one states what will actually happen — whether
 * the influencer is notified, whether they can still sign in, whether it is reversible.
 */

const SUBJECT = (name?: string) => name ?? 'this influencer';

export const confirmApprove = (name?: string): ConfirmOptions => ({
  title: 'Approve this influencer?',
  description: `${SUBJECT(name)} will be able to sign in and will appear in the public directory. They are notified straight away.`,
  confirmLabel: 'Approve',
  tone: 'success',
});

export const confirmReject = (name?: string): ConfirmOptions => ({
  title: 'Reject this registration?',
  description: `${SUBJECT(name)} will not be able to sign in, and any open session ends immediately. You can approve them later.`,
  confirmLabel: 'Reject',
  prompt: {
    label: 'Reason (optional)',
    placeholder: 'e.g. Audience could not be verified',
    maxLength: 300,
  },
});

export const confirmArchive = (name?: string): ConfirmOptions => ({
  title: 'Archive this influencer?',
  description: `${SUBJECT(name)} leaves the public directory and is signed out. Nothing is deleted — you can restore them at any time.`,
  confirmLabel: 'Archive',
});

export const confirmRestore = (name?: string): ConfirmOptions => ({
  title: 'Restore this influencer?',
  description: `${SUBJECT(name)} returns to the directory and can sign in again, subject to their approval status.`,
  confirmLabel: 'Restore',
  tone: 'success',
});

export const confirmDelete = (name?: string): ConfirmOptions => ({
  title: 'Delete permanently?',
  description: `${SUBJECT(name)} and their login account are removed for good. This cannot be undone.`,
  confirmLabel: 'Delete permanently',
  tone: 'danger',
  note: 'Prefer Archive unless you are certain — archived records can be restored.',
});

/** Bulk variants name the count instead of a person. */
export function confirmBulk(action: BulkAction, count: number): ConfirmOptions {
  const subject = `${count} influencer${count === 1 ? '' : 's'}`;
  const map: Record<BulkAction, ConfirmOptions> = {
    approve: {
      title: `Approve ${subject}?`,
      description: `All ${count} will be able to sign in and appear in the public directory. Each one is notified.`,
      confirmLabel: `Approve ${count}`,
      tone: 'success',
    },
    reject: {
      title: `Reject ${subject}?`,
      description: `None of them will be able to sign in, and any open sessions end immediately.`,
      confirmLabel: `Reject ${count}`,
      prompt: { label: 'Reason (optional)', placeholder: 'Shown to everyone you reject', maxLength: 300 },
    },
    archive: {
      title: `Archive ${subject}?`,
      description: `They leave the public directory and are signed out. Nothing is deleted — you can restore them later.`,
      confirmLabel: `Archive ${count}`,
    },
    restore: {
      title: `Restore ${subject}?`,
      description: `They return to the directory and can sign in again, subject to their approval status.`,
      confirmLabel: `Restore ${count}`,
      tone: 'success',
    },
    delete: {
      title: `Delete ${subject} permanently?`,
      description: `Their profiles and login accounts are removed for good. This cannot be undone.`,
      confirmLabel: `Delete ${count} permanently`,
      tone: 'danger',
      note: 'Prefer Archive unless you are certain — archived records can be restored.',
    },
  };
  return map[action];
}

export const confirmSignOut = (): ConfirmOptions => ({
  title: 'Sign out?',
  description: 'You will need to sign in again to manage influencers.',
  confirmLabel: 'Sign out',
});

export const confirmSaveInfluencer = (isEdit: boolean, name: string): ConfirmOptions =>
  isEdit
    ? {
        title: 'Save these changes?',
        description: `${name || 'This influencer'} is updated across the directory immediately, and they are notified that an administrator changed their profile.`,
        confirmLabel: 'Save changes',
      }
    : {
        title: 'Create this influencer?',
        description: `${name || 'This influencer'} is added to the platform with the status you selected.`,
        confirmLabel: 'Create influencer',
      };

export const confirmCategoryVisibility = (name: string, willHide: boolean): ConfirmOptions =>
  willHide
    ? {
        title: `Hide ${name}?`,
        description: 'It disappears from registration and from the directory filters. Influencers already in it keep their category.',
        confirmLabel: 'Hide category',
      }
    : {
        title: `Show ${name}?`,
        description: 'It becomes selectable again during registration and in the directory filters.',
        confirmLabel: 'Show category',
        tone: 'success',
      };

export const confirmDeleteCategory = (name: string, inUse: number): ConfirmOptions => ({
  title: 'Delete this category?',
  description:
    inUse > 0
      ? `${name} is used by ${inUse} influencer${inUse === 1 ? '' : 's'}. The server will refuse this — hide it instead so it disappears from new registrations.`
      : `${name} is removed from the master list. This cannot be undone.`,
  confirmLabel: 'Delete',
  tone: 'danger',
});

export const confirmClearNotifications = (count: number): ConfirmOptions => ({
  title: 'Clear all notifications?',
  description: `${count} notification${count === 1 ? '' : 's'} will be removed from your inbox. This cannot be undone.`,
  confirmLabel: 'Clear all',
  tone: 'danger',
});

/* ------------------------------------------------------------------ packages */

export const confirmApprovePackage = (
  title: string,
  who: string,
  influencerIsPublic = true,
): ConfirmOptions => ({
  title: 'Approve this package?',
  description: influencerIsPublic
    ? `"${title}" goes live on ${who}'s public profile immediately, and they are notified.`
    : `"${title}" will be approved, but ${who} is not in the public directory, so nobody will see it until their profile is approved too.`,
  confirmLabel: 'Approve',
  tone: 'success',
  ...(influencerIsPublic
    ? {}
    : { note: `Approve ${who} first if you want this visible now.` }),
});

export const confirmRejectPackage = (title: string, who: string): ConfirmOptions => ({
  title: 'Reject this package?',
  description: `"${title}" stays off ${who}'s public profile. They see the reason and can edit and resubmit.`,
  confirmLabel: 'Reject',
  prompt: {
    label: 'Reason (optional)',
    placeholder: 'e.g. Price does not match the media kit',
    maxLength: 300,
  },
});

export const confirmDeletePackage = (title: string): ConfirmOptions => ({
  title: 'Delete this package?',
  description: `"${title}" is removed for good. The influencer is not notified, and they can submit a new one.`,
  confirmLabel: 'Delete permanently',
  tone: 'danger',
});

export const confirmChangePassword = (): ConfirmOptions => ({
  title: 'Change your password?',
  description:
    'You will sign in with the new password from now on. Sessions already open elsewhere keep working until their token expires.',
  confirmLabel: 'Update password',
});
