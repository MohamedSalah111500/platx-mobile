import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeProvider';
import { useRTL } from '../../i18n/RTLProvider';
import { Spinner } from '../../components/ui/Spinner';
import { ErrorRetry } from '../../components/ui/ErrorRetry';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { eventsApi } from '../../services/api/events.api';
import { useAuth } from '../../hooks/useAuth';
import type { HomeStackParamList } from '../../types/navigation.types';
import type { EventDetail } from '../../types/event.types';

type Props = NativeStackScreenProps<HomeStackParamList, 'EventDetail'>;

export default function EventDetailScreen({ navigation, route }: Props) {
  const { eventId } = route.params;
  const { theme } = useTheme();
  const { t } = useRTL();
  const { isStudent } = useAuth();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvent();
  }, [eventId, isStudent]);

  const [error, setError] = useState<string | null>(null);

  const loadEvent = async () => {
    try {
      setError(null);
      const data = await eventsApi.getSingle(eventId, isStudent);
      setEvent(data);
    } catch (err: any) {
      setError(err?.userMessage || t('events.failedToLoadEvent'));
    } finally {
      setLoading(false);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      paddingHorizontal: spacing.xl,
      paddingBottom: spacing['3xl'],
    },
    dateCard: {
      backgroundColor: theme.colors.primaryLight,
      borderRadius: borderRadius['2xl'],
      padding: spacing.xl,
      alignItems: 'center',
      marginBottom: spacing.xl,
    },
    dateDay: {
      ...typography.h1,
      color: theme.colors.primary,
    },
    dateMonth: {
      ...typography.h4,
      color: theme.colors.primary,
    },
    title: {
      ...typography.h3,
      color: theme.colors.text,
      marginBottom: spacing.md,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    infoText: {
      ...typography.body,
      color: theme.colors.textSecondary,
      flexShrink: 1,
    },
    description: {
      ...typography.body,
      color: theme.colors.textSecondary,
      lineHeight: 24,
      marginTop: spacing.lg,
    },
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
        <ScreenHeader title={t('events.event')} onBack={() => navigation.goBack()} />
        <Spinner />
      </SafeAreaView>
    );
  }

  if (error || !event) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
        <ScreenHeader title={t('events.eventDetails')} onBack={() => navigation.goBack()} />
        <ErrorRetry
          message={error || t('events.failedToLoadEvent')}
          onRetry={() => {
            setLoading(true);
            loadEvent();
          }}
        />
      </SafeAreaView>
    );
  }

  const openMeetingLink = () => {
    const link = event?.meetingLink?.trim();
    if (!link) return;
    const url = /^https?:\/\//i.test(link) ? link : `https://${link}`;
    Linking.openURL(url).catch(() => {});
  };

  const startDate = event?.startDate ? new Date(event.startDate) : null;
  const endDate = event?.endDate ? new Date(event.endDate) : null;

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <ScreenHeader title={t('events.eventDetails')} onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.content}>
        {startDate && (
          <View style={styles.dateCard}>
            <Text style={styles.dateDay}>{startDate.getDate()}</Text>
            <Text style={styles.dateMonth}>
              {startDate.toLocaleString('en', { month: 'long', year: 'numeric' })}
            </Text>
          </View>
        )}

        <Text style={styles.title}>{event?.title}</Text>

        {startDate && (
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={20} color={theme.colors.primary} />
            <Text style={styles.infoText}>
              {startDate.toLocaleTimeString('en', {
                hour: '2-digit',
                minute: '2-digit',
              })}
              {endDate &&
                ` - ${endDate.toLocaleTimeString('en', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}`}
            </Text>
          </View>
        )}

        {event?.location && (
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={20} color={theme.colors.primary} />
            <Text style={styles.infoText}>{event.location}</Text>
          </View>
        )}

        {event?.isOnline && event.meetingLink && (
          <TouchableOpacity style={styles.infoRow} onPress={openMeetingLink} activeOpacity={0.7}>
            <Ionicons name="link-outline" size={20} color={theme.colors.primary} />
            <Text style={[styles.infoText, { color: theme.colors.primary }]}>
              {t('common.joinOnlineMeeting')}
            </Text>
          </TouchableOpacity>
        )}

        {event?.description && (
          <Text style={styles.description}>{event.description}</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
