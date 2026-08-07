import { ImageIcon, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Button, EmptyState, PageIntro } from '../components/ui';

export function ResultsPage() {
  const navigate = useNavigate();

  return (
    <div>
      <PageIntro
        description="Здесь хранятся изображения генераций, варианты и апскейлы с привязкой к Персоне, Образу, Сцене и использованным референсам."
        eyebrow="Библиотека"
        title="Результаты"
      />
      <EmptyState
        action={<Button onClick={() => navigate('/scene')}><Sparkles className="size-4" />Настроить сцену</Button>}
        description="Настройте Персону, Образ и Сцену. После подключения генерационного слоя изображения будут сохраняться здесь вместе с источниками и параметрами генерации."
        icon={<ImageIcon className="size-6" />}
        title="Пока нет результатов"
      />
    </div>
  );
}
