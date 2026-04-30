import React, { useEffect } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@components/Card';
import { ScreenHeader } from '@components/ScreenHeader';
import { useTheme } from '@design/ThemeProvider';
import { pickPastel, radius, spacing, typography } from '@design/tokens';
import { useAppStore } from '@data/store';

const TEMPLATES = [
  { id: '4cut', name: '4컷 콜라주', emoji: '🎞️', desc: '인스타 스토리 비율' },
  { id: '9grid', name: '9컷 그리드', emoji: '🟦', desc: '피드용 정사각' },
  { id: 'polaroid', name: '폴라로이드', emoji: '📸', desc: '레트로 무드' },
  { id: 'video', name: '슬라이드쇼', emoji: '🎬', desc: 'BGM 자동 매칭' },
];

export function PhotobookScreen() {
  const { theme } = useTheme();
  const trips = useAppStore((s) => s.trips.filter((t) => t.isSignificant));
  const hydrate = useAppStore((s) => s.hydrateMockData);

  useEffect(() => {
    if (trips.length === 0) hydrate();
  }, [trips.length, hydrate]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top']}>
      <ScreenHeader title="포토북" subtitle="여행을 한 편의 콜라주로" />
      <FlatList
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View>
            <Text style={[typography.heading, { color: theme.text, marginBottom: spacing.md }]}>
              템플릿
            </Text>
            <View style={styles.templates}>
              {TEMPLATES.map((t) => (
                <Card key={t.id} style={styles.templateCard}>
                  <Text style={{ fontSize: 28 }}>{t.emoji}</Text>
                  <Text style={[typography.bodyStrong, { color: theme.text, marginTop: spacing.sm }]}>
                    {t.name}
                  </Text>
                  <Text style={[typography.caption, { color: theme.textMuted }]}>{t.desc}</Text>
                </Card>
              ))}
            </View>
            <Text
              style={[
                typography.heading,
                { color: theme.text, marginTop: spacing.xl, marginBottom: spacing.md },
              ]}
            >
              최근 여행
            </Text>
          </View>
        }
        data={trips}
        keyExtractor={(t) => t.id}
        renderItem={({ item }) => (
          <Card style={[styles.tripCard, { backgroundColor: pickPastel(item.id) }]}>
            <Text style={[typography.bodyStrong, { color: '#1B2330' }]}>{item.title}</Text>
            <Text style={[typography.caption, { color: '#3B4554' }]}>
              사진 {item.photoCount}장 · {item.startDate.slice(0, 10)}
            </Text>
            <Text style={[typography.caption, { color: '#3B4554', marginTop: spacing.sm }]}>
              탭하여 콜라주 만들기 →
            </Text>
          </Card>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.lg, gap: spacing.md },
  templates: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  templateCard: {
    width: '47%',
    padding: spacing.lg,
  },
  tripCard: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 0,
  },
});
