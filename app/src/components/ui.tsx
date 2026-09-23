import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { Hero, Radius, Spacing, Type, type Palette } from '@/theme/tokens';
import { useTheme } from '@/context/ThemeContext';
import { imageUrl } from '@/lib/api';
import { initials } from '@/lib/format';

/* ---------------- Text ---------------- */

type TextVariant = keyof typeof Type;

interface TxtProps {
  children: React.ReactNode;
  variant?: TextVariant;
  color?: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  center?: boolean;
}

export function Txt({ children, variant = 'body', color, style, numberOfLines, center }: TxtProps) {
  const { colors: Colors } = useTheme();
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[Type[variant], { color: color ?? Colors.text }, center && { textAlign: 'center' }, style]}
    >
      {children}
    </Text>
  );
}

/* ---------------- Surface ---------------- */

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors: Colors, gradients: Gradients } = useTheme();
  const styles = useStyles(Colors);
  return (
    <LinearGradient colors={Gradients.surface} style={[styles.card, style]}>
      {children}
    </LinearGradient>
  );
}

/* ---------------- Button ---------------- */

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost' | 'subtle' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function Button({ label, onPress, variant = 'primary', loading, disabled, icon, style }: ButtonProps) {
  const { colors: Colors, gradients: Gradients } = useTheme();
  const styles = useStyles(Colors);
  const inactive = disabled || loading;

  const content = (
    <>
      {loading ? <ActivityIndicator size="small" color={variant === 'primary' ? Colors.onBrand : Colors.text} /> : icon}
      <Text style={[styles.btnLabel, variant === 'primary' && { color: Colors.onBrand }, variant === 'danger' && { color: Colors.rose400 }]}>
        {label}
      </Text>
    </>
  );

  if (variant === 'primary') {
    return (
      <Pressable onPress={onPress} disabled={inactive} style={({ pressed }) => [style, { opacity: inactive ? 0.55 : pressed ? 0.88 : 1 }]}>
        <LinearGradient colors={Gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.btn}>
          {content}
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        styles.btn,
        variant === 'ghost' && styles.btnGhost,
        variant === 'subtle' && styles.btnSubtle,
        variant === 'danger' && styles.btnDanger,
        { opacity: inactive ? 0.55 : pressed ? 0.8 : 1 },
        style,
      ]}
    >
      {content}
    </Pressable>
  );
}

/* ---------------- Input ---------------- */

interface FieldProps extends TextInputProps {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
}

