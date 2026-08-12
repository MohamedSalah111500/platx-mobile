import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Share,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeProvider';
import { useRTL } from '../../i18n/RTLProvider';
import { useAuth } from '../../hooks/useAuth';
import { Spinner } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorRetry } from '../../components/ui/ErrorRetry';
import { spacing } from '../../theme/spacing';
import { fontSize } from '../../theme/typography';
import { examApi } from '../../services/api/exam.api';
import { API_CONFIG } from '../../config';
import type { ExamsStackParamList } from '../../types/navigation.types';
import type { OnlineExamListItem, ExamHistoryItem } from '../../types/exam.types';

type Props = NativeStackScreenProps<ExamsStackParamList, 'ExamsList'>;

const PAGE_SIZE = 20;

export default function ExamsListScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { t, isRTL } = useRTL();
  const { isStudent, user } = useAuth();
  const [studentTab, setStudentTab] = useState<'exams' | 'results'>('exams');
  const [exams, setExams] = useState<OnlineExamListItem[]>([]);
  const [history, setHistory] = useState<ExamHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const loadExams = useCallback(async (p = 1, refresh = false) => {
    try {
      setError(null);
      if (p === 1 && !refresh) setLoading(true);

      if (isStudent) {
        if (studentTab === 'results') {
          if (!user?.studentId) {
            setHistory([]);
            setHasMore(false);
            return;
          }
          const result = await examApi.getExamHistory(user.studentId, p, PAGE_SIZE);
          setHistory(prev => (p === 1 ? result.items : [...prev, ...result.items]));
          setHasMore(result.items.length >= PAGE_SIZE);
          setPage(p);
          return;
        }

        const result = await examApi.getMyExamsPaged(p, PAGE_SIZE);
        setExams(prev => (p === 1 ? result.items : [...prev, ...result.items]));
        setHasMore(result.items.length >= PAGE_SIZE);
        setPage(p);
        return;
      }

      const result = await examApi.getExamsPaged(p, PAGE_SIZE);
      setExams(prev => (p === 1 ? result.items : [...prev, ...result.items]));
      setHasMore(result.items.length >= PAGE_SIZE);
      setPage(p);
    } catch (err: any) {
      setError(err?.userMessage || err?.message || t('exams.failedToLoad'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t, isStudent, studentTab, user?.studentId]);

  useFocusEffect(
    useCallback(() => {
      setPage(1);
      loadExams(1);
    }, [loadExams])
  );

  const isFirstRun = useRef(true);
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    setPage(1);
    loadExams(1);
  }, [studentTab]);

  const handleTabChange = (tab: 'exams' | 'results') => {
    if (tab !== studentTab) setStudentTab(tab);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadExams(1, true);
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      loadExams(page + 1);
    }
  };

  const handleExamPress = (exam: OnlineExamListItem) => {
    if (isStudent) {
      // Student: take exam or view results
      if (exam.isAnswered && exam.isShowCorrectAnswers) {
        navigation.navigate('ExamResult', { examId: exam.id });
      } else {
        navigation.navigate('ExamTaking', { examId: exam.id });
      }
    } else {
      // Teacher/Admin: preview exam details
      navigation.navigate('ExamTaking', { examId: exam.id });
    }
  };

  const handleDeleteExam = (exam: OnlineExamListItem) => {
    Alert.alert(
      t('exams.deleteExam'),
      t('exams.deleteExamConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await examApi.deleteExam(exam.id);
              setExams(prev => prev.filter(e => e.id !== exam.id));
            } catch (err: any) {
              Alert.alert(t('common.error'), err?.userMessage || err?.message || t('exams.deleteFailed'));
            }
          },
        },
      ],
    );
  };

  const handleShareExam = async (exam: OnlineExamListItem) => {
    const link = `${API_CONFIG.CLIENT_URL}/pages/exams/portal/${exam.id}`;
    try {
      await Share.share({ message: `${exam.name}\n${link}` });
    } catch {}
  };

  const getExamTypeLabel = (onlineType?: number) => {
    return onlineType === 1 ? t('exams.scheduled') : t('exams.dynamic');
  };

  const getExamTypeIcon = (onlineType?: number) => {
    return onlineType === 1 ? 'calendar-outline' : 'flash-outline';
  };

  const renderExamCard = ({ item }: { item: OnlineExamListItem }) => {
    const isAnswered = item.isAnswered;

    return (
      <TouchableOpacity
        style={[styles.examCard, { backgroundColor: theme.colors.card }]}
        onPress={() => handleExamPress(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.examIconWrap, { backgroundColor: theme.colors.primary + '15' }]}>
          <Ionicons name="clipboard-outline" size={18} color={theme.colors.primary} />
        </View>
        <View style={styles.cardInfo}>
          <Text style={[styles.examName, { color: theme.colors.text }]} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={styles.metaRow}>
            <Ionicons name={getExamTypeIcon(item.onlineType) as any} size={11} color={theme.colors.textMuted} />
            <Text style={[styles.metaText, { color: theme.colors.textMuted }]}>
              {getExamTypeLabel(item.onlineType)}
            </Text>
            {item.durationInMin != null && (
              <>
                <Text style={[styles.metaDot, { color: theme.colors.textMuted }]}>·</Text>
                <Text style={[styles.metaText, { color: theme.colors.textMuted }]}>
                  {item.durationInMin} {t('exams.min')}
                </Text>
              </>
            )}
          </View>
        </View>
        {isStudent ? (
          isAnswered ? (
            <Ionicons name="checkmark-circle" size={20} color="#34C38F" />
          ) : (
            <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={18} color={theme.colors.textMuted} />
          )
        ) : (
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: theme.colors.primary + '15' }]}
              onPress={() => handleShareExam(item)}
              activeOpacity={0.7}
            >
              <Ionicons name="share-outline" size={16} color={theme.colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#FEE2E2' }]}
              onPress={() => handleDeleteExam(item)}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={16} color="#EF4444" />
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderHistoryCard = ({ item }: { item: ExamHistoryItem }) => {
    const passed = item.percentage >= 50;
    const accent = passed ? '#34C38F' : '#EF4444';
    return (
      <View style={[styles.examCard, { backgroundColor: theme.colors.card }]}>
        <View style={[styles.examIconWrap, { backgroundColor: accent + '15' }]}>
          <Ionicons name="ribbon-outline" size={18} color={accent} />
        </View>
        <View style={styles.cardInfo}>
          <Text style={[styles.examName, { color: theme.colors.text }]} numberOfLines={1}>
            {item.examName}
          </Text>
          <View style={styles.metaRow}>
            <Text style={[styles.metaText, { color: theme.colors.textMuted }]}>
              {item.correctAnswersCount}/{item.numberOfQuestions} {t('exams.correct')}
            </Text>
            {item.courseName ? (
              <>
                <Text style={[styles.metaDot, { color: theme.colors.textMuted }]}>·</Text>
                <Text style={[styles.metaText, { color: theme.colors.textMuted }]} numberOfLines={1}>
                  {item.courseName}
                </Text>
              </>
            ) : null}
          </View>
        </View>
        <View style={styles.historyScore}>
          <Text style={[styles.historyScoreText, { color: accent }]}>
            {item.studentScore}/{item.totalMarks}
          </Text>
          <Text style={[styles.historyPercent, { color: theme.colors.textMuted }]}>
            {Math.round(item.percentage)}%
          </Text>
        </View>
      </View>
    );
  };

  const showResults = isStudent && studentTab === 'results';
  const listEmpty = showResults ? history.length === 0 : exams.length === 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          {t('exams.title')}
        </Text>
      </View>

      {isStudent && (
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[
              styles.tabButton,
              { backgroundColor: studentTab === 'exams' ? theme.colors.primary : theme.colors.card },
            ]}
            onPress={() => handleTabChange('exams')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.tabButtonText,
                { color: studentTab === 'exams' ? '#fff' : theme.colors.textMuted },
              ]}
            >
              {t('exams.myExamsTab')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tabButton,
              { backgroundColor: studentTab === 'results' ? theme.colors.primary : theme.colors.card },
            ]}
            onPress={() => handleTabChange('results')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.tabButtonText,
                { color: studentTab === 'results' ? '#fff' : theme.colors.textMuted },
              ]}
            >
              {t('exams.resultsTab')}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {loading && listEmpty ? (
        <Spinner />
      ) : error && listEmpty ? (
        <ErrorRetry message={error} onRetry={() => loadExams()} />
      ) : listEmpty ? (
        <EmptyState
          icon={<Ionicons name="clipboard-outline" size={48} color={theme.colors.textMuted} />}
          title={showResults ? t('exams.noResults') : isStudent ? t('exams.noExamsAssigned') : t('exams.noExams')}
          description={
            showResults
              ? t('exams.noResultsMessage')
              : isStudent
              ? t('exams.noExamsAssignedMessage')
              : t('exams.noExamsMessage')
          }
        />
      ) : showResults ? (
        <FlatList
          data={history}
          keyExtractor={item => String(item.studentExamId)}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={9}
          renderItem={renderHistoryCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.colors.primary} />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
        />
      ) : (
        <FlatList
          data={exams}
          keyExtractor={item => String(item.id)}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={9}
          renderItem={renderExamCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.colors.primary} />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontFamily: 'Cairo_700Bold',
  },
  tabRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
  tabButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: 10,
    alignItems: 'center',
  },
  tabButtonText: {
    fontSize: fontSize.sm,
    fontFamily: 'Cairo_600SemiBold',
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 100,
    gap: spacing.sm,
  },
  examCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: spacing.md,
    gap: spacing.sm,
    
  },
  examIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: {
    flex: 1,
    gap: 2,
  },
  examName: {
    fontSize: fontSize.sm,
    fontFamily: 'Cairo_600SemiBold',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 10,
    fontFamily: 'Cairo_500Medium',
  },
  metaDot: {
    fontSize: 10,
  },
  historyScore: {
    alignItems: 'flex-end',
  },
  historyScoreText: {
    fontSize: fontSize.sm,
    fontFamily: 'Cairo_700Bold',
  },
  historyPercent: {
    fontSize: 10,
    fontFamily: 'Cairo_500Medium',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  actionBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
