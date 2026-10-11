import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ParentStackParamList } from '../../types/navigation.types';
import type { GuardianPage } from '../../types/guardian.types';
import { useParentStore } from '../../store/parent.store';
import i18n from '../../i18n/i18n.config';

const PAGE_SIZE = 20;

export function useLinkRevoked(): (error: unknown) => boolean {
  const navigation = useNavigation<NativeStackNavigationProp<ParentStackParamList>>();
  const refreshChildren = useParentStore((state) => state.refreshChildren);
  return useCallback(
    (error: unknown) => {
      if ((error as { status?: number } | null)?.status !== 404) return false;
      Alert.alert(i18n.t('parent.linkRemovedTitle'), i18n.t('parent.linkRemoved'));
      refreshChildren().catch(() => {});
      if (navigation.canGoBack()) navigation.popToTop();
      return true;
    },
    [navigation, refreshChildren]
  );
}

export function usePagedList<T>(
  fetchPage: ((page: number, size: number) => Promise<GuardianPage<T>>) | null,
  keyOf: (item: T) => number,
  onError?: (error: unknown) => boolean
) {
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [failed, setFailed] = useState(false);
  const generation = useRef(0);
  const loadingMoreRef = useRef(false);
  const onErrorRef = useRef(onError);
  const keyOfRef = useRef(keyOf);
  onErrorRef.current = onError;
  keyOfRef.current = keyOf;

  const load = useCallback(async () => {
    const current = ++generation.current;
    if (!fetchPage) {
      setItems([]);
      setTotal(0);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const first = await fetchPage(1, PAGE_SIZE);
      if (current !== generation.current) return;
      setItems(first.items);
      setTotal(first.totalCount);
      setPage(1);
      setFailed(false);
    } catch (error) {
      if (current !== generation.current) return;
      if (!onErrorRef.current?.(error)) setFailed(true);
    } finally {
      if (current === generation.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [fetchPage]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const refresh = () => {
    setRefreshing(true);
    load();
  };

  const retry = () => {
    setLoading(true);
    load();
  };

  const loadMore = async () => {
    if (!fetchPage || loadingMoreRef.current || failed || items.length >= total) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    const current = generation.current;
    try {
      const next = await fetchPage(page + 1, PAGE_SIZE);
      if (current !== generation.current) return;
      setItems((existing) => {
        const seen = new Set(existing.map((item) => keyOfRef.current(item)));
        return [...existing, ...next.items.filter((item) => !seen.has(keyOfRef.current(item)))];
      });
      setTotal(next.totalCount);
      setPage(page + 1);
    } catch {
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  };

  return { items, setItems, total, loading, refreshing, loadingMore, failed, refresh, retry, loadMore };
}
