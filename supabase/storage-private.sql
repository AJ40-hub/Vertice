-- VERTICE storage hardening.
-- Keeps game/admin assets private and accessible through short-lived signed URLs.

begin;

update storage.buckets
set
  public = false,
  file_size_limit = 104857600,
  allowed_mime_types = array[
    'application/pdf',
    'application/json',
    'text/plain',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/ogg',
    'video/mp4',
    'video/webm'
  ]::text[]
where id = 'vertice-assets';

commit;
