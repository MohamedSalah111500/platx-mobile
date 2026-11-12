import React, { memo, useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../../theme/ThemeProvider';
import { useRTL } from '../../../i18n/RTLProvider';
import { Avatar } from '../../ui/Avatar';
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
  senderName: string;
  avatarUri?: string;
  timeLabel: string;
  sendState?: VoiceSendState;
  onRetry?: () => void;
}

const BAR_COUNT = 40;
const AVATAR = 44;
const PLAY = 38;
const MAX_ROW = 280;
const ROW_CHROME = 72;

function VoiceMessageBubbleBase({
  playbackKey,
  durationMs,
  waveform,
  own,
  senderName,
  avatarUri,
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

  const foreground = own ? theme.colors.onPrimary : theme.colors.text;
  const muted = own ? theme.colors.onPrimary + 'B3' : theme.colors.textMuted;
  const accent = own ? theme.colors.onPrimary : theme.colors.primary;
  const idleBars = own ? theme.colors.onPrimary + '66' : theme.colors.textMuted + '66';
  const active = playback.status === 'playing' || playback.status === 'loading';
  const timeText = formatVoiceTime(playback.started ? playback.second * 1000 : durationMs);

  const avatarSlot = (
    <View style={styles.avatarSlot}>
      {active ? (
        <Pressable
          onPress={() => voicePlayback.cycleRate()}
          hitSlop={8}
          accessibilityRole="button"
          style={[styles.rateChip, { backgroundColor: own ? theme.colors.onPrimary + '33' : theme.colors.primaryLight }]}
        >
          <Text style={[styles.rateText, { color: accent }]}>{`${playback.rate}×`}</Text>
        </Pressable>
      ) : (
        <View>
          <Avatar dimension={AVATAR} radius={14} name={senderName} source={avatarUri ? { uri: avatarUri } : undefined} />
          <View style={[styles.micBadge, { backgroundColor: own ? theme.colors.onPrimary : theme.colors.primary }]}>
            <Ionicons name="mic" size={11} color={own ? theme.colors.primary : theme.colors.onPrimary} />
          </View>
        </View>
      )}
    </View>
  );

  return (
    <View>
      <View style={[styles.row, { width: rowWidth }]}>
        {own ? null : avatarSlot}
        <Pressable
          onPress={playback.toggle}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={t(active ? 'chat.voice.pause' : 'chat.voice.play')}
          style={styles.playButton}
        >
          {playback.status === 'loading' ? (
            <ActivityIndicator size="small" color={accent} />
          ) : (
            <Ionicons name={playback.status === 'playing' ? 'pause' : 'play'} size={28} color={accent} />
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
          <View style={styles.meta}>
            <Text style={[styles.metaText, { color: muted }]}>{timeText}</Text>
            <View style={styles.metaEnd}>
              <Text style={[styles.metaText, { color: muted }]}>{timeLabel}</Text>
              {sendState === 'sending' ? <Ionicons name="time-outline" size={14} color={muted} /> : null}
              {sendState === 'failed' ? (
                <Ionicons name="alert-circle" size={16} color={own ? theme.colors.onPrimary : theme.colors.danger} />
              ) : null}
            </View>
          </View>
        </View>
        {own ? avatarSlot : null}
      </View>
      {sendState === 'failed' ? (
        <View style={[styles.failure, { borderTopColor: own ? theme.colors.onPrimary + '33' : theme.colors.divider }]}>
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
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  avatarSlot: { width: AVATAR, height: AVATAR, alignItems: 'center', justifyContent: 'center' },
  micBadge: {
    position: 'absolute',
    bottom: -2,
    end: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rateChip: {
    minWidth: 44,
    height: 30,
    paddingHorizontal: spacing.sm,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rateText: { fontSize: fontSize.sm, fontFamily: fontFamily.bold, textAlign: 'center' },
  playButton: { width: PLAY, height: PLAY, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, paddingTop: spacing.sm },
  meta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
  metaEnd: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: fontSize.sm, fontFamily: fontFamily.medium, textAlign: 'left' },
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
