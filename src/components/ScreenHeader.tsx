import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@design/ThemeProvider';
import { spacing, typography } from '@design/tokens';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}

export function ScreenHeader({ title, subtitle, right }: ScreenHeaderProps) {
  const { theme } = useTheme();
  return (
    <View style={styles.row}>
      <View style={styles.text}>
        <Text style={[typography.title, { color: theme.text }]}>{title}</Text>
        {subtitle ? (
          <Text style={[typography.caption, { color: theme.textMuted, marginTop: 2 }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  text: { flex: 1 },
});
