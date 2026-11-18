import React, { useRef } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/spacing';
import { fontSize, typography, buttonLineHeight } from '../../theme/typography';

import { sheetFrame } from '../../utils/responsive';
type IconName = keyof typeof Ionicons.glyphMap;

export interface SheetAction {
  key: string;
  label: string;
  icon: IconName;
  onPress: () => void;
  danger?: boolean;
}

interface ActionSheetProps {
  visible: boolean;
  title?: string;
  actions: SheetAction[];
  onClose: () => void;
}

export function ActionSheet({ visible, title, actions, onClose }: ActionSheetProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const pending = useRef<(() => void) | null>(null);

  const runPending = () => {
    const action = pending.current;
    pending.current = null;
    action?.();
  };

  const choose = (action: SheetAction) => {
    pending.current = action.onPress;
    onClose();
    if (Platform.OS !== 'ios') runPending();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      onDismiss={runPending}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: theme.colors.card, paddingBottom: insets.bottom + spacing.md }]}>
          {title ? (
            <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={2}>
              {title}
            </Text>
          ) : null}
          {actions.map((action) => {
            const color = action.danger ? theme.colors.danger : theme.colors.primary;
            return (
              <TouchableOpacity
                key={action.key}
                style={[styles.row, { borderBottomColor: theme.colors.divider }]}
                onPress={() => choose(action)}
                accessibilityRole="button"
              >
                <View style={[styles.icon, { backgroundColor: color + '1A' }]}>
                  <Ionicons name={action.icon} size={18} color={color} />
                </View>
                <Text style={[styles.label, { color: action.danger ? theme.colors.danger : theme.colors.text }]}>
                  {action.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { ...sheetFrame, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: spacing.lg },
  title: { ...typography.h3, textAlign: 'center', marginBottom: spacing.sm, paddingHorizontal: spacing.xl },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  icon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  label: { flex: 1, fontSize: fontSize.base, fontFamily: 'Cairo_600SemiBold', textAlign: 'left', lineHeight: buttonLineHeight(fontSize.base), includeFontPadding: false },
});

export default ActionSheet;
