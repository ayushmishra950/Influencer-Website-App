import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { Avatar, Card, Chip, Txt } from './ui';
import { useTheme } from '@/context/ThemeContext';
import { Radius, Spacing } from '@/theme/tokens';
import { formatMonthYear, locationLine, socialHandle } from '@/lib/format';
import type { DirectoryInfluencer } from '@/lib/types';

export function InfluencerCard({ influencer }: { influencer: DirectoryInfluencer }) {
  const { colors: Colors } = useTheme();

  const instagram = socialHandle(influencer.social?.instagram);
  const youtube = socialHandle(influencer.social?.youtube);

  return (
    <Link href={{ pathname: '/influencer/[id]', params: { id: influencer._id } }} asChild>
      <Pressable style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
        <Card style={{ padding: Spacing.lg, gap: Spacing.md }}>
          <View style={{ flexDirection: 'row', gap: Spacing.md, alignItems: 'center' }}>
            <Avatar name={influencer.name} src={influencer.profileImage} size={54} />

            <View style={{ flex: 1, gap: 3 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                <Txt variant="bodyStrong" numberOfLines={1} style={{ flexShrink: 1 }}>
                  {influencer.name}
                </Txt>
                <Ionicons name="checkmark-circle" size={14} color={Colors.mint400} />
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="location-outline" size={12} color={Colors.text3} />
                <Txt variant="small" color={Colors.text3} numberOfLines={1} style={{ flexShrink: 1 }}>
                  {locationLine(influencer.location)}
                </Txt>
              </View>

              {!!influencer.category && (
                <View style={{ flexDirection: 'row', marginTop: 4 }}>
                  <Chip label={influencer.category.name} />
                </View>
              )}
            </View>
          </View>

          {!!influencer.bio && (
            <Txt variant="small" color={Colors.text2} numberOfLines={2} style={{ lineHeight: 19 }}>
              {influencer.bio}
            </Txt>
          )}

          {/* The handles themselves, not just platform icons — it tells you who you are
              about to look up before you tap through. */}
          {(instagram || youtube) && (
            <View style={{ gap: 6 }}>
              {!!instagram && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="logo-instagram" size={14} color={Colors.violet400} />
                  <Txt variant="small" color={Colors.text2} numberOfLines={1}>{instagram}</Txt>
                </View>
              )}
              {!!youtube && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="logo-youtube" size={14} color={Colors.rose400} />
                  <Txt variant="small" color={Colors.text2} numberOfLines={1}>{youtube}</Txt>
                </View>
              )}
            </View>
          )}

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: Spacing.sm,
              borderTopWidth: 1,
              borderTopColor: Colors.line,
            }}
          >
            <Txt variant="tiny" color={Colors.text3}>
              On Aura since {formatMonthYear(influencer.createdAt)}
            </Txt>
            <View
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 3,
                paddingHorizontal: 8, paddingVertical: 3,
                borderRadius: Radius.full, backgroundColor: Colors.mintBg,
              }}
            >
              <Ionicons name="shield-checkmark" size={11} color={Colors.mint400} />
              <Txt variant="tiny" color={Colors.mint400}>Verified</Txt>
            </View>
          </View>
        </Card>
      </Pressable>
    </Link>
  );
}
