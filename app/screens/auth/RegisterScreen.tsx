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
  localizedText,
  DEFAULT_REGISTRATION_SETTINGS,
  type RegistrationField,
  type RegistrationSettings,
} from '../../services/api/registration.api';
import { DEFAULT_PHONE_COUNTRY, toE164Phone } from '../../utils/phoneNumber';
import { SelectField } from '../../components/ui/SelectField';
import { PhoneInput } from '../../components/ui/PhoneInput';
import { academyStorage } from '../../services/storage/academy.storage';
import { getFullImageUrl } from '../../utils/imageUrl';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export default function RegisterScreen({ navigation, route }: Props) {
  const { theme, isDark } = useTheme();
  const { register, googleLogin, appleLogin, isLoading, error, clearError } = useAuthStore();
  const { t, isRTL, locale } = useRTL();
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
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [phoneCountries, setPhoneCountries] = useState<Record<string, CountryCode>>({});
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
      const settings = await registrationApi.forDomain(key, t);
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
    setFieldValues({});
    setPhoneCountries({});
    setFormErrors({});
    clearError();
  };

  const visibleFields = registration.fields.filter((field) => field.mode !== 'Hidden');
  const showSocialSignUp = registration.allowSocialSignUp;
  const text = (value: RegistrationField['label']) => localizedText(value, locale);
  const countryOf = (key: string) => phoneCountries[key] ?? DEFAULT_PHONE_COUNTRY;

  const setFieldValue = (key: string, value: string) => {
    setFieldValues((current) => ({ ...current, [key]: value }));
    if (formErrors[key]) setFormErrors((e) => ({ ...e, [key]: '' }));
  };

  const fieldLabel = (field: RegistrationField) =>
    field.mode === 'Optional' ? `${text(field.label)} (${t('auth.optional')})` : text(field.label);

  const submittedValue = (field: RegistrationField): string | null => {
    const raw = (fieldValues[field.key] ?? '').trim();
    if (!raw) return null;
    return field.type === 'Phone' ? toE164Phone(raw, countryOf(field.key)) : raw;
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!firstName.trim()) errors.firstName = t('auth.firstNameRequired');
    if (!lastName.trim()) errors.lastName = t('auth.lastNameRequired');
    if (!email.trim()) errors.email = t('auth.emailRequired');
    else if (!/\S+@\S+\.\S+/.test(email)) errors.email = t('auth.invalidEmailFormat');
    if (!password.trim()) errors.password = t('auth.passwordRequired');
    else if (!/^[A-Za-z0-9]{6,}$/.test(password)) errors.password = t('auth.passwordMinLength');
    if (password !== confirmPassword) errors.confirmPassword = t('auth.passwordsDoNotMatch');
    for (const field of visibleFields) {
      const raw = (fieldValues[field.key] ?? '').trim();
      if (!raw) {
        if (field.mode === 'Required') errors[field.key] = text(field.requiredMessage);
      } else if (!submittedValue(field)) {
        errors[field.key] = text(field.invalidMessage);
      }
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleRegister = async () => {
    clearError();
    if (!validate()) return;

    const fields: Record<string, string> = {};
    for (const field of visibleFields) {
      const value = submittedValue(field);
      if (value) fields[field.key] = value;
    }

    try {
      await register({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        password,
        confirmPassword,
        domain,
        fields,
        phoneNumber: fields.phoneNumber,
        educationStage: fields.educationStage,
        guardianPhoneNumber: fields.guardianPhoneNumber,
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
      const fieldErrors = registration.fields.map((f) => f.key).filter((key) => serverErrors[key]);
      if (fieldErrors.length > 0) {
        setRegistration((current) => ({
          ...current,
          fields: current.fields.map((f) =>
            fieldErrors.includes(f.key) && f.mode === 'Hidden' ? { ...f, mode: 'Required' } : f
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

        {visibleFields.map((field) => {
          if (field.type === 'Phone') {
            return (
              <PhoneInput
                key={field.key}
                label={fieldLabel(field)}
                value={fieldValues[field.key] ?? ''}
                country={countryOf(field.key)}
                onChangeCountry={(country) => {
                  setPhoneCountries((current) => ({ ...current, [field.key]: country }));
                  if (formErrors[field.key]) setFormErrors((e) => ({ ...e, [field.key]: '' }));
                }}
                onChangeText={(value) => setFieldValue(field.key, value)}
                error={formErrors[field.key]}
              />
            );
          }
          if (field.type === 'Select') {
            return (
              <SelectField
                key={field.key}
                label={fieldLabel(field)}
                placeholder={text(field.placeholder)}
                value={fieldValues[field.key] || null}
                options={field.options.map((option) => ({ value: option.value, label: text(option.label) }))}
                onChange={(value) => setFieldValue(field.key, value)}
                error={formErrors[field.key]}
              />
            );
          }
          return (
            <Input
              key={field.key}
              label={fieldLabel(field)}
              placeholder={text(field.placeholder)}
              value={fieldValues[field.key] ?? ''}
              onChangeText={(value) => setFieldValue(field.key, value)}
              error={formErrors[field.key]}
            />
          );
        })}

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
