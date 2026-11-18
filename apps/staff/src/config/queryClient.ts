import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // Data remains fresh for 2 minutes
      gcTime: 1000 * 60 * 15, // Garbage collect unused cache after 15 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
