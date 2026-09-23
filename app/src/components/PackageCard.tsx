import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, Txt } from './ui';
import { useTheme } from '@/context/ThemeContext';
import { Radius, Spacing } from '@/theme/tokens';
import { deliveryLabel, formatPrice } from '@/lib/format';
import type { Package, PublicPackage } from '@/lib/types';

interface PackageCardProps {
  /** A public viewer sees no status; the owner sees everything. */
  item: Package | PublicPackage;
  /**
   * Whether the owner's profile is itself public. An approved package on a profile
   * that is pending or archived is not visible to anybody, and saying "Live on your
   * profile" there would be a lie.
   */
  profileIsPublic?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

const isOwned = (item: Package | PublicPackage): item is Package => 'status' in item;

export function PackageCard({ item, profileIsPublic = true, onEdit, onDelete }: PackageCardProps) {
  const { colors: Colors, statusStyle } = useTheme();
  const owned = isOwned(item);
  const approvedButHidden = owned && item.status === 'approved' && !profileIsPublic;
  const tone = owned
    ? approvedButHidden
      ? statusStyle.archived
      : statusStyle[item.status]
    : null;
  const delivery = deliveryLabel(item.deliveryDays);

  return (
    <Card style={{ padding: Spacing.lg, gap: Spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md }}>
        <View style={{ flex: 1, gap: 3 }}>
          <Txt variant="bodyStrong" numberOfLines={2}>{item.title}</Txt>
          {!!delivery && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="time-outline" size={12} color={Colors.text3} />
              <Txt variant="tiny" color={Colors.text3}>{delivery}</Txt>
            </View>
          )}
        </View>

        <Txt variant="h3" color={Colors.violet400}>
          {formatPrice(item.price, item.currency)}
        </Txt>
      </View>

      {!!item.description && (
        <Txt variant="small" color={Colors.text2} style={{ lineHeight: 19 }}>
          {item.description}
        </Txt>
      )}

      {/* Only the owner sees review state, and why a package is not live. */}
      {owned && tone && (
        <View style={{ gap: Spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
            <View
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 5,
                paddingHorizontal: 9, paddingVertical: 4,
                borderRadius: Radius.full, backgroundColor: tone.bg,
              }}
            >
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: tone.color }} />
              <Txt variant="tiny" color={tone.color}>
                {approvedButHidden
                  ? 'Approved · not public yet'
                  : item.status === 'approved'
                    ? 'Live on your profile'
                    : tone.label}
              </Txt>
            </View>

            <View style={{ flex: 1 }} />

            {!!onEdit && (
              <Pressable onPress={onEdit} hitSlop={8} accessibilityLabel={`Edit ${item.title}`}>
                <Ionicons name="create-outline" size={18} color={Colors.text2} />
              </Pressable>
            )}
            {!!onDelete && (
              <Pressable onPress={onDelete} hitSlop={8} accessibilityLabel={`Delete ${item.title}`}>
                <Ionicons name="trash-outline" size={18} color={Colors.rose400} />
              </Pressable>
            )}
          </View>

          {item.status === 'rejected' && !!item.rejectionReason && (
            <Txt variant="small" color={Colors.rose400} style={{ lineHeight: 18 }}>
              {item.rejectionReason}
            </Txt>
          )}
          {item.status === 'pending' && (
            <Txt variant="tiny" color={Colors.text3} style={{ lineHeight: 16 }}>
              Not shown publicly until an administrator approves it.
            </Txt>
          )}
          {approvedButHidden && (
            <Txt variant="tiny" color={Colors.text3} style={{ lineHeight: 16 }}>
              This package is approved, but your profile is not in the public directory
              yet — so nobody can see it.
            </Txt>
          )}
        </View>
      )}
    </Card>
  );
}
