import React, { type ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { BookingCard } from '../components/BookingCard';
import { styles } from '../theme';
import type { Account, Booking, Cab, Store } from '../types';

type Translate = (key: string) => string;

export function AdminScreen({
  store,
  live,
  hindi,
  t,
  rolePicker,
  onToggleAccount,
  onToggleVehicle,
  onChangeStatus,
}: {
  store: Store;
  live: boolean;
  hindi: boolean;
  t: Translate;
  rolePicker: ReactNode;
  onToggleAccount: (id: string, blocked: boolean, demoName?: string, owner?: boolean) => void;
  onToggleVehicle: (cab: Cab, available: boolean) => void;
  onChangeStatus: (id: string, status: Booking['status']) => void;
}) {
  const ownerAccounts = store.profiles.filter((profile) => profile.role === 'owner');
  const owners: Account[] = ownerAccounts.length ? ownerAccounts : Array.from(new Set(store.cabs.map((cab) => cab.ownerId))).map((id) => {
    const cab = store.cabs.find((item) => item.ownerId === id)!;
    return { id, role: 'owner', full_name: cab.ownerName, phone: cab.phone, is_blocked: store.blockedOwners.includes(id) };
  });
  const customerAccounts = store.profiles.filter((profile) => profile.role === 'customer');
  const customers: Account[] = store.profiles.length ? customerAccounts : Array.from(new Set(store.bookings.map((booking) => booking.customerName))).map((name) => ({ id: name, role: 'customer', full_name: name, phone: '', is_blocked: store.blockedCustomers.includes(name) }));

  const accountRow = (account: Account, owner: boolean) => {
    const blocked = account.is_blocked || (owner ? store.blockedOwners.includes(account.id) : store.blockedCustomers.includes(account.full_name));
    const count = owner
      ? store.cabs.filter((cab) => cab.ownerId === account.id).length
      : store.bookings.filter((booking) => booking.customerName === account.full_name).length;
    const countLabel = owner ? t('vehicles') : t('allBookings');
    return <View key={account.id} style={styles.adminRow}><View style={{ flex: 1 }}><Text style={styles.cabName}>{account.full_name}</Text><Text style={styles.cabMeta}>{account.phone} · {count} {countLabel}</Text></View><Pressable accessibilityRole="button" onPress={() => onToggleAccount(account.id, !blocked, account.full_name, owner)} style={[styles.adminAction, blocked && styles.adminActionOff]}><Text style={styles.adminActionText}>{blocked ? t('unblock') : t('block')}</Text></Pressable></View>;
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.statsRow}>{[[customers.length, t('customers')], [owners.length, t('owners')], [store.cabs.length, t('vehicles')], [store.bookings.length, t('allBookings')]].map(([value, label]) => <View key={label as string} style={styles.stat}><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>)}</View>
      <Text style={styles.sectionTitle}>{t('owners')} · {owners.length}</Text>
      {owners.map((account) => accountRow(account, true))}
      <Text style={styles.sectionTitle}>{t('customers')} · {customers.length}</Text>
      {customers.length ? customers.map((account) => accountRow(account, false)) : <Text style={styles.emptyText}>{t('customersAppear')}</Text>}
      <Text style={styles.sectionTitle}>{t('vehicles')} · {store.cabs.length}</Text>
      {store.cabs.map((cab) => { const unavailable = live ? !cab.available : store.blockedVehicles.includes(cab.id); return <View key={cab.id} style={styles.adminRow}><View style={{ flex: 1 }}><Text style={styles.cabName}>{cab.name}</Text><Text style={styles.cabMeta}>{cab.ownerName} · {t(`vehicle${cab.type}`)} · {cab.seats} {t('seats')}</Text></View><Pressable accessibilityRole="button" onPress={() => onToggleVehicle(cab, unavailable)} style={[styles.adminAction, unavailable && styles.adminActionOff]}><Text style={styles.adminActionText}>{unavailable ? t('unblock') : t('block')}</Text></Pressable></View>; })}
      <Text style={styles.sectionTitle}>{t('allBookings')} · {store.bookings.length}</Text>
      {store.bookings.length ? store.bookings.map((booking) => <BookingCard key={booking.id} booking={booking} hindi={hindi} t={t} onChangeStatus={onChangeStatus} />) : <Text style={styles.emptyText}>{t('noBooking')}</Text>}
      {rolePicker}
    </ScrollView>
  );
}
