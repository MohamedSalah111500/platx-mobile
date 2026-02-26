import React from 'react';
import { View, Text, Image, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@theme/ThemeProvider';
import { borderRadius } from '@theme/spacing';
import { fontSize } from '@theme/typography';

type AvatarSize = 'small' | 'medium' | 'large' | 'xlarge';

interface AvatarProps {
  source?: { uri: string } | number;
  name?: string;
  size?: AvatarSize;
  style?: ViewStyle;
}

const sizeMap: Record<AvatarSize, number> = {
  small: 32,
  medium: 48,
  large: 64,
  xlarge: 96,
};

const fontSizeMap: Record<AvatarSize, number> = {
  small: fontSize.xs,
  medium: fontSize.base,
  large: fontSize.xl,
  xlarge: fontSize['3xl'],
};

export function Avatar({ source, name, size = 'medium', style }: AvatarProps) {
  const { theme } = useTheme();
  const dimension = sizeMap[size];

  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const styles = StyleSheet.create({
    container: {
      width: dimension,
      height: dimension,
      borderRadius: borderRadius.full,
      backgroundColor: theme.colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    image: {
      width: dimension,
      height: dimension,
    },
    initials: {
      fontSize: fontSizeMap[size],
      fontWeight: '600',
      color: theme.colors.primary,
    },
  });

  if (source) {
    return (
      <View style={[styles.container, style]}>
        <Image source={source} style={styles.image} resizeMode="cover" />
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.initials}>{name ? getInitials(name) : '?'}</Text>
    </View>
  );
}

export default Avatar;
