import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.110.9";
import { createMcpHandler, McpServer } from "npm:@modelcontextprotocol/server@2.0.0";
import * as z from "npm:zod@4.4.3";

const SERVER_NAME = "charactermaker";
const SERVER_VERSION = "0.1.0";
const MEDIA_UPLOAD_URL = "https://charmaker.free.nf/dev/api/media.php?action=upload";
const MAX_IMPORT_BYTES = 8 * 1024 * 1024;

const presetKindSchema = z.enum(["character", "outfit", "scene"]);
const searchableKindSchema = z.enum(["character", "outfit", "scene", "background"]);
const referenceStatusSchema = z.enum(["normal", "approved", "canonical", "rejected", "reference_only"]);

const parameterPatchSchema = z.object({
  catalog_id: z.string().min(1),
  position: z.number().int().min(0).optional(),
  option_id: z.string().nullable().optional(),
  number_value: z.number().nullable().optional(),
  text_value: z.string().nullable().optional(),
  boolean_value: z.boolean().nullable().optional(),
  json_value: z.unknown().optional(),
  delete: z.boolean().optional(),
});

const aiContextSchema = z.object({
  summary: z.string().optional(),
  canonicalDescription: z.string().optional(),
  identityInstructions: z.string().optional(),
  mustPreserve: z.array(z.string()).optional(),
  mayVary: z.array(z.string()).optional(),
  avoid: z.array(z.string()).optional(),
  generationNotes: z.array(z.string()).optional(),
  schemaVersion: z.string().optional(),
}).passthrough();

function db(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !key) throw new Error("Supabase Edge Function environment is incomplete.");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

