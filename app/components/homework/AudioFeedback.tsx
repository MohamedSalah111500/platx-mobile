import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer, type AudioStatus } from 'expo-audio';
import { spacing } from '../../theme/spacing';
import { fontSize, buttonLineHeight } from '../../theme/typography';

export function AudioFeedback({
  url,
  theme,
  t,
}: {
  url: string;
  theme: any;
  t: (k: string) => string;
}) {
  const [sound, setSound] = useState<AudioPlayer | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    return () => {
      sound?.remove();
    };
  }, [sound]);

  const toggle = async () => {
    try {
      if (sound) {
        if (playing) {
          sound.pause();
          setPlaying(false);
        } else {
          sound.play();
          setPlaying(true);
        }
        return;
      }
      setLoading(true);
      await setAudioModeAsync({ playsInSilentMode: true });
      const s = createAudioPlayer({ uri: url });
      s.addListener('playbackStatusUpdate', (st: AudioStatus) => {
        if (st.didJustFinish) {
          setPlaying(false);
          s.pause();
          s.seekTo(0);
        }
      });
      s.play();
      setSound(s);
      setPlaying(true);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.audioBtn, { backgroundColor: theme.colors.primary + '12' }]}
      onPress={toggle}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator size="small" color={theme.colors.primary} />
      ) : (
        <Ionicons name={playing ? 'pause' : 'play'} size={18} color={theme.colors.primary} />
      )}
      <Ionicons name="mic-outline" size={16} color={theme.colors.primary} />
      <Text style={[styles.audioBtnText, { color: theme.colors.primary }]}>
        {playing ? t('homework.pauseFeedback') : t('homework.playFeedback')}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  audioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 4,
  },
  audioBtnText: { fontSize: fontSize.sm, fontFamily: 'Cairo_600SemiBold', textAlign: 'left', lineHeight: buttonLineHeight(fontSize.sm), includeFontPadding: false },
});
