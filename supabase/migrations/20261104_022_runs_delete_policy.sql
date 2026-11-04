-- Allow clients to delete their own runs.
-- run_points rows are removed automatically via ON DELETE CASCADE.

create policy "clients_delete_own_runs" on runs
  for delete using (
    client_id in (select id from clients where auth_user_id = auth.uid())
  );
