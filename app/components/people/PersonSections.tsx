import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../theme/ThemeProvider';
import { useRTL } from '../../i18n/RTLProvider';
import { spacing } from '../../theme/spacing';
import { fontSize } from '../../theme/typography';

type IconName = keyof typeof Ionicons.glyphMap;

export interface InfoItem {
  icon: IconName;
  label: string;
  value: string | null;
}

export interface ActionItem {
  icon: IconName;
  label: string;
  onPress: () => void;
  danger?: boolean;
}

export function InfoList({ items }: { items: InfoItem[] }) {
  const { theme } = useTheme();
  const visible = items.filter((item) => !!item.value);
  if (!visible.length) return null;

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
      {visible.map((item, index) => (
        <View
          key={item.label}
          style={[styles.row, index < visible.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.colors.divider }]}
        >
          <View style={[styles.icon, { backgroundColor: theme.colors.primaryLight }]}>
            <Ionicons name={item.icon} size={18} color={theme.colors.primary} />
          </View>
          <View style={styles.body}>
            <Text style={[styles.label, { color: theme.colors.textMuted }]}>{item.label}</Text>
            <Text style={[styles.value, { color: theme.colors.text }]} selectable>{item.value}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

export function ActionList({ items }: { items: ActionItem[] }) {
  const { theme } = useTheme();
  const { isRTL } = useRTL();

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
      {items.map((item, index) => {
        const color = item.danger ? theme.colors.danger : theme.colors.primary;
        return (
          <TouchableOpacity
            key={item.label}
            onPress={item.onPress}
            activeOpacity={0.6}
            accessibilityRole="button"
            style={[styles.row, index < items.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.colors.divider }]}
          >
            <View style={[styles.icon, { backgroundColor: color + '1A' }]}>
              <Ionicons name={item.icon} size={18} color={color} />
            </View>
            <Text style={[styles.action, { color: item.danger ? theme.colors.danger : theme.colors.text }]}>{item.label}</Text>
            <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={18} color={theme.colors.textMuted} />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 12, paddingHorizontal: spacing.lg },
  icon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1 },
  label: { fontSize: 14, fontFamily: 'Cairo_500Medium', textAlign: 'left' },
  value: { fontSize: fontSize.base, fontFamily: 'Cairo_600SemiBold', textAlign: 'left' },
  action: { flex: 1, fontSize: fontSize.base, fontFamily: 'Cairo_600SemiBold', textAlign: 'left' },
});
