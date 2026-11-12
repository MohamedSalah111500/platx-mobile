import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, TextInput, View, type LayoutChangeEvent } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSharedValue } from 'react-native-reanimated';
import { useTheme } from '../../theme/ThemeProvider';
import { useRTL } from '../../i18n/RTLProvider';
import { spacing, borderRadius } from '../../theme/spacing';
import { fontSize } from '../../theme/typography';
import { voicePlayback } from './voice/voicePlayback';
import { hapticTick } from './voice/haptics';
import { useVoiceRecorder, type RecordedVoice, type RecorderStartResult } from './voice/useVoiceRecorder';
import { GESTURE_IDLE, VoiceComposerButton } from './voice/VoiceComposerButton';
import { RecordingTimer } from './voice/RecordingTimer';
import { SlideToCancel } from './voice/SlideToCancel';
import { TrashAnimation } from './voice/TrashAnimation';
import { LockedRecorder, PREVIEW_KEY } from './voice/LockedRecorder';
import { HoldToRecordHint } from './voice/HoldToRecordHint';

type Phase = 'idle' | 'holding' | 'locked' | 'paused' | 'review' | 'discarding';

interface Props {
  onSendText: (text: string) => Promise<boolean>;
  onSendVoice: (voice: RecordedVoice) => void;
}

const QUICK_TAP_MS = 300;
const CANCEL_RATIO = 0.4;

