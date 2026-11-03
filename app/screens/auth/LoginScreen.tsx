import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useTheme } from '../../theme/ThemeProvider';
import { useAuthStore } from '../../store/auth.store';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import type { AuthStackParamList } from '../../types/navigation.types';
import { useRTL } from '../../i18n/RTLProvider';
import { ErrorBanner } from '../../components/ui/ErrorBanner';
import { GradientBackground } from '../../components/ui/GradientBackground';
import { isAppleSignInAvailable } from '../../services/auth/appleAuth';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

type ExternalProvider = 'google' | 'apple';

export default function LoginScreen({ navigation }: Props) {
  const { theme, isDark } = useTheme();
  const {
    login,
    googleLogin,
    appleLogin,
    isLoading,
    error,
    clearError,
    pendingTenants,
    pendingEmailConfirmation,
    clearPendingEmailConfirmation,
    pendingSignup,
    clearPendingSignup,
  } = useAuthStore();
  const { t } = useRTL();
  const insets = useSafeAreaInsets();

  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => {
    isAppleSignInAvailable().then(setAppleAvailable);
  }, []);

  // Navigate to tenant selection when pendingTenants is set
  useEffect(() => {
    if (pendingTenants && pendingTenants.length > 0) {
      navigation.navigate('TenantSelection');
    }
  }, [pendingTenants, navigation]);

  // Correct credentials but unconfirmed email: verify via OTP (then auto-login).
  useEffect(() => {
    if (!pendingEmailConfirmation) return;
    const { email, domain, password: pendingPassword } = pendingEmailConfirmation;
    clearPendingEmailConfirmation();
    navigation.navigate('OTPVerification', {
      email,
      domain,
      type: 'email_confirm',
      password: pendingPassword,
    });
  }, [pendingEmailConfirmation, navigation, clearPendingEmailConfirmation]);

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!userName.trim()) errors.userName = t('auth.usernameRequired');
    if (!password.trim()) errors.password = t('auth.passwordRequired');
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleLogin = async () => {
    clearError();
    if (!validate()) return;
    try {
      await login({ userName: userName.trim(), password });
    } catch {
      // Error is set in store
    }
  };

  const handleExternalSignIn = async (provider: ExternalProvider) => {
    clearError();
    const setProviderLoading = provider === 'apple' ? setAppleLoading : setGoogleLoading;
    setProviderLoading(true);
    try {
      await (provider === 'apple' ? appleLogin('login') : googleLogin('login'));
    } finally {
      setProviderLoading(false);
    }
  };

  // The provider verified the email but no account exists: offer to create one
  // instead of silently registering (the sign-up token carries the verified identity).
  useEffect(() => {
    if (!pendingSignup) return;
    Alert.alert(
      t('auth.notRegisteredTitle'),
      t('auth.notRegisteredMessage', {
        email: pendingSignup.email ? `\u2068${pendingSignup.email}\u2069` : t('auth.thisAccount'),
      }),
      [
        { text: t('common.cancel'), style: 'cancel', onPress: clearPendingSignup },
        { text: t('auth.createAccount'), onPress: () => navigation.navigate('Register', {}) },
      ],
      { cancelable: true, onDismiss: clearPendingSignup }
    );
  }, [pendingSignup, navigation, clearPendingSignup]);

  const externalBusy = googleLoading || appleLoading || isLoading;

  const styles = createStyles(theme);

  return (
    <GradientBackground>
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          // No header on this screen, so keep the form clear of the Dynamic Island / home indicator.
          { paddingTop: insets.top, paddingBottom: insets.bottom },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.formSection}>
          <Text style={styles.title}>{t('auth.loginTitle')}</Text>
          <Text style={styles.welcomeText}>{t('auth.signInToContinue')}</Text>

          {error && <ErrorBanner message={error} />}

          <Input
            label={t('auth.username')}
            placeholder={t('auth.enterUsername')}
            value={userName}
            onChangeText={(text) => {
              setUserName(text);
              if (formErrors.userName) setFormErrors((e) => ({ ...e, userName: '' }));
            }}
            error={formErrors.userName}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Input
            label={t('auth.password')}
            placeholder={t('auth.enterPassword')}
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (formErrors.password) setFormErrors((e) => ({ ...e, password: '' }));
            }}
            error={formErrors.password}
            secureTextEntry
          />

          <TouchableOpacity
            style={styles.forgotPassword}
            onPress={() => navigation.navigate('ForgotPassword')}
          >
            <Text style={[styles.forgotPasswordText, { color: theme.colors.primary }]}>
              {t('auth.forgotPassword')}
            </Text>
          </TouchableOpacity>

          <Button
            title={t('auth.signIn')}
            onPress={handleLogin}
            loading={isLoading}
            fullWidth
            size="large"
          />

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{t('auth.orContinueWith')}</Text>
            <View style={styles.dividerLine} />
          </View>

          {appleAvailable && (
            <View
              style={[styles.appleButtonWrap, externalBusy && { opacity: 0.6 }]}
              pointerEvents={externalBusy ? 'none' : 'auto'}
            >
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                buttonStyle={
                  isDark
                    ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                    : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
                }
                cornerRadius={borderRadius['2xl']}
                style={styles.appleButton}
                onPress={() => handleExternalSignIn('apple')}
              />
            </View>
          )}

          <TouchableOpacity
            style={[styles.googleButton, externalBusy && { opacity: 0.6 }]}
            onPress={() => handleExternalSignIn('google')}
            disabled={externalBusy}
            activeOpacity={0.7}
          >
            <Ionicons name="logo-google" size={20} color="#DB4437" />
            <Text style={styles.googleButtonText}>
              {googleLoading ? t('common.loading') : t('auth.signInWithGoogle')}
            </Text>
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>{t('auth.noAccount')} </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={[styles.footerLink, { color: theme.colors.primary }]}>
                {t('auth.signUp')}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.parentLink}
            onPress={() => {
              clearError();
              navigation.navigate('ParentLink');
            }}
            disabled={externalBusy}
            hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
          >
            <Text style={styles.parentLinkText}>{t('parent.loginLink')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

    </KeyboardAvoidingView>
    </GradientBackground>
  );
}

