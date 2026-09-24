'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Avatar } from '@/components/Avatar';
import { Dialog } from '@/components/Dialog';
import { FormError } from '@/components/FormError';
import { PasswordField } from '@/components/PasswordField';
import { EditProfileDialog } from '@/components/EditProfileDialog';
import { PackageDialog } from '@/components/PackageDialog';
import { apiRequest, errorMessage, tokenStore } from '@/lib/client-api';
import { deliveryLabel, formatPrice, handleFrom, locationLine } from '@/lib/format';
import { notifySessionChange } from '@/lib/session';
import { MAX_PACKAGES, type Category, type OwnPackage, type OwnProfile } from '@/lib/types';

const STATUS_COPY: Record<string, { label: string; body: string; tone: string }> = {
  approved: {
    label: 'Live in the directory',
    body: 'Brands browsing Aura can find and contact you.',
    tone: 'var(--mint-400)',
  },
  pending: {
    label: 'Under review',
    body: 'Our team is checking your accounts. You will be notified when that changes.',
    tone: 'var(--amber-400)',
  },
  rejected: {
    label: 'Not approved',
    body: 'Your registration was not approved. Please contact support for the reason.',
    tone: 'var(--rose-400)',
  },
};

const PACKAGE_TONE: Record<string, { label: string; tone: string; bg: string }> = {
  approved: { label: 'Live on your profile', tone: 'var(--mint-400)', bg: 'var(--mint-bg)' },
  pending: { label: 'Under review', tone: 'var(--amber-400)', bg: 'var(--amber-bg)' },
  rejected: { label: 'Not approved', tone: 'var(--rose-400)', bg: 'var(--rose-bg)' },
};

