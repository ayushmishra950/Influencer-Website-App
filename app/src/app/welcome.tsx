import { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, Button, Txt } from '@/components/ui';
import { Logo } from '@/components/Brand';
import { ThemeToggle } from '@/components/ThemeToggle';
import { request } from '@/lib/api';
import { Radius, Spacing, Hero } from '@/theme/tokens';
import type { DirectoryInfluencer } from '@/lib/types';
import { useTheme } from '@/context/ThemeContext';

interface PublicStats {
  totalCreators: number;
  totalCities: number;
  totalCategories: number;
  spotlight: DirectoryInfluencer[];
}

const VALUE_PROPS = [
  {
    icon: 'shield-checkmark' as const,
    title: 'Verified profiles only',
    body: 'Every creator is reviewed by our team before they appear.',
  },
  {
    icon: 'search' as const,
    title: 'Search by niche and city',
    body: 'Filter across categories and locations to find the right fit.',
  },
  {
    icon: 'link' as const,
    title: 'All their channels in one place',
    body: 'Instagram and YouTube on a single profile.',
  },
];

/**
 * The only screen a signed-out visitor sees. No tab bar and no directory:
 * one clear path in, so the first impression is not a half-usable app.
 */
export default function WelcomeScreen() {
  const { colors: Colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [stats, setStats] = useState<PublicStats | null>(null);

  // Social proof only. If it fails the screen still works, so the error is not surfaced.
  useEffect(() => {
    const controller = new AbortController();
    request<{ data: PublicStats }>('/api/public/stats', { auth: false, signal: controller.signal })
      .then(({ data }) => setStats(data))
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  const faces = stats?.spotlight.slice(0, 5) ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: Colors.ink1000 }}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + Spacing.xl }}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={Hero.gradient}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0.85, y: 1 }}
          style={{
            paddingTop: insets.top + Spacing.xxl,
            paddingBottom: Spacing.xxl,
            paddingHorizontal: Spacing.xl,
            gap: Spacing.xl,
          }}
        >
          {/* Absolute so it sits top-right without shifting the centred hero. */}
          <View style={{ position: 'absolute', top: insets.top + Spacing.md, right: Spacing.lg }}>
            <ThemeToggle floating />
          </View>

          <View style={{ alignItems: 'center', gap: Spacing.md }}>
            <Logo size={64} />
            <View style={{ alignItems: 'center', gap: 2 }}>
              <Txt variant="h2" color={Hero.text} style={{ fontSize: 22 }}>Aura</Txt>
              <Txt variant="tiny" color={Hero.textFaint} style={{ textTransform: 'uppercase' }}>
                Creator Network
              </Txt>
            </View>
          </View>

          <View style={{ gap: Spacing.md, alignItems: 'center', paddingTop: Spacing.sm }}>
            <Txt variant="h1" color={Hero.text} center style={{ fontSize: 31, lineHeight: 39 }}>
              Find creators{'\n'}worth working with
            </Txt>
            <Txt variant="body" color={Hero.textMuted} center style={{ lineHeight: 22, maxWidth: 320 }}>
              A verified directory of influencers, reviewed one by one before they go live.
            </Txt>
          </View>

          {/* Overlapping faces: proof the network is real, without opening the directory. */}
          {faces.length > 0 && (
            <View style={{ alignItems: 'center', gap: Spacing.md }}>
              <View style={{ flexDirection: 'row' }}>
                {faces.map((creator, index) => (
                  <View key={creator._id} style={{ marginLeft: index === 0 ? 0 : -14 }}>
                    <View
                      style={{
                        borderWidth: 2,
                        borderColor: Hero.gradient[1],
                        borderRadius: Radius.full,
                      }}
                    >
                      <Avatar name={creator.name} src={creator.profileImage} size={40} onHero />
                    </View>
                  </View>
                ))}
              </View>
              <Txt variant="small" color={Hero.textMuted}>
                {stats?.totalCreators} verified creators across {stats?.totalCities} cities
              </Txt>
            </View>
          )}
        </LinearGradient>

        {/* paddingTop matters here: the gradient's own paddingBottom only keeps its
            last line off the band's edge — without this the first value prop starts
            flush against the violet, with no breathing room at all. */}
        <View style={{ paddingHorizontal: Spacing.xl, paddingTop: Spacing.xxl, gap: Spacing.lg }}>
          {VALUE_PROPS.map((prop) => (
            <View key={prop.title} style={{ flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start' }}>
              <View
                style={{
                  width: 38, height: 38, borderRadius: Radius.md,
                  backgroundColor: Colors.violetBg,
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Ionicons name={prop.icon} size={18} color={Colors.violet400} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Txt variant="bodyStrong">{prop.title}</Txt>
                <Txt variant="small" color={Colors.text2} style={{ lineHeight: 19 }}>{prop.body}</Txt>
              </View>
            </View>
          ))}
        </View>

        <View style={{ flex: 1 }} />

        <View style={{ paddingHorizontal: Spacing.xl, paddingTop: Spacing.xxl, gap: Spacing.lg }}>
          <Button label="Sign in" onPress={() => router.push('/(auth)/login')} />

          <Button
            label="About Aura"
            variant="ghost"
            onPress={() => router.push('/about')}
            icon={<Ionicons name="information-circle-outline" size={17} color={Colors.text} />}
          />

          <Pressable
            onPress={() => router.push('/(auth)/register')}
            hitSlop={10}
            accessibilityRole="button"
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 5 }}>
              <Txt variant="small" color={Colors.text3}>New to Aura?</Txt>
              <Txt variant="bodyStrong" color={Colors.violet400} style={{ fontSize: 13 }}>
                Create an account
              </Txt>
            </View>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
