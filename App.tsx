import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as Notifications from 'expo-notifications';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import {
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Text,
  View,
} from 'react-native';
import { loadCloudData, createCloudBooking, setCloudBookingStatus, saveCloudVehicle, editCloudVehicle, updateCloudAvailability, setCloudAccountBlocked, setCloudOwnerReviewStatus, setCloudDriverPhotoVisibility, withdrawCloudVehiclePhoto, setCloudVehicleReviewStatus, setCloudVehicleBlocked, saveCloudPushToken, removeCloudPushToken, trackPilotEvent, uploadVerificationDocument, openVerificationDocument, reviewVerificationDocument, closeCloudAccount } from './src/cloudData';
import { supabase, supabaseReady } from './src/supabase';
import { C, styles } from './src/theme';
import { translate, type CopyKey } from './src/i18n';
import { defaultDate, formatRs, todayInIndia } from './src/utils';
import type { Account, Booking, BookingStatus, BookingStatusHistoryEntry, Cab, DocumentType, Hire, ReviewStatus, Role, Store, VehicleType, VerificationDocument } from './src/types';
import { AppHeader, FormField, PrimaryButton, RolePicker } from './src/components/Primitives';
import { BookingConfirmation } from './src/components/BookingConfirmation';
import { BottomNavigation } from './src/components/BottomNavigation';
import { CustomerBookingsContent, CustomerHomeContent, CustomerSearchContent, SearchResultsContent } from './src/screens/CustomerScreens';
import { OwnerDashboardContent, VehicleFormContent } from './src/screens/OwnerScreens';
import { AdminScreen } from './src/screens/AdminScreen';
import { HelpPrivacyScreen } from './src/screens/HelpPrivacyScreen';
import { registerOwnerPushNotifications } from './src/pushNotifications';
import { latestVerificationDocument, requiredVerificationDocumentsApproved } from './src/verification';

const KEY = 'mera-saarthi-demo-v1';
const pushTokenStorageKey = (ownerId: string) => `mera-saarthi-push-token:${ownerId}`;
const DEMO_DATE = '2026-10-03T09:00:00.000Z';
const INITIAL: Store = {
  cabs: [
    { id: 'cab-a', ownerId: 'owner-a', ownerName: 'Ramesh Kumar', phone: '98765 43210', name: 'Maruti Swift', type: 'Hatchback', seats: 4, available: true, hourly: 180, fullDay: 1400, perKm: 12, registrationNumber: 'RJ 14 AB 1234', reviewStatus: 'approved', registrationUpdatedAt: DEMO_DATE },
    { id: 'cab-b', ownerId: 'owner-b', ownerName: 'Suresh Yadav', phone: '98765 12340', name: 'Mahindra Bolero', type: 'SUV', seats: 7, available: false, hourly: 250, fullDay: 2000, perKm: 16, registrationNumber: 'RJ 14 CD 5678', reviewStatus: 'pending', registrationUpdatedAt: DEMO_DATE },
    { id: 'cab-c', ownerId: 'owner-c', ownerName: 'Amit Patel', phone: '98765 56780', name: 'Maruti Dzire', type: 'Sedan', seats: 4, available: false, hourly: 200, fullDay: 1600, perKm: 14, registrationNumber: 'RJ 14 EF 9012', reviewStatus: 'pending', registrationUpdatedAt: DEMO_DATE },
    { id: 'cab-d', ownerId: 'owner-d', ownerName: 'Meena Devi', phone: '98765 24680', name: 'Tata Tigor', type: 'Sedan', seats: 4, available: false, hourly: 210, fullDay: 1700, perKm: 14, registrationNumber: 'RJ 14 GH 3456', reviewStatus: 'approved', registrationUpdatedAt: DEMO_DATE },
  ],
  bookings: [], blockedOwners: [], blockedCustomers: [], blockedVehicles: [], customerName: 'Guest Customer',
  profiles: [
    { id: 'owner-a', role: 'owner', full_name: 'Ramesh Kumar', phone: '98765 43210', is_blocked: false, owner_review_status: 'approved', show_driver_photo: true },
    { id: 'owner-b', role: 'owner', full_name: 'Suresh Yadav', phone: '98765 12340', is_blocked: false, owner_review_status: 'pending' },
    { id: 'owner-c', role: 'owner', full_name: 'Amit Patel', phone: '98765 56780', is_blocked: false, owner_review_status: 'approved' },
    { id: 'owner-d', role: 'owner', full_name: 'Meena Devi', phone: '98765 24680', is_blocked: false, owner_review_status: 'approved' },
    { id: 'customer-demo', role: 'customer', full_name: 'Guest Customer', phone: '—', is_blocked: false },
  ],
  documents: [
    { id: 'demo-1', ownerId: 'owner-a', vehicleId: null, type: 'aadhaar', storagePath: 'demo://aadhaar', status: 'approved', expiresOn: null, rejectionReason: null, createdAt: DEMO_DATE },
    { id: 'demo-2', ownerId: 'owner-a', vehicleId: null, type: 'selfie', storagePath: 'demo://selfie', status: 'approved', expiresOn: null, rejectionReason: null, createdAt: DEMO_DATE },
    { id: 'demo-3', ownerId: 'owner-a', vehicleId: 'cab-a', type: 'registration', storagePath: 'demo://rc', status: 'approved', expiresOn: null, rejectionReason: null, createdAt: DEMO_DATE },
    { id: 'demo-4', ownerId: 'owner-a', vehicleId: 'cab-a', type: 'insurance', storagePath: 'demo://insurance', status: 'approved', expiresOn: '2027-03-31', rejectionReason: null, createdAt: DEMO_DATE },
    { id: 'demo-5', ownerId: 'owner-a', vehicleId: 'cab-a', type: 'pollution', storagePath: 'demo://puc', status: 'approved', expiresOn: '2027-01-31', rejectionReason: null, createdAt: DEMO_DATE },
    { id: 'demo-21', ownerId: 'owner-a', vehicleId: 'cab-a', type: 'vehicle_photo', storagePath: 'demo://vehicle-photo', status: 'approved', expiresOn: null, rejectionReason: null, createdAt: DEMO_DATE },
    { id: 'demo-6', ownerId: 'owner-b', vehicleId: null, type: 'aadhaar', storagePath: 'demo://aadhaar-b', status: 'pending', expiresOn: null, rejectionReason: null, createdAt: DEMO_DATE },
    { id: 'demo-7', ownerId: 'owner-b', vehicleId: null, type: 'selfie', storagePath: 'demo://selfie-b', status: 'rejected', expiresOn: null, rejectionReason: 'Image is unclear; upload a readable copy.', createdAt: DEMO_DATE },
    { id: 'demo-8', ownerId: 'owner-b', vehicleId: 'cab-b', type: 'registration', storagePath: 'demo://rc-b', status: 'pending', expiresOn: null, rejectionReason: null, createdAt: DEMO_DATE },
    { id: 'demo-9', ownerId: 'owner-b', vehicleId: 'cab-b', type: 'insurance', storagePath: 'demo://insurance-b', status: 'pending', expiresOn: '2027-02-01', rejectionReason: null, createdAt: DEMO_DATE },
    { id: 'demo-10', ownerId: 'owner-b', vehicleId: 'cab-b', type: 'pollution', storagePath: 'demo://puc-b', status: 'pending', expiresOn: '2027-01-01', rejectionReason: null, createdAt: DEMO_DATE },
    { id: 'demo-22', ownerId: 'owner-b', vehicleId: 'cab-b', type: 'vehicle_photo', storagePath: 'demo://vehicle-photo-b', status: 'pending', expiresOn: null, rejectionReason: null, createdAt: DEMO_DATE },
    { id: 'demo-11', ownerId: 'owner-c', vehicleId: null, type: 'aadhaar', storagePath: 'demo://aadhaar-c', status: 'approved', expiresOn: null, rejectionReason: null, createdAt: DEMO_DATE },
    { id: 'demo-12', ownerId: 'owner-c', vehicleId: null, type: 'selfie', storagePath: 'demo://selfie-c', status: 'approved', expiresOn: null, rejectionReason: null, createdAt: DEMO_DATE },
    { id: 'demo-13', ownerId: 'owner-c', vehicleId: 'cab-c', type: 'registration', storagePath: 'demo://rc-c', status: 'approved', expiresOn: null, rejectionReason: null, createdAt: DEMO_DATE },
    { id: 'demo-14', ownerId: 'owner-c', vehicleId: 'cab-c', type: 'insurance', storagePath: 'demo://insurance-c', status: 'rejected', expiresOn: '2027-02-01', rejectionReason: 'Image is unclear; upload a readable copy.', createdAt: DEMO_DATE },
    { id: 'demo-15', ownerId: 'owner-c', vehicleId: 'cab-c', type: 'pollution', storagePath: 'demo://puc-c', status: 'approved', expiresOn: '2027-01-01', rejectionReason: null, createdAt: DEMO_DATE },
    { id: 'demo-16', ownerId: 'owner-d', vehicleId: null, type: 'aadhaar', storagePath: 'demo://aadhaar-d', status: 'approved', expiresOn: null, rejectionReason: null, createdAt: DEMO_DATE },
    { id: 'demo-17', ownerId: 'owner-d', vehicleId: null, type: 'selfie', storagePath: 'demo://selfie-d', status: 'approved', expiresOn: null, rejectionReason: null, createdAt: DEMO_DATE },
    { id: 'demo-18', ownerId: 'owner-d', vehicleId: 'cab-d', type: 'registration', storagePath: 'demo://rc-d', status: 'approved', expiresOn: null, rejectionReason: null, createdAt: DEMO_DATE },
    { id: 'demo-19', ownerId: 'owner-d', vehicleId: 'cab-d', type: 'insurance', storagePath: 'demo://insurance-d', status: 'approved', expiresOn: '2025-12-31', rejectionReason: null, createdAt: DEMO_DATE },
    { id: 'demo-20', ownerId: 'owner-d', vehicleId: 'cab-d', type: 'pollution', storagePath: 'demo://puc-d', status: 'approved', expiresOn: '2027-04-30', rejectionReason: null, createdAt: DEMO_DATE },
  ], metrics: [],
};

