import { ImageIcon, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Button, EmptyState, PageIntro, SectionTabs } from '../components/ui';
import { useState } from 'react';

type ResultSection = 'all' | 'images' | 'video';

const sections = [
  { id: 'all', label: 'Все' },
  { id: 'images', label: 'Изображения' },
  { id: 'video', label: 'Видео' },
] as const;

export function ResultsPage() {
  const [section, setSection] = useState<ResultSection>('all');
  const navigate = useNavigate();

  return (
    <div>
      <PageIntro
        description="Здесь будут храниться результаты генераций, варианты, апскейлы и будущие видео с привязкой к персоне и сцене."
        eyebrow="Библиотека"
        title="Результаты"
      />
      <SectionTabs items={sections} onChange={setSection} value={section} />
      <EmptyState
        action={<Button onClick={() => navigate('/scene')}><Sparkles className="size-4" />Настроить сцену</Button>}
        description="Настройте персону, гардероб и сцену. После подключения генерационного слоя новые результаты будут автоматически появляться здесь."
        icon={<ImageIcon className="size-6" />}
        title={section === 'video' ? 'Видео пока нет' : 'Пока нет результатов'}
      />
    </div>
  );
}
