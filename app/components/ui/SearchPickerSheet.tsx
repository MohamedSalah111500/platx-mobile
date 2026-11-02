import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeProvider';
import { useRTL } from '../../i18n/RTLProvider';
import { SearchBar } from './SearchBar';
import { Spinner } from './Spinner';
import { Button } from './Button';
import { spacing } from '../../theme/spacing';
import { fontSize, typography } from '../../theme/typography';
import { normalizeSearch } from '../../utils/phoneNumber';

import { sheetFrame } from '../../utils/responsive';
const SEARCH_DEBOUNCE_MS = 400;

export interface PickerItem {
  id: number;
  label: string;
  hint?: string | null;
}

interface SearchPickerSheetProps {
  visible: boolean;
  title: string;
  confirmLabel: string;
  onClose: () => void;
  onConfirm: (ids: number[]) => void | Promise<void>;
  items?: PickerItem[];
  search?: (term: string) => Promise<PickerItem[]>;
  multiple?: boolean;
  excludeIds?: number[];
}

export function SearchPickerSheet({
  visible,
  title,
  confirmLabel,
  onClose,
  onConfirm,
  items,
  search,
  multiple = false,
  excludeIds = [],
}: SearchPickerSheetProps) {
  const { theme } = useTheme();
  const { t } = useRTL();
  const insets = useSafeAreaInsets();
  const [term, setTerm] = useState('');
  const [remote, setRemote] = useState<PickerItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!visible) return;
    setTerm('');
    setSelected([]);
    if (search) runSearch('');
  }, [visible]);

  const runSearch = (value: string) => {
    if (!search) return;
    setLoading(true);
    search(value.trim())
      .then(setRemote)
      .catch(() => setRemote([]))
      .finally(() => setLoading(false));
  };

  const onChangeTerm = (value: string) => {
    setTerm(value);
    if (!search) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => runSearch(value), SEARCH_DEBOUNCE_MS);
  };

  const visibleItems = useMemo(() => {
    const source = (search ? remote : items ?? []).filter((item) => !excludeIds.includes(item.id));
    if (search) return source;
    const needle = normalizeSearch(term.trim());
    return needle
      ? source.filter((item) => normalizeSearch(`${item.label} ${item.hint ?? ''}`).includes(needle))
      : source;
  }, [search, remote, items, excludeIds, term]);

  const toggle = (id: number) => {
    if (!multiple) {
      setSelected([id]);
      return;
    }
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const confirm = async () => {
    if (!selected.length || saving) return;
    setSaving(true);
    try {
      await onConfirm(selected);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: theme.colors.card, paddingBottom: insets.bottom + spacing.md }]}>
          <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
          <View style={styles.searchWrap}>
            <SearchBar value={term} onChangeText={onChangeTerm} placeholder={t('common.search')} />
          </View>
          {loading ? (
            <Spinner />
          ) : (
            <FlatList
              data={visibleItems}
              keyExtractor={(item) => String(item.id)}
              keyboardShouldPersistTaps="handled"
              style={styles.list}
              renderItem={({ item }) => {
                const active = selected.includes(item.id);
                return (
                  <TouchableOpacity
                    style={[styles.option, { borderBottomColor: theme.colors.divider }]}
                    onPress={() => toggle(item.id)}
                    accessibilityRole={multiple ? 'checkbox' : 'radio'}
                    accessibilityState={{ checked: active }}
                  >
                    <View style={styles.optionBody}>
                      <Text style={[styles.optionText, { color: active ? theme.colors.primary : theme.colors.text }]} numberOfLines={2}>
                        {item.label}
                      </Text>
                      {item.hint ? (
                        <Text style={[styles.hint, { color: theme.colors.textMuted }]} numberOfLines={1}>
                          {item.hint}
                        </Text>
                      ) : null}
                    </View>
                    <Ionicons
                      name={active ? (multiple ? 'checkbox' : 'radio-button-on') : multiple ? 'square-outline' : 'radio-button-off'}
                      size={22}
                      color={active ? theme.colors.primary : theme.colors.textMuted}
                    />
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <Text style={[styles.empty, { color: theme.colors.textMuted }]}>{t('common.noResults')}</Text>
              }
            />
          )}
          <View style={styles.footer}>
            <Button
              title={multiple && selected.length ? `${confirmLabel} (${selected.length})` : confirmLabel}
              onPress={confirm}
              disabled={!selected.length}
              loading={saving}
              fullWidth
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { ...sheetFrame, maxHeight: '85%', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: spacing.lg },
  title: { ...typography.h3, textAlign: 'center', marginBottom: spacing.sm, paddingHorizontal: spacing.xl },
  searchWrap: { paddingHorizontal: spacing.xl, paddingBottom: spacing.sm },
  list: { flexGrow: 0 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optionBody: { flex: 1 },
  optionText: { fontSize: fontSize.base, fontFamily: 'Cairo_600SemiBold', textAlign: 'left' },
  hint: { fontSize: fontSize.sm, fontFamily: 'Cairo_400Regular', textAlign: 'left' },
  empty: { textAlign: 'center', padding: spacing.xl, fontSize: fontSize.sm, fontFamily: 'Cairo_400Regular' },
  footer: { paddingHorizontal: spacing.xl, paddingTop: spacing.md },
});

export default SearchPickerSheet;
