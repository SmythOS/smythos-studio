import { QueryClient, useQuery, type QueryKey, type UseQueryOptions } from '@tanstack/react-query';

export const queryClient = new QueryClient();

const DEFAULT_QUERY_OPTIONS = {
  retry: 3,
  retryDelay: 1000,
  refetchOnMount: true,
  refetchOnReconnect: true, // network reconnect
  refetchOnWindowFocus: false, // window/tab focused again.
};

/**
 * This is a wrapper around the useQuery hook that
 * adds the suspense option to true by default.
 * Suspense is used to make the query suspend while the data is being fetched.
 * Can be used with React Suspense.
 * @link https://tanstack.com/query/latest/docs/framework/react/guides/suspense
 */
export function useCustomSuspenseQuery<TData, TError>(
  queryKey: QueryKey,
  queryFn: () => Promise<TData>,
  options?: UseQueryOptions<TData, TError>,
) {
  return useQuery<TData, TError>({
    queryKey,
    queryFn,
    ...DEFAULT_QUERY_OPTIONS,
    suspense: true,
    ...options,
  });
}

// listen for a window event and invalidate the query
window.addEventListener('queryClientInvalidate', (event: CustomEvent) => {
  queryClient.invalidateQueries({ queryKey: event.detail.queryKey });
});
