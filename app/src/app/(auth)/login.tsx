import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { Banner, Button, Field, Txt } from '@/components/ui';
import { Wordmark } from '@/components/Brand';
import { errorMessage } from '@/lib/api';
import { isEmail } from '@/lib/format';
import { Spacing } from '@/theme/tokens';
import { useTheme } from '@/context/ThemeContext';

export default function LoginScreen() {
  const { colors: Colors } = useTheme();
  const router = useRouter();
  const { login, revokedMessage, clearRevokedMessage } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit() {
    if (!isEmail(email)) return setError('Enter a valid email address');
    if (!password) return setError('Enter your password');

    setError('');
    setBusy(true);
    try {
      await login(email.trim().toLowerCase(), password);
      // Discover, not the profile: signing in lands you in the directory, which is
      // what the app is for. The profile is one tab away.
      router.replace('/(tabs)');
    } catch (err) {
      setError(errorMessage(err, 'Could not sign in'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{ padding: Spacing.xl, gap: Spacing.xl, flexGrow: 1, justifyContent: 'center' }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ alignItems: 'center', gap: Spacing.lg }}>
          <Wordmark size={46} />
          <Txt variant="small" color={Colors.text2} center style={{ maxWidth: 280, lineHeight: 19 }}>
            Sign in to manage your creator profile and stay visible to brands.
          </Txt>
        </View>

        <View style={{ gap: Spacing.lg }}>
          <Field
            label="Email"
            required
            value={email}
            onChangeText={(value) => { setEmail(value); clearRevokedMessage(); }}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
          />
          <Field
            label="Password"
            required
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry
            autoComplete="current-password"
            textContentType="password"
            onSubmitEditing={onSubmit}
            returnKeyType="go"
          />

          {/* An admin ending the session takes priority over a stale form error. */}
          {revokedMessage ? (
            <Banner tone="warn" title="You were signed out" message={revokedMessage} />
          ) : null}

          {/* Approval state comes back as a 403 with the reason, so it surfaces here. */}
          {!!error && <Banner tone="error" message={error} />}

          <Button label={busy ? 'Signing in' : 'Sign in'} onPress={onSubmit} loading={busy} />
        </View>

        <View style={{ alignItems: 'center', gap: Spacing.sm }}>
          <Txt variant="small" color={Colors.text3}>New to Aura?</Txt>
          <Link href="/(auth)/register" asChild>
            <Pressable>
              <Txt variant="bodyStrong" color={Colors.violet400}>Create a creator account</Txt>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
