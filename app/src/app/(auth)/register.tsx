import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Banner, Button, Field, Loader, Txt } from '@/components/ui';
import { CategoryPicker } from '@/components/CategoryPicker';
import { useCategories } from '@/hooks/useCategories';
import { request, errorMessage } from '@/lib/api';
import { isEmail } from '@/lib/format';
import { Spacing } from '@/theme/tokens';
import { useTheme } from '@/context/ThemeContext';

interface Form {
  name: string;
  email: string;
  password: string;
  phone: string;
  bio: string;
  instagram: string;
  youtube: string;
  category: string;
  country: string;
  state: string;
  city: string;
}

const EMPTY: Form = {
  name: '', email: '', password: '', phone: '', bio: '',
  instagram: '', youtube: '', category: '',
  country: 'India', state: '', city: '',
};

/** Mirrors the server's zod schema so mistakes surface before a round trip. */
function validate(form: Form): Partial<Record<keyof Form, string>> {
  const errors: Partial<Record<keyof Form, string>> = {};
  if (form.name.trim().length < 2) errors.name = 'Enter your full name';
  if (!isEmail(form.email)) errors.email = 'Enter a valid email';
  if (form.password.length < 8) errors.password = 'At least 8 characters';
  if (!form.category) errors.category = 'Pick the category you create in';
  if (form.country.trim().length < 2) errors.country = 'Required';
  if (!form.state.trim()) errors.state = 'Required';
  if (!form.city.trim()) errors.city = 'Required';
  return errors;
}

export default function RegisterScreen() {
  const { colors: Colors } = useTheme();
  const router = useRouter();
  const { categories, loading } = useCategories();

  const [form, setForm] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [serverError, setServerError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  async function onSubmit() {
    const found = validate(form);
    setErrors(found);
    setServerError('');
    if (Object.keys(found).length) return;

    setBusy(true);
    try {
      await request('/api/auth/register', {
        method: 'POST',
        auth: false,
        body: {
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
          phone: form.phone.trim(),
          bio: form.bio.trim(),
          social: { instagram: form.instagram.trim(), youtube: form.youtube.trim() },
          category: form.category,
          location: {
            country: form.country.trim(),
            state: form.state.trim(),
            city: form.city.trim(),
          },
        },
      });
      // Registration is not activation — the next screen explains the wait.
      router.replace('/(auth)/pending');
    } catch (err) {
      setServerError(errorMessage(err, 'Could not complete registration'));
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Loader label="Loading categories" />;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{ padding: Spacing.xl, gap: Spacing.xl, paddingBottom: 48 }}
        keyboardShouldPersistTaps="handled"
      >
        <Banner
          tone="info"
          title="Verification required"
          message="Submit your details and our team will review them. You can sign in once your profile is approved."
        />

        <View style={{ gap: Spacing.lg }}>
          <Txt variant="h3">About you</Txt>
          <Field label="Full name" required value={form.name} error={errors.name} onChangeText={(v) => set('name', v)} placeholder="Rahul Sharma" />
          <Field
            label="Email" required value={form.email} error={errors.email}
            onChangeText={(v) => set('email', v)} placeholder="you@example.com"
            keyboardType="email-address" autoCapitalize="none" autoComplete="email"
          />
          <Field
            label="Password" required value={form.password} error={errors.password}
            onChangeText={(v) => set('password', v)} placeholder="At least 8 characters"
            secureTextEntry autoComplete="new-password"
          />
          <Field label="Phone" value={form.phone} onChangeText={(v) => set('phone', v)} placeholder="+91 98765 43210" keyboardType="phone-pad" />
          <Field
            label="Bio" value={form.bio} onChangeText={(v) => set('bio', v)}
            placeholder="What do you create, and for whom?"
            multiline numberOfLines={4} maxLength={600}
            hint={`${form.bio.length}/600`}
            style={{ height: 104, textAlignVertical: 'top' }}
          />
        </View>

        <View style={{ gap: Spacing.lg }}>
          <Txt variant="h3">Your niche</Txt>
          <CategoryPicker categories={categories} value={form.category} onChange={(v) => set('category', v)} error={errors.category} />
        </View>

        <View style={{ gap: Spacing.lg }}>
          <Txt variant="h3">Where you are based</Txt>
          <Field label="Country" required value={form.country} error={errors.country} onChangeText={(v) => set('country', v)} placeholder="India" />
          <View style={{ flexDirection: 'row', gap: Spacing.md }}>
            <View style={{ flex: 1 }}>
              <Field label="State" required value={form.state} error={errors.state} onChangeText={(v) => set('state', v)} placeholder="Rajasthan" />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="City" required value={form.city} error={errors.city} onChangeText={(v) => set('city', v)} placeholder="Jaipur" />
            </View>
          </View>
        </View>

        <View style={{ gap: Spacing.lg }}>
          <Txt variant="h3">Social accounts</Txt>
          <Field label="Instagram" value={form.instagram} onChangeText={(v) => set('instagram', v)} placeholder="@handle or full URL" autoCapitalize="none" />
          <Field label="YouTube" value={form.youtube} onChangeText={(v) => set('youtube', v)} placeholder="@channel or full URL" autoCapitalize="none" />
        </View>

        {!!serverError && <Banner tone="error" message={serverError} />}

        <Button label={busy ? 'Submitting' : 'Submit for review'} onPress={onSubmit} loading={busy} />

        <Txt variant="small" color={Colors.text3} center style={{ lineHeight: 18 }}>
          Your profile stays private until an admin approves it.
        </Txt>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
