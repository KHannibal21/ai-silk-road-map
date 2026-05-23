// app/(tabs)/index.tsx
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

import {
  loadSilkRoadDataset,
  SilkRoadDataset,
  SilkRoadPlace,
  SilkRoadRoute,
} from '@/assets/data/silkroad-repo';

type QuickAction = {
  key: 'map' | 'routes' | 'ai';
  title: string;
  subtitle: string;
  icon: any;
};

const QUICK_ACTIONS: QuickAction[] = [
  { key: 'map', title: 'Карта', subtitle: 'Нүктелер мен бағыттарды көру', icon: 'map.fill' },
  {
    key: 'routes',
    title: 'Маршруттар',
    subtitle: 'Аймақтар бойынша тізім',
    icon: 'point.topleft.down.curvedto.point.bottomright.up.fill',
  },
  { key: 'ai', title: 'AI гид', subtitle: 'Сұрақ қойып, түсіндірме алу', icon: 'sparkles' },
];

export default function HomeScreen() {
  const router = useRouter();
  const scheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
  const t = Colors[scheme];

  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dataset, setDataset] = useState<SilkRoadDataset | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    try {
      const ds = await loadSilkRoadDataset();
      setDataset(ds);
    } catch (e: any) {
      setDataset(null);
      setError(e?.message ?? 'Белгісіз қате');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const stats = useMemo(() => {
    const routes = dataset?.routes?.length ?? 0;
    const places = dataset?.places?.length ?? 0;
    return { routes, places, total: routes + places };
  }, [dataset]);

  const featured = useMemo(() => {
    if (!dataset) return { routes: [] as SilkRoadRoute[], places: [] as SilkRoadPlace[] };
    const fr = dataset.routes.filter((r) => r.isFeatured);
    const fp = dataset.places.filter((p) => p.isFeatured);
    return { routes: fr, places: fp };
  }, [dataset]);

  const hasAnyData = (dataset?.routes?.length ?? 0) + (dataset?.places?.length ?? 0) > 0;
  const hasFeatured = featured.routes.length + featured.places.length > 0;

  const openQuick = (key: QuickAction['key']) => {
    if (key === 'map') router.push('/map');
    if (key === 'routes') router.push('/routes');
    if (key === 'ai') router.push('/ai');
  };

  const openItem = (id: string) => router.push(`/item/${encodeURIComponent(id)}`);

  // ✅ нижний padding: safe area + tabbar + небольшой воздух
  const contentBottom = Math.max(insets.bottom, 0) + tabBarHeight + 16;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: t.background, paddingTop: insets.top }]}
      contentContainerStyle={[styles.content, { paddingBottom: contentBottom }]}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={t.tint}
          colors={[t.tint]}
        />
      }
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <ThemedText style={[styles.kicker, { color: t.mutedText }]}>
            Қазақстан тарихы • Жібек жолы
          </ThemedText>
          <ThemedText style={[styles.title, { color: t.text }]}>AI Silk Road Map</ThemedText>
          <ThemedText style={[styles.subtitle, { color: t.mutedText }]}>
            Қазақстандағы тармақтар, нүктелер және тарихи байланыстар.
          </ThemedText>
        </View>

        <View style={[styles.badge, { backgroundColor: t.card, borderColor: t.border }]}>
          <IconSymbol name="sparkles" size={18} color={t.tint} />
          <ThemedText style={[styles.badgeText, { color: t.text }]}>AI</ThemedText>
        </View>
      </View>

      {/* Loading / Error */}
      {loading && (
        <View style={[styles.stateCard, { backgroundColor: t.card, borderColor: t.border }]}>
          <ActivityIndicator size="small" color={t.tint} />
          <View style={{ flex: 1 }}>
            <ThemedText style={[styles.stateTitle, { color: t.text }]}>Дерек жүктелуде…</ThemedText>
            <ThemedText style={[styles.stateSub, { color: t.mutedText }]}>
              Бір сәт күте тұр.
            </ThemedText>
          </View>
        </View>
      )}

      {!loading && !!error && (
        <View style={[styles.stateCard, { backgroundColor: t.card, borderColor: t.border }]}>
          <IconSymbol name="exclamationmark.triangle.fill" size={18} color={t.warning} />
          <View style={{ flex: 1 }}>
            <ThemedText style={[styles.stateTitle, { color: t.text }]}>Қате</ThemedText>
            <ThemedText style={[styles.stateSub, { color: t.mutedText }]} numberOfLines={6}>
              {error}
            </ThemedText>
          </View>

          <Pressable
            onPress={load}
            style={({ pressed }) => [
              styles.smallBtn,
              {
                borderColor: t.border,
                backgroundColor: scheme === 'dark' ? '#0F1216' : '#FBF3E6',
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <ThemedText style={[styles.smallBtnText, { color: t.text }]}>Қайталау</ThemedText>
          </Pressable>
        </View>
      )}

      {/* Quick actions */}
      <View style={styles.sectionHeader}>
        <ThemedText style={[styles.sectionTitle, { color: t.text }]}>Жылдам кіру</ThemedText>
        <ThemedText style={[styles.sectionHint, { color: t.mutedText }]}>Негізгі бөлімдер</ThemedText>
      </View>

      {/* ✅ 3 карточки в ряд ломаются на маленьких экранах → делаем адаптивно */}
      <View style={styles.quickGrid}>
        {QUICK_ACTIONS.map((a) => (
          <Pressable
            key={a.key}
            onPress={() => openQuick(a.key)}
            style={({ pressed }) => [
              styles.quickCard,
              {
                backgroundColor: t.card,
                borderColor: t.border,
                transform: [{ scale: pressed ? 0.99 : 1 }],
              },
            ]}
          >
            <View
              style={[
                styles.quickIcon,
                { backgroundColor: scheme === 'dark' ? '#0F1216' : '#FBF3E6' },
              ]}
            >
              <IconSymbol name={a.icon} size={20} color={t.tint} />
            </View>
            <ThemedText style={[styles.quickTitle, { color: t.text }]}>{a.title}</ThemedText>
            <ThemedText style={[styles.quickSub, { color: t.mutedText }]} numberOfLines={2}>
              {a.subtitle}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      {/* Stats */}
      <View style={styles.sectionHeader}>
        <ThemedText style={[styles.sectionTitle, { color: t.text }]}>Статистика</ThemedText>
        <ThemedText style={[styles.sectionHint, { color: t.mutedText }]}>
          Қосымшадағы қолжетімді дерек саны
        </ThemedText>
      </View>

      <View style={styles.statsRow}>
        <StatPill label="Барлығы" value={stats.total} scheme={scheme} />
        <StatPill label="Маршрут" value={stats.routes} scheme={scheme} />
        <StatPill label="Нүкте" value={stats.places} scheme={scheme} />
      </View>

      {/* Data empty state (NO MOCK) */}
      {!loading && !error && !hasAnyData && (
        <View style={[styles.emptyCard, { backgroundColor: t.card, borderColor: t.border }]}>
          <IconSymbol name="tray.fill" size={18} color={t.icon} />
          <View style={{ flex: 1 }}>
            <ThemedText style={[styles.emptyTitle, { color: t.text }]}>Дерек әлі қосылмаған</ThemedText>
            <ThemedText style={[styles.emptySub, { color: t.mutedText }]}>
              `assets/data/silkroad.json` файлын нақты тарихи деректермен толтыр.
            </ThemedText>
          </View>

          <Pressable
            onPress={() => router.push('/routes')}
            style={({ pressed }) => [
              styles.primaryBtn,
              { backgroundColor: t.tint, opacity: pressed ? 0.9 : 1 },
            ]}
          >
            <ThemedText
              style={[
                styles.primaryBtnText,
                { color: scheme === 'dark' ? '#0F1216' : '#FFF9F0' },
              ]}
            >
              Маршруттар
            </ThemedText>
            <IconSymbol
              name="chevron.right"
              size={14}
              color={scheme === 'dark' ? '#0F1216' : '#FFF9F0'}
            />
          </Pressable>
        </View>
      )}

      {/* Featured (ONLY if flagged, NO fake fallback) */}
      {!loading && !error && hasAnyData && !hasFeatured && (
        <View style={[styles.infoCard, { backgroundColor: t.card, borderColor: t.border }]}>
          <IconSymbol name="info.circle.fill" size={18} color={t.icon} />
          <View style={{ flex: 1 }}>
            <ThemedText style={[styles.stateTitle, { color: t.text }]}>“Ұсынылатындар” бос</ThemedText>
            <ThemedText style={[styles.stateSub, { color: t.mutedText }]}>
              Басты бетте көрсету үшін деректеріңе `isFeatured: true` белгісін қой.
            </ThemedText>
          </View>
        </View>
      )}

      {!loading && !error && hasFeatured && (
        <>
          <View style={[styles.sectionHeader, { marginTop: 6 }]}>
            <ThemedText style={[styles.sectionTitle, { color: t.text }]}>Ұсынылатындар</ThemedText>
            <ThemedText style={[styles.sectionHint, { color: t.mutedText }]}>
              Белгіленген маңызды нысандар
            </ThemedText>
          </View>

          <View style={{ gap: 12 }}>
            {featured.routes.map((r) => (
              <Pressable
                key={r.id}
                onPress={() => openItem(r.id)}
                style={({ pressed }) => [
                  styles.featureCard,
                  {
                    backgroundColor: t.card,
                    borderColor: t.border,
                    transform: [{ scale: pressed ? 0.995 : 1 }],
                  },
                ]}
              >
                <View style={styles.featureTopRow}>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={[styles.featureTitle, { color: t.text }]}>{r.title}</ThemedText>
                    <ThemedText style={[styles.featureMeta, { color: t.mutedText }]} numberOfLines={2}>
                      {r.era ? `Кезеңі: ${r.era}` : 'Кезеңі: көрсетілмеген'}
                    </ThemedText>
                  </View>

                  <View style={[styles.chip, { borderColor: t.border }]}>
                    <IconSymbol
                      name="point.topleft.down.curvedto.point.bottomright.up.fill"
                      size={14}
                      color={t.icon}
                    />
                    <ThemedText style={[styles.chipText, { color: t.text }]}>Бағыт</ThemedText>
                  </View>
                </View>

                {!!r.tags?.length && (
                  <View style={styles.tagsRow}>
                    {r.tags.slice(0, 3).map((tag) => (
                      <View
                        key={tag}
                        style={[
                          styles.tag,
                          {
                            borderColor: t.border,
                            backgroundColor: scheme === 'dark' ? '#0F1216' : '#FBF3E6',
                          },
                        ]}
                      >
                        <ThemedText style={[styles.tagText, { color: t.mutedText }]}>{tag}</ThemedText>
                      </View>
                    ))}
                  </View>
                )}

                <View style={styles.featureBottomRow}>
                  <View style={styles.inlineRow}>
                    <IconSymbol name="doc.text.fill" size={14} color={t.icon} />
                    <ThemedText style={[styles.inlineText, { color: t.mutedText }]} numberOfLines={1}>
                      {r.short ? r.short : 'Қысқаша сипаттама жоқ'}
                    </ThemedText>
                  </View>

                  <View style={styles.inlineRowRight}>
                    <ThemedText style={[styles.linkText, { color: t.tint }]}>Ашу</ThemedText>
                    <IconSymbol name="chevron.right" size={14} color={t.tint} />
                  </View>
                </View>
              </Pressable>
            ))}

            {featured.places.map((p) => (
              <Pressable
                key={p.id}
                onPress={() => openItem(p.id)}
                style={({ pressed }) => [
                  styles.featureCard,
                  {
                    backgroundColor: t.card,
                    borderColor: t.border,
                    transform: [{ scale: pressed ? 0.995 : 1 }],
                  },
                ]}
              >
                <View style={styles.featureTopRow}>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={[styles.featureTitle, { color: t.text }]}>{p.name}</ThemedText>
                    <ThemedText style={[styles.featureMeta, { color: t.mutedText }]} numberOfLines={2}>
                      {p.era ? `Кезеңі: ${p.era}` : 'Кезеңі: көрсетілмеген'}
                    </ThemedText>
                  </View>

                  <View style={[styles.chip, { borderColor: t.border }]}>
                    <IconSymbol name="mappin.circle.fill" size={14} color={t.placeMarker} />
                    <ThemedText style={[styles.chipText, { color: t.text }]}>Нүкте</ThemedText>
                  </View>
                </View>

                {!!p.tags?.length && (
                  <View style={styles.tagsRow}>
                    {p.tags.slice(0, 3).map((tag) => (
                      <View
                        key={tag}
                        style={[
                          styles.tag,
                          {
                            borderColor: t.border,
                            backgroundColor: scheme === 'dark' ? '#0F1216' : '#FBF3E6',
                          },
                        ]}
                      >
                        <ThemedText style={[styles.tagText, { color: t.mutedText }]}>{tag}</ThemedText>
                      </View>
                    ))}
                  </View>
                )}

                <View style={styles.featureBottomRow}>
                  <View style={styles.inlineRow}>
                    <IconSymbol name="location.fill" size={14} color={t.placeMarker} />
                    <ThemedText style={[styles.inlineText, { color: t.mutedText }]} numberOfLines={1}>
                      {p.short ? p.short : 'Қысқаша сипаттама жоқ'}
                    </ThemedText>
                  </View>

                  <View style={styles.inlineRowRight}>
                    <ThemedText style={[styles.linkText, { color: t.tint }]}>Ашу</ThemedText>
                    <IconSymbol name="chevron.right" size={14} color={t.tint} />
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        </>
      )}

      <ThemedText style={[styles.footer, { color: t.mutedText }]}>
        Кеңес: дерек толтырған соң, басты бет автоматты түрде жаңарады. Жоғарыдан төмен тартып жаңартуға болады.
      </ThemedText>
    </ScrollView>
  );
}

function StatPill({ label, value, scheme }: { label: string; value: number; scheme: 'light' | 'dark' }) {
  const t = Colors[scheme];
  return (
    <View style={[styles.statPill, { backgroundColor: t.card, borderColor: t.border }]}>
      <ThemedText style={[styles.statValue, { color: t.text }]}>{value}</ThemedText>
      <ThemedText style={[styles.statLabel, { color: t.mutedText }]}>{label}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  content: {
    paddingHorizontal: 16,
    paddingTop: Platform.select({ ios: 14, android: 14, default: 14 }),
    gap: 14,
  },

  headerRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  kicker: { fontSize: 12, fontWeight: '700', letterSpacing: 0.2 },
  title: { fontSize: 26, fontWeight: '800', letterSpacing: 0.2, marginTop: 2 },
  subtitle: { fontSize: 13, fontWeight: '500', marginTop: 6, lineHeight: 18 },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  badgeText: { fontSize: 12, fontWeight: '800' },

  sectionHeader: { gap: 2, marginTop: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '800' },
  sectionHint: { fontSize: 12, fontWeight: '600' },

  // ✅ адаптивно: 3 карточки в ряд, но с нормальными размерами
  quickGrid: { flexDirection: 'row', gap: 10 },
  quickCard: {
    flex: 1,
    minHeight: 108,
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
    gap: 6,
  },
  quickIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickTitle: { fontSize: 14, fontWeight: '800', marginTop: 2 },
  quickSub: { fontSize: 12, fontWeight: '600', lineHeight: 16 },

  statsRow: { flexDirection: 'row', gap: 10 },
  statPill: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  statValue: { fontSize: 18, fontWeight: '900' },
  statLabel: { fontSize: 12, fontWeight: '700' },

  stateCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  stateTitle: { fontSize: 14, fontWeight: '900' },
  stateSub: { fontSize: 12, fontWeight: '600', lineHeight: 16, marginTop: 2 },

  smallBtn: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  smallBtnText: { fontSize: 12, fontWeight: '900' },

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

  primaryBtn: {
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { fontSize: 13, fontWeight: '900' },

  infoCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },

  featureCard: { borderRadius: 18, borderWidth: 1, padding: 14, gap: 10 },
  featureTopRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  featureTitle: { fontSize: 15, fontWeight: '900' },
  featureMeta: { fontSize: 12, fontWeight: '600', marginTop: 2, lineHeight: 16 },

  chip: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  chipText: { fontSize: 12, fontWeight: '800' },

  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  tagText: { fontSize: 12, fontWeight: '700' },

  featureBottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  inlineRow: { flexDirection: 'row', gap: 6, alignItems: 'center', flex: 1 },
  inlineRowRight: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  inlineText: { fontSize: 12, fontWeight: '700', flex: 1 },
  linkText: { fontSize: 12, fontWeight: '900' },

  footer: { fontSize: 12, fontWeight: '600', marginTop: 6, lineHeight: 16 },
});