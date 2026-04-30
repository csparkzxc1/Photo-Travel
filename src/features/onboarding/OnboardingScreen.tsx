import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@design/ThemeProvider';
import { radius, spacing, typography } from '@design/tokens';
import { useAppStore } from '@data/store';
import { syncFromGallery } from '@features/sync/photoSync';

interface Props {
  onDone: () => void;
}

export function OnboardingScreen({ onDone }: Props) {
  const { theme } = useTheme();
  const markOnboarded = useAppStore((s) => s.markOnboarded);
  const status = useAppStore((s) => s.syncStatus);
  const [busy, setBusy] = useState(false);

  const handleSync = async () => {
    setBusy(true);
    const result = await syncFromGallery();
    setBusy(false);
    markOnboarded();
    if (result.matched > 0) onDone();
  };

  const handleSkip = () => {
    markOnboarded();
    onDone();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={styles.hero}>
        <Text style={styles.emoji}>🗺️</Text>
        <Text style={[typography.display, { color: theme.text, textAlign: 'center' }]}>
          가본 곳, 자동으로
        </Text>
        <Text
          style={[
            typography.body,
            { color: theme.textMuted, textAlign: 'center', marginTop: spacing.md },
          ]}
        >
          갤러리 사진의 위치 정보로{'\n'}
          여행한 지역을 자동으로 칠해드려요.
        </Text>
      </View>

      <View style={styles.bullets}>
        <Bullet icon="🔒" text="사진 원본은 디바이스에만 저장돼요" />
        <Bullet icon="📍" text="EXIF GPS만 사용 — 클라우드 업로드 없음" />
        <Bullet icon="✨" text="여행 / 콜라주 / 통계가 자동 생성돼요" />
      </View>

      {status.kind === 'syncing' && (
        <View style={styles.progress}>
          <ActivityIndicator color={theme.primary} />
          <Text style={[typography.caption, { color: theme.textMuted, marginTop: spacing.sm }]}>
            사진 분석 중… {status.loaded}장
            {status.total ? ` / ${status.total}` : ''}
          </Text>
        </View>
      )}

      {status.kind === 'error' && (
        <Text
          style={[
            typography.caption,
            { color: theme.accent, textAlign: 'center', marginBottom: spacing.md },
          ]}
        >
          {status.message}
        </Text>
      )}

      <Pressable
        disabled={busy}
        onPress={handleSync}
        style={[
          styles.cta,
          { backgroundColor: theme.primary, opacity: busy ? 0.6 : 1 },
        ]}
      >
        <Text style={[typography.bodyStrong, { color: '#fff' }]}>
          {busy ? '동기화 중…' : '갤러리 동기화 시작'}
        </Text>
      </Pressable>

      <Pressable onPress={handleSkip} style={styles.skip}>
        <Text style={[typography.body, { color: theme.textMuted }]}>나중에 할래요</Text>
      </Pressable>
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
  container: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
  },
  hero: {
    alignItems: 'center',
    marginTop: spacing.xxl,
    marginBottom: spacing.xxl,
  },
  emoji: { fontSize: 72, marginBottom: spacing.lg },
  bullets: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.lg,
  },
  bullet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  progress: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  cta: {
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  skip: { alignItems: 'center', padding: spacing.sm },
});
