import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeProvider';
import { useRTL } from '../../i18n/RTLProvider';
import { Spinner } from '../../components/ui/Spinner';
import { Badge } from '../../components/ui/Badge';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography, fontSize } from '../../theme/typography';
import { newsApi } from '../../services/api/news.api';
import { getFullImageUrl } from '../../utils/imageUrl';
import type { HomeStackParamList } from '../../types/navigation.types';
import type { NewsItem } from '../../types/news.types';

type Props = NativeStackScreenProps<HomeStackParamList, 'NewsDetail'>;

export default function NewsDetailScreen({ navigation, route }: Props) {
  const { newsId } = route.params;
  const { theme } = useTheme();
  const { t } = useRTL();
  const { width } = useWindowDimensions();
  const [newsItem, setNewsItem] = useState<NewsItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadNews();
  }, [newsId]);

  const loadNews = async () => {
    try {
      setError(null);
      setLoading(true);
      const data = await newsApi.getSingle(newsId);
      setNewsItem(data);
    } catch (err: any) {
      const msg = err?.userMessage || err?.message || 'Failed to load news details.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('en', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return '';
    }
  };

  // Handle both imageUrl and imageURl (backend uses inconsistent casing)
  // Also prefix relative paths with the API base URL
  const getImageUrlForItem = (item: NewsItem): string | undefined => {
    const raw = item.imageUrl || item.imageURl;
    return getFullImageUrl(raw);
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.lg,
    },
    backButton: { marginRight: spacing.md },
    headerTitle: { ...typography.h4, color: theme.colors.text },
    content: { paddingBottom: spacing['3xl'] },
    imageContainer: {
      width: '100%',
      marginBottom: spacing.lg,
    },
    image: {
      width: '100%',
      height: 220,
      backgroundColor: theme.colors.surface,
    },
    imagePlaceholder: {
      width: '100%',
      height: 180,
      backgroundColor: theme.colors.primaryLight,
      justifyContent: 'center',
      alignItems: 'center',
    },
    body: {
      paddingHorizontal: spacing.xl,
    },
    title: {
      ...typography.h3,
      color: theme.colors.text,
      marginBottom: spacing.sm,
    },
    subTitle: {
      ...typography.body,
      color: theme.colors.textSecondary,
      marginBottom: spacing.md,
      fontStyle: 'italic',
    },
    meta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      marginBottom: spacing.lg,
      flexWrap: 'wrap',
    },
    metaItem: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    metaText: { ...typography.caption, color: theme.colors.textMuted },
    divider: {
      height: 1,
      backgroundColor: theme.colors.divider,
      marginVertical: spacing.lg,
    },
    description: {
      ...typography.body,
      color: theme.colors.text,
      lineHeight: 24,
    },
    tagsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginTop: spacing.lg,
    },
    errorContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing['3xl'],
    },
    errorText: { ...typography.body, color: theme.colors.danger, textAlign: 'center', marginTop: spacing.md, marginBottom: spacing.lg },
    retryButton: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
      borderRadius: borderRadius.lg,
    },
    retryText: { ...typography.button, color: '#fff' },
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('news.title')}</Text>
        </View>
        <Spinner />
      </SafeAreaView>
    );
  }

  if (error || !newsItem) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('news.title')}</Text>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={theme.colors.danger} />
          <Text style={styles.errorText}>{error || t('news.newsNotFound')}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadNews}>
            <Text style={styles.retryText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const imageUrl = getImageUrlForItem(newsItem);
  const dateStr = formatDate(newsItem.createdDate || newsItem.createdAt);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('news.title')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Hero Image */}
        <View style={styles.imageContainer}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="newspaper-outline" size={48} color={theme.colors.primary} />
            </View>
          )}
        </View>

        <View style={styles.body}>
          {/* Title */}
          <Text style={styles.title}>{newsItem.title || t('courses.untitled')}</Text>

          {/* Subtitle */}
          {newsItem.subTitle ? (
            <Text style={styles.subTitle}>{newsItem.subTitle}</Text>
          ) : null}

          {/* Meta: Category, Author, Date */}
          <View style={styles.meta}>
            {(newsItem.categoryName || newsItem.category) ? (
              <Badge
                text={newsItem.categoryName || newsItem.category || ''}
                color={theme.colors.primary}
              />
            ) : null}
            {newsItem.staffName ? (
              <View style={styles.metaItem}>
                <Ionicons name="person-outline" size={14} color={theme.colors.textMuted} style={{ marginRight: 4 }} />
                <Text style={styles.metaText}>{newsItem.staffName}</Text>
              </View>
            ) : null}
            {dateStr ? (
              <View style={styles.metaItem}>
                <Ionicons name="calendar-outline" size={14} color={theme.colors.textMuted} style={{ marginRight: 4 }} />
                <Text style={styles.metaText}>{dateStr}</Text>
              </View>
            ) : null}
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Description / Body */}
          <Text style={styles.description}>
            {newsItem.description || t('common.noContent')}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
