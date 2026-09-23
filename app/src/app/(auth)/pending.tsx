import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Card, Txt } from '@/components/ui';
import { Logo } from '@/components/Brand';
import { Radius, Spacing } from '@/theme/tokens';
import { useTheme } from '@/context/ThemeContext';

const STEPS = [
  { title: 'Registration received', detail: 'Your details are with our verification team.', done: true },
  { title: 'Profile review', detail: 'We check your social accounts and category.', done: false },
  { title: 'Approved', detail: 'You can sign in and appear in the directory.', done: false },
];

export default function PendingScreen() {
  const { colors: Colors } = useTheme();
  const router = useRouter();

  return (
    <View style={{ flex: 1, padding: Spacing.xl, gap: Spacing.xl, justifyContent: 'center' }}>
      <View style={{ alignItems: 'center', gap: Spacing.lg }}>
        <Logo size={56} />
        <Txt variant="h1" center>You&apos;re on the list</Txt>
        <Txt variant="body" color={Colors.text2} center style={{ maxWidth: 300, lineHeight: 21 }}>
          Your registration is under review. We&apos;ll let you know by email as soon as it&apos;s approved.
        </Txt>
      </View>

      <Card style={{ padding: Spacing.xl, gap: Spacing.lg }}>
        {STEPS.map((step, index) => (
          <View key={step.title} style={{ flexDirection: 'row', gap: Spacing.md }}>
            <View style={{ alignItems: 'center' }}>
              <View
                style={{
                  width: 22, height: 22, borderRadius: 11,
                  alignItems: 'center', justifyContent: 'center',
                  backgroundColor: step.done ? Colors.mintBg : Colors.ink800,
                  borderWidth: 1,
                  borderColor: step.done ? Colors.mint400 : Colors.line,
                }}
              >
                <Txt variant="tiny" color={step.done ? Colors.mint400 : Colors.text3}>
                  {step.done ? '✓' : index + 1}
                </Txt>
              </View>
              {index < STEPS.length - 1 && (
                <View style={{ width: 1, flex: 1, minHeight: 22, backgroundColor: Colors.line, marginTop: 4 }} />
              )}
            </View>

            <View style={{ flex: 1, gap: 2, paddingBottom: index < STEPS.length - 1 ? Spacing.sm : 0 }}>
              <Txt variant="bodyStrong" color={step.done ? Colors.text : Colors.text2}>{step.title}</Txt>
              <Txt variant="small" color={Colors.text3} style={{ lineHeight: 18 }}>{step.detail}</Txt>
            </View>
          </View>
        ))}
      </Card>

      <View style={{ gap: Spacing.md }}>
        <Button label="Browse creators" onPress={() => router.replace('/(tabs)')} />
        <Button label="Back to sign in" variant="ghost" onPress={() => router.replace('/(auth)/login')} />
      </View>
    </View>
  );
}
