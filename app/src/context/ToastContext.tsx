import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
  type ReactNode,
} from 'react';
import { Animated, Easing, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Txt } from '@/components/ui';
import { useTheme } from '@/context/ThemeContext';
import { Radius, Spacing } from '@/theme/tokens';

type ToastTone = 'success' | 'error' | 'info';

interface ToastContextValue {
  notify: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const ICON: Record<ToastTone, keyof typeof Ionicons.glyphMap> = {
  success: 'checkmark-circle',
  error: 'alert-circle',
  info: 'information-circle',
};

const VISIBLE_MS = 2600;

/**
 * One transient message for the whole app.
 *
 * It sits above the navigator rather than inside a screen, because the messages that
 * matter most are the ones that follow a navigation — signing in, or saving something
 * and being sent back. A banner on the screen you just left cannot be read.
 *
 * Top-anchored on purpose: the bottom of the app belongs to the tab bar.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const { colors: Colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [toast, setToast] = useState<{ message: string; tone: ToastTone } | null>(null);
  // useState, not useRef: a ref read during render trips the hooks lint rule, and
  // `useRef(new Animated.Value(0))` would build a throwaway Value on every render.
  const [slide] = useState(() => new Animated.Value(0));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(() => {
    Animated.timing(slide, {
      toValue: 0,
      duration: 160,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setToast(null);
    });
  }, [slide]);

  const notify = useCallback(
    (message: string, tone: ToastTone = 'success') => {
      if (timer.current) clearTimeout(timer.current);
      setToast({ message, tone });
      Animated.timing(slide, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
      timer.current = setTimeout(hide, VISIBLE_MS);
    },
    [slide, hide],
  );

  // A pending timer would otherwise fire against an unmounted provider on reload.
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const value = useMemo(() => ({ notify }), [notify]);

  const tone = toast
    ? {
        success: { color: Colors.mint400, bg: Colors.mintBg },
        error: { color: Colors.rose400, bg: Colors.roseBg },
        info: { color: Colors.violet400, bg: Colors.violetBg },
      }[toast.tone]
    : null;

  return (
    <ToastContext.Provider value={value}>
      {children}

      {!!toast && !!tone && (
        <Animated.View
          // pointerEvents on the wrapper stays "box-none" so the rest of the screen
          // keeps working while a message is up.
          pointerEvents="box-none"
          style={{
            position: 'absolute',
            top: insets.top + Spacing.sm,
            left: Spacing.lg,
            right: Spacing.lg,
            opacity: slide,
            transform: [{ translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] }) }],
          }}
        >
          <Pressable onPress={hide} accessibilityRole="button" accessibilityLabel="Dismiss">
            <View
              accessibilityLiveRegion="polite"
              style={{
                flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
                paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
                borderRadius: Radius.lg,
                backgroundColor: Colors.ink850,
                borderWidth: 1, borderColor: tone.color + '55',
                // Without elevation the card behind it shows through on Android.
                elevation: 6,
                shadowColor: '#000', shadowOpacity: 0.25,
                shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
              }}
            >
              <View
                style={{
                  width: 26, height: 26, borderRadius: 13,
                  alignItems: 'center', justifyContent: 'center',
                  backgroundColor: tone.bg,
                }}
              >
                <Ionicons name={ICON[toast.tone]} size={16} color={tone.color} />
              </View>
              <Txt variant="small" color={Colors.text} style={{ flex: 1, lineHeight: 19 }}>
                {toast.message}
              </Txt>
            </View>
          </Pressable>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside ToastProvider');
  return context;
}
