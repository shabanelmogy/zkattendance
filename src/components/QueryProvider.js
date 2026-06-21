'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export default function QueryProvider({ children }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,       // Data is fresh for 60 seconds
        gcTime: 5 * 60 * 1000,      // Keep unused data in cache for 5 minutes
        refetchOnWindowFocus: false, // Don't refetch on tab switch
        retry: 1,                    // Retry failed requests once
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
