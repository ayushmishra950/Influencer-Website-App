import type { Metadata } from 'next';
import { ResetPasswordForm } from './ResetPasswordForm';

export const metadata: Metadata = {
  // `absolute` bypasses the root layout's "%s | Aura" template: this is a panel label,
  // not a page name that should be suffixed with the brand.
  title: { absolute: 'User Panel (Set New Password)' },
  description: 'Choose a new password for your Aura creator account.',
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return <ResetPasswordForm />;
}
