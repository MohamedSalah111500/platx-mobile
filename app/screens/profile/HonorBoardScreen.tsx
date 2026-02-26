import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Platform,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeProvider';
import { useRTL } from '../../i18n/RTLProvider';
import { Spinner } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography, fontSize } from '../../theme/typography';
import { studentsApi, type TopStudent } from '../../services/api/students.api';
import { getFullImageUrl } from '../../utils/imageUrl';
import type { ProfileStackParamList } from '../../types/navigation.types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'HonorBoard'>;

const ACCENT = '#7c63fd';

const MEDAL_COLORS = [
  { bg: '#FFF8E1', border: '#FFD54F', icon: '#F5A623', medal: 'trophy' },  // Gold
  { bg: '#F5F5F5', border: '#BDBDBD', icon: '#9E9E9E', medal: 'medal' },   // Silver
  { bg: '#FFF3E0', border: '#FFB74D', icon: '#E65100', medal: 'medal' },    // Bronze
];

const RANK_COLORS = [
  '#F0EDFF', '#E8F8F0', '#E8F4FD', '#FFF4E5', '#FCE8EC',
  '#F0EDFF', '#E8F8F0', '#E8F4FD', '#FFF4E5', '#FCE8EC',
];

export default function HonorBoardScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { t } = useRTL();
  const insets = useSafeAreaInsets();
  const [students, setStudents] = useState<TopStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await studentsApi.getTopStudents();
      setStudents(data.slice(0, 10));
    } catch (err) {
      console.error('[HonorBoard] Error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const renderTopThree = () => {
    if (students.length < 1) return null;
    const top3 = students.slice(0, 3);

    // Arrange as: 2nd | 1st | 3rd
    const ordered = [top3[1], top3[0], top3[2]].filter(Boolean);
    const podiumHeights = [100, 130, 80];

    return (
      <View style={styles.podiumContainer}>
        {/* Trophy header */}
        <View style={styles.podiumHeader}>
          <Ionicons name="trophy" size={28} color="#FFD54F" />
          <Text style={[styles.podiumTitle, { color: '#fff' }]}>
            {t('honorBoard.topStudents')}
          </Text>
        </View>

        <View style={styles.podiumRow}>
          {ordered.map((student, idx) => {
            if (!student) return <View key={`empty-${idx}`} style={styles.podiumSlot} />;
            const actualRank = idx === 0 ? 2 : idx === 1 ? 1 : 3;
            const medal = MEDAL_COLORS[actualRank - 1];
            const imageUrl = getFullImageUrl(student.profileImage);
            const name = `${student.firstName || ''} ${student.lastName || ''}`.trim();
            const initial = (student.firstName?.[0] || '?').toUpperCase();

            return (
              <View key={student.id} style={styles.podiumSlot}>
                {/* Avatar */}
                <View style={[styles.podiumAvatarWrap, { borderColor: medal.border }]}>
                  {imageUrl ? (
                    <Image source={{ uri: imageUrl }} style={styles.podiumAvatarImg} />
                  ) : (
                    <View style={[styles.podiumAvatarFallback, { backgroundColor: medal.bg }]}>
                      <Text style={[styles.podiumInitial, { color: medal.icon }]}>{initial}</Text>
                    </View>
                  )}
                  {/* Rank badge */}
                  <View style={[styles.rankBadge, { backgroundColor: medal.border }]}>
                    <Text style={styles.rankBadgeText}>{actualRank}</Text>
                  </View>
                </View>

                {/* Name */}
                <Text style={styles.podiumName} numberOfLines={1}>{name}</Text>

                {/* Points */}
                <Text style={styles.podiumPoints}>
                  {student.totalPoints ?? student.completedLessons ?? 0}
                </Text>

                {/* Podium block */}
                <View style={[styles.podiumBlock, { height: podiumHeights[idx], backgroundColor: medal.bg }]}>
                  {actualRank === 1 && (
                    <Ionicons name="trophy" size={24} color={medal.icon} style={{ marginTop: 8 }} />
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const renderStudent = ({ item, index }: { item: TopStudent; index: number }) => {
    if (index < 3) return null; // Top 3 shown in podium
    const rank = index + 1;
    const name = `${item.firstName || ''} ${item.lastName || ''}`.trim();
    const initial = (item.firstName?.[0] || '?').toUpperCase();
    const imageUrl = getFullImageUrl(item.profileImage);
    const bgColor = RANK_COLORS[index % RANK_COLORS.length];

    return (
      <View style={[styles.studentCard, { backgroundColor: theme.colors.card }]}>
        {/* Rank number */}
        <View style={[styles.rankCircle, { backgroundColor: theme.dark ? theme.colors.surface : bgColor }]}>
          <Text style={[styles.rankText, { color: theme.colors.text }]}>{rank}</Text>
        </View>

        {/* Avatar */}
        <View style={styles.studentAvatar}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.studentAvatarImg} />
          ) : (
            <View style={[styles.studentAvatarFallback, { backgroundColor: bgColor }]}>
              <Text style={[styles.studentInitial, { color: ACCENT }]}>{initial}</Text>
            </View>
          )}
        </View>

        {/* Name & info */}
        <View style={styles.studentInfo}>
          <Text style={[styles.studentName, { color: theme.colors.text }]} numberOfLines={1}>
            {name}
          </Text>
          <Text style={[styles.studentMeta, { color: theme.colors.textMuted }]}>
            {item.totalPoints != null
              ? t('honorBoard.points', { count: item.totalPoints })
              : t('honorBoard.lessons', { count: item.completedLessons ?? 0 })}
          </Text>
        </View>

        {/* Score badge */}
        <View style={[styles.scoreBadge, { backgroundColor: theme.dark ? theme.colors.surface : '#F0EDFF' }]}>
          <Ionicons name="star" size={12} color="#F5A623" />
          <Text style={styles.scoreText}>
            {item.totalPoints ?? item.completedLessons ?? 0}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.headerBg, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('honorBoard.title')}</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Top 3 podium */}
        {!loading && students.length > 0 && renderTopThree()}
      </View>

      {/* Rest of the list */}
      {loading ? (
        <Spinner />
      ) : students.length === 0 ? (
        <EmptyState
          icon="trophy-outline"
          title={t('honorBoard.noStudents')}
          message={t('honorBoard.noStudentsMessage')}
        />
      ) : (
        <FlatList
          data={students}
          renderItem={renderStudent}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={ACCENT}
              colors={[ACCENT]}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  // Header
  headerBg: {
    backgroundColor: ACCENT,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    paddingBottom: spacing.xl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: '#fff',
  },
  // Podium
  podiumContainer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
  podiumHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  podiumTitle: {
    fontSize: fontSize.base,
    fontWeight: '700',
  },
  podiumRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  podiumSlot: {
    flex: 1,
    alignItems: 'center',
  },
  podiumAvatarWrap: {
    width: 60,
    height: 60,
    borderRadius: 20,
    borderWidth: 3,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  podiumAvatarImg: {
    width: '100%',
    height: '100%',
  },
  podiumAvatarFallback: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  podiumInitial: {
    fontSize: 22,
    fontWeight: '800',
  },
  rankBadge: {
    position: 'absolute',
    bottom: -2,
    alignSelf: 'center',
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fff',
  },
  podiumName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
    maxWidth: 90,
    textAlign: 'center',
  },
  podiumPoints: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.8)',
    marginBottom: spacing.xs,
  },
  podiumBlock: {
    width: '100%',
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  // List
  listContent: {
    padding: spacing.xl,
    paddingBottom: 120,
    gap: spacing.sm,
  },
  studentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: 18,
    gap: spacing.md,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
      },
      android: { elevation: 1 },
    }),
  },
  rankCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankText: {
    fontSize: fontSize.sm,
    fontWeight: '800',
  },
  studentAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    overflow: 'hidden',
  },
  studentAvatarImg: {
    width: '100%',
    height: '100%',
  },
  studentAvatarFallback: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
  },
  studentInitial: {
    fontSize: 18,
    fontWeight: '700',
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginBottom: 2,
  },
  studentMeta: {
    fontSize: 11,
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  scoreText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F5A623',
  },
});
