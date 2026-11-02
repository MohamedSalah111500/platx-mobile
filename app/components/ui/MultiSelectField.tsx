import React, { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@theme/ThemeProvider';
import { spacing } from '@theme/spacing';
import { typography, fontSize } from '@theme/typography';
import { useRTL } from '../../i18n/RTLProvider';
import { Button } from './Button';

import { sheetFrame } from '../../utils/responsive';
export interface MultiSelectOption {
  value: number;
  label: string;
}

interface MultiSelectFieldProps {
  label: string;
  placeholder: string;
  values: number[];
  options: MultiSelectOption[];
  onChange: (values: number[]) => void;
}

export function MultiSelectField({ label, placeholder, values, options, onChange }: MultiSelectFieldProps) {
  const { theme } = useTheme();
  const { t } = useRTL();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const selected = options.filter((o) => values.includes(o.value));
  const summary = selected.map((o) => o.label).join('، ');

  const toggle = (value: number) =>
    onChange(values.includes(value) ? values.filter((v) => v !== value) : [...values, value]);

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: theme.colors.text }]}>{label}</Text>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={[
          styles.field,
          {
            backgroundColor: theme.dark ? theme.colors.inputBackground : theme.colors.card,
            borderColor: theme.colors.inputBorder,
          },
        ]}
      >
        <Text
          numberOfLines={1}
          style={[styles.value, { color: selected.length ? theme.colors.inputText : theme.colors.inputPlaceholder }]}
        >
          {selected.length ? summary : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={theme.colors.textMuted} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)} statusBarTranslucent>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: theme.colors.card, paddingBottom: insets.bottom + spacing.md }]}>
            <Text style={[styles.sheetTitle, { color: theme.colors.text }]}>{label}</Text>
            <FlatList
              data={options}
              keyExtractor={(o) => String(o.value)}
              renderItem={({ item }) => {
                const active = values.includes(item.value);
                return (
                  <TouchableOpacity
                    style={[styles.option, { borderBottomColor: theme.colors.divider }]}
                    onPress={() => toggle(item.value)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: active }}
                  >
                    <Text style={[styles.optionText, { color: active ? theme.colors.primary : theme.colors.text }]}>
                      {item.label}
                    </Text>
                    <Ionicons
                      name={active ? 'checkbox' : 'square-outline'}
                      size={22}
                      color={active ? theme.colors.primary : theme.colors.textMuted}
                    />
                  </TouchableOpacity>
                );
              }}
            />
            <View style={styles.footer}>
              <Button title={t('common.done')} onPress={() => setOpen(false)} fullWidth />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: spacing.lg },
  label: { fontSize: fontSize.sm, fontFamily: 'Cairo_600SemiBold', marginBottom: spacing.sm, textAlign: 'left' },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 50,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: spacing.lg,
  },
  value: { flex: 1, fontSize: fontSize.base, fontFamily: 'Cairo_400Regular', textAlign: 'left' },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { ...sheetFrame, maxHeight: '75%', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: spacing.lg },
  sheetTitle: { ...typography.h3, textAlign: 'center', marginBottom: spacing.sm },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optionText: { ...typography.body },
  footer: { paddingHorizontal: spacing.xl, paddingTop: spacing.md },
});

export default MultiSelectField;
