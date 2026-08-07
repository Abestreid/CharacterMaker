import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { Toaster } from 'sonner';
import { ThemeProvider, useTheme } from '../theme/theme-provider';

function AppToaster() {
  const { resolvedTheme } = useTheme();
  return <Toaster closeButton position="top-center" richColors theme={resolvedTheme} />;
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
        {children}
        <AppToaster />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
