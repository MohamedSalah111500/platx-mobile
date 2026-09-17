import { useCallback, useEffect, useRef } from 'react';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

const sounds = {
  tap: require('../../assets/sounds/tap.wav'),
  pop: require('../../assets/sounds/pop.wav'),
  success: require('../../assets/sounds/success.wav'),
  swoosh: require('../../assets/sounds/swoosh.wav'),
};

export type SoundName = keyof typeof sounds;

// Preloaded sound cache (shared across hook instances)
const cache = new Map<SoundName, AudioPlayer>();
let audioReady = false;

async function ensureAudio() {
  if (audioReady) return;
  try {
    await setAudioModeAsync({
      playsInSilentMode: false,
      interruptionMode: 'duckOthers',
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
        const player = createAudioPlayer(source);
        player.volume = 0.5;
        cache.set(name, player);
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
      const player = cache.get(name);
      if (player) {
        await player.seekTo(0);
        player.play();
      }
    } catch {
      // Silently fail – sound is non-critical
    }
  }, []);

  return { play };
}
