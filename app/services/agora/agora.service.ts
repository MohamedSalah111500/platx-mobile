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
  initialized = true;
  return engine;
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
