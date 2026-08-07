import { Database, KeyRound, LoaderCircle, RefreshCw, Save, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { clearAdminToken, getAdminToken, setAdminToken, validateAdminToken } from '../../infrastructure/admin/admin-session';
import { deletePreset, savePreset, type PresetKind, type PresetPayload } from '../../infrastructure/supabase/preset-admin.repository';
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

  const selected = useMemo(() => presets.find((preset) => preset.id === selectedId) ?? null, [presets, selectedId]);

  const refresh = useCallback(async () => {
    const rows = await loadPresets();
    setPresets(rows.map((row) => ({
      ...row,
      ...(isEditorState<TState>(row.metadata.editor_state) ? { editorState: row.metadata.editor_state } : {}),
    })));
  }, [loadPresets]);

  useEffect(() => {
    refresh().catch((reason: unknown) => setError(errorMessage(reason)));
  }, [refresh]);

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
    await refresh();
    setMessage(`Пресет «${selected.name}» удален из публичной библиотеки.`);
  });

  return (
    <section className="surface mb-4 rounded-3xl p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground"><Database className="size-4 text-primary" />Пресеты · {label}</div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">Загрузка доступна публично. Создание, обновление и удаление защищены служебным ключом.</p>
        </div>
        <Button disabled={busy} onClick={() => run(refresh)} size="sm" variant="ghost"><RefreshCw className="size-4" />Обновить</Button>
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

      {busy ? <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><LoaderCircle className="size-3.5 animate-spin" />Выполняется...</p> : null}
      {message ? <p className="mt-3 text-xs text-emerald-500">{message}</p> : null}
      {error ? <p className="mt-3 text-xs text-danger">{error}</p> : null}
    </section>
  );
}

function createPresetSlug(kind: PresetKind): string {
  return `${kind}-${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`;
}

function isEditorState<TState>(value: unknown): value is TState {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function errorMessage(reason: unknown): string {
  if (reason instanceof Error) return reason.message;
  if (reason && typeof reason === 'object' && 'message' in reason && typeof reason.message === 'string') return reason.message;
  return 'Неизвестная ошибка.';
}
