import React, { type ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { BookingCard } from '../components/BookingCard';
import { CabCard } from '../components/CabCard';
import { ChoiceChip, FormField, PrimaryButton, VehicleTypePicker } from '../components/Primitives';
import { LocationPicker } from '../components/LocationPicker';
import { styles } from '../theme';
import type { Booking, Cab, Hire, VehicleType } from '../types';

type Translate = (key: string) => string;

export function CustomerHomeContent({
  t,
  kind,
  localFrom,
  outstationFrom,
  availableCabCount,
  setKind,
  pickupArea,
  setPickupArea,
  hindi,
  onSearch,
  rolePicker,
}: {
  t: Translate;
  kind: Hire;
  localFrom: string;
  outstationFrom: string;
  availableCabCount: number;
  setKind: (value: Hire) => void;
  pickupArea: string;
  setPickupArea: (value: string) => void;
  hindi: boolean;
  onSearch: () => void;
  rolePicker: ReactNode;
}) {
  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.homeHero}>
        <View style={styles.homeBrandRow}>
          <Text style={styles.homeMark}>MS</Text>
          <View style={styles.homeBrandCopy}><Text style={styles.homeBrand}>{t('brand')}</Text><Text style={styles.homeStand}>{t('localStand')}</Text></View>
          <View style={styles.readyBadge}><View style={styles.readyDot} /><Text style={styles.readyText}>{availableCabCount} {t('cabsReady')}</Text></View>
        </View>
        <Text style={styles.homeEyebrow}>{t('ruralRides')}</Text>
        <Text style={styles.homeTitle}>{t('where')}</Text>
        <View style={styles.pickupCard}>
          <View style={styles.pickupPin}><Text style={styles.pickupPinText}>⌖</Text></View>
          <View style={styles.pickupCopy}><LocationPicker label={t('pickupArea')} value={pickupArea} onChange={setPickupArea} placeholder={t('pickupPlaceholder')} t={t} hindi={hindi} /></View>
        </View>
      </View>

      <View style={styles.sectionLine}><Text style={styles.sectionTitle}>{t('selectType')}</Text><Text style={styles.stepLabel}>{t('stepOne')}</Text></View>
      <View style={styles.typeRow}>
        <Pressable accessibilityRole="button" accessibilityState={{ selected: kind === 'local' }} onPress={() => setKind('local')} style={[styles.typeCard, kind === 'local' && styles.typeCardActive, styles.rideChoice]}>
          <View style={styles.choiceTop}><Text style={styles.typeEmoji}>⌂</Text><Text style={[styles.choiceRadio, kind === 'local' && styles.choiceRadioActive]}>{kind === 'local' ? '●' : '○'}</Text></View>
          <Text style={[styles.typeTitle, kind === 'local' && styles.typeTitleActive]}>{t('local')}</Text><Text style={styles.typeDescription}>{t('localDescription')}</Text><Text style={styles.typeRate}>{localFrom} {t('fullDayFrom')}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityState={{ selected: kind === 'outstation' }} onPress={() => setKind('outstation')} style={[styles.typeCard, kind === 'outstation' && styles.typeCardActive, styles.rideChoice]}>
          <View style={styles.choiceTop}><Text style={styles.typeEmoji}>↗</Text><Text style={[styles.choiceRadio, kind === 'outstation' && styles.choiceRadioActive]}>{kind === 'outstation' ? '●' : '○'}</Text></View>
          <Text style={[styles.typeTitle, kind === 'outstation' && styles.typeTitleActive]}>{t('outstation')}</Text><Text style={styles.typeDescription}>{t('outDescription')}</Text><Text style={styles.typeRate}>{outstationFrom}{t('perKmUnit')} · {t('oneWay')}</Text>
        </Pressable>
      </View>

      <View style={styles.cashBanner}><Text style={styles.cashIcon}>₹</Text><View style={styles.cashCopy}><Text style={styles.noteTitle}>{t('directCashTitle')}</Text><Text style={styles.noteBody}>{t('noOnlinePayment')}</Text></View><Text style={styles.cashCheck}>✓</Text></View>
      <PrimaryButton label={t('findAvailableCabs')} onPress={onSearch} />
      {rolePicker}
    </ScrollView>
  );
}

