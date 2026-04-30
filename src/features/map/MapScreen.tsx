import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Pill } from '@components/Pill';
import { ScreenHeader } from '@components/ScreenHeader';
import { useTheme } from '@design/ThemeProvider';
import { radius, shadows, spacing, typography } from '@design/tokens';
import {
  activeRegions,
  selectAvailableYears,
  selectVisitedRegionIds,
  useAppStore,
} from '@data/store';
import { MapView } from './MapView';
import { CountryPickerModal } from './CountryPickerModal';

export function MapScreen() {
  const { theme } = useTheme();
  const country = useAppStore((s) => s.selectedCountry);
  const setCountry = useAppStore((s) => s.setCountry);
  const countries = useAppStore((s) => s.countries);
  const regions = useAppStore(activeRegions);
  const regionLevel = useAppStore((s) => s.regionLevel);
  const setRegionLevel = useAppStore((s) => s.setRegionLevel);
  const hasLevel2 = useAppStore(
    (s) => (s.regions[s.selectedCountry]?.[2]?.length ?? 0) > 0
  );
  const photos = useAppStore((s) => s.photos);
  const yearFilter = useAppStore((s) => s.yearFilter);
  const setYearFilter = useAppStore((s) => s.setYearFilter);
  const mapMode = useAppStore((s) => s.mapMode);
  const setMapMode = useAppStore((s) => s.setMapMode);
  const mapLens = useAppStore((s) => s.mapLens);
  const setMapLens = useAppStore((s) => s.setMapLens);
  const isMockData = useAppStore((s) => s.isMockData);
  const onboarded = useAppStore((s) => s.onboarded);
  const hydrate = useAppStore((s) => s.hydrateMockData);

  const [pickerOpen, setPickerOpen] = useState(false);

  // Show mock data only as a one-time preview before the user has either
  // synced their gallery or explicitly skipped onboarding.
  useEffect(() => {
    if (!onboarded && photos.length === 0) hydrate();
  }, [onboarded, photos.length, hydrate]);

  const visitedIds = useAppStore(selectVisitedRegionIds);
  const years = useAppStore(selectAvailableYears);
  const countryMeta = countries.find((c) => c.code === country);
  const total = regions.length;
  const visitedInActiveLevel = useMemo(() => {
    const ids = new Set<string>();
    for (const r of regions) if (visitedIds.has(r.id)) ids.add(r.id);
    return ids;
  }, [regions, visitedIds]);

  const filteredPhotos = useMemo(() => {
    if (yearFilter === 'all') return photos;
    return photos.filter((p) => new Date(p.takenAt).getFullYear() === yearFilter);
  }, [photos, yearFilter]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top']}>
      <ScreenHeader
        title={`${countryMeta?.flagEmoji ?? '🌍'}  ${countryMeta?.name_ko ?? '지도'}`}
        subtitle={isMockData ? '데모 데이터 · 사진 동기화하면 내 발자취가 표시돼요' : '가본 곳을 자동으로 칠해드려요'}
        right={
          <Pressable onPress={() => setPickerOpen(true)} hitSlop={8}>
            <Text style={[typography.body, { color: theme.primary }]}>변경</Text>
          </Pressable>
        }
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
          {hasLevel2 && (
            <View style={{ width: 1, marginHorizontal: spacing.sm, backgroundColor: theme.border }} />
          )}
          {hasLevel2 && (
            <>
              <Pill
                label="시도"
                active={regionLevel === 1}
                onPress={() => setRegionLevel(1)}
              />
              <Pill
                label="시군구"
                active={regionLevel === 2}
                onPress={() => setRegionLevel(2)}
              />
            </>
          )}
        </ScrollView>
      </View>

      <View style={styles.mapWrapper}>
        <MapView
          regions={regions}
          visitedRegionIds={visitedInActiveLevel}
          photos={filteredPhotos.map((p) => ({ id: p.id, lat: p.lat, lng: p.lng }))}
          mode={mapMode}
          lens={mapLens}
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

        <Pressable
          onPress={() => setMapLens(mapLens === 'visited' ? 'unvisited' : 'visited')}
          style={[styles.lensToggle, { backgroundColor: theme.surface, borderColor: theme.border }]}
        >
          <Text style={[typography.micro, { color: theme.textMuted }]}>렌즈</Text>
          <Text style={[typography.bodyStrong, { color: theme.text }]}>
            {mapLens === 'visited' ? '가본 곳' : '안 가본 곳'}
          </Text>
        </Pressable>

        <View style={[styles.progressBadge, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[typography.micro, { color: theme.textMuted }]}>방문</Text>
          <Text style={[typography.title, { color: theme.text }]}>
            {visitedInActiveLevel.size}
            <Text style={[typography.body, { color: theme.textMuted }]}>{` / ${total}`}</Text>
          </Text>
          <Text style={[typography.micro, { color: theme.primary }]}>
            {Math.round((visitedInActiveLevel.size / Math.max(1, total)) * 100)}%
          </Text>
        </View>
      </View>

      <CountryPickerModal
        visible={pickerOpen}
        countries={countries}
        selectedCode={country}
        onSelect={(c) => setCountry(c)}
        onClose={() => setPickerOpen(false)}
      />
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
  lensToggle: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'flex-end',
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
