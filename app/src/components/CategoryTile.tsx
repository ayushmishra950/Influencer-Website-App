import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Txt } from './ui';
import { categoryAccent, categoryIcon } from '@/lib/categoryIcon';
import { Radius, Spacing } from '@/theme/tokens';
import type { Category } from '@/lib/types';
import { useTheme } from '@/context/ThemeContext';

interface CategoryTileProps {
  category: Category & { influencerCount?: number };
  width: number;
}

export function CategoryTile({ category, width }: CategoryTileProps) {
  const { colors: Colors, theme } = useTheme();
  const router = useRouter();
  const accent = categoryAccent(category.name, theme);
  const count = category.influencerCount ?? 0;

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/creators', params: { category: category._id } })}
      style={({ pressed }) => ({ width, opacity: pressed ? 0.8 : 1 })}
    >
      <View
        style={{
          padding: Spacing.lg,
          borderRadius: Radius.lg,
          backgroundColor: Colors.ink850,
          borderWidth: 1,
          borderColor: Colors.line,
          gap: Spacing.md,
        }}
      >
        <View
          style={{
            width: 40, height: 40, borderRadius: Radius.md,
            backgroundColor: accent + '1f',
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Ionicons name={categoryIcon(category.icon)} size={19} color={accent} />
        </View>

        <View style={{ gap: 1 }}>
          <Txt variant="bodyStrong" numberOfLines={1}>{category.name}</Txt>
          <Txt variant="small" color={Colors.text3}>
            {count === 0 ? 'No creators yet' : `${count} creator${count === 1 ? '' : 's'}`}
          </Txt>
        </View>
      </View>
    </Pressable>
  );
}
