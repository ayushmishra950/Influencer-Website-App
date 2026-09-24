import type { Metadata } from 'next';
import { RegisterForm } from './RegisterForm';
import { fetchCategories } from '@/lib/api';
import { pageOpenGraph } from '@/lib/seo';

const REGISTER_TITLE = 'Join Aura as a Verified Creator';
const REGISTER_DESCRIPTION =
  'Register your creator profile on Aura. Add your niche, city and social accounts — our team reviews every application before it goes live.';

export const metadata: Metadata = {
  title: REGISTER_TITLE,
  description: REGISTER_DESCRIPTION,
  alternates: { canonical: '/register' },
  openGraph: pageOpenGraph({
    title: REGISTER_TITLE,
    description: REGISTER_DESCRIPTION,
    path: '/register',
  }),
};

export default async function RegisterPage() {
  const categories = await fetchCategories();
  return <RegisterForm categories={categories} />;
}
