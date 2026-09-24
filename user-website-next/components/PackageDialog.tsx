'use client';

import { useState, type FormEvent } from 'react';
import { Dialog } from './Dialog';
import { FormError } from './FormError';
import { apiRequest, errorMessage } from '@/lib/client-api';
import type { OwnPackage } from '@/lib/types';

interface Props {
  open: boolean;
  /** `null` creates a new package; a package edits that one. */
  editing: OwnPackage | null;
  onClose: () => void;
  onSaved: () => void;
}

const EMPTY = { title: '', description: '', price: '', currency: 'INR', deliveryDays: '' };

export function PackageDialog({ open, editing, onClose, onSaved }: Props) {
  const toForm = (item: OwnPackage | null) => (item
    ? {
        title: item.title,
        description: item.description ?? '',
        price: String(item.price),
        currency: item.currency || 'INR',
        deliveryDays: item.deliveryDays ? String(item.deliveryDays) : '',
      }
    : EMPTY);

  const [form, setForm] = useState(() => toForm(editing));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Reset when the dialog is opened, or opened on a different package. Adjusted during
  // render rather than in an effect: React restarts the render immediately, so the
  // previous package's values are never painted into the new form.
  const openedFor = `${open}:${editing?._id ?? 'new'}`;
  const [lastOpenedFor, setLastOpenedFor] = useState(openedFor);
  if (openedFor !== lastOpenedFor) {
    setLastOpenedFor(openedFor);
    setForm(toForm(editing));
    setError('');
  }

  const set = (key: keyof typeof EMPTY) => (value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (form.title.trim().length < 2) return setError('Name the service you are offering');
    const price = Number(form.price);
    if (!Number.isFinite(price) || price < 0) return setError('Enter a valid price');

    setError('');
    setBusy(true);
    try {
      await apiRequest(
        editing ? `/api/influencer/packages/${editing._id}` : '/api/influencer/packages',
        {
          method: editing ? 'PUT' : 'POST',
          auth: true,
          body: {
            title: form.title.trim(),
            description: form.description.trim(),
            price: Math.round(price),
            currency: form.currency.trim().toUpperCase() || 'INR',
            deliveryDays: Number(form.deliveryDays) || 0,
          },
        },
      );
      onSaved();
      onClose();
    } catch (err) {
      setError(errorMessage(err, 'Could not save this package'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} title={editing ? 'Edit package' : 'Add a package'} onClose={onClose}>
      <form onSubmit={onSubmit} className="grid gap-4" noValidate>
        <label className="grid gap-1.5">
          <span className="text-[13px] font-semibold">
            What you are offering <span style={{ color: 'var(--rose-400)' }}>*</span>
          </span>
          <input
            value={form.title}
            onChange={(event) => set('title')(event.target.value)}
            placeholder="e.g. 1 Instagram Reel"
            maxLength={80}
            required
            className="input"
          />
        </label>

        <label className="grid gap-1.5">
          <span className="text-[13px] font-semibold">Description</span>
          <textarea
            value={form.description}
            onChange={(event) => set('description')(event.target.value)}
            rows={3}
            maxLength={400}
            placeholder="What the brand gets, and what you need from them"
            className="input h-auto py-3"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="grid gap-1.5">
            <span className="text-[13px] font-semibold">
              Price <span style={{ color: 'var(--rose-400)' }}>*</span>
            </span>
            <input
              value={form.price}
              onChange={(event) => set('price')(event.target.value.replace(/[^\d]/g, ''))}
              inputMode="numeric"
              placeholder="e.g. 3000"
              required
              className="input"
            />
          </label>

          <label className="grid gap-1.5">
            <span className="text-[13px] font-semibold">Currency</span>
            <input
              value={form.currency}
              onChange={(event) => set('currency')(event.target.value.toUpperCase().slice(0, 3))}
              maxLength={3}
              className="input"
            />
          </label>

          <label className="grid gap-1.5">
            <span className="text-[13px] font-semibold">Delivery days</span>
            <input
              value={form.deliveryDays}
              onChange={(event) => set('deliveryDays')(event.target.value.replace(/[^\d]/g, ''))}
              inputMode="numeric"
              placeholder="e.g. 5"
              className="input"
            />
          </label>
        </div>

        {/* Stated up front, because an edit silently un-publishing a live package is the
            kind of surprise people only discover afterwards. */}
        <p className="text-[12.5px]" style={{ color: 'var(--text-3)' }}>
          {editing
            ? 'Saving sends this back for review, so it leaves your public profile until an administrator approves it again.'
            : 'New packages are reviewed before they appear on your public profile.'}
        </p>

        <FormError message={error} />

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn btn-ghost">Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Saving' : editing ? 'Save changes' : 'Submit for review'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
