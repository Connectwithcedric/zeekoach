-- Profile photo upload failed with "new row violates row-level security policy".
-- Supabase storage also checks a SELECT policy when it writes a file, so people need to be able to
-- read the files in their own folder. Re-create the insert/update rules too, in case 001 skipped them.
do $$
begin
  insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict (id) do update set public = true;
  drop policy if exists "Users read their own avatar files" on storage.objects;
  create policy "Users read their own avatar files" on storage.objects for select to authenticated
    using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
  drop policy if exists "Users upload their own avatar" on storage.objects;
  create policy "Users upload their own avatar" on storage.objects for insert to authenticated
    with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
  drop policy if exists "Users replace their own avatar" on storage.objects;
  create policy "Users replace their own avatar" on storage.objects for update to authenticated
    using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
exception when others then
  raise warning 'avatar storage policies skipped: %', sqlerrm;
end;
$$;