function createServer(): McpServer {
  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });

  server.registerTool(
    "search_presets",
    {
      description: "Search the shared public CharacterMaker library for Persona, Outfit, Scene or reusable Background records. Use this before get_preset when the exact UUID/slug is unknown.",
      inputSchema: z.object({
        kind: searchableKindSchema,
        query: z.string().default(""),
        limit: z.number().int().min(1).max(50).default(20),
      }),
    },
    async ({ kind, query, limit }) => result(await searchEntities(db(), kind, query, limit)),
  );

  server.registerTool(
    "get_preset",
    {
      description: "Get a complete active Persona, Outfit or Scene bundle including entity metadata, normalized parameter values with catalog labels, AI context and linked image assets.",
      inputSchema: z.object({
        kind: presetKindSchema,
        id_or_slug: z.string().min(1),
        include_assets: z.boolean().default(true),
      }),
    },
    async ({ kind, id_or_slug, include_assets }) => result(await getPresetBundle(db(), kind, id_or_slug, include_assets)),
  );

  server.registerTool(
    "get_catalog",
    {
      description: "Get one CharacterMaker catalog and all active values. Call this before writing an option parameter when the exact stable option_id is uncertain.",
      inputSchema: z.object({ catalog_id: z.string().min(1) }),
    },
    async ({ catalog_id }) => result(await getCatalog(db(), catalog_id)),
  );

  server.registerTool(
    "get_schema",
    {
      description: "Get the current MCP persistence contract for Persona, Outfit, Scene, parameters, AI context and asset statuses.",
      inputSchema: z.object({ kind: z.enum(["character", "outfit", "scene", "asset", "all"]).default("all") }),
    },
    async ({ kind }) => result(schemaDescription(kind)),
  );

  server.registerTool(
    "build_generation_context",
    {
      description: "Build one normalized generation context from a Persona plus optional Outfit and Scene. Returns labeled structured data, AI contexts and canonical/reference images without invoking an image provider.",
      inputSchema: z.object({
        character_id: z.string().uuid(),
        outfit_id: z.string().uuid().nullable().optional(),
        scene_id: z.string().uuid().nullable().optional(),
      }),
    },
    async ({ character_id, outfit_id, scene_id }) => result(await buildGenerationContext(db(), character_id, outfit_id ?? null, scene_id ?? null)),
  );

  server.registerTool(
    "create_character",
    {
      description: "Create a new public Persona. Use stable CharacterMaker catalog option IDs in parameters. Unknown facts should be omitted rather than replaced with guessed UI defaults.",
      inputSchema: z.object({
        name: z.string().min(1),
        slug: z.string().min(1).optional(),
        description: z.string().nullable().optional(),
        age: z.number().int().min(16).max(90).nullable().optional(),
        height_cm: z.number().nullable().optional(),
        weight_kg: z.number().nullable().optional(),
        bust_cm: z.number().nullable().optional(),
        waist_cm: z.number().nullable().optional(),
        hips_cm: z.number().nullable().optional(),
        body_fat_percent: z.number().nullable().optional(),
        physique_description: z.string().nullable().optional(),
        parameters: z.array(parameterPatchSchema.omit({ delete: true })).optional(),
        ai_context: aiContextSchema.optional(),
      }),
    },
    async (input) => result(await createPreset(db(), "character", input)),
  );

  server.registerTool(
    "create_outfit",
    {
      description: "Create a new public Outfit preset. One Outfit is a complete clothing look, not an individual garment.",
      inputSchema: z.object({
        name: z.string().min(1),
        slug: z.string().min(1).optional(),
        description: z.string().nullable().optional(),
        category: z.string().nullable().optional(),
        suggested_background_id: z.string().uuid().nullable().optional(),
        prompt_text: z.string().nullable().optional(),
        parameters: z.array(parameterPatchSchema.omit({ delete: true })).optional(),
        ai_context: aiContextSchema.optional(),
      }),
    },
    async (input) => result(await createPreset(db(), "outfit", input)),
  );

  server.registerTool(
    "create_scene",
    {
      description: "Create a new public Scene preset with action/camera/background/light/style parameters. background_slug resolves to the reusable backgrounds table relation.",
      inputSchema: z.object({
        name: z.string().min(1),
        slug: z.string().min(1).optional(),
        description: z.string().nullable().optional(),
        background_slug: z.string().nullable().optional(),
        custom_background_text: z.string().nullable().optional(),
        prompt_text: z.string().nullable().optional(),
        reference_use_clothing: z.boolean().optional(),
        reference_use_expression: z.boolean().optional(),
        parameters: z.array(parameterPatchSchema.omit({ delete: true })).optional(),
        ai_context: aiContextSchema.optional(),
      }),
    },
    async (input) => result(await createPreset(db(), "scene", input)),
  );

  server.registerTool(
    "patch_preset",
    {
      description: "Partially update exactly the provided Persona/Outfit/Scene fields and normalized parameters. Omitted fields stay unchanged. Use expected_version when available to prevent overwriting newer changes.",
      inputSchema: z.object({
        kind: presetKindSchema,
        id: z.string().uuid(),
        expected_version: z.number().int().positive().nullable().optional(),
        name: z.string().min(1).optional(),
        slug: z.string().min(1).optional(),
        description: z.string().nullable().optional(),
        age: z.number().int().min(16).max(90).nullable().optional(),
        height_cm: z.number().nullable().optional(),
        weight_kg: z.number().nullable().optional(),
        bust_cm: z.number().nullable().optional(),
        waist_cm: z.number().nullable().optional(),
        hips_cm: z.number().nullable().optional(),
        body_fat_percent: z.number().nullable().optional(),
        physique_description: z.string().nullable().optional(),
        category: z.string().nullable().optional(),
        suggested_background_id: z.string().uuid().nullable().optional(),
        background_slug: z.string().nullable().optional(),
        custom_background_text: z.string().nullable().optional(),
        prompt_text: z.string().nullable().optional(),
        reference_use_clothing: z.boolean().optional(),
        reference_use_expression: z.boolean().optional(),
        ai_context: aiContextSchema.optional(),
        parameters: z.array(parameterPatchSchema).optional(),
      }),
    },
    async ({ kind, id, expected_version, ...patch }) => result(await patchPreset(db(), kind, id, patch, expected_version ?? null)),
  );

  server.registerTool(
    "list_assets",
    {
      description: "List image assets linked to a Persona, Outfit or Scene, including role, primary flag, canonical/reference status and public URL.",
      inputSchema: z.object({ kind: presetKindSchema, owner_id: z.string().uuid() }),
    },
    async ({ kind, owner_id }) => result({ assets: await getAssets(db(), kind, owner_id) }),
  );

  server.registerTool(
    "get_asset",
    {
      description: "Get one CharacterMaker image asset. When include_image is true the actual image bytes are returned to the MCP client in addition to metadata.",
      inputSchema: z.object({ asset_id: z.string().uuid(), include_image: z.boolean().default(true) }),
    },
    async ({ asset_id, include_image }) => getAssetResult(db(), asset_id, include_image),
  );

  server.registerTool(
    "import_asset_from_url",
    {
      description: "Import a publicly fetchable JPEG/PNG/WebP URL into InfinityFree and attach it to a Persona, Outfit or Scene. Use this when the current client can provide a public image URL.",
      inputSchema: z.object({
        kind: presetKindSchema,
        owner_id: z.string().uuid(),
        role: z.string().regex(/^[a-zA-Z0-9_-]+$/),
        source_url: z.string().url(),
        is_primary: z.boolean().default(false),
        reference_status: referenceStatusSchema.default("normal"),
      }),
    },
    async (input) => result(await importAssetFromUrl(db(), input)),
  );

  server.registerTool(
    "set_asset_reference_status",
    {
      description: "Mark an existing image as normal, approved, canonical, reference_only or rejected for AI/reference workflows.",
      inputSchema: z.object({ asset_id: z.string().uuid(), reference_status: referenceStatusSchema }),
    },
    async ({ asset_id, reference_status }) => {
      const { data, error } = await db().rpc("public_set_asset_reference_status", { p_asset_id: asset_id, p_reference_status: reference_status });
      if (error) throw error;
      return result({ updated: data === true, asset_id, reference_status });
    },
  );

  server.registerTool(
    "archive_preset",
    {
      description: "Archive a public Persona, Outfit or Scene. This is a soft delete: the record is hidden from the active public library but not hard-deleted.",
      inputSchema: z.object({ kind: presetKindSchema, id: z.string().uuid() }),
    },
    async ({ kind, id }) => {
      const { data, error } = await db().rpc("public_delete_preset", { p_kind: kind, p_id: id, p_hard: false });
      if (error) throw error;
      return result({ archived: data === true, kind, id });
    },
  );

  return server;
}

