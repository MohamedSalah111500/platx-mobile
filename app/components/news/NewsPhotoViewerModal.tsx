import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useTheme } from '../../theme/ThemeProvider';
import { useRTL } from '../../i18n/RTLProvider';
import { useSound } from '../../hooks/useSound';
import { Spinner } from '../ui/Spinner';
import { spacing, borderRadius } from '../../theme/spacing';
import { fontSize } from '../../theme/typography';
import { newsApi } from '../../services/api/news.api';
import type { NewsComment } from '../../types/news.types';

const { height: SCREEN_H } = Dimensions.get('window');

type Props = {
  visible: boolean;
  onClose: () => void;
  newsId: number;
  imageUrl?: string | null;
};

export default function NewsPhotoViewerModal({ visible, onClose, newsId, imageUrl }: Props) {
  const { theme } = useTheme();
  const { t, isRTL } = useRTL();
  const { play } = useSound();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<NewsComment[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (visible) loadComments();
  }, [visible, newsId]);

  const loadComments = async () => {
    try {
      setLoading(true);
      const data = await newsApi.getComments(newsId);
      setComments(data);
    } catch {
      Alert.alert(t('common.error'), t('news.loadCommentsFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    const content = draft.trim();
    if (!content || sending) return;
    setSending(true);
    try {
      const comment = await newsApi.addComment(newsId, content);
      setComments((prev) => [...prev, comment]);
      setDraft('');
      play('tap');
    } catch {
      Alert.alert(t('common.error'), t('news.addCommentFailed'));
    } finally {
      setSending(false);
    }
  };

  const handleDelete = (comment: NewsComment) => {
    Alert.alert(t('news.deleteComment'), t('news.deleteCommentConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await newsApi.deleteComment(comment.id);
            setComments((prev) => prev.filter((c) => c.id !== comment.id));
          } catch {
            Alert.alert(t('common.error'), t('news.deleteCommentFailed'));
          }
        },
      },
    ]);
  };

  const timeAgo = (dateStr: string): string => {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return t('common.justNow');
    if (minutes < 60) return t('common.minutesAgo', { count: minutes });
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t('common.hoursAgo', { count: hours });
    const days = Math.floor(hours / 24);
    return t('common.daysAgo', { count: days });
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + spacing.sm, borderBottomColor: theme.colors.divider }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>{t('news.comments')}</Text>
          <View style={{ width: 24 }} />
        </View>

        {imageUrl ? (
          <View style={styles.imageWrap}>
            <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="contain" />
          </View>
        ) : null}

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 44 : 0}
        >
          {loading ? (
            <Spinner />
          ) : comments.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Ionicons name="chatbubble-ellipses-outline" size={36} color={theme.colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>{t('news.noComments')}</Text>
              <Text style={[styles.emptySub, { color: theme.colors.textMuted }]}>{t('news.beFirstToComment')}</Text>
            </View>
          ) : (
            <FlatList
              data={comments}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={{ padding: spacing.lg }}
              renderItem={({ item }) => (
                <View style={styles.commentRow}>
                  <View style={[styles.avatar, { backgroundColor: theme.colors.primaryLight }]}>
                    <Text style={[styles.avatarText, { color: theme.colors.primary }]}>
                      {(item.authorName?.[0] || '?').toUpperCase()}
                    </Text>
                  </View>
                  <View style={[styles.bubble, { backgroundColor: theme.colors.card }]}>
                    <View style={styles.bubbleHeader}>
                      <Text style={[styles.authorName, { color: theme.colors.text }]} numberOfLines={1}>
                        {item.authorName}
                      </Text>
                      {item.isStaff && (
                        <View style={[styles.staffPill, { backgroundColor: theme.colors.primary + '18' }]}>
                          <Text style={[styles.staffPillText, { color: theme.colors.primary }]}>
                            {t('common.teacher')}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.commentText, { color: theme.colors.textSecondary }]}>{item.content}</Text>
                    <View style={styles.bubbleFooter}>
                      <Text style={[styles.timeText, { color: theme.colors.textMuted }]}>
                        {timeAgo(item.createdDate)}
                      </Text>
                      {item.canDelete && (
                        <TouchableOpacity onPress={() => handleDelete(item)} hitSlop={8}>
                          <Ionicons name="trash-outline" size={14} color={theme.colors.danger} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>
              )}
            />
          )}

          <View style={[styles.inputBar, { backgroundColor: theme.colors.card, borderTopColor: theme.colors.divider, paddingBottom: insets.bottom + spacing.sm }]}>
            <View style={[styles.inputWrap, { backgroundColor: theme.colors.surface }]}>
              <TextInput
                style={[styles.input, { color: theme.colors.text, textAlign: isRTL ? 'right' : 'left' }]}
                value={draft}
                onChangeText={setDraft}
                placeholder={t('news.writeComment')}
                placeholderTextColor={theme.colors.inputPlaceholder}
                multiline
                maxLength={1000}
              />
            </View>
            <TouchableOpacity
              style={[
                styles.sendBtn,
                { backgroundColor: theme.colors.primary },
                (!draft.trim() || sending) && styles.sendBtnDisabled,
              ]}
              onPress={handleSend}
              disabled={!draft.trim() || sending}
              activeOpacity={0.7}
            >
              <Ionicons name="send" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  closeBtn: { width: 24 },
  headerTitle: { fontSize: fontSize.base, fontFamily: 'Cairo_700Bold' },

  imageWrap: {
    width: '100%',
    height: SCREEN_H * 0.36,
    backgroundColor: '#000',
  },
  image: { width: '100%', height: '100%' },

  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, padding: spacing.xl },
  emptyTitle: { fontSize: fontSize.base, fontFamily: 'Cairo_700Bold', marginTop: spacing.sm },
  emptySub: { fontSize: fontSize.sm, fontFamily: 'Cairo_400Regular' },

  commentRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: 13, fontFamily: 'Cairo_700Bold' },
  bubble: {
    flex: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  bubbleHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  authorName: { fontSize: fontSize.sm, fontFamily: 'Cairo_700Bold', flexShrink: 1 },
  staffPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: borderRadius.full },
  staffPillText: { fontSize: 10, fontFamily: 'Cairo_700Bold' },
  commentText: { fontSize: fontSize.sm, fontFamily: 'Cairo_400Regular', lineHeight: 20, marginTop: 4 },
  bubbleFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  timeText: { fontSize: 11, fontFamily: 'Cairo_400Regular' },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    gap: spacing.sm,
  },
  inputWrap: {
    flex: 1,
    borderRadius: borderRadius['2xl'],
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? spacing.sm : 0,
  },
  input: {
    fontSize: fontSize.base,
    maxHeight: 100,
    paddingVertical: Platform.OS === 'ios' ? 6 : spacing.sm,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
});
