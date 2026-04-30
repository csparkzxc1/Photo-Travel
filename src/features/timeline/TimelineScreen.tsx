import React, { useEffect, useMemo } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@components/Card';
import { ScreenHeader } from '@components/ScreenHeader';
import { useTheme } from '@design/ThemeProvider';
import { pickPastel, radius, spacing, typography } from '@design/tokens';
import { leafRegions, useAppStore } from '@data/store';
import { Trip } from '@core/types';

export function TimelineScreen() {
  const { theme } = useTheme();
  const trips = useAppStore((s) => s.trips);
  const regions = useAppStore(leafRegions);
  const hydrate = useAppStore((s) => s.hydrateMockData);

  useEffect(() => {
    if (trips.length === 0) hydrate();
  }, [trips.length, hydrate]);

  const sorted = useMemo(
    () => [...trips].sort((a, b) => b.startDate.localeCompare(a.startDate)),
    [trips]
  );

  const regionName = (id: string) =>
    regions.find((r) => r.id === id)?.name_ko ?? id;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top']}>
      <ScreenHeader title="타임라인" subtitle="자동 그룹핑된 여행 기록" />
      <FlatList
        data={sorted}
        keyExtractor={(t) => t.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TripRow trip={item} regionName={regionName} />
        )}
        ListEmptyComponent={
          <Text style={{ color: theme.textMuted, textAlign: 'center', marginTop: spacing.xxl }}>
            아직 여행이 없어요. 사진을 동기화하면 자동으로 만들어져요.
          </Text>
        }
      />
    </SafeAreaView>
  );
}

function TripRow({ trip, regionName }: { trip: Trip; regionName: (id: string) => string }) {
  const { theme } = useTheme();
  const start = new Date(trip.startDate);
  const end = new Date(trip.endDate);
  const date =
    start.toDateString() === end.toDateString()
      ? formatDate(start)
      : `${formatDate(start)} – ${formatDate(end)}`;

  return (
    <View style={styles.row}>
      <View style={styles.timeCol}>
        <View style={[styles.dot, { backgroundColor: theme.primary }]} />
        <View style={[styles.line, { backgroundColor: theme.border }]} />
      </View>
      <Card style={styles.card}>
        <View style={[styles.thumb, { backgroundColor: pickPastel(trip.id) }]}>
          <Text style={[typography.title, { color: '#fff' }]}>
            {trip.regionIds.map((r) => regionName(r).slice(0, 2)).join('·')}
          </Text>
        </View>
        <View style={styles.meta}>
          <Text style={[typography.heading, { color: theme.text }]}>
            {trip.regionIds.map(regionName).join(' · ')}
          </Text>
          <Text style={[typography.caption, { color: theme.textMuted, marginTop: 2 }]}>{date}</Text>
          <Text style={[typography.caption, { color: theme.textMuted, marginTop: 2 }]}>
            {trip.title} · 사진 {trip.photoCount}장
          </Text>
        </View>
      </Card>
    </View>
  );
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  list: { padding: spacing.lg, gap: spacing.md },
  row: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  timeCol: { width: 14, alignItems: 'center' },
  dot: { width: 12, height: 12, borderRadius: 6, marginTop: spacing.lg },
  line: { width: 2, flex: 1, marginTop: spacing.xs },
  card: { flex: 1, flexDirection: 'row', gap: spacing.md, padding: spacing.md },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meta: { flex: 1, justifyContent: 'center' },
});
