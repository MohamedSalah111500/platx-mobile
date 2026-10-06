import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeProvider';
import { useRTL } from '../../i18n/RTLProvider';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { formatAmount } from '../../utils/price';
import { normalizeVoucherCode } from '../../utils/walletCode';
import { walletApi, type PayKind, type Wallet, type WalletPaymentResult } from '../../services/api/wallet.api';

interface Props {
  kind: PayKind;
  targetId: number;
  price: number;
  currencyCode?: string | null;
  onPaid: (result: WalletPaymentResult) => void;
  onError: (message: string) => void;
  onBusyChange?: (busy: boolean) => void;
}

const errorMessage = (err: any, fallback: string) => err?.response?.data?.message || err?.userMessage || fallback;

export function WalletPayCard({ kind, targetId, price, currencyCode, onPaid, onError, onBusyChange }: Props) {
  const { theme } = useTheme();
  const { t } = useRTL();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [busy, setBusy] = useState<'pay' | 'code' | null>(null);
  const [code, setCode] = useState('');
  const busyRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      walletApi
        .me()
        .then((me) => {
          if (!active) return;
          setWallet(me);
          setLoadFailed(false);
        })
        .catch(() => active && setLoadFailed(true));
      return () => {
        active = false;
      };
    }, [])
  );

  const startBusy = (value: 'pay' | 'code') => {
    busyRef.current = true;
    setBusy(value);
    onBusyChange?.(true);
  };

  const endBusy = () => {
    busyRef.current = false;
    setBusy(null);
    onBusyChange?.(false);
  };

  const sameCurrency = !currencyCode || !wallet || currencyCode.toUpperCase() === wallet.currencyCode?.toUpperCase();

  const pay = async (current: Wallet, redeemedAmount?: number) => {
    startBusy('pay');
    try {
      const result = await walletApi.pay(kind, targetId);
      setWallet({ ...current, balance: result.balance });
      onPaid(result);
    } catch (err) {
      const reason = errorMessage(err, t('wallet.payFailed'));
      onError(redeemedAmount ? `${t('wallet.redeemedBody', { amount: `${formatAmount(redeemedAmount)} ${t('wallet.points')}` })}\n${reason}` : reason);
    } finally {
      endBusy();
    }
  };

  const payWithBalance = () => {
    if (busyRef.current || !wallet || wallet.balance < price) return;
    pay(wallet);
  };

  const redeemAndPay = async () => {
    if (busyRef.current) return;
    const normalized = normalizeVoucherCode(code);
    if (!normalized) {
      onError(t('wallet.codeInvalid'));
      return;
    }
    startBusy('code');
    let updated: Wallet;
    let amount: number;
    try {
      const result = await walletApi.redeem(normalized);
      updated = { balance: result.balance, currencyCode: result.currencyCode };
      amount = result.amount;
      setWallet(updated);
      setCode('');
    } catch (err) {
      onError(errorMessage(err, t('wallet.codeInvalid')));
      endBusy();
      return;
    }
    endBusy();
    if (updated.balance >= price) {
      pay(updated, amount);
    } else {
      onError(t('wallet.codeAddedNotEnough', { amount: `${formatAmount(amount)} ${t('wallet.points')}` }));
    }
  };

  if (loadFailed) {
    return <Text style={[styles.notice, { color: theme.colors.textMuted }]}>{t('wallet.loadFailed')}</Text>;
  }
  if (!wallet) {
    return <ActivityIndicator color={theme.colors.primary} style={styles.loader} />;
  }
  if (!sameCurrency) {
    return <Text style={[styles.notice, { color: theme.colors.textMuted }]}>{t('wallet.currencyMismatch')}</Text>;
  }

  const enough = wallet.balance >= price;

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
      <View style={styles.row}>
        <View style={[styles.icon, { backgroundColor: theme.colors.primaryLight }]}>
          <Ionicons name="wallet" size={20} color={theme.colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: theme.colors.text }]}>{t('wallet.payTitle')}</Text>
          <Text style={[styles.muted, { color: theme.colors.textMuted }]}>
            {t('wallet.balance')}: {`${formatAmount(wallet.balance)} ${t('wallet.points')}`}
          </Text>
        </View>
      </View>

      {enough ? (
        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.colors.success }, !!busy && { opacity: 0.6 }]}
          onPress={payWithBalance}
          disabled={!!busy}
          activeOpacity={0.85}
          accessibilityRole="button"
        >
          {busy === 'pay' ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>{t('wallet.payButton', { amount: `${formatAmount(price)} ${t('wallet.points')}` })}</Text>
          )}
        </TouchableOpacity>
      ) : (
        <Text style={[styles.muted, styles.spaced, { color: theme.colors.textSecondary }]}>{t('wallet.notEnough')}</Text>
      )}

      <View style={[styles.codeBlock, { borderTopColor: theme.colors.border }]}>
        <Text style={[styles.codeLabel, { color: theme.colors.text }]}>{t('wallet.haveCode')}</Text>
        <TextInput
          style={[styles.input, { borderColor: theme.colors.inputBorder, backgroundColor: theme.colors.inputBackground, color: theme.colors.inputText }]}
          value={code}
          onChangeText={setCode}
          placeholder="ABCD-EFGH-JKMN"
          placeholderTextColor={theme.colors.inputPlaceholder}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={40}
          editable={!busy}
          accessibilityLabel={t('wallet.haveCode')}
          onSubmitEditing={redeemAndPay}
        />
        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.colors.primary }, (!code.trim() || !!busy) && { opacity: 0.6 }]}
          onPress={redeemAndPay}
          disabled={!code.trim() || !!busy}
          activeOpacity={0.85}
          accessibilityRole="button"
        >
          {busy === 'code' ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>{t('wallet.codeAndPay')}</Text>}
        </TouchableOpacity>
        <Text style={[styles.muted, styles.spaced, { color: theme.colors.textMuted }]}>{t('wallet.codeHint')}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.body,
    fontFamily: 'Cairo_600SemiBold',
  },
  muted: {
    ...typography.bodySmall,
  },
  spaced: {
    marginTop: spacing.sm,
  },
  notice: {
    ...typography.bodySmall,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  loader: {
    marginVertical: spacing.lg,
  },
  button: {
    marginTop: spacing.md,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  buttonText: {
    ...typography.button,
    color: '#FFFFFF',
  },
  codeBlock: {
    borderTopWidth: 1,
    marginTop: spacing.md,
    paddingTop: spacing.md,
  },
  codeLabel: {
    ...typography.body,
    fontFamily: 'Cairo_600SemiBold',
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    height: 50,
    paddingHorizontal: spacing.md,
    ...typography.body,
  },
});
