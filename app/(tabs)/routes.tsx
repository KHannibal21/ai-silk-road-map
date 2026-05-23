// app/(tabs)/routes.tsx
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Keyboard,
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

import { loadSilkRoadDataset, RegionKey, SilkRoadRoute } from '@/assets/data/silkroad-repo';

const REGIONS: Array<{ key: RegionKey; label: string; icon: any }> = [
  { key: 'ontustik', label: 'Оңтүстік', icon: 'sun.max.fill' },
  { key: 'zhetysu', label: 'Жетісу', icon: 'leaf.fill' },
  { key: 'syrdarya', label: 'Сырдария', icon: 'drop.fill' },
  { key: 'shygys', label: 'Шығыс', icon: 'mountain.2.fill' },
  { key: 'batys', label: 'Батыс', icon: 'wind' },
];

function regionLabel(key: RegionKey) {
  return REGIONS.find((r) => r.key === key)?.label ?? 'Аймақ';
}

function mutedTextColor(scheme: 'light' | 'dark') {
  return scheme === 'dark' ? 'rgba(240,233,221,0.72)' : 'rgba(44,44,44,0.62)';
}
function subtleBg(scheme: 'light' | 'dark') {
  return scheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';
}
function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

export default function RoutesScreen() {
  const router = useRouter();
  const scheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
  const t = Colors[scheme];
  const muted = mutedTextColor(scheme);

  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();

  const inputRef = useRef<TextInput | null>(null);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [routes, setRoutes] = useState<SilkRoadRoute[]>([]);

  const [activeRegion, setActiveRegion] = useState<RegionKey | 'all'>('all');
  const [query, setQuery] = useState('');

  const load = async () => {
    setErr(null);
    setLoading(true);
    try {
      const ds = await loadSilkRoadDataset();
      setRoutes(ds.routes ?? []);
    } catch (e: any) {
      setErr(e?.message ?? 'Қате шықты');
      setRoutes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const featured = useMemo(() => {
    const base = routes.filter((r) => r.isFeatured);
    if (activeRegion === 'all') return base;
    return base.filter((r) => r.regionKey === activeRegion);
  }, [routes, activeRegion]);

  const filtered = useMemo(() => {
    const qRaw = query.trim();
    const q = normalize(qRaw);

    const base = routes.filter((r) => (activeRegion === 'all' ? true : r.regionKey === activeRegion));
    if (!q) return base;

    return base.filter((r) => {
      const title = normalize(r.title ?? '');
      const era = normalize(r.era ?? '');
      const short = normalize(r.short ?? '');
      const tags = (r.tags ?? []).map((x) => normalize(x ?? ''));

      return (
        title.includes(q) ||
        era.includes(q) ||
        short.includes(q) ||
        tags.some((x) => x.includes(q))
      );
    });
  }, [routes, activeRegion, query]);

  const statsText = useMemo(() => {
    const total = filtered.length;
    if (activeRegion === 'all') return `${total} бағыт`;
    return `${regionLabel(activeRegion)}: ${total} бағыт`;
  }, [filtered.length, activeRegion]);

  const openItem = (id: string) => router.push(`/item/${encodeURIComponent(id)}`);

  const clearSearch = () => {
    setQuery('');
    Keyboard.dismiss();
    setTimeout(() => inputRef.current?.focus(), 60);
  };

  const clearAllFilters = () => {
    setQuery('');
    setActiveRegion('all');
    Keyboard.dismiss();
  };

  return (
    <View style={[styles.screen, { backgroundColor: t.background }]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: 14 + Math.max(insets.top, 0),
            paddingBottom: 18 + Math.max(insets.bottom, 0) + tabBarHeight,
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <ThemedText style={[styles.title, { color: t.text }]}>Маршруттар</ThemedText>
            <ThemedText style={[styles.subtitle, { color: muted }]} numberOfLines={2}>
              {loading ? 'Дерек жүктелуде…' : err ? 'Қате болды' : statsText}
            </ThemedText>
          </View>

          <Pressable
            onPress={() => {
              Keyboard.dismiss();
              load();
            }}
            style={({ pressed }) => [
              styles.iconBtn,
              { backgroundColor: t.card, borderColor: t.border, opacity: pressed ? 0.9 : 1 },
            ]}
            hitSlop={8}
          >
            <IconSymbol name="arrow.clockwise" size={16} color={t.icon} />
          </Pressable>
        </View>

        {/* Search */}
        <View style={[styles.searchWrap, { backgroundColor: t.card, borderColor: t.border }]}>
          <IconSymbol name="magnifyingglass" size={16} color={t.icon} />
          <TextInput
            ref={(r) => (inputRef.current = r)}
            value={query}
            onChangeText={setQuery}
            placeholder="Іздеу: атауы, кезеңі, тег…"
            placeholderTextColor={scheme === 'dark' ? 'rgba(244,235,221,0.55)' : 'rgba(31,35,40,0.45)'}
            style={[styles.searchInput, { color: t.text }]}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            clearButtonMode="never"
          />

          {!!query.trim() && (
            <Pressable
              onPress={clearSearch}
              style={({ pressed }) => [
                styles.clearBtn,
                { backgroundColor: subtleBg(scheme), borderColor: t.border, opacity: pressed ? 0.9 : 1 },
              ]}
              hitSlop={8}
            >
              <IconSymbol name="xmark" size={14} color={t.icon} />
            </Pressable>
          )}
        </View>

        {/* Region filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersRow}
          keyboardShouldPersistTaps="handled"
        >
          <Chip
            label="Барлығы"
            icon="square.grid.2x2.fill"
            active={activeRegion === 'all'}
            scheme={scheme}
            onPress={() => {
              Keyboard.dismiss();
              setActiveRegion('all');
            }}
          />
          {REGIONS.map((r) => (
            <Chip
              key={r.key}
              label={r.label}
              icon={r.icon}
              active={activeRegion === r.key}
              scheme={scheme}
              onPress={() => {
                Keyboard.dismiss();
                setActiveRegion(r.key);
              }}
            />
          ))}
        </ScrollView>

        {/* States */}
        {loading && (
          <View style={[styles.stateCard, { backgroundColor: t.card, borderColor: t.border }]}>
            <ActivityIndicator size="small" color={t.tint} />
            <ThemedText style={[styles.stateText, { color: muted }]}>Дерек жүктелуде…</ThemedText>
          </View>
        )}

        {!loading && !!err && (
          <View style={[styles.stateCard, { backgroundColor: t.card, borderColor: t.border }]}>
            <IconSymbol name="exclamationmark.triangle.fill" size={16} color={t.tint} />
            <ThemedText style={[styles.stateText, { color: muted }]} numberOfLines={4}>
              {err}
            </ThemedText>
          </View>
        )}

        {!loading && !err && routes.length === 0 && (
          <View style={[styles.stateCard, { backgroundColor: t.card, borderColor: t.border }]}>
            <IconSymbol name="tray.fill" size={16} color={t.icon} />
            <ThemedText style={[styles.stateText, { color: muted }]} numberOfLines={4}>
              Маршрут дерегі жоқ. `assets/data/silkroad.json` ішіндегі `routes` бөлімін тексер.
            </ThemedText>
          </View>
        )}

        {/* Featured (only if exists) */}
        {!loading && !err && featured.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <ThemedText style={[styles.sectionTitle, { color: t.text }]}>Ұсынылатындар</ThemedText>
              <ThemedText style={[styles.sectionHint, { color: muted }]}>
                `isFeatured: true` белгісі бар бағыттар
              </ThemedText>
            </View>

            <View style={{ gap: 12 }}>
              {featured.map((r) => (
                <RouteCard key={r.id} route={r} scheme={scheme} onPress={() => openItem(r.id)} />
              ))}
            </View>
          </>
        )}

        {/* List */}
        {!loading && !err && (
          <>
            <View style={[styles.sectionHeader, { marginTop: featured.length ? 16 : 6 }]}>
              <ThemedText style={[styles.sectionTitle, { color: t.text }]}>Барлық маршруттар</ThemedText>
              <ThemedText style={[styles.sectionHint, { color: muted }]}>
                Фильтр және іздеу бойынша
              </ThemedText>
            </View>

            {filtered.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: t.card, borderColor: t.border }]}>
                <IconSymbol name="magnifyingglass" size={16} color={t.icon} />
                <View style={{ flex: 1 }}>
                  <ThemedText style={[styles.emptyTitle, { color: t.text }]}>Нәтиже табылмады</ThemedText>
                  <ThemedText style={[styles.emptySub, { color: muted }]}>
                    Іздеу сөзін өзгертіп көр немесе аймақ фильтрін “Барлығы” қыл.
                  </ThemedText>
                </View>

                <Pressable
                  onPress={clearAllFilters}
                  style={({ pressed }) => [
                    styles.smallBtn,
                    { backgroundColor: subtleBg(scheme), borderColor: t.border, opacity: pressed ? 0.9 : 1 },
                  ]}
                >
                  <ThemedText style={[styles.smallBtnText, { color: t.text }]}>Тазалау</ThemedText>
                </Pressable>
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                {filtered.map((r) => (
                  <RouteCard key={r.id} route={r} scheme={scheme} onPress={() => openItem(r.id)} />
                ))}
              </View>
            )}
          </>
        )}

        {/* Footer */}
        <ThemedText style={[styles.footer, { color: muted }]}>
          Кеңес: JSON-та `tags` және `era` толтырсаң, іздеу сапасы жақсарады.
        </ThemedText>
      </ScrollView>
    </View>
  );
}

