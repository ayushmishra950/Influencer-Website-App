import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Banner, Button, Card, Field, Txt } from '@/components/ui';
import { errorMessage, request } from '@/lib/api';
import { Spacing } from '@/theme/tokens';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';

/** Changes the signed-in creator's own password. */
export default function ChangePasswordScreen() {
  const { colors: Colors } = useTheme();
  const { user } = useAuth();
  const { notify } = useToast();
  const router = useRouter();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit() {
    if (password.length < 8) return setError('Password must be at least 8 characters');
    if (password !== confirmPassword) return setError('Passwords do not match');

    setError('');
    setBusy(true);
    try {
      await request('/api/auth/change-password', {
        method: 'POST',
        body: { password, confirmPassword },
      });
      // Leave the screen and say so from outside it: a confirmation on a form the
      // person has finished with is a screen they then have to dismiss themselves.
      // `canGoBack` guards the case where this was opened by a deep link.
      if (router.canGoBack()) router.back();
      else router.replace('/(tabs)/profile');
      notify('Password updated successfully');
    } catch (err) {
      setError(errorMessage(err, 'Could not update the password'));
    } finally {
      setBusy(false);
    }
  }

  function edit(setter: (value: string) => void) {
    return (value: string) => {
      setter(value);
      setError('');
    };
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      {/* Centred both ways: the card is short, so pinned to the top of a tall screen
          it reads as an unfinished page. maxWidth keeps it from stretching on a
          tablet, and `flexGrow` lets the content still scroll once the keyboard is up. */}
      <ScrollView
        contentContainerStyle={{
          padding: Spacing.lg,
          gap: Spacing.lg,
          flexGrow: 1,
          justifyContent: 'center',
          alignItems: 'center',
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Card style={{ padding: Spacing.lg, gap: Spacing.lg, width: '100%', maxWidth: 440 }}>
          {!!user?.email && (
            <Txt variant="small" color={Colors.text3}>Signed in as {user.email}</Txt>
          )}

          <Field
            label="New password"
            required
            value={password}
            onChangeText={edit(setPassword)}
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
            onChangeText={edit(setConfirmPassword)}
            placeholder="••••••••"
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
            onSubmitEditing={onSubmit}
            returnKeyType="go"
          />

          {!!error && <Banner tone="error" message={error} />}

          <Button
            label={busy ? 'Saving' : 'Update password'}
            onPress={onSubmit}
            loading={busy}
          />
        </Card>

        <View style={{ paddingHorizontal: Spacing.xs, width: '100%', maxWidth: 440 }}>
          <Txt variant="tiny" color={Colors.text3} style={{ lineHeight: 16 }}>
            Sessions already open on other devices keep working until their token
            expires.
          </Txt>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
