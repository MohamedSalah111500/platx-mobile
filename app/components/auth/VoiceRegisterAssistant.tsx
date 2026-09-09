import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Audio } from 'expo-av';

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

  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [followUp, setFollowUp] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const stopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);

  useEffect(() => () => {
    if (stopTimer.current) clearTimeout(stopTimer.current);
    recordingRef.current?.stopAndUnloadAsync().catch(() => undefined);
  }, []);

  const startRecording = async () => {
    setErrorMessage('');
    if (!domain.trim()) {
      setErrorMessage(t('auth.voiceDomainFirst'));
      return;
    }
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        setErrorMessage(t('auth.voiceMicDenied'));
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await rec.startAsync();
      recordingRef.current = rec;
      setRecording(rec);
      setIsRecording(true);
      stopTimer.current = setTimeout(() => stopRecording(rec), MAX_RECORDING_MS);
    } catch {
      setErrorMessage(t('auth.voiceRecordFailed'));
    }
  };

  const stopRecording = async (rec: Audio.Recording | null = recording) => {
    if (!rec) return;
    if (stopTimer.current) clearTimeout(stopTimer.current);
    setIsRecording(false);
    setRecording(null);
    recordingRef.current = null;
    let uri: string | null = null;
    try {
      await rec.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      uri = rec.getURI();
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
      borderColor: isRecording ? '#EF4444' : theme.colors.primary,
      backgroundColor: isRecording ? '#EF444415' : 'transparent',
    },
    pillText: {
      ...typography.body,
      fontFamily: fontFamily.semibold,
      color: isRecording ? '#EF4444' : theme.colors.primary,
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
      color: '#EF4444',
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
          <Ionicons name={isRecording ? 'stop' : 'mic'} size={18} color={isRecording ? '#EF4444' : theme.colors.primary} />
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
