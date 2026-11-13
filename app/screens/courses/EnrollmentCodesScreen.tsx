import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeProvider';
import { useRTL } from '../../i18n/RTLProvider';
import { useDisplayFormat } from '../../hooks/useDisplayFormat';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { Spinner } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorRetry } from '../../components/ui/ErrorRetry';
import { Button } from '../../components/ui/Button';
import { Chip } from '../../components/ui/Chip';
import { Input } from '../../components/ui/Input';
import { DateField } from '../../components/ui/DateField';
import { SelectField } from '../../components/ui/SelectField';
import { QrCode } from '../../components/ui/QrCode';
import { spacing } from '../../theme/spacing';
import { fontSize, typography } from '../../theme/typography';
import { courseManageApi } from '../../services/api/courseManage.api';
import { parseServerDate } from '../../utils/date';
import {
  ENROLLMENT_TOKEN_STATUS,
  type EnrollmentToken,
  type EnrollmentTokenStats,
  type EnrollmentTokenStatus,
  type ManagedSection,
} from '../../types/course.types';
import type { HomeStackParamList } from '../../types/navigation.types';

import { sheetFrame } from '../../utils/responsive';
type Props = NativeStackScreenProps<HomeStackParamList, 'EnrollmentCodes'>;
type Scope = 'course' | 'section' | 'lesson';

const PAGE_SIZE = 20;
const QUANTITY_MAX = 2000;
const QUICK_QUANTITIES = [10, 50, 100, 500];
const QR_SIZE = 220;
const EXPIRY_YEARS_AHEAD = 5;

const serial = (token: EnrollmentToken) => `QR-${String(token.serial).padStart(4, '0')}`;

