import {
  BookOpenText,
  Camera,
  CheckCircle2,
  Images,
  PersonStanding,
  RotateCcw,
  Shirt,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router';
import {
  EYE_COLORS,
  GENDERS,
  HAIR_COLORS,
  IMAGE_STYLES,
  SKIN_TONES,
  getLabelById,
} from '../domain';
import { characterMakerService } from '../core/character-maker.service';
import { cn } from '../components/ui';
import { ThemeToggle } from '../theme/theme-toggle';
import { useEditorStore } from '../store/editor-store';

const navigation = [
  { to: '/character', label: 'Персона', icon: PersonStanding },
  { to: '/wardrobe', label: 'Образ', icon: Shirt },
  { to: '/scene', label: 'Сцена', icon: Camera },
  { to: '/results', label: 'Результаты', icon: Images },
] as const;

type ActiveCharacterPresetView = {
  id: string | null;
  name: string;
  photoUrl: string | null;
  photoCount: number;
};

const EMPTY_CHARACTER_PRESET: ActiveCharacterPresetView = {
  id: null,
  name: 'Новая персона',
  photoUrl: null,
  photoCount: 0,
};

export function AppShell() {
  const activePreset = useActiveCharacterPreset();

  return (
    <div className="min-h-dvh">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r border-border bg-background/88 p-4 backdrop-blur-xl lg:block">
        <Brand />
        <nav className="mt-8 space-y-1">
          {navigation.map((item) => <DesktopNavItem key={item.to} {...item} />)}
        </nav>

        <div className="mt-8 border-t border-border pt-4">
          <NavLink className={({ isActive }) => cn('focus-ring flex min-h-11 items-center gap-3 rounded-xl px-3 text-xs font-medium transition', isActive ? 'bg-primary-soft text-primary-strong' : 'text-muted-foreground hover:bg-surface hover:text-foreground')} to="/catalogs">
            <BookOpenText className="size-4" />Каталоги / Dev
          </NavLink>
        </div>

        <div className="absolute bottom-5 left-4 right-4 space-y-3 rounded-2xl border border-border bg-surface/80 p-3">
          <ThemeToggle />
          <div>
            <p className="text-xs font-medium text-foreground">CharacterMaker V2</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">Черновик редактора автоматически хранится локально. Пресеты сохраняются отдельно в Supabase.</p>
          </div>
        </div>
      </aside>

      <header className="safe-top sticky top-0 z-20 border-b border-border bg-background/88 px-3 py-2 backdrop-blur-xl sm:px-4 lg:ml-60">
        <div className="mx-auto flex max-w-[1680px] items-center justify-between gap-3">
          <div className="lg:hidden"><Brand compact /></div>
          <div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
            <CheckCircle2 className="size-4 text-emerald-500" />
            Локальный черновик сохраняется автоматически
          </div>
          <div className="lg:hidden"><ThemeToggle compact /></div>
        </div>
      </header>

      <div className="lg:ml-60">
        <div className="mx-auto grid max-w-[1680px] grid-cols-1 gap-3 px-3 pb-24 pt-3 sm:px-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-6 lg:px-6 lg:pb-8 lg:pt-6">
          <main className="min-w-0">
            <div className="mb-3 lg:hidden"><MobileProfilePreview preset={activePreset} /></div>
            <Outlet />
          </main>
          <aside className="hidden lg:block"><ProfilePreview preset={activePreset} /></aside>
        </div>
      </div>

      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/94 px-2 pt-1 backdrop-blur-xl lg:hidden">
        <div className="mx-auto grid max-w-xl grid-cols-4 gap-1">
          {navigation.map((item) => <MobileNavItem key={item.to} {...item} />)}
        </div>
      </nav>
    </div>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-600 to-sky-500 text-sm font-black text-white shadow-lg shadow-violet-950/15 sm:size-10 sm:rounded-2xl">C</div>
      {!compact ? (
        <div><div className="font-semibold tracking-tight text-foreground">CharacterMaker</div><div className="text-xs text-muted-foreground">Creative editor v2</div></div>
      ) : <div className="max-w-40 truncate text-sm font-semibold tracking-tight text-foreground">CharacterMaker</div>}
    </div>
  );
}

function DesktopNavItem({ to, label, icon: Icon }: typeof navigation[number]) {
  return (
    <NavLink className={({ isActive }) => cn('focus-ring flex min-h-12 items-center gap-3 rounded-2xl px-3 text-sm font-medium transition', isActive ? 'bg-primary-soft text-primary-strong' : 'text-muted-foreground hover:bg-surface hover:text-foreground')} to={to}>
      <Icon className="size-5" />{label}
    </NavLink>
  );
}

function MobileNavItem({ to, label, icon: Icon }: typeof navigation[number]) {
  return (
    <NavLink className={({ isActive }) => cn('focus-ring flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[9px] font-medium transition', isActive ? 'bg-primary-soft text-primary-strong' : 'text-muted-foreground')} to={to}>
      <Icon className="size-[18px]" />{label}
    </NavLink>
  );
}

function useProfileSummary() {
  const character = useEditorStore((state) => state.character);
  return {
    character,
    gender: getLabelById(GENDERS, character.identity.genderId),
    skin: getLabelById(SKIN_TONES, character.appearance.skinToneId),
    eyes: getLabelById(EYE_COLORS, character.appearance.eyeColorId),
    hair: getLabelById(HAIR_COLORS, character.appearance.hair.colorId),
    style: getLabelById(IMAGE_STYLES, character.appearance.imageStyleId),
  };
}

function useActiveCharacterPreset(): ActiveCharacterPresetView {
  const activeCharacterId = useEditorStore((state) => state.activeCharacterId);
  const [revision, setRevision] = useState(0);
  const [view, setView] = useState<ActiveCharacterPresetView>(EMPTY_CHARACTER_PRESET);

  useEffect(() => {
    const onLibraryChanged = () => setRevision((value) => value + 1);
    window.addEventListener('charactermaker:library-changed', onLibraryChanged);
    return () => window.removeEventListener('charactermaker:library-changed', onLibraryChanged);
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!activeCharacterId) {
      setView(EMPTY_CHARACTER_PRESET);
      return undefined;
    }

    void Promise.all([
      characterMakerService.characters.list(),
      characterMakerService.presets.assets('character', activeCharacterId),
    ]).then(([presets, assets]) => {
      if (cancelled) return;
      const preset = presets.find((item) => item.id === activeCharacterId);
      const photo = assets.find((asset) => asset.isPrimary && asset.publicUrl)
        ?? assets.find((asset) => ['cover', 'portrait', 'face_closeup'].includes(asset.role) && asset.publicUrl)
        ?? assets.find((asset) => Boolean(asset.publicUrl));
      setView({
        id: activeCharacterId,
        name: preset?.name ?? 'Загруженная персона',
        photoUrl: photo?.publicUrl ?? null,
        photoCount: assets.filter((asset) => Boolean(asset.publicUrl)).length,
      });
    }).catch(() => {
      if (!cancelled) setView({ id: activeCharacterId, name: 'Загруженная персона', photoUrl: null, photoCount: 0 });
    });

    return () => {
      cancelled = true;
    };
  }, [activeCharacterId, revision]);

  return view;
}

