import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Platform,
  Image,
  Modal,
  FlatList,
  TextInput,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeProvider';
import { useAuth } from '../../hooks/useAuth';
import { useRTL } from '../../i18n/RTLProvider';
import { Spinner } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { spacing, borderRadius } from '../../theme/spacing';
import { fontSize } from '../../theme/typography';
import { honorBoardApi, type HonorBoardEntry } from '../../services/api/honor-board.api';
import { studentsApi, type TopStudent } from '../../services/api/students.api';
import { getFullImageUrl } from '../../utils/imageUrl';
import type { ProfileStackParamList } from '../../types/navigation.types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'HonorBoard'>;

const ACCENT = '#7c63fd';

const MEDAL_COLORS = [
  { bg: '#FFF8E1', border: '#FFD54F', icon: '#F5A623' }, // Gold  - Rank 1
  { bg: '#F5F5F5', border: '#BDBDBD', icon: '#9E9E9E' }, // Silver - Rank 2
  { bg: '#FFF3E0', border: '#FFB74D', icon: '#E65100' }, // Bronze - Rank 3
];

const RANK_COLORS = [
  '#F0EDFF', '#E8F8F0', '#E8F4FD', '#FFF4E5', '#FCE8EC',
  '#F0EDFF', '#E8F8F0', '#E8F4FD', '#FFF4E5', '#FCE8EC',
];

const PYRAMID_ROWS = [
  { ranks: [1], label: 'top' },
  { ranks: [2, 3], label: 'second' },
  { ranks: [4, 5, 6], label: 'third' },
  { ranks: [7, 8, 9, 10], label: 'fourth' },
];

