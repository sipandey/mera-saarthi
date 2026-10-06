// Supabase Database Webhook target for booking INSERT events.
// Required function secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
// and BOOKING_PUSH_WEBHOOK_SECRET (also sent as x-booking-webhook-secret).
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-booking-webhook-secret',
};

type BookingWebhook = {
  type?: string;
  record?: { id?: string; vehicle_id?: string; status?: string };
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const webhookSecret = Deno.env.get('BOOKING_PUSH_WEBHOOK_SECRET');
  if (!webhookSecret || request.headers.get('x-booking-webhook-secret') !== webhookSecret) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) return json({ error: 'Push sender is not configured' }, 500);

  let event: BookingWebhook;
  try {
    event = await request.json();
  } catch {
    return json({ error: 'Invalid webhook payload' }, 400);
  }

  const booking = event.record;
  if (event.type !== 'INSERT' || !booking?.id || !booking.vehicle_id || booking.status !== 'pending') {
    return json({ delivered: 0, skipped: true });
  }

  const apiHeaders = {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
  };
  const query = async (table: string, params: Record<string, string>) => {
    const url = new URL(`/rest/v1/${table}`, supabaseUrl);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
    const response = await fetch(url, { headers: { ...apiHeaders, Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Supabase lookup failed (${response.status})`);
    return await response.json();
  };
  const deleteTokens = async (ownerId: string, tokens: string[]) => {
    if (!tokens.length) return;
    const url = new URL('/rest/v1/push_tokens', supabaseUrl);
    url.searchParams.set('owner_id', `eq.${ownerId}`);
    url.searchParams.set('expo_push_token', `in.(${tokens.join(',')})`);
    const response = await fetch(url, {
      method: 'DELETE',
      headers: { ...apiHeaders, Prefer: 'return=minimal' },
    });
    if (!response.ok) throw new Error(`Supabase token cleanup failed (${response.status})`);
  };

  try {
    const vehicles = await query('vehicles', {
      id: `eq.${booking.vehicle_id}`,
      select: 'owner_id,review_status,is_blocked',
      limit: '1',
    }) as Array<{ owner_id: string; review_status: string; is_blocked: boolean }>;
    const vehicle = vehicles[0];
    if (!vehicle || vehicle.review_status !== 'approved' || vehicle.is_blocked) {
      return json({ delivered: 0, skipped: true });
    }

    const owners = await query('profiles', {
      id: `eq.${vehicle.owner_id}`,
      select: 'owner_review_status,is_blocked,role',
      limit: '1',
    }) as Array<{ owner_review_status: string; is_blocked: boolean; role: string }>;
    const owner = owners[0];
    if (!owner || owner.role !== 'owner' || owner.owner_review_status !== 'approved' || owner.is_blocked) {
      return json({ delivered: 0, skipped: true });
    }

    const tokenRows = await query('push_tokens', {
      owner_id: `eq.${vehicle.owner_id}`,
      select: 'expo_push_token',
    }) as Array<{ expo_push_token: string }>;
    const tokens = [...new Set(tokenRows.map((row) => row.expo_push_token))]
      .filter((token) => /^Expo(nent)?PushToken\[[^\]]+\]$/.test(token));
    if (!tokens.length) return json({ delivered: 0, skipped: true });

    let accepted = 0;
    let removed = 0;
    for (let offset = 0; offset < tokens.length; offset += 100) {
      const batch = tokens.slice(offset, offset + 100);
      const pushResponse = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(batch.map((to) => ({
          to,
          title: 'New ride request',
          body: 'Open Mera Saarthi to review the booking request.',
          sound: 'default',
          priority: 'high',
          channelId: 'booking-requests',
          data: { bookingId: booking.id },
        }))),
      });

      if (!pushResponse.ok) {
        // Delivery is best effort. A push outage must never change booking state.
        return json({ accepted, attempted: offset + batch.length, error: 'Push provider unavailable' }, 502);
      }

      const result = await pushResponse.json() as {
        data?: Array<{ status?: string; details?: { error?: string } }>;
      };
      if (!Array.isArray(result.data) || result.data.length !== batch.length) {
        throw new Error('Expo returned an invalid push ticket response');
      }
      accepted += result.data.filter((ticket) => ticket.status === 'ok').length;
      const staleTokens = result.data.flatMap((ticket, index) =>
        ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered' ? [batch[index]] : []
      );
      await deleteTokens(vehicle.owner_id, staleTokens);
      removed += staleTokens.length;
    }
    // An accepted ticket means Expo queued the message; it is not a delivery receipt.
    return json({ accepted, attempted: tokens.length, staleTokensRemoved: removed });
  } catch (error) {
    // Avoid logging booking IDs, tokens, phone numbers, or service credentials.
    console.error(error instanceof Error ? error.message : 'Booking push failed');
    return json({ error: 'Could not dispatch booking notification' }, 502);
  }
});
