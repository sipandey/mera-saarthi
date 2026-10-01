import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Text,
  View,
} from 'react-native';
import { loadCloudData, createCloudBooking, setCloudBookingStatus, saveCloudVehicle, editCloudVehicle, updateCloudAvailability, setCloudAccountBlocked, setCloudVehicleAvailability } from './src/cloudData';
import { supabase, supabaseReady } from './src/supabase';
import { C, styles } from './src/theme';
import { translate, type CopyKey } from './src/i18n';
import { defaultDate, formatRs } from './src/utils';
import type { Account, Booking, Cab, Hire, Role, Store, VehicleType } from './src/types';
import { AppHeader, FormField, PrimaryButton, RolePicker } from './src/components/Primitives';
import { BookingConfirmation } from './src/components/BookingConfirmation';
import { BottomNavigation } from './src/components/BottomNavigation';
import { CustomerBookingsContent, CustomerHomeContent, CustomerSearchContent, SearchResultsContent } from './src/screens/CustomerScreens';
import { OwnerDashboardContent, VehicleFormContent } from './src/screens/OwnerScreens';
import { AdminScreen } from './src/screens/AdminScreen';

const KEY = 'mera-saarthi-demo-v1';
const INITIAL: Store = {
  cabs: [
    { id: 'cab-a', ownerId: 'owner-a', ownerName: 'Ramesh Kumar', phone: '98765 43210', name: 'Maruti Swift', type: 'Hatchback', seats: 4, available: true, hourly: 180, fullDay: 1400, perKm: 12 },
    { id: 'cab-b', ownerId: 'owner-b', ownerName: 'Suresh Yadav', phone: '98765 12340', name: 'Mahindra Bolero', type: 'SUV', seats: 7, available: true, hourly: 250, fullDay: 2000, perKm: 16 },
    { id: 'cab-c', ownerId: 'owner-c', ownerName: 'Amit Patel', phone: '98765 56780', name: 'Maruti Dzire', type: 'Sedan', seats: 4, available: true, hourly: 200, fullDay: 1600, perKm: 14 },
  ],
  bookings: [], blockedOwners: [], blockedCustomers: [], blockedVehicles: [], customerName: 'Guest Customer', profiles: [],
};

