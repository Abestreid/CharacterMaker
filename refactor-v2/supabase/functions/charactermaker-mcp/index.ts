import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.110.9";
import { createMcpHandler, McpServer } from "npm:@modelcontextprotocol/server@2.0.0";
import * as z from "npm:zod@4.4.3";

const SERVER_NAME = "charactermaker";
const SERVER_VERSION = "0.2.0";
const MEDIA_UPLOAD_URL = "https://charmaker.free.nf/dev/api/media.php?action=upload";
const MAX_IMPORT_BYTES = 8 * 1024 * 1024;
const MAX_INLINE_TOTAL_BYTES = 12 * 1024 * 1024;

const presetKindSchema = z.enum(["character", "outfit", "scene"]);
const searchableKindSchema = z.enum(["character", "outfit", "scene", "background"]);
const referenceStatusSchema = z.enum(["normal", "approved", "canonical", "rejected", "reference_only"]);

type PresetKind = z.infer<typeof presetKindSchema>;
type SearchableKind = z.infer<typeof searchableKindSchema>;
type AssetRecord = Record<string, unknown>;
type PresetBundle = Record<string, unknown>;

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
      description: "Search/list the shared public CharacterMaker library. Results are ranked by exact name/slug first and include visual-reference summaries. Use for discovery. If the user explicitly asks to create/generate an image from a known Persona name, prefer prepare_image_generation directly instead of stopping after search.",
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
      description: "Get a complete active Persona, Outfit or Scene card with normalized labeled parameters, AI context and optional linked asset METADATA. include_assets never inlines image bytes; use get_visual_package to show/reference images and prepare_image_generation for image-generation requests.",
      inputSchema: z.object({
        kind: presetKindSchema,
        id_or_slug: z.string().min(1).describe("UUID, stable slug, or exact unique preset name"),
        include_assets: z.boolean().default(true),
      }),
    },
    async ({ kind, id_or_slug, include_assets }) => {
      const bundle = await getPresetBundle(db(), kind, id_or_slug, include_assets);
      return result(bundle, JSON.stringify(bundleSummary(bundle), null, 2));
    },
  );

  server.registerTool(
    "get_visual_package",
    {
      description: "Use when the user asks to get/show/open the saved photo(s) or visual references of a Persona, Outfit or Scene. Resolves UUID, slug or exact name, selects the best references by canonical/approved status + role + primary flag, and can return actual MCP image content in the same tool call. Prefer this over manual list_assets + get_asset chains for normal photo requests.",
      inputSchema: z.object({
        kind: presetKindSchema,
        id_or_slug: z.string().min(1).describe("UUID, stable slug, or exact unique preset name"),
        include_images: z.boolean().default(true),
        max_images: z.number().int().min(1).max(3).default(2),
      }),
    },
    async ({ kind, id_or_slug, include_images, max_images }) => getVisualPackageResult(db(), kind, id_or_slug, include_images, max_images),
  );

  server.registerTool(
    "prepare_image_generation",
    {
      description: "PRIMARY tool for requests like 'сделай фото', 'создай изображение', 'generate an image' using a CharacterMaker Persona. Resolves Persona by UUID/slug/exact name, optionally resolves Outfit and Scene, builds the full generation context, selects the best identity/body/visual references, and inlines the actual reference images when requested. IMPORTANT: this tool prepares inputs but does not call an image provider. After it returns, if the MCP host (for example ChatGPT) has native image-generation capability and the user asked to generate an image, CONTINUE immediately with that native image generator using the returned context/images. Do NOT stop by saying CharacterMaker lacks a generate_image MCP tool.",
      inputSchema: z.object({
        character: z.string().min(1).describe("Persona UUID, slug, or exact unique name, e.g. Лайвет or victoria-june"),
        outfit: z.string().min(1).nullable().optional().describe("Optional Outfit UUID, slug, or exact unique name"),
        scene: z.string().min(1).nullable().optional().describe("Optional Scene UUID, slug, or exact unique name"),
        include_images: z.boolean().default(true),
        max_reference_images: z.number().int().min(1).max(3).default(3),
      }),
    },
    async ({ character, outfit, scene, include_images, max_reference_images }) => prepareImageGenerationResult(db(), character, outfit ?? null, scene ?? null, include_images, max_reference_images),
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
      description: "Get the current MCP persistence contract plus recommended workflows for details, showing photos and preparing native-host image generation.",
      inputSchema: z.object({ kind: z.enum(["character", "outfit", "scene", "asset", "all"]).default("all") }),
    },
    async ({ kind }) => result(schemaDescription(kind)),
  );

  server.registerTool(
    "build_generation_context",
    {
      description: "Build a normalized provider-independent generation context from a Persona UUID plus optional Outfit/Scene UUIDs. Includes ranked visual-reference metadata and an explicit native-host next action. For an actual user image-generation request, prefer prepare_image_generation because it can also inline the reference images; after either tool returns, continue with the host's native image generator when available.",
      inputSchema: z.object({
        character_id: z.string().uuid(),
        outfit_id: z.string().uuid().nullable().optional(),
        scene_id: z.string().uuid().nullable().optional(),
      }),
    },
    async ({ character_id, outfit_id, scene_id }) => {
      const context = await buildGenerationContext(db(), character_id, outfit_id ?? null, scene_id ?? null);
      return result(context, JSON.stringify(generationContextSummary(context), null, 2));
    },
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
      description: "List image asset metadata linked to a Persona, Outfit or Scene and include a ranked visual package. For normal 'show me the photo' requests use get_visual_package because it can inline actual image content.",
      inputSchema: z.object({ kind: presetKindSchema, owner_id: z.string().uuid() }),
    },
    async ({ kind, owner_id }) => {
      const assets = await getAssets(db(), kind, owner_id);
      return result({ assets, visual_package: buildVisualPackage(kind, assets) });
    },
  );

  server.registerTool(
    "get_asset",
    {
      description: "Get one specific CharacterMaker image asset. When include_image is true actual image bytes are returned as MCP image content. For automatically choosing the best saved photos, prefer get_visual_package.",
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
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders() });
  const url = new URL(request.url);
  if (url.pathname.endsWith("/health")) {
    return jsonResponse({
      ok: true,
      name: SERVER_NAME,
      version: SERVER_VERSION,
      protocol: "MCP 2026-07-28 + legacy stateless",
      image_workflow: "prepare_image_generation -> native host image generator",
    });
  }
  const response = await mcp.fetch(request);
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(corsHeaders())) headers.set(key, value);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
});

