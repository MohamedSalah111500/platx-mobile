import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Modal,
  TextInput,
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
  } = useAuthStore();
  const { t } = useRTL();
  const insets = useSafeAreaInsets();

  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Academy domain modal shared by Google and Apple sign-in
  const [domainModalVisible, setDomainModalVisible] = useState(false);
  const [domainInput, setDomainInput] = useState('');
  const [externalProvider, setExternalProvider] = useState<ExternalProvider>('google');
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

  const openDomainModal = (provider: ExternalProvider) => {
    clearError();
    setExternalProvider(provider);
    setDomainInput('');
    setDomainModalVisible(true);
  };

  const confirmDomainAndSignIn = async () => {
    const domain = domainInput.trim();
    if (!domain) return;
    setDomainModalVisible(false);
    const setProviderLoading = externalProvider === 'apple' ? setAppleLoading : setGoogleLoading;
    setProviderLoading(true);
    try {
      await (externalProvider === 'apple' ? appleLogin(domain) : googleLogin(domain));
    } finally {
      setProviderLoading(false);
    }
  };

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
                onPress={() => openDomainModal('apple')}
              />
            </View>
          )}

          <TouchableOpacity
            style={[styles.googleButton, externalBusy && { opacity: 0.6 }]}
            onPress={() => openDomainModal('google')}
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
        </View>
      </ScrollView>

      {/* Academy domain modal for Google / Apple sign-in */}
      <Modal
        visible={domainModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDomainModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              {t('auth.domain')}
            </Text>
            <Text style={[styles.modalSubtitle, { color: theme.colors.textMuted }]}>
              {t('auth.enterDomain')}
            </Text>
            <TextInput
              style={[styles.domainInput, {
                borderColor: theme.colors.inputBorder,
                backgroundColor: theme.colors.inputBackground,
                color: theme.colors.inputText,
              }]}
              placeholder={t('auth.domainPlaceholder') || 'e.g. school'}
              placeholderTextColor={theme.colors.inputPlaceholder}
              value={domainInput}
              onChangeText={setDomainInput}
              autoCapitalize="none"
              autoCorrect={false}
              onSubmitEditing={confirmDomainAndSignIn}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { borderColor: theme.colors.border }]}
                onPress={() => setDomainModalVisible(false)}
              >
                <Text style={[styles.modalBtnText, { color: theme.colors.textSecondary }]}>
                  {t('common.cancel')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnPrimary, { backgroundColor: theme.colors.primary }]}
                onPress={confirmDomainAndSignIn}
                disabled={!domainInput.trim()}
              >
                <Text style={[styles.modalBtnText, { color: '#fff' }]}>
                  {t('common.continue') || 'Continue'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
      paddingBottom: spacing['2xl'],
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
    // Domain Modal
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing['2xl'],
    },
    modalCard: {
      width: '100%',
      borderRadius: 20,
      padding: spacing['2xl'],
    },
    modalTitle: {
      ...typography.headerTitle,
      marginBottom: spacing.xs,
    },
    modalSubtitle: {
      fontFamily: 'Cairo_400Regular',
      fontSize: 14,
      marginBottom: spacing.lg,
    },
    domainInput: {
      borderWidth: 1.5,
      borderRadius: 12,
      paddingHorizontal: spacing.md,
      paddingVertical: 12,
      fontSize: 15,
      fontFamily: 'Cairo_400Regular',
      marginBottom: spacing.lg,
    },
    modalActions: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    modalBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalBtnPrimary: {
      borderWidth: 0,
    },
    modalBtnText: {
      fontFamily: 'Cairo_600SemiBold',
      fontSize: 15,
    },
  });
}