export default function HonorBoardScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { isStaff, isAdmin } = useAuth();
  const { t, isRTL } = useRTL();
  const insets = useSafeAreaInsets();
  const isTeacher = isStaff || isAdmin;

  const now = new Date();
  const [currentMonth, setCurrentMonth] = useState(now.getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [entries, setEntries] = useState<HonorBoardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Add student modal state (teacher only)
  const [showAddModal, setShowAddModal] = useState(false);
  const [allStudents, setAllStudents] = useState<TopStudent[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<TopStudent | null>(null);
  const [selectedRank, setSelectedRank] = useState(1);
  const [adding, setAdding] = useState(false);

  const loadData = useCallback(async (month: number, year: number) => {
    try {
      const data = await honorBoardApi.getRankings(month, year);
      setEntries(data);
    } catch (err) {
      console.error('[HonorBoard] Error:', err);
      setEntries([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    loadData(currentMonth, currentYear);
  }, [currentMonth, currentYear, loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData(currentMonth, currentYear);
  };

  const navigateMonth = (direction: number) => {
    let newMonth = currentMonth + direction;
    let newYear = currentYear;
    if (newMonth > 12) {
      newMonth = 1;
      newYear++;
    } else if (newMonth < 1) {
      newMonth = 12;
      newYear--;
    }
    setCurrentMonth(newMonth);
    setCurrentYear(newYear);
  };

  const getMonthName = (): string => {
    return t(`months.m${currentMonth}`);
  };

  const openAddModal = async () => {
    setShowAddModal(true);
    setSelectedStudent(null);
    setStudentSearch('');
    // Find next available rank
    const usedRanks = new Set(entries.map((e) => e.rank));
    for (let r = 1; r <= 10; r++) {
      if (!usedRanks.has(r)) { setSelectedRank(r); break; }
    }
    try {
      const students = await studentsApi.getAll();
      setAllStudents(students);
    } catch {
      setAllStudents([]);
    }
  };

  const handleAddStudent = async () => {
    if (!selectedStudent) return;
    setAdding(true);
    try {
      // Build full students array: existing entries (excluding this rank) + new assignment
      const students = entries
        .filter((e) => e.rank !== selectedRank)
        .map((e) => ({ studentId: e.studentId, rank: e.rank }));

      students.push({
        studentId: selectedStudent.id,
        rank: selectedRank,
      });

      await honorBoardApi.saveRankings({
        month: currentMonth,
        year: currentYear,
        students,
      });
      setShowAddModal(false);
      loadData(currentMonth, currentYear);
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.userMessage || err?.message || 'Failed to add student');
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveEntry = (entry: HonorBoardEntry) => {
    Alert.alert(
      t('common.confirm'),
      `${t('common.delete')} ${entry.studentName}?`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              // Re-save without this student
              const students = entries
                .filter((e) => e.studentId !== entry.studentId)
                .map((e) => ({ studentId: e.studentId, rank: e.rank }));

              await honorBoardApi.saveRankings({
                month: currentMonth,
                year: currentYear,
                students,
              });
              loadData(currentMonth, currentYear);
            } catch {
              // silently fail
            }
          },
        },
      ],
    );
  };

  const filteredStudents = allStudents.filter((s) => {
    const name = `${s.firstName || ''} ${s.lastName || ''}`.toLowerCase();
    return name.includes(studentSearch.toLowerCase());
  });

  const getEntryForRank = (rank: number): HonorBoardEntry | undefined => {
    return entries.find((e) => e.rank === rank);
  };

  const getInitial = (name: string): string => {
    const parts = name.trim().split(/\s+/);
    return parts.map((p) => p[0] || '').join('').toUpperCase().slice(0, 2) || '?';
  };

  const renderRankCard = (rank: number) => {
    const entry = getEntryForRank(rank);
    const isTopThree = rank <= 3;
    const medal = isTopThree ? MEDAL_COLORS[rank - 1] : null;
    const bgColor = RANK_COLORS[(rank - 1) % RANK_COLORS.length];

    if (!entry) {
      // Empty slot
      return (
        <View
          key={`rank-${rank}`}
          style={[
            styles.rankCard,
            isTopThree && styles.rankCardTop,
            { backgroundColor: theme.dark ? theme.colors.surface : theme.colors.card },
          ]}
        >
          <View style={[
            styles.emptyRankBadge,
            { backgroundColor: medal?.border || (theme.dark ? theme.colors.surface : bgColor) },
          ]}>
            <Text style={[styles.emptyRankText, { color: medal ? '#fff' : theme.colors.textMuted }]}>
              {rank}
            </Text>
          </View>
          <Ionicons
            name="person-add-outline"
            size={isTopThree ? 28 : 22}
            color={theme.colors.textMuted}
            style={{ marginTop: spacing.xs }}
          />
          <Text style={[styles.emptyLabel, { color: theme.colors.textMuted }]}>
            —
          </Text>
        </View>
      );
    }

    const imageUrl = getFullImageUrl(entry.studentProfileImage);
    const initial = getInitial(entry.studentName);

    if (isTopThree) {
      return (
        <View
          key={`rank-${rank}`}
          style={[styles.rankCard, styles.rankCardTop]}
        >
          {/* Avatar */}
          <View style={[styles.topAvatarWrap, { borderColor: medal!.border }]}>
            {imageUrl ? (
              <Image source={{ uri: imageUrl }} style={styles.topAvatarImg} />
            ) : (
              <View style={[styles.topAvatarFallback, { backgroundColor: medal!.bg }]}>
                <Text style={[styles.topInitial, { color: medal!.icon }]}>{initial}</Text>
              </View>
            )}
            <View style={[styles.topRankBadge, { backgroundColor: medal!.border }]}>
              <Text style={styles.topRankBadgeText}>{rank}</Text>
            </View>
          </View>

          {/* Name */}
          <Text style={styles.topName} numberOfLines={1}>{entry.studentName}</Text>

          {/* Trophy for rank 1 */}
          {rank === 1 && (
            <Ionicons name="trophy" size={20} color="#FFD54F" style={{ marginTop: 2 }} />
          )}
        </View>
      );
    }

    // Ranks 4-10
    return (
      <View
        key={`rank-${rank}`}
        style={[
          styles.rankCard,
          { backgroundColor: theme.dark ? theme.colors.surface : theme.colors.card },
        ]}
      >
        <View style={[styles.lowerRankBadge, { backgroundColor: theme.dark ? theme.colors.background : bgColor }]}>
          <Text style={[styles.lowerRankText, { color: theme.colors.text }]}>{rank}</Text>
        </View>
        <View style={styles.lowerAvatar}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.lowerAvatarImg} />
          ) : (
            <View style={[styles.lowerAvatarFallback, { backgroundColor: bgColor }]}>
              <Text style={[styles.lowerInitialText, { color: ACCENT }]}>{initial}</Text>
            </View>
          )}
        </View>
        <Text style={[styles.lowerName, { color: theme.colors.text }]} numberOfLines={1}>
          {entry.studentName}
        </Text>
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
            <Ionicons name={isRTL ? 'chevron-forward' : 'chevron-back'} size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('honorBoard.title')}</Text>
          {isTeacher ? (
            <TouchableOpacity style={styles.backBtn} onPress={openAddModal}>
              <Ionicons name="add" size={22} color="#fff" />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 40 }} />
          )}
        </View>

        {/* Month Switcher */}
        <View style={styles.monthSwitcher}>
          <TouchableOpacity
            style={styles.monthBtn}
            onPress={() => navigateMonth(isRTL ? 1 : -1)}
          >
            <Ionicons name={isRTL ? 'chevron-forward' : 'chevron-back'} size={20} color="#fff" />
          </TouchableOpacity>
          <View style={styles.monthDisplay}>
            <Text style={styles.monthName}>{getMonthName()}</Text>
            <Text style={styles.monthYear}>{currentYear}</Text>
          </View>
          <TouchableOpacity
            style={styles.monthBtn}
            onPress={() => navigateMonth(isRTL ? -1 : 1)}
          >
            <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      {loading ? (
        <Spinner />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={ACCENT}
              colors={[ACCENT]}
            />
          }
        >
          {entries.length === 0 ? (
            <EmptyState
              icon={<Ionicons name="trophy-outline" size={48} color={theme.colors.textMuted} />}
              title={t('honorBoard.noStudents')}
              message={t('honorBoard.noStudentsMessage')}
            />
          ) : (
            <View style={styles.pyramidContainer}>
              {PYRAMID_ROWS.map((row) => (
                <View key={row.label} style={styles.pyramidRow}>
                  {row.ranks.map((rank) => renderRankCard(rank))}
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* ────── Add Student Modal (teacher only) ────── */}
      {isTeacher && (
        <Modal visible={showAddModal} animationType="slide" transparent>
          <View style={modalStyles.overlay}>
            <View style={[modalStyles.sheet, { backgroundColor: theme.colors.card }]}>
              {/* Modal header */}
              <View style={modalStyles.sheetHeader}>
                <Text style={[modalStyles.sheetTitle, { color: theme.colors.text }]}>
                  {t('honorBoard.title')}
                </Text>
                <TouchableOpacity onPress={() => setShowAddModal(false)}>
                  <Ionicons name="close" size={24} color={theme.colors.text} />
                </TouchableOpacity>
              </View>

              {/* Rank picker */}
              <Text style={[modalStyles.label, { color: theme.colors.textSecondary }]}>
                Rank
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
                {Array.from({ length: 10 }, (_, i) => i + 1).map((rank) => {
                  const taken = entries.some((e) => e.rank === rank);
                  return (
                    <TouchableOpacity
                      key={rank}
                      onPress={() => !taken && setSelectedRank(rank)}
                      style={[
                        modalStyles.rankChip,
                        {
                          backgroundColor: selectedRank === rank ? ACCENT : (taken ? theme.colors.surface : theme.colors.background),
                          opacity: taken ? 0.4 : 1,
                        },
                      ]}
                    >
                      <Text style={{
                        color: selectedRank === rank ? '#fff' : theme.colors.text,
                        fontWeight: '700',
                        fontSize: 13,
                      }}>
                        {rank}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Student search */}
              <View style={[modalStyles.searchRow, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
                <Ionicons name="search" size={18} color={theme.colors.textMuted} />
                <TextInput
                  style={[modalStyles.searchInput, { color: theme.colors.text }]}
                  placeholder={t('common.search')}
                  placeholderTextColor={theme.colors.textMuted}
                  value={studentSearch}
                  onChangeText={setStudentSearch}
                />
              </View>

              {/* Student list */}
              <FlatList
                data={filteredStudents}
                keyExtractor={(item) => item.id.toString()}
                style={{ maxHeight: 280 }}
                renderItem={({ item }) => {
                  const name = `${item.firstName || ''} ${item.lastName || ''}`.trim();
                  const isSelected = selectedStudent?.id === item.id;
                  return (
                    <TouchableOpacity
                      style={[
                        modalStyles.studentRow,
                        { backgroundColor: isSelected ? ACCENT + '15' : 'transparent' },
                      ]}
                      onPress={() => setSelectedStudent(item)}
                    >
                      <View style={[modalStyles.studentAvatar, { backgroundColor: '#F0EDFF' }]}>
                        <Text style={{ color: ACCENT, fontWeight: '700', fontSize: 13 }}>
                          {(item.firstName?.[0] || '?').toUpperCase()}
                        </Text>
                      </View>
                      <Text style={[modalStyles.studentName, { color: theme.colors.text }]} numberOfLines={1}>
                        {name}
                      </Text>
                      {isSelected && <Ionicons name="checkmark-circle" size={20} color={ACCENT} />}
                    </TouchableOpacity>
                  );
                }}
                ListEmptyComponent={
                  <Text style={{ color: theme.colors.textMuted, textAlign: 'center', padding: spacing.xl }}>
                    {t('common.noResults')}
                  </Text>
                }
              />

              {/* Add button */}
              <TouchableOpacity
                style={[modalStyles.addBtn, { opacity: selectedStudent ? 1 : 0.5 }]}
                disabled={!selectedStudent || adding}
                onPress={handleAddStudent}
              >
                {adding ? (
                  <Spinner size="small" />
                ) : (
                  <Text style={modalStyles.addBtnText}>{t('common.save')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
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

  // Month Switcher
  monthSwitcher: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    gap: spacing.md,
  },
  monthBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthDisplay: {
    alignItems: 'center',
    minWidth: 120,
  },
  monthName: {
    fontSize: fontSize.base,
    fontWeight: '700',
    color: '#fff',
  },
  monthYear: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },

  // Pyramid
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 120,
  },
  pyramidContainer: {
    gap: spacing.md,
  },
  pyramidRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },

  // Rank Cards
  rankCard: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: 18,
    minWidth: 80,
    flex: 1,
    maxWidth: 110,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },
  rankCardTop: {
    backgroundColor: 'transparent',
    elevation: 0,
    shadowOpacity: 0,
  },

  // Top 3 styles
  topAvatarWrap: {
    width: 64,
    height: 64,
    borderRadius: 22,
    borderWidth: 3,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  topAvatarImg: {
    width: '100%',
    height: '100%',
  },
  topAvatarFallback: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topInitial: {
    fontSize: 22,
    fontWeight: '800',
  },
  topRankBadge: {
    position: 'absolute',
    bottom: -2,
    alignSelf: 'center',
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topRankBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fff',
  },
  topName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#444',
    maxWidth: 90,
    textAlign: 'center',
    marginTop: 2,
  },

  // Empty slot
  emptyRankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyRankText: {
    fontSize: 13,
    fontWeight: '800',
  },
  emptyLabel: {
    fontSize: 12,
    marginTop: 4,
  },

  // Lower ranks (4-10)
  lowerRankBadge: {
    width: 28,
    height: 28,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  lowerRankText: {
    fontSize: 12,
    fontWeight: '800',
  },
  lowerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  lowerAvatarImg: {
    width: '100%',
    height: '100%',
  },
  lowerAvatarFallback: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
  },
  lowerInitialText: {
    fontSize: 16,
    fontWeight: '700',
  },
  lowerName: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    maxWidth: 80,
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.xl,
    maxHeight: '85%',
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  sheetTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  rankChip: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.xs,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    height: 44,
    marginBottom: spacing.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.sm,
    paddingVertical: 0,
  },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    gap: spacing.sm,
  },
  studentAvatar: {
    width: 34,
    height: 34,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  studentName: {
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  addBtn: {
    backgroundColor: ACCENT,
    borderRadius: 16,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  addBtnText: {
    color: '#fff',
    fontSize: fontSize.base,
    fontWeight: '700',
  },
});
