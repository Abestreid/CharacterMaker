import {
  Check,
  Database,
  ImagePlus,
  LoaderCircle,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { characterMakerService } from '../../core/character-maker.service';
import type { PresetAsset } from '../../infrastructure/supabase/preset-assets.repository';
import type { PresetKind, ReferenceStatus } from '../../infrastructure/supabase/preset.repository';
import type { PresetIdentity } from '../../infrastructure/supabase/preset-mappers';
import type { StoredPresetState } from '../../infrastructure/supabase/preset-state.repository';
import { Button, cn } from '../ui';

type PresetListItem = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  version: number;
};

type OverlayMode = 'picker' | 'manager' | null;

type PresetManagerProps<TState> = {
  kind: PresetKind;
  label: string;
  state: TState;
  activeId: string | null;
  loadPresets: () => Promise<PresetListItem[]>;
  loadState: (id: string) => Promise<StoredPresetState<TState>>;
  saveState: (identity: PresetIdentity, state: TState) => Promise<string>;
  onLoad: (state: TState, id: string) => void;
  onActiveChange: (id: string | null) => void;
};

const referenceStatusOptions: Array<{ id: ReferenceStatus; label: string }> = [
  { id: 'normal', label: 'Обычный' },
  { id: 'approved', label: 'Одобренный' },
  { id: 'canonical', label: 'Канонический' },
  { id: 'reference_only', label: 'Только референс' },
  { id: 'rejected', label: 'Отклоненный' },
];

