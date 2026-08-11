import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { Toaster } from 'sonner';
import { fetchServerAiSettings } from '../features/ai-generation/ai-settings.server';
import { saveAiSettings } from '../features/ai-generation/ai-settings';
import { ThemeProvider, useTheme } from '../theme/theme-provider';

function AppToaster() {
  const { resolvedTheme } = useTheme();
  return <Toaster closeButton position="top-center" richColors theme={resolvedTheme} />;
}

function AiSettingsBootstrap() {
  useEffect(() => {
    let cancelled = false;
    void fetchServerAiSettings()
      .then((settings) => {
        if (!cancelled) saveAiSettings(settings);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);
  return null;
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AiSettingsBootstrap />
        {children}
        <AppToaster />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
