import { supabase } from './supabase';

export type CloudRole = 'customer' | 'owner' | 'admin';

const fail = (error: { message: string } | null) => { if (error) throw new Error(error.message); };
const asText = (value: string | null | undefined) => value ?? '';
const localDate = (value: Date) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
const localTime = (value: Date) => `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;

export async function loadCloudData(userId: string, role: CloudRole, profileName: string, profilePhone: string) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const carsQuery = role === 'customer'
    ? supabase.from('available_vehicles').select('*')
    : supabase.from('vehicles').select('*').order('created_at', { ascending: false });
  const bookingsQuery = supabase.from('bookings').select('*').order('pickup_at', { ascending: true });
  const [carsResult, bookingsResult, profilesResult] = await Promise.all([
    carsQuery,
    bookingsQuery,
    role === 'admin' ? supabase.from('profiles').select('id, role, full_name, phone, is_blocked, created_at') : Promise.resolve({ data: [], error: null }),
  ]);
  fail(carsResult.error); fail(bookingsResult.error); fail(profilesResult.error);
  const profiles = (profilesResult.data ?? []) as any[];
  const profileById = new Map(profiles.map((p) => [p.id, p]));
  const cabs = ((carsResult.data ?? []) as any[]).map((v) => {
    const owner = profileById.get(v.owner_id);
    return {
      id: v.id, ownerId: v.owner_id, ownerName: asText(v.owner_name) || asText(owner?.full_name) || profileName,
      phone: asText(owner?.phone) || (v.owner_id === userId ? profilePhone : ''),
      name: v.name, type: v.vehicle_type, seats: v.seats, available: v.is_available,
      hourly: Number(v.hourly_rate), fullDay: Number(v.full_day_rate), perKm: Number(v.per_km_rate),
      blocked: Boolean(owner?.is_blocked),
    };
  });
  const cabById = new Map(cabs.map((c) => [c.id, c]));
  const bookings = await Promise.all(((bookingsResult.data ?? []) as any[]).map(async (b) => {
    const rideAt = new Date(b.pickup_at);
    const contact = role === 'customer' && b.status === 'accepted'
      ? await supabase!.rpc('get_booking_driver_contact', { p_booking_id: b.id })
      : role === 'owner' && b.status === 'accepted'
        ? await supabase!.rpc('get_booking_customer_contact', { p_booking_id: b.id })
      : { data: [], error: null };
    if (contact.error) throw new Error(contact.error.message);
    const driver = Array.isArray(contact.data) ? contact.data[0] : null;
    const cab = cabById.get(b.vehicle_id);
    return {
      id: b.id, cabId: b.vehicle_id, cabName: asText(b.vehicle_name) || cab?.name || '',
      ownerName: asText(driver?.full_name) || asText(b.owner_name) || cab?.ownerName || '',
      ownerPhone: role === 'customer' ? asText(driver?.phone) : role === 'owner' ? asText(profilePhone) : asText(cab?.phone),
      customerName: asText(b.customer_name) || 'Customer', customerPhone: role === 'owner' ? asText(driver?.phone) : asText(profileById.get(b.customer_id)?.phone),
      kind: b.ride_type, vehicleType: b.vehicle_type, date: localDate(rideAt),
      time: localTime(rideAt), hours: Number(b.duration_hours), pickupArea: asText(b.pickup_location), destination: b.destination,
      km: Number(b.estimated_km), estimate: Number(b.estimated_fare), status: b.status,
    };
  }));
  return { cabs, bookings, profiles };
}

export async function createCloudBooking(input: {
  customerId: string; customerName: string; cabId: string; rideType: 'local' | 'outstation';
  vehicleType: string; date: string; time: string; hours: number; pickupLocation: string; destination: string; km: number; estimate: number;
}) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const pickupAt = new Date(`${input.date}T${input.time}:00`);
  if (!Number.isFinite(pickupAt.getTime())) throw new Error('Enter a valid date and time.');
  const { data, error } = await supabase.from('bookings').insert({
    customer_id: input.customerId, vehicle_id: input.cabId, ride_type: input.rideType,
    vehicle_type: input.vehicleType, pickup_at: pickupAt.toISOString(), duration_hours: input.hours,
    pickup_location: input.pickupLocation, destination: input.destination, estimated_km: input.km, estimated_fare: input.estimate,
    payment_method: 'cash', status: 'pending', customer_name: input.customerName,
  }).select('id').single();
  fail(error);
  return data;
}

export async function setCloudBookingStatus(id: string, status: 'accepted' | 'rejected' | 'cancelled') {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { error } = await supabase.from('bookings').update({ status }).eq('id', id);
  fail(error);
}

export async function saveCloudVehicle(input: {
  ownerId: string; name: string; type: string; seats: number; hourly: number; fullDay: number; perKm: number;
}) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { error } = await supabase.from('vehicles').insert({
    owner_id: input.ownerId, name: input.name, vehicle_type: input.type, seats: input.seats,
    hourly_rate: input.hourly, full_day_rate: input.fullDay, per_km_rate: input.perKm, is_available: true,
  });
  fail(error);
}

export async function editCloudVehicle(id: string, input: {
  name: string; type: string; seats: number; hourly: number; fullDay: number; perKm: number;
}) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { error } = await supabase.from('vehicles').update({
    name: input.name, vehicle_type: input.type, seats: input.seats,
    hourly_rate: input.hourly, full_day_rate: input.fullDay, per_km_rate: input.perKm,
  }).eq('id', id);
  fail(error);
}

export async function updateCloudAvailability(id: string, available: boolean) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { error } = await supabase.from('vehicles').update({ is_available: available }).eq('id', id);
  fail(error);
}

export async function setCloudAccountBlocked(id: string, blocked: boolean) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { error } = await supabase.from('profiles').update({ is_blocked: blocked }).eq('id', id);
  fail(error);
}

export async function setCloudVehicleAvailability(id: string, available: boolean) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { error } = await supabase.from('vehicles').update({ is_available: available }).eq('id', id);
  fail(error);
}
