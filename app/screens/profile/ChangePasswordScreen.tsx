import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeProvider';
import { useRTL } from '../../i18n/RTLProvider';
import { spacing } from '../../theme/spacing';
import { typography, fontSize } from '../../theme/typography';
import { authApi } from '../../services/api/auth.api';
import type { ProfileStackParamList } from '../../types/navigation.types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'ChangePassword'>;

const ACCENT = '#7c63fd';
const BG = '#FFFFFF';

export default function ChangePasswordScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { t } = useRTL();
  const insets = useSafeAreaInsets();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const bgColor = theme.dark ? theme.colors.background : BG;

  const handleSubmit = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert(t('common.validation'), t('validation.required'));
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert(t('common.validation'), t('auth.passwordMinLength'));
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert(t('common.validation'), t('auth.passwordsDoNotMatch'));
      return;
    }
    setLoading(true);
    try {
      await authApi.changePassword({
        currentPassword,
        password: newPassword,
        confirmPassword,
      });
      Alert.alert(t('common.success'), t('auth.passwordResetSuccess'), [
        { text: t('common.ok'), onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.userMessage || err?.message || 'Failed to change password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: theme.colors.card }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={20} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          {t('auth.changePassword')}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 }}
        >
          {/* Lock icon */}
          <View style={styles.iconWrap}>
            <View style={[styles.iconCircle, { backgroundColor: '#F0EDFF' }]}>
              <Ionicons name="lock-closed" size={32} color={ACCENT} />
            </View>
          </View>

          {/* Form card */}
          <View style={[styles.formCard, { backgroundColor: theme.colors.card }]}>
            {/* Current password */}
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
              {t('auth.currentPassword')}
            </Text>
            <View style={[styles.inputRow, {
              backgroundColor: theme.dark ? theme.colors.inputBackground : '#F8F9FB',
              borderColor: theme.colors.inputBorder,
            }]}>
              <Ionicons name="key-outline" size={18} color={theme.colors.textMuted} />
              <TextInput
                style={[styles.input, { color: theme.colors.inputText }]}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry={!showCurrent}
                placeholder={t('auth.currentPassword')}
                placeholderTextColor={theme.colors.inputPlaceholder}
              />
              <TouchableOpacity onPress={() => setShowCurrent(!showCurrent)}>
                <Ionicons name={showCurrent ? 'eye-off-outline' : 'eye-outline'} size={20} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* New password */}
            <Text style={[styles.label, { color: theme.colors.textSecondary, marginTop: spacing.lg }]}>
              {t('auth.newPassword')}
            </Text>
            <View style={[styles.inputRow, {
              backgroundColor: theme.dark ? theme.colors.inputBackground : '#F8F9FB',
              borderColor: theme.colors.inputBorder,
            }]}>
              <Ionicons name="lock-closed-outline" size={18} color={theme.colors.textMuted} />
              <TextInput
                style={[styles.input, { color: theme.colors.inputText }]}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showNew}
                placeholder={t('auth.enterNewPassword')}
                placeholderTextColor={theme.colors.inputPlaceholder}
              />
              <TouchableOpacity onPress={() => setShowNew(!showNew)}>
                <Ionicons name={showNew ? 'eye-off-outline' : 'eye-outline'} size={20} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Confirm password */}
            <Text style={[styles.label, { color: theme.colors.textSecondary, marginTop: spacing.lg }]}>
              {t('auth.confirmPassword')}
            </Text>
            <View style={[styles.inputRow, {
              backgroundColor: theme.dark ? theme.colors.inputBackground : '#F8F9FB',
              borderColor: theme.colors.inputBorder,
            }]}>
              <Ionicons name="shield-checkmark-outline" size={18} color={theme.colors.textMuted} />
              <TextInput
                style={[styles.input, { color: theme.colors.inputText }]}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showNew}
                placeholder={t('auth.reenterNewPassword')}
                placeholderTextColor={theme.colors.inputPlaceholder}
              />
            </View>

            {/* Submit */}
            <TouchableOpacity
              style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Ionicons name="checkmark-circle" size={22} color="#fff" style={{ marginRight: spacing.sm }} />
              <Text style={styles.submitText}>
                {loading ? t('common.loading') : t('auth.changePassword')}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.h3,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  iconWrap: {
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formCard: {
    marginHorizontal: spacing.xl,
    borderRadius: 22,
    padding: spacing.xl,
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
  label: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: fontSize.base,
  },
  submitBtn: {
    backgroundColor: ACCENT,
    borderRadius: 16,
    paddingVertical: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing['2xl'],
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: {
    ...typography.button,
    color: '#fff',
    fontWeight: '700',
  },
});
