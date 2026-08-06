import {
  BookOpenText,
  Camera,
  CheckCircle2,
  PersonStanding,
  RotateCcw,
  Save,
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
import { useEditorStore } from '../store/editor-store';

const navigation = [
  { to: '/character', label: 'Персонаж', icon: PersonStanding },
  { to: '/wardrobe', label: 'Одежда', icon: Shirt },
  { to: '/scene', label: 'Сцена', icon: Camera },
  { to: '/catalogs', label: 'Все списки', icon: BookOpenText },
] as const;

export function AppShell() {
  const savedAt = useEditorStore((state) => state.savedAt);
  const saveDraft = useEditorStore((state) => state.saveDraft);

  return (
    <div className="min-h-dvh">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r border-zinc-800/80 bg-zinc-950/88 p-4 backdrop-blur-xl lg:block">
        <Brand />
        <nav className="mt-8 space-y-1">
          {navigation.map((item) => <DesktopNavItem key={item.to} {...item} />)}
        </nav>
        <div className="absolute bottom-5 left-4 right-4 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3">
          <p className="text-xs font-medium text-zinc-300">Refactor V2</p>
          <p className="mt-1 text-xs leading-5 text-zinc-600">Параметры работают только через стабильные catalog id.</p>
        </div>
      </aside>

      <header className="sticky top-0 z-20 border-b border-zinc-800/70 bg-zinc-950/80 px-4 py-3 backdrop-blur-xl lg:ml-60">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-3">
          <div className="lg:hidden"><Brand compact /></div>
          <div className="hidden items-center gap-2 text-xs text-zinc-500 sm:flex">
            <CheckCircle2 className="size-4 text-emerald-400" />
            {savedAt ? `Сохранено ${new Date(savedAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}` : 'Изменения сохраняются локально'}
          </div>
          <button className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-full bg-violet-500 px-4 text-sm font-semibold text-white shadow-lg shadow-violet-950/30 transition hover:bg-violet-400" onClick={saveDraft} type="button">
            <Save className="size-4" />
            <span className="hidden sm:inline">Сохранить</span>
          </button>
        </div>
      </header>

      <div className="lg:ml-60">
        <div className="mx-auto grid max-w-[1500px] grid-cols-1 gap-5 px-3 pb-28 pt-4 sm:px-5 lg:grid-cols-[minmax(0,1fr)_310px] lg:px-6 lg:pb-8 lg:pt-6 xl:gap-7">
          <main className="min-w-0"><Outlet /></main>
          <aside className="hidden lg:block"><ProfilePreview /></aside>
        </div>
      </div>

      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-zinc-800 bg-zinc-950/92 px-2 pt-2 backdrop-blur-xl lg:hidden">
        <div className="mx-auto grid max-w-xl grid-cols-4 gap-1">
          {navigation.map((item) => <MobileNavItem key={item.to} {...item} />)}
        </div>
      </nav>
    </div>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid size-10 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-sky-500 font-black text-white shadow-lg shadow-violet-950/40">C</div>
      {!compact ? <div><div className="font-semibold tracking-tight text-zinc-100">CharacterMaker</div><div className="text-xs text-zinc-600">Mobile editor v2</div></div> : <div className="font-semibold tracking-tight text-zinc-100">CharacterMaker</div>}
    </div>
  );
}

function DesktopNavItem({ to, label, icon: Icon }: typeof navigation[number]) {
  return (
    <NavLink className={({ isActive }) => cn('focus-ring flex min-h-12 items-center gap-3 rounded-2xl px-3 text-sm font-medium transition', isActive ? 'bg-violet-500/16 text-violet-100' : 'text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200')} to={to}>
      <Icon className="size-5" />{label}
    </NavLink>
  );
}

function MobileNavItem({ to, label, icon: Icon }: typeof navigation[number]) {
  return (
    <NavLink className={({ isActive }) => cn('focus-ring flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[10px] font-medium transition', isActive ? 'bg-violet-500/16 text-violet-200' : 'text-zinc-500')} to={to}>
      <Icon className="size-5" />{label}
    </NavLink>
  );
}

function ProfilePreview() {
  const character = useEditorStore((state) => state.character);
  const resetCharacter = useEditorStore((state) => state.resetCharacter);
  const gender = getLabelById(GENDERS, character.identity.genderId);
  const skin = getLabelById(SKIN_TONES, character.appearance.skinToneId);
  const eyes = getLabelById(EYE_COLORS, character.appearance.eyeColorId);
  const hair = getLabelById(HAIR_COLORS, character.appearance.hair.colorId);
  const style = getLabelById(IMAGE_STYLES, character.appearance.imageStyleId);

  return (
    <div className="sticky top-24 space-y-4">
      <section className="surface overflow-hidden rounded-[2rem]">
        <div className="relative h-72 overflow-hidden bg-gradient-to-b from-violet-500/25 via-sky-500/10 to-zinc-950">
          <div className="absolute inset-x-0 bottom-0 mx-auto h-56 w-40 rounded-t-[5rem] bg-gradient-to-b from-zinc-300/20 to-zinc-500/5 blur-[0.2px]" />
          <div className="absolute left-1/2 top-10 size-24 -translate-x-1/2 rounded-full border border-white/10 bg-gradient-to-b from-zinc-100/25 to-zinc-500/10" />
          <div className="absolute inset-x-0 bottom-5 text-center">
            <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs text-zinc-300 backdrop-blur">Предпросмотр параметров</span>
          </div>
        </div>
        <div className="space-y-3 p-4">
          <div className="flex items-start justify-between gap-3">
            <div><h2 className="font-semibold text-zinc-100">Новый персонаж</h2><p className="mt-0.5 text-xs text-zinc-500">{gender}, {character.identity.age} лет</p></div>
            <button aria-label="Сбросить персонажа" className="focus-ring grid size-9 place-items-center rounded-full bg-zinc-900 text-zinc-500 hover:text-white" onClick={resetCharacter} type="button"><RotateCcw className="size-4" /></button>
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
  return <div className="rounded-xl bg-zinc-950/70 p-2"><dt className="text-zinc-600">{label}</dt><dd className="mt-1 truncate font-medium text-zinc-300">{value}</dd></div>;
}
