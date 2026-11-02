import React from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/spacing';
import { fontSize } from '../../theme/typography';

interface SwitchFieldProps {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

export function SwitchField({ label, hint, value, onChange, disabled }: SwitchFieldProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.row, { backgroundColor: theme.colors.card }]}>
      <View style={styles.body}>
        <Text style={[styles.label, { color: theme.colors.text }]}>{label}</Text>
        {hint ? <Text style={[styles.hint, { color: theme.colors.textMuted }]}>{hint}</Text> : null}
      </View>
      <Switch
        value={value}
        disabled={disabled}
        onValueChange={onChange}
        trackColor={{ true: theme.colors.primary, false: theme.colors.border }}
        accessibilityLabel={label}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: 16,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
  },
  body: { flex: 1, gap: 2 },
  label: { fontSize: fontSize.base, fontFamily: 'Cairo_600SemiBold', textAlign: 'left' },
  hint: { fontSize: fontSize.sm, fontFamily: 'Cairo_400Regular', textAlign: 'left' },
});

export default SwitchField;
