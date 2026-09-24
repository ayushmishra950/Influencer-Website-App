import type { Metadata } from 'next';
import { ForgotPasswordForm } from './ForgotPasswordForm';

export const metadata: Metadata = {
  // `absolute` bypasses the root layout's "%s | Aura" template: this is a panel label,
  // not a page name that should be suffixed with the brand.
  title: { absolute: 'User Panel (Forgot Password)' },
  description: 'Reset the password for your Aura creator account.',
  robots: { index: false, follow: true },
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
