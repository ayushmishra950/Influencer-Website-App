import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useNavigation } from 'expo-router';
import { Banner, Button, EmptyState, Loader, Txt } from '@/components/ui';
import { InfluencerCard } from '@/components/InfluencerCard';
import { CategoryPicker } from '@/components/CategoryPicker';
import { useCategories } from '@/hooks/useCategories';
import { useDirectory, EMPTY_FILTERS } from '@/hooks/useDirectory';
import { Radius, Spacing } from '@/theme/tokens';
import type { DirectoryFilters } from '@/lib/types';
import { useTheme } from '@/context/ThemeContext';

function useDebounced<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

/**
 * The full, filterable directory.
 *
 * Split out of the landing page so that page can stay curated. It opens pre-filtered
 * when reached from a category tile or the hero search box.
 */
export default function CreatorsScreen() {
  const { colors: Colors } = useTheme();
  const params = useLocalSearchParams<{ q?: string; category?: string }>();
  const navigation = useNavigation();
  const { categories } = useCategories();

  const [search, setSearch] = useState(params.q ?? '');
  const [category, setCategory] = useState(params.category ?? '');
  const debouncedSearch = useDebounced(search);

  const filters = useMemo<DirectoryFilters>(
    () => ({ ...EMPTY_FILTERS, q: debouncedSearch, category }),
    [debouncedSearch, category],
  );

  const { items, meta, loading, loadingMore, refreshing, error, loadMore, refresh } = useDirectory(filters);

  // Same reason as the landing page: returning here re-checks who is still listed.
  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  // Name the header after the category the user actually tapped.
  useEffect(() => {
    const active = categories.find((c) => c._id === category);
    navigation.setOptions({ title: active ? active.name : 'All creators' });
  }, [category, categories, navigation]);

  const hasFilters = !!debouncedSearch || !!category;

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item._id}
      renderItem={({ item }) => <InfluencerCard influencer={item} />}
      contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xxl, flexGrow: 1 }}
      keyboardShouldPersistTaps="handled"
      onEndReached={loadMore}
      onEndReachedThreshold={0.5}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.violet400} />
      }
      ListHeaderComponent={
        <View style={{ gap: Spacing.lg, marginBottom: Spacing.xs }}>
          <View
            style={{
              flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
              height: 48, paddingHorizontal: Spacing.lg,
              backgroundColor: Colors.ink950,
              borderWidth: 1, borderColor: Colors.line, borderRadius: Radius.md,
            }}
          >
            <Ionicons name="search" size={17} color={Colors.text3} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search by name, bio or city"
              placeholderTextColor={Colors.text3}
              autoCapitalize="none"
              returnKeyType="search"
              style={{ flex: 1, color: Colors.text, fontSize: 15 }}
            />
            {!!search && (
              <Ionicons name="close-circle" size={17} color={Colors.text3} onPress={() => setSearch('')} />
            )}
          </View>

          <CategoryPicker categories={categories} value={category} onChange={setCategory} label="" allowAll />

          <Txt variant="small" color={Colors.text3}>
            {meta
              ? hasFilters
                ? `${meta.total} ${meta.total === 1 ? 'creator matches' : 'creators match'} your filters`
                : `${meta.total} ${meta.total === 1 ? 'creator' : 'creators'}`
              : 'Loading…'}
          </Txt>

          {!!error && <Banner tone="error" message={error} />}
        </View>
      }
      ListEmptyComponent={
        loading ? (
          <Loader label="Finding creators" />
        ) : error ? (
          <EmptyState
            title="Could not load creators"
            description={error}
            action={<Button label="Try again" variant="ghost" onPress={refresh} />}
          />
        ) : (
          <EmptyState
            title="No creators found"
            description={
              hasFilters
                ? 'Try a different search term or category.'
                : 'Once influencers are approved they will appear here.'
            }
            action={
              hasFilters ? (
                <Button
                  label="Clear filters"
                  variant="ghost"
                  onPress={() => { setSearch(''); setCategory(''); }}
                />
              ) : undefined
            }
          />
        )
      }
      ListFooterComponent={
        loadingMore ? (
          <View style={{ paddingVertical: Spacing.xl }}>
            <ActivityIndicator color={Colors.violet400} />
          </View>
        ) : items.length > 0 && !meta?.hasMore ? (
          <Txt variant="small" color={Colors.text3} center style={{ paddingVertical: Spacing.xl }}>
            That&apos;s everyone for now
          </Txt>
        ) : null
      }
    />
  );
}
