import React, { useMemo } from 'react';
import { ActivityIndicator, I18nManager, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, { FadeIn, useSharedValue, type SharedValue } from 'react-native-reanimated';
import { useTheme } from '../../../theme/ThemeProvider';
import { useRTL } from '../../../i18n/RTLProvider';
import { spacing } from '../../../theme/spacing';
import { fontFamily, fontSize } from '../../../theme/typography';
import { LiveWaveform } from './LiveWaveform';
import { RecordingTimer } from './RecordingTimer';
import { VoiceWaveform } from './VoiceWaveform';
import { useVoicePlayback } from './useVoicePlayback';
import { formatVoiceTime } from './waveform';
import { voicePlayback } from './voicePlayback';
import type { RecordedVoice } from './useVoiceRecorder';

export const PREVIEW_KEY = 'voice-preview';
const PREVIEW_BARS = 40;
const SIZE = 44;

interface Props {
  paused: boolean;
  review: RecordedVoice | null;
  elapsedMs: () => number;
  snapshot: (count: number) => number[];
  levels: SharedValue<number[]>;
  onDiscard: () => void;
  onPause: () => void;
  onResume: () => void;
  onPreview: () => void;
  onSend: () => void;
}

function PausedPreview({ bars, elapsedMs, onPreview }: { bars: number[]; elapsedMs: number; onPreview: () => void }) {
  const { theme } = useTheme();
  const { t } = useRTL();
  const progress = useSharedValue(0);
  return (
    <View style={styles.preview}>
      <Pressable onPress={onPreview} hitSlop={6} accessibilityRole="button" accessibilityLabel={t('chat.voice.play')}>
        <Ionicons name="play" size={26} color={theme.colors.primary} />
      </Pressable>
      <VoiceWaveform bars={bars} progress={progress} playedColor={theme.colors.primary} idleColor={theme.colors.textMuted + '80'} />
      <Text style={[styles.time, { color: theme.colors.textSecondary }]}>{formatVoiceTime(elapsedMs)}</Text>
    </View>
  );
}

function ReviewPreview({ review, bars }: { review: RecordedVoice; bars: number[] }) {
  const { theme } = useTheme();
  const { t } = useRTL();
  const playback = useVoicePlayback(PREVIEW_KEY, review.durationMs);
  const playing = playback.status === 'playing';
  return (
    <View style={styles.preview}>
      <Pressable
        onPress={() =>
          voicePlayback.toggle(PREVIEW_KEY, { key: PREVIEW_KEY, uri: review.uri, durationMs: review.durationMs })
        }
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={t(playing ? 'chat.voice.pause' : 'chat.voice.play')}
        style={styles.previewButton}
      >
        {playback.status === 'loading' ? (
          <ActivityIndicator size="small" color={theme.colors.primary} />
        ) : (
          <Ionicons name={playing ? 'pause' : 'play'} size={26} color={theme.colors.primary} />
        )}
      </Pressable>
      <VoiceWaveform
        bars={bars}
        progress={playback.progress}
        playedColor={theme.colors.primary}
        idleColor={theme.colors.textMuted + '80'}
        dotColor={theme.colors.primary}
        onSeek={playback.seek}
      />
      <Text style={[styles.time, { color: theme.colors.textSecondary }]}>
        {formatVoiceTime(playback.started ? playback.second * 1000 : review.durationMs)}
      </Text>
    </View>
  );
}

export function LockedRecorder({
  paused,
  review,
  elapsedMs,
  snapshot,
  levels,
  onDiscard,
  onPause,
  onResume,
  onPreview,
  onSend,
}: Props) {
  const { theme } = useTheme();
  const { t } = useRTL();
  const bars = useMemo(() => (paused ? snapshot(PREVIEW_BARS) : []), [paused, snapshot, review]);

  return (
    <Animated.View entering={FadeIn.duration(160)} style={[styles.container, { backgroundColor: theme.colors.card }]}>
      <Pressable
        onPress={onDiscard}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={t('chat.voice.deleteRecording')}
        style={styles.iconButton}
      >
        <Ionicons name="trash-outline" size={24} color={theme.colors.textSecondary} />
      </Pressable>
      <View style={[styles.middle, { backgroundColor: theme.colors.surface }]}>
        {review ? (
          <ReviewPreview review={review} bars={bars} />
        ) : paused ? (
          <PausedPreview bars={bars} elapsedMs={elapsedMs()} onPreview={onPreview} />
        ) : (
          <View style={styles.preview}>
            <RecordingTimer elapsedMs={elapsedMs} running />
            <LiveWaveform levels={levels} color={theme.colors.textSecondary} />
          </View>
        )}
      </View>
      {review ? null : (
        <Pressable
          onPress={paused ? onResume : onPause}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={t(paused ? 'chat.voice.resume' : 'chat.voice.pauseRecording')}
          style={styles.iconButton}
        >
          <Ionicons
            name={paused ? 'mic' : 'pause-circle'}
            size={paused ? 26 : 30}
            color={theme.colors.danger}
          />
        </Pressable>
      )}
      <Pressable
        onPress={onSend}
        accessibilityRole="button"
        accessibilityLabel={t('chat.voice.send')}
        style={[styles.send, { backgroundColor: theme.colors.primary }]}
      >
        <Ionicons name="send" size={18} color={theme.colors.onPrimary} style={styles.sendIcon} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    gap: spacing.xs,
    zIndex: 3,
  },
  iconButton: { width: 40, height: SIZE, alignItems: 'center', justifyContent: 'center' },
  middle: {
    flex: 1,
    minHeight: SIZE,
    borderRadius: 22,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  preview: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  previewButton: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  time: { fontSize: fontSize.sm, fontFamily: fontFamily.medium, minWidth: 38, textAlign: 'left' },
  send: { width: SIZE, height: SIZE, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  sendIcon: { transform: [{ scaleX: I18nManager.isRTL ? -1 : 1 }] },
});