async function searchEntities(client: SupabaseClient, kind: SearchableKind, query: string, limit: number) {
  const config = entityConfig(kind);
  const { data, error } = await client.from(config.table).select("id,slug,name,description").eq("is_public", true).eq("status", "active").limit(500);
  if (error) throw error;

  const q = normalize(query);
  const ranked = (data ?? [])
    .map((item) => ({ ...item, match_rank: searchMatchRank(item, q), match_type: searchMatchType(item, q) }))
    .filter((item) => !q || item.match_rank < 100)
    .sort((a, b) => a.match_rank - b.match_rank || String(a.name).localeCompare(String(b.name), "ru"))
    .slice(0, limit);

  const summaries = kind === "background" ? new Map<string, Record<string, unknown>>() : await getSearchAssetSummaries(client, kind, ranked.map((item) => String(item.id)));
  const items = ranked.map((item) => ({ ...item, ...(summaries.get(String(item.id)) ?? emptyAssetSummary()) }));
  const exact = items.filter((item) => item.match_rank <= 1);

  return {
    kind,
    query,
    count: items.length,
    exact_match: exact.length === 1 ? exact[0] : null,
    items,
    recommended_next_step: exact.length === 1
      ? "Use get_preset for structured details, get_visual_package to show photos, or prepare_image_generation if the user asked to create an image."
      : "If more than one result matches, disambiguate by name/slug before mutation. For image generation, prepare_image_generation can resolve an exact unique name directly.",
  };
}

function searchMatchRank(item: Record<string, unknown>, q: string) {
  if (!q) return 10;
  const name = normalize(String(item.name ?? ""));
  const slug = normalize(String(item.slug ?? ""));
  const description = normalize(String(item.description ?? ""));
  if (name === q) return 0;
  if (slug === q) return 1;
  if (name.startsWith(q)) return 2;
  if (slug.startsWith(q)) return 3;
  if (name.includes(q)) return 4;
  if (slug.includes(q)) return 5;
  if (description.includes(q)) return 6;
  return 100;
}

function searchMatchType(item: Record<string, unknown>, q: string) {
  const rank = searchMatchRank(item, q);
  return ["exact_name", "exact_slug", "name_prefix", "slug_prefix", "name_contains", "slug_contains", "description_contains"][rank] ?? (q ? "none" : "all");
}