const requestKey = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
  const random = Math.floor(Math.random() * 16);
  return (character === 'x' ? random : (random & 0x3) | 0x8).toString(16);
});

const withinAvailability = (cab: Cab, pickupTime: string, durationHours: number) => {
  if (!cab.availabilityStart || !cab.availabilityEnd) return true;
  const toMinutes = (value: string) => {
    const [hours, minutes] = value.slice(0, 5).split(':').map(Number);
    return hours * 60 + minutes;
  };
  const start = toMinutes(cab.availabilityStart);
  const end = toMinutes(cab.availabilityEnd);
  const requestedStart = toMinutes(pickupTime);
  return requestedStart >= start && requestedStart + durationHours * 60 <= end;
};

export default function App() {
  const [store, setStore] = useState<Store>(INITIAL);
  const [ready, setReady] = useState(false);
  const [role, setRole] = useState<Role>('customer');
  const [hindi, setHindi] = useState(true);
  const [page, setPage] = useState<'auth' | 'home' | 'search' | 'results' | 'confirm' | 'bookings' | 'owner' | 'add' | 'admin' | 'help'>('auth');
  const [returnPage, setReturnPage] = useState<'auth' | 'home' | 'search' | 'results' | 'confirm' | 'bookings' | 'owner' | 'add' | 'admin'>('home');
  const [cloudUser, setCloudUser] = useState<{ id: string; phone?: string } | null>(null);
  const [profile, setProfile] = useState<Account | null>(null);
  const [cloudLoading, setCloudLoading] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [authName, setAuthName] = useState('');
  const [authPhone, setAuthPhone] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authRole, setAuthRole] = useState<'customer' | 'owner'>('customer');
  const [demoMode, setDemoMode] = useState(false);
  const [demoOwnerId, setDemoOwnerId] = useState('owner-a');
  const [kind, setKind] = useState<Hire>('local');
  const [vehicleType, setVehicleType] = useState<VehicleType | 'Any'>('Any');
  const [date, setDate] = useState(defaultDate());
  const [time, setTime] = useState('09:00');
  const [hours, setHours] = useState('4');
  const [destination, setDestination] = useState('');
  const [pickupArea, setPickupArea] = useState('');
  const [selectedCab, setSelectedCab] = useState<Cab | null>(null);
  const [newName, setNewName] = useState('');
  const [editingCabId, setEditingCabId] = useState<string | null>(null);
  const [newType, setNewType] = useState<VehicleType>('SUV');
  const [newSeats, setNewSeats] = useState('6');
  const [newHourly, setNewHourly] = useState('220');
  const [newFullDay, setNewFullDay] = useState('1800');
  const [newPerKm, setNewPerKm] = useState('15');
  const [newRegistration, setNewRegistration] = useState('');
  const [newAvailabilityStart, setNewAvailabilityStart] = useState('');
  const [newAvailabilityEnd, setNewAvailabilityEnd] = useState('');
  const [vehicleExpiryDates, setVehicleExpiryDates] = useState<Record<string, { insurance: string; pollution: string }>>({});
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const bookingRequestKey = useRef<string | null>(null);
  const bookingInFlight = useRef(false);
  const [syncIssue, setSyncIssue] = useState(false);
  const [pushState, setPushState] = useState<'idle' | 'setting_up' | 'ready' | 'needs_project' | 'permission_denied' | 'unsupported' | 'error'>('idle');
  const [focusBookingId, setFocusBookingId] = useState<string | null>(null);
  const pushToken = useRef<string | null>(null);

  const t = (key: string) => translate(key as CopyKey, hindi ? 'hi' : 'en');
  useEffect(() => {
    AsyncStorage.getItem(KEY).then((saved) => {
      if (saved) setStore(restoreDemoStore(JSON.parse(saved)));
      setReady(true);
    }).catch(() => setReady(true));
  }, []);
  useEffect(() => { if (ready && demoMode && !cloudUser) AsyncStorage.setItem(KEY, JSON.stringify(store)).catch(() => undefined); }, [store, ready, demoMode, cloudUser]);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) setCloudUser({ id: data.session.user.id, phone: data.session.user.phone });
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) { setCloudUser({ id: session.user.id, phone: session.user.phone }); setDemoMode(false); }
      else { setCloudUser(null); setProfile(null); setPage('auth'); setRole('customer'); setPushState('idle'); setFocusBookingId(null); pushToken.current = null; }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!cloudUser || !supabase) return;
    let active = true;
    setCloudLoading(true);
    (async () => {
      const { data: profileData, error } = await supabase.from('profiles').select('id, role, full_name, phone, is_blocked, owner_review_status, show_driver_photo').eq('id', cloudUser.id).single();
      if (error) throw new Error(error.message);
      if (profileData.is_blocked) {
        await supabase.auth.signOut();
        throw new Error(t('blockedAccount'));
      }
      const loaded = await loadCloudData(cloudUser.id, profileData.role, profileData.full_name, profileData.phone, profileData.owner_review_status);
      if (!active) return;
      const account = profileData as Account;
      setProfile(account); setRole(account.role);
      setStore((current) => ({ ...INITIAL, ...current, blockedOwners: [], blockedCustomers: [], blockedVehicles: [], cabs: loaded.cabs, bookings: loaded.bookings, customerName: account.full_name || t('customerGeneric'), profiles: loaded.profiles, documents: loaded.documents, metrics: loaded.metrics, bookingHistory: loaded.bookingHistory }));
      setPage(account.role === 'customer' ? 'home' : account.role === 'owner' ? 'owner' : 'admin');
    })().catch((error: unknown) => {
      if (active) { setSyncIssue(true); Alert.alert(t('loadFailed'), error instanceof Error ? error.message : String(error)); }
    }).finally(() => { if (active) setCloudLoading(false); });
    return () => { active = false; };
  }, [cloudUser?.id]);

  const results = useMemo(() => {
    const requestedStart = new Date(`${date}T${time}:00+05:30`).getTime();
    const requestedEnd = requestedStart + Math.max(1, Number(hours) || 1) * 60 * 60 * 1000;
    const available = store.cabs.filter((cab) => {
      const conflict = Number.isFinite(requestedStart) && store.bookings.some((b) => {
        if (b.cabId !== cab.id || !['pending', 'accepted'].includes(b.status)) return false;
        const start = new Date(`${b.date}T${b.time}:00+05:30`).getTime();
        const end = start + Math.max(1, b.hours || 1) * 60 * 60 * 1000;
        return Number.isFinite(start) && requestedStart < end && start < requestedEnd;
      });
      const owner = cloudUser ? { owner_review_status: 'approved' as const } : store.profiles.find((item) => item.id === cab.ownerId);
      const driverDocsReady = Boolean(cloudUser) || requiredDocumentsApproved(store.documents ?? [], cab.ownerId, null, ['aadhaar', 'selfie']);
      const vehicleDocsReady = Boolean(cloudUser) || requiredDocumentsApproved(store.documents ?? [], cab.ownerId, cab.id, ['registration', 'insurance', 'pollution'], cab.registrationUpdatedAt);
      return cab.available && cab.reviewStatus === 'approved' && owner?.owner_review_status === 'approved' && driverDocsReady && vehicleDocsReady && !cab.blocked && !store.blockedVehicles.includes(cab.id) && !store.blockedOwners.includes(cab.ownerId) && (vehicleType === 'Any' || cab.type === vehicleType) && withinAvailability(cab, time, Math.max(1, Number(hours) || 1)) && !conflict;
    });
    const quote = (cab: Cab) => kind === 'local'
      ? (Number(hours) >= 8 ? cab.fullDay : cab.hourly * Math.max(1, Number(hours) || 1))
      : cab.perKm;
    const withDemoPhotos = demoMode ? available.map((cab) => ({
      ...cab,
      driverPhotoUrl: store.profiles.find((owner) => owner.id === cab.ownerId)?.show_driver_photo && isDisplayableDemoPhoto(store.documents ?? [], cab.ownerId, null, 'selfie') ? 'demo-photo://selfie' : undefined,
      vehiclePhotoUrl: isDisplayableDemoPhoto(store.documents ?? [], cab.ownerId, cab.id, 'vehicle_photo') ? 'demo-photo://vehicle' : undefined,
    })) : available;
    return withDemoPhotos.sort((a, b) => quote(a) - quote(b) || a.name.localeCompare(b.name));
  }, [store, vehicleType, date, time, hours, kind, cloudUser?.id, demoMode]);
  const cabsOpenForSearch = store.cabs.filter((cab) => cab.available && cab.reviewStatus === 'approved' && (cloudUser || store.profiles.find((item) => item.id === cab.ownerId)?.owner_review_status === 'approved') && (cloudUser || (requiredDocumentsApproved(store.documents ?? [], cab.ownerId, null, ['aadhaar', 'selfie']) && requiredDocumentsApproved(store.documents ?? [], cab.ownerId, cab.id, ['registration', 'insurance', 'pollution'], cab.registrationUpdatedAt))) && !cab.blocked && !store.blockedVehicles.includes(cab.id) && !store.blockedOwners.includes(cab.ownerId));
  const localFrom = cabsOpenForSearch.length ? formatRs(Math.min(...cabsOpenForSearch.map((cab) => cab.fullDay))) : '—';
  const outstationFrom = cabsOpenForSearch.length ? formatRs(Math.min(...cabsOpenForSearch.map((cab) => cab.perKm))) : '—';
  const amountFor = (cab: Cab) => kind === 'local' ? (Number(hours) >= 8 ? cab.fullDay : cab.hourly * Math.max(1, Number(hours) || 1)) : 0;
  const openResults = () => {
    if (!pickupArea.trim()) { Alert.alert(t('pickupArea'), t('pickupRequired')); return; }
    const rideAt = new Date(`${date}T${time}:00+05:30`);
    if (!Number.isFinite(rideAt.getTime()) || rideAt.getTime() < Date.now() || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
      Alert.alert(t('checkDateTime'), t('futureDateTime')); return;
    }
    if (Number(hours) < 1 || !Number.isFinite(Number(hours))) {
      Alert.alert(t('checkTrip'), t('validTrip')); return;
    }
    if (kind === 'outstation' && !destination.trim()) { Alert.alert(t('addDestination'), t('enterDestination')); return; }
    if (cloudUser) {
      trackPilotEvent('search').catch(() => undefined);
      trackPilotEvent('results_view').catch(() => undefined);
    }
    setPage('results');
  };
  const refreshCloud = async () => {
    if (!cloudUser || !profile) return;
    try {
      const { data: profileData, error: profileError } = await supabase!.from('profiles').select('id, role, full_name, phone, is_blocked, owner_review_status, show_driver_photo').eq('id', cloudUser.id).single();
      if (profileError) throw profileError;
      if (profileData.is_blocked) {
        await supabase!.auth.signOut();
        throw new Error(t('blockedAccount'));
      }
      const account = profileData as Account;
      const loaded = await loadCloudData(cloudUser.id, account.role, account.full_name, account.phone, account.owner_review_status);
      setStore((current) => ({ ...current, cabs: loaded.cabs, bookings: loaded.bookings, profiles: loaded.profiles, documents: loaded.documents, metrics: loaded.metrics, bookingHistory: loaded.bookingHistory }));
      setProfile(account);
      setRole(account.role);
      setSyncIssue(false);
    } catch (error) {
      setSyncIssue(true);
      throw error;
    }
  };
  useEffect(() => {
    if (!cloudUser || !profile) return;
    const timer = setInterval(() => { refreshCloud().catch(() => undefined); }, 30000);
    return () => clearInterval(timer);
  }, [cloudUser?.id, profile?.id]);
  const enablePush = async (ownerId: string) => {
    setPushState('setting_up');
    try {
      const registration = await registerOwnerPushNotifications();
      if (registration.status !== 'ready') {
        setPushState(registration.status);
        return;
      }
      await saveCloudPushToken(ownerId, registration.token);
      await AsyncStorage.setItem(pushTokenStorageKey(ownerId), registration.token);
      pushToken.current = registration.token;
      setPushState('ready');
    } catch {
      setPushState('error');
    }
  };
  const disablePush = async () => {
    if (!cloudUser || !pushToken.current) {
      setPushState('idle');
      return;
    }
    setPushState('setting_up');
    try {
      await removeCloudPushToken(cloudUser.id, pushToken.current);
      await AsyncStorage.removeItem(pushTokenStorageKey(cloudUser.id));
      pushToken.current = null;
      setPushState('idle');
    } catch {
      setPushState('error');
    }
  };
  useEffect(() => {
    if (!cloudUser || profile?.role !== 'owner') return;
    let cancelled = false;
    const restorePushState = async () => {
      const token = await AsyncStorage.getItem(pushTokenStorageKey(cloudUser.id));
      if (!token || cancelled) return;
      const permission = await Notifications.getPermissionsAsync();
      if (permission.status !== 'granted') {
        await removeCloudPushToken(cloudUser.id, token).catch(() => undefined);
        await AsyncStorage.removeItem(pushTokenStorageKey(cloudUser.id));
        if (!cancelled) setPushState('permission_denied');
        return;
      }
      const { data, error } = await supabase!.from('push_tokens').select('expo_push_token')
        .eq('owner_id', cloudUser.id).eq('expo_push_token', token).maybeSingle();
      if (error) throw error;
      if (!cancelled && data) {
        pushToken.current = token;
        setPushState('ready');
      } else if (!cancelled) {
        await AsyncStorage.removeItem(pushTokenStorageKey(cloudUser.id));
        setPushState('idle');
      }
    };
    restorePushState().catch(() => { if (!cancelled) setPushState('error'); });
    return () => { cancelled = true; };
  }, [cloudUser?.id, profile?.role]);
  useEffect(() => {
    if (!cloudUser || profile?.role !== 'owner') return;
    const handleResponse = (response: Notifications.NotificationResponse) => {
      void Notifications.clearLastNotificationResponseAsync().catch(() => undefined);
      const bookingId = response.notification.request.content.data?.bookingId;
      if (typeof bookingId !== 'string') return;
      setFocusBookingId(bookingId);
      setPage('owner');
      refreshCloud().catch(() => undefined);
    };
    const initial = Notifications.getLastNotificationResponse();
    if (initial) handleResponse(initial);
    const subscription = Notifications.addNotificationResponseReceivedListener(handleResponse);
    return () => subscription.remove();
  }, [cloudUser?.id, profile?.role]);
  const createBooking = async (cab: Cab) => {
    if (bookingInFlight.current) return;
    bookingInFlight.current = true;
    setBookingSubmitting(true);
    const submissionKey = bookingRequestKey.current ?? requestKey();
    bookingRequestKey.current = submissionKey;
    const item: Booking = {
      id: `ride-${Date.now()}`, cabId: cab.id, cabName: cab.name, ownerName: cab.ownerName, ownerPhone: cab.phone,
      customerName: store.customerName, kind, vehicleType: cab.type, date, time, hours: Number(hours) || 1,
      pickupArea, destination: kind === 'local' ? 'Local trip' : destination, km: 0,
      estimate: amountFor(cab), perKmRate: cab.perKm, status: 'pending', requestKey: submissionKey,
    };
    try {
      if (cloudUser) {
        const created = await createCloudBooking({ customerId: cloudUser.id, customerName: store.customerName, cabId: cab.id, rideType: kind, vehicleType: cab.type, date, time, hours: Number(hours) || 1, pickupLocation: pickupArea, destination: item.destination, km: item.km, estimate: item.estimate, requestKey: submissionKey });
        item.id = created.id;
        setStore((s) => ({ ...s, bookings: [item, ...s.bookings.filter((booking) => booking.id !== created.id)] }));
      } else setStore((s) => ({
        ...s,
        bookings: [item, ...s.bookings],
        bookingHistory: [demoHistoryEntry(item.id, null, 'pending', null), ...(s.bookingHistory ?? [])],
      }));
      bookingRequestKey.current = null;
      setSelectedCab(cab); setPage('bookings');
      Alert.alert(t('requestConfirmed'), t('requestPending'));
      if (cloudUser) refreshCloud().catch(() => undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setSyncIssue(error instanceof TypeError || /network|fetch|offline|timeout/i.test(message));
      Alert.alert(t('requestNotConfirmed'), message, [{ text: t('keepBooking'), style: 'cancel' }, { text: t('retryBooking'), onPress: () => { void createBooking(cab); } }]);
    } finally {
      bookingInFlight.current = false;
      setBookingSubmitting(false);
    }
  };
  const reviewCab = (cab: Cab) => { bookingRequestKey.current = null; setSelectedCab(cab); setPage('confirm'); };
  const changeBooking = async (id: string, status: BookingStatus, reason?: string) => {
    if (cloudUser && status !== 'pending') {
      try { await setCloudBookingStatus(id, status, reason); await refreshCloud(); }
      catch (error) { Alert.alert(t('updateFailed'), error instanceof Error ? error.message : String(error)); }
    } else setStore((s) => {
      const booking = s.bookings.find((item) => item.id === id);
      if (!booking || booking.status === status) return s;
      return {
        ...s,
        bookings: s.bookings.map((item) => item.id === id ? { ...item, status, statusReason: reason ?? null } : item),
        bookingHistory: [demoHistoryEntry(id, booking.status, status, reason ?? null), ...(s.bookingHistory ?? [])],
      };
    });
  };
  const addCab = async () => {
    if (!newName.trim()) { Alert.alert(t('enterVehicleName')); return; }
    if (newRegistration.trim().replace(/[^a-z\d]/gi, '').length < 4) { Alert.alert(t('registrationRequired')); return; }
    const rates = [Number(newHourly), Number(newFullDay), Number(newPerKm), Number(newSeats)];
    if (rates.some((value) => !Number.isFinite(value) || value <= 0)) { Alert.alert(t('checkFaresSeats'), t('validFaresSeats')); return; }
    const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
    if ((newAvailabilityStart || newAvailabilityEnd) && (!timePattern.test(newAvailabilityStart) || !timePattern.test(newAvailabilityEnd) || newAvailabilityStart >= newAvailabilityEnd)) { Alert.alert(t('invalidAvailabilityHours')); return; }
    const existingCab = editingCabId ? store.cabs.find((item) => item.id === editingCabId) : undefined;
    const registrationChanged = Boolean(existingCab && (existingCab.registrationNumber ?? '').trim().toUpperCase() !== newRegistration.trim().toUpperCase());
    const cab: Cab = { id: editingCabId ?? `cab-${Date.now()}`, ownerId: cloudUser?.id ?? demoOwnerId, ownerName: profile?.full_name ?? store.profiles.find((item) => item.id === demoOwnerId)?.full_name ?? 'Ramesh Kumar', phone: profile?.phone ?? '98765 43210', name: newName.trim(), type: newType, seats: Number(newSeats) || 4, available: Boolean(existingCab?.available && !registrationChanged), hourly: Number(newHourly) || 0, fullDay: Number(newFullDay) || 0, perKm: Number(newPerKm) || 0, registrationNumber: newRegistration.trim().toUpperCase(), reviewStatus: existingCab && !registrationChanged ? existingCab.reviewStatus ?? 'pending' : 'pending', registrationUpdatedAt: registrationChanged ? new Date().toISOString() : existingCab?.registrationUpdatedAt ?? new Date().toISOString(), availabilityStart: newAvailabilityStart || null, availabilityEnd: newAvailabilityEnd || null };
    if (cloudUser) {
      try {
        const details = { name: cab.name, type: cab.type, seats: cab.seats, hourly: cab.hourly, fullDay: cab.fullDay, perKm: cab.perKm, registrationNumber: cab.registrationNumber ?? '', availabilityStart: cab.availabilityStart ?? null, availabilityEnd: cab.availabilityEnd ?? null };
        if (editingCabId) await editCloudVehicle(editingCabId, details);
        else await saveCloudVehicle({ ownerId: cloudUser.id, ...details });
        await refreshCloud();
      }
      catch (error) { Alert.alert(t('saveVehicleFailed'), error instanceof Error ? error.message : String(error)); return; }
    } else if (editingCabId) setStore((s) => ({ ...s, cabs: s.cabs.map((v) => v.id === editingCabId ? cab : v) }));
    else setStore((s) => ({ ...s, cabs: [...s.cabs, cab] }));
    setNewName(''); setNewRegistration(''); setNewAvailabilityStart(''); setNewAvailabilityEnd(''); setEditingCabId(null); setPage('owner');
  };
  const editCab = (cab: Cab) => {
    setEditingCabId(cab.id); setNewName(cab.name); setNewType(cab.type); setNewSeats(String(cab.seats));
    setNewHourly(String(cab.hourly)); setNewFullDay(String(cab.fullDay)); setNewPerKm(String(cab.perKm)); setNewRegistration(cab.registrationNumber ?? ''); setNewAvailabilityStart(cab.availabilityStart?.slice(0, 5) ?? ''); setNewAvailabilityEnd(cab.availabilityEnd?.slice(0, 5) ?? ''); setPage('add');
  };
  const toggleAvailability = async (cabId: string, available: boolean) => {
    const currentCab = store.cabs.find((item) => item.id === cabId);
    if (available && currentCab && (!requiredDocumentsApproved(store.documents ?? [], currentCab.ownerId, null, ['aadhaar', 'selfie']) || !requiredDocumentsApproved(store.documents ?? [], currentCab.ownerId, cabId, ['registration', 'insurance', 'pollution'], currentCab.registrationUpdatedAt) || (cloudUser ? profile?.owner_review_status : store.profiles.find((item) => item.id === currentCab.ownerId)?.owner_review_status) !== 'approved' || currentCab.reviewStatus !== 'approved')) {
      Alert.alert(t('documentsRequired')); return;
    }
    if (cloudUser) {
      const cab = store.cabs.find((item) => item.id === cabId);
      try { await updateCloudAvailability(cabId, available, cab?.availabilityStart ?? null, cab?.availabilityEnd ?? null); await refreshCloud(); }
      catch (error) { Alert.alert(t('availabilityFailed'), error instanceof Error ? error.message : String(error)); }
    } else setStore((s) => ({ ...s, cabs: s.cabs.map((c) => c.id === cabId ? { ...c, available } : c) }));
  };
  const toggleAdminAccount = async (accountId: string, blocked: boolean, demoName?: string, owner = false) => {
    if (cloudUser) {
      if (accountId === cloudUser.id) { Alert.alert(t('selfBlock')); return; }
      try { await setCloudAccountBlocked(accountId, blocked); await refreshCloud(); }
      catch (error) { Alert.alert(t('updateFailed'), error instanceof Error ? error.message : String(error)); }
    } else if (owner) setStore((s) => ({ ...s, blockedOwners: blocked ? s.blockedOwners.filter((x) => x !== accountId) : [...s.blockedOwners, accountId] }));
    else if (demoName) setStore((s) => ({ ...s, blockedCustomers: blocked ? s.blockedCustomers.filter((x) => x !== demoName) : [...s.blockedCustomers, demoName] }));
  };
  const toggleAdminVehicle = async (cab: Cab, blocked: boolean) => {
    if (cloudUser) {
      try { await setCloudVehicleBlocked(cab.id, blocked); await refreshCloud(); }
      catch (error) { Alert.alert(t('updateFailed'), error instanceof Error ? error.message : String(error)); }
    } else setStore((s) => ({ ...s, blockedVehicles: blocked ? [...s.blockedVehicles, cab.id] : s.blockedVehicles.filter((x) => x !== cab.id) }));
  };
  const reviewOwner = async (accountId: string, status: ReviewStatus) => {
    if (!cloudUser) {
      if (status === 'approved' && !requiredDocumentsApproved(store.documents ?? [], accountId, null, ['aadhaar', 'selfie'])) return;
      setStore((s) => ({ ...s, profiles: s.profiles.map((item) => item.id === accountId ? { ...item, owner_review_status: status } : item), cabs: status === 'approved' ? s.cabs : s.cabs.map((cab) => cab.ownerId === accountId ? { ...cab, reviewStatus: 'pending', available: false } : cab) }));
      return;
    }
    try { await setCloudOwnerReviewStatus(accountId, status); await refreshCloud(); }
    catch (error) { Alert.alert(t('updateFailed'), error instanceof Error ? error.message : String(error)); }
  };
  const reviewVehicle = async (cab: Cab, status: ReviewStatus) => {
    if (!cloudUser) {
      if (status === 'approved' && (!requiredDocumentsApproved(store.documents ?? [], cab.ownerId, cab.id, ['registration', 'insurance', 'pollution'], cab.registrationUpdatedAt) || store.profiles.find((item) => item.id === cab.ownerId)?.owner_review_status !== 'approved')) return;
      setStore((s) => ({ ...s, cabs: s.cabs.map((item) => item.id === cab.id ? { ...item, reviewStatus: status, available: false } : item) }));
      return;
    }
    try { await setCloudVehicleReviewStatus(cab.id, status); await refreshCloud(); }
    catch (error) { Alert.alert(t('updateFailed'), error instanceof Error ? error.message : String(error)); }
  };
  const reviewDocument = async (document: VerificationDocument, status: ReviewStatus, reason?: string) => {
    if (!cloudUser) {
      setStore((s) => ({ ...s,
        documents: (s.documents ?? []).map((item) => item.id === document.id ? { ...item, status, rejectionReason: status === 'rejected' ? reason ?? t('reasonMismatch') : null } : item),
        profiles: document.vehicleId === null ? s.profiles.map((item) => item.id === document.ownerId ? { ...item, owner_review_status: 'pending' } : item) : s.profiles,
        cabs: document.type === 'vehicle_photo' ? s.cabs : s.cabs.map((cab) => (document.vehicleId === null ? cab.ownerId === document.ownerId : cab.id === document.vehicleId) ? { ...cab, reviewStatus: 'pending', available: false } : cab),
      }));
      return;
    }
    try { await reviewVerificationDocument(document.id, status, reason); await refreshCloud(); }
    catch (error) { Alert.alert(t('updateFailed'), error instanceof Error ? error.message : String(error)); }
  };
  const showVerificationDocument = async (document: VerificationDocument) => {
    if (!cloudUser) { Alert.alert(t(`document_${document.type}`), `${t('demoSampleDocument')}\n${t(`document_${document.status}`)}${document.expiresOn ? ` · ${document.expiresOn}` : ''}`); return; }
    if (document.purgedAt || !document.storagePath) { Alert.alert(t(`document_${document.type}`), t('document_file_purged')); return; }
    try { await Linking.openURL(await openVerificationDocument(document.storagePath)); }
    catch (error) { Alert.alert(t('openFailed'), error instanceof Error ? error.message : String(error)); }
  };
  const toggleDriverPhoto = async (show: boolean) => {
    if (!cloudUser) {
      setStore((current) => ({ ...current, profiles: current.profiles.map((item) => item.id === demoOwnerId ? { ...item, show_driver_photo: show } : item) }));
      return;
    }
    try { await setCloudDriverPhotoVisibility(cloudUser.id, show); await refreshCloud(); }
    catch (error) { Alert.alert(t('updateFailed'), error instanceof Error ? error.message : String(error)); }
  };
  const withdrawVehiclePhoto = async (document: VerificationDocument) => {
    if (cloudUser) {
      try { await withdrawCloudVehiclePhoto(document.id); await refreshCloud(); }
      catch (error) { Alert.alert(t('updateFailed'), error instanceof Error ? error.message : String(error)); }
      return;
    }
    setStore((current) => ({ ...current, documents: (current.documents ?? []).map((item) => item.id === document.id ? { ...item, displayWithdrawnAt: new Date().toISOString() } : item) }));
  };
  const uploadDocument = async (type: DocumentType, vehicleId: string | null) => {
    const ownerId = cloudUser?.id ?? demoOwnerId;
    const existingDoc = vehicleId ? latestVerificationDocument(store.documents ?? [], ownerId, vehicleId, type) : null;
    const expiry = vehicleId && (type === 'insurance' || type === 'pollution')
      ? (vehicleExpiryDates[vehicleId]?.[type]?.trim() || existingDoc?.expiresOn || '')
      : null;
    if ((type === 'insurance' || type === 'pollution') && (!expiry || !/^\d{4}-\d{2}-\d{2}$/.test(expiry) || expiry < todayInIndia())) {
      Alert.alert(t('checkDetails'), t('expiryRequired')); return;
    }
    if (!cloudUser) {
      const document: VerificationDocument = { id: `demo-${Date.now()}`, ownerId, vehicleId, type, storagePath: 'demo://sample', status: 'pending', expiresOn: expiry, rejectionReason: null, createdAt: new Date().toISOString() };
      setStore((s) => ({ ...s, documents: [document, ...(s.documents ?? [])], profiles: vehicleId || type === 'vehicle_photo' ? s.profiles : s.profiles.map((item) => item.id === ownerId ? { ...item, owner_review_status: 'pending' } : item), cabs: type === 'vehicle_photo' ? s.cabs : s.cabs.map((cab) => (vehicleId ? cab.id === vehicleId : cab.ownerId === ownerId) ? { ...cab, reviewStatus: 'pending', available: false } : cab) }));
      Alert.alert(t('uploadReady'), t('demoSampleDocument'));
      return;
    }
    try {
      let file: { uri: string; name: string; mimeType: string } | null = null;
      if (type === 'selfie') {
        const photo = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.85 });
        if (!photo.canceled) { const asset = photo.assets[0]; file = { uri: asset.uri, name: `selfie-${Date.now()}.jpg`, mimeType: asset.mimeType ?? 'image/jpeg' }; }
      } else if (type === 'vehicle_photo') {
        const photo = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.85 });
        if (!photo.canceled) { const asset = photo.assets[0]; file = { uri: asset.uri, name: `vehicle-${Date.now()}.jpg`, mimeType: asset.mimeType ?? 'image/jpeg' }; }
      } else {
        const picked = await DocumentPicker.getDocumentAsync({ type: ['image/*', 'application/pdf'], copyToCacheDirectory: true, multiple: false });
        if (!picked.canceled) { const asset = picked.assets[0]; file = { uri: asset.uri, name: asset.name, mimeType: asset.mimeType ?? 'application/octet-stream' }; }
      }
      if (!file) { Alert.alert(t('uploadCancelled')); return; }
      if (!(type === 'vehicle_photo' ? ['image/jpeg', 'image/png', 'image/webp'] : ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']).includes(file.mimeType)) { Alert.alert(t('uploadFailed'), t('unsupportedDocument')); return; }
      await uploadVerificationDocument({ ownerId, vehicleId, type, ...file, expiresOn: expiry });
      await refreshCloud();
      Alert.alert(t('uploadReady'));
    } catch (error) { Alert.alert(t('uploadFailed'), error instanceof Error ? error.message : String(error)); }
  };
  const submitAuth = async () => {
    if (!supabase) { Alert.alert(t('backendMissing'), t('backendSetup')); return; }
    const digits = authPhone.replace(/[^\d+]/g, '');
    const phone = digits.startsWith('+') ? digits : digits.length === 10 ? `+91${digits}` : `+${digits}`;
    if (phone.replace(/\D/g, '').length < 10 || authPassword.length < 6) { Alert.alert(t('checkDetails'), t('validPhonePassword')); return; }
    try {
      if (authMode === 'signup') {
        if (!authName.trim()) { Alert.alert(t('enterName')); return; }
        const { data, error } = await supabase.auth.signUp({ phone, password: authPassword, options: { data: { full_name: authName.trim(), role: authRole } } });
        if (error) throw error;
        if (!data.session) Alert.alert(t('phoneConfirmationRequired'), t('disablePhoneConfirmationForPasswordOnly'));
      } else {
        const { error } = await supabase.auth.signInWithPassword({ phone, password: authPassword });
        if (error) throw error;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const phoneSignupDisabled = authMode === 'signup' && /phone.{0,40}sign.?ups?.{0,20}disabled|sign.?ups?.{0,20}disabled.{0,40}phone/i.test(message);
      Alert.alert(phoneSignupDisabled ? t('phoneSignupDisabled') : authMode === 'signup' ? t('signUpFailed') : t('signInFailed'), phoneSignupDisabled ? t('enablePhoneSignup') : message);
    }
  };

  const signOut = async () => {
    if (cloudUser && pushToken.current) {
      await removeCloudPushToken(cloudUser.id, pushToken.current).catch(() => undefined);
      await AsyncStorage.removeItem(pushTokenStorageKey(cloudUser.id));
      pushToken.current = null;
    }
    await supabase?.auth.signOut();
  };
  const header = (title: string, back?: () => void) => (
    <AppHeader
      title={title}
      back={back}
      signedIn={Boolean(cloudUser)}
      hindi={hindi}
      onSignOut={signOut}
      onToggleLanguage={() => setHindi(!hindi)}
      onOpenHelp={() => {
        if (page !== 'help') {
          setReturnPage(page === 'add' || page === 'confirm' ? 'home' : (page as any));
          setPage('help');
        }
      }}
      t={t}
    />
  );
  const rolePicker = () => demoMode && !cloudUser ? <RolePicker role={role} t={t} onPick={(value) => { setRole(value); setPage(value === 'customer' ? 'home' : value === 'owner' ? 'owner' : 'admin'); }} /> : null;
  const field = (label: string, value: string, onChange: (text: string) => void, placeholder = '', keyboardType: 'default' | 'numeric' = 'default', secureTextEntry = false) => <FormField label={label} value={value} onChange={onChange} placeholder={placeholder} keyboardType={keyboardType === 'numeric' ? 'numeric' : 'default'} secureTextEntry={secureTextEntry} />;
  const primary = (label: string, onPress: () => void) => <PrimaryButton label={label} onPress={onPress} />;

  let content: React.ReactNode;
  if (page === 'help') {
    content = (
      <>
        {header(t('helpAndPrivacy'), () => setPage(returnPage))}
        <HelpPrivacyScreen
          hindi={hindi}
          t={t}
          signedIn={Boolean(cloudUser)}
          onBack={() => setPage(returnPage)}
          onDeleteAccount={async () => {
            if (cloudUser) {
              try {
                await closeCloudAccount();
              } catch (e: unknown) {
                const msg = e instanceof Error ? e.message : t('accountDeletionFailed');
                Alert.alert(t('accountDeletion'), msg);
                return;
              }
              await signOut();
              setPage('auth');
              Alert.alert(t('accountDeletion'), t('accountDeleted'));
            } else {
              await AsyncStorage.removeItem(KEY);
              setStore(INITIAL);
              setDemoMode(false);
              setPage('auth');
              Alert.alert(t('accountDeletion'), t('accountDeleted'));
            }
          }}
        />
      </>
    );
  } else if (page === 'auth' && !demoMode && !cloudUser) {
    content = <>{header(t('brand'))}<ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.hero}><View style={styles.heroCopy}><Text style={styles.heroEyebrow}>{t('authEyebrow')}</Text><Text style={styles.heroTitle}>{authMode === 'signup' ? t('createAccount') : t('welcomeBack')}</Text><Text style={styles.heroNote}>{t('tagline')}</Text></View><Text style={styles.heroEmoji}>🚕</Text></View>
      <View style={styles.panel}>
        {authMode === 'signup' && <>{field(t('yourName'), authName, setAuthName, t('fullName'))}<Text style={styles.fieldLabel}>{t('roleQuestion')}</Text><View style={styles.roleRow}>{(['customer', 'owner'] as const).map((r) => <Pressable key={r} onPress={() => setAuthRole(r)} style={[styles.roleButton, authRole === r && styles.roleButtonActive]}><Text style={[styles.roleText, authRole === r && styles.roleTextActive]}>{t(r)}</Text></Pressable>)}</View></>}
        {field(t('phone'), authPhone, setAuthPhone, t('phonePlaceholder'), 'numeric')}
        {field(t('password'), authPassword, setAuthPassword, t('passwordPlaceholder'), 'default', true)}
        <Text style={styles.helper}>{t('phoneHelper')}</Text>
        {primary(authMode === 'signup' ? t('createAccountButton') : t('signIn'), submitAuth)}
        <Pressable onPress={() => setAuthMode(authMode === 'signup' ? 'signin' : 'signup')} style={styles.switchAuth}><Text style={styles.switchAuthText}>{authMode === 'signup' ? t('alreadyAccount') : t('newAccount')}</Text></Pressable>
      </View>
      <View style={styles.demoIntro}><Text style={styles.demoIntroText}>{t('tryDemo')}</Text><Pressable onPress={() => { setDemoMode(true); setRole('customer'); setPage('home'); }} style={styles.outlineButton}><Text style={styles.outlineButtonText}>{t('openDemo')}</Text></Pressable></View>
      {!supabaseReady && <Text style={styles.helper}>{t('supabaseMissing')}</Text>}
    </ScrollView></>;
  } else if (page === 'home') {
    content = <>{header(t('customer'))}<CustomerHomeContent t={t} hindi={hindi} kind={kind} localFrom={localFrom} outstationFrom={outstationFrom} availableCabCount={cabsOpenForSearch.length} setKind={setKind} pickupArea={pickupArea} setPickupArea={setPickupArea} onSearch={() => setPage('search')} rolePicker={rolePicker()} />{bottomNav('home')}</>;
  } else if (page === 'search') {
    content = <>{header(t('tripDetails'), () => setPage('home'))}<CustomerSearchContent t={t} hindi={hindi} kind={kind} pickupArea={pickupArea} setPickupArea={setPickupArea} vehicleType={vehicleType} setVehicleType={setVehicleType} date={date} setDate={setDate} time={time} setTime={setTime} hours={hours} setHours={setHours} destination={destination} setDestination={setDestination} onSearch={openResults} />{bottomNav('home')}</>;
  } else if (page === 'results') {
    content = <>{header(t('nearby'), () => setPage('search'))}<SearchResultsContent hindi={hindi} t={t} kind={kind} vehicleType={vehicleType} pickupArea={pickupArea} date={date} time={time} hours={hours} destination={destination} results={results} onSelectCab={reviewCab} onAnyVehicle={() => setVehicleType('Any')} onChangeSearch={() => setPage('search')} rolePicker={rolePicker()} />{bottomNav('results')}</>;
  } else if (page === 'confirm' && selectedCab) {
    content = <>{header(t('reviewBooking'), () => setPage('results'))}<ScrollView contentContainerStyle={styles.content}><BookingConfirmation cab={selectedCab} kind={kind} date={date} time={time} hours={Number(hours) || 1} pickupArea={pickupArea} destination={destination} estimate={amountFor(selectedCab)} hindi={hindi} t={t} submitting={bookingSubmitting} onSend={() => { void createBooking(selectedCab); }} onChangeDetails={() => { bookingRequestKey.current = null; setPage('search'); }} /></ScrollView></>;
  } else if (page === 'bookings') {
    content = <>{header(t('bookings'), () => setPage('home'))}<CustomerBookingsContent bookings={store.bookings} hindi={hindi} t={t} onChangeStatus={changeBooking} onSearch={() => setPage('search')} rolePicker={rolePicker()} />{bottomNav('bookings')}</>;
  } else if (page === 'owner') {
    const ownerId = cloudUser?.id ?? demoOwnerId;
    const owned = store.cabs.filter((cab) => cab.ownerId === ownerId);
    const ownBookings = store.bookings.filter((booking) => owned.some((cab) => cab.id === booking.cabId));
    const ownerAccount = store.profiles.find((item) => item.id === ownerId);
    const demoOwners = demoMode ? store.profiles.filter((item) => item.role === 'owner').map((item) => ({ id: item.id, name: item.full_name })) : undefined;
    content = <>{header(t('ownerPanel'))}<OwnerDashboardContent owned={owned} bookings={ownBookings} currentOwnerId={ownerId} ownerName={profile?.full_name ?? ownerAccount?.full_name ?? ''} ownerReviewStatus={cloudUser ? profile?.owner_review_status : ownerAccount?.owner_review_status} showDriverPhoto={cloudUser ? Boolean(profile?.show_driver_photo) : Boolean(ownerAccount?.show_driver_photo)} onToggleDriverPhoto={(show) => void toggleDriverPhoto(show)} documents={store.documents ?? []} vehicleExpiry={(id, type) => vehicleExpiryDates[id]?.[type] ?? (latestVerificationDocument(store.documents ?? [], ownerId, id, type)?.expiresOn ?? '')} setVehicleExpiry={(id, type, value) => setVehicleExpiryDates((current) => ({ ...current, [id]: { insurance: current[id]?.insurance ?? '', pollution: current[id]?.pollution ?? '', [type]: value } }))} onUploadDocument={(type, vehicleId) => void uploadDocument(type, vehicleId)} onWithdrawVehiclePhoto={(document) => void withdrawVehiclePhoto(document)} demoOwners={demoOwners} demoOwnerId={demoOwnerId} onSelectDemoOwner={setDemoOwnerId} pushState={demoMode ? 'unsupported' : pushState} focusBookingId={focusBookingId} onEnablePush={() => cloudUser && void enablePush(cloudUser.id)} onDisablePush={() => void disablePush()} hindi={hindi} t={t} rolePicker={rolePicker()} onAddVehicle={() => setPage('add')} onEditVehicle={editCab} onToggleAvailability={toggleAvailability} onChangeStatus={changeBooking} />{bottomNav('owner')}</>;
  } else if (page === 'add') {
    content = <>{header(editingCabId ? t('editVehicle') : t('addVehicle'), () => { setEditingCabId(null); setNewName(''); setPage('owner'); })}<KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}><VehicleFormContent hindi={hindi} t={t} newName={newName} setNewName={setNewName} newType={newType} setNewType={setNewType} newSeats={newSeats} setNewSeats={setNewSeats} newHourly={newHourly} setNewHourly={setNewHourly} newFullDay={newFullDay} setNewFullDay={setNewFullDay} newPerKm={newPerKm} setNewPerKm={setNewPerKm} registrationNumber={newRegistration} setRegistrationNumber={setNewRegistration} availabilityStart={newAvailabilityStart} setAvailabilityStart={setNewAvailabilityStart} availabilityEnd={newAvailabilityEnd} setAvailabilityEnd={setNewAvailabilityEnd} onSave={addCab} /></KeyboardAvoidingView></>;
  } else {
    content = <>{header(t('dashboard'))}<AdminScreen store={store} live={Boolean(cloudUser)} hindi={hindi} t={t} rolePicker={rolePicker()} onToggleAccount={toggleAdminAccount} onToggleVehicle={toggleAdminVehicle} onReviewOwner={reviewOwner} onReviewVehicle={reviewVehicle} onReviewDocument={reviewDocument} onOpenDocument={showVerificationDocument} onChangeStatus={changeBooking} />{bottomNav('admin')}</>;
  }

  function bottomNav(active: 'home' | 'results' | 'bookings' | 'owner' | 'admin') {
    return <BottomNavigation role={role} active={active} live={Boolean(cloudUser)} t={t} onNavigate={setPage} />;
  }

  const androidTopInset = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) + 8 : 0;
  return <SafeAreaView style={[styles.safe, { paddingTop: androidTopInset }]}><StatusBar barStyle="dark-content" backgroundColor={C.bg} />{cloudLoading && cloudUser ? <View style={styles.loading}><Text style={styles.logoMark}>MS</Text><Text style={styles.headerTitle}>{t('loadingRides')}</Text></View> : ready ? <View style={{ flex: 1 }}>{syncIssue && cloudUser && <Pressable accessibilityRole="button" onPress={() => refreshCloud().catch(() => undefined)} style={[styles.summaryPanel, { margin: 8, borderColor: C.red, borderWidth: 1 }]}><Text style={styles.summaryTitle}>{t('retryLoad')}</Text><Text style={styles.confirmationEditText}>{t('retryBooking')}</Text></Pressable>}{content}</View> : <View style={styles.loading}><Text style={styles.logoMark}>MS</Text><Text style={styles.headerTitle}>{t('brand')}</Text></View>}</SafeAreaView>;
}

