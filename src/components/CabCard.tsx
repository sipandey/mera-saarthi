import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { formatRs } from '../utils';
import { styles } from '../theme';
import type { Cab, Hire } from '../types';

export function CabCard({
  cab,
  kind,
  hours,
  hindi,
  t,
  onBook,
}: {
  cab: Cab;
  kind: Hire;
  hours: string;
  hindi: boolean;
  t: (key: string) => string;
  onBook: () => void;
}) {
  const fare = Number(hours) >= 8 ? cab.fullDay : cab.hourly * Math.max(1, Number(hours) || 1);

  return (
    <View style={styles.cabCard}>
      <View style={styles.vehiclePhotoFrame}>{cab.vehiclePhotoUrl?.startsWith('demo-photo://') ? <Text style={styles.carIconText}>🚘</Text> : cab.vehiclePhotoUrl ? <Image accessibilityLabel={t('vehiclePhoto')} source={{ uri: cab.vehiclePhotoUrl }} style={styles.vehiclePhotoImage} /> : <Text style={styles.carIconText}>🚕</Text>}</View>
      <View style={{ flex: 1, minWidth: 120 }}>
        <Text style={styles.cabName}>{cab.name}</Text>
        <Text style={styles.cabMeta}>{t(`vehicle${cab.type}`)} · {cab.seats} {t('seatUnit')}</Text>
        <View style={styles.driverPhotoRow}><View style={styles.driverPhotoFrame}>{cab.driverPhotoUrl === 'demo-photo://selfie' ? <Text>👤</Text> : cab.driverPhotoUrl ? <Image accessibilityLabel={t('driverPhoto')} source={{ uri: cab.driverPhotoUrl }} style={styles.driverPhotoImage} /> : <Text style={styles.driverInitial}>{cab.ownerName.trim().charAt(0).toUpperCase()}</Text>}</View><View style={{ flex: 1 }}><Text style={styles.ownerMeta}>{cab.ownerName}</Text><Text style={styles.verifiedDriver}>{t('verifiedDriver')} · {t('available')}</Text></View></View>
      </View>
      <View style={styles.rateCol}>
        <Text style={styles.rate}>{formatRs(kind === 'local' ? cab.hourly : cab.perKm)}</Text>
        <Text style={styles.rateUnit}>{kind === 'local' ? t('perHourUnit') : `${t('perKmUnit')} · ${t('oneWay')}`}</Text>
      </View>
      <View style={styles.cardBottom}>
        <View style={{ flex: 1, paddingRight: 10 }}>
          <Text style={styles.secondaryRate}>{kind === 'local' ? `${t('quote')}: ${formatRs(fare)} · ${formatRs(cab.fullDay)} ${t('fullDay')}` : t('outstationFare')}</Text>
          <Text style={styles.cashLine}>● {t('cash')}</Text>
        </View>
        <Pressable accessibilityRole="button" onPress={onBook} style={styles.bookSmall}><Text style={styles.bookSmallText}>{t('select')}</Text></Pressable>
      </View>
    </View>
  );
}
