import { TurboModuleRegistry } from 'react-native';

let createAgoraRtcEngine: any = null;
let ChannelProfileType: any = {};
let ClientRoleType: any = {};

const hasAgora = !!TurboModuleRegistry.get('AgoraRtcNg');
if (hasAgora) {
  try {
    const agora = require('react-native-agora');
    createAgoraRtcEngine = agora.createAgoraRtcEngine;
    ChannelProfileType = agora.ChannelProfileType;
    ClientRoleType = agora.ClientRoleType;
  } catch {
    // Agora native module not available
  }
}

export type IRtcEngineEventHandler = {
  onJoinChannelSuccess?: (connection: any, elapsed: number) => void;
  onUserJoined?: (connection: any, remoteUid: number) => void;
  onUserOffline?: (connection: any, remoteUid: number) => void;
  onError?: (errCode: number, msg: string) => void;
  // Audio diagnostics: they say whether the microphone is actually capturing and
  // whether a remote stream is arriving, which is what "no sound" comes down to.
  onLocalAudioStateChanged?: (connection: any, state: number, error: number) => void;
  onRemoteAudioStateChanged?: (
    connection: any,
    remoteUid: number,
    state: number,
    reason: number,
    elapsed: number,
  ) => void;
  onUserMuteAudio?: (connection: any, remoteUid: number, muted: boolean) => void;
  onAudioRoutingChanged?: (routing: number) => void;
};

let engine: any = null;
let initialized = false;

export function isAgoraAvailable(): boolean {
  return hasAgora && !!createAgoraRtcEngine;
}

export function initEngine(appId: string): any {
  if (!isAgoraAvailable()) {
    console.warn('[Agora] Native module not available');
    return null;
  }
  if (initialized && engine) return engine;
  engine = createAgoraRtcEngine();
  engine.initialize({ appId });
  engine.setChannelProfile(ChannelProfileType.ChannelProfileLiveBroadcasting);
  // Without this the call can come out of the earpiece, which sounds like silence
  // to anyone not holding the phone to their ear.
  try {
    engine.setDefaultAudioRouteToSpeakerphone(true);
  } catch (err) {
    console.warn('[Agora] could not set the default audio route:', err);
  }
  initialized = true;
  return engine;
}

/** Routes the call to the loudspeaker; safe to call after joining a channel. */
export function useSpeakerphone(on = true) {
  try {
    engine?.setEnableSpeakerphone(on);
  } catch (err) {
    console.warn('[Agora] could not switch the speaker:', err);
  }
}

export function joinAsHost(token: string | null, channel: string, uid: number) {
  if (!engine) throw new Error('Agora engine not initialized');
  engine.setClientRole(ClientRoleType.ClientRoleBroadcaster);
  engine.enableAudio();
  engine.enableVideo();
  engine.startPreview();
  engine.joinChannel(token ?? '', channel, uid, {
    publishMicrophoneTrack: true,
    publishCameraTrack: true,
    autoSubscribeAudio: true,
    autoSubscribeVideo: true,
  });
  useSpeakerphone(true);
}

export function joinAsAudience(token: string | null, channel: string, uid: number) {
  if (!engine) throw new Error('Agora engine not initialized');
  engine.setClientRole(ClientRoleType.ClientRoleAudience);
  engine.enableAudio();
  engine.joinChannel(token ?? '', channel, uid, {
    autoSubscribeAudio: true,
    autoSubscribeVideo: true,
    publishMicrophoneTrack: false,
    publishCameraTrack: false,
  });
  useSpeakerphone(true);
}

export function toggleMic(mute: boolean) {
  engine?.muteLocalAudioStream(mute);
}

export function toggleCamera(mute: boolean) {
  engine?.muteLocalVideoStream(mute);
}

export function registerEvents(handler: IRtcEngineEventHandler) {
  engine?.registerEventHandler(handler);
}

export function unregisterEvents(handler: IRtcEngineEventHandler) {
  engine?.unregisterEventHandler(handler);
}

export function leave() {
  try {
    engine?.leaveChannel();
  } catch (err) {
    console.warn('[Agora] leaveChannel error:', err);
  }
}

export function destroy() {
  try {
    engine?.stopPreview();
    engine?.release();
  } catch (err) {
    console.warn('[Agora] release error:', err);
  }
  engine = null;
  initialized = false;
}

export function getEngine(): any {
  return engine;
}
