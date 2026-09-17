import React from 'react';
import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../theme/ThemeProvider';
import { useRTL } from '../../i18n/RTLProvider';
import { COURSE_AVAILABILITY, type CourseAvailability } from '../../types/course.types';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';

interface CourseLockedNoticeProps {
  availability: CourseAvailability;
  style?: ViewStyle;
}

export function CourseLockedNotice({ availability, style }: CourseLockedNoticeProps) {
  const { theme } = useTheme();
  const { t } = useRTL();
  const upcoming = availability === COURSE_AVAILABILITY.Upcoming;

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }, style]}>
      <View style={[styles.iconWrap, { backgroundColor: theme.colors.primaryLight }]}>
        <Ionicons name={upcoming ? 'time-outline' : 'lock-closed-outline'} size={30} color={theme.colors.primary} />
      </View>
      <Text style={[styles.title, { color: theme.colors.text }]}>
        {t(upcoming ? 'courses.locked.upcomingTitle' : 'courses.locked.expiredTitle')}
      </Text>
      <Text style={[styles.body, { color: theme.colors.textSecondary }]}>
        {t(upcoming ? 'courses.locked.upcomingBody' : 'courses.locked.expiredBody')}
      </Text>
      <View style={[styles.contact, { backgroundColor: theme.colors.primaryLight }]}>
        <Ionicons name="headset-outline" size={16} color={theme.colors.primary} />
        <Text style={[styles.contactText, { color: theme.colors.primary }]}>{t('courses.locked.contact')}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconWrap: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs },
  title: { ...typography.sectionTitle, textAlign: 'center' },
  body: { fontSize: 14, lineHeight: 22, fontFamily: 'Cairo_400Regular', textAlign: 'center' },
  contact: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: borderRadius.full, marginTop: spacing.xs },
  contactText: { fontSize: 13, fontFamily: 'Cairo_600SemiBold' },
});
