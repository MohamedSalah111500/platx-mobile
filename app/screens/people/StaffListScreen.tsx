import React, { useCallback, useMemo, useRef, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeProvider';
import { useRTL } from '../../i18n/RTLProvider';
import { useAuth } from '../../hooks/useAuth';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { SearchBar } from '../../components/ui/SearchBar';
import { RowCard } from '../../components/ui/RowCard';
import { Avatar } from '../../components/ui/Avatar';
import { Spinner } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorRetry } from '../../components/ui/ErrorRetry';
import { spacing } from '../../theme/spacing';
import { fontSize } from '../../theme/typography';
import { staffApi } from '../../services/api/staff.api';
import { getFullImageUrl } from '../../utils/imageUrl';
import { normalizeSearch } from '../../utils/phoneNumber';
import { fullName } from '../../utils/personName';
import type { ManagedStaff } from '../../types/people.types';
import type { ProfileStackParamList } from '../../types/navigation.types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'StaffList'>;

export default function StaffListScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { t } = useRTL();
  const { can } = useAuth();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [items, setItems] = useState<ManagedStaff[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const loadedOnce = useRef(false);

  const load = useCallback(
    async (mode: 'initial' | 'refresh' | 'silent' = 'initial') => {
      if (mode === 'initial') setLoading(true);
      if (mode === 'refresh') setRefreshing(true);
      setError(null);
      try {
        setItems((await staffApi.getAll()).items);
      } catch (err: any) {
        setError(err?.userMessage || t('people.loadFailed'));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [t]
  );

  useFocusEffect(
    useCallback(() => {
      load(loadedOnce.current ? 'silent' : 'initial');
      loadedOnce.current = true;
    }, [load])
  );

  const term = normalizeSearch(search.trim());
  const visible = useMemo(
    () =>
      term
        ? items.filter((s) =>
            [fullName(s), s.email, s.phoneNumber, s.jobTitleName]
              .filter(Boolean)
              .some((value) => normalizeSearch(String(value)).includes(term))
          )
        : items,
    [term, items]
  );

  const renderItem = ({ item }: { item: ManagedStaff }) => {
    const name = fullName(item);
    const image = getFullImageUrl(item.profileImage);
    return (
      <RowCard
        title={name}
        titleLines={1}
        subtitle={item.jobTitleName || item.email || null}
        meta={item.groups.map((g) => g.name).join('، ') || null}
        leading={<Avatar source={image ? { uri: image } : undefined} name={name} dimension={52} radius={16} />}
        trailing="chevron"
        onPress={() => navigation.navigate('StaffDetail', { staffId: item.id })}
      />
    );
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={t('people.staff.title')}
        onBack={() => navigation.goBack()}
        rightElement={
          can('STAFF_EDIT') ? (
            <TouchableOpacity
              onPress={() => navigation.navigate('StaffForm')}
              style={[styles.iconButton, { backgroundColor: theme.colors.primary }]}
              accessibilityRole="button"
              accessibilityLabel={t('people.staff.add')}
            >
              <Ionicons name="add" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          ) : undefined
        }
      />
      <View style={styles.headerBlock}>
        <SearchBar value={search} onChangeText={setSearch} placeholder={t('people.staff.search')} />
        <Text style={styles.summary}>{t('people.staff.count', { count: items.length })}</Text>
      </View>

      {loading ? (
        <Spinner />
      ) : error ? (
        <ErrorRetry message={error} onRetry={() => load()} />
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + spacing['3xl'] }]}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load('refresh')}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
              progressBackgroundColor={theme.colors.card}
            />
          }
          ListEmptyComponent={
            <EmptyState
              title={term ? t('common.noResults') : t('people.staff.empty')}
              message={term ? undefined : t('people.staff.emptyHint')}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

function createStyles(theme: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    iconButton: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    headerBlock: { paddingHorizontal: spacing.xl, gap: spacing.sm, paddingBottom: spacing.md },
    summary: { fontSize: fontSize.sm, fontFamily: 'Cairo_500Medium', color: theme.colors.textMuted, textAlign: 'left' },
    list: { paddingHorizontal: spacing.xl, paddingTop: spacing.xs },
  });
}
