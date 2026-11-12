import React, { memo, useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../../theme/ThemeProvider';
import { useRTL } from '../../../i18n/RTLProvider';
import { spacing } from '../../../theme/spacing';
import { fontFamily, fontSize } from '../../../theme/typography';
import { VoiceWaveform } from './VoiceWaveform';
import { useVoicePlayback } from './useVoicePlayback';
import { voicePlayback } from './voicePlayback';
import { decodeWaveform, formatVoiceTime } from './waveform';

export type VoiceSendState = 'sending' | 'failed';

interface Props {
  playbackKey: string;
  durationMs: number;
  waveform: string | null;
  own: boolean;
  timeLabel: string;
  sendState?: VoiceSendState;
  onRetry?: () => void;
}

const BAR_COUNT = 40;
const PLAY = 40;
const META_HEIGHT = 22;
const WAVE_INSET = 6;
const MAX_ROW = 260;
const ROW_CHROME = 48;

function VoiceMessageBubbleBase({
  playbackKey,
  durationMs,
  waveform,
  own,
  timeLabel,
  sendState,
  onRetry,
}: Props) {
  const { theme } = useTheme();
  const { t } = useRTL();
  const { width: screenWidth } = useWindowDimensions();
  const rowWidth = Math.min(MAX_ROW, Math.round(screenWidth * 0.78) - ROW_CHROME);
  const playback = useVoicePlayback(playbackKey, durationMs);
  const bars = useMemo(() => decodeWaveform(waveform, BAR_COUNT), [waveform]);

  const foreground = own ? theme.colors.onChatBubbleOwn : theme.colors.text;
  const muted = own ? theme.colors.onChatBubbleOwn + 'A6' : theme.colors.textMuted;
  const accent = own ? theme.colors.onChatBubbleOwn : theme.colors.primary;
  const idleBars = own ? theme.colors.onChatBubbleOwn + '4D' : theme.colors.textMuted + '66';
  const chipFill = own ? theme.colors.onChatBubbleOwn + '14' : theme.colors.primaryLight;
  const active = playback.status === 'playing' || playback.status === 'loading';
  const timeText = formatVoiceTime(playback.started ? playback.second * 1000 : durationMs);

  return (
    <View>
      <View style={[styles.row, { width: rowWidth }]}>
        <Pressable
          onPress={playback.toggle}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={t(active ? 'chat.voice.pause' : 'chat.voice.play')}
          style={({ pressed }) => [
            styles.playButton,
            { backgroundColor: chipFill },
            pressed && styles.playPressed,
          ]}
        >
          {playback.status === 'loading' ? (
            <ActivityIndicator size="small" color={accent} />
          ) : (
            <Ionicons name={playback.status === 'playing' ? 'pause' : 'play'} size={24} color={accent} />
          )}
        </Pressable>
        <View style={styles.body}>
          <VoiceWaveform
            bars={bars}
            progress={playback.progress}
            playedColor={accent}
            idleColor={idleBars}
            dotColor={accent}
            onSeek={playback.seek}
          />
        </View>
      </View>
      <View style={styles.meta}>
        <View style={styles.metaStart}>
          <Text style={[styles.metaText, { color: muted }]}>{timeText}</Text>
          {active ? (
            <Pressable
              onPress={() => voicePlayback.cycleRate()}
              hitSlop={8}
              accessibilityRole="button"
              style={[styles.rateChip, { backgroundColor: chipFill }]}
            >
              <Text style={[styles.rateText, { color: accent }]}>{`⁦${playback.rate}×⁩`}</Text>
            </Pressable>
          ) : null}
        </View>
        <View style={styles.metaEnd}>
          {sendState === 'sending' ? <Ionicons name="time-outline" size={14} color={muted} /> : null}
          {sendState === 'failed' ? (
            <Ionicons name="alert-circle" size={16} color={own ? theme.colors.onChatBubbleOwn : theme.colors.danger} />
          ) : null}
          <Text style={[styles.metaText, { color: muted }]}>{timeLabel}</Text>
        </View>
      </View>
      {sendState === 'failed' ? (
        <View style={[styles.failure, { borderTopColor: own ? theme.colors.onChatBubbleOwn + '33' : theme.colors.divider }]}>
          <Text style={[styles.failureText, { color: foreground }]}>{t('chat.voice.sendFailed')}</Text>
          <Pressable onPress={onRetry} hitSlop={8} accessibilityRole="button" style={styles.retry}>
            <Ionicons name="refresh" size={16} color={accent} />
            <Text style={[styles.retryText, { color: accent }]}>{t('chat.voice.retry')}</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

export const VoiceMessageBubble = memo(VoiceMessageBubbleBase);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  playButton: { width: PLAY, height: PLAY, borderRadius: PLAY / 2, alignItems: 'center', justifyContent: 'center' },
  playPressed: { transform: [{ scale: 0.92 }] },
  body: { flex: 1, justifyContent: 'center' },
  meta: {
    height: META_HEIGHT,
    marginTop: 4,
    paddingStart: PLAY + spacing.md + WAVE_INSET,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaStart: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  metaEnd: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: fontSize.sm, fontFamily: fontFamily.medium, textAlign: 'left' },
  rateChip: {
    height: META_HEIGHT,
    minWidth: 40,
    paddingHorizontal: spacing.sm,
    borderRadius: META_HEIGHT / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rateText: { fontSize: fontSize.sm, lineHeight: META_HEIGHT - 2, fontFamily: fontFamily.bold, textAlign: 'center' },
  failure: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  failureText: { flex: 1, fontSize: fontSize.sm, fontFamily: fontFamily.medium, textAlign: 'left' },
  retry: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  retryText: { fontSize: fontSize.sm, fontFamily: fontFamily.bold, textAlign: 'left' },
});
