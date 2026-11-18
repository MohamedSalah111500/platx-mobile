import React, { useCallback, useState } from 'react';
import { Alert, FlatList, Modal, Pressable, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../../theme/ThemeProvider';
import { useRTL } from '../../../i18n/RTLProvider';
import { useAuth } from '../../../hooks/useAuth';
import { isolate } from '../../../hooks/useDisplayFormat';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { Spinner } from '../../../components/ui/Spinner';
import { ErrorRetry } from '../../../components/ui/ErrorRetry';
import { Button } from '../../../components/ui/Button';
import { Chip } from '../../../components/ui/Chip';
import { ActionSheet } from '../../../components/ui/ActionSheet';
import { spacing, borderRadius } from '../../../theme/spacing';
import { fontSize, typography } from '../../../theme/typography';
import { sheetFrame } from '../../../utils/responsive';
import { useTabBarSpace } from '../../../navigation/tabBar';
import { storeApi, type StoreCategory } from '../../../services/api/store.api';
import { StoreManageTabs } from './StoreOrdersScreen';
import type { ProfileStackParamList } from '../../../types/navigation.types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'StoreCategories'>;

const SUGGESTED = ['BOOKS', 'NOTES', 'STATIONERY', 'MATH_TOOLS', 'OTHER'];
const NAME_MAX = 60;

export default function StoreCategoriesScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { t } = useRTL();
  const { canModule } = useAuth();
  const tabBarSpace = useTabBarSpace();
  const insets = useSafeAreaInsets();
  const canCreate = canModule('Store', 'create');
  const canEdit = canModule('Store', 'edit');
  const canDelete = canModule('Store', 'delete');

  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [adding, setAdding] = useState(false);
  const [selected, setSelected] = useState<StoreCategory | null>(null);
  const [renaming, setRenaming] = useState<StoreCategory | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setCategories(await storeApi.categories());
      setError(null);
    } catch (err: any) {
      setError(err?.userMessage || t('store.LOAD_FAILED'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const exists = (value: string) => categories.some((category) => category.name.trim().toLowerCase() === value.trim().toLowerCase());

  const add = async (names: string[]) => {
    const fresh = names.map((n) => n.trim()).filter((n) => n && !exists(n));
    if (!fresh.length || adding) return;
    setAdding(true);
    try {
      const created: StoreCategory[] = [];
      for (const item of fresh) created.push(await storeApi.createCategory(item));
      setCategories((current) => [...current, ...created]);
      setName('');
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.userMessage || t('store.LOAD_FAILED'));
      load();
    } finally {
      setAdding(false);
    }
  };

  const rename = async () => {
    const category = renaming;
    const value = renameValue.trim();
    if (!category || !value || saving) return;
    if (value === category.name) {
      setRenaming(null);
      return;
    }
    setSaving(true);
    try {
      const updated = await storeApi.renameCategory(category.id, value);
      setCategories((current) => current.map((c) => (c.id === updated.id ? updated : c)));
      setRenaming(null);
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.userMessage || t('store.LOAD_FAILED'));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (category: StoreCategory) => {
    const message = category.productCount
      ? t('store.CATEGORIES.DELETE_CONFIRM', { name: category.name, count: category.productCount })
      : t('store.CATEGORIES.DELETE_CONFIRM_EMPTY', { name: category.name });
    Alert.alert(t('store.DELETE'), message, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('store.DELETE'),
        style: 'destructive',
        onPress: async () => {
          try {
            await storeApi.deleteCategory(category.id);
            setCategories((current) => current.filter((c) => c.id !== category.id));
          } catch (err: any) {
            Alert.alert(t('common.error'), err?.userMessage || t('store.LOAD_FAILED'));
          }
        },
      },
    ]);
  };

  const muted = { color: theme.colors.textMuted };
  const text = { color: theme.colors.text };
  const suggestions = SUGGESTED.map((key) => t(`store.CATEGORIES.SUGGESTED.${key}`)).filter((label) => !exists(label));

  const sheetActions = selected
    ? [
        ...(canEdit
          ? [{ key: 'rename', label: t('store.CATEGORIES.RENAME'), icon: 'create-outline' as const, onPress: () => { setRenameValue(selected.name); setRenaming(selected); } }]
          : []),
        ...(canDelete ? [{ key: 'delete', label: t('store.DELETE'), icon: 'trash-outline' as const, danger: true, onPress: () => confirmDelete(selected) }] : []),
      ]
    : [];

  const header = (
    <View style={styles.headerBlock}>
      <StoreManageTabs current="categories" onNavigate={(screen) => navigation.navigate(screen)} />
      {canCreate ? (
        <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.cardTitle, text]}>{t('store.CATEGORIES.ADD_TITLE')}</Text>
          <View style={styles.inlineRow}>
            <TextInput
              style={[styles.input, { borderColor: theme.colors.inputBorder, backgroundColor: theme.colors.inputBackground, color: theme.colors.inputText }]}
              value={name}
              onChangeText={setName}
              placeholder={t('store.CATEGORIES.NEW')}
              placeholderTextColor={theme.colors.inputPlaceholder}
              maxLength={NAME_MAX}
              onSubmitEditing={() => add([name])}
              accessibilityLabel={t('store.CATEGORIES.NEW')}
            />
            <Button title={t('store.CATEGORIES.ADD')} onPress={() => add([name])} loading={adding} disabled={!name.trim() || exists(name)} />
          </View>
          {!loading && !categories.length && suggestions.length ? (
            <View style={styles.suggested}>
              <Text style={[styles.cardTitle, text]}>{t('store.CATEGORIES.SUGGESTED_TITLE')}</Text>
              <Text style={[styles.meta, muted]}>{t('store.CATEGORIES.SUGGESTED_HINT')}</Text>
              <View style={styles.chips}>
                {suggestions.map((label) => (
                  <Chip key={label} icon="add" label={label} onPress={() => add([label])} />
                ))}
              </View>
              <Button title={t('store.CATEGORIES.ADD_ALL')} variant="secondary" size="small" onPress={() => add(suggestions)} disabled={adding} />
            </View>
          ) : null}
        </View>
      ) : null}
      {categories.length ? <Text style={[styles.cardTitle, text]}>{t('store.CATEGORIES.LIST_TITLE')}</Text> : null}
    </View>
  );

  const renderCategory = ({ item }: { item: StoreCategory }) => (
    <TouchableOpacity
      style={[styles.row, { backgroundColor: theme.colors.card }]}
      onPress={() => (canEdit || canDelete) && setSelected(item)}
      disabled={!canEdit && !canDelete}
      accessibilityRole="button"
      accessibilityLabel={item.name}
    >
      <Ionicons name="pricetag-outline" size={20} color={theme.colors.primary} />
      <View style={styles.flex}>
        <Text style={[styles.rowTitle, text]}>{item.name}</Text>
        <Text style={[styles.meta, muted]}>
          {item.productCount ? t('store.CATEGORIES.PRODUCTS', { count: isolate(String(item.productCount)) }) : t('store.CATEGORIES.NO_PRODUCTS')}
        </Text>
      </View>
      {canEdit || canDelete ? <Ionicons name="ellipsis-vertical" size={18} color={theme.colors.textMuted} /> : null}
    </TouchableOpacity>
  );

  const empty = () => {
    if (loading) return <Spinner />;
    if (error) return <ErrorRetry message={error} onRetry={() => { setLoading(true); load(); }} retryLabel={t('store.TRY_AGAIN')} />;
    return <Text style={[styles.empty, muted]}>{t('store.CATEGORIES.EMPTY')}</Text>;
  };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.colors.background }]} edges={['bottom', 'left', 'right']}>
      <ScreenHeader title={t('store.PAGES.CATEGORIES_TITLE')} onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView behavior="padding" style={styles.flex}>
        <FlatList
          data={error ? [] : categories}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderCategory}
          ListHeaderComponent={header}
          ListEmptyComponent={empty}
          contentContainerStyle={[styles.content, { paddingBottom: tabBarSpace + spacing.lg }]}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={theme.colors.primary} />}
        />
      </KeyboardAvoidingView>

      <ActionSheet visible={selected !== null} title={selected?.name} actions={sheetActions} onClose={() => setSelected(null)} />

      <Modal visible={renaming !== null} transparent animationType="slide" onRequestClose={() => !saving && setRenaming(null)} statusBarTranslucent>
        <KeyboardAvoidingView behavior="padding" style={styles.flex}>
          <Pressable style={styles.backdrop} onPress={() => !saving && setRenaming(null)}>
            <Pressable style={[styles.sheet, { backgroundColor: theme.colors.card, paddingBottom: insets.bottom + spacing.xl }]} onPress={() => undefined}>
              <Text style={[styles.sheetTitle, text]}>{t('store.CATEGORIES.RENAME')}</Text>
              <TextInput
                style={[styles.input, styles.sheetInput, { borderColor: theme.colors.inputBorder, backgroundColor: theme.colors.inputBackground, color: theme.colors.inputText }]}
                value={renameValue}
                onChangeText={setRenameValue}
                maxLength={NAME_MAX}
                autoFocus
                onSubmitEditing={rename}
                accessibilityLabel={t('store.CATEGORIES.NAME')}
              />
              <Button title={t('store.SAVE')} onPress={rename} loading={saving} disabled={!renameValue.trim()} fullWidth />
              <Button title={t('store.CANCEL')} variant="secondary" onPress={() => setRenaming(null)} disabled={saving} fullWidth />
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.sm },
  headerBlock: { gap: spacing.md, marginBottom: spacing.xs },
  card: { borderRadius: borderRadius.xl, padding: spacing.lg, gap: spacing.sm },
  cardTitle: { fontSize: fontSize.base, fontFamily: 'Cairo_700Bold', textAlign: 'left' },
  meta: { fontSize: 14, fontFamily: 'Cairo_400Regular', textAlign: 'left' },
  inlineRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  input: { flex: 1, borderWidth: 1, borderRadius: borderRadius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: fontSize.base, fontFamily: 'Cairo_400Regular' },
  suggested: { gap: spacing.sm, marginTop: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: borderRadius.xl, padding: spacing.lg },
  rowTitle: { fontSize: fontSize.base, fontFamily: 'Cairo_600SemiBold', textAlign: 'left', lineHeight: 24, includeFontPadding: false, textAlignVertical: 'center' },
  empty: { fontSize: 14, fontFamily: 'Cairo_400Regular', textAlign: 'center', paddingVertical: spacing['2xl'] },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { ...sheetFrame, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.xl, gap: spacing.sm },
  sheetTitle: { ...typography.h3, textAlign: 'center' },
  sheetInput: { flex: 0 },
});
