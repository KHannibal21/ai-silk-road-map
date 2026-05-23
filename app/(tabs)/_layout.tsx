// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const scheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
  const t = Colors[scheme];
  const insets = useSafeAreaInsets();

  // Высота “корпуса” таббара (без учета safe-area)
  const baseHeight = 62;

  // Паддинги таббара
  const paddingTop = 8;
  const paddingBottom = 10 + Math.max(insets.bottom, 0);

  // Итоговая высота (учитываем нижний safe area)
  const height = baseHeight + Math.max(insets.bottom, 0);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,

        tabBarButton: HapticTab,
        tabBarActiveTintColor: t.tabIconSelected,
        tabBarInactiveTintColor: t.tabIconDefault,

        tabBarStyle: {
          backgroundColor: t.tabBarBackground,
          borderTopColor: t.border,
          borderTopWidth: 1,

          height,
          paddingTop,
          paddingBottom,

          ...(Platform.OS === 'ios'
            ? {
                shadowColor: '#000',
                shadowOpacity: scheme === 'dark' ? 0.25 : 0.12,
                shadowRadius: 12,
                shadowOffset: { width: 0, height: -6 },
              }
            : {}),
        },

        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Басты',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="house.fill" color={color} />,
        }}
      />

      <Tabs.Screen
        name="map"
        options={{
          title: 'Карта',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="map.fill" color={color} />,
        }}
      />

      <Tabs.Screen
        name="routes"
        options={{
          title: 'Маршруттар',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="point.topleft.down.curvedto.point.bottomright.up.fill" color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="ai"
        options={{
          title: 'AI гид',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="sparkles" color={color} />,
        }}
      />
    </Tabs>
  );
}