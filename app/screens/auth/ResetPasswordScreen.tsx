import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeProvider';
import { useAuthStore } from '../../store/auth.store';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import type { AuthStackParamList } from '../../types/navigation.types';
import { useRTL } from '../../i18n/RTLProvider';

type Props = NativeStackScreenProps<AuthStackParamList, 'ResetPassword'>;

export default function ResetPasswordScreen({ navigation, route }: Props) {
  const { token } = route.params;
  const { theme } = useTheme();
  const { resetPassword, isLoading, error, clearError } = useAuthStore();
  const { t } = useRTL();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!password.trim()) errors.password = t('auth.passwordRequired');
    else if (password.length < 6)
      errors.password = t('auth.passwordMinLength');
    if (password !== confirmPassword)
      errors.confirmPassword = t('auth.passwordsDoNotMatch');
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleReset = async () => {
    clearError();
    if (!validate()) return;

    try {
      await resetPassword(password, confirmPassword, token);
      Alert.alert(t('common.success'), t('auth.passwordResetSuccess'), [
        {
          text: t('common.ok'),
          onPress: () => navigation.navigate('Login', {}),
        },
      ]);
    } catch {
      // Error is set in store
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      flex: 1,
      padding: spacing['2xl'],
      justifyContent: 'center',
    },
    iconContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: theme.colors.primaryLight,
      justifyContent: 'center',
      alignItems: 'center',
      alignSelf: 'center',
      marginBottom: spacing['2xl'],
    },
    iconText: {
      fontSize: 36,
    },
    title: {
      ...typography.h3,
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: spacing.sm,
    },
    subtitle: {
      ...typography.body,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: spacing['3xl'],
    },
    errorBanner: {
      backgroundColor: theme.colors.danger + '15',
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      marginBottom: spacing.lg,
      borderLeftWidth: 3,
      borderLeftColor: theme.colors.danger,
    },
    errorText: {
      ...typography.bodySmall,
      color: theme.colors.danger,
    },
  });

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="key-outline" size={48} color={theme.colors.primary} />
        </View>

        <Text style={styles.title}>{t('auth.newPasswordTitle')}</Text>
        <Text style={styles.subtitle}>
          {t('auth.createStrongPassword')}
        </Text>

        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <Input
          label={t('auth.newPassword')}
          placeholder={t('auth.enterNewPassword')}
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            if (formErrors.password) setFormErrors((e) => ({ ...e, password: '' }));
          }}
          error={formErrors.password}
          secureTextEntry
        />

        <Input
          label={t('auth.confirmPassword')}
          placeholder={t('auth.reenterNewPassword')}
          value={confirmPassword}
          onChangeText={(text) => {
            setConfirmPassword(text);
            if (formErrors.confirmPassword)
              setFormErrors((e) => ({ ...e, confirmPassword: '' }));
          }}
          error={formErrors.confirmPassword}
          secureTextEntry
        />

        <Button
          title={t('auth.resetPassword')}
          onPress={handleReset}
          loading={isLoading}
          fullWidth
          size="large"
        />
      </View>
    </KeyboardAvoidingView>
  );
}
