import React, { type ReactNode } from 'react';
import { Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { BookingCard } from '../components/BookingCard';
import { ChoiceChip, FormField, PrimaryButton } from '../components/Primitives';
import { styles, VEHICLES, C } from '../theme';
import { formatRs, todayInIndia } from '../utils';
import type { Booking, Cab, DocumentType, VerificationDocument, VehicleType } from '../types';

type Translate = (key: string) => string;

export function OwnerDashboardContent({
  owned,
  bookings,
  ownerName,
  ownerReviewStatus,
  showDriverPhoto,
  pushState,
  focusBookingId,
  hindi,
  t,
  rolePicker,
  onAddVehicle,
  onEditVehicle,
  onToggleAvailability,
  onChangeStatus,
  onEnablePush,
  documents,
  onUploadDocument,
  onToggleDriverPhoto,
  vehicleExpiry,
  setVehicleExpiry,
  demoOwners,
  demoOwnerId,
  onSelectDemoOwner,
}: {
  owned: Cab[];
  bookings: Booking[];
  ownerName: string;
  ownerReviewStatus?: 'pending' | 'approved' | 'rejected' | null;
  showDriverPhoto: boolean;
  pushState: 'idle' | 'setting_up' | 'ready' | 'needs_project' | 'permission_denied' | 'unsupported' | 'error';
  focusBookingId?: string | null;
  hindi: boolean;
  t: Translate;
  rolePicker: ReactNode;
  onAddVehicle: () => void;
  onEditVehicle: (cab: Cab) => void;
  onToggleAvailability: (cabId: string, available: boolean) => void;
  onChangeStatus: (id: string, status: Booking['status']) => void;
  onEnablePush: () => void;
  documents: VerificationDocument[];
  onUploadDocument: (type: DocumentType, vehicleId: string | null) => void;
  onToggleDriverPhoto: (show: boolean) => void;
  vehicleExpiry: (vehicleId: string, type: 'insurance' | 'pollution') => string;
  setVehicleExpiry: (vehicleId: string, type: 'insurance' | 'pollution', value: string) => void;
  demoOwners?: { id: string; name: string }[];
  demoOwnerId?: string;
  onSelectDemoOwner?: (id: string) => void;
}) {
  const orderedBookings = focusBookingId
    ? [...bookings].sort((a, b) => Number(b.id === focusBookingId) - Number(a.id === focusBookingId))
    : bookings;
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.ownerHero}>
        <Text style={styles.heroEyebrow}>{t('ownerGreeting').replace('{{name}}', ownerName || t('driverHonorific'))}</Text>
        <Text style={styles.ownerHeroTitle}>{t('todayRides')}</Text>
        <Text style={styles.ownerHeroNumber}>{bookings.filter((booking) => booking.status === 'pending').length}</Text>
        <Text style={styles.ownerHeroCaption}>{t('requestsWaiting')}</Text>
      </View>
      {ownerReviewStatus && ownerReviewStatus !== 'approved' && <View style={styles.summaryPanel}><Text style={styles.summaryTitle}>{ownerReviewStatus === 'rejected' ? t('approvalRejected') : t('approvalPending')}</Text></View>}
      {demoOwners?.length && <View style={styles.panel}><Text style={styles.fieldLabel}>{t('demoOwnerScenario')}</Text><View style={styles.chipRow}>{demoOwners.map((item) => <ChoiceChip key={item.id} label={item.name} active={item.id === demoOwnerId} onPress={() => onSelectDemoOwner?.(item.id)} />)}</View></View>}
      <View style={styles.panel}>
        <Text style={styles.sectionTitle}>{t('driverVerification')}</Text>
        <Text style={styles.helper}>{t('verificationPrivacy')}</Text>
        {(['aadhaar', 'selfie'] as DocumentType[]).map((type) => <EvidenceRow key={type} type={type} document={latestDocument(documents, type, null)} t={t} onUpload={() => onUploadDocument(type, null)} />)}
        <View style={styles.photoConsentRow}><View style={{ flex: 1 }}><Text style={styles.cabMeta}>{t('showDriverPhoto')}</Text><Text style={styles.bookingHelper}>{t('driverPhotoConsent')}</Text></View><Switch accessibilityLabel={t('showDriverPhoto')} value={showDriverPhoto} onValueChange={onToggleDriverPhoto} trackColor={{ true: C.green }} /></View>
      </View>
      {ownerReviewStatus === 'approved' && <View style={styles.summaryPanel}><Text style={styles.summaryTitle}>{t(pushState === 'ready' ? 'pushReady' : pushState === 'idle' ? 'pushNotEnabled' : pushState === 'setting_up' ? 'pushSettingUp' : pushState === 'permission_denied' ? 'pushPermissionDenied' : pushState === 'unsupported' ? 'pushUnsupported' : pushState === 'needs_project' ? 'pushNeedsProject' : 'pushFailed')}</Text>{['idle', 'permission_denied', 'error'].includes(pushState) && <Pressable accessibilityRole="button" onPress={onEnablePush}><Text style={styles.confirmationEditText}>{t('enableAlerts')}</Text></Pressable>}</View>}
      <View style={styles.sectionLine}><Text style={styles.sectionTitle}>{t('myVehicle')}</Text><Pressable accessibilityRole="button" onPress={onAddVehicle}><Text style={styles.addLink}>＋ {t('addVehicle')}</Text></Pressable></View>
      {owned.map((cab) => { const lastUpdated = cab.availabilityUpdatedAt ? new Date(cab.availabilityUpdatedAt).getTime() : 0; const stale = lastUpdated > 0 && Date.now() - lastUpdated > 86400000; const evidenceReady = ['registration', 'insurance', 'pollution'].every((type) => { const doc = latestDocument(documents, type as DocumentType, cab.id); const registrationCurrent = type !== 'registration' || !cab.registrationUpdatedAt || Boolean(doc?.createdAt && doc.createdAt >= cab.registrationUpdatedAt); return doc?.status === 'approved' && registrationCurrent && (!doc.expiresOn || doc.expiresOn >= todayInIndia()); }); const identityReady = ['aadhaar', 'selfie'].every((type) => { const doc = latestDocument(documents, type as DocumentType, null); return doc?.status === 'approved' && (!doc.expiresOn || doc.expiresOn >= todayInIndia()); }); return <View key={cab.id} style={styles.ownerCab}>
        <View style={styles.ownerCabTop}><View style={styles.carIcon}><Text style={styles.carIconText}>🚕</Text></View><View style={{ flex: 1 }}><Text style={styles.cabName}>{cab.name}</Text><Text style={styles.cabMeta}>{t(`vehicle${cab.type}`)} · {cab.seats} {t('seats')}</Text><Text style={styles.cabMeta}>{t('vehicleRegistration')}: {cab.registrationNumber || '—'}</Text><Text style={styles.availabilityLabel}>{cab.reviewStatus === 'approved' ? (cab.available ? t('cabAvailable') : t('cabUnavailable')) : cab.reviewStatus === 'rejected' ? t('vehicleApprovalRejected') : t('vehicleApprovalPending')}</Text>{(cab.availabilityStart && cab.availabilityEnd) && <Text style={styles.cabMeta}>{cab.availabilityStart.slice(0, 5)}–{cab.availabilityEnd.slice(0, 5)}</Text>}{cab.availabilityUpdatedAt && <Text style={styles.cabMeta}>{t('lastUpdated')} {cab.availabilityUpdatedAt.slice(0, 16).replace('T', ' ')}</Text>}</View><Switch accessibilityLabel={t('availability')} value={cab.available} disabled={cab.available ? false : cab.reviewStatus !== 'approved' || ownerReviewStatus !== 'approved' || !evidenceReady || !identityReady} onValueChange={(value) => onToggleAvailability(cab.id, value)} trackColor={{ true: C.green }} />
        </View>
        <View style={styles.rule} />
        <View style={styles.ratesRow}><Text style={styles.ownerRate}>{t('hourly')} {formatRs(cab.hourly)}</Text><Text style={styles.ownerRate}>{t('fullDay')} {formatRs(cab.fullDay)}</Text><Text style={styles.ownerRate}>{t('perKm')} {formatRs(cab.perKm)}</Text></View>
        <Pressable accessibilityRole="button" onPress={() => onEditVehicle(cab)}><Text style={styles.addLink}>{t('editVehicle')}  ✎</Text></Pressable>
        <View style={styles.rule} /><Text style={styles.sectionTitle}>{t('vehicleVerification')}</Text>
        {(['registration', 'insurance', 'pollution', 'vehicle_photo'] as DocumentType[]).map((type) => { const document = latestDocument(documents, type, cab.id); const registrationChanged = type === 'registration' && Boolean(cab.registrationUpdatedAt && document?.createdAt && document.createdAt < cab.registrationUpdatedAt); return <EvidenceRow key={type} type={type} document={document} needsReplacement={registrationChanged} t={t} onUpload={() => onUploadDocument(type, cab.id)} />; })}
        <FormField label={t('insuranceExpiry')} value={vehicleExpiry(cab.id, 'insurance')} onChange={(value) => setVehicleExpiry(cab.id, 'insurance', value)} placeholder="YYYY-MM-DD" />
        <FormField label={t('pollutionExpiry')} value={vehicleExpiry(cab.id, 'pollution')} onChange={(value) => setVehicleExpiry(cab.id, 'pollution', value)} placeholder="YYYY-MM-DD" />
        {stale && <Text style={styles.bookingHelper}>{t('availabilityStale')}</Text>}
      </View>; })}
      {focusBookingId && orderedBookings.some((booking) => booking.id === focusBookingId) && <View style={styles.summaryPanel}><Text style={styles.summaryTitle}>{t('openedRequest')}</Text></View>}
      <View style={styles.sectionLine}><Text style={styles.sectionTitle}>{t('upcoming')}</Text><Text style={styles.countBubble}>{bookings.length}</Text></View>
      {orderedBookings.length ? orderedBookings.map((booking) => <BookingCard key={booking.id} booking={booking} ownerActions hindi={hindi} t={t} onChangeStatus={onChangeStatus} />) : <Text style={styles.emptyText}>{t('noBooking')}</Text>}
      {rolePicker}
    </ScrollView>
  );
}

