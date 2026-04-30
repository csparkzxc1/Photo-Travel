import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@design/ThemeProvider';
import { radius, spacing, typography } from '@design/tokens';
import { useAppStore } from '@data/store';

interface Props {
  /** Banner / interstitial / native — affects sizing only in this stub. */
  variant?: 'banner';
  /** Optional CTA shown when an ad would be — for now leads to paywall. */
  onUpgrade?: () => void;
}

/**
 * Ad placement that disappears when the user has the `adFree` entitlement.
 * The current build is a stub: it shows a "광고 제거" upsell card so we
 * can verify gating end-to-end before integrating AdMob / GAM. Swap the
 * inner View for a real `<BannerAd />` when wiring AdMob.
 */
export function AdSlot({ variant = 'banner', onUpgrade }: Props) {
  const { theme } = useTheme();
  const adFree = useAppStore((s) => s.entitlements.adFree);

  if (adFree) return null;

  return (
    <Pressable
      onPress={onUpgrade}
      style={[
        styles.banner,
        variant === 'banner' && styles.bannerSize,
        { backgroundColor: theme.bgAlt, borderColor: theme.border },
      ]}
    >
      <View style={{ flex: 1 }}>
        <Text style={[typography.micro, { color: theme.textMuted }]}>광고</Text>
        <Text style={[typography.bodyStrong, { color: theme.text }]}>
          광고 없는 Photo Travel
        </Text>
        <Text style={[typography.caption, { color: theme.textMuted }]}>
          월 ₩2,900부터 — 광고 제거 / 4K 콜라주
        </Text>
      </View>
      <View style={[styles.cta, { backgroundColor: theme.primary }]}>
        <Text style={[typography.micro, { color: '#fff', fontWeight: '700' }]}>업그레이드</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  bannerSize: {
    height: 64,
  },
  cta: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
});
