// app/(tabs)/map.tsx
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    View,
} from 'react-native';
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

const KZ_REGION: Region = {
  latitude: 48.0196,
  longitude: 66.9237,
  latitudeDelta: 18,
  longitudeDelta: 18,
};

const REGIONS: Array<{ key: RegionKey; label: string; icon: any }> = [
  { key: 'ontustik', label: 'Оңтүстік', icon: 'sun.max.fill' },
  { key: 'zhetysu', label: 'Жетісу', icon: 'leaf.fill' },
  { key: 'syrdarya', label: 'Сырдария', icon: 'drop.fill' },
  { key: 'shygys', label: 'Шығыс', icon: 'mountain.2.fill' },
  { key: 'batys', label: 'Батыс', icon: 'wind' },
];

function mutedTextColor(scheme: 'light' | 'dark') {
  return scheme === 'dark' ? 'rgba(240,233,221,0.72)' : 'rgba(44,44,44,0.62)';
}
function subtleBg(scheme: 'light' | 'dark') {
  return scheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';
}
function regionLabel(key: RegionKey) {
  return REGIONS.find((x) => x.key === key)?.label ?? 'Аймақ';
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
      return 'Нүкте';
  }
}
function polylineFor(r: SilkRoadRoute) {
  return (r.polyline ?? []).map((pt) => ({ latitude: pt.lat, longitude: pt.lng }));
}