function latestDocument(documents: VerificationDocument[], type: DocumentType, vehicleId: string | null) {
  return documents.filter((doc) => doc.type === type && doc.vehicleId === vehicleId).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
}

function EvidenceRow({ type, document, needsReplacement = false, t, onUpload }: { type: DocumentType; document?: VerificationDocument; needsReplacement?: boolean; t: Translate; onUpload: () => void }) {
  const status = needsReplacement ? 'document_stale' : document?.expiresOn && document.expiresOn < todayInIndia() ? 'expired' : document?.status ?? 'missing';
  return <View style={styles.evidenceRow}>
    <View style={{ flex: 1 }}><Text style={styles.cabMeta}>{t(`document_${type}`)}</Text><Text style={styles.bookingHelper}>{t(status === 'missing' ? 'documentMissing' : status === 'document_stale' ? status : `document_${status}`)}{document?.expiresOn ? ` · ${document.expiresOn}` : ''}{document?.rejectionReason ? ` · ${document.rejectionReason}` : ''}</Text></View>
    <Pressable accessibilityRole="button" onPress={onUpload} style={styles.adminAction}><Text style={styles.adminActionText}>{t(status === 'missing' ? 'uploadDocument' : 'replaceDocument')}</Text></Pressable>
  </View>;
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
  registrationNumber,
  setRegistrationNumber,
  availabilityStart,
  setAvailabilityStart,
  availabilityEnd,
  setAvailabilityEnd,
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
  registrationNumber: string;
  setRegistrationNumber: (value: string) => void;
  availabilityStart: string;
  setAvailabilityStart: (value: string) => void;
  availabilityEnd: string;
  setAvailabilityEnd: (value: string) => void;
  onSave: () => void;
}) {
  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.panel}>
        <Text style={styles.sectionTitle}>{t('vehicleDetails')}</Text>
        <FormField label={t('vehicleName')} value={newName} onChange={setNewName} placeholder={t('vehiclePlaceholder')} />
        <FormField label={t('registrationNumber')} value={registrationNumber} onChange={setRegistrationNumber} placeholder={t('registrationPlaceholder')} autoCapitalize="characters" />
        <Text style={styles.fieldLabel}>{t('vehicle')}</Text>
        <View style={styles.chipRow}>{VEHICLES.map((value) => <ChoiceChip key={value} label={t(`vehicle${value}`)} active={newType === value} onPress={() => setNewType(value)} />)}</View>
        <FormField label={t('seats')} value={newSeats} onChange={setNewSeats} keyboardType="numeric" />
        <Text style={styles.sectionTitle}>{t('saveRates')}</Text>
        <Text style={styles.helper}>{t('ownRates')}</Text>
        <FormField label={`${t('hourly')} (₹)`} value={newHourly} onChange={setNewHourly} keyboardType="numeric" />
        <FormField label={`${t('fullDay')} (₹)`} value={newFullDay} onChange={setNewFullDay} keyboardType="numeric" />
        <FormField label={t('rateOutstation')} value={newPerKm} onChange={setNewPerKm} keyboardType="numeric" />
        <Text style={styles.sectionTitle}>{t('availableHours')}</Text>
        <Text style={styles.helper}>{t('hoursNote')}</Text>
        <View style={styles.twoCol}><FormField label={t('availableFrom')} value={availabilityStart} onChange={setAvailabilityStart} placeholder="09:00" /><FormField label={t('availableUntil')} value={availabilityEnd} onChange={setAvailabilityEnd} placeholder="18:00" /></View>
        <PrimaryButton label={t('save')} onPress={onSave} />
      </View>
    </ScrollView>
  );
}
