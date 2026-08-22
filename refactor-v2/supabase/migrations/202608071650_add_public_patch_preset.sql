-- Add true partial-update semantics for Web/MCP without replacing an entire preset state.
-- Current public/no-account product mode is intentionally preserved.

create or replace function public.public_patch_preset(
  p_kind text,
  p_id uuid,
  p_patch jsonb,
  p_expected_version integer default null,
  p_idempotency_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $function$
declare
  v_current_version integer;
  v_new_version integer;
  v_operation text := 'preset.patch:' || p_kind || ':' || p_id::text;
  v_existing_result uuid;
  v_param jsonb;
  v_catalog_id text;
  v_position smallint;
  v_source text := case
    when p_patch->>'mutation_source' in ('web','mcp','migration','system') then p_patch->>'mutation_source'
    else 'web'
  end;
  v_background_id uuid;
begin
  if p_idempotency_key is not null then
    select result_id into v_existing_result
    from public.mutation_requests
    where idempotency_key=p_idempotency_key and operation=v_operation;
    if found then
      if p_kind='character' then select version into v_new_version from public.characters where id=p_id;
      elsif p_kind='outfit' then select version into v_new_version from public.outfit_presets where id=p_id;
      elsif p_kind='scene' then select version into v_new_version from public.scene_presets where id=p_id;
      end if;
      return jsonb_build_object('id',p_id,'version',v_new_version,'idempotent_replay',true);
    end if;
  end if;

  if p_kind='character' then
    select version into v_current_version from public.characters where id=p_id and status='active';
    if not found then raise exception 'character not found: %', p_id; end if;
    if p_expected_version is not null and v_current_version<>p_expected_version then
      raise exception 'version conflict for character %: expected %, current %',p_id,p_expected_version,v_current_version;
    end if;

    update public.characters set
      slug=case when p_patch ? 'slug' then p_patch->>'slug' else slug end,
      name=case when p_patch ? 'name' then p_patch->>'name' else name end,
      description=case when p_patch ? 'description' then p_patch->>'description' else description end,
      age=case when p_patch ? 'age' then nullif(p_patch->>'age','')::smallint else age end,
      height_cm=case when p_patch ? 'height_cm' then nullif(p_patch->>'height_cm','')::numeric else height_cm end,
      weight_kg=case when p_patch ? 'weight_kg' then nullif(p_patch->>'weight_kg','')::numeric else weight_kg end,
      bust_cm=case when p_patch ? 'bust_cm' then nullif(p_patch->>'bust_cm','')::numeric else bust_cm end,
      waist_cm=case when p_patch ? 'waist_cm' then nullif(p_patch->>'waist_cm','')::numeric else waist_cm end,
      hips_cm=case when p_patch ? 'hips_cm' then nullif(p_patch->>'hips_cm','')::numeric else hips_cm end,
      body_fat_percent=case when p_patch ? 'body_fat_percent' then nullif(p_patch->>'body_fat_percent','')::numeric else body_fat_percent end,
      physique_description=case when p_patch ? 'physique_description' then p_patch->>'physique_description' else physique_description end,
      ai_context=case when p_patch ? 'ai_context' then ai_context || coalesce(p_patch->'ai_context','{}'::jsonb) else ai_context end,
      schema_version=case when p_patch ? 'schema_version' then coalesce(nullif(p_patch->>'schema_version',''),schema_version) else schema_version end,
      version=version+1,
      updated_at=now()
    where id=p_id
    returning version into v_new_version;

    if p_patch ? 'parameters' then
      for v_param in select value from jsonb_array_elements(coalesce(p_patch->'parameters','[]'::jsonb)) loop
        v_catalog_id := nullif(v_param->>'catalog_id','');
        v_position := coalesce(nullif(v_param->>'position','')::smallint,0);
        if v_catalog_id is null then raise exception 'parameter catalog_id is required'; end if;
        if coalesce((v_param->>'delete')::boolean,false) then
          delete from public.character_parameter_values
          where character_id=p_id and catalog_id=v_catalog_id and position=v_position;
        else
          insert into public.character_parameter_values(character_id,catalog_id,position,option_id,number_value,text_value,boolean_value,json_value)
          values(
            p_id,v_catalog_id,v_position,
            nullif(v_param->>'option_id',''),
            nullif(v_param->>'number_value','')::numeric,
            case when v_param ? 'text_value' then v_param->>'text_value' else null end,
            case when v_param ? 'boolean_value' then (v_param->>'boolean_value')::boolean else null end,
            case when v_param ? 'json_value' then v_param->'json_value' else null end
          )
          on conflict (character_id,catalog_id,position) do update set
            option_id=excluded.option_id,number_value=excluded.number_value,text_value=excluded.text_value,
            boolean_value=excluded.boolean_value,json_value=excluded.json_value,updated_at=now();
        end if;
      end loop;
    end if;

  elsif p_kind='outfit' then
    select version into v_current_version from public.outfit_presets where id=p_id and status='active';
    if not found then raise exception 'outfit not found: %', p_id; end if;
    if p_expected_version is not null and v_current_version<>p_expected_version then
      raise exception 'version conflict for outfit %: expected %, current %',p_id,p_expected_version,v_current_version;
    end if;

    update public.outfit_presets set
      slug=case when p_patch ? 'slug' then p_patch->>'slug' else slug end,
      name=case when p_patch ? 'name' then p_patch->>'name' else name end,
      description=case when p_patch ? 'description' then p_patch->>'description' else description end,
      category=case when p_patch ? 'category' then p_patch->>'category' else category end,
      suggested_background_id=case when p_patch ? 'suggested_background_id' then nullif(p_patch->>'suggested_background_id','')::uuid else suggested_background_id end,
      prompt_text=case when p_patch ? 'prompt_text' then p_patch->>'prompt_text' else prompt_text end,
      ai_context=case when p_patch ? 'ai_context' then ai_context || coalesce(p_patch->'ai_context','{}'::jsonb) else ai_context end,
      schema_version=case when p_patch ? 'schema_version' then coalesce(nullif(p_patch->>'schema_version',''),schema_version) else schema_version end,
      version=version+1,
      updated_at=now()
    where id=p_id
    returning version into v_new_version;

    if p_patch ? 'parameters' then
      for v_param in select value from jsonb_array_elements(coalesce(p_patch->'parameters','[]'::jsonb)) loop
        v_catalog_id := nullif(v_param->>'catalog_id','');
        v_position := coalesce(nullif(v_param->>'position','')::smallint,0);
        if v_catalog_id is null then raise exception 'parameter catalog_id is required'; end if;
        if coalesce((v_param->>'delete')::boolean,false) then
          delete from public.outfit_preset_parameter_values
          where outfit_preset_id=p_id and catalog_id=v_catalog_id and position=v_position;
        else
          insert into public.outfit_preset_parameter_values(outfit_preset_id,catalog_id,position,option_id,number_value,text_value,boolean_value,json_value)
          values(
            p_id,v_catalog_id,v_position,
            nullif(v_param->>'option_id',''),
            nullif(v_param->>'number_value','')::numeric,
            case when v_param ? 'text_value' then v_param->>'text_value' else null end,
            case when v_param ? 'boolean_value' then (v_param->>'boolean_value')::boolean else null end,
            case when v_param ? 'json_value' then v_param->'json_value' else null end
          )
          on conflict (outfit_preset_id,catalog_id,position) do update set
            option_id=excluded.option_id,number_value=excluded.number_value,text_value=excluded.text_value,
            boolean_value=excluded.boolean_value,json_value=excluded.json_value,updated_at=now();
        end if;
      end loop;
    end if;

  elsif p_kind='scene' then
    select version into v_current_version from public.scene_presets where id=p_id and status='active';
    if not found then raise exception 'scene not found: %', p_id; end if;
    if p_expected_version is not null and v_current_version<>p_expected_version then
      raise exception 'version conflict for scene %: expected %, current %',p_id,p_expected_version,v_current_version;
    end if;

    if p_patch ? 'background_slug' then
      if nullif(p_patch->>'background_slug','') is null then
        v_background_id := null;
      else
        select id into v_background_id from public.backgrounds
        where slug=p_patch->>'background_slug' and status='active';
        if v_background_id is null then raise exception 'unknown background slug: %',p_patch->>'background_slug'; end if;
      end if;
    elsif p_patch ? 'background_id' then
      v_background_id := nullif(p_patch->>'background_id','')::uuid;
    else
      select background_id into v_background_id from public.scene_presets where id=p_id;
    end if;

    update public.scene_presets set
      slug=case when p_patch ? 'slug' then p_patch->>'slug' else slug end,
      name=case when p_patch ? 'name' then p_patch->>'name' else name end,
      description=case when p_patch ? 'description' then p_patch->>'description' else description end,
      background_id=v_background_id,
      custom_background_text=case when p_patch ? 'custom_background_text' then p_patch->>'custom_background_text' else custom_background_text end,
      prompt_text=case when p_patch ? 'prompt_text' then p_patch->>'prompt_text' else prompt_text end,
      reference_use_clothing=case when p_patch ? 'reference_use_clothing' then coalesce((p_patch->>'reference_use_clothing')::boolean,false) else reference_use_clothing end,
      reference_use_expression=case when p_patch ? 'reference_use_expression' then coalesce((p_patch->>'reference_use_expression')::boolean,false) else reference_use_expression end,
      ai_context=case when p_patch ? 'ai_context' then ai_context || coalesce(p_patch->'ai_context','{}'::jsonb) else ai_context end,
      schema_version=case when p_patch ? 'schema_version' then coalesce(nullif(p_patch->>'schema_version',''),schema_version) else schema_version end,
      version=version+1,
      updated_at=now()
    where id=p_id
    returning version into v_new_version;

    if p_patch ? 'parameters' then
      for v_param in select value from jsonb_array_elements(coalesce(p_patch->'parameters','[]'::jsonb)) loop
        v_catalog_id := nullif(v_param->>'catalog_id','');
        v_position := coalesce(nullif(v_param->>'position','')::smallint,0);
        if v_catalog_id is null then raise exception 'parameter catalog_id is required'; end if;
        if coalesce((v_param->>'delete')::boolean,false) then
          delete from public.scene_preset_parameter_values
          where scene_preset_id=p_id and catalog_id=v_catalog_id and position=v_position;
        else
          insert into public.scene_preset_parameter_values(scene_preset_id,catalog_id,position,option_id,number_value,text_value,boolean_value,json_value)
          values(
            p_id,v_catalog_id,v_position,
            nullif(v_param->>'option_id',''),
            nullif(v_param->>'number_value','')::numeric,
            case when v_param ? 'text_value' then v_param->>'text_value' else null end,
            case when v_param ? 'boolean_value' then (v_param->>'boolean_value')::boolean else null end,
            case when v_param ? 'json_value' then v_param->'json_value' else null end
          )
          on conflict (scene_preset_id,catalog_id,position) do update set
            option_id=excluded.option_id,number_value=excluded.number_value,text_value=excluded.text_value,
            boolean_value=excluded.boolean_value,json_value=excluded.json_value,updated_at=now();
        end if;
      end loop;
    end if;
  else
    raise exception 'unsupported preset kind: %', p_kind;
  end if;

  if p_idempotency_key is not null then
    insert into public.mutation_requests(idempotency_key,operation,result_id)
    values(p_idempotency_key,v_operation,p_id)
    on conflict (idempotency_key) do nothing;
  end if;

  insert into public.audit_log(source,action,entity_type,entity_id,request_id,details)
  values(v_source,'patch',p_kind,p_id,p_idempotency_key,p_patch - 'mutation_source');

  return jsonb_build_object('id',p_id,'version',v_new_version,'idempotent_replay',false);
end;
$function$;

grant execute on function public.public_patch_preset(text,uuid,jsonb,integer,text) to anon, authenticated, service_role;
