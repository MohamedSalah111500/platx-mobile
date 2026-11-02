import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeProvider';
import { useRTL } from '../../i18n/RTLProvider';
import { useDisplayFormat } from '../../hooks/useDisplayFormat';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { spacing, borderRadius } from '../../theme/spacing';
import { fontSize, typography } from '../../theme/typography';
import { bulkImportApi } from '../../services/api/students.api';
import { getToken } from '../../services/api/client';
import { parseServerDate } from '../../utils/date';
import {
  BULK_IMPORT_STATUS,
  type BulkImportJob,
  type BulkImportJobDetail,
  type PhotoAsset,
} from '../../types/people.types';
import type { ProfileStackParamList } from '../../types/navigation.types';

import { sheetFrame } from '../../utils/responsive';
type Props = NativeStackScreenProps<ProfileStackParamList, 'StudentsBulkImport'>;

const PAGE_SIZE = 10;
const POLL_INTERVAL_MS = 4000;
const TEMPLATE_NAME = 'students-import-template.xlsx';
const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const EXCEL_TYPES = [XLSX_TYPE, 'application/vnd.ms-excel'];

export default function StudentsBulkImportScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { t } = useRTL();
  const { date, time } = useDisplayFormat();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [jobs, setJobs] = useState<BulkImportJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [file, setFile] = useState<PhotoAsset | null>(null);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [detail, setDetail] = useState<BulkImportJobDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const jobsRef = useRef<BulkImportJob[]>([]);

  const loadJobs = useCallback(async (mode: 'initial' | 'refresh' | 'silent' = 'initial') => {
    if (mode === 'initial') setLoading(true);
    if (mode === 'refresh') setRefreshing(true);
    try {
      const res = await bulkImportApi.getJobs(1, PAGE_SIZE);
      jobsRef.current = res.items;
      setJobs(res.items);
    } catch {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadJobs();
    const handle = setInterval(() => {
      if (jobsRef.current.some((job) => job.status !== BULK_IMPORT_STATUS.Completed)) loadJobs('silent');
    }, POLL_INTERVAL_MS);
    return () => clearInterval(handle);
  }, [loadJobs]);

  const downloadTemplate = async () => {
    setDownloading(true);
    try {
      const token = await getToken();
      const target = `${FileSystem.cacheDirectory}${TEMPLATE_NAME}`;
      const res = await FileSystem.downloadAsync(bulkImportApi.templateUrl, target, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (res.status !== 200) throw new Error();
      await Sharing.shareAsync(res.uri, { mimeType: XLSX_TYPE, dialogTitle: t('people.bulkImport.downloadTemplate') });
    } catch {
      Alert.alert(t('common.error'), t('people.bulkImport.templateFailed'));
    } finally {
      setDownloading(false);
    }
  };

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: EXCEL_TYPES, copyToCacheDirectory: true });
    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];
    setFile({ uri: asset.uri, name: asset.name || TEMPLATE_NAME, type: asset.mimeType || XLSX_TYPE });
  };

  const upload = async () => {
    if (!file || uploading) return;
    setUploading(true);
    try {
      await bulkImportApi.upload(file);
      setFile(null);
      Alert.alert(t('common.success'), t('people.bulkImport.uploadSuccess'));
      loadJobs('silent');
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.userMessage || t('people.bulkImport.uploadFailed'));
    } finally {
      setUploading(false);
    }
  };

  const openDetail = async (job: BulkImportJob) => {
    setDetailLoading(true);
    setDetail({ ...job, rows: [] });
    try {
      setDetail(await bulkImportApi.getJob(job.id));
    } catch (err: any) {
      setDetail(null);
      Alert.alert(t('common.error'), err?.userMessage || t('people.loadFailed'));
    } finally {
      setDetailLoading(false);
    }
  };

  const statusLabel = (status: number) =>
    status === BULK_IMPORT_STATUS.Completed
      ? t('people.bulkImport.completed')
      : status === BULK_IMPORT_STATUS.Processing
      ? t('people.bulkImport.processing')
      : t('people.bulkImport.queued');

  const rowError = (message: string | null) => {
    if (!message) return '';
    const key = `people.bulkImport.errors.${message}`;
    const value = t(key);
    return value === key ? message : value;
  };

  const stamp = (value: string) => `${date(parseServerDate(value))} ${time(parseServerDate(value))}`;

  return (
    <View style={styles.container}>
      <ScreenHeader title={t('people.bulkImport.title')} onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing['3xl'] }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadJobs('refresh')}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
            progressBackgroundColor={theme.colors.card}
          />
        }
      >
        <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
          <Text style={styles.text}>{t('people.bulkImport.hint')}</Text>
          <Text style={styles.text}>{t('people.bulkImport.codeOnlyHint')}</Text>
          <Button title={t('people.bulkImport.downloadTemplate')} variant="secondary" onPress={downloadTemplate} loading={downloading} />
          <TouchableOpacity
            onPress={pickFile}
            activeOpacity={0.8}
            style={[styles.drop, { borderColor: theme.colors.border }]}
            accessibilityRole="button"
            accessibilityLabel={t('people.bulkImport.chooseFile')}
          >
            <Ionicons name="document-attach-outline" size={28} color={theme.colors.primary} />
            <Text style={styles.dropText} numberOfLines={1}>{file ? file.name : t('people.bulkImport.chooseFile')}</Text>
          </TouchableOpacity>
          <Button title={t('people.bulkImport.upload')} onPress={upload} loading={uploading} disabled={!file} />
        </View>

        <Text style={styles.section}>{t('people.bulkImport.history')}</Text>
        {loading ? (
          <Spinner size="small" />
        ) : !jobs.length ? (
          <Text style={styles.empty}>{t('people.bulkImport.empty')}</Text>
        ) : (
          jobs.map((job) => (
            <TouchableOpacity
              key={job.id}
              onPress={() => openDetail(job)}
              activeOpacity={0.8}
              style={[styles.card, { backgroundColor: theme.colors.card }]}
            >
              <View style={styles.rowTop}>
                <Text style={styles.title} numberOfLines={1}>{job.fileName}</Text>
                <Text style={[styles.status, { color: job.status === BULK_IMPORT_STATUS.Completed ? theme.colors.success : theme.colors.warning }]}>
                  {statusLabel(job.status)}
                </Text>
              </View>
              <Text style={styles.text}>
                {t('people.bulkImport.results', { total: job.totalRows, ok: job.succeededRows, failed: job.failedRows })}
              </Text>
              <Text style={styles.meta}>{[job.uploadedByName, stamp(job.creationTime)].filter(Boolean).join(' · ')}</Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <Modal visible={!!detail} transparent animationType="slide" onRequestClose={() => setDetail(null)} statusBarTranslucent>
        <Pressable style={styles.backdrop} onPress={() => setDetail(null)}>
          <Pressable style={[styles.sheet, { backgroundColor: theme.colors.card, paddingBottom: insets.bottom + spacing.lg }]}>
            <Text style={styles.sheetTitle}>{t('people.bulkImport.detailsTitle')}</Text>
            {detailLoading ? (
              <Spinner size="small" />
            ) : (
              <ScrollView contentContainerStyle={styles.sheetContent}>
                {detail?.rows.map((row) => (
                  <View key={row.rowNumber} style={[styles.detailRow, { borderBottomColor: theme.colors.divider }]}>
                    <Ionicons
                      name={row.isSuccess ? 'checkmark-circle' : 'close-circle'}
                      size={22}
                      color={row.isSuccess ? theme.colors.success : theme.colors.danger}
                    />
                    <View style={styles.flex}>
                      <Text style={styles.title}>{`${row.rowNumber}. ${row.firstName} ${row.lastName}`.trim()}</Text>
                      <Text style={styles.meta}>
                        {[row.email || t('people.bulkImport.noEmail'), row.studentCode].filter(Boolean).join(' · ')}
                      </Text>
                      {!row.isSuccess ? <Text style={[styles.meta, { color: theme.colors.danger }]}>{rowError(row.errorMessage)}</Text> : null}
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}
            <Button title={t('common.close')} variant="ghost" onPress={() => setDetail(null)} fullWidth />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function createStyles(theme: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    content: { paddingHorizontal: spacing.xl, gap: spacing.sm },
    flex: { flex: 1 },
    card: { borderRadius: borderRadius.xl, padding: spacing.md, gap: spacing.sm },
    text: { fontSize: 14, fontFamily: 'Cairo_400Regular', color: theme.colors.textSecondary, textAlign: 'left' },
    meta: { fontSize: 14, fontFamily: 'Cairo_400Regular', color: theme.colors.textMuted, textAlign: 'left' },
    title: { flex: 1, fontSize: fontSize.base, fontFamily: 'Cairo_700Bold', color: theme.colors.text, textAlign: 'left' },
    status: { fontSize: 14, fontFamily: 'Cairo_600SemiBold' },
    rowTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    drop: {
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      alignItems: 'center',
      gap: spacing.xs,
    },
    dropText: { fontSize: fontSize.sm, fontFamily: 'Cairo_600SemiBold', color: theme.colors.text },
    section: { fontSize: 14, fontFamily: 'Cairo_700Bold', color: theme.colors.textMuted, textAlign: 'left', marginTop: spacing.md },
    empty: { fontSize: fontSize.sm, fontFamily: 'Cairo_400Regular', color: theme.colors.textMuted, textAlign: 'center', paddingVertical: spacing.md },
    backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
    sheet: { ...sheetFrame, maxHeight: '85%', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: spacing.lg, paddingHorizontal: spacing.xl },
    sheetTitle: { ...typography.h3, color: theme.colors.text, textAlign: 'center', marginBottom: spacing.sm },
    sheetContent: { paddingBottom: spacing.md },
    detailRow: { flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth },
  });
}
