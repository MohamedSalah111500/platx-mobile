import { AppState, AppStateStatus, NativeEventSubscription, NativeModules } from 'react-native';
import type {
  MediaStream as RtcMediaStream,
  MediaStreamTrack as RtcMediaStreamTrack,
  RTCPeerConnection as RtcPeerConnection,
  RTCRtpSender as RtcRtpSender,
} from 'react-native-webrtc';
import {
  liveRealtimeApi,
  REALTIME_TRACK_KIND,
  RealtimeSessionDescription,
  RealtimeTrackKind,
} from '../api/liveRealtime.api';

type WebRtcModule = typeof import('react-native-webrtc');

const webrtc: WebRtcModule | null = NativeModules.WebRTCModule ? require('react-native-webrtc') : null;

const CAMERA_CONSTRAINTS = { facingMode: 'user', width: 1280, height: 720, frameRate: 24 };
const CAMERA_MAX_BITRATE = 900_000;
const ICE_GATHERING_TIMEOUT_MS = 3000;
const RECOVERY_DELAY_MS = 2000;
const RECOVERY_MAX_DELAY_MS = 15000;

export interface LiveRealtimeListener {
  onLocalStream?: (url: string | null) => void;
  onRemoteStream?: (url: string | null) => void;
  onConnected?: (connected: boolean) => void;
}

class LiveRealtimeService {
  private pc: RtcPeerConnection | null = null;
  private liveId = 0;
  private sessionId = '';
  private isHost = false;
  private generation = 0;
  private queue: Promise<unknown> = Promise.resolve();
  private listener: LiveRealtimeListener = {};

  private localStream: RtcMediaStream | null = null;
  private remoteStream: RtcMediaStream | null = null;
  private videoSender: RtcRtpSender | null = null;
  private facingMode: 'user' | 'environment' = 'user';

  private videoMid: string | null = null;
  private videoPausedInBackground = false;
  private appStateSubscription: NativeEventSubscription | null = null;
  private recoveryTimer?: ReturnType<typeof setTimeout>;
  private recoveryAttempts = 0;

  isAvailable(): boolean {
    return !!webrtc;
  }

  setListener(listener: LiveRealtimeListener): void {
    this.listener = listener;
  }

  async joinAsHost(liveId: number): Promise<void> {
    const generation = await this.openSession(liveId, true);
    const rtc = webrtc!;
    const stream = await rtc.mediaDevices
      .getUserMedia({ audio: true, video: CAMERA_CONSTRAINTS })
      .catch(() => rtc.mediaDevices.getUserMedia({ audio: true, video: false }));
    if (generation !== this.generation) {
      stream.getTracks().forEach((t) => t.stop());
      return;
    }

    this.localStream = stream;
    this.facingMode = 'user';
    const pc = this.pc!;
    const audio = stream.getAudioTracks()[0];
    const camera = stream.getVideoTracks()[0];
    const audioTransceiver = audio ? pc.addTransceiver(audio, { direction: 'sendonly' }) : null;
    const videoTransceiver = camera
      ? pc.addTransceiver(camera, { direction: 'sendonly', sendEncodings: [{ maxBitrate: CAMERA_MAX_BITRATE }] })
      : null;
    this.videoSender = videoTransceiver?.sender ?? null;
    this.listener.onLocalStream?.(camera ? stream.toURL() : null);

    await this.run(async () => {
      await pc.setLocalDescription(await pc.createOffer({}));
      await this.waitForIceGathering(pc);
      const tracks: { mid: string; kind: RealtimeTrackKind }[] = [];
      if (audioTransceiver?.mid) tracks.push({ mid: audioTransceiver.mid, kind: REALTIME_TRACK_KIND.Audio });
      if (videoTransceiver?.mid) tracks.push({ mid: videoTransceiver.mid, kind: REALTIME_TRACK_KIND.Video });
      const answer = await liveRealtimeApi.publish(liveId, this.sessionId, this.localDescription(pc), tracks);
      if (generation !== this.generation) return;
      await pc.setRemoteDescription(new rtc.RTCSessionDescription(answer));
      this.recoveryAttempts = 0;
      this.listener.onConnected?.(true);
    });
  }

  async joinAsAudience(liveId: number): Promise<void> {
    const generation = await this.openSession(liveId, false);
    if (generation !== this.generation) return;
    this.pc!.addEventListener('track', (event: any) => this.onRemoteTrack(event.track));
    this.appStateSubscription = AppState.addEventListener('change', (state) => this.handleAppState(state));
    this.listener.onConnected?.(true);
    try {
      await this.pull([REALTIME_TRACK_KIND.Audio, REALTIME_TRACK_KIND.Video]);
    } catch {
      this.scheduleRecovery(generation);
    }
  }

  async reconnectAudience(): Promise<void> {
    if (this.isHost || !this.liveId) return;
    const liveId = this.liveId;
    await this.leave();
    await this.joinAsAudience(liveId);
  }

  setMicMuted(muted: boolean): void {
    this.localStream?.getAudioTracks().forEach((t) => {
      t.enabled = !muted;
    });
  }

  setCameraOff(off: boolean): void {
    this.localStream?.getVideoTracks().forEach((t) => {
      t.enabled = !off;
    });
  }

  async switchCamera(): Promise<boolean> {
    const camera = this.localStream?.getVideoTracks()[0];
    if (!camera) return false;
    const next = this.facingMode === 'user' ? 'environment' : 'user';
    try {
      await camera.applyConstraints({ facingMode: next });
      this.facingMode = next;
      return true;
    } catch {
      return false;
    }
  }

