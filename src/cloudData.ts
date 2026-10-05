import { supabase } from './supabase';
import type { BookingStatus, DocumentType, PilotMetric, ReviewStatus, VerificationDocument } from './types';
import { compareVerificationDocuments, requiredVerificationDocumentsApproved } from './verification';

export type CloudRole = 'customer' | 'owner' | 'admin';

const fail = (error: { message: string } | null) => { if (error) throw new Error(error.message); };
const asText = (value: string | null | undefined) => value ?? '';
const localDate = (value: Date) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
const localTime = (value: Date) => `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;

export async function loadCloudData(userId: string, role: CloudRole, profileName: string, profilePhone: string, ownerReviewStatus?: ReviewStatus | null) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const carsQuery = role === 'customer'
    ? supabase.from('available_vehicles').select('*')
    : supabase.from('vehicles').select('*').order('created_at', { ascending: false });
  const expiryResult = await supabase.rpc('expire_stale_bookings');
  fail(expiryResult.error);
  const bookingsQuery = supabase.from('bookings').select('*').order('pickup_at', { ascending: true });
  const [carsResult, bookingsResult, profilesResult, documentsResult] = await Promise.all([
    carsQuery,
    bookingsQuery,
    role === 'admin' ? supabase.from('profiles').select('id, role, full_name, phone, is_blocked, owner_review_status, created_at') : Promise.resolve({ data: [], error: null }),
    supabase.from('verification_documents').select('*').order('created_at', { ascending: false }),
  ]);
  fail(carsResult.error); fail(bookingsResult.error); fail(profilesResult.error); fail(documentsResult.error);
  const profiles = (profilesResult.data ?? []) as any[];
  const profileById = new Map(profiles.map((p) => [p.id, p]));
  const documents: VerificationDocument[] = ((documentsResult.data ?? []) as any[]).map((d) => ({
    id: d.id, ownerId: d.owner_id, vehicleId: d.vehicle_id, type: d.document_type,
    storagePath: d.storage_path ?? '', status: d.status, expiresOn: d.expires_on,
    rejectionReason: d.rejection_reason, createdAt: d.created_at,
    purgedAt: d.purged_at ?? null, displayWithdrawnAt: d.display_withdrawn_at ?? null,
  }));
  const displayPhotos = new Map<string, string>();
  if (role === 'customer') {
    const latestDisplayDocuments = documents.filter((document) => document.status === 'approved' && !document.purgedAt && !document.displayWithdrawnAt && (document.type === 'selfie' || document.type === 'vehicle_photo'))
      .reduce((latest, document) => {
        const key = `${document.type}:${document.type === 'selfie' ? document.ownerId : document.vehicleId}`;
        const previous = latest.get(key);
        if (!previous || compareVerificationDocuments(document, previous) > 0) latest.set(key, document);
        return latest;
      }, new Map<string, VerificationDocument>());
    await Promise.all([...latestDisplayDocuments.entries()].map(async ([key, document]) => {
      const { data, error } = await supabase!.storage.from('verification-documents').createSignedUrl(document.storagePath, 300);
      if (!error && data?.signedUrl) displayPhotos.set(key, data.signedUrl);
    }));
  }
  const documentsApproved = (ownerId: string, vehicleId: string | null, types: DocumentType[], registrationUpdatedAt?: string) =>
    requiredVerificationDocumentsApproved(documents, ownerId, vehicleId, types, registrationUpdatedAt);
  const cabs = ((carsResult.data ?? []) as any[]).map((v) => {
    const owner = profileById.get(v.owner_id);
    const ownerApproved = owner?.owner_review_status === 'approved' || (role === 'owner' && v.owner_id === userId && ownerReviewStatus === 'approved');
    const reviewReady = role === 'customer' || (ownerApproved && documentsApproved(v.owner_id, null, ['aadhaar', 'selfie']) && documentsApproved(v.owner_id, v.id, ['registration', 'insurance', 'pollution'], v.registration_updated_at));
    return {
      id: v.id, ownerId: v.owner_id, ownerName: asText(v.owner_name) || asText(owner?.full_name) || profileName,
      phone: asText(owner?.phone) || (v.owner_id === userId ? profilePhone : ''),
      name: v.name, type: v.vehicle_type, seats: v.seats, available: v.is_available && reviewReady,
      hourly: Number(v.hourly_rate), fullDay: Number(v.full_day_rate), perKm: Number(v.per_km_rate),
      blocked: Boolean(v.is_blocked),
      registrationNumber: v.registration_number ?? '', reviewStatus: v.review_status ?? 'approved',
      availabilityStart: v.availability_start ?? null, availabilityEnd: v.availability_end ?? null,
      availabilityUpdatedAt: v.availability_updated_at ?? '',
      registrationUpdatedAt: v.registration_updated_at ?? '',
      driverPhotoUrl: displayPhotos.get(`selfie:${v.owner_id}`),
      vehiclePhotoUrl: displayPhotos.get(`vehicle_photo:${v.id}`),
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
      km: Number(b.estimated_km), estimate: Number(b.estimated_fare), perKmRate: Number(b.per_km_rate_snapshot ?? cab?.perKm ?? 0),
      status: b.status, statusReason: b.status_reason ?? null, requestKey: b.request_key,
    };
  }));
  let metrics: PilotMetric[] = [];
  if (role === 'admin') {
    const result = await supabase.rpc('get_weekly_pilot_metrics');
    fail(result.error);
    metrics = ((result.data ?? []) as any[]).map((row) => ({ ...row, event_count: Number(row.event_count) }));
  }
  return { cabs, bookings, profiles, documents, metrics };
}

export async function uploadVerificationDocument(input: { ownerId: string; vehicleId: string | null; type: DocumentType; uri: string; name: string; mimeType: string; expiresOn?: string | null }) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const file = await fetch(input.uri);
  const bytes = await file.arrayBuffer();
  const id = `${Date.now()}-${Math.floor(Math.random() * 1_000_000_000)}`;
  const extension = input.name.split('.').pop()?.replace(/[^a-z\d]/gi, '').toLowerCase() || 'bin';
  const storagePath = `${input.ownerId}/${id}.${extension}`;
  const uploaded = await supabase.storage.from('verification-documents').upload(storagePath, bytes, { contentType: input.mimeType, upsert: false });
  fail(uploaded.error);
  const saved = await supabase.from('verification_documents').insert({
    owner_id: input.ownerId, vehicle_id: input.vehicleId, document_type: input.type,
    storage_path: storagePath, status: 'pending', expires_on: input.expiresOn ?? null,
  });
  if (saved.error) {
    await supabase.storage.from('verification-documents').remove([storagePath]);
    fail(saved.error);
  }
  if (input.type === 'vehicle_photo') {
    return;
  } else if (input.vehicleId) {
    const reset = await supabase.from('vehicles').update({ review_status: 'pending', is_available: false }).eq('id', input.vehicleId);
    fail(reset.error);
  } else {
    const reset = await supabase.from('profiles').update({ owner_review_status: 'pending' }).eq('id', input.ownerId);
    fail(reset.error);
  }
}

export async function openVerificationDocument(path: string) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data, error } = await supabase.storage.from('verification-documents').createSignedUrl(path, 300);
  fail(error);
  if (!data?.signedUrl) throw new Error('Could not open this document.');
  return data.signedUrl;
}

export async function reviewVerificationDocument(id: string, status: ReviewStatus, reason?: string) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { error } = await supabase.from('verification_documents').update({ status, rejection_reason: status === 'rejected' ? reason : null, reviewed_at: new Date().toISOString() }).eq('id', id);
  fail(error);
}

export async function createCloudBooking(input: {
  customerId: string; customerName: string; cabId: string; rideType: 'local' | 'outstation';
  vehicleType: string; date: string; time: string; hours: number; pickupLocation: string; destination: string; km: number; estimate: number; requestKey: string;
}) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const pickupAt = new Date(`${input.date}T${input.time}:00`);
  if (!Number.isFinite(pickupAt.getTime())) throw new Error('Enter a valid date and time.');
  const { data, error } = await supabase.from('bookings').insert({
    customer_id: input.customerId, vehicle_id: input.cabId, ride_type: input.rideType,
    vehicle_type: input.vehicleType, pickup_at: pickupAt.toISOString(), duration_hours: input.hours,
    pickup_location: input.pickupLocation, destination: input.destination, estimated_km: input.km, estimated_fare: input.estimate,
    payment_method: 'cash', status: 'pending', customer_name: input.customerName, request_key: input.requestKey,
  }).select('id').single();
  if (error?.code === '23505') {
    const retry = await supabase.from('bookings').select('id').eq('request_key', input.requestKey).single();
    fail(retry.error);
    if (!retry.data) throw new Error('The server could not find the earlier booking request.');
    return retry.data;
  }
  fail(error);
  if (!data) throw new Error('The server did not confirm this booking.');
  return data;
}

export async function setCloudBookingStatus(id: string, status: BookingStatus, reason?: string) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { error } = await supabase.from('bookings').update({ status, status_reason: reason ?? null }).eq('id', id).select('id').single();
  fail(error);
}

export async function saveCloudVehicle(input: {
  ownerId: string; name: string; type: string; seats: number; hourly: number; fullDay: number; perKm: number; registrationNumber: string; availabilityStart: string | null; availabilityEnd: string | null;
}) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { error } = await supabase.from('vehicles').insert({
    owner_id: input.ownerId, name: input.name, vehicle_type: input.type, seats: input.seats,
    hourly_rate: input.hourly, full_day_rate: input.fullDay, per_km_rate: input.perKm,
    registration_number: input.registrationNumber, availability_start: input.availabilityStart, availability_end: input.availabilityEnd,
    is_available: false, review_status: 'pending',
  });
  fail(error);
}

export async function editCloudVehicle(id: string, input: {
  name: string; type: string; seats: number; hourly: number; fullDay: number; perKm: number; registrationNumber: string; availabilityStart: string | null; availabilityEnd: string | null;
}) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { error } = await supabase.from('vehicles').update({
    name: input.name, vehicle_type: input.type, seats: input.seats,
    hourly_rate: input.hourly, full_day_rate: input.fullDay, per_km_rate: input.perKm,
    registration_number: input.registrationNumber,
    availability_start: input.availabilityStart, availability_end: input.availabilityEnd,
  }).eq('id', id);
  fail(error);
}

export async function updateCloudAvailability(id: string, available: boolean, start: string | null, end: string | null) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { error } = await supabase.from('vehicles').update({ is_available: available, availability_start: start, availability_end: end }).eq('id', id);
  fail(error);
}

export async function setCloudAccountBlocked(id: string, blocked: boolean) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { error } = await supabase.from('profiles').update({ is_blocked: blocked }).eq('id', id);
  fail(error);
}

export async function setCloudOwnerReviewStatus(id: string, status: ReviewStatus) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { error } = await supabase.from('profiles').update({ owner_review_status: status }).eq('id', id);
  fail(error);
}

export async function setCloudDriverPhotoVisibility(ownerId: string, show: boolean) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { error } = await supabase.from('profiles').update({ show_driver_photo: show }).eq('id', ownerId);
  fail(error);
}

export async function withdrawCloudVehiclePhoto(documentId: string) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { error } = await supabase.rpc('withdraw_optional_vehicle_photo', { p_document_id: documentId });
  fail(error);
}

export async function setCloudVehicleReviewStatus(id: string, status: ReviewStatus) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { error } = await supabase.from('vehicles').update({ review_status: status, is_available: false }).eq('id', id);
  fail(error);
}

export async function setCloudVehicleBlocked(id: string, blocked: boolean) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { error } = await supabase.from('vehicles').update({ is_blocked: blocked }).eq('id', id).select('id').single();
  fail(error);
}

export async function trackPilotEvent(eventName: 'search' | 'results_view', bookingId?: string) {
  if (!supabase) return;
  const { error } = await supabase.rpc('record_pilot_event', { p_event_name: eventName, p_booking_id: bookingId ?? null });
  fail(error);
}

export async function saveCloudPushToken(ownerId: string, token: string) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { error } = await supabase.from('push_tokens').upsert({ owner_id: ownerId, expo_push_token: token, updated_at: new Date().toISOString() }, { onConflict: 'expo_push_token' });
  fail(error);
}

export async function removeCloudPushToken(ownerId: string, token: string) {
  if (!supabase) return;
  const { error } = await supabase.from('push_tokens').delete().eq('owner_id', ownerId).eq('expo_push_token', token);
  fail(error);
}

export async function setCloudVehicleAvailability(id: string, available: boolean) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { error } = await supabase.from('vehicles').update({ is_available: available }).eq('id', id);
  fail(error);
}
