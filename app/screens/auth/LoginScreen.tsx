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
let GoogleSignin: any = null;
let statusCodes: any = {};
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../theme/ThemeProvider';
import { useAuthStore } from '../../store/auth.store';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import type { AuthStackParamList } from '../../types/navigation.types';
import { useRTL } from '../../i18n/RTLProvider';

const GOOGLE_WEB_CLIENT_ID = '997004801769-ni3d4vb3d1g551vrj4ku9fsr99k1mhr6.apps.googleusercontent.com';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { login, googleLogin, isLoading, error, clearError } = useAuthStore();
  const { t, isRTL } = useRTL();

  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [domain, setDomain] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    try {
      GoogleSignin.configure({
        webClientId: GOOGLE_WEB_CLIENT_ID,
        offlineAccess: true,
      });
    } catch {
      // Google Sign-In native module not available (e.g. Expo Go)
    }
  }, []);

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!userName.trim()) errors.userName = t('auth.usernameRequired');
    if (!password.trim()) errors.password = t('auth.passwordRequired');
    if (!domain.trim()) errors.domain = t('auth.domainRequired');
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleLogin = async () => {
    clearError();
    if (!validate()) return;

    try {
      await login({ userName: userName.trim(), password, domain: domain.trim() });
    } catch {
      // Error is set in store
    }
  };

  const handleGoogleSignIn = async () => {
    if (!domain.trim()) {
      setFormErrors({ domain: t('auth.domainRequiredForGoogle') });
      return;
    }
    clearError();
    setGoogleLoading(true);
    try {
      // Check if Google Sign-In native module is available
      if (!GoogleSignin || typeof GoogleSignin.signIn !== 'function') {
        Alert.alert(t('common.error'), 'Google Sign-In is not available in this build');
        return;
      }
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      const userInfo = response.data;
      if (!userInfo?.user) throw new Error('No user info');

      const tokens = await GoogleSignin.getTokens();

      await googleLogin(
        {
          id: userInfo.user.id,
          email: userInfo.user.email,
          name: userInfo.user.name || '',
          givenName: userInfo.user.givenName || '',
          familyName: userInfo.user.familyName || '',
          picture: userInfo.user.photo || '',
          accessToken: tokens.accessToken,
          returnUrl: '',
          Domain: domain.trim(),
        },
        domain.trim(),
      );
    } catch (err: any) {
      if (err?.code === statusCodes.SIGN_IN_CANCELLED) {
        // User cancelled
      } else if (err?.code === statusCodes.IN_PROGRESS) {
        // Already in progress
      } else if (err?.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert(t('common.error'), 'Google Play Services not available');
      } else {
        if (!useAuthStore.getState().error) {
          useAuthStore.getState().clearError();
          Alert.alert(t('common.error'), t('auth.googleSignInFailed'));
        }
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.dark ? theme.colors.background : '#FFFFFF',
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
    errorBanner: {
      backgroundColor: theme.colors.danger + '15',
      borderRadius: borderRadius['2xl'],
      padding: spacing.md,
      marginBottom: spacing.lg,
      borderLeftWidth: 3,
      borderLeftColor: theme.colors.danger,
    },
    errorText: {
      ...typography.bodySmall,
      color: theme.colors.danger,
      textAlign: 'left',
    },
    forgotPassword: {
      alignSelf: 'flex-end',
      marginBottom: spacing.xl,
    },
    forgotPasswordText: {
      ...typography.bodySmall,
      color: '#7c63fd',
    },
    footer: {
      flexDirection: 'row',
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
      color: '#7c63fd',
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
    googleButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
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
      marginLeft: spacing.md,
    },
  });

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Form Section */}
        <View style={styles.formSection}>
          <Text style={styles.title}>{t('auth.loginTitle')}</Text>
          <Text style={styles.welcomeText}>{t('auth.signInToContinue')}</Text>

          {/* Error Banner */}
          {error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Form */}
          <Input
            label={t('auth.domain')}
            placeholder={t('auth.enterDomain')}
            value={domain}
            onChangeText={(text) => {
              setDomain(text);
              if (formErrors.domain) setFormErrors((e) => ({ ...e, domain: '' }));
            }}
            error={formErrors.domain}
            autoCapitalize="none"
            autoCorrect={false}
          />

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

          {/* Forgot Password */}
          <TouchableOpacity
            style={styles.forgotPassword}
            onPress={() => navigation.navigate('ForgotPassword')}
          >
            <Text style={styles.forgotPasswordText}>{t('auth.forgotPassword')}</Text>
          </TouchableOpacity>

          {/* Login Button */}
          <Button
            title={t('auth.signIn')}
            onPress={handleLogin}
            loading={isLoading}
            fullWidth
            size="large"
          />

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{t('auth.orContinueWith')}</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google Sign-In */}
          <TouchableOpacity
            style={[styles.googleButton, { opacity: googleLoading ? 0.7 : 1 }]}
            onPress={handleGoogleSignIn}
            disabled={googleLoading || isLoading}
            activeOpacity={0.7}
          >
            <Ionicons name="logo-google" size={20} color="#DB4437" />
            <Text style={styles.googleButtonText}>
              {googleLoading ? t('common.loading') : t('auth.signInWithGoogle')}
            </Text>
          </TouchableOpacity>

          {/* Sign Up Link */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>{t('auth.noAccount')} </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register', { domain })}>
              <Text style={styles.footerLink}>{t('auth.signUp')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