export function PresetManager<TState>({
  kind,
  label,
  state,
  activeId,
  loadPresets,
  loadState,
  saveState,
  onLoad,
  onActiveChange,
}: PresetManagerProps<TState>) {
  const [presets, setPresets] = useState<PresetListItem[]>([]);
  const [selectedId, setSelectedId] = useState(activeId ?? '');
  const [name, setName] = useState('');
  const [overlay, setOverlay] = useState<OverlayMode>(null);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [assets, setAssets] = useState<PresetAsset[]>([]);
  const [assetRole, setAssetRole] = useState(() => roleOptions(kind)[0]?.id ?? 'reference');
  const [assetPrimary, setAssetPrimary] = useState(true);
  const [assetReferenceStatus, setAssetReferenceStatus] = useState<ReferenceStatus>('normal');

  const selected = useMemo(() => presets.find((preset) => preset.id === selectedId) ?? null, [presets, selectedId]);
  const active = useMemo(() => presets.find((preset) => preset.id === activeId) ?? null, [presets, activeId]);
  const filteredPresets = useMemo(() => {
    const value = query.trim().toLocaleLowerCase('ru');
    if (!value) return presets;
    return presets.filter((preset) => `${preset.name} ${preset.description ?? ''}`.toLocaleLowerCase('ru').includes(value));
  }, [presets, query]);

  const refresh = useCallback(async (): Promise<PresetListItem[]> => {
    const rows = await loadPresets();
    setPresets(rows);
    return rows;
  }, [loadPresets]);

  const refreshAssets = useCallback(async () => {
    if (!selectedId) {
      setAssets([]);
      return;
    }
    setAssets(await characterMakerService.presets.assets(kind, selectedId));
  }, [kind, selectedId]);

  useEffect(() => {
    refresh().catch((reason: unknown) => setError(errorMessage(reason)));
  }, [refresh]);

  useEffect(() => {
    refreshAssets().catch((reason: unknown) => setError(errorMessage(reason)));
  }, [refreshAssets]);

  useEffect(() => {
    if (!activeId) return;
    setSelectedId(activeId);
  }, [activeId]);

  useEffect(() => {
    if (selected) setName(selected.name);
  }, [selected]);

  useEffect(() => {
    if (!overlay) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) setOverlay(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [overlay, busy]);

  const run = async (action: () => Promise<void>): Promise<boolean> => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await action();
      return true;
    } catch (reason: unknown) {
      setError(errorMessage(reason));
      setOverlay((current) => current ?? 'manager');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const ensurePresetVisible = async (id: string): Promise<PresetListItem> => {
    for (const delay of [0, 250, 750]) {
      if (delay) await sleep(delay);
      const rows = await refresh();
      const saved = rows.find((preset) => preset.id === id);
      if (saved) return saved;
    }
    throw new Error('Supabase вернул ID, но пресет не появился в публичной библиотеке. Сохранение не считается завершенным.');
  };

  const openPicker = () => {
    setQuery('');
    setError(null);
    setMessage(null);
    setOverlay('picker');
  };

  const openManager = () => {
    if (activeId) setSelectedId(activeId);
    setError(null);
    setMessage(null);
    setOverlay('manager');
  };

  const prepareNew = () => {
    setSelectedId('');
    setName('');
    setError(null);
    setMessage('Введите название и сохраните текущие параметры как новый пресет.');
    setOverlay('manager');
  };

  const loadPreset = async (preset: PresetListItem) => {
    setSelectedId(preset.id);
    setName(preset.name);
    const success = await run(async () => {
      const stored = await loadState(preset.id);
      onLoad(stored.state, preset.id);
      setMessage(`Пресет «${preset.name}» загружен (${stored.schemaVersion}).`);
      notifyLibraryChanged();
    });
    if (success) setOverlay(null);
  };

  const saveNew = async () => {
    const success = await run(async () => {
      const cleanName = name.trim();
      if (!cleanName) throw new Error('Введите название пресета.');
      const id = await saveState({ name: cleanName, slug: createPresetSlug(kind) }, state);
      const saved = await ensurePresetVisible(id);
      setSelectedId(saved.id);
      setName(saved.name);
      onLoad(state, saved.id);
      setMessage(`Пресет «${saved.name}» сохранен в общей публичной библиотеке Supabase.`);
      notifyLibraryChanged();
    });
    if (success) setOverlay(null);
  };

  const updatePreset = async (preset: PresetListItem, nextName: string, closeAfter = false) => {
    const success = await run(async () => {
      const cleanName = nextName.trim();
      if (!cleanName) throw new Error('Название пресета не может быть пустым.');
      const id = await saveState({
        id: preset.id,
        name: cleanName,
        slug: preset.slug,
        description: preset.description,
        expectedVersion: preset.version,
      }, state);
      const saved = await ensurePresetVisible(id);
      setSelectedId(saved.id);
      setName(saved.name);
      onLoad(state, saved.id);
      setMessage(`Пресет «${saved.name}» обновлен. Версия: ${saved.version}.`);
      notifyLibraryChanged();
    });
    if (success && closeAfter) setOverlay(null);
  };

  const saveActive = async () => {
    if (!active) {
      prepareNew();
      return;
    }
    await updatePreset(active, active.name, true);
  };

  const removeSelected = async () => {
    if (!selected) {
      setError('Сначала выберите сохраненный пресет.');
      return;
    }
    if (!window.confirm(`Удалить пресет «${selected.name}» из общей публичной библиотеки?`)) return;
    await run(async () => {
      await characterMakerService.presets.archive(kind, selected.id);
      if (activeId === selected.id) onActiveChange(null);
      setSelectedId('');
      setName('');
      setAssets([]);
      await refresh();
      setMessage(`Пресет «${selected.name}» архивирован и скрыт из публичной библиотеки.`);
      notifyLibraryChanged();
    });
  };

  const uploadAsset = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !selected) return;

    void run(async () => {
      await characterMakerService.assets.upload({
        file,
        kind,
        ownerId: selected.id,
        role: assetRole,
        isPrimary: assetPrimary,
        referenceStatus: assetReferenceStatus,
      });
      await refreshAssets();
      setMessage(`Фото «${file.name}» сохранено на InfinityFree и привязано к пресету.`);
      notifyLibraryChanged();
    });
  };

  const removeAsset = (asset: PresetAsset) => run(async () => {
    if (!window.confirm(`Удалить фото «${asset.fileName ?? asset.role}»?`)) return;
    await characterMakerService.assets.remove(asset);
    await refreshAssets();
    setMessage('Фото удалено с InfinityFree и из связей Supabase.');
    notifyLibraryChanged();
  });

  const updateReferenceStatus = (asset: PresetAsset, referenceStatus: ReferenceStatus) => run(async () => {
    await characterMakerService.assets.setReferenceStatus(asset.id, referenceStatus);
    await refreshAssets();
    setMessage('Статус референса обновлен.');
    notifyLibraryChanged();
  });

  const roles = roleOptions(kind);
  const toolbarName = active?.name ?? 'Новый пресет';
  const toolbarMeta = active
    ? `${label} · v${active.version}`
    : presets.length
      ? `${presets.length} в общей библиотеке`
      : 'Общая библиотека пуста';

  return (
    <>
      <section className="surface mb-3 rounded-2xl p-2.5 sm:mb-4 sm:rounded-3xl sm:p-3">
        <div className="flex min-h-12 items-center gap-2">
          <button className="focus-ring flex min-w-0 flex-1 items-center gap-2.5 rounded-xl px-1.5 py-1 text-left" onClick={openPicker} type="button">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary"><Database className="size-4" /></span>
            <span className="min-w-0 flex-1">
              <span className="flex min-w-0 items-center gap-2">
                <span className="truncate text-sm font-semibold text-foreground">{toolbarName}</span>
                {active ? <span className="hidden shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 sm:inline dark:text-emerald-400">Загружен</span> : null}
              </span>
              <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">Пресеты · {toolbarMeta}</span>
            </span>
          </button>

          <Button aria-label="Выбрать пресет" className="shrink-0" disabled={busy} onClick={openPicker} size="sm" variant="secondary">
            <Search className="size-4" /><span className="hidden sm:inline">Выбрать</span>
          </Button>
          <Button aria-label="Управление пресетом" className="size-9 min-h-9 shrink-0 p-0" disabled={busy} onClick={openManager} size="sm" variant="secondary">
            <MoreHorizontal className="size-4" />
          </Button>
          <Button aria-label={active ? 'Сохранить изменения пресета' : 'Сохранить как новый пресет'} className="shrink-0" disabled={busy} onClick={() => void saveActive()} size="sm">
            {busy ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
            <span className="hidden md:inline">{active ? 'Сохранить' : 'Сохранить как пресет'}</span>
          </Button>
        </div>
      </section>

      {overlay ? (
        <div aria-modal="true" className="fixed inset-0 z-[70]" role="dialog">
          <button aria-label="Закрыть окно" className="absolute inset-0 bg-black/35 backdrop-blur-[2px]" disabled={busy} onClick={() => setOverlay(null)} type="button" />
          <section className="safe-bottom absolute inset-x-0 bottom-0 flex max-h-[92dvh] flex-col overflow-hidden rounded-t-[1.75rem] border border-border bg-background shadow-2xl sm:bottom-auto sm:left-1/2 sm:right-auto sm:top-1/2 sm:max-h-[86dvh] sm:w-[min(900px,calc(100vw-48px))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[1.75rem]">
            <div className="flex min-h-16 items-center gap-3 border-b border-border px-4 sm:px-5">
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-base font-semibold text-foreground">{overlay === 'picker' ? `Выбор пресета · ${label}` : `Управление пресетом · ${label}`}</h2>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{active ? `Сейчас загружен: ${active.name}` : 'Текущие параметры пока не привязаны к сохраненному пресету'}</p>
              </div>
              <Button aria-label="Закрыть" className="size-10 min-h-10 p-0" disabled={busy} onClick={() => setOverlay(null)} size="icon" variant="ghost"><X className="size-5" /></Button>
            </div>

            {overlay === 'picker' ? (
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="border-b border-border p-3 sm:p-4">
                  <label className="relative block">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <input autoFocus className="focus-ring min-h-11 w-full rounded-xl border border-border bg-surface pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground" onChange={(event) => setQuery(event.target.value)} placeholder="Поиск пресета..." value={query} />
                  </label>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
                  {filteredPresets.length ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {filteredPresets.map((preset) => {
                        const isActive = preset.id === activeId;
                        return (
                          <button className={cn('focus-ring flex min-h-16 items-center gap-3 rounded-2xl border p-3 text-left transition', isActive ? 'border-primary/40 bg-primary-soft' : 'border-border bg-surface hover:bg-surface-strong')} disabled={busy} key={preset.id} onClick={() => void loadPreset(preset)} type="button">
                            <span className={cn('grid size-10 shrink-0 place-items-center rounded-xl text-sm font-bold', isActive ? 'bg-primary text-primary-foreground' : 'bg-surface-strong text-muted-foreground')}>{preset.name.slice(0, 1).toLocaleUpperCase('ru')}</span>
                            <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-foreground">{preset.name}</span><span className="mt-0.5 block truncate text-xs text-muted-foreground">Версия {preset.version}{preset.description ? ` · ${preset.description}` : ''}</span></span>
                            {isActive ? <Check className="size-4 shrink-0 text-primary" /> : null}
                          </button>
                        );
                      })}
                    </div>
                  ) : <EmptyPresetState hasQuery={Boolean(query.trim())} />}
                </div>

                <div className="border-t border-border p-3 sm:p-4">
                  <Button className="w-full" disabled={busy} onClick={prepareNew}><Plus className="size-4" />Создать новый пресет из текущих параметров</Button>
                </div>
              </div>
            ) : (
              <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-5">
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-border bg-surface p-3 sm:p-4">
                      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                        <label className="space-y-1.5">
                          <span className="text-xs font-medium text-muted-foreground">Название пресета</span>
                          <input autoFocus className="focus-ring min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground" onChange={(event) => setName(event.target.value)} placeholder={`Например: ${label} 01`} value={name} />
                        </label>
                        {selected ? (
                          <Button disabled={busy} onClick={() => void updatePreset(selected, name)} variant="secondary"><Save className="size-4" />Обновить</Button>
                        ) : (
                          <Button disabled={busy} onClick={() => void saveNew()}><Save className="size-4" />Создать пресет</Button>
                        )}
                      </div>
                      <p className="mt-3 text-xs leading-5 text-muted-foreground">Все параметры редактора сохраняются в нормализованном виде в общей публичной библиотеке Supabase. Фото хранятся на InfinityFree и связаны с пресетом через Supabase.</p>
                    </div>

                    {selected ? (
                      <div className="rounded-2xl border border-border bg-surface p-3 sm:p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div><h3 className="text-sm font-semibold text-foreground">Фотографии пресета</h3><p className="mt-0.5 text-xs text-muted-foreground">{assets.length ? `${assets.length} файлов` : 'Фотографий пока нет'}</p></div>
                          <Button disabled={busy} onClick={() => void run(async () => { await refreshAssets(); })} size="sm" variant="ghost"><RefreshCw className="size-4" />Обновить</Button>
                        </div>

                        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                          <label className="space-y-1.5">
                            <span className="text-xs font-medium text-muted-foreground">Роль фото</span>
                            <select className="focus-ring min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground" onChange={(event) => setAssetRole(event.target.value)} value={assetRole}>
                              {roles.map((role) => <option key={role.id} value={role.id}>{role.label}</option>)}
                            </select>
                          </label>
                          <label className="space-y-1.5">
                            <span className="text-xs font-medium text-muted-foreground">Статус для AI</span>
                            <select className="focus-ring min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground" onChange={(event) => setAssetReferenceStatus(event.target.value as ReferenceStatus)} value={assetReferenceStatus}>
                              {referenceStatusOptions.map((status) => <option key={status.id} value={status.id}>{status.label}</option>)}
                            </select>
                          </label>
                          <label className="flex min-h-11 items-center gap-2 self-end rounded-xl border border-border bg-background px-3 text-xs text-muted-foreground"><input checked={assetPrimary} onChange={(event) => setAssetPrimary(event.target.checked)} type="checkbox" />Основное</label>
                        </div>

                        <label className="mt-3 block"><span className="focus-ring inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground sm:w-auto"><ImagePlus className="size-4" />Добавить фото</span><input accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={busy} onChange={uploadAsset} type="file" /></label>

                        {assets.length ? (
                          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
                            {assets.map((asset) => (
                              <article className="overflow-hidden rounded-2xl border border-border bg-background" key={asset.id}>
                                {asset.publicUrl ? <img alt={asset.fileName ?? asset.role} className="aspect-[4/5] w-full object-cover" loading="lazy" src={asset.publicUrl} /> : <div className="grid aspect-[4/5] place-items-center text-xs text-muted-foreground">Нет URL</div>}
                                <div className="space-y-2 p-2.5">
                                  <div className="flex items-start gap-2"><div className="min-w-0 flex-1"><p className="truncate text-xs font-medium text-foreground">{roles.find((role) => role.id === asset.role)?.label ?? asset.role}{asset.isPrimary ? ' · основное' : ''}</p><p className="mt-0.5 truncate text-[10px] text-muted-foreground">{asset.fileName ?? asset.objectPath ?? asset.id}</p></div><Button aria-label="Удалить фото" className="size-8 min-h-8 p-0" disabled={busy} onClick={() => void removeAsset(asset)} size="sm" variant="danger"><Trash2 className="size-3.5" /></Button></div>
                                  <select className="focus-ring min-h-9 w-full rounded-lg border border-border bg-surface px-2 text-[11px] text-foreground" disabled={busy} onChange={(event) => void updateReferenceStatus(asset, event.target.value as ReferenceStatus)} value={asset.referenceStatus}>{referenceStatusOptions.map((status) => <option key={status.id} value={status.id}>{status.label}</option>)}</select>
                                </div>
                              </article>
                            ))}
                          </div>
                        ) : <div className="mt-4 rounded-2xl border border-dashed border-border p-5 text-center text-xs text-muted-foreground">У выбранного пресета пока нет фотографий. Добавьте обложку, портрет, полный рост, профиль или дополнительный референс.</div>}
                      </div>
                    ) : null}
                  </div>

                  <aside className="space-y-3">
                    <div className="rounded-2xl border border-border bg-surface p-3">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Действия</h3>
                      <div className="mt-3 grid gap-2">
                        <Button className="w-full justify-start" disabled={busy} onClick={openPicker} variant="secondary"><Search className="size-4" />Выбрать другой пресет</Button>
                        <Button className="w-full justify-start" disabled={busy} onClick={prepareNew} variant="secondary"><Plus className="size-4" />Сохранить как новый</Button>
                        <Button className="w-full justify-start" disabled={busy} onClick={() => void run(async () => { await refresh(); await refreshAssets(); })} variant="secondary"><RefreshCw className="size-4" />Обновить библиотеку</Button>
                      </div>
                    </div>
                    {selected ? <Button className="w-full" disabled={busy} onClick={() => void removeSelected()} variant="danger"><Trash2 className="size-4" />Удалить пресет</Button> : null}
                  </aside>
                </div>

                {busy ? <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><LoaderCircle className="size-3.5 animate-spin" />Выполняется...</p> : null}
                {message ? <p className="mt-4 rounded-xl bg-emerald-500/8 px-3 py-2 text-xs leading-5 text-emerald-600 dark:text-emerald-400">{message}</p> : null}
                {error ? <p className="mt-4 rounded-xl bg-danger/8 px-3 py-2 text-xs leading-5 text-danger">{error}</p> : null}
              </div>
            )}
          </section>
        </div>
      ) : null}
    </>
  );
}

function EmptyPresetState({ hasQuery }: { hasQuery: boolean }) {
  return (
    <div className="rounded-2xl border border-dashed border-border p-8 text-center">
      <Database className="mx-auto size-6 text-muted-foreground" />
      <p className="mt-3 text-sm font-medium text-foreground">{hasQuery ? 'Ничего не найдено' : 'Сохраненных пресетов пока нет'}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hasQuery ? 'Измените поисковый запрос.' : 'Создайте первый пресет из текущих параметров редактора.'}</p>
    </div>
  );
}

function createPresetSlug(kind: PresetKind): string {
  return `${kind}-${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`;
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

function notifyLibraryChanged(): void {
  window.dispatchEvent(new Event('charactermaker:library-changed'));
}

function errorMessage(reason: unknown): string {
  if (reason instanceof Error) return reason.message;
  if (reason && typeof reason === 'object' && 'message' in reason && typeof reason.message === 'string') return reason.message;
  return 'Неизвестная ошибка.';
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
