import { ScrollView, View } from 'react-native';
import { Chip, Txt } from './ui';
import { Spacing } from '@/theme/tokens';
import type { Category } from '@/lib/types';
import { useTheme } from '@/context/ThemeContext';

interface CategoryPickerProps {
  categories: Category[];
  value: string;
  onChange: (id: string) => void;
  label?: string;
  error?: string;
  /** Adds an "All" chip that clears the selection — used by the directory filter. */
  allowAll?: boolean;
}

export function CategoryPicker({
  categories, value, onChange, label = 'Category', error, allowAll,
}: CategoryPickerProps) {
  const { colors: Colors } = useTheme();
  return (
    <View style={{ gap: Spacing.sm }}>
      {!!label && (
        <Txt variant="small" color={Colors.text2}>
          {label}
          {!allowAll && <Txt variant="small" color={Colors.rose400}> *</Txt>}
        </Txt>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: Spacing.sm, paddingRight: Spacing.lg }}
      >
        {allowAll && <Chip label="All" active={value === ''} onPress={() => onChange('')} />}
        {categories.map((category) => (
          <Chip
            key={category._id}
            label={category.name}
            active={value === category._id}
            onPress={() => onChange(category._id)}
          />
        ))}
      </ScrollView>

      {!!error && <Txt variant="small" color={Colors.rose400}>{error}</Txt>}
    </View>
  );
}
