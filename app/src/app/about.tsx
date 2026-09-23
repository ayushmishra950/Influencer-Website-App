import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card, Txt } from '@/components/ui';
import { Logo } from '@/components/Brand';
import { useTheme } from '@/context/ThemeContext';
import { request } from '@/lib/api';
import { Hero, Radius, Spacing } from '@/theme/tokens';

interface PublicStats {
  totalCreators: number;
  totalCities: number;
  totalCategories: number;
}

type IconName = keyof typeof Ionicons.glyphMap;

const WHY_BRANDS: { icon: IconName; title: string; body: string }[] = [
  {
    icon: 'shield-checkmark',
    title: 'Nobody lists themselves',
    body: 'Every profile is reviewed by a person before it goes live. A creator can register, but only an administrator can publish them.',
  },
  {
    icon: 'search',
    title: 'Search that matches how you brief',
    body: 'Filter by niche and by city, because a fitness creator in Jaipur and one in Kochi are not interchangeable for a local campaign.',
  },
  {
    icon: 'link',
    title: 'Their channels in one place',
    body: 'Instagram and YouTube on a single profile, so you are not stitching together handles from three different messages.',
  },
];

const WHY_CREATORS: { icon: IconName; title: string; body: string }[] = [
  {
    icon: 'ribbon',
    title: 'A verified badge that means something',
    body: 'Because listings are checked rather than self-served, being on Aura is a signal in itself.',
  },
  {
    icon: 'create',
    title: 'Your profile stays yours',
    body: 'Edit your bio, photo, niche and location whenever you like. Changes appear in the directory immediately.',
  },
  {
    icon: 'notifications',
    title: 'You always know where you stand',
    body: 'Approved, under review or not approved — you see the status and the reason, and you are notified the moment it changes.',
  },
];

const HOW_IT_WORKS = [
  { step: '1', title: 'Register', body: 'Add your details, niche, location and social accounts.' },
  { step: '2', title: 'Review', body: 'Our team checks your accounts. Registration is not activation.' },
  { step: '3', title: 'Go live', body: 'Once approved you can sign in and brands can find you.' },
];

