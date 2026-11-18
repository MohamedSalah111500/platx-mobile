import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../theme/ThemeProvider';
import { useRTL } from '../../i18n/RTLProvider';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { lessonReviewsApi } from '../../services/api/lessonReviews.api';
import { LESSON_REVIEW_SORT, type LessonReviewItem, type LessonReviewSort, type LessonReviews } from '../../types/lessonReview.types';
import { getFullImageUrl } from '../../utils/imageUrl';
import { appDateLocale } from '../../utils/dateLocale';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import type { Theme } from '../../theme/themes';

const PAGE_SIZE = 10;
const MAX_COMMENT = 1000;
const STARS = [1, 2, 3, 4, 5];
const SORTS: { value: LessonReviewSort; label: string }[] = [
  { value: LESSON_REVIEW_SORT.Newest, label: 'lessonReviews.sortNewest' },
  { value: LESSON_REVIEW_SORT.Highest, label: 'lessonReviews.sortHighest' },
  { value: LESSON_REVIEW_SORT.Lowest, label: 'lessonReviews.sortLowest' },
];

function Stars({ value, size, color, muted }: { value: number; size: number; color: string; muted: string }) {
  const rounded = Math.round(value);
  return (
    <View style={{ flexDirection: 'row', gap: 1, direction: 'ltr' }}>
      {STARS.map((star) => (
        <Ionicons key={star} name={star <= rounded ? 'star' : 'star-outline'} size={size} color={star <= rounded ? color : muted} />
      ))}
    </View>
  );
}

