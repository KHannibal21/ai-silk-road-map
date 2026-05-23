// constants/theme.ts

/**
 * "AI Silk Road Map" — тақырыптық түстер
 * Light: пергамент / құм / терракота
 * Dark: түнгі базальт / қола-алтын акцент
 */

const tintLight = '#B85C38'; // терракота (акцент)
const tintDark = '#E3B873'; // алтын-құм (акцент)

export const Colors = {
  light: {
    // Base
    background: '#FBF3E6', // пергамент
    text: '#1F2328',       // көмір-қара
    mutedText: '#5B6472',

    // Surfaces
    card: '#FFF9F0',
    border: '#E7D9C7',

    // Brand / Accent
    tint: tintLight,
    notification: tintLight,

    // Icons & Tabs
    icon: '#6C584C',
    tabIconDefault: '#9A8F84',
    tabIconSelected: tintLight,
    tabBarBackground: '#FFF6EA',

    // Map / Markers
    routePrimary: '#B85C38',
    routeSecondary: '#2A6F97',
    placeMarker: '#0F766E',

    // Status
    success: '#1B9C5D',
    warning: '#C97C1B',
    danger: '#C2410C',
  },

  dark: {
    // Base
    background: '#0F1216', // түнгі базальт
    text: '#F4EBDD',
    mutedText: '#B7BFCB',

    // Surfaces
    card: '#151A21',
    border: '#263040',

    // Brand / Accent
    tint: tintDark,
    notification: tintDark,

    // Icons & Tabs
    icon: '#CBB89A',
    tabIconDefault: '#7D8898',
    tabIconSelected: tintDark,
    tabBarBackground: '#12161D',

    // Map / Markers
    routePrimary: '#E3B873',
    routeSecondary: '#6AA9D8',
    placeMarker: '#2DD4BF',

    // Status
    success: '#22C55E',
    warning: '#F59E0B',
    danger: '#F97316',
  },
} as const;

export type AppColorScheme = keyof typeof Colors;