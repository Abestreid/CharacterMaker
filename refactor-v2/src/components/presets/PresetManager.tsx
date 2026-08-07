import { Database, ImagePlus, KeyRound, LoaderCircle, RefreshCw, Save, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { clearAdminToken, getAdminToken, setAdminToken, validateAdminToken } from '../../infrastructure/admin/admin-session';
import { deleteImageFromInfinityFree, uploadImageToInfinityFree, type MediaScope } from '../../infrastructure/media/infinityfree-media.repository';
import { fetchPresetAssets, type PresetAsset } from '../../infrastructure/supabase/preset-assets.repository';
import { attachInfinityFreeAsset, deleteAssetMetadata, deletePreset, savePreset, type PresetKind, type PresetPayload } from '../../infrastructure/supabase/preset-admin.repository';
import type { PresetIdentity } from '../../infrastructure/supabase/preset-mappers';
import { Button } from '../ui';

type PresetListItem<TState> = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  metadata: Record<string, unknown> & { editor_state?: unknown };
  editorState?: TState;
};

type PresetManagerProps<TState> = {
  kind: PresetKind;
  label: string;
  state: TState;
  loadPresets: () => Promise<Array<Omit<PresetListItem<TState>, 'editorState'>>>;
  onLoad: (state: TState) => void;
  toPayload: (identity: PresetIdentity, state: TState) => PresetPayload;
};

