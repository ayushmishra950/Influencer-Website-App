import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '@/components/Layout';
import { PageLoader } from '@/components/Spinner';
import { Avatar } from '@/components/Avatar';
import { Icon } from '@/components/Icon';
import { FieldRow, SelectField, TextAreaField, TextField } from '@/components/Field';
import { useCategories, useInfluencer, useSaveInfluencer } from '@/hooks/useInfluencers';
import { api, errorMessage } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { useConfirm } from '@/context/ConfirmContext';
import { confirmSaveInfluencer } from '@/lib/confirmations';
import type { Status } from '@/lib/types';

interface FormState {
  name: string;
  email: string;
  password: string;
  phone: string;
  bio: string;
  profileImage: string;
  instagram: string;
  youtube: string;
  category: string;
  country: string;
  state: string;
  city: string;
  status: Status;
}

const EMPTY: FormState = {
  name: '', email: '', password: '', phone: '', bio: '', profileImage: '',
  instagram: '', youtube: '', category: '',
  country: 'India', state: '', city: '',
  // An admin creating a record IS the verification step, so default to approved.
  status: 'approved',
};

/** Client-side mirror of the server rules — the server still validates everything. */
function validate(form: FormState, isEdit: boolean): Partial<Record<keyof FormState, string>> {
  const errors: Partial<Record<keyof FormState, string>> = {};
  if (form.name.trim().length < 2) errors.name = 'Name is required';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = 'Enter a valid email';
  if (!isEdit && form.password && form.password.length < 8) {
    errors.password = 'Password must be at least 8 characters';
  }
  if (!form.category) errors.category = 'Choose a category';
  if (form.country.trim().length < 2) errors.country = 'Country is required';
  if (!form.state.trim()) errors.state = 'State is required';
  if (!form.city.trim()) errors.city = 'City is required';
  return errors;
}