export function Field({ label, error, hint, required, style, ...props }: FieldProps) {
  const { colors: Colors, gradients: Gradients } = useTheme();
  const styles = useStyles(Colors);
  const [revealed, setRevealed] = useState(false);
  const isPassword = !!props.secureTextEntry;

  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={{ color: Colors.rose400 }}> *</Text>}
      </Text>

      <View style={{ position: 'relative', justifyContent: 'center' }}>
        <TextInput
          placeholderTextColor={Colors.text3}
          style={[
            styles.input,
            !!error && { borderColor: Colors.rose400 },
            isPassword && { paddingRight: 48 },
            style,
          ]}
          {...props}
          // Revealing has to switch secureTextEntry off, not just change an icon.
          secureTextEntry={isPassword && !revealed}
        />

        {isPassword && (
          <Pressable
            onPress={() => setRevealed((current) => !current)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Hide password' : 'Show password'}
            accessibilityState={{ selected: revealed }}
            style={({ pressed }) => [styles.revealButton, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Ionicons
              name={revealed ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={revealed ? Colors.violet400 : Colors.text3}
            />
          </Pressable>
        )}
      </View>

      {error ? (
        <Text style={[Type.small, { color: Colors.rose400 }]}>{error}</Text>
      ) : hint ? (
        <Text style={[Type.small, { color: Colors.text3 }]}>{hint}</Text>
      ) : null}
    </View>
  );
}

/* ---------------- Avatar ---------------- */

interface AvatarProps {
  name: string;
  src?: string;
  size?: number;
  /**
   * Set on the violet profile hero. The default fill is the brand gradient, which is
   * the same violet pair the hero itself uses, so the disc vanishes into it. See
   * `Hero.avatarGradient` for the measured numbers.
   */
  onHero?: boolean;
}

export function Avatar({ name, src, size = 44, onHero = false }: AvatarProps) {
  const { colors: Colors, gradients: Gradients } = useTheme();
  const styles = useStyles(Colors);
  const uri = imageUrl(src);
  const dimensions = { width: size, height: size, borderRadius: size / 2 };
  // Scale the ring with the avatar so a 40px list avatar is not outlined like a 104px one.
  const ring = onHero
    ? { borderWidth: Math.max(2, Math.round(size * 0.03)), borderColor: Hero.avatarRing }
    : null;

  if (uri) {
    return <Image source={{ uri }} style={[dimensions, { backgroundColor: Colors.ink800 }, ring]} />;
  }

  return (
    <LinearGradient
      colors={onHero ? Hero.avatarGradient : Gradients.brand}
      style={[dimensions, styles.avatarFallback, ring]}
    >
      <Text
        style={{
          color: onHero ? Hero.avatarText : Colors.onBrand,
          fontWeight: '700',
          fontSize: Math.max(11, size * 0.36),
        }}
      >
        {initials(name)}
      </Text>
    </LinearGradient>
  );
}

/* ---------------- Chip ---------------- */

interface ChipProps {
  label: string;
  color?: string;
  bg?: string;
  onPress?: () => void;
  active?: boolean;
}

export function Chip({ label, color, bg, onPress, active }: ChipProps) {
  const { colors: Colors, gradients: Gradients } = useTheme();
  const styles = useStyles(Colors);
  const body = (
    <View
      style={[
        styles.chip,
        {
          // violet600 rather than violet500: white on #7c5cfc measures 4.38:1, just
          // under AA for label-sized text. The darker step is visually near-identical.
          backgroundColor: active ? Colors.violet600 : (bg ?? Colors.violetBg),
          borderColor: active ? Colors.violet600 : 'transparent',
        },
      ]}
    >
      <Text style={[Type.small, { color: active ? Colors.onBrand : (color ?? Colors.violet300) }]}>{label}</Text>
    </View>
  );

  return onPress ? (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
      {body}
    </Pressable>
  ) : (
    body
  );
}

/* ---------------- Feedback ---------------- */

/**
 * Fills the space it is given and centres on both axes, so the spinner lands in the
 * optical centre instead of clinging to the top of a tall, empty screen.
 */
export function Loader({ label, fill = true }: { label?: string; fill?: boolean }) {
  const { colors: Colors } = useTheme();
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label ?? 'Loading'}
      style={{
        flex: fill ? 1 : undefined,
        minHeight: fill ? 280 : undefined,
        paddingVertical: fill ? Spacing.xxl : 60,
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.md,
      }}
    >
      <ActivityIndicator size="large" color={Colors.violet400} />
      {label && <Txt variant="small" color={Colors.text3}>{label}</Txt>}
    </View>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  const { colors: Colors, gradients: Gradients } = useTheme();
  const styles = useStyles(Colors);
  return (
    <View style={{ paddingVertical: 56, paddingHorizontal: Spacing.xl, alignItems: 'center', gap: Spacing.md }}>
      <View style={styles.emptyIcon}>
        <Text style={{ fontSize: 22 }}>✦</Text>
      </View>
      <Txt variant="h3" center>{title}</Txt>
      {description && <Txt variant="small" color={Colors.text2} center style={{ maxWidth: 300, lineHeight: 19 }}>{description}</Txt>}
      {action}
    </View>
  );
}

export function Banner({ tone, title, message }: { tone: 'info' | 'warn' | 'error' | 'success'; title?: string; message: string }) {
  const { colors: Colors, gradients: Gradients } = useTheme();
  const styles = useStyles(Colors);
  const palette = {
    info: { color: Colors.violet400, bg: Colors.violetBg },
    warn: { color: Colors.amber400, bg: Colors.amberBg },
    error: { color: Colors.rose400, bg: Colors.roseBg },
    success: { color: Colors.mint400, bg: Colors.mintBg },
  }[tone];

  return (
    <View style={[styles.banner, { backgroundColor: palette.bg, borderColor: palette.color + '44' }]}>
      {title && <Txt variant="bodyStrong" color={palette.color}>{title}</Txt>}
      <Txt variant="small" color={Colors.text2} style={{ lineHeight: 19 }}>{message}</Txt>
    </View>
  );
}

const makeStyles = (Colors: Palette) => StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.line,
    overflow: 'hidden',
  },
  btn: {
    height: 48,
    borderRadius: Radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  btnGhost: { backgroundColor: Colors.ink800, borderWidth: 1, borderColor: Colors.line },
  btnSubtle: { backgroundColor: 'transparent' },
  btnDanger: { backgroundColor: Colors.roseBg, borderWidth: 1, borderColor: 'rgba(251,113,133,0.3)' },
  btnLabel: { fontSize: 14.5, fontWeight: '600', color: Colors.text },
  label: { fontSize: 12.5, fontWeight: '600', color: Colors.text2 },
  input: {
    minHeight: 48,
    backgroundColor: Colors.ink950,
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    color: Colors.text,
    fontSize: 15,
  },
  revealButton: {
    position: 'absolute',
    right: 6,
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.sm,
  },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: Radius.lg,
    backgroundColor: Colors.violetBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  banner: {
    padding: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: 1,
    gap: Spacing.xs,
  },
});

/**
 * One StyleSheet per palette, built on first use.
 *
 * StyleSheet.create resolves its values once, so a module-level sheet would freeze
 * whichever theme happened to be active when the file loaded. Caching by palette keeps
 * the cost to two sheets for the life of the app.
 */
const sheetCache = new Map<Palette, ReturnType<typeof makeStyles>>();

function useStyles(Colors: Palette) {
  let sheet = sheetCache.get(Colors);
  if (!sheet) {
    sheet = makeStyles(Colors);
    sheetCache.set(Colors, sheet);
  }
  return sheet;
}
