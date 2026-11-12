import React, { useEffect } from 'react';
import { I18nManager, StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useTheme } from '../../../theme/ThemeProvider';
import { LOCK_DISTANCE, LockPill } from './LockPill';

export const GESTURE_IDLE = 0;
export const GESTURE_HOLDING = 1;
export const GESTURE_DONE = 2;

const SIZE = 44;
const HOLD_SCALE = 1.55;
const IS_RTL = I18nManager.isRTL;
const SPRING = { damping: 16, stiffness: 220 };

interface Props {
  hasText: boolean;
  disabled: boolean;
  holding: boolean;
  gesture: SharedValue<number>;
  dragX: SharedValue<number>;
  dragY: SharedValue<number>;
  cancelDistance: SharedValue<number>;
  onSend: () => void;
  onPressIn: () => void;
  onRelease: () => void;
  onCancel: () => void;
  onLock: () => void;
}

export function VoiceComposerButton({
  hasText,
  disabled,
  holding,
  gesture,
  dragX,
  dragY,
  cancelDistance,
  onSend,
  onPressIn,
  onRelease,
  onCancel,
  onLock,
}: Props) {
  const { theme } = useTheme();
  const morph = useSharedValue(hasText ? 1 : 0);
  const press = useSharedValue(0);

  useEffect(() => {
    morph.value = withTiming(hasText ? 1 : 0, { duration: 180 });
  }, [hasText, morph]);

  const settle = () => {
    'worklet';
    press.value = withSpring(0, SPRING);
    dragX.value = withSpring(0, SPRING);
    dragY.value = withSpring(0, SPRING);
  };

  const record = Gesture.Pan()
    .enabled(!hasText && !disabled)
    .minDistance(0)
    .shouldCancelWhenOutside(false)
    .onBegin(() => {
      gesture.value = GESTURE_HOLDING;
      dragX.value = 0;
      dragY.value = 0;
      press.value = withSpring(1, SPRING);
      scheduleOnRN(onPressIn);
    })
    .onUpdate((event) => {
      if (gesture.value !== GESTURE_HOLDING) return;
      const towardStart = IS_RTL ? event.translationX : -event.translationX;
      const up = -event.translationY;
      if (towardStart >= up) {
        dragX.value = IS_RTL ? Math.max(0, event.translationX) : Math.min(0, event.translationX);
        dragY.value = 0;
      } else {
        dragX.value = 0;
        dragY.value = Math.min(0, event.translationY);
      }
      if (towardStart > cancelDistance.value) {
        gesture.value = GESTURE_DONE;
        settle();
        scheduleOnRN(onCancel);
      } else if (up > LOCK_DISTANCE) {
        gesture.value = GESTURE_DONE;
        settle();
        scheduleOnRN(onLock);
      }
    })
    .onFinalize(() => {
      if (gesture.value === GESTURE_HOLDING) {
        gesture.value = GESTURE_IDLE;
        scheduleOnRN(onRelease);
      }
      settle();
    });

  const send = Gesture.Tap()
    .enabled(hasText && !disabled)
    .onEnd(() => {
      scheduleOnRN(onSend);
    });

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: dragX.value },
      { translateY: dragY.value },
      { scale: 1 + press.value * (HOLD_SCALE - 1) },
    ],
  }));
  const micStyle = useAnimatedStyle(() => ({
    opacity: 1 - morph.value,
    transform: [{ scale: 1 - morph.value * 0.5 }, { rotate: `${-90 * morph.value}deg` }],
  }));
  const sendStyle = useAnimatedStyle(() => ({
    opacity: morph.value,
    transform: [{ scale: 0.5 + morph.value * 0.5 }, { rotate: `${90 * (1 - morph.value)}deg` }],
  }));

  return (
    <View style={styles.slot}>
      {holding ? <LockPill dragY={dragY} /> : null}
      <GestureDetector gesture={Gesture.Exclusive(send, record)}>
        <Animated.View
          accessibilityRole="button"
          style={[styles.button, { backgroundColor: theme.colors.primary }, disabled && styles.disabled, buttonStyle]}
        >
          <Animated.View style={[styles.icon, micStyle]}>
            <Ionicons name="mic" size={22} color={theme.colors.onPrimary} />
          </Animated.View>
          <Animated.View style={[styles.icon, sendStyle]}>
            <Ionicons
              name="send"
              size={18}
              color={theme.colors.onPrimary}
              style={IS_RTL ? styles.mirrored : undefined}
            />
          </Animated.View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  slot: { width: SIZE, height: SIZE, zIndex: 2 },
  button: {
    width: SIZE,
    height: SIZE,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.4 },
  icon: { position: 'absolute' },
  mirrored: { transform: [{ scaleX: -1 }] },
});
