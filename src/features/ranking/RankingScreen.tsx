import React, { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@components/Card';
import { ScreenHeader } from '@components/ScreenHeader';
import { useTheme } from '@design/ThemeProvider';
import { radius, spacing, typography } from '@design/tokens';
import { selectVisitedRegionIds, useAppStore } from '@data/store';

interface FriendRow {
  id: string;
  nickname: string;
  emoji: string;
  visits: number;
}

const MOCK_FRIENDS: FriendRow[] = [
  { id: '1', nickname: '한국정복러', emoji: '🦊', visits: 78 },
  { id: '2', nickname: '제주살이', emoji: '🐶', visits: 41 },
  { id: '3', nickname: '여행꾼', emoji: '🐱', visits: 29 },
  { id: '4', nickname: '집순이', emoji: '🐰', visits: 12 },
];

const BADGES = [
  { id: 'kr_tour', title: '한국 일주', icon: '🏆', desc: '17개 광역시도 모두 방문' },
  { id: 'island', title: '섬 헌터', icon: '🏝️', desc: '제주·울릉·강화 방문' },
  { id: '100c', title: '100개국 클럽', icon: '🌍', desc: '100개국 방문' },
  { id: '5cont', title: '5대륙 정복자', icon: '🗺️', desc: '5개 대륙 방문' },
];

export function RankingScreen() {
  const { theme } = useTheme();
  const visited = useAppStore((s) => selectVisitedRegionIds(s));
  const hydrate = useAppStore((s) => s.hydrateMockData);
  const myVisits = visited.size;

  useEffect(() => {
    if (myVisits === 0) hydrate();
  }, [myVisits, hydrate]);

  const all = [...MOCK_FRIENDS, { id: 'me', nickname: '나', emoji: '⭐', visits: myVisits }].sort(
    (a, b) => b.visits - a.visits
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top']}>
      <ScreenHeader title="랭킹" subtitle="친구들과 가본 곳 비교" />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
        <Card>
          <Text style={[typography.heading, { color: theme.text, marginBottom: spacing.md }]}>
            친구 랭킹
          </Text>
          {all.map((f, idx) => (
            <View key={f.id} style={styles.row}>
              <Text style={[typography.bodyStrong, { color: theme.textMuted, width: 24 }]}>
                {idx + 1}
              </Text>
              <Text style={{ fontSize: 22, marginRight: spacing.sm }}>{f.emoji}</Text>
              <Text
                style={[
                  typography.body,
                  {
                    flex: 1,
                    color: f.id === 'me' ? theme.primary : theme.text,
                    fontWeight: f.id === 'me' ? '700' : '400',
                  },
                ]}
              >
                {f.nickname}
              </Text>
              <Text style={[typography.bodyStrong, { color: theme.text }]}>{f.visits}</Text>
            </View>
          ))}
        </Card>

        <Card>
          <Text style={[typography.heading, { color: theme.text, marginBottom: spacing.md }]}>
            뱃지
          </Text>
          <View style={styles.badges}>
            {BADGES.map((b) => (
              <View key={b.id} style={[styles.badge, { borderColor: theme.border }]}>
                <Text style={{ fontSize: 28 }}>{b.icon}</Text>
                <Text style={[typography.bodyStrong, { color: theme.text, marginTop: 4 }]}>
                  {b.title}
                </Text>
                <Text
                  style={[typography.micro, { color: theme.textMuted, textAlign: 'center' }]}
                >
                  {b.desc}
                </Text>
              </View>
            ))}
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  badge: {
    width: '47%',
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
});
