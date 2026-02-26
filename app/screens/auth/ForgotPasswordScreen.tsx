import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
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

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

export default function ForgotPasswordScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { forgotPassword, isLoading, error, clearError } = useAuthStore();
  const { t } = useRTL();

  const [username, setUsername] = useState('');
  const [domain, setDomain] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!username.trim()) errors.username = t('auth.usernameOrEmailRequired');
    if (!domain.trim()) errors.domain = t('auth.domainRequired');
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    clearError();
    if (!validate()) return;

    try {
      await forgotPassword(username.trim(), domain.trim());
      navigation.navigate('OTPVerification', {
        email: username.trim(),
        domain: domain.trim(),
        type: 'reset_password',
      });
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
    backLink: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: spacing.xl,
    },
    backText: {
      ...typography.body,
      color: theme.colors.primary,
      fontWeight: '600',
    },
  });

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="lock-closed-outline" size={48} color={theme.colors.primary} />
        </View>

        <Text style={styles.title}>{t('auth.forgotPasswordTitle')}</Text>
        <Text style={styles.subtitle}>
          {t('auth.forgotPasswordSubtitle')}
        </Text>

        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <Input
          label={t('auth.domain')}
          placeholder={t('auth.enterInstitutionDomain')}
          value={domain}
          onChangeText={(text) => {
            setDomain(text);
            if (formErrors.domain) setFormErrors((e) => ({ ...e, domain: '' }));
          }}
          error={formErrors.domain}
          autoCapitalize="none"
        />

        <Input
          label={t('auth.usernameOrEmail')}
          placeholder={t('auth.enterUsernameOrEmail')}
          value={username}
          onChangeText={(text) => {
            setUsername(text);
            if (formErrors.username) setFormErrors((e) => ({ ...e, username: '' }));
          }}
          error={formErrors.username}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <Button
          title={t('auth.sendResetCode')}
          onPress={handleSubmit}
          loading={isLoading}
          fullWidth
          size="large"
        />

        <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>{t('auth.backToSignIn')}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