function RouteCard({
  route,
  scheme,
  onPress,
}: {
  route: SilkRoadRoute;
  scheme: 'light' | 'dark';
  onPress: () => void;
}) {
  const t = Colors[scheme];
  const muted = mutedTextColor(scheme);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: t.card,
          borderColor: t.border,
          transform: [{ scale: pressed ? 0.995 : 1 }],
          opacity: pressed ? 0.98 : 1,
        },
      ]}
    >
      <View style={styles.cardTopRow}>
        <View style={{ flex: 1 }}>
          <ThemedText style={[styles.cardTitle, { color: t.text }]}>{route.title}</ThemedText>
          <ThemedText style={[styles.cardMeta, { color: muted }]} numberOfLines={2}>
            {route.era ? `Кезеңі: ${route.era}` : 'Кезеңі: көрсетілмеген'} • {regionLabel(route.regionKey)}
          </ThemedText>
        </View>

        <View style={[styles.typeChip, { borderColor: t.border, backgroundColor: subtleBg(scheme) }]}>
          <IconSymbol name="point.topleft.down.curvedto.point.bottomright.up.fill" size={14} color={t.icon} />
          <ThemedText style={[styles.typeChipText, { color: t.text }]}>Бағыт</ThemedText>
        </View>
      </View>

      {!!route.tags?.length && (
        <View style={styles.tagsRow}>
          {route.tags.slice(0, 3).map((tag) => (
            <View
              key={tag}
              style={[
                styles.tag,
                { borderColor: t.border, backgroundColor: scheme === 'dark' ? '#0F1216' : '#FBF3E6' },
              ]}
            >
              <ThemedText style={[styles.tagText, { color: muted }]}>{tag}</ThemedText>
            </View>
          ))}
        </View>
      )}

      <View style={styles.cardBottomRow}>
        <View style={styles.inlineRow}>
          <IconSymbol name="doc.text.fill" size={14} color={t.icon} />
          <ThemedText style={[styles.inlineText, { color: muted }]} numberOfLines={1}>
            {route.short ? route.short : 'Қысқаша сипаттама жоқ.'}
          </ThemedText>
        </View>

        <View style={styles.inlineRowRight}>
          <ThemedText style={[styles.linkText, { color: t.tint }]}>Ашу</ThemedText>
          <IconSymbol name="chevron.right" size={14} color={t.tint} />
        </View>
      </View>
    </Pressable>
  );
}