const mcp = createMcpHandler(createServer, {
  legacy: "stateless",
  responseMode: "auto",
  keepAliveMs: 15000,
  onerror: (error) => console.error("CharacterMaker MCP error", error),
});

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }
  const url = new URL(request.url);
  if (url.pathname.endsWith("/health")) {
    return jsonResponse({ ok: true, name: SERVER_NAME, version: SERVER_VERSION, protocol: "MCP 2026-07-28 + legacy stateless" });
  }
  const response = await mcp.fetch(request);
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(corsHeaders())) headers.set(key, value);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
});

async function searchEntities(client: SupabaseClient, kind: z.infer<typeof searchableKindSchema>, query: string, limit: number) {
  const config = entityConfig(kind);
  const { data, error } = await client.from(config.table).select("id,slug,name,description").eq("is_public", true).eq("status", "active").limit(200);
  if (error) throw error;
  const q = normalize(query);
  const items = (data ?? []).filter((item) => !q || normalize(`${item.name} ${item.slug} ${item.description ?? ""}`).includes(q)).slice(0, limit);
  return { kind, query, count: items.length, items };
}

async function getPresetBundle(client: SupabaseClient, kind: z.infer<typeof presetKindSchema>, idOrSlug: string, includeAssets: boolean) {
  const config = entityConfig(kind);
  let query = client.from(config.table).select("*").eq("is_public", true).eq("status", "active");
  query = isUuid(idOrSlug) ? query.eq("id", idOrSlug) : query.eq("slug", idOrSlug);
  const { data: entity, error } = await query.maybeSingle();
  if (error) throw error;
  if (!entity) throw new Error(`${kind} not found: ${idOrSlug}`);

  const { data: rows, error: parameterError } = await client.from(config.parameterTable).select("catalog_id,position,option_id,number_value,text_value,boolean_value,json_value").eq(config.ownerColumn, entity.id).order("catalog_id").order("position");
  if (parameterError) throw parameterError;

  const bundle: Record<string, unknown> = {
    kind,
    entity,
    parameters: await hydrateParameters(client, rows ?? []),
  };
  if (kind === "scene" && entity.background_id) {
    const { data: background, error: backgroundError } = await client.from("backgrounds").select("id,slug,name,description,prompt_text").eq("id", entity.background_id).maybeSingle();
    if (backgroundError) throw backgroundError;
    bundle.background = background;
  }
  if (includeAssets) bundle.assets = await getAssets(client, kind, entity.id);
  return bundle;
}