export function LessonReviewsSection({ lessonId }: { lessonId: number }) {
  const { theme } = useTheme();
  const { t } = useRTL();
  const styles = createStyles(theme);
  const [reviews, setReviews] = useState<LessonReviews | null>(null);
  const [items, setItems] = useState<LessonReviewItem[]>([]);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<LessonReviewSort>(LESSON_REVIEW_SORT.Newest);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const current = useRef(lessonId);
  current.current = lessonId;

  const apply = useCallback((data: LessonReviews) => {
    setReviews(data);
    setItems(data.items);
    setPage(1);
    setEditing(false);
    setRating(data.mine?.rating ?? 0);
    setComment(data.mine?.comment ?? '');
  }, []);

  const load = useCallback(
    async (nextSort: LessonReviewSort) => {
      try {
        const data = await lessonReviewsApi.get(lessonId, nextSort, 1, PAGE_SIZE);
        if (current.current === lessonId) apply(data);
      } catch {
      }
    },
    [lessonId, apply]
  );

  useEffect(() => {
    setReviews(null);
    setItems([]);
    setSort(LESSON_REVIEW_SORT.Newest);
    load(LESSON_REVIEW_SORT.Newest);
  }, [lessonId, load]);

  if (!reviews) return null;

  const showForm = reviews.canReview && (!reviews.mine || editing);
  const total = reviews.summary.count;
  const percent = (star: number) => (total ? Math.round(((reviews.summary.distribution[star - 1] ?? 0) / total) * 100) : 0);
  const hasMore = items.length < reviews.totalComments;

  const changeSort = (value: LessonReviewSort) => {
    if (value === sort) return;
    setSort(value);
    load(value);
  };

  const save = async () => {
    if (saving) return;
    if (!rating) {
      Alert.alert(t('lessonReviews.chooseRating'));
      return;
    }
    setSaving(true);
    try {
      const data = await lessonReviewsApi.save(lessonId, { rating, comment: comment.trim() || null });
      setSort(LESSON_REVIEW_SORT.Newest);
      apply(data);
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.userMessage || t('lessonReviews.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    setEditing(false);
    setRating(reviews.mine?.rating ?? 0);
    setComment(reviews.mine?.comment ?? '');
  };

  const deleteMine = () =>
    Alert.alert(t('lessonReviews.deleteMineConfirm'), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('lessonReviews.deleteMine'),
        style: 'destructive',
        onPress: async () => {
          setSaving(true);
          try {
            await lessonReviewsApi.deleteMine(lessonId);
            await load(sort);
          } catch (err: any) {
            Alert.alert(t('common.error'), err?.userMessage || t('lessonReviews.saveFailed'));
          } finally {
            setSaving(false);
          }
        },
      },
    ]);

  const removeComment = (item: LessonReviewItem) =>
    Alert.alert(t('lessonReviews.removeCommentConfirm'), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('lessonReviews.removeComment'),
        style: 'destructive',
        onPress: async () => {
          try {
            await lessonReviewsApi.removeComment(lessonId, item.id);
            await load(sort);
          } catch (err: any) {
            Alert.alert(t('common.error'), err?.userMessage || t('lessonReviews.saveFailed'));
          }
        },
      },
    ]);

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const data = await lessonReviewsApi.get(lessonId, sort, page + 1, PAGE_SIZE);
      if (current.current !== lessonId) return;
      setItems((existing) => {
        const seen = new Set(existing.map((i) => i.id));
        return [...existing, ...data.items.filter((i) => !seen.has(i.id))];
      });
      setPage(page + 1);
    } catch {
    } finally {
      setLoadingMore(false);
    }
  };

  const formatDate = (value: string) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString(appDateLocale(), { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{t('lessonReviews.title')}</Text>

      <View style={styles.summary}>
        <View style={styles.score}>
          <Text style={styles.average}>{total ? reviews.summary.average.toFixed(1) : '—'}</Text>
          <Stars value={reviews.summary.average} size={14} color={theme.colors.warning} muted={theme.colors.border} />
          <Text style={styles.muted}>{t('lessonReviews.ratingsCount', { count: total })}</Text>
        </View>
        <View style={styles.distribution}>
          {[5, 4, 3, 2, 1].map((star) => (
            <View key={star} style={styles.distRow}>
              <Text style={styles.distLabel}>{star}</Text>
              <Ionicons name="star" size={14} color={theme.colors.warning} />
              <View style={styles.bar}>
                <View style={[styles.barFill, { width: `${percent(star)}%` }]} />
              </View>
              <Text style={styles.distPct}>{percent(star)}%</Text>
            </View>
          ))}
        </View>
      </View>

      {reviews.mine && !editing && (
        <View style={styles.mine}>
          <View style={styles.mineHead}>
            <Stars value={reviews.mine.rating} size={14} color={theme.colors.warning} muted={theme.colors.border} />
            {reviews.canReview && (
              <TouchableOpacity onPress={() => setEditing(true)} accessibilityRole="button" hitSlop={6}>
                <Text style={styles.link}>{t('lessonReviews.edit')}</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.mineText}>
            <Text style={styles.bold}>{t('lessonReviews.yourRating')} </Text>
            {reviews.mine.comment || t('lessonReviews.noComment')}
          </Text>
        </View>
      )}

      {showForm && (
        <View style={styles.form}>
          <Text style={styles.bold}>{t(reviews.mine ? 'lessonReviews.yourReview' : 'lessonReviews.rateLesson')}</Text>
          <View style={styles.starPicker}>
            <View style={styles.starRow}>
              {STARS.map((star) => (
                <Pressable
                  key={star}
                  onPress={() => setRating(star)}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityLabel={t('lessonReviews.stars', { count: star })}
                >
                  <Ionicons name={star <= rating ? 'star' : 'star-outline'} size={30} color={star <= rating ? theme.colors.warning : theme.colors.textMuted} />
                </Pressable>
              ))}
            </View>
            <Text style={[styles.bold, { color: rating ? theme.colors.warning : theme.colors.textMuted }]}>
              {rating ? t(`lessonReviews.labels.${rating}`) : t('lessonReviews.chooseRating')}
            </Text>
          </View>
          <TextInput
            style={styles.input}
            value={comment}
            onChangeText={setComment}
            maxLength={MAX_COMMENT}
            multiline
            placeholder={t('lessonReviews.commentPlaceholder')}
            placeholderTextColor={theme.colors.textMuted}
            textAlignVertical="top"
          />
          <Text style={styles.muted}>{`${comment.length} / ${MAX_COMMENT}`}</Text>
          <View style={styles.formActions}>
            <Button title={t(reviews.mine ? 'lessonReviews.update' : 'lessonReviews.submit')} onPress={save} loading={saving} size="small" />
            {editing && <Button title={t('common.cancel')} onPress={cancelEdit} variant="secondary" size="small" disabled={saving} />}
            {editing && (
              <TouchableOpacity onPress={deleteMine} disabled={saving} accessibilityRole="button">
                <Text style={[styles.link, { color: theme.colors.danger }]}>{t('lessonReviews.deleteMine')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      <View style={styles.listHead}>
        <Text style={styles.bold}>{`${t('lessonReviews.comments')} (${reviews.totalComments})`}</Text>
      </View>
      {reviews.totalComments > 1 && (
        <View style={styles.sorts}>
          {SORTS.map((option) => {
            const active = option.value === sort;
            return (
              <TouchableOpacity
                key={option.value}
                onPress={() => changeSort(option.value)}
                style={[styles.sortChip, active && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.sortText, active && { color: '#FFFFFF' }]}>{t(option.label)}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {items.length === 0 ? (
        <Text style={styles.muted}>{t('lessonReviews.noComments')}</Text>
      ) : (
        items.map((item, index) => (
          <View key={item.id} style={[styles.comment, index < items.length - 1 && styles.commentDivider]}>
            <Avatar source={item.studentPhoto ? { uri: getFullImageUrl(item.studentPhoto) as string } : undefined} name={item.studentName} dimension={36} radius={10} />
            <View style={styles.commentBody}>
              <View style={styles.commentHead}>
                <Text style={styles.bold}>{item.studentName}</Text>
                {item.isMine && (
                  <View style={styles.mineBadge}>
                    <Text style={styles.mineBadgeText}>{t('lessonReviews.mine')}</Text>
                  </View>
                )}
              </View>
              <View style={styles.commentMeta}>
                <Stars value={item.rating} size={12} color={theme.colors.warning} muted={theme.colors.border} />
                <Text style={styles.muted}>{formatDate(item.createdAt)}</Text>
              </View>
              <Text style={styles.commentText}>{item.comment}</Text>
            </View>
            {reviews.canModerate && (
              <TouchableOpacity onPress={() => removeComment(item)} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('lessonReviews.removeComment')}>
                <Ionicons name="trash-outline" size={18} color={theme.colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        ))
      )}

      {hasMore && (
        <TouchableOpacity style={styles.more} onPress={loadMore} disabled={loadingMore} accessibilityRole="button">
          {loadingMore ? <ActivityIndicator color={theme.colors.primary} /> : <Text style={styles.link}>{t('lessonReviews.loadMore')}</Text>}
        </TouchableOpacity>
      )}
    </View>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    card: { backgroundColor: theme.colors.card, borderRadius: 20, padding: spacing.xl, marginTop: spacing.md, gap: spacing.md },
    title: { ...typography.body, fontFamily: 'Cairo_700Bold', color: theme.colors.text },
    summary: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
    score: { alignItems: 'center', gap: 2, minWidth: 84 },
    average: { fontSize: 30, lineHeight: 38, fontFamily: 'Cairo_700Bold', color: theme.colors.text },
    distribution: { flex: 1, gap: 4 },
    distRow: { flexDirection: 'row', alignItems: 'center', gap: 4, direction: 'ltr' },
    distLabel: { ...typography.bodySmall, color: theme.colors.text, width: 10, includeFontPadding: false },
    bar: { flex: 1, height: 6, borderRadius: 3, backgroundColor: theme.colors.border, overflow: 'hidden', marginHorizontal: 4 },
    barFill: { height: '100%', borderRadius: 3, backgroundColor: theme.colors.warning },
    distPct: { ...typography.bodySmall, color: theme.colors.textMuted, width: 40, textAlign: 'right' },
    muted: { ...typography.bodySmall, color: theme.colors.textMuted },
    bold: { ...typography.bodySmall, fontFamily: 'Cairo_600SemiBold', color: theme.colors.text },
    link: { ...typography.bodySmall, fontFamily: 'Cairo_600SemiBold', color: theme.colors.primary },
    mine: { backgroundColor: theme.colors.background, borderRadius: borderRadius.lg, padding: spacing.md, gap: spacing.xs },
    mineHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    mineText: { ...typography.bodySmall, color: theme.colors.textMuted },
    form: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: borderRadius.lg, padding: spacing.md, gap: spacing.sm },
    starPicker: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm },
    starRow: { flexDirection: 'row', gap: 4, direction: 'ltr' },
    input: {
      ...typography.bodySmall,
      minHeight: 72,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: borderRadius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      color: theme.colors.text,
      backgroundColor: theme.colors.inputBackground,
    },
    formActions: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm },
    listHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    sorts: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
    sortChip: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: borderRadius.full, paddingHorizontal: spacing.md, paddingVertical: 4 },
    sortText: { ...typography.bodySmall, color: theme.colors.text },
    comment: { flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.sm },
    commentDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border },
    commentBody: { flex: 1, gap: 2 },
    commentHead: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.xs },
    commentMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    commentText: { ...typography.bodySmall, color: theme.colors.text },
    mineBadge: { backgroundColor: theme.colors.primary + '1F', borderRadius: borderRadius.full, paddingHorizontal: spacing.sm },
    mineBadgeText: { ...typography.bodySmall, color: theme.colors.primary, includeFontPadding: false },
    more: { alignItems: 'center', paddingVertical: spacing.sm },
  });
}