async function getSearchAssetSummaries(client: SupabaseClient, kind: PresetKind, ownerIds: string[]) {
  const output = new Map<string, Record<string, unknown>>();
  if (!ownerIds.length) return output;
  const relation = assetRelation(kind);
  const { data: links, error: linkError } = await client.from(relation.table)
    .select(`${relation.ownerColumn},asset_id,role,is_primary,sort_order`)
    .in(relation.ownerColumn, ownerIds);
  if (linkError) throw linkError;

  const assetIds = [...new Set((links ?? []).map((link) => String(link.asset_id)))];
  let assets: Array<Record<string, unknown>> = [];
  if (assetIds.length) {
    const { data, error } = await client.from("assets")
      .select("id,reference_status,mime_type,width,height,public_url")
      .in("id", assetIds)
      .eq("is_public", true)
      .eq("status", "active");
    if (error) throw error;
    assets = data ?? [];
  }
  const byAssetId = new Map(assets.map((asset) => [String(asset.id), asset]));
  const grouped = new Map<string, AssetRecord[]>();
  for (const link of links ?? []) {
    const ownerId = String(link[relation.ownerColumn]);
    const asset = byAssetId.get(String(link.asset_id));
    if (!asset) continue;
    const merged = { ...asset, role: link.role, is_primary: link.is_primary, sort_order: link.sort_order };
    const current = grouped.get(ownerId) ?? [];
    current.push(merged);
    grouped.set(ownerId, current);
  }
  for (const ownerId of ownerIds) {
    const visual = buildVisualPackage(kind, grouped.get(ownerId) ?? []);
    const preview = (visual.recommended_assets as AssetRecord[])[0] ?? null;
    output.set(ownerId, {
      asset_count: visual.asset_count,
      canonical_asset_count: visual.canonical_count,
      approved_asset_count: visual.approved_count,
      preview_asset_id: preview?.id ?? null,
      preview_role: preview?.role ?? null,
      has_visual_reference: Number(visual.asset_count) > 0,
    });
  }
  return output;
}

function emptyAssetSummary() {
  return { asset_count: 0, canonical_asset_count: 0, approved_asset_count: 0, preview_asset_id: null, preview_role: null, has_visual_reference: false };
}

async function getPresetBundle(client: SupabaseClient, kind: PresetKind, idOrSlugOrName: string, includeAssets: boolean): Promise<PresetBundle> {
  const entity = await resolveEntity(client, kind, idOrSlugOrName);
  const config = entityConfig(kind);

  const parameterPromise = client.from(config.parameterTable)
    .select("catalog_id,position,option_id,number_value,text_value,boolean_value,json_value")
    .eq(config.ownerColumn, entity.id)
    .order("catalog_id")
    .order("position");
  const assetsPromise = includeAssets ? getAssets(client, kind, String(entity.id)) : Promise.resolve([] as AssetRecord[]);
  const backgroundPromise = kind === "scene" && entity.background_id
    ? client.from("backgrounds").select("id,slug,name,description,prompt_text").eq("id", entity.background_id).maybeSingle()
    : Promise.resolve({ data: null, error: null });

  const [{ data: rows, error: parameterError }, assets, { data: background, error: backgroundError }] = await Promise.all([parameterPromise, assetsPromise, backgroundPromise]);
  if (parameterError) throw parameterError;
  if (backgroundError) throw backgroundError;

  const hydrated = await hydrateParameters(client, rows ?? []);
  const bundle: PresetBundle = {
    kind,
    entity: sanitizeEntity(entity),
    parameters: hydrated,
    parameter_count: hydrated.length,
  };
  if (background) bundle.background = background;
  if (includeAssets) {
    bundle.assets = assets;
    bundle.asset_summary = summarizeAssets(kind, assets);
    bundle.visual_package = buildVisualPackage(kind, assets);
  }
  return bundle;
}

async function resolveEntity(client: SupabaseClient, kind: PresetKind, identifier: string) {
  const config = entityConfig(kind);
  const base = () => client.from(config.table).select("*").eq("is_public", true).eq("status", "active");

  if (isUuid(identifier)) {
    const { data, error } = await base().eq("id", identifier).maybeSingle();
    if (error) throw error;
    if (!data) throw new Error(`${kind} not found by UUID: ${identifier}`);
    return data;
  }

  const { data: bySlug, error: slugError } = await base().eq("slug", identifier).maybeSingle();
  if (slugError) throw slugError;
  if (bySlug) return bySlug;

  const { data: byName, error: nameError } = await base().ilike("name", identifier).limit(2);
  if (nameError) throw nameError;
  if (byName?.length === 1) return byName[0];
  if ((byName?.length ?? 0) > 1) throw new Error(`Ambiguous ${kind} name: ${identifier}. Use UUID or slug.`);
  throw new Error(`${kind} not found by UUID, slug or exact name: ${identifier}`);
}

