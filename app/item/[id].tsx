// app/item/[id].tsx
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

import {
  loadSilkRoadDataset,
  RegionKey,
  SilkRoadPlace,
  SilkRoadRoute,
} from '@/assets/data/silkroad-repo';

type Item = { type: 'place'; data: SilkRoadPlace } | { type: 'route'; data: SilkRoadRoute };

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
  return scheme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.045)';
}

function kindLabel(k: SilkRoadPlace['kind']) {
  switch (k) {
    case 'қала':
      return 'Қала';
    case 'қамал':
      return 'Қамал';
    case 'керуен-сарай':
      return 'Керуен-сарай';
    case 'асу':
      return 'Асу';
    case 'қоныс':
      return 'Қоныс';
    case 'ескерткіш':
      return 'Ескерткіш';
    default:
      return 'Нысан';
  }
}

function polylineToCoords(r: SilkRoadRoute) {
  return (r.polyline ?? []).map((x) => ({ latitude: x.lat, longitude: x.lng }));
}

function calcRegionFromCoords(coords: Array<{ latitude: number; longitude: number }>): Region {
  let minLat = coords[0].latitude;
  let maxLat = coords[0].latitude;
  let minLng = coords[0].longitude;
  let maxLng = coords[0].longitude;

  for (const c of coords) {
    minLat = Math.min(minLat, c.latitude);
    maxLat = Math.max(maxLat, c.latitude);
    minLng = Math.min(minLng, c.longitude);
    maxLng = Math.max(maxLng, c.longitude);
  }

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max(1.2, (maxLat - minLat) * 1.6),
    longitudeDelta: Math.max(1.2, (maxLng - minLng) * 1.6),
  };
}

function normalizeParam(v?: string | string[]) {
  if (!v) return '';
  if (Array.isArray(v)) return v[0] ?? '';
  return v;
}

