import React, { useState } from 'react';
import { KeyboardAvoidingView, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeProvider';
import { useRTL } from '../../i18n/RTLProvider';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { formatAmount } from '../../utils/price';
import { WalletPayCard } from '../wallet/WalletPayCard';

export interface PartPurchase {
  kind: 'section' | 'lesson';
  id: number;
  title: string;
  price: number;
}

interface Props {
  purchase: PartPurchase | null;
  currencyCode?: string | null;
  onClose: () => void;
  onPaid: (purchase: PartPurchase) => void;
  onError: (message: string) => void;
}

export function PartPurchaseSheet({ purchase, currencyCode, onClose, onPaid, onError }: Props) {
  const { theme } = useTheme();
  const { t } = useRTL();
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);

  const close = () => {
    if (!busy) onClose();
  };

  return (
    <Modal visible={!!purchase} transparent animationType="slide" onRequestClose={close} statusBarTranslucent>
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <Pressable style={styles.backdrop} onPress={close}>
          <Pressable style={[styles.sheet, { backgroundColor: theme.colors.card, paddingBottom: insets.bottom + spacing.md }]}>
            {purchase && (
              <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
                <View style={styles.header}>
                  <Text style={[styles.title, { color: theme.colors.text }]}>
                    {t(purchase.kind === 'section' ? 'courses.parts.buySection' : 'courses.parts.buyLesson')}
                  </Text>
                  <TouchableOpacity onPress={close} disabled={busy} accessibilityRole="button" accessibilityLabel={t('common.close')}>
                    <Ionicons name="close" size={24} color={busy ? theme.colors.textMuted : theme.colors.text} />
                  </TouchableOpacity>
                </View>
                <Text style={[styles.partTitle, { color: theme.colors.text }]}>{purchase.title}</Text>
                <Text style={[styles.line, { color: theme.colors.textSecondary }]}>
                  {t('courses.parts.price')}: {`${formatAmount(purchase.price)} ${t('wallet.points')}`}
                </Text>
                <Text style={[styles.line, styles.hint, { color: theme.colors.textMuted }]}>{t('courses.parts.purchaseHint')}</Text>
                <WalletPayCard
                  kind={purchase.kind}
                  targetId={purchase.id}
                  price={purchase.price}
                  currencyCode={currencyCode}
                  onBusyChange={setBusy}
                  onPaid={() => onPaid(purchase)}
                  onError={onError}
                />
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    maxHeight: '90%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: spacing.lg,
  },
  content: {
    paddingHorizontal: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h3,
  },
  partTitle: {
    ...typography.body,
    fontFamily: 'Cairo_700Bold',
  },
  line: {
    ...typography.bodySmall,
    marginTop: spacing.xs,
  },
  hint: {
    marginBottom: spacing.md,
  },
});
