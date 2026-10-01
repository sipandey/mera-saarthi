import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { formatRs } from '../utils';
import { styles } from '../theme';
import type { Cab, Hire } from '../types';

export function BookingConfirmation({
  cab,
  kind,
  date,
  time,
  hours,
  pickupArea,
  destination,
  km,
  estimate,
  hindi,
  t,
  onSend,
  onChangeDetails,
}: {
  cab: Cab;
  kind: Hire;
  date: string;
  time: string;
  hours: number;
  pickupArea: string;
  destination: string;
  km: number;
  estimate: number;
  hindi: boolean;
  t: (key: string) => string;
  onSend: () => void;
  onChangeDetails: () => void;
}) {
  return (
    <View style={styles.confirmationContent}>
      <View style={styles.confirmationTrust}><Text style={styles.confirmationTrustIcon}>✓</Text><View style={{ flex: 1 }}><Text style={styles.confirmationTrustTitle}>{t('directCashTitle')}</Text><Text style={styles.confirmationTrustBody}>{t('noOnlinePayment')}</Text></View></View>
      <View style={styles.bookingReview}>
        <Text style={styles.confirmationEyebrow}>{t('yourBooking')}</Text>
        <Text style={styles.confirmationVehicle}>{cab.name}</Text>
        <Text style={styles.confirmationMeta}>{t(`vehicle${cab.type}`)} · {cab.seats} {t('seatUnit')} · {cab.ownerName}</Text>
        <View style={styles.confirmationRule} />
        <Text style={styles.confirmationLabel}>{t('pickup')}</Text>
        <Text style={styles.confirmationValue}>{pickupArea}</Text>
        <Text style={styles.confirmationLabel}>{t('dateAndTime')}</Text>
        <Text style={styles.confirmationValue}>{date} · {time}</Text>
        <Text style={styles.confirmationLabel}>{t('trip')}</Text>
        <Text style={styles.confirmationValue}>{kind === 'local'
          ? `${t('localShort')} · ${hours} ${t('hoursUnit')}`
          : `${t('outstationShort')} · ${destination} · ${km} ${t('kmUnit')} ${t('oneWay')}`}</Text>
        <View style={styles.confirmationFare}><View style={{ flex: 1 }}><Text style={styles.confirmationFareLabel}>{t('estimatedFare')}</Text><Text style={styles.confirmationMeta}>{t('driverConfirmsFare')}</Text></View><Text style={styles.confirmationPrice}>{formatRs(estimate)}</Text></View>
      </View>
      <Pressable accessibilityRole="button" onPress={onSend} style={styles.primary}><Text style={styles.primaryText}>{t('sendBooking')}  →</Text></Pressable>
      <Pressable accessibilityRole="button" onPress={onChangeDetails} style={styles.confirmationEdit}><Text style={styles.confirmationEditText}>{t('changeDetails')}</Text></Pressable>
    </View>
  );
}
