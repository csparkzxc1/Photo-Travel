import React, { useEffect, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Pill } from '@components/Pill';
import { ScreenHeader } from '@components/ScreenHeader';
import { useTheme } from '@design/ThemeProvider';
import { radius, shadows, spacing, typography } from '@design/tokens';
import { selectAvailableYears, selectVisitedRegionIds, useAppStore } from '@data/store';
import { RegionMap } from './RegionMap';

export function MapScreen() {
  const { theme } = useTheme();
  const country = useAppStore((s) => s.selectedCountry);
  const countries = useAppStore((s) => s.countries);
  const regions = useAppStore((s) => s.regions[country] ?? []);
  const photos = useAppStore((s) => s.photos);
  const yearFilter = useAppStore((s) => s.yearFilter);
  const setYearFilter = useAppStore((s) => s.setYearFilter);
  const mapMode = useAppStore((s) => s.mapMode);
  const setMapMode = useAppStore((s) => s.setMapMode);
  const hydrate = useAppStore((s) => s.hydrateMockData);

  useEffect(() => {
    if (photos.length === 0) hydrate();
  }, [photos.length, hydrate]);

  const visitedIds = useAppStore((s) => selectVisitedRegionIds(s));
  const years = useAppStore(selectAvailableYears);
  const countryMeta = countries.find((c) => c.code === country);
  const total = countryMeta?.totalRegions ?? regions.length;

  const filteredPhotos = useMemo(() => {
    if (yearFilter === 'all') return photos;
    return photos.filter((p) => new Date(p.takenAt).getFullYear() === yearFilter);
  }, [photos, yearFilter]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top']}>
      <ScreenHeader
        title={`${countryMeta?.flagEmoji ?? '🌍'}  ${countryMeta?.name_ko ?? '지도'}`}
        subtitle="가본 곳을 자동으로 칠해드려요"
      />

      <View style={styles.filters}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          <Pill label="전체" active={yearFilter === 'all'} onPress={() => setYearFilter('all')} />
          {years.map((y) => (
            <Pill
              key={y}
              label={String(y)}
              active={yearFilter === y}
              onPress={() => setYearFilter(y)}
            />
          ))}
        </ScrollView>
      </View>

      <View style={styles.mapWrapper}>
        <RegionMap
          regions={regions}
          visitedRegionIds={visitedIds}
          photos={filteredPhotos.map((p) => ({ id: p.id, lat: p.lat, lng: p.lng }))}
          mode={mapMode}
        />

        <View style={[styles.modeBar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {(['region', 'heatmap', 'marker'] as const).map((m) => (
            <Pill
              key={m}
              label={m === 'region' ? '지역' : m === 'heatmap' ? '히트맵' : '핀'}
              active={mapMode === m}
              onPress={() => setMapMode(m)}
            />
          ))}
        </View>

        <View style={[styles.progressBadge, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[typography.micro, { color: theme.textMuted }]}>방문</Text>
          <Text style={[typography.title, { color: theme.text }]}>
            {visitedIds.size}
            <Text style={[typography.body, { color: theme.textMuted }]}>{` / ${total}`}</Text>
          </Text>
          <Text style={[typography.micro, { color: theme.primary }]}>
            {Math.round((visitedIds.size / Math.max(1, total)) * 100)}%
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  filters: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  filterRow: {
    paddingRight: spacing.lg,
  },
  mapWrapper: {
    flex: 1,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderRadius: radius.xl,
    overflow: 'hidden',
    ...shadows.card,
  },
  modeBar: {
    position: 'absolute',
    top: spacing.lg,
    alignSelf: 'center',
    flexDirection: 'row',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    borderWidth: 1,
  },
  progressBadge: {
    position: 'absolute',
    bottom: spacing.lg,
    right: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    alignItems: 'flex-end',
    minWidth: 96,
  },
});