  get isFrontCamera(): boolean {
    return this.facingMode === 'user';
  }

  async leave(): Promise<void> {
    this.generation++;
    clearTimeout(this.recoveryTimer);
    this.appStateSubscription?.remove();
    this.appStateSubscription = null;
    this.videoMid = null;
    this.videoPausedInBackground = false;
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.localStream?.release();
    this.localStream = null;
    this.remoteStream = null;
    this.videoSender = null;
    this.pc?.close();
    this.pc = null;
    this.sessionId = '';
    this.queue = Promise.resolve();
    this.listener.onLocalStream?.(null);
    this.listener.onRemoteStream?.(null);
    this.listener.onConnected?.(false);
  }

  private async openSession(liveId: number, isHost: boolean): Promise<number> {
    await this.leave();
    const generation = this.generation;
    this.liveId = liveId;
    this.isHost = isHost;

    const session = await liveRealtimeApi.startSession(liveId);
    if (generation !== this.generation) return generation;

    this.sessionId = session.sessionId;
    const pc = new webrtc!.RTCPeerConnection({ iceServers: session.iceServers, bundlePolicy: 'max-bundle' });
    pc.addEventListener('connectionstatechange', () => {
      if (pc.connectionState === 'failed') this.scheduleRecovery(generation);
    });
    this.pc = pc;
    return generation;
  }

  private scheduleRecovery(generation: number): void {
    if (generation !== this.generation) return;
    clearTimeout(this.recoveryTimer);
    const { liveId, isHost } = this;
    this.recoveryAttempts++;
    const delay = Math.min(RECOVERY_DELAY_MS * this.recoveryAttempts, RECOVERY_MAX_DELAY_MS);
    this.recoveryTimer = setTimeout(() => {
      if (generation !== this.generation) return;
      const rejoin = isHost ? this.joinAsHost(liveId) : this.joinAsAudience(liveId);
      rejoin.catch(() => this.scheduleRecovery(this.generation));
    }, delay);
  }

  private pull(kinds: RealtimeTrackKind[]): Promise<void> {
    const generation = this.generation;
    return this.run(async () => {
      const pc = this.pc;
      if (!pc || generation !== this.generation) return;

      const result = await liveRealtimeApi.subscribe(this.liveId, this.sessionId, kinds);
      if (!result.hostStreaming || !result.offer || result.tracks.length === 0 || generation !== this.generation) return;

      const video = result.tracks.find((t) => t.kind === REALTIME_TRACK_KIND.Video);
      if (video) this.videoMid = video.mid;

      await pc.setRemoteDescription(new webrtc!.RTCSessionDescription(result.offer));
      await pc.setLocalDescription(await pc.createAnswer());
      await this.waitForIceGathering(pc);
      if (generation !== this.generation) return;
      await liveRealtimeApi.renegotiate(this.liveId, this.sessionId, this.localDescription(pc));
    });
  }

  private onRemoteTrack(track: RtcMediaStreamTrack): void {
    this.recoveryAttempts = 0;
    const others = (this.remoteStream?.getTracks() ?? []).filter(
      (t) => t.kind !== track.kind && t.readyState === 'live',
    );
    this.remoteStream = new webrtc!.MediaStream([...others, track]);
    this.publishRemote();
  }

  private publishRemote(): void {
    const hasVideo = !!this.remoteStream?.getVideoTracks().length;
    this.listener.onRemoteStream?.(this.remoteStream && hasVideo ? this.remoteStream.toURL() : null);
  }

  private handleAppState(state: AppStateStatus): void {
    if (this.isHost || !this.pc) return;
    if (state === 'background') {
      void this.pauseVideo();
    } else if (state === 'active' && this.videoPausedInBackground) {
      this.videoPausedInBackground = false;
      void this.pull([REALTIME_TRACK_KIND.Video]);
    }
  }

  private pauseVideo(): Promise<void> {
    const generation = this.generation;
    return this.run(async () => {
      if (!this.videoMid || generation !== this.generation) return;
      const mid = this.videoMid;
      this.videoMid = null;
      this.videoPausedInBackground = true;
      await liveRealtimeApi.close(this.liveId, this.sessionId, [mid]).catch(() => undefined);
      const remaining = (this.remoteStream?.getTracks() ?? []).filter((t) => t.kind !== REALTIME_TRACK_KIND.Video);
      this.remoteStream = new webrtc!.MediaStream(remaining);
      this.publishRemote();
      if (AppState.currentState === 'active' && this.videoPausedInBackground) {
        this.videoPausedInBackground = false;
        void this.pull([REALTIME_TRACK_KIND.Video]);
      }
    });
  }

  private run<T>(operation: () => Promise<T>): Promise<T> {
    const next = this.queue.then(operation, operation);
    this.queue = next.catch(() => undefined);
    return next;
  }

  private localDescription(pc: RtcPeerConnection): RealtimeSessionDescription {
    const description = pc.localDescription!;
    return { type: description.type as RealtimeSessionDescription['type'], sdp: description.sdp };
  }

  private waitForIceGathering(pc: RtcPeerConnection): Promise<void> {
    if (pc.iceGatheringState === 'complete') return Promise.resolve();
    return new Promise((resolve) => {
      const onChange = () => {
        if (pc.iceGatheringState === 'complete') done();
      };
      const done = () => {
        clearTimeout(timer);
        pc.removeEventListener('icegatheringstatechange', onChange);
        resolve();
      };
      const timer = setTimeout(done, ICE_GATHERING_TIMEOUT_MS);
      pc.addEventListener('icegatheringstatechange', onChange);
    });
  }
}

export const liveRealtime = new LiveRealtimeService();