function MobileProfilePreview({ preset }: { preset: ActiveCharacterPresetView }) {
  const { character, gender, eyes, hair } = useProfileSummary();
  return (
    <section className="surface overflow-hidden rounded-2xl p-2.5">
      <div className="flex items-center gap-2.5">
        <PreviewImage className="size-16 shrink-0 rounded-xl" name={preset.name} photoUrl={preset.photoUrl} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="truncate text-sm font-semibold text-foreground">{preset.name}</div>
            {preset.id ? <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-medium text-emerald-600 dark:text-emerald-400">Загружен</span> : null}
          </div>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{gender}, {character.identity.age} лет · {character.body.height} см · {character.body.weight} кг</p>
          <p className="mt-0.5 truncate text-[11px] text-subtle-foreground">{eyes} глаза · {hair} волосы{preset.photoCount ? ` · ${preset.photoCount} фото` : ''}</p>
        </div>
      </div>
    </section>
  );
}

function ProfilePreview({ preset }: { preset: ActiveCharacterPresetView }) {
  const { character, gender, skin, eyes, hair, style } = useProfileSummary();
  const resetCharacter = useEditorStore((state) => state.resetCharacter);

  return (
    <div className="sticky top-20 space-y-4">
      <section className="surface overflow-hidden rounded-[2rem]">
        <PreviewImage className="h-[360px] w-full" name={preset.name} photoUrl={preset.photoUrl} />
        <div className="space-y-3 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2"><h2 className="truncate font-semibold text-foreground">{preset.name}</h2>{preset.id ? <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-medium text-emerald-600 dark:text-emerald-400">Загружен</span> : null}</div>
              <p className="mt-0.5 text-xs text-muted-foreground">{gender}, {character.identity.age} лет{preset.photoCount ? ` · ${preset.photoCount} фото` : ''}</p>
            </div>
            <button aria-label="Сбросить персону" className="focus-ring grid size-9 shrink-0 place-items-center rounded-full bg-surface text-muted-foreground transition hover:bg-surface-strong hover:text-foreground" onClick={resetCharacter} type="button"><RotateCcw className="size-4" /></button>
          </div>
          <dl className="grid grid-cols-2 gap-2 text-xs">
            <PreviewStat label="Рост" value={`${character.body.height} см`} />
            <PreviewStat label="Вес" value={`${character.body.weight} кг`} />
            <PreviewStat label="Кожа" value={skin} />
            <PreviewStat label="Глаза" value={eyes} />
            <PreviewStat label="Волосы" value={hair} />
            <PreviewStat label="Стиль" value={style} />
          </dl>
        </div>
      </section>
    </div>
  );
}

function PreviewImage({ photoUrl, name, className }: { photoUrl: string | null; name: string; className: string }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const canShowPhoto = Boolean(photoUrl && failedUrl !== photoUrl);

  return (
    <div className={cn('relative overflow-hidden bg-gradient-to-b from-primary-soft via-sky-500/8 to-surface-strong', className)}>
      {canShowPhoto ? <img alt={`Основное фото: ${name}`} className="size-full object-cover object-top" onError={() => setFailedUrl(photoUrl)} src={photoUrl ?? undefined} /> : (
        <>
          <div className="absolute left-1/2 top-[13%] size-[24%] -translate-x-1/2 rounded-full border border-border bg-foreground/12" />
          <div className="absolute inset-x-[22%] bottom-0 h-[66%] rounded-t-[45%] bg-gradient-to-b from-foreground/12 to-foreground/4" />
          <div className="absolute inset-x-0 bottom-4 text-center"><span className="rounded-full border border-border bg-background/75 px-2.5 py-1 text-[10px] text-muted-foreground backdrop-blur">Фото пресета</span></div>
        </>
      )}
    </div>
  );
}

function PreviewStat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-surface p-2"><dt className="text-subtle-foreground">{label}</dt><dd className="mt-1 truncate font-medium text-foreground">{value}</dd></div>;
}