function requiredDocumentsApproved(documents: VerificationDocument[], ownerId: string, vehicleId: string | null, types: DocumentType[], registrationUpdatedAt?: string) {
  return requiredVerificationDocumentsApproved(documents, ownerId, vehicleId, types, registrationUpdatedAt);
}

function isDisplayableDemoPhoto(documents: VerificationDocument[], ownerId: string, vehicleId: string | null, type: DocumentType) {
  const latest = latestVerificationDocument(documents, ownerId, vehicleId, type);
  return latest?.status === 'approved' && !latest.purgedAt && !latest.displayWithdrawnAt;
}

function demoHistoryEntry(bookingId: string, fromStatus: BookingStatus | null, toStatus: BookingStatus, reason: string | null): BookingStatusHistoryEntry {
  return { id: `demo-history-${Date.now()}-${Math.random()}`, bookingId, fromStatus, toStatus, actorId: null, reason, changedAt: new Date().toISOString() };
}

function restoreDemoStore(saved: Partial<Store>): Store {
  const savedCabs = saved.cabs ?? INITIAL.cabs;
  const cabs = savedCabs.map((cab) => {
    const seed = INITIAL.cabs.find((item) => item.id === cab.id);
    return { ...seed, ...cab, reviewStatus: cab.reviewStatus ?? seed?.reviewStatus ?? 'pending', registrationNumber: cab.registrationNumber ?? seed?.registrationNumber ?? '' } as Cab;
  });
  for (const seeded of INITIAL.cabs) if (!cabs.some((cab) => cab.id === seeded.id)) cabs.push(seeded);
  return {
    ...INITIAL,
    ...saved,
    cabs,
    profiles: saved.profiles?.length ? saved.profiles : INITIAL.profiles,
    documents: saved.documents?.length ? saved.documents : INITIAL.documents,
    bookingHistory: saved.bookingHistory ?? [],
  };
}
