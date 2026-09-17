import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
} from 'expo-audio';

import { useTheme } from '../../theme/ThemeProvider';
import { useRTL } from '../../i18n/RTLProvider';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography, fontFamily } from '../../theme/typography';
import { authApi } from '../../services/api/auth.api';
import type { VoiceRegisterFields } from '../../types/auth.types';

const MAX_RECORDING_MS = 60000;

interface VoiceRegisterAssistantProps {
  domain: string;
  currentFields: VoiceRegisterFields;
  onFieldsExtracted: (fields: VoiceRegisterFields) => void;
}

export function VoiceRegisterAssistant({ domain, currentFields, onFieldsExtracted }: VoiceRegisterAssistantProps) {
  const { theme } = useTheme();
  const { t, isRTL } = useRTL();

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [isRecording, setIsRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [followUp, setFollowUp] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const stopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRecordingRef = useRef(false);

  useEffect(() => () => {
    if (stopTimer.current) clearTimeout(stopTimer.current);
    if (isRecordingRef.current) recorder.stop().catch(() => undefined);
  }, [recorder]);

  const startRecording = async () => {
    setErrorMessage('');
    if (!domain.trim()) {
      setErrorMessage(t('auth.voiceDomainFirst'));
      return;
    }
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        setErrorMessage(t('auth.voiceMicDenied'));
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      isRecordingRef.current = true;
      setIsRecording(true);
      stopTimer.current = setTimeout(() => stopRecording(), MAX_RECORDING_MS);
    } catch {
      setErrorMessage(t('auth.voiceRecordFailed'));
    }
  };

  const stopRecording = async () => {
    if (!isRecordingRef.current) return;
    if (stopTimer.current) clearTimeout(stopTimer.current);
    isRecordingRef.current = false;
    setIsRecording(false);
    let uri: string | null = null;
    try {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false });
      uri = recorder.uri;
    } catch {
      setErrorMessage(t('auth.voiceRecordFailed'));
      return;
    }
    if (!uri) return;
    await submit(uri);
  };

  const submit = async (uri: string) => {
    const form = new FormData();
    form.append('audio', { uri, name: `voice-${Date.now()}.m4a`, type: 'audio/m4a' } as unknown as Blob);
    form.append('domain', domain.trim());
    form.append('language', 'auto');
    form.append('currentFieldsJson', JSON.stringify(currentFields));

    setProcessing(true);
    try {
      const result = await authApi.voiceRegisterExtract(form);
      setFollowUp(result.followUpQuestion);
      onFieldsExtracted(result.fields);
    } catch (err: any) {
      setErrorMessage(err?.userMessage || t('auth.voiceFailed'));
    } finally {
      setProcessing(false);
    }
  };

  const styles = StyleSheet.create({
    container: {
      marginBottom: spacing.md,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.lg,
      borderRadius: borderRadius.full,
      borderWidth: 1,
      borderColor: isRecording ? theme.colors.danger : theme.colors.primary,
      backgroundColor: isRecording ? theme.colors.danger + '15' : 'transparent',
    },
    pillText: {
      ...typography.body,
      fontFamily: fontFamily.semibold,
      color: isRecording ? theme.colors.danger : theme.colors.primary,
    },
    status: {
      ...typography.body,
      color: theme.colors.textSecondary,
      flex: 1,
      textAlign: isRTL ? 'right' : 'left',
    },
    followUp: {
      ...typography.body,
      color: theme.colors.primary,
      marginTop: spacing.sm,
      textAlign: isRTL ? 'right' : 'left',
    },
    error: {
      ...typography.body,
      color: theme.colors.danger,
      marginTop: spacing.sm,
      textAlign: isRTL ? 'right' : 'left',
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <TouchableOpacity
          style={styles.pill}
          onPress={isRecording ? () => stopRecording() : startRecording}
          disabled={processing}
          activeOpacity={0.8}
          accessibilityLabel={t('auth.voiceHint')}
        >
          <Ionicons name={isRecording ? 'stop' : 'mic'} size={18} color={isRecording ? theme.colors.danger : theme.colors.primary} />
          <Text style={styles.pillText}>{t(isRecording ? 'auth.voiceListening' : 'auth.voiceTitle')}</Text>
        </TouchableOpacity>
        {processing && (
          <>
            <ActivityIndicator color={theme.colors.primary} />
            <Text style={styles.status}>{t('auth.voiceProcessing')}</Text>
          </>
        )}
      </View>
      {followUp ? <Text style={styles.followUp}>{followUp}</Text> : null}
      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
    </View>
  );
}

export default VoiceRegisterAssistant;
