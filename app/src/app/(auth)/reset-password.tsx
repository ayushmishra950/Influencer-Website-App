import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Banner, Button, Field, Loader, Txt } from '@/components/ui';
import { Wordmark } from '@/components/Brand';
import { errorMessage, request } from '@/lib/api';
import { takeResetHandoff } from '@/lib/resetHandoff';
import { Spacing } from '@/theme/tokens';
import { useTheme } from '@/context/ThemeContext';

/** Step two: set the new password, then send them to sign in with it. */
export default function ResetPasswordScreen() {
  const { colors: Colors } = useTheme();
  const router = useRouter();

  // Read once on mount: the handoff is single use, so a re-render must not consume it.
  const [handoff] = useState(takeResetHandoff);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Opened directly, with nothing from the email step — there is nothing to reset.
  useEffect(() => {
    if (!handoff) router.replace('/(auth)/forgot-password');
  }, [handoff, router]);

  if (!handoff) return <Loader label="Starting again" />;

  async function onSubmit() {
    if (password.length < 8) return setError('Password must be at least 8 characters');
    if (password !== confirmPassword) return setError('Passwords do not match');

    setError('');
    setBusy(true);
    try {
      await request('/api/auth/reset-password', {
        method: 'POST',
        auth: false,
        body: { token: handoff?.token, password, confirmPassword },
      });
      router.replace('/(auth)/login');
    } catch (err) {
      setError(errorMessage(err, 'Could not update the password'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{
          padding: Spacing.xl, gap: Spacing.xl, flexGrow: 1, justifyContent: 'center',
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ alignItems: 'center', gap: Spacing.lg }}>
          <Wordmark size={46} />
          <Txt variant="small" color={Colors.text2} center style={{ maxWidth: 290, lineHeight: 19 }}>
            Choose a new password for {handoff.email}.
          </Txt>
        </View>

        <View style={{ gap: Spacing.lg }}>
          <Field
            label="New password"
            required
            value={password}
            onChangeText={(value) => { setPassword(value); setError(''); }}
            placeholder="••••••••"
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
            hint="At least 8 characters"
          />
          <Field
            label="Confirm password"
            required
            value={confirmPassword}
            onChangeText={(value) => { setConfirmPassword(value); setError(''); }}
            placeholder="••••••••"
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
            onSubmitEditing={onSubmit}
            returnKeyType="go"
          />

          {!!error && <Banner tone="error" message={error} />}

          <Button
            label={busy ? 'Saving' : 'Set new password'}
            onPress={onSubmit}
            loading={busy}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
