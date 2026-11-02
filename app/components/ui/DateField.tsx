import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '@theme/ThemeProvider';
import { spacing } from '@theme/spacing';
import { typography, fontSize } from '@theme/typography';
import { useRTL } from '../../i18n/RTLProvider';
import { SelectField } from './SelectField';

const EARLIEST_YEAR = 1940;

interface DateFieldProps {
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
  error?: string;
  yearsAhead?: number;
  earliestYear?: number;
  clearable?: boolean;
}

interface Parts {
  day: string | null;
  month: string | null;
  year: string | null;
}

const pad = (n: number) => String(n).padStart(2, '0');

function toParts(value: string | null): Parts {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? '');
  if (!match) return { day: null, month: null, year: null };
  return { year: match[1], month: match[2], day: match[3] };
}

function daysIn(year: string | null, month: string | null): number {
  if (!month) return 31;
  return new Date(Number(year ?? 2000), Number(month), 0).getDate();
}

export function DateField({
  label,
  value,
  onChange,
  error,
  yearsAhead = 0,
  earliestYear = EARLIEST_YEAR,
  clearable = false,
}: DateFieldProps) {
  const { theme } = useTheme();
  const { t } = useRTL();
  const [parts, setParts] = useState<Parts>(() => toParts(value));

  useEffect(() => {
    setParts(toParts(value));
  }, [value]);

  const years = useMemo(() => {
    const latest = new Date().getFullYear() + yearsAhead;
    return Array.from({ length: latest - earliestYear + 1 }, (_, i) => {
      const year = String(latest - i);
      return { value: year, label: year };
    });
  }, [yearsAhead, earliestYear]);

  const months = useMemo(
    () => Array.from({ length: 12 }, (_, i) => ({ value: pad(i + 1), label: t(`months.m${i + 1}`) })),
    [t]
  );

  const days = useMemo(
    () => Array.from({ length: daysIn(parts.year, parts.month) }, (_, i) => ({ value: pad(i + 1), label: String(i + 1) })),
    [parts.year, parts.month]
  );

  const update = (patch: Partial<Parts>) => {
    const next = { ...parts, ...patch };
    if (next.day && Number(next.day) > daysIn(next.year, next.month)) next.day = null;
    setParts(next);
    onChange(next.day && next.month && next.year ? `${next.year}-${next.month}-${next.day}` : null);
  };

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: theme.colors.text }]}>{label}</Text>
        {clearable && (parts.day || parts.month || parts.year) ? (
          <TouchableOpacity
            onPress={() => {
              setParts({ day: null, month: null, year: null });
              onChange(null);
            }}
            accessibilityRole="button"
          >
            <Text style={[styles.clear, { color: theme.colors.danger }]}>{t('dateField.clear')}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      <View style={styles.row}>
        <View style={styles.day}>
          <SelectField placeholder={t('dateField.day')} value={parts.day} options={days} onChange={(day) => update({ day })} />
        </View>
        <View style={styles.month}>
          <SelectField placeholder={t('dateField.month')} value={parts.month} options={months} onChange={(month) => update({ month })} />
        </View>
        <View style={styles.year}>
          <SelectField placeholder={t('dateField.year')} value={parts.year} options={years} onChange={(year) => update({ year })} />
        </View>
      </View>
      {error ? <Text style={[styles.error, { color: theme.colors.danger }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: spacing.lg },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  label: { flex: 1, fontSize: fontSize.sm, fontFamily: 'Cairo_600SemiBold', textAlign: 'left' },
  clear: { fontSize: fontSize.sm, fontFamily: 'Cairo_600SemiBold' },
  row: { flexDirection: 'row', gap: spacing.sm, marginBottom: -spacing.lg },
  day: { flex: 2 },
  month: { flex: 3 },
  year: { flex: 3 },
  error: { ...typography.caption, marginTop: spacing.xs },
});

export default DateField;
