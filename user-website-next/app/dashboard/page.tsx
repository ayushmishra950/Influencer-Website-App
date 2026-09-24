import type { Metadata } from 'next';
import { DashboardView } from './DashboardView';
import { fetchCreators, fetchStats } from '@/lib/api';

export const metadata: Metadata = {
  // `absolute` bypasses the root layout's "%s | Aura" template: this is a panel label,
  // not a page name that should be suffixed with the brand.
  title: { absolute: 'User Panel (Dashboard)' },
  description: 'Your Aura creator dashboard.',
  // Signed-in, per-person content. There is nothing here for a crawler to index.
  robots: { index: false, follow: false },
};

export default async function DashboardPage() {
  // Public and cached, so the shell has real numbers before the private fetch lands.
  const [stats, recent] = await Promise.all([
    fetchStats(),
    fetchCreators({ limit: 3, sort: 'recent' }),
  ]);

  return <DashboardView stats={stats} recent={recent.data} />;
}
