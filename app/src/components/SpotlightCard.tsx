import { Pressable, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { Avatar, Txt } from './ui';
import { categoryAccent } from '@/lib/categoryIcon';
import { formatMonthYear, locationLine, socialHandle } from '@/lib/format';
import { Radius, Spacing } from '@/theme/tokens';
import type { DirectoryInfluencer } from '@/lib/types';
import { useTheme } from '@/context/ThemeContext';

/**
 * The large, image-forward card used in the landing carousel.
 * Deliberately different from the list row so the page has a visual hierarchy
 * instead of one repeated shape all the way down.
 */
export function SpotlightCard({ influencer }: { influencer: DirectoryInfluencer }) {
  const { colors: Colors, theme } = useTheme();
  const accent = categoryAccent(influencer.category?.name ?? influencer.name, theme);
  // Light mode stacks three translucent layers — card tint, chip tint, white surface —
  // and each one lifts the background a little. Halving the tints keeps the accent
  // visible as decoration without eating the label's contrast.
  const cardTint = theme === 'light' ? '14' : '26';
  const chipTint = theme === 'light' ? '14' : '22';
  const instagram = socialHandle(influencer.social?.instagram);
  const youtube = socialHandle(influencer.social?.youtube);
  const primaryHandle = instagram ?? youtube;

  return (
    <Link href={{ pathname: '/influencer/[id]', params: { id: influencer._id } }} asChild>
      <Pressable style={({ pressed }) => ({ opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.985 : 1 }] })}>
        <LinearGradient
          colors={[accent + cardTint, Colors.ink850]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={{
            width: 232,
            padding: Spacing.lg,
            borderRadius: Radius.xl,
            borderWidth: 1,
            borderColor: accent + (theme === 'light' ? '28' : '33'),
            gap: Spacing.md,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Avatar name={influencer.name} src={influencer.profileImage} size={56} />
            <View
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 4,
                paddingHorizontal: 8, paddingVertical: 4,
                borderRadius: Radius.full, backgroundColor: Colors.ink950,
              }}
            >
              <Ionicons name="checkmark-circle" size={12} color={Colors.mint400} />
              <Txt variant="tiny" color={Colors.mint400}>Verified</Txt>
            </View>
          </View>

          <View style={{ gap: 2 }}>
            <Txt variant="bodyStrong" numberOfLines={1}>{influencer.name}</Txt>
            {!!primaryHandle && (
              <Txt variant="small" color={accent} numberOfLines={1}>{primaryHandle}</Txt>
            )}
            {/* text2, not text3: this card sits on an accent tint, which lifts the
                background enough that the faintest step drops under 4.5:1. */}
            <Txt variant="tiny" color={Colors.text2} numberOfLines={1}>
              {locationLine(influencer.location)}
            </Txt>
          </View>

          <Txt variant="small" color={Colors.text2} numberOfLines={2} style={{ lineHeight: 18, minHeight: 36 }}>
            {influencer.bio || 'Creator on the Aura network.'}
          </Txt>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
            <View
              style={{
                paddingHorizontal: 10, paddingVertical: 4,
                borderRadius: Radius.full, backgroundColor: accent + chipTint,
              }}
            >
              <Txt variant="tiny" color={accent}>{influencer.category?.name ?? 'Creator'}</Txt>
            </View>
            <View style={{ flexDirection: 'row', gap: 6, marginLeft: 'auto' }}>
              {!!instagram && <Ionicons name="logo-instagram" size={15} color={Colors.text3} />}
              {!!youtube && <Ionicons name="logo-youtube" size={15} color={Colors.text3} />}
            </View>
          </View>

          <Txt variant="tiny" color={Colors.text3}>
            On Aura since {formatMonthYear(influencer.createdAt)}
          </Txt>
        </LinearGradient>
      </Pressable>
    </Link>
  );
}