export function PresetManager<TState>({ kind, label, state, loadPresets, onLoad, toPayload }: PresetManagerProps<TState>) {
  const [presets, setPresets] = useState<PresetListItem<TState>[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [name, setName] = useState('');
  const [adminTokenInput, setAdminTokenInput] = useState('');
  const [adminEnabled, setAdminEnabled] = useState(() => Boolean(getAdminToken()));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [assets, setAssets] = useState<PresetAsset[]>([]);
  const [assetRole, setAssetRole] = useState(() => roleOptions(kind)[0]?.id ?? 'reference');
  const [assetPrimary, setAssetPrimary] = useState(true);

  const selected = useMemo(() => presets.find((preset) => preset.id === selectedId) ?? null, [presets, selectedId]);

  const refresh = useCallback(async () => {
    const rows = await loadPresets();
    setPresets(rows.map((row) => ({
      ...row,
      ...(isEditorState<TState>(row.metadata.editor_state) ? { editorState: row.metadata.editor_state } : {}),
    })));
  }, [loadPresets]);

  const refreshAssets = useCallback(async () => {
    if (!selectedId) {
      setAssets([]);
      return;
    }
    setAssets(await fetchPresetAssets(kind, selectedId));
  }, [kind, selectedId]);

  useEffect(() => {
    refresh().catch((reason: unknown) => setError(errorMessage(reason)));
  }, [refresh]);

  useEffect(() => {
    refreshAssets().catch((reason: unknown) => setError(errorMessage(reason)));
  }, [refreshAssets]);

  useEffect(() => {
    if (selected) setName(selected.name);
  }, [selected]);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await action();
    } catch (reason: unknown) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  };

  const unlock = () => run(async () => {
    const token = adminTokenInput.trim();
    if (!(await validateAdminToken(token))) throw new Error('Неверный служебный ключ редактирования.');
    setAdminToken(token);
    setAdminTokenInput('');
    setAdminEnabled(true);
    setMessage('Редактирование открыто для этой вкладки.');
  });

  const lock = () => {
    clearAdminToken();
    setAdminEnabled(false);
    setMessage('Режим редактирования закрыт.');
  };

  const loadSelected = () => {
    setError(null);
    setMessage(null);
    if (!selected) return setError(`Выберите пресет «${label}».`);
    if (!selected.editorState) return setError('У этого пресета нет совместимого снимка V2-редактора.');
    onLoad(selected.editorState);
    setMessage(`Пресет «${selected.name}» загружен в редактор.`);
  };

  const saveNew = () => run(async () => {
    const cleanName = name.trim();
    if (!cleanName) throw new Error('Введите название пресета.');
    const id = await savePreset(kind, toPayload({ name: cleanName, slug: createPresetSlug(kind) }, state));
    await refresh();
    setSelectedId(id);
    setMessage(`Пресет «${cleanName}» создан.`);
  });

  const updateSelected = () => run(async () => {
    if (!selected) throw new Error('Сначала выберите сохраненный пресет.');
    const cleanName = name.trim();
    if (!cleanName) throw new Error('Название пресета не может быть пустым.');
    await savePreset(kind, toPayload({ id: selected.id, name: cleanName, slug: selected.slug, description: selected.description }, state));
    await refresh();
    setSelectedId(selected.id);
    setMessage(`Пресет «${cleanName}» обновлен.`);
  });

  const removeSelected = () => run(async () => {
    if (!selected) throw new Error('Сначала выберите сохраненный пресет.');
    if (!window.confirm(`Удалить пресет «${selected.name}» из публичной библиотеки?`)) return;
    await deletePreset(kind, selected.id, false);
    setSelectedId('');
    setName('');
    setAssets([]);
    await refresh();
    setMessage(`Пресет «${selected.name}» удален из публичной библиотеки.`);
  });

  const uploadAsset = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !selected) return;

    void run(async () => {
      const uploaded = await uploadImageToInfinityFree({
        file,
        scope: scopeForKind(kind),
        entityId: selected.id,
        role: assetRole,
      });
      try {
        await attachInfinityFreeAsset({
          ownerKind: kind,
          ownerId: selected.id,
          role: assetRole,
          objectPath: uploaded.objectPath,
          publicUrl: uploaded.publicUrl,
          fileName: uploaded.fileName,
          mimeType: uploaded.mimeType,
          sizeBytes: uploaded.sizeBytes,
          isPrimary: assetPrimary,
        });
      } catch (reason: unknown) {
        await deleteImageFromInfinityFree(uploaded.objectPath).catch(() => undefined);
        throw reason;
      }
      await refreshAssets();
      setMessage(`Фото «${uploaded.fileName}» сохранено на InfinityFree и привязано к пресету.`);
    });
  };

  const removeAsset = (asset: PresetAsset) => run(async () => {
    if (!window.confirm(`Удалить фото «${asset.fileName ?? asset.role}»?`)) return;
    if (asset.objectPath) await deleteImageFromInfinityFree(asset.objectPath);
    await deleteAssetMetadata(asset.id);
    await refreshAssets();
    setMessage('Фото удалено с InfinityFree и из связей Supabase.');
  });

  const roles = roleOptions(kind);

  return (
    <section className="surface mb-4 rounded-3xl p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground"><Database className="size-4 text-primary" />Пресеты · {label}</div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">Параметры и связи хранятся в Supabase. Фото физически хранятся на InfinityFree.</p>
        </div>
        <Button disabled={busy} onClick={() => run(async () => { await refresh(); await refreshAssets(); })} size="sm" variant="ghost"><RefreshCw className="size-4" />Обновить</Button>
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
        <label className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Сохраненные</span>
          <select className="focus-ring min-h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground" onChange={(event) => setSelectedId(event.target.value)} value={selectedId}>
            <option value="">Выберите пресет...</option>
            {presets.map((preset) => <option key={preset.id} value={preset.id}>{preset.name}</option>)}
          </select>
        </label>
        <label className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Название</span>
          <input className="focus-ring min-h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground placeholder:text-muted-foreground" onChange={(event) => setName(event.target.value)} placeholder={`Например: ${label} 01`} value={name} />
        </label>
        <div className="flex items-end"><Button disabled={!selected || busy} onClick={loadSelected} variant="secondary">Загрузить</Button></div>
      </div>

      {adminEnabled ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button disabled={busy} onClick={saveNew}><Save className="size-4" />Создать новый</Button>
          <Button disabled={!selected || busy} onClick={updateSelected} variant="secondary"><Save className="size-4" />Обновить выбранный</Button>
          <Button disabled={!selected || busy} onClick={removeSelected} variant="danger"><Trash2 className="size-4" />Удалить</Button>
          <Button disabled={busy} onClick={lock} variant="ghost">Закрыть редактирование</Button>
        </div>
      ) : (
        <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
          <input className="focus-ring min-h-11 rounded-xl border border-border bg-surface px-3 text-sm text-foreground placeholder:text-muted-foreground" onChange={(event) => setAdminTokenInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void unlock(); }} placeholder="Служебный ключ редактирования" type="password" value={adminTokenInput} />
          <Button disabled={busy || !adminTokenInput.trim()} onClick={unlock} variant="secondary"><KeyRound className="size-4" />Открыть редактирование</Button>
        </div>
      )}

      {selected ? (
        <div className="mt-5 border-t border-border pt-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground"><ImagePlus className="size-4 text-primary" />Фото пресета</div>
          {adminEnabled ? (
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
              <label className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Роль фото</span>
                <select className="focus-ring min-h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground" onChange={(event) => setAssetRole(event.target.value)} value={assetRole}>
                  {roles.map((role) => <option key={role.id} value={role.id}>{role.label}</option>)}
                </select>
              </label>
              <label className="flex min-h-11 items-center gap-2 self-end rounded-xl border border-border bg-surface px-3 text-xs text-muted-foreground">
                <input checked={assetPrimary} onChange={(event) => setAssetPrimary(event.target.checked)} type="checkbox" />Основное
              </label>
              <label className="self-end"><span className="sr-only">Добавить фото</span><span className="focus-ring inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"><ImagePlus className="size-4" />Добавить фото</span><input accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={busy} onChange={uploadAsset} type="file" /></label>
            </div>
          ) : null}

          {assets.length ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {assets.map((asset) => (
                <article className="overflow-hidden rounded-2xl border border-border bg-surface" key={asset.id}>
                  {asset.publicUrl ? <img alt={asset.fileName ?? asset.role} className="aspect-[4/3] w-full object-cover" loading="lazy" src={asset.publicUrl} /> : <div className="grid aspect-[4/3] place-items-center text-xs text-muted-foreground">Нет URL</div>}
                  <div className="flex items-center justify-between gap-3 p-3">
                    <div className="min-w-0"><p className="truncate text-xs font-medium text-foreground">{roles.find((role) => role.id === asset.role)?.label ?? asset.role}{asset.isPrimary ? ' · основное' : ''}</p><p className="mt-0.5 truncate text-[11px] text-muted-foreground">{asset.fileName ?? asset.objectPath ?? asset.id}</p></div>
                    {adminEnabled ? <Button aria-label="Удалить фото" disabled={busy} onClick={() => void removeAsset(asset)} size="icon" variant="danger"><Trash2 className="size-4" /></Button> : null}
                  </div>
                </article>
              ))}
            </div>
          ) : <p className="mt-3 text-xs text-muted-foreground">У выбранного пресета пока нет фотографий.</p>}
        </div>
      ) : null}

      {busy ? <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><LoaderCircle className="size-3.5 animate-spin" />Выполняется...</p> : null}
      {message ? <p className="mt-3 text-xs text-emerald-500">{message}</p> : null}
      {error ? <p className="mt-3 text-xs text-danger">{error}</p> : null}
    </section>
  );
}

