import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type PropsWithChildren } from 'react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Retry once on failure
      retry: 1,
      // Data is fresh for 30 seconds
      staleTime: 30_000,
      // Keep unused data in cache for 5 minutes
      gcTime: 5 * 60 * 1000,
    },
    mutations: {
      retry: 0,
    },
  },
});

export function QueryProvider({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
