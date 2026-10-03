import React from 'react';
import { Alert, Linking, Pressable, Text, View } from 'react-native';
import { formatRs } from '../utils';
import { styles } from '../theme';
import type { Booking, BookingStatus } from '../types';

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
  onChangeStatus: (id: string, status: BookingStatus, reason?: string) => void;
}) {
  const accepted = booking.status === 'accepted';
  const pending = booking.status === 'pending';
  const contactName = ownerActions ? booking.customerName : booking.ownerName;
  const contactPhone = ownerActions ? booking.customerPhone : booking.ownerPhone;
  const contactAction = ownerActions ? 'callCustomer' : 'callDriver';
  const statusLabel = pending ? t('pending') : accepted ? t('accepted')
    : booking.status === 'rejected' ? t('rejected')
      : booking.status === 'expired' ? t('expired')
        : booking.status === 'completed' ? t('completed')
          : booking.statusReason === 'driver_no_show' ? t('reasonNoShowDriver')
            : booking.statusReason === 'customer_no_show' ? t('reasonNoShowCustomer') : t('cancelled');
  const statusStyle = accepted || booking.status === 'completed' ? styles.badgeGood : pending ? styles.badgeWait : styles.badgeMuted;
  const pickupAt = new Date(`${booking.date}T${booking.time}:00`);
  const canReportNoShow = accepted && Number.isFinite(pickupAt.getTime()) && Date.now() >= pickupAt.getTime();
  const reasonKey = booking.statusReason === 'reasonPlansChanged' ? 'reasonPlansChanged'
    : booking.statusReason === 'reasonBookedElsewhere' ? 'reasonBookedElsewhere'
      : booking.statusReason === 'reasonWrongDetails' ? 'reasonWrongDetails'
        : booking.statusReason === 'schedule_conflict' ? 'reasonSchedule'
          : booking.statusReason === 'cab_unavailable' ? 'reasonUnavailable'
            : booking.statusReason === 'driver_no_show' ? 'reasonNoShowDriver'
              : booking.statusReason === 'customer_no_show' ? 'reasonNoShowCustomer' : null;

  const cancel = () => {
    const reasons: Array<[string, string]> = ownerActions
      ? [['schedule_conflict', 'reasonSchedule'], ['cab_unavailable', 'reasonUnavailable']]
      : [['reasonPlansChanged', 'reasonPlansChanged'], ['reasonBookedElsewhere', 'reasonBookedElsewhere'], ['reasonWrongDetails', 'reasonWrongDetails']];
    Alert.alert(t('cancelQuestion'), t('reasonTitle'), [
      { text: t('keepBooking'), style: 'cancel' },
      ...reasons.map(([reason, label]) => ({ text: t(label), onPress: () => onChangeStatus(booking.id, 'cancelled', reason) })),
    ]);
  };

  const decline = () => Alert.alert(t('reasonTitle'), '', [
    { text: t('keepBooking'), style: 'cancel' },
    { text: t('reasonSchedule'), onPress: () => onChangeStatus(booking.id, 'rejected', 'schedule_conflict') },
    { text: t('reasonUnavailable'), style: 'destructive', onPress: () => onChangeStatus(booking.id, 'rejected', 'cab_unavailable') },
  ]);

  const reportNoShow = () => {
    if (!canReportNoShow) {
      Alert.alert(t('status'), t('noShowTooEarly'));
      return;
    }
    const reason = ownerActions ? 'customer_no_show' : 'driver_no_show';
    Alert.alert(t('reasonTitle'), t(ownerActions ? 'reasonNoShowCustomer' : 'reasonNoShowDriver'), [
      { text: t('keepBooking'), style: 'cancel' },
      { text: t('confirm'), style: 'destructive', onPress: () => onChangeStatus(booking.id, 'cancelled', reason) },
    ]);
  };

  const callContact = () => {
    const phone = contactPhone?.replace(/[^\d+]/g, '') ?? '';
    if (!/^\+?\d{7,15}$/.test(phone)) {
      Alert.alert(t('contactUnavailable'), t('contactNoPhone'));
      return;
    }
    void Linking.openURL(`tel:${phone}`).catch(() => {
      Alert.alert(t('contactUnavailable'), t('openDialerFailed'));
    });
  };

  return (
    <View style={styles.bookingCard}>
      <View style={styles.bookingTop}>
        <View style={{ flex: 1 }}><Text style={styles.cabName}>{booking.cabName}</Text><Text style={styles.cabMeta}>{booking.kind === 'local' ? t('local') : t('outstation')} · {t(`vehicle${booking.vehicleType}`)}</Text></View>
        <View style={[styles.badge, statusStyle]}><Text style={styles.badgeText}>{statusLabel}</Text></View>
      </View>
      <View style={styles.rule} />
      <Text style={styles.detailLine}>📅  {booking.date}   ·   {booking.time}</Text>
      <Text style={styles.detailLine}>📍  {booking.pickupArea || t('pickupDefault')}{booking.kind === 'outstation' ? ` → ${booking.destination} · ${formatRs(booking.perKmRate)}${t('perKmUnit')} · ${booking.hours} ${t('hours')}` : ` · ${booking.hours} ${t('hours')}`}</Text>
      {reasonKey && <Text style={styles.bookingHelper}>{t('reasonTitle')}: {t(reasonKey)}</Text>}
      <View style={styles.bookingBottom}>{booking.kind === 'local' ? <Text style={styles.bookingPrice}>{t('quote')}: {formatRs(booking.estimate)}</Text> : <Text style={styles.cashSmall}>{t('outstationFare')}</Text>}<Text style={styles.cashSmall}>{t('cash')}</Text></View>
      {ownerActions && pending && <View style={styles.actionStack}>
        <Pressable accessibilityRole="button" onPress={() => onChangeStatus(booking.id, 'accepted')} style={styles.acceptButton}><Text style={styles.acceptText}>{t('acceptShort')}</Text></Pressable>
        <Pressable accessibilityRole="button" onPress={decline} style={styles.rejectButton}><Text style={styles.rejectText}>{t('pass')}</Text></Pressable>
      </View>}
      {!ownerActions && (pending || accepted) && <Pressable accessibilityRole="button" onPress={cancel} style={styles.cancelLink}><Text style={styles.cancelText}>{t('cancel')}</Text></Pressable>}
      {ownerActions && accepted && <Pressable accessibilityRole="button" onPress={cancel} style={styles.cancelLink}><Text style={styles.cancelText}>{t('cancel')}</Text></Pressable>}
      {ownerActions && accepted && <Pressable accessibilityRole="button" onPress={() => Alert.alert(t('completeQuestion'), '', [{ text: t('keepBooking'), style: 'cancel' }, { text: t('completeTrip'), onPress: () => onChangeStatus(booking.id, 'completed') }])} style={styles.acceptButton}><Text style={styles.acceptText}>{t('completeTrip')}</Text></Pressable>}
      {canReportNoShow && <Pressable accessibilityRole="button" onPress={reportNoShow} style={styles.cancelLink}><Text style={styles.cancelText}>{ownerActions ? t('reasonNoShowCustomer') : t('reasonNoShowDriver')}</Text></Pressable>}
      {accepted && (contactPhone
        ? <Pressable accessibilityRole="button" accessibilityLabel={`${t(contactAction)} ${contactName}`} onPress={callContact} style={styles.callButton}><Text style={styles.ownerPhone}>☎  {t(contactAction)} · {contactName} · {contactPhone}</Text></Pressable>
        : <Text style={styles.bookingHelper}>{t('contactNoPhone')}</Text>)}
    </View>
  );
}
