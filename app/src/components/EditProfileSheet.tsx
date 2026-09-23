import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Banner, Button, Field, Txt } from './ui';
import { CategoryPicker } from './CategoryPicker';
import { useCategories } from '@/hooks/useCategories';
import { errorMessage, request } from '@/lib/api';
import { Radius, Spacing } from '@/theme/tokens';
import type { MyProfile } from '@/lib/types';
import { useTheme } from '@/context/ThemeContext';

interface EditProfileSheetProps {
  visible: boolean;
  profile: MyProfile;
  onClose: () => void;
  onSaved: (profile: MyProfile) => void;
}

interface Form {
  name: string;
  phone: string;
  bio: string;
  instagram: string;
  youtube: string;
  category: string;
  country: string;
  state: string;
  city: string;
}

export function EditProfileSheet({ visible, profile, onClose, onSaved }: EditProfileSheetProps) {
  const { colors: Colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { categories } = useCategories();

  const [form, setForm] = useState<Form>(() => toForm(profile));
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [serverError, setServerError] = useState('');
  const [busy, setBusy] = useState(false);

  // Re-seed the form each time the sheet opens, so a cancelled edit is discarded.
  useEffect(() => {
    if (visible) {
      setForm(toForm(profile));
      setErrors({});
      setServerError('');
    }
  }, [visible, profile]);

  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  async function onSave() {
    const found: Partial<Record<keyof Form, string>> = {};
    if (form.name.trim().length < 2) found.name = 'Enter your full name';
    if (!form.category) found.category = 'Pick a category';
    if (form.country.trim().length < 2) found.country = 'Required';
    if (!form.state.trim()) found.state = 'Required';
    if (!form.city.trim()) found.city = 'Required';

    setErrors(found);
    setServerError('');
    if (Object.keys(found).length) return;

    setBusy(true);
    try {
      const { data } = await request<{ data: MyProfile }>('/api/influencer/profile', {
        method: 'PUT',
        body: {
          name: form.name.trim(),
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
      onSaved(data);
    } catch (err) {
      setServerError(errorMessage(err, 'Could not save your changes'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: Colors.ink1000 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: Spacing.lg,
            paddingTop: Platform.OS === 'ios' ? Spacing.lg : insets.top + Spacing.md,
            paddingBottom: Spacing.md,
            borderBottomWidth: 1,
            borderBottomColor: Colors.line,
          }}
        >
          <Pressable onPress={onClose} hitSlop={12}>
            <Txt variant="small" color={Colors.text2}>Cancel</Txt>
          </Pressable>
          <Txt variant="h3">Edit profile</Txt>
          <Pressable onPress={onSave} disabled={busy} hitSlop={12}>
            <Txt variant="small" color={busy ? Colors.text3 : Colors.violet400}>
              {busy ? 'Saving…' : 'Save'}
            </Txt>
          </Pressable>
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.lg, paddingBottom: Spacing.xxl * 2 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Status is not editable here — only an admin can change it. */}
            <View
              style={{
                padding: Spacing.md,
                borderRadius: Radius.md,
                backgroundColor: Colors.violetBg,
                borderWidth: 1,
                borderColor: 'rgba(124,92,252,0.25)',
              }}
            >
              <Txt variant="small" color={Colors.text2} style={{ lineHeight: 18 }}>
                Your email and approval status are managed by the Aura team.
              </Txt>
            </View>

            <Field label="Full name" required value={form.name} error={errors.name} onChangeText={(v) => set('name', v)} />
            <Field label="Phone" value={form.phone} onChangeText={(v) => set('phone', v)} keyboardType="phone-pad" placeholder="+91 98765 43210" />
            <Field
              label="Bio" value={form.bio} onChangeText={(v) => set('bio', v)}
              multiline numberOfLines={4} maxLength={600}
              placeholder="What do you create, and for whom?"
              hint={`${form.bio.length}/600`}
              style={{ height: 104, textAlignVertical: 'top' }}
            />

            <CategoryPicker categories={categories} value={form.category} onChange={(v) => set('category', v)} error={errors.category} />

            <Field label="Country" required value={form.country} error={errors.country} onChangeText={(v) => set('country', v)} />
            <View style={{ flexDirection: 'row', gap: Spacing.md }}>
              <View style={{ flex: 1 }}>
                <Field label="State" required value={form.state} error={errors.state} onChangeText={(v) => set('state', v)} />
              </View>
              <View style={{ flex: 1 }}>
                <Field label="City" required value={form.city} error={errors.city} onChangeText={(v) => set('city', v)} />
              </View>
            </View>

            <Field label="Instagram" value={form.instagram} onChangeText={(v) => set('instagram', v)} autoCapitalize="none" placeholder="@handle or full URL" />
            <Field label="YouTube" value={form.youtube} onChangeText={(v) => set('youtube', v)} autoCapitalize="none" placeholder="@channel or full URL" />

            {!!serverError && <Banner tone="error" message={serverError} />}

            <Button label={busy ? 'Saving' : 'Save changes'} onPress={onSave} loading={busy} />
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function toForm(profile: MyProfile): Form {
  return {
    name: profile.name ?? '',
    phone: profile.phone ?? '',
    bio: profile.bio ?? '',
    instagram: profile.social?.instagram ?? '',
    youtube: profile.social?.youtube ?? '',
    category: profile.category?._id ?? '',
    country: profile.location?.country ?? '',
    state: profile.location?.state ?? '',
    city: profile.location?.city ?? '',
  };
}
