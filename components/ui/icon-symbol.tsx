// components/ui/icon-symbol.tsx
// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolViewProps, SymbolWeight } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

type IconMapping = Record<SymbolViewProps['name'], ComponentProps<typeof MaterialIcons>['name']>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * SF Symbols → Material Icons mapping.
 * Add every SF Symbol name you used in the app here.
 * Directory: https://icons.expo.fyi
 */
const MAPPING = {
  // Tabs / basics
  'house.fill': 'home',
  'map.fill': 'map',
  'sparkles': 'auto-awesome',
  'doc.text.fill': 'description',

  // Actions
  'paperplane.fill': 'send',
  'arrow.clockwise': 'refresh',
  'trash.fill': 'delete',
  'scope': 'my-location',
  'magnifyingglass': 'search',
  'xmark': 'close',
  'exclamationmark.triangle.fill': 'warning',
  'tray.fill': 'inbox',
  'questionmark.folder.fill': 'help',
  'info.circle.fill': 'info',

  // Navigation / arrows
  'chevron.left': 'chevron-left',
  'chevron.right': 'chevron-right',
  'chevron.left.forwardslash.chevron.right': 'code',

  // Map / markers
  'mappin.and.ellipse': 'place',
  'mappin.circle.fill': 'place',
  'location.fill': 'my-location',

  // Route icon
  'point.topleft.down.curvedto.point.bottomright.up.fill': 'alt-route',

  // Region icons
  'square.grid.2x2.fill': 'grid-view',
  'sun.max.fill': 'wb-sunny',
  'leaf.fill': 'park',
  'drop.fill': 'water-drop',
  'mountain.2.fill': 'terrain',
  'wind': 'air',
} as const satisfies IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS (via names),
 * and Material Icons on Android/web with explicit mapping.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}