function createPresetSlug(kind: PresetKind): string {
  return `${kind}-${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`;
}

function scopeForKind(kind: PresetKind): MediaScope {
  if (kind === 'character') return 'characters';
  if (kind === 'outfit') return 'outfits';
  return 'scenes';
}

function roleOptions(kind: PresetKind): Array<{ id: string; label: string }> {
  if (kind === 'character') return [
    { id: 'cover', label: 'Обложка' },
    { id: 'portrait', label: 'Портрет' },
    { id: 'face_closeup', label: 'Лицо крупно' },
    { id: 'full_front', label: 'Полный рост спереди' },
    { id: 'full_back', label: 'Полный рост сзади' },
    { id: 'profile_left', label: 'Профиль слева' },
    { id: 'profile_right', label: 'Профиль справа' },
    { id: 'reference', label: 'Дополнительный референс' },
  ];
  if (kind === 'outfit') return [
    { id: 'cover', label: 'Обложка образа' },
    { id: 'front', label: 'Вид спереди' },
    { id: 'back', label: 'Вид сзади' },
    { id: 'side', label: 'Вид сбоку' },
    { id: 'detail', label: 'Деталь' },
    { id: 'texture', label: 'Текстура / материал' },
    { id: 'on_model', label: 'Образ на модели' },
    { id: 'reference', label: 'Референс' },
  ];
  return [
    { id: 'cover', label: 'Обложка сцены' },
    { id: 'preview', label: 'Превью сцены' },
    { id: 'reference', label: 'Референс сцены' },
    { id: 'background_reference', label: 'Референс фона' },
    { id: 'style_reference', label: 'Референс стиля' },
  ];
}

function isEditorState<TState>(value: unknown): value is TState {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function errorMessage(reason: unknown): string {
  if (reason instanceof Error) return reason.message;
  if (reason && typeof reason === 'object' && 'message' in reason && typeof reason.message === 'string') return reason.message;
  return 'Неизвестная ошибка.';
}
