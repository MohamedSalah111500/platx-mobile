import { useCallback, useEffect, useRef } from 'react';
import { Audio } from 'expo-av';

const sounds = {
  tap: require('../../assets/sounds/tap.wav'),
  pop: require('../../assets/sounds/pop.wav'),
  success: require('../../assets/sounds/success.wav'),
  swoosh: require('../../assets/sounds/swoosh.wav'),
};

export type SoundName = keyof typeof sounds;

// Preloaded sound cache (shared across hook instances)
const cache = new Map<SoundName, Audio.Sound>();
let audioReady = false;

async function ensureAudio() {
  if (audioReady) return;
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: false,
      shouldDuckAndroid: true,
    });
    audioReady = true;
  } catch {
    // Ignore – audio may not be available
  }
}

async function preloadAll() {
  await ensureAudio();
  const entries = Object.entries(sounds) as [SoundName, any][];
  await Promise.all(
    entries.map(async ([name, source]) => {
      if (cache.has(name)) return;
      try {
        const { sound } = await Audio.Sound.createAsync(source, { shouldPlay: false, volume: 0.5 });
        cache.set(name, sound);
      } catch {
        // Skip if loading fails
      }
    }),
  );
}

export function useSound() {
  const mounted = useRef(true);

  useEffect(() => {
    preloadAll();
    return () => {
      mounted.current = false;
    };
  }, []);

  const play = useCallback(async (name: SoundName) => {
    try {
      const sound = cache.get(name);
      if (sound) {
        await sound.setPositionAsync(0);
        await sound.playAsync();
      }
    } catch {
      // Silently fail – sound is non-critical
    }
  }, []);

  return { play };
}
