-- CharacterMaker V2 - Core/MCP readiness migration
-- Applied to Supabase project charmaker after backup schema backup_20260807_1548.
-- Current product mode remains a shared public library without end-user accounts.

alter table public.characters
  add column if not exists schema_version text not null default 'character-state-v3',
  add column if not exists ai_context jsonb not null default '{}'::jsonb,
  add column if not exists version integer not null default 1;

alter table public.outfit_presets
  add column if not exists schema_version text not null default 'wardrobe-state-v2',
  add column if not exists ai_context jsonb not null default '{}'::jsonb,
  add column if not exists version integer not null default 1;

alter table public.scene_presets
  add column if not exists schema_version text not null default 'scene-state-v3',
  add column if not exists ai_context jsonb not null default '{}'::jsonb,
  add column if not exists version integer not null default 1,
  add column if not exists reference_use_clothing boolean not null default false,
  add column if not exists reference_use_expression boolean not null default false;

alter table public.assets
  add column if not exists reference_status text not null default 'normal';

alter table public.characters drop constraint if exists characters_version_positive;
alter table public.characters add constraint characters_version_positive check (version > 0);
alter table public.outfit_presets drop constraint if exists outfit_presets_version_positive;
alter table public.outfit_presets add constraint outfit_presets_version_positive check (version > 0);
alter table public.scene_presets drop constraint if exists scene_presets_version_positive;
alter table public.scene_presets add constraint scene_presets_version_positive check (version > 0);
alter table public.assets drop constraint if exists assets_reference_status_check;
alter table public.assets add constraint assets_reference_status_check check (reference_status in ('normal','approved','canonical','rejected','reference_only'));

