import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Banner, Button, Field, Txt } from '@/components/ui';
import { Wordmark } from '@/components/Brand';
import { errorMessage, request } from '@/lib/api';
import { isEmail } from '@/lib/format';
import { setResetHandoff } from '@/lib/resetHandoff';
import { Spacing } from '@/theme/tokens';
import { useTheme } from '@/context/ThemeContext';

/** Step one of the reset: name the account, then move on to choosing a password. */
export default function ForgotPasswordScreen() {
  const { colors: Colors } = useTheme();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit() {
    if (!isEmail(email)) return setError('Enter a valid email address');

    setError('');
    setBusy(true);
    try {
      const { data } = await request<{ data: { token: string; email: string } }>(
        '/api/auth/forgot-password',
        { method: 'POST', auth: false, body: { email: email.trim().toLowerCase() } },
      );
      setResetHandoff(data);
      router.replace('/(auth)/reset-password');
    } catch (err) {
      setError(errorMessage(err, 'Could not find that account'));
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
            Enter your registered email and we will take you straight to setting a new
            password.
          </Txt>
        </View>

        <View style={{ gap: Spacing.lg }}>
          <Field
            label="Enter your registered email"
            required
            value={email}
            onChangeText={(value) => { setEmail(value); setError(''); }}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            onSubmitEditing={onSubmit}
            returnKeyType="go"
          />

          {!!error && <Banner tone="error" message={error} />}

          <Button label={busy ? 'Checking' : 'Continue'} onPress={onSubmit} loading={busy} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
