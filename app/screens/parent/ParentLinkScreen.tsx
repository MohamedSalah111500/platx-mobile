import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { StackActions, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeProvider';
import { useRTL } from '../../i18n/RTLProvider';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ErrorBanner } from '../../components/ui/ErrorBanner';
import { QrScannerModal } from '../../components/wallet/QrScannerModal';
import { useParentStore } from '../../store/parent.store';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { GUARDIAN_CODE_LENGTH as CODE_LENGTH, normalizeGuardianCode } from '../../utils/guardianCode';
import type { Theme } from '../../theme/themes';
import type { ParentStackParamList } from '../../types/navigation.types';

export default function ParentLinkScreen() {
  const navigation = useNavigation();
  const linkedCode = useRoute<RouteProp<ParentStackParamList, 'ParentLink'>>().params?.code;
  const { theme } = useTheme();
  const { t } = useRTL();
  const redeem = useParentStore((state) => state.redeem);
  const [adding] = useState(() => !!useParentStore.getState().token);
  const [code, setCode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busyRef = useRef(false);
  const autoSubmitted = useRef<string | null>(null);

  const submit = async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      setError(t('parent.codeRequired'));
      return;
    }
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      const linked = await redeem(trimmed);
      if (linked && adding) navigation.dispatch(StackActions.popTo('ParentHome'));
    } catch (err: any) {
      setError(
        err?.status === 429
          ? t('parent.tooManyAttempts')
          : err?.response?.data?.message || err?.userMessage || t('parent.linkFailed')
      );
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!linkedCode || autoSubmitted.current === linkedCode) return;
    autoSubmitted.current = linkedCode;
    const value = normalizeGuardianCode(linkedCode);
    setCode(value);
    submit(value);
  }, [linkedCode]);

  const onScanned = (value: string) => {
    setScanning(false);
    submit(value);
  };

  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={adding ? t('parent.addChildTitle') : t('parent.linkTitle')}
        onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
      />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={[styles.iconCircle, { backgroundColor: theme.colors.primary + '1F' }]}>
            <Ionicons name="people" size={36} color={theme.colors.primary} />
          </View>
          <Text style={styles.hint}>{t('parent.linkHint')}</Text>

          {!!error && <ErrorBanner message={error} />}

          <Button
            title={t('parent.scanQr')}
            onPress={() => setScanning(true)}
            disabled={busy}
            fullWidth
            size="large"
            icon={<Ionicons name="scan" size={20} color="#FFFFFF" />}
          />

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{t('parent.orEnterCode')}</Text>
            <View style={styles.dividerLine} />
          </View>

          <Input
            label={t('parent.codeLabel')}
            value={code}
            onChangeText={(text) => {
              setCode(normalizeGuardianCode(text));
              if (error) setError(null);
            }}
            placeholder="XXXXXXXXXX"
            autoCapitalize="characters"
            autoCorrect={false}
            style={styles.codeInput}
            returnKeyType="done"
            onSubmitEditing={() => code.length === CODE_LENGTH && submit(code)}
          />

          <Button
            title={t('parent.submit')}
            onPress={() => submit(code)}
            variant="secondary"
            loading={busy}
            disabled={code.length !== CODE_LENGTH}
            fullWidth
            size="large"
          />
        </ScrollView>
      </KeyboardAvoidingView>

      <QrScannerModal
        visible={scanning}
        onClose={() => setScanning(false)}
        onScanned={onScanned}
        hint={t('parent.scanHint')}
      />
    </View>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    flex: {
      flex: 1,
    },
    content: {
      padding: spacing['2xl'],
      paddingBottom: spacing['4xl'],
    },
    iconCircle: {
      width: 72,
      height: 72,
      borderRadius: 36,
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'center',
      marginBottom: spacing.lg,
    },
    hint: {
      ...typography.body,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: spacing.xl,
    },
    divider: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: spacing.xl,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: theme.colors.divider,
    },
    dividerText: {
      ...typography.bodySmall,
      color: theme.colors.textMuted,
      marginHorizontal: spacing.md,
    },
    codeInput: {
      textAlign: 'left',
      writingDirection: 'ltr',
      letterSpacing: 2,
      fontFamily: 'Cairo_600SemiBold',
    },
  });
}