export default function ItemScreen() {
  const router = useRouter();
  const scheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
  const t = Colors[scheme];
  const muted = mutedTextColor(scheme);
  const insets = useSafeAreaInsets();

  const params = useLocalSearchParams<{ id?: string }>();
  const id = useMemo(() => normalizeParam(params?.id), [params]);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [item, setItem] = useState<Item | null>(null);
  const [allPlaces, setAllPlaces] = useState<SilkRoadPlace[]>([]);

  const mapRef = useRef<MapView>(null);

  const load = async () => {
    setErr(null);
    setLoading(true);
    try {
      const ds = await loadSilkRoadDataset();

      const place = (ds.places ?? []).find((p) => p.id === id);
      const routeItem = (ds.routes ?? []).find((r) => r.id === id);

      setAllPlaces(ds.places ?? []);

      if (place) setItem({ type: 'place', data: place });
      else if (routeItem) setItem({ type: 'route', data: routeItem });
      else setItem(null);
    } catch (e: any) {
      setErr(e?.message ?? 'Қате шықты');
      setItem(null);
      setAllPlaces([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!id) {
      setItem(null);
      setLoading(false);
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const headerTitle = useMemo(() => {
    if (!item) return 'Мәлімет';
    return item.type === 'place' ? item.data.name : item.data.title;
  }, [item]);

  const mapPreview = useMemo(() => {
    if (!item) return null;

    if (item.type === 'place') {
      const p = item.data;
      const region: Region = {
        latitude: p.lat,
        longitude: p.lng,
        latitudeDelta: 1.4,
        longitudeDelta: 1.4,
      };
      return {
        type: 'place' as const,
        region,
        marker: { lat: p.lat, lng: p.lng, title: p.name },
        coords: [] as Array<{ latitude: number; longitude: number }>,
      };
    }

    const r = item.data;
    const coords = polylineToCoords(r);
    if (!coords.length) return { type: 'route' as const, coords: [], region: null as any };

    const region = calcRegionFromCoords(coords);
    return { type: 'route' as const, coords, region };
  }, [item]);

  const routePlaces = useMemo(() => {
    if (!item || item.type !== 'route') return [];
    const ids = item.data.placeIds ?? [];
    if (!ids.length) return [];

    const map = new Map(allPlaces.map((p) => [p.id, p] as const));
    return ids.map((pid) => map.get(pid)).filter(Boolean) as SilkRoadPlace[];
  }, [item, allPlaces]);

  const openOnMap = () => {
    if (!item) return;
    router.push({
      pathname: '/(tabs)/map',
      params: {
        focus: item.data.id,
        type: item.type,
        ts: String(Date.now()),
      },
    });
  };

  const askAi = () => {
    if (!item) return;

    const q =
      item.type === 'place'
        ? `${item.data.name} туралы түсіндір: тарихи рөлі, Жібек жолындағы маңызы, негізгі даталар/кезеңдер және 3–6 нақты дерек.`
        : `${item.data.title} маршруты туралы түсіндір: қай аймақтардан өтеді, қандай негізгі қалалар/нысандар бар, тарихи маңызы және қандай дәуірлерде маңызды болды.`;

    router.push({
      pathname: '/(tabs)/ai',
      params: { q, autosend: '1', ts: String(Date.now()) },
    });
  };

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  };

  const showMapPreview = !!item && !!mapPreview?.region;

  // После загрузки данных и получения региона, анимируем карту к региону
  useEffect(() => {
    if (mapPreview?.region && mapRef.current) {
      setTimeout(() => {
        mapRef.current?.animateToRegion(mapPreview.region!, 300);
      }, 100);
    }
  }, [mapPreview]);

  return (
    <View style={[styles.screen, { backgroundColor: t.background }]}>
      {/* Custom header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: t.background,
            borderBottomColor: t.border,
            paddingTop: Math.max(insets.top, 0) + 10,
          },
        ]}
      >
        <Pressable
          onPress={goBack}
          style={({ pressed }) => [
            styles.headerBtn,
            { backgroundColor: t.card, borderColor: t.border, opacity: pressed ? 0.9 : 1 },
          ]}
          hitSlop={8}
        >
          <IconSymbol name="chevron.left" size={16} color={t.icon} />
        </Pressable>

        <View style={{ flex: 1 }}>
          <ThemedText style={[styles.headerTitle, { color: t.text }]} numberOfLines={1}>
            {headerTitle}
          </ThemedText>

          <ThemedText style={[styles.headerSub, { color: muted }]} numberOfLines={1}>
            {item
              ? item.type === 'place'
                ? `${kindLabel(item.data.kind)} • ${regionLabel(item.data.regionKey)}`
                : `Бағыт • ${regionLabel(item.data.regionKey)}`
              : loading
                ? 'Жүктелуде…'
                : 'Табылмады'}
          </ThemedText>
        </View>

        <Pressable
          onPress={askAi}
          disabled={!item || loading}
          style={({ pressed }) => [
            styles.headerBtn,
            {
              backgroundColor: !item || loading ? t.border : t.tint,
              borderColor: !item || loading ? t.border : t.tint,
              opacity: pressed ? 0.9 : 1,
            },
          ]}
          hitSlop={8}
        >
          <IconSymbol name="sparkles" size={16} color={scheme === 'dark' ? '#0F1216' : '#FFF9F0'} />
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 0) + 22 }]}
        keyboardShouldPersistTaps="handled"
      >
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

        {!loading && !err && !item && (
          <View style={[styles.stateCard, { backgroundColor: t.card, borderColor: t.border }]}>
            <IconSymbol name="questionmark.folder.fill" size={16} color={t.icon} />
            <ThemedText style={[styles.stateText, { color: muted }]} numberOfLines={6}>
              Бұл ID бойынша нысан табылмады: {id || '(бос)'}.
              {'\n'}JSON дерегіндегі `routes` немесе `places` ішіндегі `id` мәнін тексер.
            </ThemedText>
          </View>
        )}

        {/* Map preview */}
        {!!item && (
          <View style={[styles.mapCard, { backgroundColor: t.card, borderColor: t.border }]}>
            <View style={styles.mapHeaderRow}>
              <View style={{ flex: 1 }}>
                <ThemedText style={[styles.sectionTitle, { color: t.text }]}>Орналасуы</ThemedText>
                <ThemedText style={[styles.sectionHint, { color: muted }]} numberOfLines={2}>
                  {item.type === 'place'
                    ? 'Нүкте картада көрсетілді.'
                    : mapPreview?.coords?.length
                      ? 'Маршрут сызығы және негізгі нүктелер картада көрсетілді.'
                      : 'Маршрут координатасы жоқ (polyline бос).'}
                </ThemedText>
              </View>

              <Pressable
                onPress={openOnMap}
                disabled={!item}
                style={({ pressed }) => [
                  styles.smallBtn,
                  {
                    backgroundColor: subtleBg(scheme),
                    borderColor: t.border,
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
                hitSlop={8}
              >
                <IconSymbol name="map.fill" size={14} color={t.tint} />
                <ThemedText style={[styles.smallBtnText, { color: t.text }]}>Карта</ThemedText>
              </Pressable>
            </View>

            {showMapPreview ? (
              <View style={styles.mapWrap}>
                <MapView
                  ref={mapRef}
                  provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
                  style={styles.map}
                  initialRegion={mapPreview!.region}
                  pitchEnabled={false}
                  rotateEnabled={false}
                  toolbarEnabled={false}
                  scrollEnabled={false}
                  zoomEnabled={false}
                  pointerEvents="none"
                >
                  {mapPreview!.type === 'place' && (
                    <Marker
                      coordinate={{
                        latitude: mapPreview!.marker.lat,
                        longitude: mapPreview!.marker.lng,
                      }}
                      title={mapPreview!.marker.title}
                    />
                  )}

                  {mapPreview!.type === 'route' && mapPreview!.coords.length > 0 && (
                    <>
                      <Polyline
                        coordinates={mapPreview!.coords}
                        strokeWidth={4}
                        strokeColor={scheme === 'dark' ? 'rgba(230,190,138,0.7)' : 'rgba(183,110,75,0.7)'}
                      />
                      {/* Маркеры для ключевых точек маршрута */}
                      {routePlaces.map(place => (
                        <Marker
                          key={place.id}
                          coordinate={{ latitude: place.lat, longitude: place.lng }}
                          title={place.name}
                          description={kindLabel(place.kind)}
                          pinColor={t.placeMarker}
                        />
                      ))}
                    </>
                  )}
                </MapView>
              </View>
            ) : (
              <View style={[styles.note, { backgroundColor: subtleBg(scheme), borderColor: t.border }]}>
                <IconSymbol name="info.circle.fill" size={16} color={t.icon} />
                <ThemedText style={[styles.noteText, { color: muted }]}>
                  Карта превьюі көрсетілмейді: бұл маршрутта `polyline` жоқ. Бірақ толық картада “Карта” батырмасымен
                  ашуға болады.
                </ThemedText>
              </View>
            )}
          </View>
        )}

        {/* Details */}
        {!!item && (
          <>
            <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }]}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <ThemedText style={[styles.cardTitle, { color: t.text }]}>
                    {item.type === 'place' ? item.data.name : item.data.title}
                  </ThemedText>

                  <View style={styles.metaRow}>
                    <MetaChip
                      scheme={scheme}
                      icon={
                        item.type === 'place'
                          ? 'mappin.circle.fill'
                          : 'point.topleft.down.curvedto.point.bottomright.up.fill'
                      }
                      text={item.type === 'place' ? kindLabel(item.data.kind) : 'Бағыт'}
                    />
                    <MetaChip scheme={scheme} icon="square.grid.2x2.fill" text={regionLabel(item.data.regionKey)} />
                    {!!item.data.era && <MetaChip scheme={scheme} icon="clock.fill" text={item.data.era} />}
                    {item.type === 'place' && (
                      <MetaChip
                        scheme={scheme}
                        icon="location.fill"
                        text={`${item.data.lat.toFixed(4)}, ${item.data.lng.toFixed(4)}`}
                      />
                    )}
                  </View>
                </View>

                <View style={[styles.typeBadge, { backgroundColor: subtleBg(scheme), borderColor: t.border }]}>
                  <IconSymbol
                    name={item.type === 'place' ? 'mappin.and.ellipse' : 'doc.text.fill'}
                    size={16}
                    color={t.icon}
                  />
                </View>
              </View>

              <ThemedText style={[styles.bodyText, { color: muted }]}>
                {item.data.short ? item.data.short : 'Қысқаша сипаттама жоқ. JSON дерегінде `short` өрісін толтыр.'}
              </ThemedText>

              {!!item.data.tags?.length && (
                <View style={styles.tagsRow}>
                  {item.data.tags.map((tag) => (
                    <View key={tag} style={[styles.tag, { backgroundColor: subtleBg(scheme), borderColor: t.border }]}>
                      <ThemedText style={[styles.tagText, { color: t.text }]}>{tag}</ThemedText>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.actionsRow}>
                <Pressable
                  onPress={askAi}
                  disabled={!item}
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    { backgroundColor: t.tint, opacity: pressed ? 0.9 : 1 },
                  ]}
                >
                  <IconSymbol name="sparkles" size={16} color={scheme === 'dark' ? '#0F1216' : '#FFF9F0'} />
                  <ThemedText style={[styles.primaryBtnText, { color: scheme === 'dark' ? '#0F1216' : '#FFF9F0' }]}>
                    AI-дан сұрау
                  </ThemedText>
                </Pressable>

                <Pressable
                  onPress={openOnMap}
                  style={({ pressed }) => [
                    styles.secondaryBtn,
                    { backgroundColor: subtleBg(scheme), borderColor: t.border, opacity: pressed ? 0.9 : 1 },
                  ]}
                >
                  <IconSymbol name="map.fill" size={16} color={t.tint} />
                  <ThemedText style={[styles.secondaryBtnText, { color: t.text }]}>Карта</ThemedText>
                </Pressable>
              </View>
            </View>

            {/* Route -> linked places */}
            {item.type === 'route' && (
              <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }]}>
                <View style={styles.sectionHeader}>
                  <ThemedText style={[styles.sectionTitle, { color: t.text }]}>Маршруттағы нүктелер</ThemedText>
                  <ThemedText style={[styles.sectionHint, { color: muted }]}>
                    {routePlaces.length ? `${routePlaces.length} нүкте` : 'Нүкте байланысы жоқ'}
                  </ThemedText>
                </View>

                {routePlaces.length === 0 ? (
                  <View style={[styles.note, { backgroundColor: subtleBg(scheme), borderColor: t.border }]}>
                    <IconSymbol name="info.circle.fill" size={16} color={t.icon} />
                    <ThemedText style={[styles.noteText, { color: muted }]}>
                      JSON-та осы маршрут үшін `placeIds` массивін толтыр.
                    </ThemedText>
                  </View>
                ) : (
                  <View style={{ gap: 10 }}>
                    {routePlaces.map((p) => (
                      <Pressable
                        key={p.id}
                        onPress={() => router.push(`/item/${encodeURIComponent(p.id)}`)}
                        style={({ pressed }) => [
                          styles.rowCard,
                          { backgroundColor: subtleBg(scheme), borderColor: t.border, opacity: pressed ? 0.92 : 1 },
                        ]}
                      >
                        <View style={styles.rowIcon}>
                          <IconSymbol name="mappin.circle.fill" size={16} color={t.tint} />
                        </View>

                        <View style={{ flex: 1 }}>
                          <ThemedText style={[styles.rowTitle, { color: t.text }]} numberOfLines={1}>
                            {p.name}
                          </ThemedText>
                          <ThemedText style={[styles.rowSub, { color: muted }]} numberOfLines={1}>
                            {kindLabel(p.kind)} • {regionLabel(p.regionKey)}
                            {p.era ? ` • ${p.era}` : ''}
                          </ThemedText>
                        </View>

                        <IconSymbol name="chevron.right" size={14} color={t.icon} />
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Place -> quick facts */}
            {item.type === 'place' && (
              <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }]}>
                <View style={styles.sectionHeader}>
                  <ThemedText style={[styles.sectionTitle, { color: t.text }]}>Қысқаша деректер</ThemedText>
                  <ThemedText style={[styles.sectionHint, { color: muted }]}>Конспект үшін</ThemedText>
                </View>

                <FactRow scheme={scheme} label="Түрі" value={kindLabel(item.data.kind)} />
                <FactRow scheme={scheme} label="Аймақ" value={regionLabel(item.data.regionKey)} />
                <FactRow scheme={scheme} label="Координата" value={`${item.data.lat}, ${item.data.lng}`} />
                <FactRow scheme={scheme} label="Кезең" value={item.data.era ? item.data.era : 'көрсетілмеген'} />
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function MetaChip({ scheme, icon, text }: { scheme: 'light' | 'dark'; icon: any; text: string }) {
  const t = Colors[scheme];
  return (
    <View style={[styles.metaChip, { borderColor: t.border, backgroundColor: subtleBg(scheme) }]}>
      <IconSymbol name={icon} size={13} color={t.icon} />
      <ThemedText style={[styles.metaText, { color: t.text }]}>{text}</ThemedText>
    </View>
  );
}

function FactRow({ scheme, label, value }: { scheme: 'light' | 'dark'; label: string; value: string }) {
  const t = Colors[scheme];
  const muted = mutedTextColor(scheme);

  return (
    <View style={[styles.factRow, { borderTopColor: t.border }]}>
      <ThemedText style={[styles.factLabel, { color: muted }]}>{label}</ThemedText>
      <ThemedText style={[styles.factValue, { color: t.text }]}>{value}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },

  header: {
    paddingHorizontal: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  headerBtn: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 14, fontWeight: '900' },
  headerSub: { fontSize: 12, fontWeight: '700', marginTop: 2 },

  content: { paddingHorizontal: 16, paddingTop: 14, gap: 12 },

  stateCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  stateText: { fontSize: 12, fontWeight: '700', flex: 1, lineHeight: 16 },

  mapCard: { borderRadius: 18, borderWidth: 1, padding: 14, gap: 10 },
  mapHeaderRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  mapWrap: { borderRadius: 16, overflow: 'hidden', height: 180 },
  map: { flex: 1 },

  card: { borderRadius: 18, borderWidth: 1, padding: 14, gap: 12 },
  cardTop: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  cardTitle: { fontSize: 16, fontWeight: '900', lineHeight: 20 },

  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  metaChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  metaText: { fontSize: 12, fontWeight: '800' },

  typeBadge: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  bodyText: { fontSize: 13, fontWeight: '600', lineHeight: 18 },

  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  tagText: { fontSize: 12, fontWeight: '800' },

  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 2 },
  primaryBtn: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { fontSize: 13, fontWeight: '900' },

  secondaryBtn: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 110,
  },
  secondaryBtnText: { fontSize: 13, fontWeight: '900' },

  sectionHeader: { gap: 2 },
  sectionTitle: { fontSize: 14, fontWeight: '900' },
  sectionHint: { fontSize: 12, fontWeight: '700' },

  note: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  noteText: { fontSize: 12, fontWeight: '700', flex: 1, lineHeight: 16 },

  rowCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: { fontSize: 13, fontWeight: '900' },
  rowSub: { fontSize: 12, fontWeight: '700', marginTop: 2 },

  factRow: {
    borderTopWidth: 1,
    paddingTop: 10,
    paddingBottom: 10,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  factLabel: { fontSize: 12, fontWeight: '800' },
  factValue: { fontSize: 12, fontWeight: '900', textAlign: 'right', flexShrink: 1 },

  smallBtn: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  smallBtnText: { fontSize: 12, fontWeight: '900' },
});