export default function AboutScreen() {
  const { colors: Colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState<PublicStats | null>(null);

  // Numbers are supporting detail here, so a failure just hides them.
  useEffect(() => {
    const controller = new AbortController();
    request<{ data: PublicStats }>('/api/public/stats', { auth: false, signal: controller.signal })
      .then(({ data }) => setStats(data))
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.xxl }}>
      <LinearGradient
        colors={Hero.gradient}
        style={{ paddingTop: Spacing.xxl, paddingBottom: Spacing.xl, paddingHorizontal: Spacing.xl, gap: Spacing.lg, alignItems: 'center' }}
      >
        <Logo size={56} />
        <View style={{ gap: Spacing.sm, alignItems: 'center' }}>
          <Txt variant="h1" color={Hero.text} center style={{ fontSize: 27 }}>
            A directory you can trust
          </Txt>
          <Txt variant="body" color={Hero.textMuted} center style={{ lineHeight: 22, maxWidth: 320 }}>
            Aura is a verified directory of content creators. Every profile is reviewed by our
            team before anyone can find it.
          </Txt>
        </View>

        {!!stats && (
          <View style={{ flexDirection: 'row', gap: Spacing.sm, width: '100%' }}>
            {[
              { value: stats.totalCreators, label: 'Creators' },
              { value: stats.totalCategories, label: 'Niches' },
              { value: stats.totalCities, label: 'Cities' },
            ].map((item) => (
              <View
                key={item.label}
                style={{
                  flex: 1, alignItems: 'center', paddingVertical: Spacing.md,
                  borderRadius: Radius.md, backgroundColor: Hero.scrim,
                  borderWidth: 1, borderColor: Hero.border,
                }}
              >
                <Txt variant="h2" color={Hero.text}>{item.value}</Txt>
                <Txt variant="tiny" color={Hero.textMuted}>{item.label}</Txt>
              </View>
            ))}
          </View>
        )}
      </LinearGradient>

      <View style={{ padding: Spacing.lg, paddingTop: Spacing.xxl, gap: Spacing.xl }}>
        <Card style={{ padding: Spacing.lg, gap: Spacing.sm }}>
          <Txt variant="h3">Why this exists</Txt>
          <Txt variant="body" color={Colors.text2} style={{ lineHeight: 22 }}>
            Finding the right creator usually means scrolling hashtags, guessing whether an
            account is real, and starting over for every city. Open directories fill up with
            anyone who signs up, so the search costs more than it saves.
          </Txt>
          <Txt variant="body" color={Colors.text2} style={{ lineHeight: 22 }}>
            Aura works the other way round. Creators apply, a person reviews them, and only
            approved profiles are ever shown. The list is smaller — and that is the point.
          </Txt>
        </Card>

        <Section title="For brands and businesses" items={WHY_BRANDS} />
        <Section title="For creators" items={WHY_CREATORS} />

        <View style={{ gap: Spacing.lg }}>
          <Txt variant="h2">How joining works</Txt>
          <Card style={{ padding: Spacing.lg, gap: Spacing.lg }}>
            {HOW_IT_WORKS.map((item, index) => (
              <View key={item.step} style={{ flexDirection: 'row', gap: Spacing.md }}>
                <View style={{ alignItems: 'center' }}>
                  <View
                    style={{
                      width: 26, height: 26, borderRadius: 13,
                      alignItems: 'center', justifyContent: 'center',
                      backgroundColor: Colors.violetBg,
                      borderWidth: 1, borderColor: Colors.violet500,
                    }}
                  >
                    <Txt variant="tiny" color={Colors.violet400}>{item.step}</Txt>
                  </View>
                  {index < HOW_IT_WORKS.length - 1 && (
                    <View style={{ width: 1, flex: 1, minHeight: 20, backgroundColor: Colors.line, marginTop: 4 }} />
                  )}
                </View>
                <View style={{ flex: 1, gap: 2, paddingBottom: index < HOW_IT_WORKS.length - 1 ? Spacing.sm : 0 }}>
                  <Txt variant="bodyStrong">{item.title}</Txt>
                  <Txt variant="small" color={Colors.text2} style={{ lineHeight: 19 }}>{item.body}</Txt>
                </View>
              </View>
            ))}
          </Card>
        </View>

        <Card style={{ padding: Spacing.lg, gap: Spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
            <Ionicons name="lock-closed" size={16} color={Colors.violet400} />
            <Txt variant="h3">What we show, and what we don&apos;t</Txt>
          </View>
          <Txt variant="small" color={Colors.text2} style={{ lineHeight: 20 }}>
            A public profile shows a creator&apos;s name, photo, bio, niche, city and social
            accounts. Email addresses, phone numbers and review notes are never public — they
            stay between the creator and our team.
          </Txt>
        </Card>

        <Txt variant="tiny" color={Colors.text3} center>
          Aura · Creator Network
        </Txt>
      </View>
    </ScrollView>
  );
}

function Section({ title, items }: { title: string; items: { icon: IconName; title: string; body: string }[] }) {
  const { colors: Colors } = useTheme();
  return (
    <View style={{ gap: Spacing.lg }}>
      <Txt variant="h2">{title}</Txt>
      <View style={{ gap: Spacing.lg }}>
        {items.map((item) => (
          <View key={item.title} style={{ flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start' }}>
            <View
              style={{
                width: 38, height: 38, borderRadius: Radius.md,
                backgroundColor: Colors.violetBg,
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Ionicons name={item.icon} size={18} color={Colors.violet400} />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Txt variant="bodyStrong">{item.title}</Txt>
              <Txt variant="small" color={Colors.text2} style={{ lineHeight: 20 }}>{item.body}</Txt>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
