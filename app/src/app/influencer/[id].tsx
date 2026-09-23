import { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, Button, Card, Chip, EmptyState, Loader, Txt } from '@/components/ui';
import { PackageCard } from '@/components/PackageCard';
import { ApiError, request } from '@/lib/api';
import { formatDate, locationLine, socialUrl } from '@/lib/format';
import { Radius, Spacing, Hero } from '@/theme/tokens';
import type { DirectoryInfluencer, PublicPackage } from '@/lib/types';
import { useTheme } from '@/context/ThemeContext';

export default function InfluencerDetailScreen() {
  const { colors: Colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [influencer, setInfluencer] = useState<DirectoryInfluencer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  /** 404 means "not in the directory", which is a different story to a network failure. */
  const [gone, setGone] = useState(false);
  const [packages, setPackages] = useState<PublicPackage[]>([]);

  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();

    request<{ data: DirectoryInfluencer }>(`/api/public/influencers/${id}`, {
      auth: false,
      signal: controller.signal,
    })
      .then(({ data }) => setInfluencer(data))
      .catch((err: Error) => {
        if (err.name === 'AbortError') return;
        if (err instanceof ApiError && err.status === 404) setGone(true);
        else setError(err.message);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [id]);

  /**
   * Approved packages only — the endpoint never returns the rest. A failure here just
   * hides the section rather than breaking the profile.
   *
   * Re-run on focus, not only on mount: this screen stays alive in the stack, so a
   * package approved while the viewer was elsewhere would otherwise never appear.
   */
  const loadPackages = useCallback(() => {
    if (!id) return undefined;
    const controller = new AbortController();
    request<{ data: PublicPackage[] }>(`/api/public/influencers/${id}/packages`, {
      auth: false,
      signal: controller.signal,
    })
      .then(({ data }) => setPackages(data))
      .catch(() => undefined);
    return () => controller.abort();
  }, [id]);

  useFocusEffect(loadPackages);

  if (loading) return <Loader label="Loading profile" />;

  if (gone || error || !influencer) {
    // A card can outlive the profile behind it: an admin archives or rejects someone
    // while the directory is still on screen. Say which of the two happened, and give
    // a way back rather than a dead end.
    return (
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <EmptyState
          title={gone ? 'No longer listed' : 'Could not load this profile'}
          description={
            gone
              ? 'This creator has been removed from the directory, so their profile is not public any more.'
              : error
          }
          action={
            <Button
              label="Back to creators"
              variant="ghost"
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
            />
          }
        />
      </View>
    );
  }

  const instagram = socialUrl('instagram', influencer.social?.instagram);
  const youtube = socialUrl('youtube', influencer.social?.youtube);

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: Spacing.xxl * 2 }}>
      {/* Brand wash behind the avatar, so the header reads as part of the product. */}
      <LinearGradient
        colors={Hero.gradient}
        style={{ paddingTop: insets.top + 56, paddingBottom: Spacing.xl, alignItems: 'center', gap: Spacing.md }}
      >
        <Avatar name={influencer.name} src={influencer.profileImage} size={104} onHero />
        <View style={{ alignItems: 'center', gap: Spacing.sm }}>
          <Txt variant="h1" color={Hero.text} center>{influencer.name}</Txt>
          <Txt variant="small" color={Hero.textMuted}>{locationLine(influencer.location)}</Txt>
          {/* Hero colours, not theme colours: the default violet-on-violet-tint chip
              all but vanishes against this gradient. */}
          {!!influencer.category && (
            <Chip label={influencer.category.name} color={Hero.text} bg={Hero.scrim} />
          )}
        </View>
      </LinearGradient>

      <View style={{ padding: Spacing.lg, gap: Spacing.lg }}>
        {!!influencer.bio && (
          <Card style={{ padding: Spacing.lg, gap: Spacing.sm }}>
            <Txt variant="h3">About</Txt>
            <Txt variant="body" color={Colors.text2} style={{ lineHeight: 22 }}>{influencer.bio}</Txt>
          </Card>
        )}

        <Card style={{ padding: Spacing.lg, gap: Spacing.md }}>
          <Txt variant="h3">Social accounts</Txt>

          {!instagram && !youtube ? (
            <Txt variant="small" color={Colors.text3}>No public accounts listed.</Txt>
          ) : (
            <View style={{ gap: Spacing.sm }}>
              {instagram && (
                <SocialRow
                  label="Instagram"
                  handle={influencer.social.instagram}
                  color={Colors.violet300}
                  bg={Colors.violetBg}
                  onPress={() => void Linking.openURL(instagram)}
                />
              )}
              {youtube && (
                <SocialRow
                  label="YouTube"
                  handle={influencer.social.youtube}
                  color={Colors.rose400}
                  bg={Colors.roseBg}
                  onPress={() => void Linking.openURL(youtube)}
                />
              )}
            </View>
          )}
        </Card>

        {packages.length > 0 && (
          <View style={{ gap: Spacing.md }}>
            <View style={{ gap: 2 }}>
              <Txt variant="h3">Packages</Txt>
              <Txt variant="small" color={Colors.text3}>
                Reviewed prices, straight from {influencer.name.split(' ')[0]}
              </Txt>
            </View>
            {packages.map((item) => (
              <PackageCard key={item._id} item={item} />
            ))}
          </View>
        )}

        <Card style={{ padding: Spacing.lg, gap: Spacing.md }}>
          <Txt variant="h3">Details</Txt>
          <DetailRow label="Category" value={influencer.category?.name ?? '—'} />
          <DetailRow label="Country" value={influencer.location?.country ?? '—'} />
          <DetailRow label="State" value={influencer.location?.state ?? '—'} />
          <DetailRow label="City" value={influencer.location?.city ?? '—'} />
          <DetailRow label="On Aura since" value={formatDate(influencer.createdAt)} />
        </Card>

        <Card style={{ padding: Spacing.lg, gap: Spacing.md, alignItems: 'center' }}>
          <Txt variant="bodyStrong" center>Want to collaborate?</Txt>
          <Txt variant="small" color={Colors.text2} center style={{ lineHeight: 19 }}>
            Reach out through their social accounts above.
          </Txt>
          {instagram && (
            <Button label="Open Instagram" onPress={() => void Linking.openURL(instagram)} style={{ alignSelf: 'stretch' }} />
          )}
        </Card>
      </View>
    </ScrollView>
  );
}

function SocialRow({
  label, handle, color, bg, onPress,
}: { label: string; handle: string; color: string; bg: string; onPress: () => void }) {
  const { colors: Colors } = useTheme();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: Spacing.md,
          padding: Spacing.md,
          borderRadius: Radius.md,
          backgroundColor: Colors.ink950,
          borderWidth: 1,
          borderColor: Colors.line,
        }}
      >
        <View style={{ width: 36, height: 36, borderRadius: Radius.md, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
          <Txt variant="bodyStrong" color={color}>{label[0]}</Txt>
        </View>
        <View style={{ flex: 1, gap: 1 }}>
          <Txt variant="bodyStrong">{label}</Txt>
          <Txt variant="small" color={Colors.text3} numberOfLines={1}>{handle}</Txt>
        </View>
        <Txt variant="small" color={Colors.text3}>Open ›</Txt>
      </View>
    </Pressable>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  const { colors: Colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: Spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: Colors.line,
      }}
    >
      <Txt variant="small" color={Colors.text3}>{label}</Txt>
      <Txt variant="small">{value}</Txt>
    </View>
  );
}
