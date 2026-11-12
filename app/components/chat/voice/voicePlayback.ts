import { createAudioPlayer, setAudioModeAsync, type AudioPlayer, type AudioStatus } from 'expo-audio';
import { chatApi } from '../../../services/api/chat.api';

export type VoicePlaybackStatus = 'idle' | 'loading' | 'playing' | 'paused';

export interface VoiceTrack {
  key: string;
  uri: string;
  durationMs: number;
  messageId?: number;
}

export interface VoicePlaybackState {
  status: VoicePlaybackStatus;
  positionMs: number;
  rate: number;
}

type Listener = (state: VoicePlaybackState) => void;

const RATES = [1, 1.5, 2];
const UPDATE_INTERVAL_MS = 100;
const END_MARGIN_MS = 250;

class VoicePlaybackCoordinator {
  private player: AudioPlayer | null = null;
  private activeKey: string | null = null;
  private activeTrack: VoiceTrack | null = null;
  private status: VoicePlaybackStatus = 'idle';
  private rate = 1;
  private pendingSeekMs: number | null = null;
  private recovering = false;
  private recording = false;
  private retried = new Set<string>();
  private positions = new Map<string, number>();
  private tracks: VoiceTrack[] = [];
  private listeners = new Map<string, Set<Listener>>();

  setRecording(recording: boolean): void {
    this.recording = recording;
    if (recording) this.pause();
  }

  setTracks(tracks: VoiceTrack[]): void {
    this.tracks = tracks;
  }

  getState(key: string): VoicePlaybackState {
    return {
      status: key === this.activeKey ? this.status : 'idle',
      positionMs: this.positions.get(key) ?? 0,
      rate: this.rate,
    };
  }

  subscribe(key: string, listener: Listener): () => void {
    const set = this.listeners.get(key) ?? new Set<Listener>();
    set.add(listener);
    this.listeners.set(key, set);
    return () => {
      set.delete(listener);
      if (!set.size) this.listeners.delete(key);
    };
  }

  toggle(key: string, track?: VoiceTrack): void {
    if (this.recording) return;
    if (key === this.activeKey && this.player) {
      if (this.status === 'paused') {
        this.status = 'loading';
        this.player.play();
      } else {
        this.player.pause();
        this.status = 'paused';
      }
      this.emit(key);
      return;
    }
    const target = track ?? this.tracks.find((item) => item.key === key);
    if (target) void this.start(target);
  }

  seek(key: string, fraction: number, durationMs: number): void {
    const positionMs = Math.max(0, Math.min(1, fraction)) * durationMs;
    this.positions.set(key, positionMs);
    if (key === this.activeKey && this.player) {
      if (this.pendingSeekMs != null) this.pendingSeekMs = positionMs;
      else void this.player.seekTo(positionMs / 1000).catch(() => undefined);
    }
    this.emit(key);
  }

  cycleRate(): void {
    this.rate = RATES[(RATES.indexOf(this.rate) + 1) % RATES.length];
    this.player?.setPlaybackRate(this.rate);
    if (this.activeKey) this.emit(this.activeKey);
  }

  rekey(from: string, to: string): void {
    const position = this.positions.get(from);
    if (position != null) {
      this.positions.delete(from);
      this.positions.set(to, position);
    }
    if (this.activeKey === from) {
      this.activeKey = to;
      if (this.activeTrack) this.activeTrack = { ...this.activeTrack, key: to };
    }
    this.emit(to);
  }

  pause(): void {
    if (!this.player || !this.activeKey || this.status === 'paused') return;
    this.player.pause();
    this.status = 'paused';
    this.emit(this.activeKey);
  }

  release(): void {
    const key = this.activeKey;
    this.player?.remove();
    this.player = null;
    this.activeKey = null;
    this.activeTrack = null;
    this.status = 'idle';
    this.pendingSeekMs = null;
    this.recovering = false;
    this.positions.clear();
    this.retried.clear();
    this.tracks = [];
    if (key) this.emit(key);
  }

  private async start(track: VoiceTrack): Promise<void> {
    const previous = this.activeKey;
    if (previous && this.player) {
      this.player.pause();
      this.status = 'idle';
      this.emit(previous);
    }
    this.activeKey = track.key;
    this.activeTrack = track;
    this.status = 'loading';
    this.emit(track.key);

    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: false,
        interruptionMode: 'doNotMix',
        shouldRouteThroughEarpiece: false,
      });
    } catch {}
    if (this.activeKey !== track.key) return;

    const saved = this.positions.get(track.key) ?? 0;
    this.pendingSeekMs = saved > 0 && saved < track.durationMs - END_MARGIN_MS ? saved : null;
    const player = this.ensurePlayer();
    player.replace({ uri: track.uri });
    player.setPlaybackRate(this.rate);
    player.play();
  }

  private ensurePlayer(): AudioPlayer {
    if (this.player) return this.player;
    const player = createAudioPlayer(null, { updateInterval: UPDATE_INTERVAL_MS });
    player.addListener('playbackStatusUpdate', this.onStatus);
    this.player = player;
    return player;
  }

  private onStatus = (status: AudioStatus): void => {
    const key = this.activeKey;
    if (!key || !this.player) return;

    if (status.error) {
      void this.recover(key);
      return;
    }

    if (status.didJustFinish) {
      this.positions.delete(key);
      this.status = 'idle';
      this.activeKey = null;
      this.activeTrack = null;
      this.player.pause();
      this.emit(key);
      this.playNext(key);
      return;
    }

    if (status.isLoaded && this.pendingSeekMs != null) {
      const seekMs = this.pendingSeekMs;
      this.pendingSeekMs = null;
      void this.player.seekTo(seekMs / 1000).catch(() => undefined);
      return;
    }

    if (this.status === 'paused') return;

    const ready = status.isLoaded && !status.isBuffering;
    if (ready && status.playing) {
      this.retried.delete(key);
      this.status = 'playing';
      this.positions.set(key, status.currentTime * 1000);
    } else {
      this.status = 'loading';
    }
    this.emit(key);
  };

  private async recover(key: string): Promise<void> {
    if (this.recovering) return;
    const track = this.activeTrack;
    this.player?.pause();
    if (!track || track.messageId == null || this.retried.has(key)) {
      this.status = 'idle';
      this.activeKey = null;
      this.activeTrack = null;
      this.emit(key);
      return;
    }
    this.recovering = true;
    this.retried.add(key);
    try {
      const voice = await chatApi.getVoice(track.messageId);
      if (this.activeKey !== key) return;
      const fresh = { ...track, uri: voice.url };
      this.tracks = this.tracks.map((item) => (item.key === key ? fresh : item));
      this.activeKey = null;
      await this.start(fresh);
    } catch {
      if (this.activeKey === key) {
        this.status = 'idle';
        this.activeKey = null;
        this.activeTrack = null;
        this.emit(key);
      }
    } finally {
      this.recovering = false;
    }
  }

  private playNext(key: string): void {
    const index = this.tracks.findIndex((item) => item.key === key);
    const next = index >= 0 ? this.tracks[index + 1] : undefined;
    if (next) void this.start(next);
  }

  private emit(key: string): void {
    const set = this.listeners.get(key);
    if (!set) return;
    const state = this.getState(key);
    set.forEach((listener) => listener(state));
  }
}

export const voicePlayback = new VoicePlaybackCoordinator();
