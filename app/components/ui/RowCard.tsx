import React, { memo } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../theme/ThemeProvider';
import { useRTL } from '../../i18n/RTLProvider';
import { spacing } from '../../theme/spacing';
import { typography, fontFamily, fontSize } from '../../theme/typography';

type IconName = keyof typeof Ionicons.glyphMap;

interface RowCardProps {
  title: string;
  subtitle?: string | null;
  meta?: string | null;
  imageUrl?: string | null;
  icon?: IconName;
  leading?: React.ReactNode;
  trailing?: React.ReactNode | 'chevron';
  footer?: React.ReactNode;
  onPress?: () => void;
  titleLines?: number;
  style?: ViewStyle;
}

function RowCardBase({
  title,
  subtitle,
  meta,
  imageUrl,
  icon = 'document-text-outline',
  leading,
  trailing,
  footer,
  onPress,
  titleLines = 2,
  style,
}: RowCardProps) {
  const { theme } = useTheme();
  const { isRTL } = useRTL();

  const thumb = leading ?? (
    <View style={[styles.thumb, { backgroundColor: theme.colors.primaryLight }]}>
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.fill} resizeMode="cover" />
      ) : (
        <Ionicons name={icon} size={26} color={theme.colors.primary} />
      )}
    </View>
  );

  const content = (
    <>
      {thumb}
      <View style={styles.body}>
        <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={titleLines}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.sub, { color: theme.colors.textSecondary }]} numberOfLines={1}>{subtitle}</Text>
        ) : null}
        {meta ? (
          <Text style={[styles.sub, { color: theme.colors.textMuted }]} numberOfLines={1}>{meta}</Text>
        ) : null}
        {footer}
      </View>
      {trailing === 'chevron' ? (
        <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color={theme.colors.textMuted} />
      ) : (
        trailing ?? null
      )}
    </>
  );

  const cardStyle = [styles.card, { backgroundColor: theme.colors.card }, style];

  if (!onPress) return <View style={cardStyle}>{content}</View>;

  return (
    <TouchableOpacity style={cardStyle} activeOpacity={0.85} onPress={onPress} accessibilityRole="button" accessibilityLabel={title}>
      {content}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    paddingEnd: spacing.md,
    borderRadius: 22,
    gap: spacing.md,
  },
  thumb: { width: 60, height: 60, borderRadius: 16, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  fill: { width: '100%', height: '100%' },
  body: { flex: 1, alignItems: 'flex-start' },
  title: { fontFamily: fontFamily.bold, fontSize: fontSize.base, lineHeight: 24, textAlign: 'left' },
  sub: { ...typography.bodySmall, marginTop: 2 },
});

export const RowCard = memo(RowCardBase);
export default RowCard;
