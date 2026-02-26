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
  TurboModuleRegistry,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
let GoogleSignin: any = null;
let statusCodes: any = {};
if (TurboModuleRegistry.get('RNGoogleSignin')) {
  const gsi = require('@react-native-google-signin/google-signin');
  GoogleSignin = gsi.GoogleSignin;
  statusCodes = gsi.statusCodes;
}
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

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export default function RegisterScreen({ navigation, route }: Props) {
  const { theme } = useTheme();
  const { register, googleLogin, isLoading, error, clearError } = useAuthStore();
  const { t } = useRTL();
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    try {
      GoogleSignin?.configure({
        webClientId: GOOGLE_WEB_CLIENT_ID,
        offlineAccess: true,
      });
    } catch {
      // Google Sign-In not available
    }
  }, []);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [domain, setDomain] = useState(route.params?.domain || '');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!firstName.trim()) errors.firstName = t('auth.firstNameRequired');
    if (!lastName.trim()) errors.lastName = t('auth.lastNameRequired');
    if (!email.trim()) errors.email = t('auth.emailRequired');
    else if (!/\S+@\S+\.\S+/.test(email)) errors.email = t('auth.invalidEmailFormat');
    if (!password.trim()) errors.password = t('auth.passwordRequired');
    else if (password.length < 6) errors.password = t('auth.passwordMinLength');
    if (password !== confirmPassword) errors.confirmPassword = t('auth.passwordsDoNotMatch');
    if (!domain.trim()) errors.domain = t('auth.domainRequired');
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleRegister = async () => {
    clearError();
    if (!validate()) return;

    try {
      await register({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phoneNumber: phoneNumber.trim() || undefined,
        password,
        confirmPassword,
        domain: domain.trim(),
      });
      // Navigate to OTP verification after successful registration
      navigation.navigate('OTPVerification', {
        email: email.trim(),
        domain: domain.trim(),
        type: 'email_confirm',
        password,
      });
    } catch {
      // Error is set in store
    }
  };

  const handleGoogleSignUp = async () => {
    if (!domain.trim()) {
      setFormErrors({ domain: t('auth.domainRequiredForGoogle') });
      return;
    }
    clearError();
    setGoogleLoading(true);
    try {
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
      backgroundColor: theme.colors.background,
    },
    content: {
      flexGrow: 1,
      padding: spacing['2xl'],
    },
    header: {
      marginTop: Platform.OS === 'ios' ? spacing['4xl'] : spacing['2xl'],
      marginBottom: spacing['2xl'],
    },
    title: {
      ...typography.h3,
      color: theme.colors.text,
      marginBottom: spacing.sm,
    },
    subtitle: {
      ...typography.body,
      color: theme.colors.textSecondary,
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
    row: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    halfInput: {
      flex: 1,
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: spacing.xl,
      marginBottom: spacing['2xl'],
    },
    footerText: {
      ...typography.body,
      color: theme.colors.textSecondary,
    },
    footerLink: {
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
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>{t('auth.createAccount')}</Text>
          <Text style={styles.subtitle}>{t('auth.registerAsStudent')}</Text>
        </View>

        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <Input
          label={t('auth.domain')}
          placeholder={t('auth.institutionDomain')}
          value={domain}
          onChangeText={(text) => {
            setDomain(text);
            if (formErrors.domain) setFormErrors((e) => ({ ...e, domain: '' }));
          }}
          error={formErrors.domain}
          autoCapitalize="none"
        />

        <View style={styles.row}>
          <View style={styles.halfInput}>
            <Input
              label={t('auth.firstName')}
              placeholder={t('auth.firstName')}
              value={firstName}
              onChangeText={(text) => {
                setFirstName(text);
                if (formErrors.firstName) setFormErrors((e) => ({ ...e, firstName: '' }));
              }}
              error={formErrors.firstName}
            />
          </View>
          <View style={styles.halfInput}>
            <Input
              label={t('auth.lastName')}
              placeholder={t('auth.lastName')}
              value={lastName}
              onChangeText={(text) => {
                setLastName(text);
                if (formErrors.lastName) setFormErrors((e) => ({ ...e, lastName: '' }));
              }}
              error={formErrors.lastName}
            />
          </View>
        </View>

        <Input
          label={t('auth.email')}
          placeholder="your@email.com"
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            if (formErrors.email) setFormErrors((e) => ({ ...e, email: '' }));
          }}
          error={formErrors.email}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Input
          label={t('auth.phoneOptional')}
          placeholder="+20 xxx xxx xxxx"
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          keyboardType="phone-pad"
        />

        <Input
          label={t('auth.password')}
          placeholder={t('auth.minCharacters')}
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
          placeholder={t('auth.reenterPassword')}
          value={confirmPassword}
          onChangeText={(text) => {
            setConfirmPassword(text);
            if (formErrors.confirmPassword) setFormErrors((e) => ({ ...e, confirmPassword: '' }));
          }}
          error={formErrors.confirmPassword}
          secureTextEntry
        />

        <Button
          title={t('auth.createAccount')}
          onPress={handleRegister}
          loading={isLoading}
          fullWidth
          size="large"
        />

        {/* Divider */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: spacing.xl }}>
          <View style={{ flex: 1, height: 1, backgroundColor: theme.colors.divider }} />
          <Text style={{ ...typography.caption, color: theme.colors.textMuted, marginHorizontal: spacing.md }}>
            {t('auth.orContinueWith')}
          </Text>
          <View style={{ flex: 1, height: 1, backgroundColor: theme.colors.divider }} />
        </View>

        {/* Google Sign-Up */}
        <TouchableOpacity
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.colors.card,
            borderWidth: 1,
            borderColor: theme.colors.border,
            borderRadius: borderRadius.lg,
            paddingVertical: spacing.md,
            paddingHorizontal: spacing.xl,
            opacity: googleLoading ? 0.7 : 1,
          }}
          onPress={handleGoogleSignUp}
          disabled={googleLoading || isLoading}
          activeOpacity={0.7}
        >
          <Ionicons name="logo-google" size={20} color="#DB4437" />
          <Text
            style={{
              ...typography.button,
              color: theme.colors.text,
              marginLeft: spacing.md,
            }}
          >
            {googleLoading ? t('common.loading') : t('auth.signUpWithGoogle')}
          </Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>{t('auth.hasAccount')} </Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.footerLink}>{t('auth.signIn')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
