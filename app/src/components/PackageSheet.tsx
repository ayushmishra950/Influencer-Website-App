import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Banner, Button, Field, Txt } from './ui';
import { useTheme } from '@/context/ThemeContext';
import { Radius, Spacing } from '@/theme/tokens';
import { errorMessage } from '@/lib/api';
import { formatPrice } from '@/lib/format';
import type { Package } from '@/lib/types';
import type { PackageDraft } from '@/hooks/usePackages';

interface PackageSheetProps {
  visible: boolean;
  /** Null when adding. */
  editing: Package | null;
  onClose: () => void;
  onSave: (draft: PackageDraft, id?: string) => Promise<string>;
}

const EMPTY: PackageDraft = { title: '', description: '', price: '', deliveryDays: '' };

const toDraft = (pkg: Package | null): PackageDraft =>
  pkg
    ? {
        title: pkg.title,
        description: pkg.description,
        price: String(pkg.price),
        deliveryDays: pkg.deliveryDays ? String(pkg.deliveryDays) : '',
      }
    : EMPTY;

export function PackageSheet({ visible, editing, onClose, onSave }: PackageSheetProps) {
  const { colors: Colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [draft, setDraft] = useState<PackageDraft>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof PackageDraft, string>>>({});
  const [serverError, setServerError] = useState('');
  const [busy, setBusy] = useState(false);

  // Re-seed each time it opens, so a cancelled edit is discarded.
  useEffect(() => {
    if (visible) {
      setDraft(toDraft(editing));
      setErrors({});
      setServerError('');
    }
  }, [visible, editing]);

  const set = <K extends keyof PackageDraft>(key: K, value: PackageDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const priceNumber = Number(draft.price);
  const pricePreview =
    draft.price && Number.isFinite(priceNumber) && priceNumber >= 0
      ? formatPrice(Math.trunc(priceNumber))
      : null;

  async function submit() {
    const found: Partial<Record<keyof PackageDraft, string>> = {};
    if (draft.title.trim().length < 2) found.title = 'Name the service you are offering';
    if (!draft.price.trim()) found.price = 'Enter a price';
    else if (!Number.isFinite(priceNumber) || priceNumber < 0) found.price = 'Enter a valid amount';
    if (draft.deliveryDays && !Number.isFinite(Number(draft.deliveryDays))) {
      found.deliveryDays = 'Enter a number of days';
    }

    setErrors(found);
    setServerError('');
    if (Object.keys(found).length) return;

    setBusy(true);
    try {
      await onSave(draft, editing?._id);
      onClose();
    } catch (err) {
      setServerError(errorMessage(err, 'Could not save this package'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: Colors.ink1000 }}>
        <View
          style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            paddingHorizontal: Spacing.lg,
            paddingTop: Platform.OS === 'ios' ? Spacing.lg : insets.top + Spacing.md,
            paddingBottom: Spacing.md,
            borderBottomWidth: 1, borderBottomColor: Colors.line,
          }}
        >
          <Pressable onPress={onClose} hitSlop={12}>
            <Txt variant="small" color={Colors.text2}>Cancel</Txt>
          </Pressable>
          <Txt variant="h3">{editing ? 'Edit package' : 'Add package'}</Txt>
          <Pressable onPress={() => void submit()} disabled={busy} hitSlop={12}>
            <Txt variant="small" color={busy ? Colors.text3 : Colors.violet400}>
              {busy ? 'Saving…' : 'Submit'}
            </Txt>
          </Pressable>
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.lg, paddingBottom: Spacing.xxl * 2 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Say the consequence before they type, not after they submit. */}
            <View
              style={{
                padding: Spacing.md, borderRadius: Radius.md,
                backgroundColor: Colors.amberBg,
                borderWidth: 1, borderColor: Colors.amber400 + '44',
              }}
            >
              <Txt variant="small" color={Colors.text2} style={{ lineHeight: 18 }}>
                {editing
                  ? 'Editing sends this package back for review, so it leaves your public profile until an administrator approves it again.'
                  : 'New packages are reviewed before they appear on your public profile.'}
              </Txt>
            </View>

            <Field
              label="Service"
              required
              value={draft.title}
              error={errors.title}
              onChangeText={(v) => set('title', v)}
              placeholder="e.g. Instagram Reel"
              maxLength={80}
            />

            <Field
              label="Price (INR)"
              required
              value={draft.price}
              error={errors.price}
              onChangeText={(v) => set('price', v.replace(/[^0-9]/g, ''))}
              placeholder="3000"
              keyboardType="number-pad"
              hint={pricePreview ? `Shown as ${pricePreview}` : undefined}
            />

            <Field
              label="Delivery time (days)"
              value={draft.deliveryDays}
              error={errors.deliveryDays}
              onChangeText={(v) => set('deliveryDays', v.replace(/[^0-9]/g, ''))}
              placeholder="Optional — e.g. 5"
              keyboardType="number-pad"
            />

            <Field
              label="What's included"
              value={draft.description}
              onChangeText={(v) => set('description', v)}
              placeholder="One 30-second reel, scripted and shot by me."
              multiline
              numberOfLines={4}
              maxLength={400}
              hint={`${draft.description.length}/400`}
              style={{ height: 104, textAlignVertical: 'top' }}
            />

            {!!serverError && <Banner tone="error" message={serverError} />}

            <Button
              label={busy ? 'Submitting' : editing ? 'Submit changes' : 'Submit for review'}
              onPress={() => void submit()}
              loading={busy}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
