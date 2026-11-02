import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeProvider';
import { useRTL } from '../../i18n/RTLProvider';
import { useDisplayFormat } from '../../hooks/useDisplayFormat';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';
import { QrCode } from '../ui/QrCode';
import { spacing, borderRadius } from '../../theme/spacing';
import { fontSize, typography } from '../../theme/typography';
import { guardianLinksApi } from '../../services/api/studentAccess.api';
import { parseServerDate } from '../../utils/date';
import type { GuardianLink, GuardianLinkCode } from '../../types/people.types';

import { sheetFrame } from '../../utils/responsive';
interface Props {
  visible: boolean;
  studentId: number;
  studentName: string;
  onClose: () => void;
}

export function GuardianLinkSheet({ visible, studentId, studentName, onClose }: Props) {
  const { theme } = useTheme();
  const { t } = useRTL();
  const { date } = useDisplayFormat();
  const insets = useSafeAreaInsets();
  const [code, setCode] = useState<GuardianLinkCode | null>(null);
  const [links, setLinks] = useState<GuardianLink[]>([]);
  const [linksLoading, setLinksLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  const loadLinks = useCallback(async () => {
    setLinksLoading(true);
    try {
      setLinks(await guardianLinksApi.getLinks(studentId));
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.userMessage || t('people.guardian.loadFailed'));
    } finally {
      setLinksLoading(false);
    }
  }, [studentId, t]);

  useEffect(() => {
    if (!visible) return;
    setCode(null);
    loadLinks();
  }, [visible, loadLinks]);

  const createCode = async () => {
    if (creating) return;
    setCreating(true);
    try {
      setCode(await guardianLinksApi.createCode(studentId));
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.userMessage || t('people.guardian.createFailed'));
    } finally {
      setCreating(false);
    }
  };

  const share = () => {
    if (!code) return;
    Share.share({ message: t('people.guardian.shareMessage', { name: studentName, code: code.code, link: code.link }) });
  };

  const revoke = (link: GuardianLink) =>
    Alert.alert(t('people.guardian.unlink'), t('people.guardian.unlinkConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('people.guardian.unlink'),
        style: 'destructive',
        onPress: async () => {
          try {
            await guardianLinksApi.revoke(studentId, link.id);
            setLinks((current) => current.filter((l) => l.id !== link.id));
            Alert.alert(t('common.success'), t('people.guardian.unlinked'));
          } catch (err: any) {
            Alert.alert(t('common.error'), err?.userMessage || t('people.guardian.unlinkFailed'));
          }
        },
      },
    ]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: theme.colors.card, paddingBottom: insets.bottom + spacing.lg }]}>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={[styles.title, { color: theme.colors.text }]}>{t('people.guardian.title')}</Text>
            <Text style={[styles.name, { color: theme.colors.textSecondary }]}>{studentName}</Text>
            <Text style={[styles.text, { color: theme.colors.textMuted }]}>{t('people.guardian.explanation')}</Text>

            {code ? (
              <View style={styles.codeBlock}>
                <View style={styles.qrFrame}>
                  <QrCode value={code.link} size={220} />
                </View>
                <Text style={[styles.code, { color: theme.colors.text }]}>{code.code}</Text>
                <Text style={[styles.text, { color: theme.colors.textMuted }]}>
                  {`${t('people.guardian.expiresAt')}: ${date(parseServerDate(code.expiresAt))}`}
                </Text>
                <View style={styles.row}>
                  <View style={styles.flex}>
                    <Button title={t('common.share')} onPress={share} fullWidth />
                  </View>
                  <View style={styles.flex}>
                    <Button title={t('people.guardian.newCode')} variant="secondary" onPress={createCode} loading={creating} fullWidth />
                  </View>
                </View>
              </View>
            ) : (
              <Button title={t('people.guardian.createCode')} onPress={createCode} loading={creating} fullWidth />
            )}

            <Text style={[styles.section, { color: theme.colors.textMuted }]}>{t('people.guardian.linkedTitle')}</Text>
            {linksLoading ? (
              <Spinner size="small" />
            ) : !links.length ? (
              <Text style={[styles.text, { color: theme.colors.textMuted }]}>{t('people.guardian.noLinks')}</Text>
            ) : (
              links.map((link) => (
                <View key={link.id} style={[styles.link, { borderColor: theme.colors.divider }]}>
                  <Ionicons name="person-circle-outline" size={28} color={theme.colors.primary} />
                  <View style={styles.flex}>
                    <Text style={[styles.linkTitle, { color: theme.colors.text }]}>
                      {`${t('people.guardian.linkedAt')}: ${date(parseServerDate(link.linkedAt))}`}
                    </Text>
                    <Text style={[styles.text, { color: theme.colors.textMuted }]}>
                      {link.lastSeenAt
                        ? `${t('people.guardian.lastSeen')}: ${date(parseServerDate(link.lastSeenAt))}`
                        : t('people.guardian.neverSeen')}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => revoke(link)}
                    accessibilityRole="button"
                    accessibilityLabel={t('people.guardian.unlink')}
                    hitSlop={8}
                  >
                    <Ionicons name="trash-outline" size={22} color={theme.colors.danger} />
                  </TouchableOpacity>
                </View>
              ))
            )}

            <Button title={t('common.close')} variant="ghost" onPress={onClose} fullWidth />
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { ...sheetFrame, maxHeight: '90%', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: spacing.lg },
  content: { paddingHorizontal: spacing.xl, gap: spacing.md },
  title: { ...typography.h3, textAlign: 'center' },
  name: { fontSize: fontSize.base, fontFamily: 'Cairo_600SemiBold', textAlign: 'center' },
  text: { fontSize: 14, fontFamily: 'Cairo_400Regular', textAlign: 'left' },
  codeBlock: { alignItems: 'center', gap: spacing.sm },
  qrFrame: { padding: spacing.md, backgroundColor: '#FFFFFF', borderRadius: borderRadius.lg },
  code: { fontSize: fontSize.xl, fontFamily: 'Cairo_700Bold', letterSpacing: 2 },
  row: { flexDirection: 'row', gap: spacing.sm, alignSelf: 'stretch' },
  section: { fontSize: 14, fontFamily: 'Cairo_700Bold', textAlign: 'left', marginTop: spacing.sm },
  link: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth },
  linkTitle: { fontSize: 14, fontFamily: 'Cairo_600SemiBold', textAlign: 'left' },
});

export default GuardianLinkSheet;
