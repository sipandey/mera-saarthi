import { createClient } from 'npm:@supabase/supabase-js@2.57.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-verification-retention-secret',
};
const json = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

function matchesSecret(actual: string | null, expected: string) {
  if (!actual || actual.length !== expected.length) return false;
  let mismatch = 0;
  for (let index = 0; index < expected.length; index += 1) mismatch |= actual.charCodeAt(index) ^ expected.charCodeAt(index);
  return mismatch === 0;
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const retentionSecret = Deno.env.get('VERIFICATION_RETENTION_SECRET');
  if (!retentionSecret || !matchesSecret(request.headers.get('x-verification-retention-secret'), retentionSecret)) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  let serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  try {
    serviceRoleKey = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}').default ?? serviceRoleKey;
  } catch {
    return json({ error: 'Retention worker is not configured' }, 500);
  }
  if (!supabaseUrl || !serviceRoleKey) return json({ error: 'Retention worker is not configured' }, 500);

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const queued = await supabase.rpc('enqueue_due_verification_purges');
    if (queued.error) throw queued.error;
    const claimed = await supabase.rpc('claim_verification_purge_batch', { p_limit: 50 });
    if (claimed.error) throw claimed.error;

    let deleted = 0;
    let failed = 0;
    for (const item of claimed.data ?? []) {
      const removed = await supabase.storage.from('verification-documents').remove([item.storage_path]);
      if (removed.error) {
        failed += 1;
        const retried = await supabase.rpc('retry_verification_purge', {
          p_id: item.id,
          p_error_code: String(removed.error.statusCode ?? 'storage_error'),
        });
        if (retried.error) throw retried.error;
        continue;
      }

      const completed = await supabase.rpc('complete_verification_purge', { p_id: item.id });
      if (completed.error) {
        failed += 1;
        // The Storage delete is idempotently retried; avoid logging object paths.
        console.error('Could not record verification purge completion');
        continue;
      }
      deleted += 1;
    }

    const metadata = await supabase.rpc('purge_old_verification_review_metadata');
    if (metadata.error) throw metadata.error;

    const stalled = await supabase.from('verification_storage_purge_queue')
      .select('id', { count: 'exact', head: true }).gte('attempts', 8);
    if (stalled.error) throw stalled.error;
    const result = { queued: queued.data ?? 0, attempted: claimed.data?.length ?? 0, deleted, metadataPurged: metadata.data ?? 0, failed, needsAttention: stalled.count ?? 0 };
    return failed || result.needsAttention ? json(result, 502) : json(result);
  } catch {
    // Errors may contain storage paths or API details; keep logs and responses generic.
    console.error('Verification retention worker failed');
    return json({ error: 'Could not process verification retention queue' }, 502);
  }
});
