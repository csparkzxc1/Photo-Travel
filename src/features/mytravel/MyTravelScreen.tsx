import React, { useEffect, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@components/Card';
import { ScreenHeader } from '@components/ScreenHeader';
import { useTheme } from '@design/ThemeProvider';
import { radius, spacing, typography } from '@design/tokens';
import { leafRegions, selectVisitedRegionIds, useAppStore } from '@data/store';
import { haversineKm } from '@core/geo';

export function MyTravelScreen() {
  const { theme } = useTheme();
  const photos = useAppStore((s) => s.photos);
  const trips = useAppStore((s) => s.trips);
  const regions = useAppStore(leafRegions);
  const visited = useAppStore((s) => selectVisitedRegionIds(s));
  const hydrate = useAppStore((s) => s.hydrateMockData);

  useEffect(() => {
    if (photos.length === 0) hydrate();
  }, [photos.length, hydrate]);

  const stats = useMemo(() => {
    const totalDistance = photos
      .slice()
      .sort((a, b) => a.takenAt.localeCompare(b.takenAt))
      .reduce((acc, p, i, arr) => {
        if (i === 0) return acc;
        return acc + haversineKm(arr[i - 1], p);
      }, 0);

    const counts: Record<string, number> = {};
    for (const p of photos) {
      if (!p.regionId) continue;
      counts[p.regionId] = (counts[p.regionId] ?? 0) + 1;
    }
    const topRegionEntry = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    const topRegion = topRegionEntry
      ? regions.find((r) => r.id === topRegionEntry[0])?.name_ko ?? topRegionEntry[0]
      : '—';

    const monthly: Record<string, number> = {};
    for (const p of photos) {
      const key = p.takenAt.slice(0, 7);
      monthly[key] = (monthly[key] ?? 0) + 1;
    }

    return {
      totalCountries: 1,
      totalRegions: visited.size,
      totalPhotos: photos.length,
      totalTrips: trips.filter((t) => t.isSignificant).length,
      totalDistance: Math.round(totalDistance),
      topRegion,
      monthly,
    };
  }, [photos, trips, regions, visited]);

  const months = Object.keys(stats.monthly).sort().slice(-6);
  const maxMonth = Math.max(1, ...months.map((m) => stats.monthly[m]));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top']}>
      <ScreenHeader title="나의 여행" subtitle="2026년의 발자취" />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
        <View style={styles.statRow}>
          <StatCard label="국가" value={stats.totalCountries} suffix="개" />
          <StatCard label="지역" value={stats.totalRegions} suffix="곳" />
        </View>
        <View style={styles.statRow}>
          <StatCard label="여행" value={stats.totalTrips} suffix="회" />
          <StatCard label="사진" value={stats.totalPhotos} suffix="장" />
        </View>

        <Card>
          <Text style={[typography.caption, { color: theme.textMuted }]}>총 이동 거리</Text>
          <Text style={[typography.display, { color: theme.text }]}>
            {stats.totalDistance.toLocaleString()}
            <Text style={[typography.heading, { color: theme.textMuted }]}> km</Text>
          </Text>
          <Text style={[typography.caption, { color: theme.textMuted, marginTop: spacing.xs }]}>
            가장 자주 간 곳: {stats.topRegion}
          </Text>
        </Card>

        <Card>
          <Text style={[typography.heading, { color: theme.text, marginBottom: spacing.md }]}>
            최근 활동
          </Text>
          <View style={styles.chart}>
            {months.map((m) => (
              <View key={m} style={styles.barCol}>
                <View
                  style={[
                    styles.bar,
                    {
                      backgroundColor: theme.primary,
                      height: 4 + (stats.monthly[m] / maxMonth) * 96,
                    },
                  ]}
                />
                <Text style={[typography.micro, { color: theme.textMuted, marginTop: 4 }]}>
                  {m.slice(5)}
                </Text>
              </View>
            ))}
          </View>
        </Card>

        <Card>
          <Text style={[typography.heading, { color: theme.text, marginBottom: spacing.sm }]}>
            위시리스트
          </Text>
          <Text style={[typography.body, { color: theme.textMuted }]}>
            아직 비어있어요. 지도에서 안 가본 곳을 길게 눌러 추가해보세요.
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ label, value, suffix }: { label: string; value: number; suffix: string }) {
  const { theme } = useTheme();
  return (
    <Card style={styles.statCard}>
      <Text style={[typography.caption, { color: theme.textMuted }]}>{label}</Text>
      <Text style={[typography.display, { color: theme.text }]}>
        {value}
        <Text style={[typography.heading, { color: theme.textMuted }]}> {suffix}</Text>
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  statRow: { flexDirection: 'row', gap: spacing.md },
  statCard: { flex: 1 },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    height: 120,
  },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: '70%', borderRadius: radius.sm },
});
