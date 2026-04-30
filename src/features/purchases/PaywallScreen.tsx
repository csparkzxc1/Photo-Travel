import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@components/Card';
import { useTheme } from '@design/ThemeProvider';
import { radius, spacing, typography } from '@design/tokens';
import { useAppStore } from '@data/store';
import { getPurchases } from './index';
import { ProductOffering } from './types';

interface Props {
  onClose: () => void;
}

export function PaywallScreen({ onClose }: Props) {
  const { theme } = useTheme();
  const entitlements = useAppStore((s) => s.entitlements);
  const setEntitlements = useAppStore((s) => s.setEntitlements);
  const [offerings, setOfferings] = useState<ProductOffering[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const list = await getPurchases().getOfferings();
        if (mounted) setOfferings(list);
      } catch (err) {
        if (mounted) setLoadError(err instanceof Error ? err.message : '오프링 로딩 실패');
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleBuy = async (productId: string) => {
    setBusy(productId);
    try {
      const next = await getPurchases().purchase(productId);
      setEntitlements(next);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : '구매 실패');
    } finally {
      setBusy(null);
    }
  };

  const handleRestore = async () => {
    setBusy('restore');
    try {
      const next = await getPurchases().restore();
      setEntitlements(next);
    } finally {
      setBusy(null);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={onClose} hitSlop={12}>
          <Text style={[typography.body, { color: theme.primary }]}>닫기</Text>
        </Pressable>
        <Pressable onPress={handleRestore} hitSlop={12} disabled={busy !== null}>
          <Text style={[typography.body, { color: theme.textMuted }]}>복원</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.emoji}>🌟</Text>
        <Text style={[typography.display, { color: theme.text, textAlign: 'center' }]}>
          프리미엄
        </Text>
        <Text
          style={[
            typography.body,
            { color: theme.textMuted, textAlign: 'center', marginTop: spacing.sm, marginBottom: spacing.xl },
          ]}
        >
          광고 없이, 더 풍부하게.
        </Text>

        <View style={{ gap: spacing.md, width: '100%' }}>
          <Bullet icon="🚫" text="광고 완전 제거" />
          <Bullet icon="🖼️" text="4K 콜라주 / 9컷 / 매거진 무제한" />
          <Bullet icon="🎬" text="영상 슬라이드쇼 + BGM 라이선스" />
          <Bullet icon="✨" text="AI 여행 제목 자동 생성 (V2)" />
          <Bullet icon="👥" text="친구 무제한 추가" />
        </View>

        <View style={{ height: spacing.xxl }} />

        {entitlements.premium && (
          <Card style={{ width: '100%', backgroundColor: theme.bgAlt, marginBottom: spacing.lg }}>
            <Text style={[typography.bodyStrong, { color: theme.primary }]}>
              ✅ 이미 프리미엄 사용 중이에요
            </Text>
          </Card>
        )}

        {loadError && (
          <Text
            style={[
              typography.caption,
              { color: theme.accent, textAlign: 'center', marginBottom: spacing.md },
            ]}
          >
            {loadError}
          </Text>
        )}

        {offerings.length === 0 && !loadError && (
          <ActivityIndicator color={theme.primary} />
        )}

        {offerings.map((o) => (
          <Pressable
            key={o.id}
            onPress={() => handleBuy(o.id)}
            disabled={busy !== null}
            style={[
              styles.product,
              {
                backgroundColor: o.grants.includes('premium') ? theme.primary : theme.bgAlt,
                borderColor: theme.border,
              },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  typography.bodyStrong,
                  { color: o.grants.includes('premium') ? '#fff' : theme.text },
                ]}
              >
                {o.title}
              </Text>
              <Text
                style={[
                  typography.caption,
                  {
                    color: o.grants.includes('premium')
                      ? 'rgba(255,255,255,0.85)'
                      : theme.textMuted,
                    marginTop: 2,
                  },
                ]}
              >
                {o.description}
              </Text>
            </View>
            {busy === o.id ? (
              <ActivityIndicator color={o.grants.includes('premium') ? '#fff' : theme.primary} />
            ) : (
              <Text
                style={[
                  typography.bodyStrong,
                  { color: o.grants.includes('premium') ? '#fff' : theme.text },
                ]}
              >
                {o.priceString}
              </Text>
            )}
          </Pressable>
        ))}

        <Text
          style={[
            typography.micro,
            { color: theme.textSubtle, textAlign: 'center', marginTop: spacing.xl },
          ]}
        >
          구독은 자동 갱신되며 언제든지 해지할 수 있어요.{'\n'}
          App Store / Play Store 결제 정책이 적용됩니다.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Bullet({ icon, text }: { icon: string; text: string }) {
  const { theme } = useTheme();
  return (
    <View style={styles.bullet}>
      <Text style={{ fontSize: 22, width: 32 }}>{icon}</Text>
      <Text style={[typography.body, { color: theme.text, flex: 1 }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  body: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    alignItems: 'center',
  },
  emoji: { fontSize: 64, marginTop: spacing.lg },
  bullet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  product: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    width: '100%',
    marginBottom: spacing.md,
  },
});
