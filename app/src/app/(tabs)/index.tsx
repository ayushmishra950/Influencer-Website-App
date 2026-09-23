import { useCallback, useState } from 'react';
import {
  Pressable, RefreshControl, ScrollView, TextInput, useWindowDimensions, View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Banner, Button, Card, Loader, Txt } from '@/components/ui';
import { Logo } from '@/components/Brand';
import { ThemeToggle } from '@/components/ThemeToggle';
import { SpotlightCard } from '@/components/SpotlightCard';
import { CategoryTile } from '@/components/CategoryTile';
import { InfluencerCard } from '@/components/InfluencerCard';
import { useLanding } from '@/hooks/useLanding';
import { Radius, Spacing, Hero } from '@/theme/tokens';
import { useTheme } from '@/context/ThemeContext';

export default function LandingScreen() {
  const { colors: Colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { stats, categories, recent, loading, error, refresh } = useLanding();

  // Coming back to this tab re-checks the directory, so a card never outlives the
  // profile behind it and taps never land on a 404.
  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const gutter = Spacing.lg;
  const tileWidth = (width - gutter * 2 - Spacing.md) / 2;

  // Empty categories would open onto an empty list, so they are not offered.
  const activeCategories = categories.filter((c) => (c.influencerCount ?? 0) > 0);

  const submitSearch = () => {
    const q = search.trim();
    router.push(q ? { pathname: '/creators', params: { q } } : '/creators');
  };

  async function onRefresh() {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  }

  if (loading) return <Loader label="Loading Aura" />;

  return (
    <ScrollView
      contentContainerStyle={{ paddingBottom: Spacing.xxl * 2 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.violet400} />
      }
    >
      {/* ---------- Hero ---------- */}
      <LinearGradient
        colors={Hero.gradient}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={{ paddingTop: insets.top + Spacing.lg, paddingBottom: Spacing.xl, paddingHorizontal: gutter, gap: Spacing.lg }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
            <Logo size={30} />
            <Txt variant="h3" color={Hero.text} style={{ fontSize: 17 }}>Aura</Txt>
          </View>

          <ThemeToggle floating />

        </View>

        <View style={{ gap: Spacing.sm, paddingTop: Spacing.sm }}>
          <Txt variant="h1" color={Hero.text} style={{ fontSize: 30, lineHeight: 37 }}>
            Find creators{'\n'}worth working with
          </Txt>
          <Txt variant="body" color={Hero.textMuted} style={{ lineHeight: 21 }}>
            Every profile on Aura is reviewed and verified by our team before it appears here.
          </Txt>
        </View>

        {/* Searching opens the full directory rather than filtering in place, so the
            landing page stays a landing page.

            The field is not itself a button: tapping it has to put the cursor in the
            input, not navigate away mid-thought. That leaves typing with no visible
            way to commit -- the on-screen "search" key is easy to miss and does
            nothing on web -- so the submit button below is the affordance. */}
        <View
          style={{
            flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
            height: 52, paddingLeft: Spacing.lg, paddingRight: 6,
            borderRadius: Radius.lg,
            backgroundColor: Hero.scrim,
            borderWidth: 1, borderColor: Hero.border,
          }}
        >
          <Ionicons name="search" size={18} color={Hero.textFaint} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={submitSearch}
            placeholder="Search creators, cities, niches"
            placeholderTextColor={Hero.textFaint}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            style={{ flex: 1, color: Hero.text, fontSize: 15 }}
          />

          {!!search && (
            <Pressable
              onPress={() => setSearch('')}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
            >
              <Ionicons name="close-circle" size={18} color={Hero.textFaint} />
            </Pressable>
          )}

          <Pressable
            onPress={submitSearch}
            accessibilityRole="button"
            accessibilityLabel={search.trim() ? `Search for ${search.trim()}` : 'Browse all creators'}
            style={({ pressed }) => ({
              flexDirection: 'row', alignItems: 'center', gap: 5,
              paddingHorizontal: Spacing.md, height: 38,
              borderRadius: Radius.md,
              backgroundColor: Hero.actionBg,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Ionicons name="arrow-forward" size={15} color={Hero.actionText} />
            <Txt variant="small" color={Hero.actionText}>
              {/* An empty box is a legitimate way in: it just opens the directory. */}
              {search.trim() ? 'Search' : 'Browse'}
            </Txt>
          </Pressable>
        </View>
      </LinearGradient>

      {!!error && (
        <View style={{ paddingHorizontal: gutter, paddingTop: Spacing.lg }}>
          <Banner tone="error" message={error} />
        </View>
      )}

      {/* ---------- Credibility strip ---------- */}
      {!!stats && (
        <View style={{ flexDirection: 'row', paddingHorizontal: gutter, marginTop: -Spacing.md, gap: Spacing.sm }}>
          {[
            { value: stats.totalCreators, label: 'Verified\ncreators' },
            { value: stats.totalCategories, label: 'Content\nniches' },
            { value: stats.totalCities, label: 'Cities\ncovered' },
          ].map((item) => (
            <Card key={item.label} style={{ flex: 1, paddingVertical: Spacing.lg, alignItems: 'center', gap: 2 }}>
              <Txt variant="h2" style={{ fontSize: 22 }}>{item.value}</Txt>
              <Txt variant="tiny" color={Colors.text3} center style={{ lineHeight: 14 }}>{item.label}</Txt>
            </Card>
          ))}
        </View>
      )}

      {/* ---------- Spotlight ---------- */}
      {!!stats?.spotlight.length && (
        <View style={{ marginTop: Spacing.xxl, gap: Spacing.lg }}>
          <SectionHeader
            title="Spotlight"
            subtitle="Recently verified"
            gutter={gutter}
            onPress={() => router.push('/creators')}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: gutter, gap: Spacing.md }}
            snapToInterval={232 + Spacing.md}
            decelerationRate="fast"
          >
            {stats.spotlight.map((influencer) => (
              <SpotlightCard key={influencer._id} influencer={influencer} />
            ))}
          </ScrollView>
        </View>
      )}

      {/* ---------- Categories ---------- */}
      {activeCategories.length > 0 && (
        <View style={{ marginTop: Spacing.xxl, gap: Spacing.lg }}>
          <SectionHeader title="Browse by niche" subtitle={`${activeCategories.length} categories`} gutter={gutter} />
          <View
            style={{
              flexDirection: 'row', flexWrap: 'wrap',
              gap: Spacing.md, paddingHorizontal: gutter,
            }}
          >
            {activeCategories.map((category) => (
              <CategoryTile key={category._id} category={category} width={tileWidth} />
            ))}
          </View>
        </View>
      )}

      {/* ---------- Newest ---------- */}
      {recent.length > 0 && (
        <View style={{ marginTop: Spacing.xxl, gap: Spacing.lg }}>
          <SectionHeader
            title="Newest on Aura"
            subtitle="Just approved"
            gutter={gutter}
            onPress={() => router.push('/creators')}
          />
          <View style={{ paddingHorizontal: gutter, gap: Spacing.md }}>
            {recent.map((influencer) => (
              <InfluencerCard key={influencer._id} influencer={influencer} />
            ))}
          </View>

          <View style={{ paddingHorizontal: gutter }}>
            <Button
              label="Browse all creators"
              variant="ghost"
              onPress={() => router.push('/creators')}
              icon={<Ionicons name="grid-outline" size={16} color={Colors.text} />}
            />
          </View>
        </View>
      )}

      {/* ---------- About ---------- */}
      <View style={{ paddingHorizontal: gutter, marginTop: Spacing.xxl }}>
        <Pressable onPress={() => router.push('/about')} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
          <Card style={{ padding: Spacing.lg, flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
            <View
              style={{
                width: 40, height: 40, borderRadius: Radius.md,
                backgroundColor: Colors.violetBg,
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Ionicons name="information-circle-outline" size={20} color={Colors.violet400} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Txt variant="bodyStrong">What is Aura?</Txt>
              <Txt variant="small" color={Colors.text2} style={{ lineHeight: 18 }}>
                Why the directory is verified, and how joining works.
              </Txt>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.text3} />
          </Card>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function SectionHeader({
  title, subtitle, gutter, onPress,
}: { title: string; subtitle?: string; gutter: number; onPress?: () => void }) {
  const { colors: Colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row', alignItems: 'flex-end',
        justifyContent: 'space-between', paddingHorizontal: gutter,
      }}
    >
      <View style={{ gap: 1 }}>
        <Txt variant="h2">{title}</Txt>
        {!!subtitle && <Txt variant="small" color={Colors.text3}>{subtitle}</Txt>}
      </View>
      {onPress && (
        <Pressable onPress={onPress} hitSlop={10} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            <Txt variant="small" color={Colors.violet400}>See all</Txt>
            <Ionicons name="chevron-forward" size={14} color={Colors.violet400} />
          </View>
        </Pressable>
      )}
    </View>
  );
}
