import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@theme/ThemeProvider';
import { spacing } from '@theme/spacing';

interface DividerProps {
  orientation?: 'horizontal' | 'vertical';
  thickness?: number;
  color?: string;
  margin?: number;
  style?: ViewStyle;
}

export function Divider({
  orientation = 'horizontal',
  thickness = 1,
  color,
  margin,
  style,
}: DividerProps) {
  const { theme } = useTheme();
  const dividerColor = color || theme.colors.divider;
  const marginValue = margin !== undefined ? margin : spacing.lg;

  const styles = StyleSheet.create({
    horizontal: {
      height: thickness,
      backgroundColor: dividerColor,
      marginVertical: marginValue,
    },
    vertical: {
      width: thickness,
      backgroundColor: dividerColor,
      marginHorizontal: marginValue,
    },
  });

  return (
    <View
      style={[
        orientation === 'horizontal' ? styles.horizontal : styles.vertical,
        style,
      ]}
    />
  );
}

export default Divider;
