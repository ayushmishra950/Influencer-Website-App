import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/Layout';
import { PageLoader } from '@/components/Spinner';
import { EmptyState } from '@/components/EmptyState';
import { Modal } from '@/components/Modal';
import { Pagination } from '@/components/Pagination';
import { TextField } from '@/components/Field';
import { Icon } from '@/components/Icon';
import { useCategoryPage } from '@/hooks/useInfluencers';
import { api, errorMessage } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { useConfirm } from '@/context/ConfirmContext';
import { confirmCategoryVisibility, confirmDeleteCategory } from '@/lib/confirmations';
import { pluralize } from '@/lib/format';
import type { Category } from '@/lib/types';

export function CategoriesPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useCategoryPage(page);
  const categories = data?.data;

  // Deleting the last category on a page would otherwise strand the user on an empty one.
  useEffect(() => {
    if (data?.meta && page > data.meta.totalPages) setPage(data.meta.totalPages);
  }, [data?.meta, page]);
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const confirm = useConfirm();

  const [editing, setEditing] = useState<Category | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');

  // The ['categories'] prefix covers both the paged view and the full dropdown list.
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['categories'] });
    void queryClient.invalidateQueries({ queryKey: ['influencers'] });
  };

  const save = useMutation({
    mutationFn: async ({ id, payload }: { id?: string; payload: Partial<Category> }) => {
      const request = id
        ? api.put<{ message: string }>(`/api/admin/categories/${id}`, payload)
        : api.post<{ message: string }>('/api/admin/categories', payload);
      return (await request).data.message;
    },
    onSuccess: (message) => {
      refresh();
      notify(message);
      setEditing(null);
      setCreating(false);
      setName('');
    },
    onError: (error) => notify(errorMessage(error), 'error'),
  });

  const remove = useMutation({
    mutationFn: async (id: string) =>
      (await api.delete<{ message: string }>(`/api/admin/categories/${id}`)).data.message,
    onSuccess: (message) => {
      refresh();
      notify(message);
    },
    onError: (error) => notify(errorMessage(error), 'error'),
  });

  const requestDelete = async (category: Category) => {
    const { confirmed } = await confirm(
      confirmDeleteCategory(category.name, category.influencerCount ?? 0),
    );
    if (confirmed) remove.mutate(category._id);
  };

  const toggleActive = async (category: Category) => {
    const { confirmed } = await confirm(confirmCategoryVisibility(category.name, category.isActive));
    if (!confirmed) return;
    save.mutate({ id: category._id, payload: { name: category.name, isActive: !category.isActive } });
  };

  function submit(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2) return;
    save.mutate({ id: editing?._id, payload: { name: trimmed } });
  }

  const dialogOpen = creating || !!editing;

  // Replaces the whole view, so the spinner lands in the centre of the page the
  // same way it does everywhere else.
  if (isLoading) return <PageLoader label="Loading categories" />;

  return (
    <div className="animate-in">
      <PageHeader
        title="Categories"
        subtitle="Master list powering registration and directory filters"
        actions={
          <button
            className="btn btn-primary"
            onClick={() => {
              setName('');
              setCreating(true);
            }}
          >
            <Icon name="plus" size={16} />
            New category
          </button>
        }
      />

      {!categories?.length ? (
        <div className="card">
          <EmptyState icon="tag" title="No categories yet" description="Add at least one before influencers can register." />
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
            {categories.map((category) => (
            <div key={category._id} className="card card-pad stack gap-3">
              <div className="between gap-3">
                <span className="row gap-3" style={{ minWidth: 0 }}>
                  <span
                    className="center"
                    style={{ width: 34, height: 34, borderRadius: 'var(--r-md)', background: 'var(--violet-bg)', color: 'var(--violet-400)' }}
                  >
                    <Icon name="tag" size={16} />
                  </span>
                  <span className="stack" style={{ minWidth: 0, lineHeight: 1.35 }}>
                    <strong className="truncate" style={{ fontSize: 14 }}>{category.name}</strong>
                    <span className="dim" style={{ fontSize: 11.5 }}>
                      {pluralize(category.influencerCount ?? 0, 'influencer')}
                    </span>
                  </span>
                </span>
                <span className={`pill ${category.isActive ? 'pill-approved' : 'pill-archived'}`}>
                  {category.isActive ? 'active' : 'hidden'}
                </span>
              </div>

              <div className="row gap-1">
                <button
                  className="btn btn-ghost btn-sm grow"
                  onClick={() => {
                    setEditing(category);
                    setName(category.name);
                  }}
                >
                  <Icon name="edit" size={14} /> Rename
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => void toggleActive(category)} disabled={save.isPending}>
                  {category.isActive ? 'Hide' : 'Show'}
                </button>
                <button
                  className="btn btn-subtle btn-icon"
                  style={{ color: 'var(--rose-400)' }}
                  title="Delete category"
                  aria-label={`Delete ${category.name}`}
                  onClick={() => void requestDelete(category)}
                >
                  <Icon name="trash" size={15} />
                </button>
              </div>
            </div>
            ))}
          </div>

          {data?.meta && (
            <div className="card" style={{ marginTop: 16 }}>
              <Pagination
                meta={data.meta}
                noun="category"
                nounPlural="categories"
                onChange={(next) => {
                  setPage(next);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            </div>
          )}
        </>
      )}

      <Modal
        open={dialogOpen}
        title={editing ? 'Rename category' : 'New category'}
        description={editing ? undefined : 'Appears in registration and in the directory filters.'}
        onClose={() => {
          setEditing(null);
          setCreating(false);
        }}
        width={420}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => { setEditing(null); setCreating(false); }}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={submit} disabled={save.isPending || name.trim().length < 2}>
              {save.isPending && <span className="spinner" />}
              {editing ? 'Save changes' : 'Create category'}
            </button>
          </>
        }
      >
        <form onSubmit={submit}>
          <TextField
            label="Category name"
            required
            autoFocus
            placeholder="e.g. Fashion"
            value={name}
            maxLength={60}
            onChange={(e) => setName(e.target.value)}
          />
        </form>
      </Modal>

    </div>
  );
}