export function CustomerSearchContent({
  t, kind, pickupArea, setPickupArea, hindi, vehicleType, setVehicleType, date, setDate, time, setTime,
  hours, setHours, destination, setDestination, onSearch,
}: {
  t: Translate; kind: Hire; pickupArea: string; setPickupArea: (value: string) => void; hindi: boolean;
  vehicleType: VehicleType | 'Any'; setVehicleType: (value: VehicleType | 'Any') => void;
  date: string; setDate: (value: string) => void; time: string; setTime: (value: string) => void;
  hours: string; setHours: (value: string) => void; destination: string; setDestination: (value: string) => void;
  onSearch: () => void;
}) {
  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.summaryPanel}><Text style={styles.summaryTitle}>{kind === 'local' ? t('local') : t('outstation')}</Text><Text style={styles.summaryText}>{pickupArea}</Text></View>
      <View style={styles.panel}>
        <LocationPicker label={t('pickupArea')} value={pickupArea} onChange={setPickupArea} placeholder={t('pickupPlaceholder')} t={t} hindi={hindi} />
        <View style={styles.twoCol}><FormField label={t('date')} value={date} onChange={setDate} placeholder={t('datePlaceholder')} /><FormField label={t('time')} value={time} onChange={setTime} placeholder={t('timePlaceholder')} /></View>
        <Text style={styles.fieldLabel}>{t('vehicle')}</Text><VehicleTypePicker current={vehicleType} onPick={setVehicleType} t={t} />
        {kind === 'local' ? <><Text style={styles.fieldLabel}>{t('hours')} · {t('fullDayThreshold')}</Text><View style={styles.quickRow}>{[2, 4, 8, 12].map((value) => <ChoiceChip key={value} label={`${value} ${t('hoursShort')}`} active={Number(hours) === value} onPress={() => setHours(`${value}`)} />)}</View></> : <>
          <FormField label={t('destination')} value={destination} onChange={setDestination} placeholder={t('destinationPlaceholder')} />
          <Text style={styles.helper}>{t('outstationDistanceNote')}</Text>
          <FormField label={t('estimatedTripDuration')} value={hours} onChange={setHours} placeholder="4" keyboardType="numeric" />
        </>}
        <PrimaryButton label={t('findAvailableCabs')} onPress={onSearch} />
      </View>
    </ScrollView>
  );
}

export function SearchResultsContent({
  hindi,
  t,
  kind,
  vehicleType,
  pickupArea,
  date,
  time,
  hours,
  destination,
  results,
  onSelectCab,
  onAnyVehicle,
  onChangeSearch,
  rolePicker,
}: {
  hindi: boolean;
  t: Translate;
  kind: Hire;
  vehicleType: VehicleType | 'Any';
  pickupArea: string;
  date: string;
  time: string;
  hours: string;
  destination: string;
  results: Cab[];
  onSelectCab: (cab: Cab) => void;
  onAnyVehicle: () => void;
  onChangeSearch: () => void;
  rolePicker: ReactNode;
}) {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.summaryPanel}><Text style={styles.summaryTitle}>{kind === 'local' ? t('local') : t('outstation')} · {vehicleType === 'Any' ? t('anyVehicle') : t(`vehicle${vehicleType}`)}</Text><Text style={styles.summaryText}>{pickupArea} · {date} · {time}{kind === 'local' ? ` · ${hours} ${t('hours')}` : ` · ${destination}`}</Text></View>
      <Text style={styles.sectionTitle}>{results.length} {t('cabsFound')}</Text>
      {results.length ? results.map((cab) => <CabCard key={cab.id} cab={cab} kind={kind} hours={hours} hindi={hindi} t={t} onBook={() => onSelectCab(cab)} />) : <View style={styles.empty}><Text style={styles.emptyEmoji}>🚕</Text><Text style={styles.cabName}>{t('noResultsTitle')}</Text><Text style={styles.emptyText}>{t('noResults')}</Text>{vehicleType !== 'Any' && <Pressable accessibilityRole="button" onPress={onAnyVehicle} style={styles.cancelLink}><Text style={styles.confirmationEditText}>{t('anyVehicle')}</Text></Pressable>}<Pressable accessibilityRole="button" onPress={onChangeSearch} style={styles.cancelLink}><Text style={styles.confirmationEditText}>{t('changeSearch')}</Text></Pressable></View>}
      {rolePicker}
    </ScrollView>
  );
}

export function CustomerBookingsContent({
  bookings,
  hindi,
  t,
  onChangeStatus,
  onSearch,
  rolePicker,
}: {
  bookings: Booking[];
  hindi: boolean;
  t: Translate;
  onChangeStatus: (id: string, status: Booking['status']) => void;
  onSearch: () => void;
  rolePicker: ReactNode;
}) {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>{t('upcoming')}</Text>
      {bookings.length ? bookings.map((booking) => <BookingCard key={booking.id} booking={booking} hindi={hindi} t={t} onChangeStatus={onChangeStatus} />) : <View style={styles.empty}><Text style={styles.emptyEmoji}>🗓️</Text><Text style={styles.emptyText}>{t('noBooking')}</Text><PrimaryButton label={t('search')} onPress={onSearch} /></View>}
      {rolePicker}
    </ScrollView>
  );
}
