-- VERTICE storage policy.
-- Apply this in Supabase SQL Editor if public asset URLs must be readable
-- by the web app and the MCP role cannot alter storage.objects.
--
-- This intentionally allows read-only access to objects in vertice-assets.
-- Upload, update and delete remain server/admin-only through signed upload URLs.

drop policy if exists "public_read_vertice_assets" on storage.objects;
drop policy if exists "anon_insert_vertice_assets" on storage.objects;
drop policy if exists "anon_update_vertice_assets" on storage.objects;
drop policy if exists "anon_delete_vertice_assets" on storage.objects;

create policy "public_read_vertice_assets"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'vertice-assets');
