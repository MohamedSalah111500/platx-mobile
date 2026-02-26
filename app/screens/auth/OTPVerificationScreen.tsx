import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeProvider';
import { useAuthStore } from '../../store/auth.store';
import { Button } from '../../components/ui/Button';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography, fontSize } from '../../theme/typography';
import type { AuthStackParamList } from '../../types/navigation.types';
import { useRTL } from '../../i18n/RTLProvider';

type Props = NativeStackScreenProps<AuthStackParamList, 'OTPVerification'>;

const OTP_LENGTH = 6;
const RESEND_TIMER = 60;

export default function OTPVerificationScreen({ navigation, route }: Props) {
  const { email, domain, type, password } = route.params;
  const { theme } = useTheme();
  const { confirmEmail, verifyOtpResetPassword, login, isLoading, error, clearError } =
    useAuthStore();
  const { t } = useRTL();

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [timer, setTimer] = useState(RESEND_TIMER);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => setTimer((t) => t - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  const handleChange = (text: string, index: number) => {
    if (text.length > 1) {
      // Handle paste
      const chars = text.split('').slice(0, OTP_LENGTH);
      const newOtp = [...otp];
      chars.forEach((char, i) => {
        if (index + i < OTP_LENGTH) newOtp[index + i] = char;
      });
      setOtp(newOtp);
      const nextIndex = Math.min(index + chars.length, OTP_LENGTH - 1);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);

    if (text && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      const newOtp = [...otp];
      newOtp[index - 1] = '';
      setOtp(newOtp);
    }
  };

  const handleVerify = async () => {
    clearError();
    const code = otp.join('');
    if (code.length !== OTP_LENGTH) return;

    try {
      if (type === 'email_confirm') {
        await confirmEmail({ email, code, domain });
        // Auto-login after email confirmation
        if (password) {
          await login({ userName: email, password, domain });
        }
      } else {
        const result = await verifyOtpResetPassword({ email, code, domain });
        navigation.navigate('ResetPassword', { token: result.token });
      }
    } catch {
      // Error is set in store
    }
  };

  const handleResend = () => {
    setTimer(RESEND_TIMER);
    setOtp(Array(OTP_LENGTH).fill(''));
    // TODO: Call resend API
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
      alignItems: 'center',
    },
    iconContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: theme.colors.primaryLight,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: spacing['2xl'],
    },
    iconText: {
      fontSize: 36,
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
      marginBottom: spacing['3xl'],
    },
    emailHighlight: {
      color: theme.colors.primary,
      fontWeight: '600',
    },
    otpContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: spacing.sm,
      marginBottom: spacing['2xl'],
    },
    otpInput: {
      width: 48,
      height: 56,
      borderWidth: 2,
      borderColor: theme.colors.inputBorder,
      borderRadius: borderRadius.lg,
      textAlign: 'center',
      fontSize: fontSize.xl,
      fontWeight: '700',
      color: theme.colors.text,
      backgroundColor: theme.colors.inputBackground,
    },
    otpInputFilled: {
      borderColor: theme.colors.primary,
    },
    errorBanner: {
      backgroundColor: theme.colors.danger + '15',
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      marginBottom: spacing.lg,
      width: '100%',
    },
    errorText: {
      ...typography.bodySmall,
      color: theme.colors.danger,
      textAlign: 'center',
    },
    resendContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: spacing.xl,
    },
    resendText: {
      ...typography.body,
      color: theme.colors.textSecondary,
    },
    resendLink: {
      ...typography.body,
      color: theme.colors.primary,
      fontWeight: '600',
    },
    timerText: {
      ...typography.body,
      color: theme.colors.textMuted,
    },
    buttonContainer: {
      width: '100%',
    },
  });

  const isComplete = otp.every((digit) => digit !== '');

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Text style={styles.iconText}>
            <Ionicons name={type === 'email_confirm' ? 'mail-outline' : 'lock-closed-outline'} size={48} color={theme.colors.primary} />
          </Text>
        </View>

        <Text style={styles.title}>
          {type === 'email_confirm' ? t('auth.verifyEmail') : t('auth.enterResetCode')}
        </Text>
        <Text style={styles.subtitle}>
          {t('auth.verificationSentTo')}{'\n'}
          <Text style={styles.emailHighlight}>{email}</Text>
        </Text>

        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* OTP Inputs */}
        <View style={styles.otpContainer}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => {
                inputRefs.current[index] = ref;
              }}
              style={[styles.otpInput, digit ? styles.otpInputFilled : null]}
              value={digit}
              onChangeText={(text) => handleChange(text, index)}
              onKeyPress={({ nativeEvent }) =>
                handleKeyPress(nativeEvent.key, index)
              }
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
            />
          ))}
        </View>

        <View style={styles.buttonContainer}>
          <Button
            title={t('auth.verify')}
            onPress={handleVerify}
            loading={isLoading}
            disabled={!isComplete}
            fullWidth
            size="large"
          />
        </View>

        <View style={styles.resendContainer}>
          {timer > 0 ? (
            <Text style={styles.timerText}>{t('auth.resendCodeIn', { seconds: timer })}</Text>
          ) : (
            <TouchableOpacity onPress={handleResend}>
              <Text style={styles.resendLink}>{t('auth.resendOtp')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