create table if not exists public.mutation_requests (
  idempotency_key text primary key,
  operation text not null,
  result_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'web',
  action text not null,
  entity_type text not null,
  entity_id uuid,
  request_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.mutation_requests enable row level security;
alter table public.audit_log enable row level security;

-- Public preset library remains intentionally writable through explicit SECURITY DEFINER RPCs.
-- Raw audit/idempotency tables are internal implementation details and receive no anon table policies.

create or replace function public.public_upsert_preset(p_kind text, p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $function$
declare
  v_id uuid := coalesce(nullif(p_payload->>'id','')::uuid, gen_random_uuid());
  v_idempotency_key text := nullif(p_payload->>'idempotency_key','');
  v_operation text := 'preset.upsert:' || p_kind;
  v_existing_result uuid;
  v_expected_version integer := nullif(p_payload->>'expected_version','')::integer;
  v_current_version integer;
  v_background_id uuid;
begin
  if v_idempotency_key is not null then
    select result_id into v_existing_result
    from public.mutation_requests
    where idempotency_key = v_idempotency_key and operation = v_operation;
    if found then return v_existing_result; end if;
  end if;

  if p_kind = 'character' then
    if p_payload ? 'id' and v_expected_version is not null then
      select version into v_current_version from public.characters where id=v_id;
      if v_current_version is distinct from v_expected_version then
        raise exception 'version conflict for character %: expected %, current %', v_id, v_expected_version, v_current_version;
      end if;
    end if;

    insert into public.characters(
      id, slug, name, description, status, is_public,
      age, height_cm, weight_kg, bust_cm, waist_cm, hips_cm, body_fat_percent,
      physique_description, metadata, schema_version, ai_context, version
    ) values (
      v_id, p_payload->>'slug', p_payload->>'name', p_payload->>'description', 'active', true,
      nullif(p_payload->>'age','')::smallint,
      nullif(p_payload->>'height_cm','')::numeric,
      nullif(p_payload->>'weight_kg','')::numeric,
      nullif(p_payload->>'bust_cm','')::numeric,
      nullif(p_payload->>'waist_cm','')::numeric,
      nullif(p_payload->>'hips_cm','')::numeric,
      nullif(p_payload->>'body_fat_percent','')::numeric,
      p_payload->>'physique_description', coalesce(p_payload->'metadata','{}'::jsonb),
      coalesce(nullif(p_payload->>'schema_version',''),'character-state-v3'),
      coalesce(p_payload->'ai_context','{}'::jsonb), 1
    )
    on conflict (id) do update set
      slug=excluded.slug, name=excluded.name, description=excluded.description,
      status='active', is_public=true, age=excluded.age, height_cm=excluded.height_cm,
      weight_kg=excluded.weight_kg, bust_cm=excluded.bust_cm, waist_cm=excluded.waist_cm,
      hips_cm=excluded.hips_cm, body_fat_percent=excluded.body_fat_percent,
      physique_description=excluded.physique_description, metadata=excluded.metadata,
      schema_version=excluded.schema_version, ai_context=excluded.ai_context,
      version=public.characters.version+1, updated_at=now();

    if p_payload ? 'parameters' then
      delete from public.character_parameter_values where character_id=v_id;
      insert into public.character_parameter_values(character_id,catalog_id,position,option_id,number_value,text_value,boolean_value,json_value)
      select v_id,x.catalog_id,coalesce(x.position,0),x.option_id,x.number_value,x.text_value,x.boolean_value,x.json_value
      from jsonb_to_recordset(coalesce(p_payload->'parameters','[]'::jsonb)) as x(
        catalog_id text, position smallint, option_id text, number_value numeric, text_value text, boolean_value boolean, json_value jsonb
      );
    end if;

  elsif p_kind = 'outfit' then
    if p_payload ? 'id' and v_expected_version is not null then
      select version into v_current_version from public.outfit_presets where id=v_id;
      if v_current_version is distinct from v_expected_version then
        raise exception 'version conflict for outfit %: expected %, current %', v_id, v_expected_version, v_current_version;
      end if;
    end if;

    insert into public.outfit_presets(
      id,slug,name,description,category,suggested_background_id,prompt_text,status,is_public,metadata,
      schema_version,ai_context,version
    ) values (
      v_id,p_payload->>'slug',p_payload->>'name',p_payload->>'description',p_payload->>'category',
      nullif(p_payload->>'suggested_background_id','')::uuid,p_payload->>'prompt_text','active',true,
      coalesce(p_payload->'metadata','{}'::jsonb),
      coalesce(nullif(p_payload->>'schema_version',''),'wardrobe-state-v2'),
      coalesce(p_payload->'ai_context','{}'::jsonb),1
    )
    on conflict (id) do update set
      slug=excluded.slug,name=excluded.name,description=excluded.description,category=excluded.category,
      suggested_background_id=excluded.suggested_background_id,prompt_text=excluded.prompt_text,
      status='active',is_public=true,metadata=excluded.metadata,
      schema_version=excluded.schema_version,ai_context=excluded.ai_context,
      version=public.outfit_presets.version+1,updated_at=now();

    if p_payload ? 'parameters' then
      delete from public.outfit_preset_parameter_values where outfit_preset_id=v_id;
      insert into public.outfit_preset_parameter_values(outfit_preset_id,catalog_id,position,option_id,number_value,text_value,boolean_value,json_value)
      select v_id,x.catalog_id,coalesce(x.position,0),x.option_id,x.number_value,x.text_value,x.boolean_value,x.json_value
      from jsonb_to_recordset(coalesce(p_payload->'parameters','[]'::jsonb)) as x(
        catalog_id text, position smallint, option_id text, number_value numeric, text_value text, boolean_value boolean, json_value jsonb
      );
    end if;

  elsif p_kind = 'scene' then
    if p_payload ? 'id' and v_expected_version is not null then
      select version into v_current_version from public.scene_presets where id=v_id;
      if v_current_version is distinct from v_expected_version then
        raise exception 'version conflict for scene %: expected %, current %', v_id, v_expected_version, v_current_version;
      end if;
    end if;

    if nullif(p_payload->>'background_slug','') is not null then
      select id into v_background_id
      from public.backgrounds
      where slug = p_payload->>'background_slug' and status='active';
      if v_background_id is null then
        raise exception 'unknown background slug: %', p_payload->>'background_slug';
      end if;
    else
      v_background_id := nullif(p_payload->>'background_id','')::uuid;
    end if;

    insert into public.scene_presets(
      id,slug,name,description,background_id,custom_background_text,prompt_text,status,is_public,metadata,
      schema_version,ai_context,version,reference_use_clothing,reference_use_expression
    ) values (
      v_id,p_payload->>'slug',p_payload->>'name',p_payload->>'description',
      v_background_id,p_payload->>'custom_background_text',p_payload->>'prompt_text',
      'active',true,coalesce(p_payload->'metadata','{}'::jsonb),
      coalesce(nullif(p_payload->>'schema_version',''),'scene-state-v3'),
      coalesce(p_payload->'ai_context','{}'::jsonb),1,
      coalesce((p_payload->>'reference_use_clothing')::boolean,false),
      coalesce((p_payload->>'reference_use_expression')::boolean,false)
    )
    on conflict (id) do update set
      slug=excluded.slug,name=excluded.name,description=excluded.description,background_id=excluded.background_id,
      custom_background_text=excluded.custom_background_text,prompt_text=excluded.prompt_text,
      status='active',is_public=true,metadata=excluded.metadata,
      schema_version=excluded.schema_version,ai_context=excluded.ai_context,
      reference_use_clothing=excluded.reference_use_clothing,
      reference_use_expression=excluded.reference_use_expression,
      version=public.scene_presets.version+1,updated_at=now();

    if p_payload ? 'parameters' then
      delete from public.scene_preset_parameter_values where scene_preset_id=v_id;
      insert into public.scene_preset_parameter_values(scene_preset_id,catalog_id,position,option_id,number_value,text_value,boolean_value,json_value)
      select v_id,x.catalog_id,coalesce(x.position,0),x.option_id,x.number_value,x.text_value,x.boolean_value,x.json_value
      from jsonb_to_recordset(coalesce(p_payload->'parameters','[]'::jsonb)) as x(
        catalog_id text, position smallint, option_id text, number_value numeric, text_value text, boolean_value boolean, json_value jsonb
      );
    end if;
  else
    raise exception 'unsupported preset kind: %', p_kind;
  end if;

  if v_idempotency_key is not null then
    insert into public.mutation_requests(idempotency_key,operation,result_id)
    values(v_idempotency_key,v_operation,v_id)
    on conflict (idempotency_key) do nothing;
  end if;

  insert into public.audit_log(source,action,entity_type,entity_id,request_id,details)
  values('web','upsert',p_kind,v_id,v_idempotency_key,p_payload - 'idempotency_key');

  return v_id;
end;
$function$;

create or replace function public.public_delete_preset(p_kind text, p_id uuid, p_hard boolean default false)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_found boolean := false;
begin
  if p_kind='character' then
    if p_hard then delete from public.characters where id=p_id;
    else update public.characters set status='archived',is_public=false,version=version+1,updated_at=now() where id=p_id; end if;
  elsif p_kind='outfit' then
    if p_hard then delete from public.outfit_presets where id=p_id;
    else update public.outfit_presets set status='archived',is_public=false,version=version+1,updated_at=now() where id=p_id; end if;
  elsif p_kind='scene' then
    if p_hard then delete from public.scene_presets where id=p_id;
    else update public.scene_presets set status='archived',is_public=false,version=version+1,updated_at=now() where id=p_id; end if;
  else
    raise exception 'unsupported preset kind: %', p_kind;
  end if;
  v_found := found;
  if v_found then
    insert into public.audit_log(source,action,entity_type,entity_id,details)
    values('web',case when p_hard then 'hard_delete' else 'archive' end,p_kind,p_id,'{}'::jsonb);
  end if;
  return v_found;
end;
$function$;

create or replace function public.public_attach_asset(
  p_owner_kind text,
  p_owner_id uuid,
  p_role text,
  p_object_path text,
  p_public_url text,
  p_file_name text default null,
  p_mime_type text default null,
  p_size_bytes bigint default null,
  p_width integer default null,
  p_height integer default null,
  p_is_primary boolean default false,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_asset_id uuid := gen_random_uuid();
  v_reference_status text := coalesce(nullif(p_metadata->>'reference_status',''),'normal');
begin
  if p_object_path is null or p_object_path !~ '^/media/' then raise exception 'invalid media path'; end if;
  if p_public_url is null or p_public_url not like 'https://charmaker.free.nf/media/%' then raise exception 'invalid public URL'; end if;
  if v_reference_status not in ('normal','approved','canonical','rejected','reference_only') then raise exception 'invalid reference status'; end if;

  insert into public.assets(id,storage_provider,object_path,public_url,media_kind,mime_type,file_name,size_bytes,width,height,status,is_public,metadata,reference_status)
  values(v_asset_id,'infinityfree',p_object_path,p_public_url,'image',p_mime_type,p_file_name,p_size_bytes,p_width,p_height,'active',true,coalesce(p_metadata,'{}'::jsonb),v_reference_status);

  if p_owner_kind='character' then
    if p_is_primary then update public.character_assets set is_primary=false where character_id=p_owner_id and role=p_role; end if;
    insert into public.character_assets(character_id,asset_id,role,is_primary) values(p_owner_id,v_asset_id,p_role,p_is_primary);
  elsif p_owner_kind='outfit' then
    if p_is_primary then update public.outfit_assets set is_primary=false where outfit_preset_id=p_owner_id and role=p_role; end if;
    insert into public.outfit_assets(outfit_preset_id,asset_id,role,is_primary) values(p_owner_id,v_asset_id,p_role,p_is_primary);
  elsif p_owner_kind='scene' then
    if p_is_primary then update public.scene_assets set is_primary=false where scene_preset_id=p_owner_id and role=p_role; end if;
    insert into public.scene_assets(scene_preset_id,asset_id,role,is_primary) values(p_owner_id,v_asset_id,p_role,p_is_primary);
  elsif p_owner_kind='background' then
    if p_is_primary then update public.background_assets set is_primary=false where background_id=p_owner_id and role=p_role; end if;
    insert into public.background_assets(background_id,asset_id,role,is_primary) values(p_owner_id,v_asset_id,p_role,p_is_primary);
  elsif p_owner_kind='generation' then
    insert into public.generation_assets(generation_id,asset_id,role) values(p_owner_id,v_asset_id,p_role);
  else
    raise exception 'unsupported asset owner kind: %',p_owner_kind;
  end if;

  insert into public.audit_log(source,action,entity_type,entity_id,details)
  values('web','attach_asset',p_owner_kind,p_owner_id,jsonb_build_object('asset_id',v_asset_id,'role',p_role,'reference_status',v_reference_status));
  return v_asset_id;
end;
$function$;

create or replace function public.public_set_asset_reference_status(p_asset_id uuid, p_reference_status text)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if p_reference_status not in ('normal','approved','canonical','rejected','reference_only') then
    raise exception 'invalid reference status';
  end if;
  update public.assets set reference_status=p_reference_status,updated_at=now() where id=p_asset_id;
  if found then
    insert into public.audit_log(source,action,entity_type,entity_id,details)
    values('web','set_reference_status','asset',p_asset_id,jsonb_build_object('reference_status',p_reference_status));
    return true;
  end if;
  return false;
end;
$function$;

grant execute on function public.public_set_asset_reference_status(uuid,text) to anon, authenticated, service_role;

create or replace function public.public_delete_asset(p_asset_id uuid)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_found boolean;
begin
  delete from public.assets where id=p_asset_id;
  v_found := found;
  if v_found then
    insert into public.audit_log(source,action,entity_type,entity_id,details)
    values('web','delete','asset',p_asset_id,'{}'::jsonb);
  end if;
  return v_found;
end;
$function$;

create or replace function public.public_set_character_outfit(p_character_id uuid, p_outfit_preset_id uuid, p_is_default boolean default false)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if p_is_default then update public.character_outfits set is_default=false where character_id=p_character_id; end if;
  insert into public.character_outfits(character_id,outfit_preset_id,role,is_default)
  values(p_character_id,p_outfit_preset_id,case when p_is_default then 'default_outfit' else 'outfit' end,p_is_default)
  on conflict (character_id,outfit_preset_id) do update set role=excluded.role,is_default=excluded.is_default;
  insert into public.audit_log(source,action,entity_type,entity_id,details)
  values('web','set_character_outfit','character',p_character_id,jsonb_build_object('outfit_preset_id',p_outfit_preset_id,'is_default',p_is_default));
  return true;
end;
$function$;
