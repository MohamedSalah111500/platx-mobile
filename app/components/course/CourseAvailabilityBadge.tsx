import React from 'react';
import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../theme/ThemeProvider';
import { useRTL } from '../../i18n/RTLProvider';
import { COURSE_AVAILABILITY, type CourseAvailability } from '../../types/course.types';
import { spacing, borderRadius } from '../../theme/spacing';

interface CourseAvailabilityBadgeProps {
  availability: CourseAvailability;
  forManager?: boolean;
  style?: ViewStyle;
}

export function CourseAvailabilityBadge({ availability, forManager = false, style }: CourseAvailabilityBadgeProps) {
  const { theme } = useTheme();
  const { t } = useRTL();
  if (availability === COURSE_AVAILABILITY.Available) return null;

  const upcoming = availability === COURSE_AVAILABILITY.Upcoming;
  const color = upcoming ? theme.colors.warning : theme.colors.danger;
  const label = forManager
    ? t(upcoming ? 'courses.availability.lockedUpcoming' : 'courses.availability.lockedExpired')
    : t(upcoming ? 'courses.availability.upcoming' : 'courses.availability.expired');

  return (
    <View style={[styles.badge, { backgroundColor: color + '1A', borderColor: color + '55' }, style]}>
      <Ionicons name={upcoming ? 'time-outline' : 'lock-closed-outline'} size={12} color={color} />
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  text: { fontSize: 12, fontFamily: 'Cairo_600SemiBold' },
});
