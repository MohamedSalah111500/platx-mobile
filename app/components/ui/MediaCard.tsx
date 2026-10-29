import React, { memo } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../theme/ThemeProvider';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography, fontFamily, fontSize } from '../../theme/typography';
import { PlayCircle } from './PlayCircle';

interface MediaCardProps {
  imageUrl?: string | null;
  title: string;
  meta?: string;
  badge?: string | null;
  topEnd?: React.ReactNode;
  onPress: () => void;
  aspectRatio?: number;
  style?: ViewStyle;
}

const GRADIENT = ['rgba(0,0,0,0)', 'rgba(0,0,0,0.65)', 'rgba(0,0,0,0.92)'] as const;
const GRADIENT_STOPS = [0, 0.45, 1] as const;

function MediaCardBase({ imageUrl, title, meta, badge, topEnd, onPress, aspectRatio = 16 / 9, style }: MediaCardProps) {
  const { theme } = useTheme();

  return (
    <TouchableOpacity
      style={[styles.card, { aspectRatio, backgroundColor: theme.colors.primaryLight }, style]}
      activeOpacity={0.9}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : (
        <View style={styles.fallback}>
          <Ionicons name="book-outline" size={40} color={theme.colors.primary} />
        </View>
      )}
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
      {topEnd ? <View style={styles.topEnd}>{topEnd}</View> : null}
      <LinearGradient colors={GRADIENT} locations={GRADIENT_STOPS} style={styles.overlay}>
        <View style={styles.text}>
          <Text style={styles.title} numberOfLines={2}>{title}</Text>
          {meta ? <Text style={styles.meta} numberOfLines={1}>{meta}</Text> : null}
        </View>
        <PlayCircle tone="light" size={42} />
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { width: '100%', borderRadius: 24, overflow: 'hidden' },
  fallback: { position: 'absolute', top: 0, bottom: 0, start: 0, end: 0, justifyContent: 'center', alignItems: 'center' },
  badge: {
    position: 'absolute',
    top: spacing.md,
    start: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  topEnd: { position: 'absolute', top: spacing.md, end: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  badgeText: { fontFamily: fontFamily.bold, fontSize: fontSize.sm, color: '#18181B', textAlign: 'left' },
  overlay: {
    position: 'absolute',
    start: 0,
    end: 0,
    bottom: 0,
    top: '30%',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.md,
  },
  text: { flex: 1, alignItems: 'flex-start' },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.base,
    lineHeight: 26,
    color: '#FFFFFF',
    textAlign: 'left',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowRadius: 8,
  },
  meta: {
    ...typography.bodySmall,
    color: 'rgba(255,255,255,0.85)',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowRadius: 8,
  },
});

export const MediaCard = memo(MediaCardBase);
export default MediaCard;
