import type { Metadata } from 'next';
import { LoginForm } from './LoginForm';

export const metadata: Metadata = {
  // `absolute` bypasses the root layout's "%s | Aura" template: this is a panel label,
  // not a page name that should be suffixed with the brand.
  title: { absolute: 'User Panel (Sign In)' },
  description: 'Sign in to your Aura creator account to manage your profile and packages.',
  // A sign-in form has nothing to rank for, and indexing it splits authority away
  // from the pages that do.
  robots: { index: false, follow: true },
};

export default function LoginPage() {
  return <LoginForm />;
}
