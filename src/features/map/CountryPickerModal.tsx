import React, { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Country } from '@core/types';
import { useTheme } from '@design/ThemeProvider';
import { radius, spacing, typography } from '@design/tokens';

interface Props {
  visible: boolean;
  countries: Country[];
  selectedCode: string;
  onSelect: (code: string) => void;
  onClose: () => void;
}

export function CountryPickerModal({ visible, countries, selectedCode, onSelect, onClose }: Props) {
  const { theme } = useTheme();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return countries;
    return countries.filter(
      (c) =>
        c.name_ko.toLowerCase().includes(q) ||
        c.name_en.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q)
    );
  }, [countries, query]);

  return (
    <Modal animationType="slide" presentationStyle="pageSheet" visible={visible} onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top']}>
        <View style={styles.header}>
          <Text style={[typography.title, { color: theme.text }]}>국가 선택</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={[typography.body, { color: theme.primary }]}>닫기</Text>
          </Pressable>
        </View>
        <View style={[styles.searchWrap, { backgroundColor: theme.bgAlt, borderColor: theme.border }]}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="국가명 또는 코드 검색"
            placeholderTextColor={theme.textSubtle}
            style={[styles.search, { color: theme.text }]}
            autoCorrect={false}
            autoCapitalize="none"
          />
        </View>
        <FlatList
          data={filtered}
          keyExtractor={(c) => c.code}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl }}
          renderItem={({ item }) => {
            const active = item.code === selectedCode;
            return (
              <Pressable
                onPress={() => {
                  onSelect(item.code);
                  onClose();
                }}
                style={[
                  styles.row,
                  {
                    backgroundColor: active ? theme.bgAlt : 'transparent',
                    borderColor: theme.border,
                  },
                ]}
              >
                <Text style={styles.flag}>{item.flagEmoji}</Text>
                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <Text style={[typography.bodyStrong, { color: theme.text }]}>{item.name_ko}</Text>
                  <Text style={[typography.caption, { color: theme.textMuted }]}>
                    {item.name_en} · {item.totalRegions}개 지역
                  </Text>
                </View>
                {active && <Text style={[typography.body, { color: theme.primary }]}>✓</Text>}
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <Text
              style={{ color: theme.textMuted, textAlign: 'center', marginTop: spacing.xxl }}
            >
              일치하는 국가가 없어요.
            </Text>
          }
        />
      </SafeAreaView>
    </Modal>
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
  searchWrap: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  search: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.body,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  flag: { fontSize: 28 },
});
