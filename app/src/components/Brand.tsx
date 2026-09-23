import { LinearGradient } from 'expo-linear-gradient';
import { View } from 'react-native';
import { Spacing } from '@/theme/tokens';
import { Txt } from './ui';
import { useTheme } from '@/context/ThemeContext';

/** The Aura mark: a violet ring with a gold core. */
export function Logo({ size = 40 }: { size?: number }) {
  const { colors: Colors, gradients: Gradients } = useTheme();
  const ring = size * 0.12;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: ring,
        borderColor: Colors.violet500,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <LinearGradient
        colors={Gradients.gold}
        style={{ width: size * 0.32, height: size * 0.32, borderRadius: size * 0.16 }}
      />
    </View>
  );
}

export function Wordmark({ size = 34 }: { size?: number }) {
  const { colors: Colors, gradients: Gradients } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
      <Logo size={size} />
      <View style={{ gap: 1 }}>
        <Txt variant="h3" style={{ fontSize: size * 0.46 }}>Aura</Txt>
        <Txt variant="tiny" color={Colors.text3} style={{ textTransform: 'uppercase' }}>
          Creator Network
        </Txt>
      </View>
    </View>
  );
}
