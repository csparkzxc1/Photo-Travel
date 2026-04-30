import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@design/ThemeProvider';
import { radius, spacing, typography } from '@design/tokens';

interface PillProps {
  label: string;
  active?: boolean;
  onPress?: () => void;
}

export function Pill({ label, active, onPress }: PillProps) {
  const { theme } = useTheme();
  const Wrapper: typeof View | typeof Pressable = onPress ? Pressable : View;
  return (
    <Wrapper
      onPress={onPress}
      style={[
        styles.base,
        {
          backgroundColor: active ? theme.primary : theme.bgAlt,
          borderColor: active ? theme.primary : theme.border,
        },
      ]}
    >
      <Text
        style={[
          styles.label,
          { color: active ? '#fff' : theme.text },
        ]}
      >
        {label}
      </Text>
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    marginRight: spacing.sm,
  },
  label: {
    ...typography.caption,
    fontWeight: '600',
  },
});
