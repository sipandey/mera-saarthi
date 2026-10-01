import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { styles } from '../theme';
import type { Role } from '../types';

type Tab = 'home' | 'results' | 'bookings' | 'owner' | 'admin';

export function BottomNavigation({
  role,
  active,
  live,
  t,
  onNavigate,
}: {
  role: Role;
  active: Tab;
  live: boolean;
  t: (key: string) => string;
  onNavigate: (tab: Tab) => void;
}) {
  const tabs: { key: Tab; icon: string; label: string; destination: Tab }[] = role === 'customer'
    ? [{ key: 'home', icon: '⌂', label: t('homeTab'), destination: 'home' }, { key: 'results', icon: '⌕', label: t('availableCabs'), destination: 'results' }, { key: 'bookings', icon: '▣', label: t('myTrips'), destination: 'bookings' }]
    : role === 'owner'
      ? [{ key: 'owner', icon: '⌂', label: t('owner'), destination: 'owner' }, { key: 'bookings', icon: '▣', label: t('bookings'), destination: 'owner' }]
      : [{ key: 'admin', icon: '▦', label: t('admin'), destination: 'admin' }];

  return (
    <View style={styles.bottomNav}>
      {tabs.map((tab) => <Pressable key={tab.key} accessibilityRole="button" accessibilityState={{ selected: active === tab.key }} onPress={() => onNavigate(tab.destination)} style={styles.navItem}><Text style={[styles.navIcon, active === tab.key && styles.navActive]}>{tab.icon}</Text><Text style={[styles.navLabel, active === tab.key && styles.navActive]}>{tab.label}</Text></Pressable>)}
      <View style={styles.demoTag}><Text style={styles.demoTagText}>{live ? t('live') : t('demo')}</Text></View>
    </View>
  );
}
