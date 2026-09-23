import { Stack } from 'expo-router';
import { BackButton } from '@/components/BackButton';
import { useTheme } from '@/context/ThemeContext';

export default function AuthLayout() {
  const { colors: Colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.ink1000 },
        headerTintColor: Colors.text,
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: '700', fontSize: 17 },
        headerBackVisible: false,
        // Falling back to the landing page matters here: these screens are often
        // the first thing a deep link or a forced sign-out lands on.
        headerLeft: () => <BackButton fallback="/(tabs)" />,
        contentStyle: { backgroundColor: Colors.ink1000 },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="login" options={{ title: 'Sign in' }} />
      <Stack.Screen name="register" options={{ title: 'Create account' }} />
      {/* Registration is complete here; going "back" into the form would be wrong. */}
      <Stack.Screen name="pending" options={{ title: '', headerLeft: () => null }} />
    </Stack>
  );
}
