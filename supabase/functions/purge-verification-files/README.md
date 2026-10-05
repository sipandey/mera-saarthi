# Verification evidence retention worker

This function deletes eligible objects through the Supabase Storage API and then marks the evidence row's `purged_at`. Approval status, expiry, and review metadata remain available to the booking gate. The queue contains only unprocessed object paths and is not accessible to app users.

## Before deployment

1. Apply `20261005000100_verification_evidence_retention.sql` only after validating the complete migration chain in an isolated Supabase project.
2. Generate a unique high-entropy secret for this worker and set it as the Edge Function secret `VERIFICATION_RETENTION_SECRET`. Never commit it or put it in the mobile app.
3. Deploy `purge-verification-files`. Its `verify_jwt = false` setting is intentional: the worker validates the dedicated shared secret in `x-verification-retention-secret` itself. Keep this secret private and rotate it if it may have been exposed.
4. Enable Supabase Cron (`pg_cron`) and `pg_net`, then schedule one POST per day. Store the project URL and the same retention secret in Supabase Vault; do not embed either secret in the SQL job. The job calls `/functions/v1/purge-verification-files` with an empty JSON body and the secret header. Example, using placeholders only:

   ```sql
   select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
   select vault.create_secret('<same-secret-as-edge-function>', 'verification_retention_secret');

   select cron.schedule(
     'purge-verification-files-daily',
     '15 2 * * *',
     $job$
       select net.http_post(
         url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/purge-verification-files',
         headers := jsonb_build_object(
           'Content-Type', 'application/json',
           'x-verification-retention-secret',
             (select decrypted_secret from vault.decrypted_secrets where name = 'verification_retention_secret')
         ),
         body := '{}'::jsonb
       ) as request_id;
     $job$
   );
   ```

   The example runs at 02:15 UTC. Confirm the project's enabled extensions and inspect Cron/`pg_net` run results before relying on it.
5. Monitor Cron/Edge Function responses. A 502 means work failed or at least one item reached eight attempts; an operator must inspect the Storage object and requeue the row after resolving the cause. Do not directly delete from `storage.objects`.

The worker processes up to 50 objects per invocation. A daily schedule drains larger backlogs in bounded batches. Keep this job disabled until the retention policy has operator/privacy approval and the migration/function have passed isolated review.

Supabase documents [scheduled Edge Function invocation with Cron, pg_net, and Vault](https://supabase.com/docs/guides/functions/schedule-functions) and requires file deletion through the [Storage API](https://supabase.com/docs/guides/storage/management/delete-objects), not direct SQL against Storage tables.