function sanitizeEntity(entity: Record<string, unknown>) {
  const output = { ...entity };
  if (output.metadata && typeof output.metadata === "object" && !Array.isArray(output.metadata)) {
    const metadata = { ...(output.metadata as Record<string, unknown>) };
    delete metadata.editor_state;
    delete metadata.editorState;
    output.metadata = metadata;
  }
  return output;
}

function bundleSummary(bundle: PresetBundle) {
  const entity = bundle.entity as Record<string, unknown>;
  const assetSummary = bundle.asset_summary as Record<string, unknown> | undefined;
  return {
    kind: bundle.kind,
    id: entity.id,
    slug: entity.slug,
    name: entity.name,
    version: entity.version,
    schema_version: entity.schema_version,
    parameter_count: bundle.parameter_count,
    asset_summary: assetSummary ?? null,
    note: "Full normalized data is available in structuredContent. Image bytes are intentionally not duplicated here.",
  };
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
      value: optionId
        ? { type: "option", id: optionId, label: optionByKey.get(`${catalogId}:${optionId}`)?.label ?? optionId }
        : row.number_value !== null
          ? { type: "number", value: Number(row.number_value) }
          : row.text_value !== null
            ? { type: "text", value: row.text_value }
            : row.boolean_value !== null
              ? { type: "boolean", value: row.boolean_value }
              : { type: "json", value: row.json_value },
    };
  });
}

async function getAssets(client: SupabaseClient, kind: PresetKind, ownerId: string): Promise<AssetRecord[]> {
  const relation = assetRelation(kind);
  const { data: links, error: linkError } = await client.from(relation.table)
    .select("asset_id,role,is_primary,sort_order")
    .eq(relation.ownerColumn, ownerId)
    .order("sort_order");
  if (linkError) throw linkError;
  if (!links?.length) return [];

  const { data: assets, error: assetError } = await client.from("assets")
    .select("id,object_path,public_url,mime_type,file_name,size_bytes,width,height,reference_status,metadata")
    .in("id", links.map((link) => link.asset_id))
    .eq("is_public", true)
    .eq("status", "active");
  if (assetError) throw assetError;

  const byId = new Map((assets ?? []).map((asset) => [asset.id, asset]));
  return links.flatMap((link) => {
    const asset = byId.get(link.asset_id);
    return asset ? [{ ...asset, role: link.role, is_primary: link.is_primary, sort_order: link.sort_order }] : [];
  });
}

function summarizeAssets(kind: PresetKind, assets: AssetRecord[]) {
  const visual = buildVisualPackage(kind, assets);
  return {
    count: visual.asset_count,
    canonical: visual.canonical_count,
    approved: visual.approved_count,
    reference_only: assets.filter((asset) => asset.reference_status === "reference_only").length,
    normal: assets.filter((asset) => asset.reference_status === "normal").length,
    rejected: assets.filter((asset) => asset.reference_status === "rejected").length,
    primary_face_asset_id: (visual.primary_face_asset as AssetRecord | null)?.id ?? null,
    primary_body_asset_id: (visual.primary_body_asset as AssetRecord | null)?.id ?? null,
    recommended_asset_ids: (visual.recommended_assets as AssetRecord[]).map((asset) => asset.id),
  };
}

