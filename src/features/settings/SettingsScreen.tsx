import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@components/Card';
import { ScreenHeader } from '@components/ScreenHeader';
import { useTheme } from '@design/ThemeProvider';
import { spacing, typography } from '@design/tokens';
import { useAppStore } from '@data/store';
import { syncFromGallery } from '@features/sync/photoSync';
import {
  registerBackgroundSync,
  unregisterBackgroundSync,
} from '@features/sync/backgroundSync';

export function SettingsScreen() {
  const { theme } = useTheme();
  const status = useAppStore((s) => s.syncStatus);
  const isMockData = useAppStore((s) => s.isMockData);
  const photoCount = useAppStore((s) => s.photos.length);
  const bgEnabled = useAppStore((s) => s.backgroundSyncEnabled);
  const lastBgRun = useAppStore((s) => s.lastBackgroundRunAt);
  const reset = useAppStore((s) => s.reset);
  const [busy, setBusy] = useState(false);
  const [bgBusy, setBgBusy] = useState(false);

  const handleSync = async () => {
    setBusy(true);
    await syncFromGallery();
    setBusy(false);
  };

  const handleBgToggle = async (next: boolean) => {
    setBgBusy(true);
    if (next) {
      const ok = await registerBackgroundSync();
      if (!ok) {
        Alert.alert('백그라운드 동기화 불가', '시스템 설정에서 백그라운드 새로고침을 허용해주세요.');
      }
    } else {
      await unregisterBackgroundSync();
    }
    setBgBusy(false);
  };

  const handleReset = () => {
    Alert.alert('데이터 초기화', '모든 사진/여행/통계를 지울까요? 갤러리는 영향을 받지 않아요.', [
      { text: '취소', style: 'cancel' },
      { text: '초기화', style: 'destructive', onPress: () => reset() },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top']}>
      <ScreenHeader title="설정" />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
        <SectionLabel>동기화</SectionLabel>
        <Card style={{ paddingVertical: 0 }}>
          <Pressable onPress={handleSync} disabled={busy} style={[styles.row, styles.rowBorder, { borderBottomColor: theme.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[typography.body, { color: theme.text }]}>지금 동기화</Text>
              <Text style={[typography.caption, { color: theme.textMuted, marginTop: 2 }]}>
                {syncSubtitle(status, photoCount, isMockData)}
              </Text>
            </View>
            {busy || status.kind === 'syncing' || status.kind === 'requesting' ? (
              <ActivityIndicator color={theme.primary} />
            ) : (
              <Text style={[typography.body, { color: theme.primary }]}>실행</Text>
            )}
          </Pressable>
          <SettingRow label="갤러리 동기화 주기" value="실시간" isLast={false} />
          <View
            style={[
              styles.row,
              styles.rowBorder,
              { borderBottomColor: theme.border },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text style={[typography.body, { color: theme.text }]}>백그라운드 동기화</Text>
              <Text style={[typography.caption, { color: theme.textMuted, marginTop: 2 }]}>
                {bgEnabled
                  ? `마지막 실행: ${lastBgRun ? formatTime(lastBgRun) : '대기 중'}`
                  : '6시간마다 새 사진 자동 동기화'}
              </Text>
            </View>
            {bgBusy ? (
              <ActivityIndicator color={theme.primary} />
            ) : (
              <Switch value={bgEnabled} onValueChange={handleBgToggle} />
            )}
          </View>
          <SettingRow label="셀룰러 데이터 사용" toggle={false} isLast={true} />
        </Card>

        <SectionLabel>지도</SectionLabel>
        <Card style={{ paddingVertical: 0 }}>
          <SettingRow label="지도 테마" value="시스템" isLast={false} />
          <SettingRow label="히트맵 강도" value="보통" isLast={true} />
        </Card>

        <SectionLabel>백업 / 내보내기</SectionLabel>
        <Card style={{ paddingVertical: 0 }}>
          <SettingRow label="클라우드 백업" toggle={false} isLast={false} />
          <SettingRow label="GeoJSON으로 내보내기" isLast={false} />
          <SettingRow label="KML로 내보내기" isLast={false} />
          <SettingRow label="CSV로 내보내기" isLast={true} />
        </Card>

        <SectionLabel>구독</SectionLabel>
        <Card style={{ paddingVertical: 0 }}>
          <SettingRow label="광고 제거 (₩2,900/월)" isLast={false} />
          <SettingRow label="프리미엄 (₩4,900/월)" isLast={true} />
        </Card>

        <SectionLabel>계정</SectionLabel>
        <Card style={{ paddingVertical: 0 }}>
          <SettingRow label="개인정보 처리방침" isLast={false} />
          <SettingRow label="서비스 약관" isLast={false} />
          <Pressable onPress={handleReset} style={[styles.row]}>
            <Text style={[typography.body, { color: theme.accent }]}>데이터 초기화</Text>
          </Pressable>
        </Card>

        <Text style={[typography.micro, { color: theme.textSubtle, textAlign: 'center' }]}>
          Photo Travel v0.2.0 · 2026.04.30
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  return (
    <Text
      style={[
        typography.caption,
        { color: theme.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
      ]}
    >
      {children}
    </Text>
  );
}

function SettingRow({
  label,
  value,
  toggle,
  isLast,
}: {
  label: string;
  value?: string;
  toggle?: boolean;
  isLast: boolean;
}) {
  const { theme } = useTheme();
  const [on, setOn] = React.useState(!!toggle);

  return (
    <Pressable
      style={[
        styles.row,
        !isLast && styles.rowBorder,
        !isLast && { borderBottomColor: theme.border },
      ]}
    >
      <Text style={[typography.body, { color: theme.text, flex: 1 }]}>{label}</Text>
      {toggle !== undefined ? (
        <Switch value={on} onValueChange={setOn} />
      ) : value ? (
        <Text style={[typography.body, { color: theme.textMuted }]}>{value}</Text>
      ) : (
        <Text style={{ color: theme.textSubtle, fontSize: 18 }}>›</Text>
      )}
    </Pressable>
  );
}

function syncSubtitle(
  status: ReturnType<typeof useAppStore.getState>['syncStatus'],
  photoCount: number,
  isMockData: boolean
): string {
  switch (status.kind) {
    case 'idle':
      if (isMockData) return '데모 데이터 표시 중. 동기화하면 실제 사진으로 교체돼요.';
      if (photoCount === 0) return '아직 동기화한 적이 없어요.';
      return `사진 ${photoCount}장 동기화 완료`;
    case 'requesting':
      return '권한 요청 중…';
    case 'syncing':
      return `사진 분석 중… ${status.loaded}${status.total ? ` / ${status.total}` : ''}`;
    case 'success':
      return `${status.matched}/${status.withGps}장 매칭 · ${formatTime(status.at)}`;
    case 'error':
      return status.message;
  }
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    minHeight: 48,
  },
  rowBorder: {
    borderBottomWidth: 1,
  },
});
