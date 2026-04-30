import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import { useTheme } from '@design/ThemeProvider';
import { radius, shadows, spacing } from '@design/tokens';

export function Card({ style, children, ...rest }: ViewProps) {
  const { theme } = useTheme();
  return (
    <View
      {...rest}
      style={[
        styles.card,
        { backgroundColor: theme.surface, borderColor: theme.border },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    ...shadows.card,
  },
});