function buildVisualPackage(kind: PresetKind, assets: AssetRecord[]) {
  const eligible = assets.filter((asset) => asset.reference_status !== "rejected");
  const ranked = [...eligible].sort((a, b) => assetScore(kind, b) - assetScore(kind, a));
  const primaryFace = kind === "character" ? ranked.find((asset) => isFaceRole(String(asset.role ?? ""))) ?? null : null;
  const primaryBody = kind === "character" ? ranked.find((asset) => isBodyRole(String(asset.role ?? ""))) ?? null : null;
  const recommended = uniqueAssets([primaryFace, primaryBody, ...ranked].filter(Boolean) as AssetRecord[]);
  const canonicalCount = eligible.filter((asset) => asset.reference_status === "canonical").length;
  const approvedCount = eligible.filter((asset) => asset.reference_status === "approved").length;
  const warnings: string[] = [];
  if (!eligible.length) warnings.push("No active non-rejected visual assets are linked to this preset.");
  if (eligible.length && canonicalCount === 0 && approvedCount === 0) warnings.push("No canonical/approved visual asset is available; normal/reference-only assets are ranked as fallback references.");
  if (kind === "character" && eligible.length && !primaryFace) warnings.push("No face/portrait role was found; the highest-ranked available visual reference is used instead.");
  if (kind === "character" && eligible.length && !primaryBody) warnings.push("No dedicated full-body/body-reference role was found; body identity must rely on structured Persona parameters and other available images.");

  return {
    kind,
    asset_count: assets.length,
    eligible_asset_count: eligible.length,
    canonical_count: canonicalCount,
    approved_count: approvedCount,
    reference_quality: canonicalCount > 0 ? "canonical" : approvedCount > 0 ? "approved" : eligible.length > 0 ? "fallback" : "none",
    primary_face_asset: primaryFace,
    primary_body_asset: primaryBody,
    recommended_assets: recommended,
    recommended_asset_ids: recommended.map((asset) => asset.id),
    warnings,
  };
}

function assetScore(kind: PresetKind, asset: AssetRecord) {
  const status = String(asset.reference_status ?? "normal");
  const statusScore: Record<string, number> = { canonical: 5000, approved: 4000, reference_only: 3000, normal: 1000, rejected: -100000 };
  const primaryScore = asset.is_primary === true ? 500 : 0;
  return (statusScore[status] ?? 0) + primaryScore + roleScore(kind, String(asset.role ?? "")) - Number(asset.sort_order ?? 0);
}

function roleScore(kind: PresetKind, role: string) {
  const character: Record<string, number> = {
    face_closeup: 1200,
    face: 1150,
    portrait: 1100,
    headshot: 1050,
    full_front: 1000,
    full_body_front: 1000,
    body_reference: 950,
    full_body: 900,
    left_profile: 800,
    right_profile: 800,
    profile: 790,
    hair_reference: 700,
    full_back: 650,
    reference: 500,
    cover: 400,
  };
  const outfit: Record<string, number> = { on_model: 1100, front: 1050, cover: 1000, back: 800, side: 750, detail: 650, texture: 600, reference: 500 };
  const scene: Record<string, number> = { reference: 1100, background_reference: 1050, style_reference: 1000, preview: 900, cover: 850 };
  return (kind === "character" ? character : kind === "outfit" ? outfit : scene)[role] ?? 100;
}

function isFaceRole(role: string) {
  return ["face_closeup", "face", "portrait", "headshot", "left_profile", "right_profile", "profile"].includes(role);
}

function isBodyRole(role: string) {
  return ["full_front", "full_body_front", "body_reference", "full_body", "full_back"].includes(role);
}

