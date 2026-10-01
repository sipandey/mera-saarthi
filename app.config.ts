import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'Mera Saarthi',
  slug: 'mera-saarthi',
  scheme: 'merasaarthi',
  version: '1.0.0',
  orientation: 'portrait',
  userInterfaceStyle: 'light',
  android: {
    package: 'in.merasaarthi.cabs',
    versionCode: 1,
    adaptiveIcon: { backgroundColor: '#F2F7F3' },
  },
  plugins: [['expo-location', { locationWhenInUsePermission: 'Use your location to set the pickup place.' }]],
  extra: {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '',
  },
};

export default config;
