import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Hero, Radius } from '@/theme/tokens';
import { useTheme } from '@/context/ThemeContext';

interface BackButtonProps {
  /** Where to land when there is nothing to go back to (deep link, refresh on web). */
  fallback?: string;
  /** Adds a dark disc behind the arrow, for use over a photo or gradient header. */
  floating?: boolean;
  tint?: string;
}

export function BackButton({ fallback = '/(tabs)', floating, tint }: BackButtonProps) {
  const { colors: Colors } = useTheme();
  const router = useRouter();

  // Defaulted here rather than in the signature: parameter defaults are evaluated
  // before hooks run, so they cannot see the active theme.
  const arrowTint = tint ?? Colors.text;

  const goBack = () => {
    // canGoBack() is false on a fresh deep link or a web reload, where popping
    // would leave the user on a blank screen.
    if (router.canGoBack()) router.back();
    else router.replace(fallback as never);
  };

  return (
    <Pressable
      onPress={goBack}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel="Go back"
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
    >
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: floating ? Radius.full : Radius.md,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: floating ? Hero.scrim : 'transparent',
          borderWidth: floating ? 1 : 0,
          borderColor: Hero.border,
          marginLeft: -6,
        }}
      >
        <Ionicons name="chevron-back" size={22} color={arrowTint} />
      </View>
    </Pressable>
  );
}