async function getCatalog(client: SupabaseClient, catalogId: string) {
  const [{ data: catalog, error: catalogError }, { data: options, error: optionsError }, { data: categories, error: categoriesError }] = await Promise.all([
    client.from("catalogs").select("*").eq("id", catalogId).eq("is_active", true).maybeSingle(),
    client.from("catalog_options").select("id,label,category_id,hex,value_text,metadata,sort_order").eq("catalog_id", catalogId).eq("is_active", true).order("sort_order"),
    client.from("catalog_categories").select("id,label,description,sort_order").eq("catalog_id", catalogId).eq("is_active", true).order("sort_order"),
  ]);
  if (catalogError) throw catalogError;
  if (optionsError) throw optionsError;
  if (categoriesError) throw categoriesError;
  if (!catalog) throw new Error(`Catalog not found: ${catalogId}`);
  return { catalog, categories: categories ?? [], options: options ?? [] };
}

async function hydrateParameters(client: SupabaseClient, rows: Array<Record<string, unknown>>) {
  const catalogIds = [...new Set(rows.map((row) => String(row.catalog_id)))];
  if (catalogIds.length === 0) return [];
  const [{ data: catalogs, error: catalogError }, { data: options, error: optionError }] = await Promise.all([
    client.from("catalogs").select("id,label,domain,value_type,selection_mode,unit").in("id", catalogIds),
    client.from("catalog_options").select("catalog_id,id,label,category_id,hex").in("catalog_id", catalogIds).eq("is_active", true),
  ]);
  if (catalogError) throw catalogError;
  if (optionError) throw optionError;
  const catalogById = new Map((catalogs ?? []).map((item) => [item.id, item]));
  const optionByKey = new Map((options ?? []).map((item) => [`${item.catalog_id}:${item.id}`, item]));
  return rows.map((row) => {
    const catalogId = String(row.catalog_id);
    const optionId = row.option_id === null ? null : String(row.option_id);
    return {
      catalog: catalogById.get(catalogId) ?? { id: catalogId },
      position: Number(row.position ?? 0),
      value: optionId ? { type: "option", id: optionId, label: optionByKey.get(`${catalogId}:${optionId}`)?.label ?? optionId } : row.number_value !== null ? { type: "number", value: Number(row.number_value) } : row.text_value !== null ? { type: "text", value: row.text_value } : row.boolean_value !== null ? { type: "boolean", value: row.boolean_value } : { type: "json", value: row.json_value },
    };
  });
}

async function getAssets(client: SupabaseClient, kind: z.infer<typeof presetKindSchema>, ownerId: string) {
  const relation = assetRelation(kind);
  const { data: links, error: linkError } = await client.from(relation.table).select("asset_id,role,is_primary,sort_order").eq(relation.ownerColumn, ownerId).order("sort_order");
  if (linkError) throw linkError;
  if (!links?.length) return [];
  const { data: assets, error: assetError } = await client.from("assets").select("id,object_path,public_url,mime_type,file_name,size_bytes,width,height,reference_status,metadata").in("id", links.map((link) => link.asset_id)).eq("is_public", true).eq("status", "active");
  if (assetError) throw assetError;
  const byId = new Map((assets ?? []).map((asset) => [asset.id, asset]));
  return links.flatMap((link) => {
    const asset = byId.get(link.asset_id);
    return asset ? [{ ...asset, role: link.role, is_primary: link.is_primary, sort_order: link.sort_order }] : [];
  });
}

async function buildGenerationContext(client: SupabaseClient, characterId: string, outfitId: string | null, sceneId: string | null) {
  const [character, outfit, scene] = await Promise.all([
    getPresetBundle(client, "character", characterId, true),
    outfitId ? getPresetBundle(client, "outfit", outfitId, true) : Promise.resolve(null),
    sceneId ? getPresetBundle(client, "scene", sceneId, true) : Promise.resolve(null),
  ]);
  const assets = [
    ...((character.assets as Array<Record<string, unknown>> | undefined) ?? []),
    ...(((outfit?.assets as Array<Record<string, unknown>> | undefined) ?? [])),
    ...(((scene?.assets as Array<Record<string, unknown>> | undefined) ?? [])),
  ];
  return {
    schema_version: "generation-context-v1",
    character,
    outfit,
    scene,
    canonical_assets: assets.filter((asset) => asset.reference_status === "canonical"),
    reference_assets: assets.filter((asset) => ["canonical", "approved", "reference_only"].includes(String(asset.reference_status))),
  };
}

