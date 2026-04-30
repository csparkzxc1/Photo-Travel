import React from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@components/Card';
import { ScreenHeader } from '@components/ScreenHeader';
import { useTheme } from '@design/ThemeProvider';
import { spacing, typography } from '@design/tokens';

interface Row {
  label: string;
  value?: string;
  toggle?: boolean;
}

const SECTIONS: Array<{ title: string; rows: Row[] }> = [
  {
    title: '동기화',
    rows: [
      { label: '갤러리 동기화 주기', value: '실시간' },
      { label: '백그라운드 동기화', toggle: true },
      { label: '셀룰러 데이터 사용', toggle: false },
    ],
  },
  {
    title: '지도',
    rows: [
      { label: '지도 테마', value: '시스템' },
      { label: '히트맵 강도', value: '보통' },
    ],
  },
  {
    title: '백업 / 내보내기',
    rows: [
      { label: '클라우드 백업', toggle: false },
      { label: 'GeoJSON으로 내보내기' },
      { label: 'KML로 내보내기' },
      { label: 'CSV로 내보내기' },
    ],
  },
  {
    title: '구독',
    rows: [
      { label: '광고 제거 (₩2,900/월)' },
      { label: '프리미엄 (₩4,900/월)' },
    ],
  },
  {
    title: '계정',
    rows: [{ label: '개인정보 처리방침' }, { label: '서비스 약관' }, { label: '로그아웃' }],
  },
];

export function SettingsScreen() {
  const { theme } = useTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top']}>
      <ScreenHeader title="설정" />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
        {SECTIONS.map((section) => (
          <View key={section.title}>
            <Text
              style={[
                typography.caption,
                {
                  color: theme.textMuted,
                  marginBottom: spacing.sm,
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                },
              ]}
            >
              {section.title}
            </Text>
            <Card style={{ paddingVertical: 0 }}>
              {section.rows.map((row, i) => (
                <SettingRow
                  key={row.label}
                  row={row}
                  isLast={i === section.rows.length - 1}
                />
              ))}
            </Card>
          </View>
        ))}
        <Text style={[typography.micro, { color: theme.textSubtle, textAlign: 'center' }]}>
          Photo Travel v0.1.0 · 2026.04.30
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingRow({ row, isLast }: { row: Row; isLast: boolean }) {
  const { theme } = useTheme();
  const [on, setOn] = React.useState(!!row.toggle);

  return (
    <Pressable
      style={[
        styles.row,
        !isLast && { borderBottomWidth: 1, borderBottomColor: theme.border },
      ]}
    >
      <Text style={[typography.body, { color: theme.text, flex: 1 }]}>{row.label}</Text>
      {row.toggle !== undefined ? (
        <Switch value={on} onValueChange={setOn} />
      ) : row.value ? (
        <Text style={[typography.body, { color: theme.textMuted }]}>{row.value}</Text>
      ) : (
        <Text style={{ color: theme.textSubtle, fontSize: 18 }}>›</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    minHeight: 48,
  },
});