export function InfluencerFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { notify } = useToast();
  const confirm = useConfirm();

  const { data: categories, isLoading: loadingCategories } = useCategories();
  const { data: existing, isLoading } = useInfluencer(id);
  const save = useSaveInfluencer(id);

  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!existing) return;
    setForm({
      name: existing.name,
      email: existing.email,
      password: '',
      phone: existing.phone ?? '',
      bio: existing.bio ?? '',
      profileImage: existing.profileImage ?? '',
      instagram: existing.social?.instagram ?? '',
      youtube: existing.social?.youtube ?? '',
      category: existing.category?._id ?? '',
      country: existing.location?.country ?? '',
      state: existing.location?.state ?? '',
      city: existing.location?.city ?? '',
      status: existing.status,
    });
  }, [existing]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  async function onPickImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const body = new FormData();
      body.append('image', file);
      const { data } = await api.post<{ data: { url: string } }>('/api/admin/influencers/image', body, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      set('profileImage', data.data.url);
      notify('Image uploaded');
    } catch (error) {
      notify(errorMessage(error, 'Upload failed'), 'error');
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const found = validate(form, isEdit);
    setErrors(found);
    if (Object.keys(found).length) {
      notify('Please fix the highlighted fields', 'error');
      return;
    }

    // Validate first, then ask — nobody should confirm a save that cannot succeed.
    const { confirmed } = await confirm(confirmSaveInfluencer(isEdit, form.name.trim()));
    if (!confirmed) return;

    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      phone: form.phone.trim(),
      bio: form.bio.trim(),
      profileImage: form.profileImage,
      social: { instagram: form.instagram.trim(), youtube: form.youtube.trim() },
      category: form.category,
      location: { country: form.country.trim(), state: form.state.trim(), city: form.city.trim() },
      status: form.status,
    };
    // Only sent on create, and only when set — an empty password means "directory listing only".
    if (!isEdit && form.password) payload.password = form.password;

    save.mutate(payload, {
      onSuccess: ({ data }) => navigate(`/influencers/${data._id}`),
    });
  }

  if (loadingCategories || (isEdit && isLoading)) {
    return <PageLoader label={isEdit ? 'Loading profile' : 'Loading form'} />;
  }

  return (
    <div className="animate-in">
      <Link className="btn btn-subtle btn-sm" to={isEdit ? `/influencers/${id}` : '/influencers'} style={{ marginBottom: 12 }}>
        <Icon name="chevronLeft" size={14} /> Back
      </Link>

      <PageHeader
        title={isEdit ? 'Edit influencer' : 'Add influencer'}
        subtitle={
          isEdit
            ? 'Changes apply immediately across the directory'
            : 'Created by an admin, so this record is approved by default'
        }
      />

      <form onSubmit={(e) => void onSubmit(e)} className="stack gap-4" style={{ maxWidth: 780 }} noValidate>
        <section className="card card-pad stack gap-4">
          <h3>Basic information</h3>

          <div className="row gap-4 wrap">
            <Avatar name={form.name || '?'} src={form.profileImage} size={72} />
            <div className="stack gap-2">
              <input
                ref={fileInput}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={onPickImage}
                style={{ display: 'none' }}
              />
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => fileInput.current?.click()} disabled={uploading}>
                {uploading ? <span className="spinner" /> : <Icon name="plus" size={14} />}
                {form.profileImage ? 'Replace photo' : 'Upload photo'}
              </button>
              {form.profileImage && (
                <button type="button" className="btn btn-subtle btn-sm" onClick={() => set('profileImage', '')}>
                  Remove
                </button>
              )}
              <span className="dim" style={{ fontSize: 11.5 }}>JPG, PNG or WEBP · max 4 MB</span>
            </div>
          </div>

          <FieldRow>
            <TextField label="Full name" required value={form.name} error={errors.name} onChange={(e) => set('name', e.target.value)} placeholder="Rahul Sharma" />
            <TextField label="Email" type="email" required value={form.email} error={errors.email} onChange={(e) => set('email', e.target.value)} placeholder="rahul@example.com" />
          </FieldRow>

          <FieldRow>
            <TextField label="Phone" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+91 98765 43210" />
            {!isEdit && (
              <TextField
                label="Password"
                type="password"
                value={form.password}
                error={errors.password}
                onChange={(e) => set('password', e.target.value)}
                placeholder="Min 8 characters"
                hint="Leave empty for a directory-only listing with no login"
              />
            )}
          </FieldRow>

          <TextAreaField
            label="Bio"
            value={form.bio}
            maxLength={600}
            onChange={(e) => set('bio', e.target.value)}
            placeholder="What do they create, and for whom?"
            hint={`${form.bio.length}/600`}
          />
        </section>

        <section className="card card-pad stack gap-4">
          <h3>Category &amp; location</h3>
          <FieldRow>
            <SelectField label="Category" required value={form.category} error={errors.category} onChange={(e) => set('category', e.target.value)}>
              <option value="">Select a category</option>
              {categories?.filter((c) => c.isActive || c._id === form.category).map((category) => (
                <option key={category._id} value={category._id}>{category.name}</option>
              ))}
            </SelectField>
            <SelectField label="Status" value={form.status} onChange={(e) => set('status', e.target.value as Status)} hint="Approved influencers appear in the public directory">
              <option value="approved">Approved</option>
              <option value="pending">Pending review</option>
              <option value="rejected">Rejected</option>
            </SelectField>
          </FieldRow>

          <FieldRow>
            <TextField label="Country" required value={form.country} error={errors.country} onChange={(e) => set('country', e.target.value)} placeholder="India" />
            <TextField label="State" required value={form.state} error={errors.state} onChange={(e) => set('state', e.target.value)} placeholder="Rajasthan" />
            <TextField label="City" required value={form.city} error={errors.city} onChange={(e) => set('city', e.target.value)} placeholder="Jaipur" />
          </FieldRow>
        </section>

        <section className="card card-pad stack gap-4">
          <h3>Social media</h3>
          <FieldRow>
            <TextField label="Instagram" value={form.instagram} onChange={(e) => set('instagram', e.target.value)} placeholder="@handle or full URL" />
            <TextField label="YouTube" value={form.youtube} onChange={(e) => set('youtube', e.target.value)} placeholder="@channel or full URL" />
          </FieldRow>
        </section>

        <div className="row gap-2" style={{ justifyContent: 'flex-end' }}>
          <Link className="btn btn-ghost" to={isEdit ? `/influencers/${id}` : '/influencers'}>Cancel</Link>
          <button className="btn btn-primary" type="submit" disabled={save.isPending || uploading}>
            {save.isPending && <span className="spinner" />}
            {isEdit ? 'Save changes' : 'Create influencer'}
          </button>
        </div>
      </form>
    </div>
  );
}
