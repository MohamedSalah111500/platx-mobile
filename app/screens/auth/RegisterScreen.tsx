import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Image,
} from 'react-native';
import axios from 'axios';
import type { CountryCode } from 'libphonenumber-js/mobile';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as AppleAuthentication from 'expo-apple-authentication';
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
import { isAppleSignInAvailable } from '../../services/auth/appleAuth';
import {
  registrationApi,
  registrationFieldMode,
  DEFAULT_REGISTRATION_SETTINGS,
  type RegistrationSettings,
} from '../../services/api/registration.api';
import { DEFAULT_PHONE_COUNTRY, toE164Phone } from '../../utils/phoneNumber';
import { EDUCATION_STAGES, type EducationStage } from '../../utils/educationStages';
import { SelectField } from '../../components/ui/SelectField';
import { PhoneInput } from '../../components/ui/PhoneInput';
import { academyStorage } from '../../services/storage/academy.storage';
import { getFullImageUrl } from '../../utils/imageUrl';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export default function RegisterScreen({ navigation, route }: Props) {
  const { theme, isDark } = useTheme();
  const { register, googleLogin, appleLogin, isLoading, error, clearError } = useAuthStore();
  const { t, isRTL } = useRTL();
  const insets = useSafeAreaInsets();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => {
    isAppleSignInAvailable().then(setAppleAvailable);
  }, []);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [domainInput, setDomainInput] = useState(route.params?.domain || '');
  const [domain, setDomain] = useState('');
  const [academyName, setAcademyName] = useState('');
  const [academyLogo, setAcademyLogo] = useState<string | undefined>();
  const [lookingUp, setLookingUp] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneCountry, setPhoneCountry] = useState<CountryCode>(DEFAULT_PHONE_COUNTRY);
  const [educationStage, setEducationStage] = useState<EducationStage | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [registration, setRegistration] = useState<RegistrationSettings>(DEFAULT_REGISTRATION_SETTINGS);

  const academyChosen = !!domain;

  const lookUpAcademy = async (input: string) => {
    const key = input.trim();
    if (!key) {
      setFormErrors({ domain: t('auth.domainRequired') });
      return;
    }
    setLookingUp(true);
    setFormErrors({});
    clearError();
    try {
      const settings = await registrationApi.forDomain(key);
      const resolved = settings.domain || key;
      setRegistration(settings);
      setDomain(resolved);
      setAcademyName(settings.name || resolved);
      setAcademyLogo(getFullImageUrl(settings.logoUrl));
      academyStorage.save({ domain: resolved, name: settings.name, logoUrl: settings.logoUrl });
    } catch (err) {
      const notFound = axios.isAxiosError(err) && err.response?.status === 404;
      setFormErrors({ domain: t(notFound ? 'auth.academyNotFound' : 'auth.academyLookupFailed') });
      clearError();
    } finally {
      setLookingUp(false);
    }
  };

  useEffect(() => {
    if (route.params?.domain) {
      lookUpAcademy(route.params.domain);
      return;
    }
    academyStorage.get().then((saved) => {
      if (saved) setDomainInput((current) => current || saved.domain);
    });
  }, []);

  const changeAcademy = () => {
    setDomainInput(domain);
    setDomain('');
    setRegistration(DEFAULT_REGISTRATION_SETTINGS);
    setFormErrors({});
    clearError();
  };

  const phoneMode = registrationFieldMode(registration, 'phoneNumber');
  const showPhone = phoneMode !== 'Hidden';
  const stageMode = registrationFieldMode(registration, 'educationStage');
  const showStage = stageMode !== 'Hidden';
  const showSocialSignUp = registration.allowSocialSignUp;

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!firstName.trim()) errors.firstName = t('auth.firstNameRequired');
    if (!lastName.trim()) errors.lastName = t('auth.lastNameRequired');
    if (!email.trim()) errors.email = t('auth.emailRequired');
    else if (!/\S+@\S+\.\S+/.test(email)) errors.email = t('auth.invalidEmailFormat');
    if (!password.trim()) errors.password = t('auth.passwordRequired');
    else if (!/^[A-Za-z0-9]{6,}$/.test(password)) errors.password = t('auth.passwordMinLength');
    if (password !== confirmPassword) errors.confirmPassword = t('auth.passwordsDoNotMatch');
    if (showPhone) {
      if (!phoneNumber.trim()) {
        if (phoneMode === 'Required') errors.phoneNumber = t('auth.phoneNumberRequired');
      } else if (!toE164Phone(phoneNumber, phoneCountry)) {
        errors.phoneNumber = t('auth.phoneNumberInvalid');
      }
    }
    if (showStage && stageMode === 'Required' && !educationStage) {
      errors.educationStage = t('auth.educationStageRequired');
    }
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
        password,
        confirmPassword,
        domain,
        ...(showPhone ? { phoneNumber: toE164Phone(phoneNumber, phoneCountry) ?? undefined } : {}),
        ...(showStage && educationStage ? { educationStage } : {}),
      });
      // Navigate to OTP verification after successful registration
      navigation.navigate('OTPVerification', {
        email: email.trim(),
        domain,
        type: 'email_confirm',
        password,
      });
    } catch (err: any) {
      const serverErrors = err?.response?.data?.errors ?? {};
      const fieldErrors = (['phoneNumber', 'educationStage'] as const).filter((key) => serverErrors[key]);
      if (fieldErrors.length > 0) {
        setRegistration((current) => ({
          ...current,
          fields: current.fields.map((f) =>
            fieldErrors.includes(f.key as (typeof fieldErrors)[number]) && f.mode === 'Hidden'
              ? { ...f, mode: 'Required' }
              : f
          ),
        }));
        setFormErrors((e) => {
          const next = { ...e };
          for (const key of fieldErrors) {
            const value = serverErrors[key];
            next[key] = Array.isArray(value) ? value[0] : String(value);
          }
          return next;
        });
        clearError();
      }
    }
  };

  const handleGoogleSignUp = async () => {
    clearError();
    setGoogleLoading(true);
    try {
      await googleLogin(domain);
    } finally {
      setGoogleLoading(false);
    }
  };

  // Signing up with Apple creates the account on first authorization, so it needs
  // the academy domain just like the Google flow does.
  const handleAppleSignUp = async () => {
    clearError();
    setAppleLoading(true);
    try {
      await appleLogin(domain);
    } finally {
      setAppleLoading(false);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      flexGrow: 1,
      justifyContent: 'center',
      padding: spacing['2xl'],
      // The screen has no header, so the form clears the status bar / Dynamic Island itself.
      paddingTop: insets.top + spacing['2xl'],
      paddingBottom: insets.bottom + spacing['2xl'],
    },
    header: {
      marginBottom: spacing['2xl'],
    },
    title: {
      ...typography.h3,
      color: theme.colors.text,
      marginBottom: spacing.sm,
      textAlign: 'center',
    },
    subtitle: {
      ...typography.body,
      color: theme.colors.textSecondary,
      textAlign: 'center',
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
      alignItems: 'center',
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
      fontFamily: 'Cairo_600SemiBold',
    },
    academyCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.md,
      marginBottom: spacing.xl,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.card,
    },
    academyLogo: {
      width: 44,
      height: 44,
      borderRadius: 12,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.primary + '1A',
    },
    academyInitial: {
      ...typography.h3,
      color: theme.colors.primary,
    },
    academyName: {
      ...typography.body,
      fontFamily: 'Cairo_600SemiBold',
      color: theme.colors.text,
    },
    academyDomain: {
      ...typography.caption,
      color: theme.colors.textMuted,
    },
    changeLink: {
      ...typography.body,
      color: theme.colors.primary,
      fontFamily: 'Cairo_600SemiBold',
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
          <Text style={styles.subtitle}>
            {academyChosen ? t('auth.registerAsStudent') : t('auth.chooseAcademyHint')}
          </Text>
        </View>

        {error && <ErrorBanner message={error} />}

        {!academyChosen ? (
          <>
            <Input
              label={t('auth.academyLabel')}
              placeholder={t('auth.academyPlaceholder')}
              hint={t('auth.academyInputHint')}
              value={domainInput}
              onChangeText={(text) => {
                setDomainInput(text);
                if (formErrors.domain) setFormErrors((e) => ({ ...e, domain: '' }));
              }}
              error={formErrors.domain}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="next"
              onSubmitEditing={() => lookUpAcademy(domainInput)}
            />
            <Button
              title={t('auth.continue')}
              onPress={() => lookUpAcademy(domainInput)}
              loading={lookingUp}
              fullWidth
              size="large"
            />
            <View style={styles.footer}>
              <Text style={styles.footerText}>{t('auth.hasAccount')} </Text>
              <TouchableOpacity onPress={() => navigation.goBack()}>
                <Text style={styles.footerLink}>{t('auth.signIn')}</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
        <>
        <View style={styles.academyCard}>
          <View style={styles.academyLogo}>
            {academyLogo ? (
              <Image source={{ uri: academyLogo }} style={{ width: 44, height: 44 }} resizeMode="contain" />
            ) : (
              <Text style={styles.academyInitial}>{academyName.charAt(0).toUpperCase()}</Text>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.academyName} numberOfLines={1}>{academyName}</Text>
            <Text style={styles.academyDomain} numberOfLines={1}>{domain}</Text>
          </View>
          <TouchableOpacity onPress={changeAcademy} accessibilityRole="button">
            <Text style={styles.changeLink}>{t('auth.changeAcademy')}</Text>
          </TouchableOpacity>
        </View>

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

        {showPhone && (
          <PhoneInput
            label={phoneMode === 'Required' ? t('auth.phoneNumber') : t('auth.phoneOptional')}
            value={phoneNumber}
            country={phoneCountry}
            onChangeCountry={(country) => {
              setPhoneCountry(country);
              if (formErrors.phoneNumber) setFormErrors((e) => ({ ...e, phoneNumber: '' }));
            }}
            onChangeText={(text) => {
              setPhoneNumber(text);
              if (formErrors.phoneNumber) setFormErrors((e) => ({ ...e, phoneNumber: '' }));
            }}
            error={formErrors.phoneNumber}
          />
        )}

        {showStage && (
          <SelectField
            label={stageMode === 'Required' ? t('auth.educationStage') : t('auth.educationStageOptional')}
            placeholder={t('auth.educationStagePlaceholder')}
            value={educationStage}
            options={EDUCATION_STAGES.map((stage) => ({ value: stage, label: t(`educationStages.${stage}`) }))}
            onChange={(stage) => {
              setEducationStage(stage);
              if (formErrors.educationStage) setFormErrors((e) => ({ ...e, educationStage: '' }));
            }}
            error={formErrors.educationStage}
          />
        )}

        <Button
          title={t('auth.createAccount')}
          onPress={handleRegister}
          loading={isLoading}
          fullWidth
          size="large"
        />

        {showSocialSignUp && (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: spacing.xl }}>
              <View style={{ flex: 1, height: 1, backgroundColor: theme.colors.divider }} />
              <Text style={{ ...typography.caption, color: theme.colors.textMuted, marginHorizontal: spacing.md }}>
                {t('auth.orContinueWith')}
              </Text>
              <View style={{ flex: 1, height: 1, backgroundColor: theme.colors.divider }} />
            </View>

            {appleAvailable && (
              <View
                style={{ marginBottom: spacing.md, opacity: appleLoading || isLoading ? 0.6 : 1 }}
                pointerEvents={appleLoading || googleLoading || isLoading ? 'none' : 'auto'}
              >
                <AppleAuthentication.AppleAuthenticationButton
                  buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP}
                  buttonStyle={
                    isDark
                      ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                      : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
                  }
                  cornerRadius={borderRadius.lg}
                  style={{ width: '100%', height: 50 }}
                  onPress={handleAppleSignUp}
                />
              </View>
            )}

            {/* Google Sign-Up */}
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: spacing.md,
                backgroundColor: theme.colors.card,
                borderWidth: 1,
                borderColor: theme.colors.border,
                borderRadius: borderRadius.lg,
                paddingVertical: spacing.md,
                paddingHorizontal: spacing.xl,
                minHeight: 50,
                opacity: googleLoading ? 0.7 : 1,
              }}
              onPress={handleGoogleSignUp}
              disabled={googleLoading || appleLoading || isLoading}
              activeOpacity={0.7}
            >
              <Ionicons name="logo-google" size={20} color="#DB4437" />
              <Text
                style={{
                  ...typography.button,
                  color: theme.colors.text,
                }}
              >
                {googleLoading ? t('common.loading') : t('auth.signUpWithGoogle')}
              </Text>
            </TouchableOpacity>
          </>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>{t('auth.hasAccount')} </Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.footerLink}>{t('auth.signIn')}</Text>
          </TouchableOpacity>
        </View>
        </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
