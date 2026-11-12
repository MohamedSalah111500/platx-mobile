import { useEffect, useState } from 'react';
import { Easing, useSharedValue, withTiming } from 'react-native-reanimated';
import { voicePlayback, type VoicePlaybackState, type VoicePlaybackStatus } from './voicePlayback';

interface PlaybackView {
  status: VoicePlaybackStatus;
  second: number;
  rate: number;
  started: boolean;
}

function toView(state: VoicePlaybackState): PlaybackView {
  return {
    status: state.status,
    second: Math.floor(state.positionMs / 1000),
    rate: state.rate,
    started: state.status !== 'idle' || state.positionMs > 0,
  };
}

function toFraction(positionMs: number, durationMs: number): number {
  return durationMs > 0 ? Math.min(1, positionMs / durationMs) : 0;
}

export function useVoicePlayback(key: string, durationMs: number) {
  const progress = useSharedValue(toFraction(voicePlayback.getState(key).positionMs, durationMs));
  const [view, setView] = useState(() => toView(voicePlayback.getState(key)));

  useEffect(() => {
    const apply = (state: VoicePlaybackState) => {
      const fraction = toFraction(state.positionMs, durationMs);
      progress.value =
        state.status === 'playing'
          ? withTiming(fraction, { duration: 120, easing: Easing.linear })
          : fraction;
      const next = toView(state);
      setView((prev) =>
        prev.status === next.status &&
        prev.second === next.second &&
        prev.rate === next.rate &&
        prev.started === next.started
          ? prev
          : next,
      );
    };
    apply(voicePlayback.getState(key));
    return voicePlayback.subscribe(key, apply);
  }, [key, durationMs, progress]);

  return {
    ...view,
    progress,
    toggle: () => voicePlayback.toggle(key),
    seek: (fraction: number) => voicePlayback.seek(key, fraction, durationMs),
  };
}