export default function MapScreen() {
  const router = useRouter();
  const scheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
  const t = Colors[scheme];
  const muted = mutedTextColor(scheme);

  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();

  const mapRef = useRef<MapView | null>(null);

  // /map?focus=<id>&type=place|route
  const params = useLocalSearchParams<{ focus?: string; type?: 'place' | 'route' }>();
  const focusId = useMemo(() => {
    const raw = params?.focus;
    if (!raw) return '';
    return Array.isArray(raw) ? raw[0] ?? '' : raw;
  }, [params]);
  const focusType = useMemo(() => {
    const raw = params?.type;
    if (!raw) return undefined;
    return Array.isArray(raw) ? (raw[0] as any) : raw;
  }, [params]);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [places, setPlaces] = useState<SilkRoadPlace[]>([]);
  const [routes, setRoutes] = useState<SilkRoadRoute[]>([]);

  const [activeRegion, setActiveRegion] = useState<RegionKey | 'all'>('all');
  const [showRoutes, setShowRoutes] = useState(true);
  const [showPlaces, setShowPlaces] = useState(true);

  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);

  const load = async () => {
    setErr(null);
    setLoading(true);
    try {
      const ds = await loadSilkRoadDataset();
      setPlaces(ds.places ?? []);
      setRoutes(ds.routes ?? []);
    } catch (e: any) {
      setErr(e?.message ?? 'Қате шықты');
      setPlaces([]);
      setRoutes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredPlaces = useMemo(
    () => places.filter((p) => (activeRegion === 'all' ? true : p.regionKey === activeRegion)),
    [places, activeRegion]
  );
  const filteredRoutes = useMemo(
    () => routes.filter((r) => (activeRegion === 'all' ? true : r.regionKey === activeRegion)),
    [routes, activeRegion]
  );

  const selectedPlace = useMemo(
    () => places.find((p) => p.id === selectedPlaceId) ?? null,
    [places, selectedPlaceId]
  );
  const selectedRoute = useMemo(
    () => routes.find((r) => r.id === selectedRouteId) ?? null,
    [routes, selectedRouteId]
  );

  const statsLabel = useMemo(() => {
    const p = filteredPlaces.length;
    const r = filteredRoutes.length;
    if (activeRegion === 'all') return `${p} нүкте • ${r} бағыт`;
    return `${regionLabel(activeRegion as RegionKey)}: ${p} нүкте • ${r} бағыт`;
  }, [activeRegion, filteredPlaces.length, filteredRoutes.length]);

  const hasData = places.length + routes.length > 0;

  const fitToKazakhstan = () => {
    setSelectedPlaceId(null);
    setSelectedRouteId(null);
    mapRef.current?.animateToRegion(KZ_REGION, 450);
  };

  const focusOnPlace = (p: SilkRoadPlace) => {
    setSelectedRouteId(null);
    setSelectedPlaceId(p.id);
    setActiveRegion('all'); // чтобы маркер не исчезал фильтром
    mapRef.current?.animateToRegion(
      {
        latitude: p.lat,
        longitude: p.lng,
        latitudeDelta: 1.2,
        longitudeDelta: 1.2,
      },
      420
    );
  };

  const focusOnRoute = (r: SilkRoadRoute) => {
    setSelectedPlaceId(null);
    setSelectedRouteId(r.id);
    setActiveRegion('all');

    const coords = polylineFor(r);
    if (!coords.length) return;

    // ✅ Правильный fit для маршрута
    mapRef.current?.fitToCoordinates(coords, {
      edgePadding: {
        top: 140 + Math.round(insets.top),
        right: 40,
        bottom: 220 + Math.round(insets.bottom) + tabBarHeight,
        left: 40,
      },
      animated: true,
    });
  };

  const openDetails = (id: string) => router.push(`/item/${encodeURIComponent(id)}`);

  // AUTO-FOCUS после загрузки
  useEffect(() => {
    if (loading) return;
    if (!focusId) return;

    const place = places.find((p) => p.id === focusId);
    const route = routes.find((r) => r.id === focusId);

    if ((focusType === 'place' || !focusType) && place) {
      setShowPlaces(true);
      focusOnPlace(place);
      return;
    }
    if ((focusType === 'route' || !focusType) && route) {
      setShowRoutes(true);
      focusOnRoute(route);
      return;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, focusId, focusType, places, routes]);

  // ✅ Safe layout positions
  const TOP = 12 + Math.max(insets.top, 0);
  const BOTTOM_SHEET_BOTTOM = 12 + Math.max(insets.bottom, 0) + tabBarHeight;

  return (
    <View style={[styles.screen, { backgroundColor: t.background }]}>
      {/* Map */}
      <MapView
        ref={(r) => (mapRef.current = r)}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        style={styles.map}
        initialRegion={KZ_REGION}
        showsCompass
        showsScale
        showsMyLocationButton={false}
        toolbarEnabled={false}
      >
        {/* Routes */}
        {showRoutes &&
          filteredRoutes.map((r) => {
            const coords = polylineFor(r);
            if (!coords.length) return null;
            const isSelected = selectedRouteId === r.id;

            return (
              <Polyline
                key={r.id}
                coordinates={coords}
                strokeWidth={isSelected ? 5 : 4}
                strokeColor={
                  isSelected
                    ? t.tint
                    : scheme === 'dark'
                      ? 'rgba(230,190,138,0.55)'
                      : 'rgba(183,110,75,0.55)'
                }
                tappable
                onPress={() => {
                  setSelectedPlaceId(null);
                  setSelectedRouteId(r.id);
                }}
              />
            );
          })}

        {/* Places */}
        {showPlaces &&
          filteredPlaces.map((p) => {
            const isSelected = selectedPlaceId === p.id;

            return (
              <Marker
                key={p.id}
                coordinate={{ latitude: p.lat, longitude: p.lng }}
                onPress={() => {
                  setSelectedRouteId(null);
                  setSelectedPlaceId(p.id);
                }}
                title={p.name}
                description={`${kindLabel(p.kind)}${p.era ? ` • ${p.era}` : ''}`}
                // pinColor iOS/Android ок, но на iOS иногда игнорируется кастомными маркерами.
                pinColor={isSelected ? t.tint : t.placeMarker}
              />
            );
          })}
      </MapView>

      {/* ✅ Top overlay (safe-area aware) */}
      <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
        <View
          pointerEvents="auto"
          style={[
            styles.topOverlay,
            {
              top: TOP,
              backgroundColor: t.background,
              borderColor: t.border,
            },
          ]}
        >
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <ThemedText style={[styles.title, { color: t.text }]}>Карта</ThemedText>
              <ThemedText style={[styles.subtitle, { color: muted }]} numberOfLines={2}>
                {loading ? 'Дерек жүктелуде…' : err ? 'Қате болды' : statsLabel}
              </ThemedText>
            </View>

            <Pressable
              onPress={fitToKazakhstan}
              style={({ pressed }) => [
                styles.iconBtn,
                { backgroundColor: t.card, borderColor: t.border, opacity: pressed ? 0.9 : 1 },
              ]}
              hitSlop={8}
            >
              <IconSymbol name="scope" size={16} color={t.icon} />
            </Pressable>
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
                setActiveRegion('all');
                setSelectedPlaceId(null);
                setSelectedRouteId(null);
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
                  setActiveRegion(r.key);
                  setSelectedPlaceId(null);
                  setSelectedRouteId(null);
                }}
              />
            ))}
          </ScrollView>

          {/* Toggles + Reload */}
          <View style={styles.togglesRow}>
            <TogglePill
              label="Бағыттар"
              icon="point.topleft.down.curvedto.point.bottomright.up.fill"
              scheme={scheme}
              active={showRoutes}
              onPress={() => setShowRoutes((v) => !v)}
            />
            <TogglePill
              label="Нүктелер"
              icon="mappin.and.ellipse"
              scheme={scheme}
              active={showPlaces}
              onPress={() => setShowPlaces((v) => !v)}
            />

            <Pressable
              onPress={load}
              style={({ pressed }) => [
                styles.reloadBtn,
                { backgroundColor: t.card, borderColor: t.border, opacity: pressed ? 0.9 : 1 },
              ]}
              hitSlop={8}
            >
              <IconSymbol name="arrow.clockwise" size={16} color={t.icon} />
            </Pressable>
          </View>

          {/* States */}
          {loading && (
            <View style={[styles.stateRow, { borderColor: t.border, backgroundColor: t.card }]}>
              <ActivityIndicator size="small" color={t.tint} />
              <ThemedText style={[styles.stateText, { color: muted }]}>Дерек жүктелуде…</ThemedText>
            </View>
          )}

          {!loading && !!err && (
            <View style={[styles.stateRow, { borderColor: t.border, backgroundColor: t.card }]}>
              <IconSymbol name="exclamationmark.triangle.fill" size={16} color={t.tint} />
              <ThemedText style={[styles.stateText, { color: muted }]} numberOfLines={2}>
                {err}
              </ThemedText>
            </View>
          )}

          {!loading && !err && !hasData && (
            <View style={[styles.stateRow, { borderColor: t.border, backgroundColor: t.card }]}>
              <IconSymbol name="tray.fill" size={16} color={t.icon} />
              <ThemedText style={[styles.stateText, { color: muted }]} numberOfLines={2}>
                Дерек жоқ. `assets/data/silkroad.json` ішін тексер.
              </ThemedText>
            </View>
          )}
        </View>
      </View>

      {/* ✅ Bottom sheet (safe-area + tabbar aware) */}
      {(selectedPlace || selectedRoute) && (
        <View
          style={[
            styles.bottomSheet,
            {
              bottom: BOTTOM_SHEET_BOTTOM,
              backgroundColor: t.card,
              borderColor: t.border,
            },
          ]}
        >
          {selectedPlace && (
            <>
              <View style={styles.sheetTopRow}>
                <View style={{ flex: 1 }}>
                  <ThemedText style={[styles.sheetTitle, { color: t.text }]}>{selectedPlace.name}</ThemedText>

                  <View style={styles.sheetMetaRow}>
                    <MetaChip scheme={scheme} icon="mappin.circle.fill" text={kindLabel(selectedPlace.kind)} />
                    {selectedPlace.era ? <MetaChip scheme={scheme} icon="clock.fill" text={selectedPlace.era} /> : null}
                    <MetaChip scheme={scheme} icon="square.grid.2x2.fill" text={regionLabel(selectedPlace.regionKey)} />
                  </View>
                </View>

                <Pressable
                  onPress={() => focusOnPlace(selectedPlace)}
                  style={({ pressed }) => [
                    styles.iconBtn,
                    {
                      backgroundColor: subtleBg(scheme),
                      borderColor: t.border,
                      opacity: pressed ? 0.9 : 1,
                    },
                  ]}
                  hitSlop={8}
                >
                  <IconSymbol name="scope" size={16} color={t.tint} />
                </Pressable>
              </View>

              <ThemedText style={[styles.sheetText, { color: muted }]} numberOfLines={3}>
                {selectedPlace.short ? selectedPlace.short : 'Қысқаша сипаттама жоқ.'}
              </ThemedText>

              <View style={styles.sheetActions}>
                <Pressable
                  onPress={() => openDetails(selectedPlace.id)}
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    { backgroundColor: t.tint, opacity: pressed ? 0.9 : 1 },
                  ]}
                >
                  <ThemedText style={[styles.primaryBtnText, { color: scheme === 'dark' ? '#0F1216' : '#FFF9F0' }]}>
                    Мәлімет
                  </ThemedText>
                  <IconSymbol name="chevron.right" size={14} color={scheme === 'dark' ? '#0F1216' : '#FFF9F0'} />
                </Pressable>

                <Pressable
                  onPress={() => setSelectedPlaceId(null)}
                  style={({ pressed }) => [
                    styles.secondaryBtn,
                    { borderColor: t.border, backgroundColor: subtleBg(scheme), opacity: pressed ? 0.9 : 1 },
                  ]}
                >
                  <ThemedText style={[styles.secondaryBtnText, { color: t.text }]}>Жабу</ThemedText>
                </Pressable>
              </View>
            </>
          )}

          {selectedRoute && !selectedPlace && (
            <>
              <View style={styles.sheetTopRow}>
                <View style={{ flex: 1 }}>
                  <ThemedText style={[styles.sheetTitle, { color: t.text }]}>{selectedRoute.title}</ThemedText>

                  <View style={styles.sheetMetaRow}>
                    <MetaChip scheme={scheme} icon="point.topleft.down.curvedto.point.bottomright.up.fill" text="Бағыт" />
                    {selectedRoute.era ? <MetaChip scheme={scheme} icon="clock.fill" text={selectedRoute.era} /> : null}
                    <MetaChip scheme={scheme} icon="square.grid.2x2.fill" text={regionLabel(selectedRoute.regionKey)} />
                  </View>
                </View>

                <Pressable
                  onPress={() => focusOnRoute(selectedRoute)}
                  style={({ pressed }) => [
                    styles.iconBtn,
                    {
                      backgroundColor: subtleBg(scheme),
                      borderColor: t.border,
                      opacity: pressed ? 0.9 : 1,
                    },
                  ]}
                  hitSlop={8}
                >
                  <IconSymbol name="scope" size={16} color={t.tint} />
                </Pressable>
              </View>

              <ThemedText style={[styles.sheetText, { color: muted }]} numberOfLines={3}>
                {selectedRoute.short ? selectedRoute.short : 'Қысқаша сипаттама жоқ.'}
              </ThemedText>

              <View style={styles.sheetActions}>
                <Pressable
                  onPress={() => openDetails(selectedRoute.id)}
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    { backgroundColor: t.tint, opacity: pressed ? 0.9 : 1 },
                  ]}
                >
                  <ThemedText style={[styles.primaryBtnText, { color: scheme === 'dark' ? '#0F1216' : '#FFF9F0' }]}>
                    Мәлімет
                  </ThemedText>
                  <IconSymbol name="chevron.right" size={14} color={scheme === 'dark' ? '#0F1216' : '#FFF9F0'} />
                </Pressable>

                <Pressable
                  onPress={() => setSelectedRouteId(null)}
                  style={({ pressed }) => [
                    styles.secondaryBtn,
                    { borderColor: t.border, backgroundColor: subtleBg(scheme), opacity: pressed ? 0.9 : 1 },
                  ]}
                >
                  <ThemedText style={[styles.secondaryBtnText, { color: t.text }]}>Жабу</ThemedText>
                </Pressable>
              </View>
            </>
          )}
        </View>
      )}
    </View>
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