function uniqueAssets(assets: AssetRecord[]) {
  const seen = new Set<string>();
  return assets.filter((asset) => {
    const id = String(asset.id ?? "");
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

async function getVisualPackageResult(client: SupabaseClient, kind: PresetKind, identifier: string, includeImages: boolean, maxImages: number) {
  const bundle = await getPresetBundle(client, kind, identifier, true);
  const visual = bundle.visual_package as Record<string, unknown>;
  const selected = ((visual.recommended_assets as AssetRecord[] | undefined) ?? []).slice(0, maxImages);
  const entity = bundle.entity as Record<string, unknown>;
  const structured: Record<string, unknown> = {
    kind,
    entity: { id: entity.id, slug: entity.slug, name: entity.name, description: entity.description, version: entity.version },
    visual_package: visual,
    selected_asset_ids: selected.map((asset) => asset.id),
  };
  const text = JSON.stringify({
    kind,
    entity: structured.entity,
    reference_quality: visual.reference_quality,
    selected_assets: selected.map(compactAssetForText),
    warnings: visual.warnings,
    note: includeImages ? "Selected image bytes follow this text as MCP image content." : "Image bytes were not requested.",
  }, null, 2);
  return includeImages ? multimodalResult(structured, text, selected) : result(structured, text);
}

async function buildGenerationContext(client: SupabaseClient, characterId: string, outfitId: string | null, sceneId: string | null) {
  const [character, outfit, scene] = await Promise.all([
    getPresetBundle(client, "character", characterId, true),
    outfitId ? getPresetBundle(client, "outfit", outfitId, true) : Promise.resolve(null),
    sceneId ? getPresetBundle(client, "scene", sceneId, true) : Promise.resolve(null),
  ]);
  return buildGenerationContextFromBundles(character, outfit, scene);
}

function buildGenerationContextFromBundles(character: PresetBundle, outfit: PresetBundle | null, scene: PresetBundle | null) {
  const characterVisual = character.visual_package as Record<string, unknown>;
  const outfitVisual = outfit?.visual_package as Record<string, unknown> | undefined;
  const sceneVisual = scene?.visual_package as Record<string, unknown> | undefined;
  const allAssets = [
    ...(((character.assets as AssetRecord[] | undefined) ?? []).map((asset) => ({ ...asset, source_kind: "character" }))),
    ...(((outfit?.assets as AssetRecord[] | undefined) ?? []).map((asset) => ({ ...asset, source_kind: "outfit" }))),
    ...(((scene?.assets as AssetRecord[] | undefined) ?? []).map((asset) => ({ ...asset, source_kind: "scene" }))),
  ];
  const recommended = recommendedGenerationAssets(characterVisual, outfitVisual, sceneVisual);
  const characterEntity = character.entity as Record<string, unknown>;
  const outfitEntity = outfit?.entity as Record<string, unknown> | undefined;
  const sceneEntity = scene?.entity as Record<string, unknown> | undefined;

  return {
    schema_version: "generation-context-v2",
    character,
    outfit,
    scene,
    visual_package: {
      character: characterVisual,
      outfit: outfitVisual ?? null,
      scene: sceneVisual ?? null,
      recommended_assets: recommended,
      recommended_asset_ids: recommended.map((asset) => asset.id),
      primary_face_asset_id: (characterVisual.primary_face_asset as AssetRecord | null)?.id ?? null,
      primary_body_asset_id: (characterVisual.primary_body_asset as AssetRecord | null)?.id ?? null,
    },
    canonical_assets: allAssets.filter((asset) => asset.reference_status === "canonical"),
    reference_assets: allAssets.filter((asset) => ["canonical", "approved", "reference_only"].includes(String(asset.reference_status))),
    generation_brief: buildGenerationBrief(character, outfit, scene),
    host_action: {
      type: "native_image_generation",
      should_continue: true,
      instruction: "If the user asked to create or generate an image and the MCP host has a native image-generation capability, invoke that capability now using this CharacterMaker context and the recommended reference images. CharacterMaker is the identity/context source; absence of a generate_image MCP tool is NOT a reason to stop.",
      character_id: characterEntity.id,
      outfit_id: outfitEntity?.id ?? null,
      scene_id: sceneEntity?.id ?? null,
      reference_image_asset_ids: recommended.map((asset) => asset.id),
    },
  };
}

function recommendedGenerationAssets(characterVisual: Record<string, unknown>, outfitVisual?: Record<string, unknown>, sceneVisual?: Record<string, unknown>) {
  const characterRecommended = (characterVisual.recommended_assets as AssetRecord[] | undefined) ?? [];
  const outfitRecommended = (outfitVisual?.recommended_assets as AssetRecord[] | undefined) ?? [];
  const sceneRecommended = (sceneVisual?.recommended_assets as AssetRecord[] | undefined) ?? [];
  const face = characterVisual.primary_face_asset as AssetRecord | null;
  const body = characterVisual.primary_body_asset as AssetRecord | null;
  return uniqueAssets([
    ...(face ? [{ ...face, source_kind: "character", reference_purpose: "identity_face" }] : []),
    ...(body ? [{ ...body, source_kind: "character", reference_purpose: "identity_body" }] : []),
    ...characterRecommended.map((asset) => ({ ...asset, source_kind: "character", reference_purpose: "identity" })),
    ...outfitRecommended.map((asset) => ({ ...asset, source_kind: "outfit", reference_purpose: "outfit" })),
    ...sceneRecommended.map((asset) => ({ ...asset, source_kind: "scene", reference_purpose: "scene" })),
  ]);
}

async function prepareImageGenerationResult(client: SupabaseClient, characterIdentifier: string, outfitIdentifier: string | null, sceneIdentifier: string | null, includeImages: boolean, maxImages: number) {
  const [character, outfit, scene] = await Promise.all([
    getPresetBundle(client, "character", characterIdentifier, true),
    outfitIdentifier ? getPresetBundle(client, "outfit", outfitIdentifier, true) : Promise.resolve(null),
    sceneIdentifier ? getPresetBundle(client, "scene", sceneIdentifier, true) : Promise.resolve(null),
  ]);
  const context = buildGenerationContextFromBundles(character, outfit, scene);
  const recommended = (((context.visual_package as Record<string, unknown>).recommended_assets as AssetRecord[] | undefined) ?? []).slice(0, maxImages);
  const structured = {
    ...context,
    ready_for_native_generation: true,
    selected_inline_asset_ids: recommended.map((asset) => asset.id),
  };
  const text = JSON.stringify({
    schema_version: context.schema_version,
    generation_brief: context.generation_brief,
    selected_references: recommended.map(compactAssetForText),
    host_action: context.host_action,
    note: includeImages
      ? "Reference image bytes follow this text. Continue with the host's native image generator now if the user requested an image."
      : "Reference metadata is ready. Continue with the host's native image generator now if the user requested an image.",
  }, null, 2);
  return includeImages ? multimodalResult(structured, text, recommended) : result(structured, text);
}

function buildGenerationBrief(character: PresetBundle, outfit: PresetBundle | null, scene: PresetBundle | null) {
  return {
    character: bundleFacts(character),
    outfit: outfit ? bundleFacts(outfit) : null,
    scene: scene ? bundleFacts(scene) : null,
    rule: "Preserve permanent Persona identity from character data/references. Outfit and Scene are temporary generation context and must not alter canonical Persona identity.",
  };
}

function bundleFacts(bundle: PresetBundle) {
  const entity = bundle.entity as Record<string, unknown>;
  const aiContext = entity.ai_context && typeof entity.ai_context === "object" ? entity.ai_context : null;
  const measurements = Object.fromEntries([
    "age", "height_cm", "weight_kg", "bust_cm", "waist_cm", "hips_cm", "body_fat_percent", "physique_description", "category", "custom_background_text", "prompt_text",
  ].filter((key) => entity[key] !== null && entity[key] !== undefined && entity[key] !== "").map((key) => [key, entity[key]]));
  const parameters = ((bundle.parameters as Array<Record<string, unknown>> | undefined) ?? []).map((row) => {
    const catalog = row.catalog as Record<string, unknown>;
    const value = row.value as Record<string, unknown>;
    return {
      catalog_id: catalog.id,
      label: catalog.label ?? catalog.id,
      position: row.position,
      value: value.label ?? value.value ?? value.id ?? null,
      option_id: value.type === "option" ? value.id : null,
    };
  });
  return {
    id: entity.id,
    slug: entity.slug,
    name: entity.name,
    description: entity.description,
    measurements,
    parameters,
    ai_context: aiContext,
  };
}

function generationContextSummary(context: Record<string, unknown>) {
  const character = (context.character as PresetBundle).entity as Record<string, unknown>;
  const visual = context.visual_package as Record<string, unknown>;
  return {
    schema_version: context.schema_version,
    character: { id: character.id, slug: character.slug, name: character.name },
    recommended_asset_ids: visual.recommended_asset_ids,
    primary_face_asset_id: visual.primary_face_asset_id,
    primary_body_asset_id: visual.primary_body_asset_id,
    host_action: context.host_action,
    note: "Full normalized context is available in structuredContent. Use prepare_image_generation when actual reference image bytes are needed in the same call.",
  };
}

async function multimodalResult(structured: Record<string, unknown>, text: string, assets: AssetRecord[]) {
  const content: Array<Record<string, unknown>> = [{ type: "text", text }];
  const inlineIds: string[] = [];
  const imageErrors: Array<{ asset_id: string; error: string }> = [];
  let totalBytes = 0;

  for (const asset of assets) {
    try {
      const fetched = await fetchAssetBytes(asset);
      if (!fetched) continue;
      if (totalBytes + fetched.bytes.byteLength > MAX_INLINE_TOTAL_BYTES) {
        imageErrors.push({ asset_id: String(asset.id), error: "Skipped because the total inline-image safety limit would be exceeded." });
        continue;
      }
      totalBytes += fetched.bytes.byteLength;
      content.push({ type: "image", data: bytesToBase64(fetched.bytes), mimeType: fetched.mimeType });
      inlineIds.push(String(asset.id));
    } catch (error) {
      imageErrors.push({ asset_id: String(asset.id), error: errorMessage(error) });
    }
  }

  return {
    content,
    structuredContent: {
      ...structured,
      inline_image_asset_ids: inlineIds,
      inline_image_errors: imageErrors,
      inline_image_count: inlineIds.length,
    },
  };
}

async function fetchAssetBytes(asset: AssetRecord) {
  const publicUrl = typeof asset.public_url === "string" ? asset.public_url : "";
  const mimeType = typeof asset.mime_type === "string" ? asset.mime_type : "";
  if (!publicUrl || !mimeType.startsWith("image/")) return null;
  const response = await fetch(publicUrl);
  if (!response.ok) throw new Error(`Image fetch failed: HTTP ${response.status}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength === 0) throw new Error("Image fetch returned zero bytes.");
  if (bytes.byteLength > MAX_IMPORT_BYTES) throw new Error("Image is larger than the CharacterMaker inline-image limit.");
  return { bytes, mimeType };
}

function compactAssetForText(asset: AssetRecord) {
  return {
    id: asset.id,
    role: asset.role,
    reference_status: asset.reference_status,
    is_primary: asset.is_primary,
    width: asset.width,
    height: asset.height,
    mime_type: asset.mime_type,
    source_kind: asset.source_kind,
    reference_purpose: asset.reference_purpose,
  };
}

async function createPreset(client: SupabaseClient, kind: PresetKind, input: Record<string, unknown>) {
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

async function patchPreset(client: SupabaseClient, kind: PresetKind, id: string, patch: Record<string, unknown>, expectedVersion: number | null) {
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
  const { data: asset, error } = await client.from("assets")
    .select("id,object_path,public_url,mime_type,file_name,size_bytes,width,height,reference_status,metadata")
    .eq("id", assetId)
    .eq("is_public", true)
    .eq("status", "active")
    .maybeSingle();
  if (error) throw error;
  if (!asset) throw new Error(`Asset not found: ${assetId}`);
  if (!includeImage) return result({ asset });
  return multimodalResult({ asset }, JSON.stringify({ asset: compactAssetForText(asset) }, null, 2), [asset]);
}

async function importAssetFromUrl(client: SupabaseClient, input: {
  kind: PresetKind;
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
    workflows: {
      structured_details: "get_preset",
      show_saved_photos: "get_visual_package(include_images=true)",
      create_or_generate_image: "prepare_image_generation(include_images=true) -> then invoke the MCP host's native image generator if available; do not stop because CharacterMaker itself has no generate_image provider tool",
      single_known_asset: "get_asset(include_image=true)",
      partial_update: "patch_preset",
    },
  };
  const definitions = {
    character: { schema_version: "character-state-v3", columns: ["name", "slug", "description", "age", "height_cm", "weight_kg", "bust_cm", "waist_cm", "hips_cm", "body_fat_percent", "physique_description", "ai_context", "version"], domains: ["character", "shared"] },
    outfit: { schema_version: "wardrobe-state-v2", columns: ["name", "slug", "description", "category", "suggested_background_id", "prompt_text", "ai_context", "version"], domains: ["wardrobe", "shared"] },
    scene: { schema_version: "scene-state-v3", columns: ["name", "slug", "description", "background_slug", "custom_background_text", "prompt_text", "reference_use_clothing", "reference_use_expression", "ai_context", "version"], domains: ["scene", "background", "shared"] },
    asset: { statuses: referenceStatusSchema.options, storage: "InfinityFree /media; Supabase stores metadata/relations only", image_types: ["image/jpeg", "image/png", "image/webp"], max_bytes: MAX_IMPORT_BYTES, max_inline_total_bytes: MAX_INLINE_TOTAL_BYTES },
  };
  if (kind === "all") return { ...common, ...definitions };
  return { ...common, [kind]: definitions[kind as keyof typeof definitions] };
}

function entityConfig(kind: SearchableKind) {
  if (kind === "character") return { table: "characters", parameterTable: "character_parameter_values", ownerColumn: "character_id" };
  if (kind === "outfit") return { table: "outfit_presets", parameterTable: "outfit_preset_parameter_values", ownerColumn: "outfit_preset_id" };
  if (kind === "scene") return { table: "scene_presets", parameterTable: "scene_preset_parameter_values", ownerColumn: "scene_preset_id" };
  return { table: "backgrounds", parameterTable: "background_parameter_values", ownerColumn: "background_id" };
}

function assetRelation(kind: PresetKind) {
  if (kind === "character") return { table: "character_assets", ownerColumn: "character_id" };
  if (kind === "outfit") return { table: "outfit_assets", ownerColumn: "outfit_preset_id" };
  return { table: "scene_assets", ownerColumn: "scene_preset_id" };
}

function result(data: Record<string, unknown>, text?: string) {
  return {
    content: [{ type: "text" as const, text: text ?? JSON.stringify(data, null, 2) }],
    structuredContent: data,
  };
}

function normalize(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("ru");
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

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
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
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(), "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}