async function createPreset(client: SupabaseClient, kind: z.infer<typeof presetKindSchema>, input: Record<string, unknown>) {
  const payload = {
    ...input,
    slug: typeof input.slug === "string" && input.slug ? input.slug : `${kind}-${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`,
    schema_version: kind === "character" ? "character-state-v3" : kind === "outfit" ? "wardrobe-state-v2" : "scene-state-v3",
    idempotency_key: crypto.randomUUID(),
    metadata: { created_via: "mcp" },
  };
  const { data, error } = await client.rpc("public_upsert_preset", { p_kind: kind, p_payload: payload });
  if (error) throw error;
  return { id: data, kind, slug: payload.slug };
}

async function patchPreset(client: SupabaseClient, kind: z.infer<typeof presetKindSchema>, id: string, patch: Record<string, unknown>, expectedVersion: number | null) {
  const compact = Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined));
  compact.mutation_source = "mcp";
  const { data, error } = await client.rpc("public_patch_preset", {
    p_kind: kind,
    p_id: id,
    p_patch: compact,
    p_expected_version: expectedVersion,
    p_idempotency_key: crypto.randomUUID(),
  });
  if (error) throw error;
  return data;
}

async function getAssetResult(client: SupabaseClient, assetId: string, includeImage: boolean) {
  const { data: asset, error } = await client.from("assets").select("id,object_path,public_url,mime_type,file_name,size_bytes,width,height,reference_status,metadata").eq("id", assetId).eq("is_public", true).eq("status", "active").maybeSingle();
  if (error) throw error;
  if (!asset) throw new Error(`Asset not found: ${assetId}`);
  const content: Array<Record<string, unknown>> = [{ type: "text", text: JSON.stringify({ asset }, null, 2) }];
  if (includeImage && asset.public_url && asset.mime_type?.startsWith("image/")) {
    const response = await fetch(asset.public_url);
    if (!response.ok) throw new Error(`Image fetch failed: HTTP ${response.status}`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > MAX_IMPORT_BYTES) throw new Error("Image is larger than the MCP inline limit for CharacterMaker.");
    content.push({ type: "image", data: bytesToBase64(bytes), mimeType: asset.mime_type });
  }
  return { content, structuredContent: { asset } };
}

async function importAssetFromUrl(client: SupabaseClient, input: {
  kind: z.infer<typeof presetKindSchema>;
  owner_id: string;
  role: string;
  source_url: string;
  is_primary: boolean;
  reference_status: z.infer<typeof referenceStatusSchema>;
}) {
  const source = await fetch(input.source_url);
  if (!source.ok) throw new Error(`Source image fetch failed: HTTP ${source.status}`);
  const mimeType = (source.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  if (!["image/jpeg", "image/png", "image/webp"].includes(mimeType)) throw new Error(`Unsupported source MIME type: ${mimeType || "unknown"}`);
  const bytes = new Uint8Array(await source.arrayBuffer());
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_IMPORT_BYTES) throw new Error("Source image must be between 1 byte and 8 MB.");

  const extension = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
  const form = new FormData();
  form.set("scope", input.kind === "character" ? "characters" : input.kind === "outfit" ? "outfits" : "scenes");
  form.set("entity_id", input.owner_id);
  form.set("role", input.role);
  form.set("file", new File([bytes], `mcp-import.${extension}`, { type: mimeType }));

  const uploadedResponse = await fetch(MEDIA_UPLOAD_URL, { method: "POST", body: form });
  const uploaded = await uploadedResponse.json() as Record<string, unknown>;
  if (!uploadedResponse.ok) throw new Error(String(uploaded.error ?? `InfinityFree upload failed: HTTP ${uploadedResponse.status}`));

  try {
    const { data: assetId, error } = await client.rpc("public_attach_asset", {
      p_owner_kind: input.kind,
      p_owner_id: input.owner_id,
      p_role: input.role,
      p_object_path: uploaded.objectPath,
      p_public_url: uploaded.publicUrl,
      p_file_name: uploaded.fileName ?? null,
      p_mime_type: uploaded.mimeType ?? mimeType,
      p_size_bytes: uploaded.sizeBytes ?? bytes.byteLength,
      p_width: uploaded.width ?? null,
      p_height: uploaded.height ?? null,
      p_is_primary: input.is_primary,
      p_metadata: { reference_status: input.reference_status, imported_via: "mcp", source_url: input.source_url },
    });
    if (error) throw error;
    return { asset_id: assetId, uploaded };
  } catch (reason) {
    await rollbackUploadedMedia(uploaded.objectPath);
    throw reason;
  }
}

