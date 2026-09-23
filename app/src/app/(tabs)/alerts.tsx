import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card, EmptyState, Loader, Txt } from '@/components/ui';
import { useNotifications } from '@/context/NotificationContext';
import { ThemeToggle } from '@/components/ThemeToggle';
import { formatDate } from '@/lib/format';
import { Radius, Spacing, type Palette } from '@/theme/tokens';
import { useTheme } from '@/context/ThemeContext';
import type { AppNotification } from '@/lib/socket';

/** Icon + colour per event type, so the list is scannable at a glance. */
const toneFor = (Colors: Palette): Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }> => ({
  'profile.approved': { icon: 'checkmark-circle', color: Colors.mint400, bg: Colors.mintBg },
  'profile.restored': { icon: 'refresh-circle', color: Colors.mint400, bg: Colors.mintBg },
  'profile.rejected': { icon: 'close-circle', color: Colors.rose400, bg: Colors.roseBg },
  'profile.deleted': { icon: 'trash', color: Colors.rose400, bg: Colors.roseBg },
  'profile.archived': { icon: 'archive', color: Colors.slate400, bg: Colors.slateBg },
  'profile.updated': { icon: 'create', color: Colors.violet400, bg: Colors.violetBg },
  'influencer.registered': { icon: 'person-add', color: Colors.amber400, bg: Colors.amberBg },
});

export default function AlertsScreen() {
  const { colors: Colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { notifications, unread, loading, refresh, markRead, markAllRead } = useNotifications();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refresh();
    } catch {
      // The pull gesture already gave feedback; a failed refresh keeps the old list.
    } finally {
      setRefreshing(false);
    }
  }, [refresh]);

  return (
    <FlatList
      data={notifications}
      keyExtractor={(item) => item._id}
      contentContainerStyle={{
        padding: Spacing.lg,
        paddingTop: insets.top + Spacing.lg,
        gap: Spacing.md,
        paddingBottom: Spacing.xxl,
        flexGrow: 1,
      }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.violet400} />
      }
      ListHeaderComponent={
        <View style={{ gap: Spacing.xs, marginBottom: Spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Txt variant="h1">Updates</Txt>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
              {unread > 0 && (
                <Pressable onPress={() => void markAllRead()} hitSlop={8}>
                  <Txt variant="small" color={Colors.violet400}>Mark all read</Txt>
                </Pressable>
              )}
              <ThemeToggle />
            </View>
          </View>
          <Txt variant="small" color={Colors.text2}>
            {unread > 0 ? `${unread} unread` : 'Everything about your profile lands here'}
          </Txt>
        </View>
      }
      ListEmptyComponent={
        loading && notifications.length === 0 ? (
          <Loader label="Loading updates" />
        ) : (
          <EmptyState
            title="No updates yet"
            description="When an administrator reviews or changes your profile, you will see it here straight away."
          />
        )
      }
      renderItem={({ item }) => <NotificationRow item={item} onPress={() => void markRead(item._id).catch(() => undefined)} />}
    />
  );
}

function NotificationRow({ item, onPress }: { item: AppNotification; onPress: () => void }) {
  const { colors: Colors } = useTheme();
  const TONE = toneFor(Colors);
  const tone = TONE[item.type] ?? { icon: 'notifications' as const, color: Colors.violet400, bg: Colors.violetBg };

  return (
    <Pressable onPress={item.read ? undefined : onPress} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
      <Card
        style={{
          padding: Spacing.lg,
          flexDirection: 'row',
          gap: Spacing.md,
          borderColor: item.read ? Colors.line : 'rgba(124,92,252,0.35)',
        }}
      >
        <View
          style={{
            width: 38, height: 38, borderRadius: Radius.md,
            backgroundColor: tone.bg, alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Ionicons name={tone.icon} size={18} color={tone.color} />
        </View>

        <View style={{ flex: 1, gap: 3 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
            <Txt variant="bodyStrong" style={{ flex: 1 }}>{item.title}</Txt>
            {!item.read && (
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.violet400 }} />
            )}
          </View>
          <Txt variant="small" color={Colors.text2} style={{ lineHeight: 19 }}>{item.body}</Txt>
          <Txt variant="tiny" color={Colors.text3}>{formatDate(item.createdAt)}</Txt>
        </View>
      </Card>
    </Pressable>
  );
}
