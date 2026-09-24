import type { Metadata } from 'next';
import { ProfileView } from './ProfileView';
import { fetchCategories } from '@/lib/api';

export const metadata: Metadata = {
  // `absolute` bypasses the root layout's "%s | Aura" template: this is a panel label,
  // not a page name that should be suffixed with the brand.
  title: { absolute: 'User Panel (Profile)' },
  description: 'Manage your Aura creator profile and packages.',
  // Signed-in, per-person content. There is nothing here for a crawler to index.
  robots: { index: false, follow: false },
};

export default async function ProfilePage() {
  // Public and cached, so fetching it on the server saves the edit dialog a round trip.
  const categories = await fetchCategories();
  return <ProfileView categories={categories} />;
}
