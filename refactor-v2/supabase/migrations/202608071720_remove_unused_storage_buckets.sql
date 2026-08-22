-- CharacterMaker does not use Supabase Storage.
-- Physical image files live on InfinityFree /media.
-- Remove only the empty legacy buckets left from the discarded early storage design.

do $$
declare
  v_objects bigint;
begin
  select count(*) into v_objects from storage.objects;
  if v_objects <> 0 then
    raise exception 'Refusing to remove Storage buckets: storage.objects contains % rows', v_objects;
  end if;

  delete from storage.buckets;
end $$;