export default function App() {
  const [store, setStore] = useState<Store>(INITIAL);
  const [ready, setReady] = useState(false);
  const [role, setRole] = useState<Role>('customer');
  const [hindi, setHindi] = useState(true);
  const [page, setPage] = useState<'auth' | 'home' | 'search' | 'results' | 'confirm' | 'bookings' | 'owner' | 'add' | 'admin'>('auth');
  const [cloudUser, setCloudUser] = useState<{ id: string; phone?: string } | null>(null);
  const [profile, setProfile] = useState<Account | null>(null);
  const [cloudLoading, setCloudLoading] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [authName, setAuthName] = useState('');
  const [authPhone, setAuthPhone] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authRole, setAuthRole] = useState<'customer' | 'owner'>('customer');
  const [demoMode, setDemoMode] = useState(false);
  const [kind, setKind] = useState<Hire>('local');
  const [vehicleType, setVehicleType] = useState<VehicleType | 'Any'>('Any');
  const [date, setDate] = useState(defaultDate());
  const [time, setTime] = useState('09:00');
  const [hours, setHours] = useState('4');
  const [destination, setDestination] = useState('');
  const [pickupArea, setPickupArea] = useState('');
  const [km, setKm] = useState('80');
  const [selectedCab, setSelectedCab] = useState<Cab | null>(null);
  const [newName, setNewName] = useState('');
  const [editingCabId, setEditingCabId] = useState<string | null>(null);
  const [newType, setNewType] = useState<VehicleType>('SUV');
  const [newSeats, setNewSeats] = useState('6');
  const [newHourly, setNewHourly] = useState('220');
  const [newFullDay, setNewFullDay] = useState('1800');
  const [newPerKm, setNewPerKm] = useState('15');

  const t = (key: string) => translate(key as CopyKey, hindi ? 'hi' : 'en');
  useEffect(() => {
    AsyncStorage.getItem(KEY).then((saved) => {
      if (saved) setStore({ ...INITIAL, ...JSON.parse(saved) });
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
      else { setCloudUser(null); setProfile(null); setPage('auth'); setRole('customer'); }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!cloudUser || !supabase) return;
    let active = true;
    setCloudLoading(true);
    (async () => {
      const { data: profileData, error } = await supabase.from('profiles').select('id, role, full_name, phone, is_blocked').eq('id', cloudUser.id).single();
      if (error) throw new Error(error.message);
      if (profileData.is_blocked) {
        await supabase.auth.signOut();
        throw new Error(t('blockedAccount'));
      }
      const loaded = await loadCloudData(cloudUser.id, profileData.role, profileData.full_name, profileData.phone);
      if (!active) return;
      const account = profileData as Account;
      setProfile(account); setRole(account.role);
      setStore((current) => ({ ...INITIAL, ...current, blockedOwners: [], blockedCustomers: [], blockedVehicles: [], cabs: loaded.cabs, bookings: loaded.bookings, customerName: account.full_name || t('customerGeneric'), profiles: loaded.profiles }));
      setPage(account.role === 'customer' ? 'home' : account.role === 'owner' ? 'owner' : 'admin');
    })().catch((error: unknown) => {
      if (active) Alert.alert(t('loadFailed'), error instanceof Error ? error.message : String(error));
    }).finally(() => { if (active) setCloudLoading(false); });
    return () => { active = false; };
  }, [cloudUser?.id]);

  const results = useMemo(() => {
    const requestedStart = new Date(`${date}T${time}:00`).getTime();
    const requestedEnd = requestedStart + Math.max(1, Number(hours) || 1) * 60 * 60 * 1000;
    return store.cabs.filter((cab) => {
      const conflict = Number.isFinite(requestedStart) && store.bookings.some((b) => {
        if (b.cabId !== cab.id || !['pending', 'accepted'].includes(b.status)) return false;
        const start = new Date(`${b.date}T${b.time}:00`).getTime();
        const end = start + Math.max(1, b.hours || 1) * 60 * 60 * 1000;
        return Number.isFinite(start) && requestedStart < end && start < requestedEnd;
      });
      return cab.available && !cab.blocked && !store.blockedVehicles.includes(cab.id) && !store.blockedOwners.includes(cab.ownerId) && (vehicleType === 'Any' || cab.type === vehicleType) && !conflict;
    });
  }, [store, vehicleType, date, time, hours]);
  const cabsOpenForSearch = store.cabs.filter((cab) => cab.available && !cab.blocked && !store.blockedVehicles.includes(cab.id) && !store.blockedOwners.includes(cab.ownerId));
  const localFrom = cabsOpenForSearch.length ? formatRs(Math.min(...cabsOpenForSearch.map((cab) => cab.fullDay))) : '—';
  const outstationFrom = cabsOpenForSearch.length ? formatRs(Math.min(...cabsOpenForSearch.map((cab) => cab.perKm))) : '—';
  const amountFor = (cab: Cab) => kind === 'local' ? (Number(hours) >= 8 ? cab.fullDay : cab.hourly * Math.max(1, Number(hours) || 1)) : cab.perKm * (Number(km) || 0);
  const openResults = () => {
    if (!pickupArea.trim()) { Alert.alert(t('pickupArea'), t('pickupRequired')); return; }
    const rideAt = new Date(`${date}T${time}:00`);
    if (!Number.isFinite(rideAt.getTime()) || rideAt.getTime() < Date.now() || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
      Alert.alert(t('checkDateTime'), t('futureDateTime')); return;
    }
    if ((kind === 'local' && (Number(hours) < 1 || !Number.isFinite(Number(hours)))) || (kind === 'outstation' && (Number(km) < 1 || Number(hours) < 1))) {
      Alert.alert(t('checkTrip'), t('validTrip')); return;
    }
    if (kind === 'outstation' && !destination.trim()) { Alert.alert(t('addDestination'), t('enterDestination')); return; }
    setPage('results');
  };
  const refreshCloud = async () => {
    if (!cloudUser || !profile) return;
    const loaded = await loadCloudData(cloudUser.id, profile.role, profile.full_name, profile.phone);
    setStore((current) => ({ ...current, cabs: loaded.cabs, bookings: loaded.bookings, profiles: loaded.profiles }));
  };
  useEffect(() => {
    if (!cloudUser || !profile) return;
    const timer = setInterval(() => { refreshCloud().catch(() => undefined); }, 30000);
    return () => clearInterval(timer);
  }, [cloudUser?.id, profile?.id]);
  const createBooking = async (cab: Cab) => {
    const item: Booking = {
      id: `ride-${Date.now()}`, cabId: cab.id, cabName: cab.name, ownerName: cab.ownerName, ownerPhone: cab.phone,
      customerName: store.customerName, kind, vehicleType: cab.type, date, time, hours: Number(hours) || 1,
      pickupArea, destination: kind === 'local' ? 'Local trip' : destination, km: kind === 'local' ? 0 : Number(km) || 0,
      estimate: amountFor(cab), status: 'pending',
    };
    if (cloudUser) {
      try {
        await createCloudBooking({ customerId: cloudUser.id, customerName: store.customerName, cabId: cab.id, rideType: kind, vehicleType: cab.type, date, time, hours: Number(hours) || 1, pickupLocation: pickupArea, destination: item.destination, km: item.km, estimate: item.estimate });
        await refreshCloud();
      } catch (error) { Alert.alert(t('bookingFailed'), error instanceof Error ? error.message : String(error)); return; }
    } else setStore((s) => ({ ...s, bookings: [item, ...s.bookings] }));
    setSelectedCab(cab); setPage('bookings');
    Alert.alert(t('bookingSent'), t('waitOwner'));
  };
  const reviewCab = (cab: Cab) => { setSelectedCab(cab); setPage('confirm'); };
  const changeBooking = async (id: string, status: Booking['status']) => {
    if (cloudUser && status !== 'pending') {
      try { await setCloudBookingStatus(id, status); await refreshCloud(); }
      catch (error) { Alert.alert(t('updateFailed'), error instanceof Error ? error.message : String(error)); }
    } else setStore((s) => ({ ...s, bookings: s.bookings.map((b) => b.id === id ? { ...b, status } : b) }));
  };
  const addCab = async () => {
    if (!newName.trim()) { Alert.alert(t('enterVehicleName')); return; }
    const rates = [Number(newHourly), Number(newFullDay), Number(newPerKm), Number(newSeats)];
    if (rates.some((value) => !Number.isFinite(value) || value <= 0)) { Alert.alert(t('checkFaresSeats'), t('validFaresSeats')); return; }
    const cab: Cab = { id: `cab-${Date.now()}`, ownerId: cloudUser?.id ?? 'owner-a', ownerName: profile?.full_name ?? 'Ramesh Kumar', phone: profile?.phone ?? '98765 43210', name: newName.trim(), type: newType, seats: Number(newSeats) || 4, available: true, hourly: Number(newHourly) || 0, fullDay: Number(newFullDay) || 0, perKm: Number(newPerKm) || 0 };
    if (cloudUser) {
      try {
        const details = { name: cab.name, type: cab.type, seats: cab.seats, hourly: cab.hourly, fullDay: cab.fullDay, perKm: cab.perKm };
        if (editingCabId) await editCloudVehicle(editingCabId, details);
        else await saveCloudVehicle({ ownerId: cloudUser.id, ...details });
        await refreshCloud();
      }
      catch (error) { Alert.alert(t('saveVehicleFailed'), error instanceof Error ? error.message : String(error)); return; }
    } else if (editingCabId) setStore((s) => ({ ...s, cabs: s.cabs.map((v) => v.id === editingCabId ? { ...cab, id: editingCabId } : v) }));
    else setStore((s) => ({ ...s, cabs: [...s.cabs, cab] }));
    setNewName(''); setEditingCabId(null); setPage('owner');
  };
  const editCab = (cab: Cab) => {
    setEditingCabId(cab.id); setNewName(cab.name); setNewType(cab.type); setNewSeats(String(cab.seats));
    setNewHourly(String(cab.hourly)); setNewFullDay(String(cab.fullDay)); setNewPerKm(String(cab.perKm)); setPage('add');
  };
  const toggleAvailability = async (cabId: string, available: boolean) => {
    if (cloudUser) {
      try { await updateCloudAvailability(cabId, available); await refreshCloud(); }
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
  const toggleAdminVehicle = async (cab: Cab, available: boolean) => {
    if (cloudUser) {
      try { await setCloudVehicleAvailability(cab.id, available); await refreshCloud(); }
      catch (error) { Alert.alert(t('updateFailed'), error instanceof Error ? error.message : String(error)); }
    } else setStore((s) => ({ ...s, blockedVehicles: available ? s.blockedVehicles.filter((x) => x !== cab.id) : [...s.blockedVehicles, cab.id] }));
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

  const header = (title: string, back?: () => void) => <AppHeader title={title} back={back} signedIn={Boolean(cloudUser)} hindi={hindi} onSignOut={() => supabase?.auth.signOut()} onToggleLanguage={() => setHindi(!hindi)} t={t} />;
  const rolePicker = () => demoMode && !cloudUser ? <RolePicker role={role} t={t} onPick={(value) => { setRole(value); setPage(value === 'customer' ? 'home' : value === 'owner' ? 'owner' : 'admin'); }} /> : null;
  const field = (label: string, value: string, onChange: (text: string) => void, placeholder = '', keyboardType: 'default' | 'numeric' = 'default', secureTextEntry = false) => <FormField label={label} value={value} onChange={onChange} placeholder={placeholder} keyboardType={keyboardType === 'numeric' ? 'numeric' : 'default'} secureTextEntry={secureTextEntry} />;
  const primary = (label: string, onPress: () => void) => <PrimaryButton label={label} onPress={onPress} />;

  let content: React.ReactNode;
  if (page === 'auth' && !demoMode && !cloudUser) {
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
    content = <>{header(t('tripDetails'), () => setPage('home'))}<CustomerSearchContent t={t} hindi={hindi} kind={kind} pickupArea={pickupArea} setPickupArea={setPickupArea} vehicleType={vehicleType} setVehicleType={setVehicleType} date={date} setDate={setDate} time={time} setTime={setTime} hours={hours} setHours={setHours} destination={destination} setDestination={setDestination} km={km} setKm={setKm} onSearch={openResults} />{bottomNav('home')}</>;
  } else if (page === 'results') {
    content = <>{header(t('nearby'), () => setPage('search'))}<SearchResultsContent hindi={hindi} t={t} kind={kind} vehicleType={vehicleType} pickupArea={pickupArea} date={date} time={time} hours={hours} destination={destination} km={km} results={results} onSelectCab={reviewCab} rolePicker={rolePicker()} />{bottomNav('results')}</>;
  } else if (page === 'confirm' && selectedCab) {
    content = <>{header(t('reviewBooking'), () => setPage('results'))}<ScrollView contentContainerStyle={styles.content}><BookingConfirmation cab={selectedCab} kind={kind} date={date} time={time} hours={Number(hours) || 1} pickupArea={pickupArea} destination={destination} km={Number(km) || 0} estimate={amountFor(selectedCab)} hindi={hindi} t={t} onSend={() => { void createBooking(selectedCab); }} onChangeDetails={() => setPage('search')} /></ScrollView></>;
  } else if (page === 'bookings') {
    content = <>{header(t('bookings'), () => setPage('home'))}<CustomerBookingsContent bookings={store.bookings} hindi={hindi} t={t} onChangeStatus={changeBooking} onSearch={() => setPage('search')} rolePicker={rolePicker()} />{bottomNav('bookings')}</>;
  } else if (page === 'owner') {
    const owned = store.cabs.filter((cab) => cab.ownerId === (cloudUser?.id ?? 'owner-a'));
    const ownBookings = store.bookings.filter((booking) => owned.some((cab) => cab.id === booking.cabId));
    content = <>{header(t('ownerPanel'))}<OwnerDashboardContent owned={owned} bookings={ownBookings} ownerName={profile?.full_name ?? ''} hindi={hindi} t={t} rolePicker={rolePicker()} onAddVehicle={() => setPage('add')} onEditVehicle={editCab} onToggleAvailability={toggleAvailability} onChangeStatus={changeBooking} />{bottomNav('owner')}</>;
  } else if (page === 'add') {
    content = <>{header(editingCabId ? t('editVehicle') : t('addVehicle'), () => { setEditingCabId(null); setNewName(''); setPage('owner'); })}<KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}><VehicleFormContent hindi={hindi} t={t} newName={newName} setNewName={setNewName} newType={newType} setNewType={setNewType} newSeats={newSeats} setNewSeats={setNewSeats} newHourly={newHourly} setNewHourly={setNewHourly} newFullDay={newFullDay} setNewFullDay={setNewFullDay} newPerKm={newPerKm} setNewPerKm={setNewPerKm} onSave={addCab} /></KeyboardAvoidingView></>;
  } else {
    content = <>{header(t('dashboard'))}<AdminScreen store={store} live={Boolean(cloudUser)} hindi={hindi} t={t} rolePicker={rolePicker()} onToggleAccount={toggleAdminAccount} onToggleVehicle={toggleAdminVehicle} onChangeStatus={changeBooking} />{bottomNav('admin')}</>;
  }

  function bottomNav(active: 'home' | 'results' | 'bookings' | 'owner' | 'admin') {
    return <BottomNavigation role={role} active={active} live={Boolean(cloudUser)} t={t} onNavigate={setPage} />;
  }

  const androidTopInset = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) + 8 : 0;
  return <SafeAreaView style={[styles.safe, { paddingTop: androidTopInset }]}><StatusBar barStyle="dark-content" backgroundColor={C.bg} />{cloudLoading && cloudUser ? <View style={styles.loading}><Text style={styles.logoMark}>MS</Text><Text style={styles.headerTitle}>{t('loadingRides')}</Text></View> : ready ? content : <View style={styles.loading}><Text style={styles.logoMark}>MS</Text><Text style={styles.headerTitle}>{t('brand')}</Text></View>}</SafeAreaView>;
}
