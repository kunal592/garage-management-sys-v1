import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query';
import { type PropsWithChildren } from 'react';
import { Alert } from 'react-native';

/**
 * Singleton QueryClient — defined outside the component so it is never
 * recreated on re-renders or hot reloads.
 *
 * Tuned for an offline-first SQLite app (per APP_CONTXT.md):
 *  - staleTime: Infinity  → data is always considered fresh; no background refetch
 *  - gcTime: 10 min       → cache entries survive navigation between screens
 *  - refetchOnFocus: false → app returning to foreground never triggers a fetch
 *  - refetchOnReconnect: false → no network dependency at all
 *  - retry: 1             → one retry on unexpected repository errors
 */
const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      console.error('[Global Query Error]:', error);
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      console.error('[Global Mutation Error]:', error);
      Alert.alert(
        'Action Failed', 
        error instanceof Error ? error.message : 'An unknown error occurred while trying to save data.'
      );
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: Infinity,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
    },
    mutations: {
      retry: 0,
    },
  },
});

export { queryClient };

export function QueryProvider({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
