'use client';

import { useState, type FormEvent } from 'react';
import { Dialog } from './Dialog';
import { FormError } from './FormError';
import { Avatar } from './Avatar';
import { API_URL } from '@/lib/api';
import { apiRequest, errorMessage, tokenStore } from '@/lib/client-api';
import type { Category, OwnProfile } from '@/lib/types';

interface Props {
  open: boolean;
  profile: OwnProfile;
  categories: Category[];
  onClose: () => void;
  onSaved: (profile: OwnProfile) => void;
}

function Field({ label, value, onChange, ...rest }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  return (
    <label className="grid gap-1.5">
      <span className="text-[13px] font-semibold">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="input"
        {...rest}
      />
    </label>
  );
}

export function EditProfileDialog({ open, profile, categories, onClose, onSaved }: Props) {
  const [form, setForm] = useState(() => toForm(profile));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Reopening should show the current values, not whatever was typed and abandoned last
  // time. Adjusted during render, not in an effect, so the stale values never paint.
  const openedWith = `${open}:${profile._id}:${profile.name}`;
  const [lastOpenedWith, setLastOpenedWith] = useState(openedWith);
  if (openedWith !== lastOpenedWith) {
    setLastOpenedWith(openedWith);
    setForm(toForm(profile));
    setError('');
  }

  const set = (key: keyof ReturnType<typeof toForm>) => (value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  async function onPickImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Let the same file be chosen again after a failure.
    event.target.value = '';
    if (!file) return;

    setError('');
    setUploading(true);
    try {
      const body = new FormData();
      body.append('image', file);
      // FormData, so no Content-Type header: the browser has to set the boundary.
      const response = await fetch(`${API_URL}/api/influencer/profile/image`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenStore.get() ?? ''}` },
        body,
      });
      // The endpoint answers with { data: { url } } — it stores nothing itself. The URL
      // is then saved as `profileImage` by the PUT below, so an abandoned dialog leaves
      // the profile untouched.
      const payload = (await response.json().catch(() => null)) as
        | { message?: string; data?: { url: string } }
        | null;
      if (!response.ok) throw new Error(payload?.message ?? 'Upload failed');

      const url = payload?.data?.url;
      if (!url) throw new Error('The server did not return an image URL');
      setForm((current) => ({ ...current, profileImage: url }));
    } catch (err) {
      setError(errorMessage(err, 'Could not upload that image'));
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (form.name.trim().length < 2) return setError('Name is required');
    if (!form.category) return setError('Choose the niche you create in');

    setError('');
    setBusy(true);
    try {
      const { data } = await apiRequest<{ data: OwnProfile }>('/api/influencer/profile', {
        method: 'PUT',
        auth: true,
        body: {
          name: form.name.trim(),
          phone: form.phone.trim(),
          bio: form.bio.trim(),
          profileImage: form.profileImage,
          category: form.category,
          location: {
            country: form.country.trim(),
            state: form.state.trim(),
            city: form.city.trim(),
          },
          social: { instagram: form.instagram.trim(), youtube: form.youtube.trim() },
          // Digits only, so "12,400" and "12.4k" do not silently become something else.
          audience: {
            instagram: Number(form.instagramFollowers.replace(/\D/g, '')) || 0,
            youtube: Number(form.youtubeFollowers.replace(/\D/g, '')) || 0,
          },
        },
      });
      onSaved(data);
      onClose();
    } catch (err) {
      setError(errorMessage(err, 'Could not save your profile'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} title="Edit profile" onClose={onClose}>
      <form onSubmit={onSubmit} className="grid gap-4" noValidate>
        <div className="flex items-center gap-4">
          <Avatar name={form.name || profile.name} src={form.profileImage} size={64} />
          <label className="btn btn-ghost h-9 cursor-pointer px-4 text-[13.5px]">
            {uploading ? 'Uploading…' : form.profileImage ? 'Replace photo' : 'Upload photo'}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={onPickImage}
              disabled={uploading}
              className="hidden"
            />
          </label>
        </div>

        <Field label="Full name" value={form.name} onChange={set('name')} required autoComplete="name" />

        <label className="grid gap-1.5">
          <span className="text-[13px] font-semibold">Niche</span>
          <select
            value={form.category}
            onChange={(event) => set('category')(event.target.value)}
            className="input"
          >
            <option value="">Choose a niche</option>
            {categories.map((category) => (
              <option key={category._id} value={category._id}>{category.name}</option>
            ))}
          </select>
        </label>

        <label className="grid gap-1.5">
          <span className="text-[13px] font-semibold">Bio</span>
          <textarea
            value={form.bio}
            onChange={(event) => set('bio')(event.target.value)}
            rows={3}
            maxLength={600}
            className="input h-auto py-3"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="City" value={form.city} onChange={set('city')} />
          <Field label="State" value={form.state} onChange={set('state')} />
          <Field label="Country" value={form.country} onChange={set('country')} />
        </div>

        <Field label="Phone" value={form.phone} onChange={set('phone')} type="tel" autoComplete="tel" />

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Instagram" value={form.instagram} onChange={set('instagram')} type="url" />
          <Field label="YouTube" value={form.youtube} onChange={set('youtube')} type="url" />
          <Field
            label="Instagram followers"
            value={form.instagramFollowers}
            onChange={set('instagramFollowers')}
            inputMode="numeric"
            placeholder="e.g. 24000"
          />
          <Field
            label="YouTube subscribers"
            value={form.youtubeFollowers}
            onChange={set('youtubeFollowers')}
            inputMode="numeric"
            placeholder="e.g. 8000"
          />
        </div>

        <p className="text-[12px]" style={{ color: 'var(--text-3)' }}>
          Follower counts are shown on your profile marked &ldquo;self-reported&rdquo;. Our
          team opens your accounts when reviewing, so keep them honest — it is the number
          brands decide on.
        </p>

        <FormError message={error} />

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn btn-ghost">Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={busy || uploading}>
            {busy ? 'Saving' : 'Save changes'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

function toForm(profile: OwnProfile) {
  return {
    name: profile.name ?? '',
    phone: profile.phone ?? '',
    bio: profile.bio ?? '',
    profileImage: profile.profileImage ?? '',
    category: profile.category?._id ?? '',
    country: profile.location?.country ?? '',
    state: profile.location?.state ?? '',
    city: profile.location?.city ?? '',
    instagram: profile.social?.instagram ?? '',
    youtube: profile.social?.youtube ?? '',
    // Kept as strings so an empty box stays empty rather than showing a 0 to type around.
    instagramFollowers: profile.audience?.instagram ? String(profile.audience.instagram) : '',
    youtubeFollowers: profile.audience?.youtube ? String(profile.audience.youtube) : '',
  };
}
