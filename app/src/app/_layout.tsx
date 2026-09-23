import { DarkTheme, DefaultTheme, Stack, ThemeProvider as NavThemeProvider, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BackButton } from '@/components/BackButton';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { NotificationProvider } from '@/context/NotificationContext';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { ThemeToggle } from '@/components/ThemeToggle';

void SplashScreen.preventAutoHideAsync();

/** React Navigation keeps its own palette, so it has to be rebuilt per theme. */
function useNavigationTheme() {
  const { theme, colors } = useTheme();
  const base = theme === 'dark' ? DarkTheme : DefaultTheme;
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: colors.violet500,
      background: colors.ink1000,
      card: colors.ink950,
      text: colors.text,
      border: colors.line,
    },
  };
}

/**
 * Routes a signed-out visitor may open. Everything else requires an account.
 *
 * `about` belongs here: it explains what the product is and why it is verified, which
 * is exactly what someone needs before deciding whether to register.
 */
const PUBLIC_SEGMENTS = new Set(['welcome', '(auth)', 'about']);

function RootNavigator() {
  const { booting, user, revokedMessage } = useAuth();
  const { colors: Colors, theme } = useTheme();
  const navigationTheme = useNavigationTheme();
  const router = useRouter();
  const segments = useSegments();

  const onPublicRoute = PUBLIC_SEGMENTS.has(segments[0] ?? '');

  // Single gate for the whole app. Without this, a deep link or a browser reload could
  // drop a signed-out visitor onto a tab screen with no data and no way back.
  useEffect(() => {
    if (booting) return;
    if (!user && !onPublicRoute) router.replace('/welcome');
    else if (user && segments[0] === 'welcome') router.replace('/(tabs)');
  }, [booting, user, onPublicRoute, segments, router]);

  // An admin ending the session must not leave the user staring at a screen they no
  // longer have access to — send them to login, where the reason is displayed.
  useEffect(() => {
    if (revokedMessage) router.replace('/(auth)/login');
  }, [revokedMessage, router]);

  // Hold the splash until the stored session has been checked, so the app never
  // flashes the signed-out state for a user who is actually signed in.
  useEffect(() => {
    if (!booting) void SplashScreen.hideAsync();
  }, [booting]);

  if (booting) return null;

  return (
    <NavThemeProvider value={navigationTheme}>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: Colors.ink1000 },
          headerTintColor: Colors.text,
          headerTitleStyle: { fontWeight: '700', fontSize: 17 },
          headerShadowVisible: false,
          headerBackVisible: false,
          // One arrow, same position and size on every pushed screen.
          headerLeft: () => <BackButton />,
          // The theme control sits top right on every pushed screen, matching the admin.
          headerRight: () => <ThemeToggle />,
          contentStyle: { backgroundColor: Colors.ink1000 },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="welcome" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="creators" options={{ title: 'All creators' }} />
        <Stack.Screen
          name="about"
          options={{
            title: 'About Aura',
            // A signed-out reader has no tabs to go back to, so send them home instead
            // of bouncing them off the auth gate.
            headerLeft: () => <BackButton fallback={user ? '/(tabs)' : '/welcome'} />,
          }}
        />
        <Stack.Screen
          name="influencer/[id]"
          options={{
            title: '',
            headerTransparent: true,
            // Sits over the gradient header, so both controls need their own backdrop.
            headerLeft: () => <BackButton floating />,
            headerRight: () => <ThemeToggle floating />,
          }}
        />
      </Stack>
    </NavThemeProvider>
  );
}

function Shell() {
  const { colors } = useTheme();
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.ink1000 }}>
      <AuthProvider>
        <NotificationProvider>
          <RootNavigator />
        </NotificationProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <Shell />
    </ThemeProvider>
  );
}
