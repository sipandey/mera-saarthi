import React from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { formatRs } from '../utils';
import { styles } from '../theme';
import type { Booking } from '../types';

export function BookingCard({
  booking,
  ownerActions = false,
  hindi,
  t,
  onChangeStatus,
}: {
  booking: Booking;
  ownerActions?: boolean;
  hindi: boolean;
  t: (key: string) => string;
  onChangeStatus: (id: string, status: Booking['status']) => void;
}) {
  const accepted = booking.status === 'accepted';
  const pending = booking.status === 'pending';
  const statusLabel = pending ? t('pending') : accepted ? t('accepted') : booking.status === 'rejected' ? t('rejected') : t('cancelled');
  const statusStyle = accepted ? styles.badgeGood : pending ? styles.badgeWait : styles.badgeMuted;

  const cancel = () => Alert.alert(
    t('cancelQuestion'),
    '',
    [
      { text: t('keepBooking') },
      { text: t('cancel'), style: 'destructive', onPress: () => onChangeStatus(booking.id, 'cancelled') },
    ],
  );

  return (
    <View style={styles.bookingCard}>
      <View style={styles.bookingTop}>
        <View style={{ flex: 1 }}><Text style={styles.cabName}>{booking.cabName}</Text><Text style={styles.cabMeta}>{booking.kind === 'local' ? t('local') : t('outstation')} · {t(`vehicle${booking.vehicleType}`)}</Text></View>
        <View style={[styles.badge, statusStyle]}><Text style={styles.badgeText}>{statusLabel}</Text></View>
      </View>
      <View style={styles.rule} />
      <Text style={styles.detailLine}>📅  {booking.date}   ·   {booking.time}</Text>
      <Text style={styles.detailLine}>📍  {booking.pickupArea || t('pickupDefault')}{booking.kind === 'outstation' ? ` → ${booking.destination} · ${booking.km} ${t('kmUnit')} (${t('oneWay')})` : ` · ${booking.hours} ${t('hours')}`}</Text>
      <View style={styles.bookingBottom}><Text style={styles.bookingPrice}>{t('quote')}: {formatRs(booking.estimate)}</Text><Text style={styles.cashSmall}>{t('cash')}</Text></View>
      {ownerActions && pending && <View style={styles.actionStack}>
        <Pressable accessibilityRole="button" onPress={() => onChangeStatus(booking.id, 'accepted')} style={styles.acceptButton}><Text style={styles.acceptText}>{t('acceptShort')}</Text></Pressable>
        <Pressable accessibilityRole="button" onPress={() => onChangeStatus(booking.id, 'rejected')} style={styles.rejectButton}><Text style={styles.rejectText}>{t('pass')}</Text></Pressable>
      </View>}
      {!ownerActions && booking.status !== 'cancelled' && booking.status !== 'rejected' && <Pressable accessibilityRole="button" onPress={cancel} style={styles.cancelLink}><Text style={styles.cancelText}>{t('cancel')}</Text></Pressable>}
      {accepted && <Text style={styles.ownerPhone}>☎  {booking.ownerName}: {booking.ownerPhone}</Text>}
      {ownerActions && accepted && <Text style={styles.ownerPhone}>☎  {booking.customerName}: {booking.customerPhone}</Text>}
    </View>
  );
}
