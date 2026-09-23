import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { Hero, Radius } from '@/theme/tokens';

interface ThemeToggleProps {
  /** Adds a translucent disc behind the icon, for use over a gradient header. */
  floating?: boolean;
  size?: number;
}

/**
 * Swaps the whole app between dark and light.
 *
 * Both icons are always mounted and cross-faded, so the control never reflows and the
 * change reads as one motion rather than a swap. Matches the admin dashboard's toggle.
 */
export function ThemeToggle({ floating, size = 38 }: ThemeToggleProps) {
  const { theme, colors, toggle, followsSystem } = useTheme();
  const isDark = theme === 'dark';
  const next = isDark ? 'light' : 'dark';

  return (
    <Pressable
      onPress={toggle}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={`Switch to ${next} theme`}
      accessibilityHint={followsSystem ? `Currently following your device theme (${theme})` : undefined}
      accessibilityState={{ selected: !followsSystem }}
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
    >
      <View
        style={{
          width: size,
          height: size,
          // Same shape on every screen. Only the surface changes, so the control does
          // not appear to be a different thing depending on what is behind it.
          borderRadius: Radius.full,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: floating ? Hero.scrim : colors.ink800,
          borderWidth: 1,
          borderColor: floating ? Hero.border : colors.line,
        }}
      >
        <View style={{ position: 'absolute', opacity: isDark ? 1 : 0 }}>
          <Ionicons name="moon" size={17} color={floating ? Hero.iconMoon : colors.gold400} />
        </View>
        <View style={{ position: 'absolute', opacity: isDark ? 0 : 1 }}>
          <Ionicons name="sunny" size={18} color={floating ? Hero.iconSun : colors.amber400} />
        </View>
      </View>
    </Pressable>
  );
}