function Chip({
  label,
  icon,
  active,
  scheme,
  onPress,
}: {
  label: string;
  icon: any;
  active: boolean;
  scheme: 'light' | 'dark';
  onPress: () => void;
}) {
  const t = Colors[scheme];
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: active ? t.tint : t.card,
          borderColor: active ? t.tint : t.border,
          opacity: pressed ? 0.92 : 1,
        },
      ]}
    >
      <IconSymbol
        name={icon}
        size={14}
        color={active ? (scheme === 'dark' ? '#0F1216' : '#FFF9F0') : t.icon}
      />
      <ThemedText
        style={[
          styles.chipText,
          { color: active ? (scheme === 'dark' ? '#0F1216' : '#FFF9F0') : t.text },
        ]}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  container: { flex: 1 },

  content: {
    paddingHorizontal: 16,
    gap: 12,
  },

  headerRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  title: { fontSize: 18, fontWeight: '900' },
  subtitle: { fontSize: 12, fontWeight: '600', marginTop: 2, lineHeight: 16 },

  iconBtn: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  searchWrap: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  searchInput: { flex: 1, fontSize: 14, fontWeight: '600' },

  clearBtn: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  filtersRow: { gap: 10, paddingVertical: 6, paddingRight: 6 },
  chip: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: { fontSize: 12, fontWeight: '800' },

  stateCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  stateText: { fontSize: 12, fontWeight: '700', flex: 1 },

  sectionHeader: { gap: 2, marginTop: 6 },
  sectionTitle: { fontSize: 16, fontWeight: '900' },
  sectionHint: { fontSize: 12, fontWeight: '700' },

  card: { borderRadius: 18, borderWidth: 1, padding: 14, gap: 10 },
  cardTopRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  cardTitle: { fontSize: 15, fontWeight: '900', lineHeight: 20 },
  cardMeta: { fontSize: 12, fontWeight: '600', marginTop: 4, lineHeight: 16 },

  typeChip: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  typeChipText: { fontSize: 12, fontWeight: '800' },

  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  tagText: { fontSize: 12, fontWeight: '700' },

  cardBottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  inlineRow: { flexDirection: 'row', gap: 6, alignItems: 'center', flex: 1 },
  inlineText: { fontSize: 12, fontWeight: '700', flex: 1 },
  inlineRowRight: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  linkText: { fontSize: 12, fontWeight: '900' },

  emptyCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  emptyTitle: { fontSize: 14, fontWeight: '900' },
  emptySub: { fontSize: 12, fontWeight: '600', lineHeight: 16, marginTop: 2 },

  smallBtn: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  smallBtnText: { fontSize: 12, fontWeight: '900' },

  footer: { fontSize: 12, fontWeight: '600', marginTop: 10, lineHeight: 16 },
});