export function ChatComposer({ onSendText, onSendVoice }: Props) {
  const { theme } = useTheme();
  const { t } = useRTL();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [review, setReview] = useState<RecordedVoice | null>(null);
  const [hint, setHint] = useState(0);
  const pressedAt = useRef(0);
  const starting = useRef<Promise<RecorderStartResult>>(Promise.resolve('failed'));
  const phaseRef = useRef<Phase>('idle');
  phaseRef.current = phase;
  const finishRef = useRef<() => Promise<void>>(async () => undefined);

  const gesture = useSharedValue(GESTURE_IDLE);
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);
  const cancelDistance = useSharedValue(120);

  const recorder = useVoiceRecorder(() => {
    if (phaseRef.current === 'holding' || phaseRef.current === 'locked') {
      gesture.value = GESTURE_IDLE;
      void finishRef.current();
    }
  });

  const finishAndSend = useCallback(async () => {
    const recorded = await recorder.finish();
    setPhase('idle');
    if (recorded) onSendVoice(recorded);
  }, [recorder, onSendVoice]);
  finishRef.current = finishAndSend;

  const discard = useCallback(
    async (animate: boolean) => {
      voicePlayback.pause();
      setPhase(animate ? 'discarding' : 'idle');
      setReview(null);
      await starting.current;
      await recorder.discard();
    },
    [recorder],
  );

  const discardRef = useRef(discard);
  discardRef.current = discard;

  useFocusEffect(
    useCallback(
      () => () => {
        if (phaseRef.current !== 'idle') void discardRef.current(false);
      },
      [],
    ),
  );

  useEffect(() => {
    if (!review) return;
    return () => voicePlayback.pause();
  }, [review]);

  const handlePressIn = useCallback(() => {
    pressedAt.current = Date.now();
    setPhase('holding');
    starting.current = recorder.start().then((result) => {
      if (result === 'recording') {
        hapticTick();
        return result;
      }
      gesture.value = GESTURE_IDLE;
      setPhase('idle');
      if (result === 'denied') Alert.alert(t('common.error'), t('chat.voice.micDenied'));
      return result;
    });
  }, [recorder, gesture, t]);

  const handleRelease = useCallback(async () => {
    const heldFor = Date.now() - pressedAt.current;
    const result = await starting.current;
    if (result !== 'recording' || phaseRef.current !== 'holding') return;
    if (heldFor < QUICK_TAP_MS) {
      await recorder.discard();
      setPhase('idle');
      setHint((value) => value + 1);
      return;
    }
    await finishAndSend();
  }, [recorder, finishAndSend]);

  const handleCancel = useCallback(() => {
    hapticTick();
    void discard(true);
  }, [discard]);

  const handleLock = useCallback(() => {
    hapticTick();
    setPhase('locked');
  }, []);

  const handlePause = useCallback(() => {
    recorder.pause();
    setPhase('paused');
  }, [recorder]);

  const handleResume = useCallback(() => {
    recorder.resume();
    setPhase('locked');
  }, [recorder]);

  const handlePreview = useCallback(async () => {
    const recorded = await recorder.finish();
    if (!recorded) {
      setPhase('idle');
      return;
    }
    setReview(recorded);
    setPhase('review');
    voicePlayback.toggle(PREVIEW_KEY, { key: PREVIEW_KEY, uri: recorded.uri, durationMs: recorded.durationMs });
  }, [recorder]);

  const handleLockedSend = useCallback(async () => {
    voicePlayback.pause();
    if (review) {
      setReview(null);
      setPhase('idle');
      onSendVoice(review);
      return;
    }
    await finishAndSend();
  }, [review, onSendVoice, finishAndSend]);

  const handleLockedDiscard = useCallback(() => {
    if (review) {
      const uri = review.uri;
      void discard(true).then(() => recorder.forget(uri));
      return;
    }
    void discard(true);
  }, [review, discard, recorder]);

  const handleSendText = useCallback(async () => {
    const value = text.trim();
    if (!value || sending) return;
    setSending(true);
    setText('');
    const sent = await onSendText(value);
    if (!sent) setText(value);
    setSending(false);
  }, [text, sending, onSendText]);

  const onLayout = (event: LayoutChangeEvent) => {
    cancelDistance.value = event.nativeEvent.layout.width * CANCEL_RATIO;
  };

  const locked = phase === 'locked' || phase === 'paused' || phase === 'review';

  return (
    <View
      onLayout={onLayout}
      style={[styles.bar, { backgroundColor: theme.colors.card, borderTopColor: theme.colors.divider }]}
    >
      <HoldToRecordHint trigger={hint} />
      <View style={[styles.inputWrap, { backgroundColor: theme.colors.surface }]}>
        <TextInput
          style={[styles.input, { color: theme.colors.text }, phase !== 'idle' && styles.hidden]}
          value={text}
          onChangeText={setText}
          placeholder={t('chat.typeMessage')}
          placeholderTextColor={theme.colors.inputPlaceholder}
          editable={phase === 'idle'}
          multiline
          maxLength={2000}
        />
        {phase === 'holding' ? (
          <View style={styles.overlay} pointerEvents="none">
            <RecordingTimer elapsedMs={recorder.elapsedMs} running />
            <View style={styles.cancelSlot}>
              <SlideToCancel dragX={dragX} cancelDistance={cancelDistance} />
            </View>
          </View>
        ) : null}
        {phase === 'discarding' ? (
          <View style={styles.overlay} pointerEvents="none">
            <TrashAnimation onDone={() => setPhase('idle')} />
          </View>
        ) : null}
      </View>
      <VoiceComposerButton
        hasText={text.trim().length > 0}
        disabled={sending || phase === 'discarding'}
        holding={phase === 'holding'}
        gesture={gesture}
        dragX={dragX}
        dragY={dragY}
        cancelDistance={cancelDistance}
        onSend={handleSendText}
        onPressIn={handlePressIn}
        onRelease={handleRelease}
        onCancel={handleCancel}
        onLock={handleLock}
      />
      {locked ? (
        <LockedRecorder
          paused={phase !== 'locked'}
          review={review}
          elapsedMs={recorder.elapsedMs}
          snapshot={recorder.snapshot}
          levels={recorder.live}
          onDiscard={handleLockedDiscard}
          onPause={handlePause}
          onResume={handleResume}
          onPreview={handlePreview}
          onSend={handleLockedSend}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    gap: spacing.sm,
  },
  inputWrap: {
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: borderRadius['2xl'],
    paddingHorizontal: spacing.md,
  },
  input: {
    fontSize: fontSize.base,
    lineHeight: 24,
    maxHeight: 100,
    paddingTop: 10,
    paddingBottom: 10,
    textAlignVertical: 'center',
  },
  hidden: { opacity: 0 },
  overlay: {
    ...StyleSheet.absoluteFill,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  cancelSlot: { flex: 1, alignItems: 'center' },
});
