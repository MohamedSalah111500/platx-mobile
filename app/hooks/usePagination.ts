import { useState, useCallback } from 'react';
import type { PaginatedResponse } from '../types/api.types';

interface PaginationOptions {
  initialPage?: number;
  pageSize?: number;
}

export function usePagination<T>(
  fetchFn: (page: number, size: number, search?: string) => Promise<PaginatedResponse<T>>,
  options: PaginationOptions = {}
) {
  const { initialPage = 1, pageSize = 10 } = options;

  const [items, setItems] = useState<T[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(initialPage);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetch = useCallback(
    async (pageNum = 1, search?: string) => {
      if (pageNum === 1) {
        setIsLoading(true);
      }
      try {
        const response = await fetchFn(pageNum, pageSize, search);
        if (pageNum === 1) {
          setItems(response.items);
        } else {
          setItems((prev) => [...prev, ...response.items]);
        }
        setTotalCount(response.totalCount);
        setPage(pageNum);
        setHasMore(response.items.length === pageSize);
      } catch (error) {
        // error handled by interceptor
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [fetchFn, pageSize]
  );

  const loadMore = useCallback(() => {
    if (!hasMore || isLoading) return;
    fetch(page + 1, searchQuery);
  }, [fetch, hasMore, isLoading, page, searchQuery]);

  const refresh = useCallback(() => {
    setIsRefreshing(true);
    fetch(1, searchQuery);
  }, [fetch, searchQuery]);

  const search = useCallback(
    (query: string) => {
      setSearchQuery(query);
      fetch(1, query);
    },
    [fetch]
  );

  return {
    items,
    totalCount,
    page,
    isLoading,
    isRefreshing,
    hasMore,
    searchQuery,
    fetch,
    loadMore,
    refresh,
    search,
  };
}
