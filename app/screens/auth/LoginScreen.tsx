import React, { useState, useEffect, useRef } from 'react';
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
  Image,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Ionicons from '@expo/vector-icons/Ionicons';
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

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_WEB_CLIENT_ID = '997004801769-ni3d4vb3d1g551vrj4ku9fsr99k1mhr6.apps.googleusercontent.com';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { login, googleLogin, isLoading, error, clearError, pendingTenants } = useAuthStore();
  const { t } = useRTL();

  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Domain modal for Google Sign-In
  const [domainModalVisible, setDomainModalVisible] = useState(false);
  const [domainInput, setDomainInput] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const pendingDomainRef = useRef<string>('');

  const discovery = {
    authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  };

  const redirectUri = AuthSession.makeRedirectUri();

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: GOOGLE_WEB_CLIENT_ID,
      scopes: ['profile', 'email'],
      responseType: AuthSession.ResponseType.Token,
      redirectUri,
      usePKCE: false,
    },
    discovery,
  );

  // Navigate to tenant selection when pendingTenants is set
  useEffect(() => {
    if (pendingTenants && pendingTenants.length > 0) {
      navigation.navigate('TenantSelection');
    }
  }, [pendingTenants, navigation]);

  // Handle Google OAuth response
  useEffect(() => {
    if (response?.type === 'success') {
      const accessToken = (response as any).params?.access_token;
      if (accessToken) {
        handleGoogleResponse(accessToken);
      } else {
        setGoogleLoading(false);
      }
    } else if (response?.type === 'error' || response?.type === 'dismiss') {
      setGoogleLoading(false);
    }
  }, [response]);

  const handleGoogleResponse = async (accessToken: string) => {
    try {
      // Fetch user info from Google
      const userInfoRes = await fetch('https://www.googleapis.com/userinfo/v2/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const userInfo = await userInfoRes.json();

      if (!userInfo?.id) throw new Error('Failed to get Google user info');

      await googleLogin(
        {
          id: userInfo.id,
          email: userInfo.email || '',
          name: userInfo.name || '',
          givenName: userInfo.given_name || '',
          familyName: userInfo.family_name || '',
          picture: userInfo.picture || '',
          accessToken,
          returnUrl: '',
          Domain: pendingDomainRef.current,
        },
        pendingDomainRef.current,
      );
    } catch (err: any) {
      // Error shown via store
    } finally {
      setGoogleLoading(false);
    }
  };

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

  const handleGoogleSignIn = () => {
    clearError();
    setDomainInput('');
    setDomainModalVisible(true);
  };

  const confirmDomainAndSignIn = async () => {
    const domain = domainInput.trim();
    if (!domain) return;
    pendingDomainRef.current = domain;
    setDomainModalVisible(false);
    setGoogleLoading(true);
    await promptAsync();
  };

  const styles = createStyles(theme);

  return (
    <GradientBackground>
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.formSection}>
          <View style={styles.logoWrap}>
            <Image
              source={require('../../../assets/images/logo-color.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
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

          <TouchableOpacity
            style={[styles.googleButton, (googleLoading || isLoading) && { opacity: 0.6 }]}
            onPress={handleGoogleSignIn}
            disabled={googleLoading || isLoading || !request}
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

      {/* Domain Modal for Google Sign-In */}
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
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.inputBackground,
                color: theme.colors.text,
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
    logoWrap: {
      alignItems: 'center',
      marginBottom: spacing.xl,
    },
    logo: {
      width: 140,
      height: 56,
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
      fontFamily: 'Cairo_700Bold',
      fontSize: 18,
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
