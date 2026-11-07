import React, { useCallback, useMemo, useRef, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeProvider';
import { useRTL } from '../../i18n/RTLProvider';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { SearchBar } from '../../components/ui/SearchBar';
import { RowCard } from '../../components/ui/RowCard';
import { Avatar } from '../../components/ui/Avatar';
import { Spinner } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorRetry } from '../../components/ui/ErrorRetry';
import { spacing } from '../../theme/spacing';
import { fontSize } from '../../theme/typography';
import { studentsApi } from '../../services/api/students.api';
import { getFullImageUrl } from '../../utils/imageUrl';
import { normalizeSearch } from '../../utils/phoneNumber';
import { fullName } from '../../utils/personName';
import type { ManagedStudent } from '../../types/people.types';
import type { ProfileStackParamList } from '../../types/navigation.types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'Students'>;

const PAGE_SIZE = 30;

function matches(student: ManagedStudent, term: string) {
  return [fullName(student), student.code, student.email, student.phoneNumber]
    .filter(Boolean)
    .some((value) => normalizeSearch(String(value)).includes(term));
}

export default function StudentsListScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { t } = useRTL();
  const insets = useSafeAreaInsets();

  const [items, setItems] = useState<ManagedStudent[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [everyone, setEveryone] = useState<ManagedStudent[] | null>(null);
  const [searching, setSearching] = useState(false);
  const loadedOnce = useRef(false);

  const load = useCallback(
    async (pageNum: number, mode: 'initial' | 'more' | 'refresh' | 'silent' = 'initial') => {
      try {
        setError(null);
        if (mode === 'initial') setLoading(true);
        if (mode === 'more') setLoadingMore(true);
        if (mode === 'refresh') setRefreshing(true);
        const res = await studentsApi.getPage(pageNum, PAGE_SIZE);
        setItems((prev) => (pageNum === 1 ? res.items : [...prev, ...res.items]));
        setTotalCount(res.totalCount);
        setPage(pageNum);
        if (pageNum === 1) setEveryone(null);
      } catch (err: any) {
        setError(err?.userMessage || t('people.loadFailed'));
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [t]
  );

  useFocusEffect(
    useCallback(() => {
      load(1, loadedOnce.current ? 'silent' : 'initial');
      loadedOnce.current = true;
    }, [load])
  );

  const term = normalizeSearch(search.trim());

  const onSearch = async (text: string) => {
    setSearch(text);
    if (!text.trim() || everyone || searching) return;
    setSearching(true);
    try {
      setEveryone(await studentsApi.getAllManaged());
    } catch {
      setEveryone(null);
    } finally {
      setSearching(false);
    }
  };

  const visible = useMemo(
    () => (term ? (everyone ?? items).filter((s) => matches(s, term)) : items),
    [term, everyone, items]
  );

  const onEndReached = () => {
    if (term || loading || loadingMore || items.length >= totalCount) return;
    load(page + 1, 'more');
  };

  const styles = useMemo(() => createStyles(theme), [theme]);

  const headerActions = (
    <View style={styles.actions}>
      <TouchableOpacity
        onPress={() => navigation.navigate('StudentsBulkImport')}
        style={[styles.iconButton, { backgroundColor: theme.colors.card }]}
        accessibilityRole="button"
        accessibilityLabel={t('people.bulkImport.title')}
      >
        <Ionicons name="cloud-upload-outline" size={20} color={theme.colors.text} />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => navigation.navigate('StudentForm')}
        style={[styles.iconButton, { backgroundColor: theme.colors.primary }]}
        accessibilityRole="button"
        accessibilityLabel={t('people.students.add')}
      >
        <Ionicons name="add" size={22} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );

  const renderItem = ({ item }: { item: ManagedStudent }) => {
    const name = fullName(item);
    const image = getFullImageUrl(item.profileImage);
    const subtitle = [item.code, item.educationStage ? t(`educationStages.${item.educationStage}`) : null]
      .filter(Boolean)
      .join('  ·  ');
    return (
      <RowCard
        title={name}
        titleLines={1}
        subtitle={subtitle || item.email || null}
        meta={item.groups[0]?.name ?? null}
        leading={<Avatar source={image ? { uri: image } : undefined} name={name} dimension={52} radius={16} />}
        trailing="chevron"
        onPress={() => navigation.navigate('StudentDetail', { studentId: item.id })}
      />
    );
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title={t('people.students.title')} onBack={() => navigation.goBack()} rightElement={headerActions} />
      <View style={styles.headerBlock}>
        <SearchBar value={search} onChangeText={onSearch} placeholder={t('people.students.search')} />
        <Text style={styles.summary}>{t('people.students.count', { count: totalCount })}</Text>
      </View>

      {loading ? (
        <Spinner />
      ) : error ? (
        <ErrorRetry message={error} onRetry={() => load(1)} />
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + spacing['3xl'] }]}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.4}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(1, 'refresh')}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
              progressBackgroundColor={theme.colors.card}
            />
          }
          ListEmptyComponent={
            searching ? (
              <Spinner size="small" />
            ) : (
              <EmptyState
                title={term ? t('common.noResults') : t('people.students.empty')}
                message={term ? undefined : t('people.students.emptyHint')}
              />
            )
          }
          ListFooterComponent={loadingMore ? <Spinner size="small" /> : null}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

function createStyles(theme: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    actions: { flexDirection: 'row', gap: spacing.sm },
    iconButton: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    headerBlock: { paddingHorizontal: spacing.xl, gap: spacing.sm, paddingBottom: spacing.md },
    summary: { fontSize: fontSize.sm, fontFamily: 'Cairo_500Medium', color: theme.colors.textMuted, textAlign: 'left' },
    list: { paddingHorizontal: spacing.xl, paddingTop: spacing.xs },
  });
}
