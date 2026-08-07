import {
  BookOpenText,
  Camera,
  CheckCircle2,
  Images,
  PersonStanding,
  RotateCcw,
  Shirt,
} from 'lucide-react';
import { NavLink, Outlet } from 'react-router';
import {
  EYE_COLORS,
  GENDERS,
  HAIR_COLORS,
  IMAGE_STYLES,
  SKIN_TONES,
  getLabelById,
} from '../domain';
import { cn } from '../components/ui';
import { ThemeToggle } from '../theme/theme-toggle';
import { useEditorStore } from '../store/editor-store';

const navigation = [
  { to: '/character', label: 'Персона', icon: PersonStanding },
  { to: '/wardrobe', label: 'Гардероб', icon: Shirt },
  { to: '/scene', label: 'Сцена', icon: Camera },
  { to: '/results', label: 'Результаты', icon: Images },
] as const;

export function AppShell() {
  return (
    <div className="min-h-dvh">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-border bg-background/88 p-4 backdrop-blur-xl lg:block">
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

      <header className="safe-top sticky top-0 z-20 border-b border-border bg-background/88 px-3 py-2 backdrop-blur-xl sm:px-4 lg:ml-64">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-3">
          <div className="lg:hidden"><Brand compact /></div>
          <div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
            <CheckCircle2 className="size-4 text-emerald-500" />
            Локальный черновик сохраняется автоматически
          </div>
          <div className="lg:hidden"><ThemeToggle compact /></div>
        </div>
      </header>

      <div className="lg:ml-64">
        <div className="mx-auto grid max-w-[1500px] grid-cols-1 gap-3 px-3 pb-24 pt-3 sm:px-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-6 lg:px-6 lg:pb-8 lg:pt-6 xl:gap-7">
          <main className="min-w-0">
            <div className="mb-3 lg:hidden"><MobileProfilePreview /></div>
            <Outlet />
          </main>
          <aside className="hidden lg:block"><ProfilePreview /></aside>
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

function MobileProfilePreview() {
  const { character, gender, eyes, hair } = useProfileSummary();
  return (
    <section className="surface overflow-hidden rounded-2xl p-2.5">
      <div className="flex items-center gap-2.5">
        <div className="relative grid size-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-b from-primary-soft to-surface-strong">
          <div className="absolute top-2 size-5 rounded-full bg-foreground/15" />
          <div className="absolute bottom-0 h-8 w-9 rounded-t-full bg-foreground/10" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="truncate text-sm font-semibold text-foreground">Новая персона</div>
            <span className="shrink-0 rounded-full bg-primary-soft px-2 py-0.5 text-[9px] font-medium text-primary-strong">Preview</span>
          </div>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{gender}, {character.identity.age} лет · {character.body.height} см · {character.body.weight} кг</p>
          <p className="mt-0.5 truncate text-[11px] text-subtle-foreground">{eyes} глаза · {hair} волосы</p>
        </div>
      </div>
    </section>
  );
}

function ProfilePreview() {
  const { character, gender, skin, eyes, hair, style } = useProfileSummary();
  const resetCharacter = useEditorStore((state) => state.resetCharacter);

  return (
    <div className="sticky top-24 space-y-4">
      <section className="surface overflow-hidden rounded-[2rem]">
        <div className="relative h-72 overflow-hidden bg-gradient-to-b from-primary-soft via-sky-500/8 to-surface">
          <div className="absolute inset-x-0 bottom-0 mx-auto h-56 w-40 rounded-t-[5rem] bg-gradient-to-b from-foreground/14 to-foreground/4" />
          <div className="absolute left-1/2 top-10 size-24 -translate-x-1/2 rounded-full border border-border bg-gradient-to-b from-foreground/16 to-foreground/5" />
          <div className="absolute inset-x-0 bottom-5 text-center">
            <span className="rounded-full border border-border bg-background/70 px-3 py-1 text-xs text-muted-foreground backdrop-blur">Предпросмотр параметров</span>
          </div>
        </div>
        <div className="space-y-3 p-4">
          <div className="flex items-start justify-between gap-3">
            <div><h2 className="font-semibold text-foreground">Новая персона</h2><p className="mt-0.5 text-xs text-muted-foreground">{gender}, {character.identity.age} лет</p></div>
            <button aria-label="Сбросить персону" className="focus-ring grid size-9 place-items-center rounded-full bg-surface text-muted-foreground transition hover:bg-surface-strong hover:text-foreground" onClick={resetCharacter} type="button"><RotateCcw className="size-4" /></button>
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

function PreviewStat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-surface p-2"><dt className="text-subtle-foreground">{label}</dt><dd className="mt-1 truncate font-medium text-foreground">{value}</dd></div>;
}
