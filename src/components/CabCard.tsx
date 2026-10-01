import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { formatRs } from '../utils';
import { styles } from '../theme';
import type { Cab, Hire } from '../types';

export function CabCard({
  cab,
  kind,
  hours,
  km,
  hindi,
  t,
  onBook,
}: {
  cab: Cab;
  kind: Hire;
  hours: string;
  km: string;
  hindi: boolean;
  t: (key: string) => string;
  onBook: () => void;
}) {
  const fare = kind === 'local'
    ? (Number(hours) >= 8 ? cab.fullDay : cab.hourly * Math.max(1, Number(hours) || 1))
    : cab.perKm * (Number(km) || 0);

  return (
    <View style={styles.cabCard}>
      <View style={styles.carIcon}><Text style={styles.carIconText}>🚕</Text></View>
      <View style={{ flex: 1, minWidth: 120 }}>
        <Text style={styles.cabName}>{cab.name}</Text>
        <Text style={styles.cabMeta}>{t(`vehicle${cab.type}`)} · {cab.seats} {t('seatUnit')}</Text>
        <Text style={styles.ownerMeta}>{cab.ownerName} · {t('available')}</Text>
      </View>
      <View style={styles.rateCol}>
        <Text style={styles.rate}>{formatRs(kind === 'local' ? cab.hourly : cab.perKm)}</Text>
        <Text style={styles.rateUnit}>{kind === 'local' ? t('perHourUnit') : `${t('perKmUnit')} · ${t('oneWay')}`}</Text>
      </View>
      <View style={styles.cardBottom}>
        <View style={{ flex: 1, paddingRight: 10 }}>
          <Text style={styles.secondaryRate}>{t('quote')}: {formatRs(fare)}{kind === 'local' ? ` · ${formatRs(cab.fullDay)} ${t('fullDay')}` : ` · ${km} ${t('kmUnit')} ${t('oneWay')}`}</Text>
          <Text style={styles.cashLine}>● {t('cash')}</Text>
        </View>
        <Pressable accessibilityRole="button" onPress={onBook} style={styles.bookSmall}><Text style={styles.bookSmallText}>{t('select')}</Text></Pressable>
      </View>
    </View>
  );
}