export function ProfileView({ categories }: { categories: Category[] }) {
  const router = useRouter();

  const [profile, setProfile] = useState<OwnProfile | null>(null);
  const [email, setEmail] = useState('');
  const [packages, setPackages] = useState<OwnPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [editing, setEditing] = useState(false);
  const [packageSheet, setPackageSheet] = useState<{ open: boolean; editing: OwnPackage | null }>({
    open: false,
    editing: null,
  });
  const [removing, setRemoving] = useState<OwnPackage | null>(null);
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordDone, setPasswordDone] = useState(false);
  const [saving, setSaving] = useState(false);

  const started = useRef(false);

  // Own packages, not the public list: this view has to show pending and rejected ones
  // too, and the reason a rejection happened.
  async function loadPackages() {
    const list = await apiRequest<{ data: OwnPackage[] }>('/api/influencer/packages', { auth: true })
      .catch(() => ({ data: [] as OwnPackage[] }));
    setPackages(list.data);
  }

  async function load() {
    if (!tokenStore.get()) {
      router.replace('/login');
      return;
    }
    try {
      const me = await apiRequest<{ data: { user: { email: string }; profile: OwnProfile | null } }>(
        '/api/auth/me',
        { auth: true },
      );
      setProfile(me.data.profile);
      setEmail(me.data.user.email);
      if (me.data.profile) await loadPackages();
    } catch (err) {
      // A stored token the server no longer accepts is not a session.
      tokenStore.clear();
      notifySessionChange();
      setError(errorMessage(err, 'Your session has ended. Please sign in again.'));
      router.replace('/login');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    // Every setState inside happens after an await, so nothing here renders twice.
    void load();
    // Runs once on mount: nothing about this component changes the request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function removePackage() {
    if (!removing) return;
    try {
      await apiRequest(`/api/influencer/packages/${removing._id}`, { method: 'DELETE', auth: true });
      setRemoving(null);
      await loadPackages();
    } catch (err) {
      setError(errorMessage(err, 'Could not remove this package'));
      setRemoving(null);
    }
  }

  async function changePassword(event: React.FormEvent) {
    event.preventDefault();
    if (password.length < 8) return setPasswordError('Password must be at least 8 characters');
    if (password !== confirmPassword) return setPasswordError('Passwords do not match');

    setPasswordError('');
    setPasswordDone(false);
    setSaving(true);
    try {
      await apiRequest('/api/auth/change-password', {
        method: 'POST',
        auth: true,
        body: { password, confirmPassword },
      });
      setPassword('');
      setConfirmPassword('');
      setPasswordDone(true);
    } catch (err) {
      setPasswordError(errorMessage(err, 'Could not update the password'));
    } finally {
      setSaving(false);
    }
  }

  function signOut() {
    tokenStore.clear();
    notifySessionChange();
    router.replace('/login');
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-20 text-center">
        <p style={{ color: 'var(--text-3)' }}>Loading your profile…</p>
      </div>
    );
  }

  if (error && !profile) {
    return <div className="mx-auto max-w-md px-5 py-20"><FormError message={error} /></div>;
  }

  const status = profile?.isArchived ? 'rejected' : profile?.status ?? 'pending';
  const copy = STATUS_COPY[status] ?? STATUS_COPY.pending;
  // An approved package on a profile that is not itself public is visible to nobody.
  const profileIsPublic = profile?.status === 'approved' && !profile?.isArchived;

  const instagram = handleFrom(profile?.social?.instagram);
  const youtube = handleFrom(profile?.social?.youtube);

  return (
    <div className="mx-auto grid max-w-3xl gap-5 px-5 py-10 sm:py-14">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-[28px]">My profile</h1>
        <button
          type="button"
          onClick={() => setConfirmingSignOut(true)}
          className="btn btn-ghost h-9 px-4 text-[13.5px]"
        >
          Sign out
        </button>
      </header>

      {!!error && <FormError message={error} />}

      <section className="card flex flex-col items-center gap-3 p-6 text-center">
        <Avatar name={profile?.name ?? '?'} src={profile?.profileImage} size={84} eager />
        <div>
          <h2 className="text-[20px]">{profile?.name}</h2>
          <p className="text-[13.5px]" style={{ color: 'var(--text-3)' }}>{email}</p>
        </div>
        {!!profile?.category?.name && (
          <span className="chip" style={{ background: 'var(--violet-bg)', color: 'var(--violet-400)' }}>
            {profile.category.name}
          </span>
        )}
        {!!profile && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="btn btn-ghost mt-1 h-9 px-5 text-[13.5px]"
          >
            Edit profile
          </button>
        )}
      </section>

      <section
        className="rounded-2xl border p-5"
        style={{
          background: 'var(--ink-950)',
          borderColor: `color-mix(in srgb, ${copy.tone} 35%, transparent)`,
        }}
      >
        <p className="text-[15px] font-bold" style={{ color: copy.tone }}>{copy.label}</p>
        <p className="prose-body mt-1 text-[13.5px]">{copy.body}</p>
      </section>

      {!!profile?.bio && (
        <section className="card p-6">
          <h2 className="text-[17px]">About</h2>
          <p className="prose-body mt-2 text-[14.5px]">{profile.bio}</p>
        </section>
      )}

      <section className="card p-6">
        <h2 className="text-[17px]">Details</h2>
        <dl className="mt-3 grid gap-0 text-[14px]">
          {[
            ['Location', locationLine(profile?.location)],
            ['Phone', profile?.phone],
            ['Instagram', instagram],
            ['YouTube', youtube],
          ]
            .filter(([, value]) => !!value)
            .map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 border-b py-2.5 last:border-b-0">
                <dt style={{ color: 'var(--text-3)' }}>{label}</dt>
                <dd className="text-right font-medium">{value}</dd>
              </div>
            ))}
        </dl>
      </section>

      <section className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-[17px]">Packages</h2>
            <p className="mt-0.5 text-[12.5px]" style={{ color: 'var(--text-3)' }}>
              {packages.length}/{MAX_PACKAGES} — what you charge, and for what
            </p>
          </div>
          <button
            type="button"
            onClick={() => setPackageSheet({ open: true, editing: null })}
            disabled={packages.length >= MAX_PACKAGES}
            className="btn btn-primary h-9 px-4 text-[13.5px]"
          >
            Add package
          </button>
        </div>

        {packages.length === 0 ? (
          <p className="prose-body mt-4 text-[14px]">
            Nothing listed yet. Add what you charge — a reel, a story set, a video — and our
            team will review it before it appears on your public profile.
          </p>
        ) : (
          <div className="mt-4 grid gap-3">
            {packages.map((item) => {
              const approvedButHidden = item.status === 'approved' && !profileIsPublic;
              const tone = approvedButHidden ? PACKAGE_TONE.pending : PACKAGE_TONE[item.status];

              return (
                <article
                  key={item._id}
                  className="rounded-xl border p-4"
                  style={{ background: 'var(--ink-800)' }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="text-[15px] font-bold">{item.title}</h3>
                      {!!deliveryLabel(item.deliveryDays) && (
                        <p className="mt-0.5 text-[12.5px]" style={{ color: 'var(--text-3)' }}>
                          {deliveryLabel(item.deliveryDays)}
                        </p>
                      )}
                    </div>
                    <p className="shrink-0 text-[16px] font-bold" style={{ color: 'var(--violet-400)' }}>
                      {formatPrice(item.price, item.currency)}
                    </p>
                  </div>

                  {!!item.description && (
                    <p className="prose-body mt-2 text-[13.5px]">{item.description}</p>
                  )}

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <span className="chip" style={{ background: tone.bg, color: tone.tone }}>
                      {approvedButHidden ? 'Approved · not public yet' : tone.label}
                    </span>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setPackageSheet({ open: true, editing: item })}
                        className="btn btn-ghost h-8 px-3 text-[12.5px]"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setRemoving(item)}
                        className="btn btn-ghost h-8 px-3 text-[12.5px]"
                        style={{ color: 'var(--rose-400)' }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {item.status === 'rejected' && !!item.rejectionReason && (
                    <p className="mt-2 text-[12.5px]" style={{ color: 'var(--rose-400)' }}>
                      {item.rejectionReason}
                    </p>
                  )}
                  {approvedButHidden && (
                    <p className="mt-2 text-[12.5px]" style={{ color: 'var(--text-3)' }}>
                      This package is approved, but your profile is not in the public directory
                      yet — so nobody can see it.
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="card p-6">
        <h2 className="text-[17px]">Change password</h2>
        <form onSubmit={changePassword} className="mt-4 grid gap-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <PasswordField
              label="New password"
              value={password}
              onChange={(value) => { setPassword(value); setPasswordError(''); setPasswordDone(false); }}
              autoComplete="new-password"
              hint="At least 8 characters"
              placeholder="Enter a new password"
            />
            <PasswordField
              label="Confirm password"
              value={confirmPassword}
              onChange={(value) => { setConfirmPassword(value); setPasswordError(''); setPasswordDone(false); }}
              autoComplete="new-password"
              placeholder="Re-enter the new password"
            />
          </div>

          <FormError message={passwordError} />
          {passwordDone && (
            <p
              className="rounded-xl border px-3.5 py-2.5 text-[13px]"
              style={{
                background: 'var(--mint-bg)',
                color: 'var(--mint-400)',
                borderColor: 'color-mix(in srgb, var(--mint-400) 30%, transparent)',
              }}
            >
              Password updated. Use it the next time you sign in.
            </p>
          )}

          <div className="flex justify-end">
            <button type="submit" className="btn btn-primary" disabled={saving} style={{ minWidth: 180 }}>
              {saving ? 'Saving' : 'Update password'}
            </button>
          </div>
        </form>
      </section>

      <p className="text-center text-[13px]" style={{ color: 'var(--text-3)' }}>
        <Link href="/creators" className="hover:underline">Browse the directory</Link>
      </p>

      {!!profile && (
        <EditProfileDialog
          open={editing}
          profile={profile}
          categories={categories}
          onClose={() => setEditing(false)}
          onSaved={setProfile}
        />
      )}

      <PackageDialog
        open={packageSheet.open}
        editing={packageSheet.editing}
        onClose={() => setPackageSheet({ open: false, editing: null })}
        onSaved={() => { void loadPackages(); }}
      />

      <Dialog
        open={confirmingSignOut}
        title="Sign out?"
        onClose={() => setConfirmingSignOut(false)}
      >
        <p className="prose-body text-[14.5px]">
          You will be signed out on this device. Your profile and packages stay exactly as
          they are, and you can sign back in any time.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={() => setConfirmingSignOut(false)} className="btn btn-ghost">
            Stay signed in
          </button>
          <button type="button" onClick={signOut} className="btn btn-primary">Sign out</button>
        </div>
      </Dialog>

      <Dialog open={!!removing} title="Remove this package?" onClose={() => setRemoving(null)}>
        <p className="prose-body text-[14.5px]">
          &ldquo;{removing?.title}&rdquo; will be deleted from your profile. This cannot be undone.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={() => setRemoving(null)} className="btn btn-ghost">Cancel</button>
          <button
            type="button"
            onClick={() => void removePackage()}
            className="btn btn-primary"
            style={{ background: 'var(--rose-400)' }}
          >
            Remove
          </button>
        </div>
      </Dialog>
    </div>
  );
}
