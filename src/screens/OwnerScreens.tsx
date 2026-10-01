import React, { type ReactNode } from 'react';
import { Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { BookingCard } from '../components/BookingCard';
import { ChoiceChip, FormField, PrimaryButton } from '../components/Primitives';
import { styles, VEHICLES, C } from '../theme';
import { formatRs } from '../utils';
import type { Booking, Cab, VehicleType } from '../types';

type Translate = (key: string) => string;

export function OwnerDashboardContent({
  owned,
  bookings,
  ownerName,
  hindi,
  t,
  rolePicker,
  onAddVehicle,
  onEditVehicle,
  onToggleAvailability,
  onChangeStatus,
}: {
  owned: Cab[];
  bookings: Booking[];
  ownerName: string;
  hindi: boolean;
  t: Translate;
  rolePicker: ReactNode;
  onAddVehicle: () => void;
  onEditVehicle: (cab: Cab) => void;
  onToggleAvailability: (cabId: string, available: boolean) => void;
  onChangeStatus: (id: string, status: Booking['status']) => void;
}) {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.ownerHero}>
        <Text style={styles.heroEyebrow}>{t('ownerGreeting').replace('{{name}}', ownerName || t('driverHonorific'))}</Text>
        <Text style={styles.ownerHeroTitle}>{t('todayRides')}</Text>
        <Text style={styles.ownerHeroNumber}>{bookings.filter((booking) => booking.status === 'pending').length}</Text>
        <Text style={styles.ownerHeroCaption}>{t('requestsWaiting')}</Text>
      </View>
      <View style={styles.sectionLine}><Text style={styles.sectionTitle}>{t('myVehicle')}</Text><Pressable accessibilityRole="button" onPress={onAddVehicle}><Text style={styles.addLink}>＋ {t('addVehicle')}</Text></Pressable></View>
      {owned.map((cab) => <View key={cab.id} style={styles.ownerCab}>
        <View style={styles.ownerCabTop}><View style={styles.carIcon}><Text style={styles.carIconText}>🚕</Text></View><View style={{ flex: 1 }}><Text style={styles.cabName}>{cab.name}</Text><Text style={styles.cabMeta}>{t(`vehicle${cab.type}`)} · {cab.seats} {t('seats')}</Text><Text style={styles.availabilityLabel}>{cab.available ? t('cabAvailable') : t('cabUnavailable')}</Text></View><Switch accessibilityLabel={t('availability')} value={cab.available} onValueChange={(value) => onToggleAvailability(cab.id, value)} trackColor={{ true: C.green }} />
        </View>
        <View style={styles.rule} />
        <View style={styles.ratesRow}><Text style={styles.ownerRate}>{t('hourly')} {formatRs(cab.hourly)}</Text><Text style={styles.ownerRate}>{t('fullDay')} {formatRs(cab.fullDay)}</Text><Text style={styles.ownerRate}>{t('perKm')} {formatRs(cab.perKm)}</Text></View>
        <Pressable accessibilityRole="button" onPress={() => onEditVehicle(cab)}><Text style={styles.addLink}>{t('editVehicle')}  ✎</Text></Pressable>
      </View>)}
      <View style={styles.sectionLine}><Text style={styles.sectionTitle}>{t('upcoming')}</Text><Text style={styles.countBubble}>{bookings.length}</Text></View>
      {bookings.length ? bookings.map((booking) => <BookingCard key={booking.id} booking={booking} ownerActions hindi={hindi} t={t} onChangeStatus={onChangeStatus} />) : <Text style={styles.emptyText}>{t('noBooking')}</Text>}
      {rolePicker}
    </ScrollView>
  );
}

export function VehicleFormContent({
  hindi,
  t,
  newName,
  setNewName,
  newType,
  setNewType,
  newSeats,
  setNewSeats,
  newHourly,
  setNewHourly,
  newFullDay,
  setNewFullDay,
  newPerKm,
  setNewPerKm,
  onSave,
}: {
  hindi: boolean;
  t: Translate;
  newName: string;
  setNewName: (value: string) => void;
  newType: VehicleType;
  setNewType: (value: VehicleType) => void;
  newSeats: string;
  setNewSeats: (value: string) => void;
  newHourly: string;
  setNewHourly: (value: string) => void;
  newFullDay: string;
  setNewFullDay: (value: string) => void;
  newPerKm: string;
  setNewPerKm: (value: string) => void;
  onSave: () => void;
}) {
  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.panel}>
        <Text style={styles.sectionTitle}>{t('vehicleDetails')}</Text>
        <FormField label={t('vehicleName')} value={newName} onChange={setNewName} placeholder={t('vehiclePlaceholder')} />
        <Text style={styles.fieldLabel}>{t('vehicle')}</Text>
        <View style={styles.chipRow}>{VEHICLES.map((value) => <ChoiceChip key={value} label={t(`vehicle${value}`)} active={newType === value} onPress={() => setNewType(value)} />)}</View>
        <FormField label={t('seats')} value={newSeats} onChange={setNewSeats} keyboardType="numeric" />
        <Text style={styles.sectionTitle}>{t('saveRates')}</Text>
        <Text style={styles.helper}>{t('ownRates')}</Text>
        <FormField label={`${t('hourly')} (₹)`} value={newHourly} onChange={setNewHourly} keyboardType="numeric" />
        <FormField label={`${t('fullDay')} (₹)`} value={newFullDay} onChange={setNewFullDay} keyboardType="numeric" />
        <FormField label={t('rateOutstation')} value={newPerKm} onChange={setNewPerKm} keyboardType="numeric" />
        <PrimaryButton label={t('save')} onPress={onSave} />
      </View>
    </ScrollView>
  );
}