export default function EnrollmentCodesScreen({ navigation, route }: Props) {
  const { courseId, courseName } = route.params;
  const { theme } = useTheme();
  const { t } = useRTL();
  const { date } = useDisplayFormat();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [stats, setStats] = useState<EnrollmentTokenStats>({ total: 0, available: 0, used: 0, expired: 0 });
  const [items, setItems] = useState<EnrollmentToken[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<EnrollmentTokenStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<EnrollmentToken | null>(null);

  const [generateOpen, setGenerateOpen] = useState(false);
  const [quantity, setQuantity] = useState('10');
  const [expireAt, setExpireAt] = useState<string | null>(null);
  const [scope, setScope] = useState<Scope>('course');
  const [sections, setSections] = useState<ManagedSection[]>([]);
  const [sectionId, setSectionId] = useState<string | null>(null);
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [triedGenerate, setTriedGenerate] = useState(false);

  const load = useCallback(
    async (pageNum: number, mode: 'initial' | 'more' | 'refresh' = 'initial') => {
      if (mode === 'initial') setLoading(true);
      if (mode === 'more') setLoadingMore(true);
      if (mode === 'refresh') setRefreshing(true);
      setError(null);
      try {
        const [res, nextStats] = await Promise.all([
          courseManageApi.getTokens(courseId, pageNum, PAGE_SIZE, status),
          pageNum === 1 ? courseManageApi.getTokenStats(courseId) : Promise.resolve(null),
        ]);
        setItems((prev) => (pageNum === 1 ? res.items : [...prev, ...res.items]));
        setTotal(res.totalCount);
        setPage(pageNum);
        if (nextStats) setStats(nextStats);
      } catch (err: any) {
        setError(err?.userMessage || t('courseManage.codes.loadFailed'));
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [courseId, status, t]
  );

  useEffect(() => {
    load(1);
  }, [load]);

  useEffect(() => {
    courseManageApi.getSections(courseId).then(setSections).catch(() => setSections([]));
  }, [courseId]);

  const statusLabel = (value: EnrollmentTokenStatus) => t(`courseManage.codes.status${value}`);
  const statusColor = (value: EnrollmentTokenStatus) =>
    value === ENROLLMENT_TOKEN_STATUS.Available
      ? theme.colors.success
      : value === ENROLLMENT_TOKEN_STATUS.Used
      ? theme.colors.primary
      : theme.colors.textMuted;

  const filters: { value: EnrollmentTokenStatus | null; label: string; count: number }[] = [
    { value: null, label: t('courseManage.codes.all'), count: stats.total },
    { value: ENROLLMENT_TOKEN_STATUS.Available, label: statusLabel(ENROLLMENT_TOKEN_STATUS.Available), count: stats.available },
    { value: ENROLLMENT_TOKEN_STATUS.Used, label: statusLabel(ENROLLMENT_TOKEN_STATUS.Used), count: stats.used },
    { value: ENROLLMENT_TOKEN_STATUS.Expired, label: statusLabel(ENROLLMENT_TOKEN_STATUS.Expired), count: stats.expired },
  ];

  const sectionOptions = useMemo(() => sections.map((s) => ({ value: String(s.id), label: s.title })), [sections]);
  const lessonOptions = useMemo(
    () =>
      sections.flatMap((s) =>
        s.lessons.map((l) => ({ value: String(l.id), label: `${s.title} / ${l.title}` }))
      ),
    [sections]
  );

  const quantityValue = Number(quantity);
  const quantityError =
    !Number.isInteger(quantityValue) || quantityValue < 1 || quantityValue > QUANTITY_MAX
      ? t('courseManage.codes.quantityHint', { max: QUANTITY_MAX })
      : undefined;
  const scopeError =
    (scope === 'section' && !sectionId) || (scope === 'lesson' && !lessonId) ? t('validation.required') : undefined;

  const openGenerate = () => {
    setQuantity('10');
    setExpireAt(null);
    setScope('course');
    setSectionId(null);
    setLessonId(null);
    setTriedGenerate(false);
    setGenerateOpen(true);
  };

  const generate = async () => {
    setTriedGenerate(true);
    if (quantityError || scopeError || generating) return;
    setGenerating(true);
    try {
      await courseManageApi.generateTokens(courseId, {
        quantity: quantityValue,
        expireAt,
        courseSectionId: scope === 'section' ? Number(sectionId) : null,
        courseLessonId: scope === 'lesson' ? Number(lessonId) : null,
      });
      setGenerateOpen(false);
      Alert.alert(t('common.success'), t('courseManage.codes.generated'));
      load(1);
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.userMessage || t('courseManage.codes.generateFailed'));
    } finally {
      setGenerating(false);
    }
  };

  const share = (token: EnrollmentToken) =>
    Share.share({ message: `${courseName ?? ''}\n${serial(token)}\n${token.redeemUrl}`.trim() }).catch(() => undefined);

  const deactivate = async (token: EnrollmentToken) => {
    try {
      await courseManageApi.deactivateToken(token.id);
      setSelected(null);
      load(1);
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.userMessage || t('courseManage.codes.actionFailed'));
    }
  };

  const confirmDelete = (token: EnrollmentToken) =>
    Alert.alert(t('courseManage.codes.deleteTitle'), t('courseManage.codes.deleteConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await courseManageApi.removeToken(token.id);
            setSelected(null);
            load(1);
          } catch (err: any) {
            Alert.alert(t('common.error'), err?.userMessage || t('courseManage.codes.actionFailed'));
          }
        },
      },
    ]);

  const target = (token: EnrollmentToken) =>
    token.courseSectionId || token.courseLessonId
      ? token.targetTitle || t('courseManage.codes.targetDeleted')
      : t('courseManage.codes.scopeCourse');

  const renderItem = ({ item }: { item: EnrollmentToken }) => (
    <TouchableOpacity style={styles.card} onPress={() => setSelected(item)} activeOpacity={0.7} accessibilityRole="button">
      <View style={styles.qrIcon}>
        <Ionicons name="qr-code-outline" size={24} color={theme.colors.primary} />
      </View>
      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <Text style={styles.serial}>{serial(item)}</Text>
          <View style={[styles.pill, { backgroundColor: statusColor(item.status) + '1A' }]}>
            <Text style={[styles.pillText, { color: statusColor(item.status) }]}>{statusLabel(item.status)}</Text>
          </View>
        </View>
        <Text style={styles.meta} numberOfLines={1}>{target(item)}</Text>
        {item.usedByStudentName ? (
          <Text style={styles.meta} numberOfLines={1}>
            {t('courseManage.codes.usedBy', { name: item.usedByStudentName })}
          </Text>
        ) : null}
        <Text style={styles.meta}>
          {item.expireAt
            ? t('courseManage.codes.expiresOn', { date: date(parseServerDate(item.expireAt)) })
            : t('courseManage.codes.noExpiry')}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={t('courseManage.codes.title')}
        onBack={() => navigation.goBack()}
        rightElement={
          <TouchableOpacity
            onPress={openGenerate}
            style={styles.addButton}
            accessibilityRole="button"
            accessibilityLabel={t('courseManage.codes.generate')}
          >
            <Ionicons name="add" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        }
      />
      <View style={styles.headerBlock}>
        {courseName ? <Text style={styles.courseName} numberOfLines={1}>{courseName}</Text> : null}
        <Text style={styles.meta}>{t('courseManage.codes.subtitle')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {filters.map((f) => (
            <Chip key={String(f.value)} label={`${f.label} (${f.count})`} active={status === f.value} onPress={() => setStatus(f.value)} />
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <Spinner />
      ) : error ? (
        <ErrorRetry message={error} onRetry={() => load(1)} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + spacing['3xl'] }]}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          onEndReached={() => {
            if (!loadingMore && items.length < total) load(page + 1, 'more');
          }}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(1, 'refresh')}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
              progressBackgroundColor={theme.colors.card}
            />
          }
          ListEmptyComponent={
            <EmptyState
              title={t('courseManage.codes.empty')}
              message={t('courseManage.codes.emptyHint')}
              actionLabel={t('courseManage.codes.generate')}
              onAction={openGenerate}
            />
          }
          ListFooterComponent={loadingMore ? <Spinner size="small" /> : null}
          showsVerticalScrollIndicator={false}
        />
      )}

      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)} statusBarTranslucent>
        <Pressable style={styles.backdrop} onPress={() => setSelected(null)}>
          <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + spacing.md }]}>
            {selected ? (
              <ScrollView contentContainerStyle={styles.sheetContent}>
                <Text style={styles.sheetTitle}>{serial(selected)}</Text>
                <View style={styles.qrWrap}>
                  <QrCode value={selected.redeemUrl || selected.token} size={QR_SIZE} />
                </View>
                <Text style={[styles.pillText, { color: statusColor(selected.status), textAlign: 'center' }]}>
                  {statusLabel(selected.status)}
                </Text>
                <Text style={[styles.meta, styles.center]}>{target(selected)}</Text>
                {selected.usedByStudentName ? (
                  <Text style={[styles.meta, styles.center]}>
                    {t('courseManage.codes.usedBy', { name: selected.usedByStudentName })}
                    {selected.usedAt ? ` · ${date(parseServerDate(selected.usedAt))}` : ''}
                  </Text>
                ) : null}
                <Button
                  title={t('common.share')}
                  onPress={() => share(selected)}
                  icon={<Ionicons name="share-outline" size={18} color="#FFFFFF" />}
                  fullWidth
                />
                {selected.status === ENROLLMENT_TOKEN_STATUS.Available ? (
                  <Button title={t('courseManage.codes.deactivate')} variant="secondary" onPress={() => deactivate(selected)} fullWidth />
                ) : null}
                <Button title={t('common.delete')} variant="danger" onPress={() => confirmDelete(selected)} fullWidth />
              </ScrollView>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={generateOpen} transparent animationType="slide" onRequestClose={() => setGenerateOpen(false)} statusBarTranslucent>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={styles.backdrop} onPress={() => setGenerateOpen(false)}>
            <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + spacing.md }]}>
              <ScrollView contentContainerStyle={styles.sheetContent} keyboardShouldPersistTaps="handled">
                <Text style={styles.sheetTitle}>{t('courseManage.codes.generate')}</Text>
                <Input
                  label={t('courseManage.codes.quantity')}
                  value={quantity}
                  onChangeText={setQuantity}
                  keyboardType="number-pad"
                  hint={t('courseManage.codes.quantityHint', { max: QUANTITY_MAX })}
                  error={triedGenerate ? quantityError : undefined}
                />
                <View style={styles.quick}>
                  {QUICK_QUANTITIES.map((q) => (
                    <Chip key={q} label={String(q)} active={quantityValue === q} onPress={() => setQuantity(String(q))} />
                  ))}
                </View>
                <DateField
                  label={t('courseManage.codes.expiry')}
                  value={expireAt}
                  onChange={setExpireAt}
                  yearsAhead={EXPIRY_YEARS_AHEAD}
                  earliestYear={new Date().getFullYear()}
                  clearable
                />
                <Text style={styles.label}>{t('courseManage.codes.scope')}</Text>
                <View style={styles.quick}>
                  {(['course', 'section', 'lesson'] as Scope[]).map((value) => (
                    <Chip
                      key={value}
                      label={t(`courseManage.codes.scope_${value}`)}
                      active={scope === value}
                      onPress={() => setScope(value)}
                    />
                  ))}
                </View>
                {scope === 'section' ? (
                  <SelectField
                    label={t('courseManage.codes.chooseSection')}
                    placeholder={t('courseManage.codes.chooseSection')}
                    value={sectionId}
                    options={sectionOptions}
                    onChange={setSectionId}
                    error={triedGenerate ? scopeError : undefined}
                  />
                ) : null}
                {scope === 'lesson' ? (
                  <SelectField
                    label={t('courseManage.codes.chooseLesson')}
                    placeholder={t('courseManage.codes.chooseLesson')}
                    value={lessonId}
                    options={lessonOptions}
                    onChange={setLessonId}
                    error={triedGenerate ? scopeError : undefined}
                  />
                ) : null}
                <Button title={t('courseManage.codes.generate')} onPress={generate} loading={generating} fullWidth />
              </ScrollView>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function createStyles(theme: any) {
  return StyleSheet.create({
    flex: { flex: 1 },
    container: { flex: 1, backgroundColor: theme.colors.background },
    addButton: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primary },
    headerBlock: { paddingHorizontal: spacing.xl, gap: spacing.sm, paddingBottom: spacing.md },
    courseName: { fontSize: fontSize.base, fontFamily: 'Cairo_600SemiBold', color: theme.colors.textSecondary, textAlign: 'left' },
    chips: { gap: spacing.sm },
    list: { paddingHorizontal: spacing.xl, paddingTop: spacing.xs },
    card: { flexDirection: 'row', gap: spacing.md, backgroundColor: theme.colors.card, borderRadius: 18, padding: spacing.md },
    qrIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: theme.colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
    cardBody: { flex: 1, gap: 2 },
    cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
    serial: { fontSize: fontSize.base, fontFamily: 'Cairo_700Bold', color: theme.colors.text },
    pill: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: 999 },
    pillText: { fontSize: fontSize.sm, fontFamily: 'Cairo_600SemiBold' },
    meta: { fontSize: fontSize.sm, fontFamily: 'Cairo_400Regular', color: theme.colors.textMuted, textAlign: 'left' },
    center: { textAlign: 'center' },
    label: { fontSize: fontSize.sm, fontFamily: 'Cairo_600SemiBold', color: theme.colors.text, textAlign: 'left' },
    backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
    sheet: { ...sheetFrame, maxHeight: '90%', backgroundColor: theme.colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: spacing.lg },
    sheetContent: { paddingHorizontal: spacing.xl, gap: spacing.md },
    sheetTitle: { ...typography.h3, color: theme.colors.text, textAlign: 'center' },
    qrWrap: { alignSelf: 'center', padding: spacing.md, backgroundColor: '#FFFFFF', borderRadius: 16 },
    quick: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  });
}