function TogglePill({
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
  const muted = mutedTextColor(scheme);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.toggle,
        {
          backgroundColor: active ? subtleBg(scheme) : t.card,
          borderColor: active ? t.tint : t.border,
          opacity: pressed ? 0.92 : 1,
        },
      ]}
    >
      <IconSymbol name={icon} size={14} color={active ? t.tint : t.icon} />
      <ThemedText style={[styles.toggleText, { color: active ? t.text : muted }]}>{label}</ThemedText>
    </Pressable>
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

const styles = StyleSheet.create({
  screen: { flex: 1 },
  map: { flex: 1 },

  topOverlay: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 10,
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
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

  filtersRow: { gap: 10, paddingVertical: 10, paddingRight: 6 },
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

  togglesRow: { flexDirection: 'row', gap: 10, marginTop: 2, alignItems: 'center' },
  toggle: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleText: { fontSize: 12, fontWeight: '800' },

  reloadBtn: {
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  stateRow: {
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  stateText: { fontSize: 12, fontWeight: '700', flex: 1 },

  bottomSheet: {
    position: 'absolute',
    left: 12,
    right: 12,
    marginBottom: '-15%',
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },

  sheetTopRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  sheetTitle: { fontSize: 15, fontWeight: '900' },

  sheetMetaRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 6 },
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

  sheetText: { fontSize: 12, fontWeight: '600', lineHeight: 16 },

  sheetActions: { flexDirection: 'row', gap: 10, marginTop: 2 },
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
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 92,
  },
  secondaryBtnText: { fontSize: 13, fontWeight: '900' },
});