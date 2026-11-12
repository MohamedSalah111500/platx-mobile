import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  AudioQuality,
  IOSOutputFormat,
  getRecordingPermissionsAsync,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  type RecordingOptions,
} from 'expo-audio';
import { File } from 'expo-file-system';
import { useSharedValue } from 'react-native-reanimated';
import { voicePlayback } from './voicePlayback';
import { MAX_VOICE_MS, MIN_VOICE_MS, encodeWaveform, meterToLevel, resampleLevels } from './waveform';

export const LIVE_BAR_COUNT = 32;
const SAMPLE_MS = 100;

const VOICE_PRESET: RecordingOptions = {
  extension: '.m4a',
  sampleRate: 22050,
  numberOfChannels: 1,
  bitRate: 32000,
  isMeteringEnabled: true,
  android: {
    outputFormat: 'mpeg4',
    audioEncoder: 'aac',
    audioSource: 'voice_communication',
  },
  ios: {
    outputFormat: IOSOutputFormat.MPEG4AAC,
    audioQuality: AudioQuality.MEDIUM,
  },
  web: {
    mimeType: 'audio/mp4',
    bitsPerSecond: 32000,
  },
};

export type RecorderStartResult = 'recording' | 'prompted' | 'denied' | 'failed';

export interface RecordedVoice {
  uri: string;
  durationMs: number;
  waveform: string;
}

export function deleteRecording(uri: string | null | undefined): void {
  if (!uri) return;
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {}
}

const silence = () => new Array<number>(LIVE_BAR_COUNT).fill(0);

export function useVoiceRecorder(onLimit: () => void) {
  const recorder = useAudioRecorder(VOICE_PRESET);
  const live = useSharedValue<number[]>(silence());
  const liveCopy = useRef<number[]>(silence());
  const levels = useRef<number[]>([]);
  const elapsed = useRef(0);
  const active = useRef(false);
  const sampler = useRef<ReturnType<typeof setInterval> | null>(null);
  const onLimitRef = useRef(onLimit);
  onLimitRef.current = onLimit;

  const stopSampling = useCallback(() => {
    if (sampler.current) clearInterval(sampler.current);
    sampler.current = null;
  }, []);

  const sample = useCallback(() => {
    const status = recorder.getStatus();
    elapsed.current = status.durationMillis;
    const level = meterToLevel(status.metering);
    levels.current.push(level);
    liveCopy.current = [...liveCopy.current.slice(1), level];
    live.value = liveCopy.current;
    if (status.durationMillis >= MAX_VOICE_MS) onLimitRef.current();
  }, [recorder, live]);

  const startSampling = useCallback(() => {
    stopSampling();
    sampler.current = setInterval(sample, SAMPLE_MS);
  }, [sample, stopSampling]);

  const stopRecorder = useCallback(async () => {
    stopSampling();
    voicePlayback.setRecording(false);
    if (!active.current) return;
    active.current = false;
    try {
      await recorder.stop();
    } catch {}
    setAudioModeAsync({ allowsRecording: false }).catch(() => undefined);
  }, [recorder, stopSampling]);

  const start = useCallback(async (): Promise<RecorderStartResult> => {
    try {
      const permission = await getRecordingPermissionsAsync();
      if (!permission.granted) {
        if (!permission.canAskAgain) return 'denied';
        const asked = await requestRecordingPermissionsAsync();
        return asked.granted ? 'prompted' : 'denied';
      }
      voicePlayback.setRecording(true);
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync(VOICE_PRESET);
      recorder.record();
      active.current = true;
      levels.current = [];
      elapsed.current = 0;
      liveCopy.current = silence();
      live.value = liveCopy.current;
      startSampling();
      return 'recording';
    } catch {
      active.current = true;
      await stopRecorder();
      return 'failed';
    }
  }, [recorder, live, startSampling, stopRecorder]);

  const pause = useCallback(() => {
    if (!active.current) return;
    stopSampling();
    recorder.pause();
    elapsed.current = recorder.getStatus().durationMillis;
  }, [recorder, stopSampling]);

  const resume = useCallback(() => {
    if (!active.current) return;
    recorder.record();
    startSampling();
  }, [recorder, startSampling]);

  const finish = useCallback(async (): Promise<RecordedVoice | null> => {
    if (!active.current) return null;
    const durationMs = Math.min(MAX_VOICE_MS, Math.max(elapsed.current, recorder.getStatus().durationMillis));
    await stopRecorder();
    const uri = recorder.uri;
    if (!uri || durationMs < MIN_VOICE_MS) {
      deleteRecording(uri);
      return null;
    }
    return { uri, durationMs, waveform: encodeWaveform(levels.current) };
  }, [recorder, stopRecorder]);

  const discard = useCallback(async () => {
    const wasActive = active.current;
    await stopRecorder();
    if (wasActive) deleteRecording(recorder.uri);
  }, [recorder, stopRecorder]);

  const elapsedMs = useCallback(() => elapsed.current, []);
  const snapshot = useCallback((count: number) => resampleLevels(levels.current, count), []);

  useEffect(
    () => () => {
      stopSampling();
      voicePlayback.setRecording(false);
      if (!active.current) return;
      active.current = false;
      setAudioModeAsync({ allowsRecording: false }).catch(() => undefined);
      try {
        const uri = recorder.uri;
        recorder
          .stop()
          .catch(() => undefined)
          .finally(() => deleteRecording(uri));
      } catch {}
    },
    [recorder, stopSampling],
  );

  return useMemo(
    () => ({ start, pause, resume, finish, discard, forget: deleteRecording, elapsedMs, snapshot, live }),
    [start, pause, resume, finish, discard, elapsedMs, snapshot, live],
  );
}