async function rollbackUploadedMedia(objectPath: unknown) {
  if (typeof objectPath !== "string") return;
  try {
    await fetch("https://charmaker.free.nf/dev/api/media.php?action=delete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ objectPath }),
    });
  } catch (error) {
    console.error("MCP media rollback failed", error);
  }
}

function schemaDescription(kind: string) {
  const common = {
    parameter: {
      catalog_id: "stable catalog id, e.g. eye_color, hair_color, pose",
      position: "0 for single values; ordered index for multi/layered values",
      option_id: "stable catalog option id",
      number_value: "numeric value",
      text_value: "free text value",
      boolean_value: "boolean value",
      json_value: "structured custom value",
      delete: "PATCH only: remove this catalog_id + position row",
    },
    ai_context: ["summary", "canonicalDescription", "identityInstructions", "mustPreserve[]", "mayVary[]", "avoid[]", "generationNotes[]", "schemaVersion"],
  };
  const definitions = {
    character: { schema_version: "character-state-v3", columns: ["name", "slug", "description", "age", "height_cm", "weight_kg", "bust_cm", "waist_cm", "hips_cm", "body_fat_percent", "physique_description", "ai_context", "version"], domains: ["character", "shared"] },
    outfit: { schema_version: "wardrobe-state-v2", columns: ["name", "slug", "description", "category", "suggested_background_id", "prompt_text", "ai_context", "version"], domains: ["wardrobe", "shared"] },
    scene: { schema_version: "scene-state-v3", columns: ["name", "slug", "description", "background_slug", "custom_background_text", "prompt_text", "reference_use_clothing", "reference_use_expression", "ai_context", "version"], domains: ["scene", "background", "shared"] },
    asset: { statuses: referenceStatusSchema.options, storage: "InfinityFree /media; Supabase stores metadata/relations only", image_types: ["image/jpeg", "image/png", "image/webp"], max_bytes: MAX_IMPORT_BYTES },
  };
  if (kind === "all") return { ...common, ...definitions };
  return { ...common, [kind]: definitions[kind as keyof typeof definitions] };
}

function entityConfig(kind: z.infer<typeof searchableKindSchema>) {
  if (kind === "character") return { table: "characters", parameterTable: "character_parameter_values", ownerColumn: "character_id" };
  if (kind === "outfit") return { table: "outfit_presets", parameterTable: "outfit_preset_parameter_values", ownerColumn: "outfit_preset_id" };
  if (kind === "scene") return { table: "scene_presets", parameterTable: "scene_preset_parameter_values", ownerColumn: "scene_preset_id" };
  return { table: "backgrounds", parameterTable: "background_parameter_values", ownerColumn: "background_id" };
}

function assetRelation(kind: z.infer<typeof presetKindSchema>) {
  if (kind === "character") return { table: "character_assets", ownerColumn: "character_id" };
  if (kind === "outfit") return { table: "outfit_assets", ownerColumn: "outfit_preset_id" };
  return { table: "scene_assets", ownerColumn: "scene_preset_id" };
}

function result(data: Record<string, unknown>) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
    structuredContent: data,
  };
}

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("ru");
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length)));
  }
  return btoa(binary);
}

function corsHeaders(): Record<string, string> {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,DELETE,OPTIONS",
    "access-control-allow-headers": "authorization,content-type,mcp-session-id,mcp-protocol-version,last-event-id,mcp-param-protocol-version,mcp-param-client-info,mcp-param-client-capabilities",
    "access-control-expose-headers": "mcp-session-id,mcp-protocol-version,content-type",
  };
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders(), "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
}