function createStyles(theme: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: 'center',
    },
    formSection: {
      padding: spacing['2xl'],
    },
    title: {
      ...typography.h3,
      color: theme.colors.text,
      fontFamily: 'Cairo_700Bold',
      marginBottom: spacing.xs,
      textAlign: 'center',
    },
    welcomeText: {
      ...typography.body,
      color: theme.colors.textSecondary,
      marginBottom: spacing.xl,
      textAlign: 'center',
    },
    forgotPassword: {
      alignSelf: 'flex-end',
      marginBottom: spacing.xl,
    },
    forgotPasswordText: {
      ...typography.bodySmall,
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: spacing['2xl'],
    },
    parentLink: {
      alignSelf: 'center',
      marginTop: spacing.lg,
      paddingBottom: spacing['2xl'],
    },
    parentLinkText: {
      ...typography.bodySmall,
      color: theme.colors.textSecondary,
      textDecorationLine: 'underline',
    },
    footerText: {
      ...typography.body,
      color: theme.colors.textSecondary,
    },
    footerLink: {
      ...typography.body,
      fontFamily: 'Cairo_600SemiBold',
    },
    divider: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: spacing.lg,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: theme.colors.divider,
    },
    dividerText: {
      ...typography.caption,
      color: theme.colors.textMuted,
      marginHorizontal: spacing.md,
    },
    appleButtonWrap: {
      marginBottom: spacing.md,
    },
    appleButton: {
      width: '100%',
      height: 50,
    },
    googleButton: {
      minHeight: 50,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.md,
      backgroundColor: theme.colors.card,
      borderRadius: borderRadius['2xl'],
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xl,
      borderWidth: 1,
      borderColor: theme.colors.divider,
    },
    googleButtonText: {
      ...typography.button,
      color: theme.colors.text,
    },
  });
}
