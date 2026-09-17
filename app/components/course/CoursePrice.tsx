import React from 'react';
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { useRTL } from '../../i18n/RTLProvider';
import { spacing, borderRadius } from '../../theme/spacing';
import { fontSize } from '../../theme/typography';
import { discountPercent, effectivePrice, formatAmount, getCurrencySymbol } from '../../utils/price';

type Props = {
  price?: number | null;
  discountPrice?: number | null;
  currencyCode?: string | null;
  isFree?: boolean;
  /** "lg" for detail/checkout headers, "sm" for compact rows. */
  size?: 'lg' | 'sm';
  style?: StyleProp<ViewStyle>;
};

/**
 * Course price block, shared by detail / checkout so it always reads the same:
 *   968 ر.س   ~~1,566 ر.س~~   [-38%]
 * Free courses render a single success chip.
 */
export function CoursePrice({ price, discountPrice, currencyCode, isFree, size = 'lg', style }: Props) {
  const { theme } = useTheme();
  const { t, locale } = useRTL();
  const lg = size === 'lg';

  const free = isFree || Number(price ?? 0) === 0;
  if (free) {
    return (
      <View style={[styles.row, style]}>
        <View style={[styles.chip, { backgroundColor: theme.colors.success + '1F' }]}>
          <Text style={[styles.chipText, { color: theme.colors.success }]}>{t('courses.free')}</Text>
        </View>
      </View>
    );
  }

  const symbol = getCurrencySymbol(currencyCode, locale);
  const current = effectivePrice(price, discountPrice);
  const pct = discountPercent(price, discountPrice);

  return (
    <View style={[styles.row, style]}>
      <View style={styles.amountRow}>
        <Text style={[styles.amount, { color: theme.colors.primary, fontSize: lg ? fontSize['2xl'] : fontSize.lg }]}>
          {formatAmount(current)}
        </Text>
        <Text style={[styles.symbol, { color: theme.colors.textMuted, fontSize: lg ? fontSize.sm : fontSize.xs }]}>
          {symbol}
        </Text>
      </View>
      {pct != null && (
        <>
          <Text style={[styles.old, { color: theme.colors.textMuted, fontSize: lg ? fontSize.sm : fontSize.xs }]}>
            {formatAmount(price)} {symbol}
          </Text>
          <View style={[styles.chip, { backgroundColor: theme.colors.danger + '1A' }]}>
            <Text style={[styles.chipText, { color: theme.colors.danger }]}>{t('courses.discountOff', { pct })}</Text>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  amount: {
    fontFamily: 'Cairo_700Bold',
  },
  symbol: {
    fontFamily: 'Cairo_600SemiBold',
  },
  old: {
    fontFamily: 'Cairo_500Medium',
    textDecorationLine: 'line-through',
  },
  chip: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  chipText: {
    fontSize: fontSize.xs,
    fontFamily: 'Cairo_700Bold',
  },
});

export default CoursePrice;
