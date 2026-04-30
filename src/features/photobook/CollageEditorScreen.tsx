import React, { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Pill } from '@components/Pill';
import { useTheme } from '@design/ThemeProvider';
import { radius, shadows, spacing, typography } from '@design/tokens';
import {
  COLLAGE_TEMPLATES,
  CollageTemplateId,
  composeCollage,
} from '@core/collageLayouts';
import { Trip } from '@core/types';
import { useAppStore, leafRegions } from '@data/store';
import { CollageCanvas } from './CollageCanvas';
import { captureCollage, shareUri } from './captureCollage';

interface Props {
  tripId: string;
  onClose: () => void;
}

const TEMPLATE_LABELS: Record<CollageTemplateId, string> = {
  fourcut: '4컷',
  ninegrid: '9컷',
  polaroid: '폴라로이드',
  magazine: '매거진',
};

export function CollageEditorScreen({ tripId, onClose }: Props) {
  const { theme } = useTheme();
  const { width: winWidth } = useWindowDimensions();
  const trip = useAppStore((s) => s.trips.find((t) => t.id === tripId));
  const photos = useAppStore((s) =>
    s.photos.filter((p) => p.tripId === tripId || trip?.regionIds.includes(p.regionId ?? ''))
  );
  const regions = useAppStore(leafRegions);

  const [templateId, setTemplateId] = useState<CollageTemplateId>('fourcut');
  const [busy, setBusy] = useState(false);
  const canvasRef = useRef<View>(null);

  const composed = useMemo(
    () => composeCollage(templateId, tripPhotos(photos, trip)),
    [templateId, photos, trip]
  );

  const title = useMemo(() => buildTitle(trip, regions), [trip, regions]);

  if (!trip) {
    return (
      <SafeAreaView style={[styles.fallback, { backgroundColor: theme.bg }]}>
        <Text style={{ color: theme.textMuted }}>여행을 찾을 수 없어요.</Text>
        <Pressable onPress={onClose} style={styles.fallbackBtn}>
          <Text style={{ color: theme.primary }}>돌아가기</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const canvasWidth = Math.min(winWidth - 48, 360);

  const handleShare = async () => {
    setBusy(true);
    const captured = await captureCollage(canvasRef.current, {
      format: 'png',
      width: canvasWidth * 2, // 2x for retina export
    });
    if ('error' in captured) {
      Alert.alert('저장 실패', captured.error);
      setBusy(false);
      return;
    }
    const ok = await shareUri(captured.uri);
    if (!ok) Alert.alert('공유 불가', '이 기기에서 공유 시트를 열 수 없어요.');
    setBusy(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={onClose} hitSlop={12}>
          <Text style={[typography.body, { color: theme.primary }]}>완료</Text>
        </Pressable>
        <Text style={[typography.heading, { color: theme.text }]}>콜라주 편집</Text>
        <Pressable onPress={handleShare} hitSlop={12} disabled={busy}>
          {busy ? (
            <ActivityIndicator color={theme.primary} />
          ) : (
            <Text style={[typography.bodyStrong, { color: theme.primary }]}>공유</Text>
          )}
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.canvasShadow}>
          <CollageCanvas ref={canvasRef} composed={composed} width={canvasWidth} title={title} />
        </View>

        <Text style={[typography.caption, { color: theme.textMuted, marginTop: spacing.lg }]}>
          템플릿
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.templateRow}>
          {(Object.keys(COLLAGE_TEMPLATES) as CollageTemplateId[]).map((id) => (
            <Pill
              key={id}
              label={TEMPLATE_LABELS[id]}
              active={templateId === id}
              onPress={() => setTemplateId(id)}
            />
          ))}
        </ScrollView>

        <View style={styles.metaRow}>
          <Meta label="사진" value={`${photos.length}장`} />
          <Meta label="슬롯" value={`${composed.composed.length}개`} />
          <Meta
            label="채워짐"
            value={`${composed.composed.filter((s) => s.photo).length}/${composed.composed.length}`}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function tripPhotos(allPhotos: ReturnType<typeof useAppStore.getState>['photos'], trip?: Trip) {
  if (!trip) return [];
  const start = new Date(trip.startDate).getTime();
  const end = new Date(trip.endDate).getTime() + 24 * 3600 * 1000;
  return allPhotos.filter((p) => {
    const t = new Date(p.takenAt).getTime();
    if (t < start || t > end) return false;
    return !p.regionId || trip.regionIds.includes(p.regionId);
  });
}

function buildTitle(trip: Trip | undefined, regions: ReturnType<typeof leafRegions>): string {
  if (!trip) return '';
  const names = trip.regionIds
    .slice(0, 2)
    .map((id) => regions.find((r) => r.id === id)?.name_ko ?? id);
  return names.length ? names.join(' · ') : trip.title;
}

function Meta({ label, value }: { label: string; value: string }) {
  const { theme } = useTheme();
  return (
    <View style={styles.meta}>
      <Text style={[typography.micro, { color: theme.textMuted }]}>{label}</Text>
      <Text style={[typography.bodyStrong, { color: theme.text }]}>{value}</Text>
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
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    alignItems: 'center',
  },
  canvasShadow: {
    borderRadius: radius.md,
    ...shadows.pop,
  },
  templateRow: {
    flexGrow: 0,
    marginTop: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    gap: spacing.xl,
    marginTop: spacing.xl,
  },
  meta: { alignItems: 'center' },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  fallbackBtn: { padding: spacing.md },
});
