import type { Metadata } from 'next';
import { OrdersView } from './OrdersView';

export const metadata: Metadata = {
  // `absolute` bypasses the root layout's "%s | Aura" template: this is a panel label,
  // not a page name that should be suffixed with the brand.
  title: { absolute: 'User Panel (Orders)' },
  description: 'Requests brands have sent for your packages.',
  // Signed-in, per-person content. There is nothing here for a crawler to index.
  robots: { index: false, follow: false },
};

export default function OrdersPage() {
  return <OrdersView />;
}
