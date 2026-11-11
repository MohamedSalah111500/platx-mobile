import apiClient from './client';
import { LIVE_REALTIME_URLS } from './endpoints';

export const REALTIME_TRACK_KIND = {
  Audio: 'audio',
  Video: 'video',
} as const;
export type RealtimeTrackKind = (typeof REALTIME_TRACK_KIND)[keyof typeof REALTIME_TRACK_KIND];

export interface RealtimeSessionDescription {
  type: 'offer' | 'answer';
  sdp: string;
}

export interface RealtimeJoinResponse {
  sessionId: string;
  isHost: boolean;
  iceServers: { urls: string | string[]; username?: string; credential?: string }[];
}

export interface RealtimeSubscribeResponse {
  hostStreaming: boolean;
  requiresImmediateRenegotiation: boolean;
  offer: RealtimeSessionDescription | null;
  tracks: { mid: string; kind: RealtimeTrackKind }[];
}

export const liveRealtimeApi = {
  startSession: async (liveId: number): Promise<RealtimeJoinResponse> => {
    const { data } = await apiClient.post<RealtimeJoinResponse>(LIVE_REALTIME_URLS.SESSION(liveId), {});
    return data;
  },

  publish: async (
    liveId: number,
    sessionId: string,
    offer: RealtimeSessionDescription,
    tracks: { mid: string; kind: RealtimeTrackKind }[],
  ): Promise<RealtimeSessionDescription> => {
    const { data } = await apiClient.post<RealtimeSessionDescription>(LIVE_REALTIME_URLS.PUBLISH(liveId), {
      sessionId,
      offer,
      tracks,
    });
    return data;
  },

  subscribe: async (liveId: number, sessionId: string, kinds: RealtimeTrackKind[]): Promise<RealtimeSubscribeResponse> => {
    const { data } = await apiClient.post<RealtimeSubscribeResponse>(LIVE_REALTIME_URLS.SUBSCRIBE(liveId), {
      sessionId,
      kinds,
    });
    return data;
  },

  renegotiate: async (liveId: number, sessionId: string, answer: RealtimeSessionDescription): Promise<void> => {
    await apiClient.put(LIVE_REALTIME_URLS.RENEGOTIATE(liveId), { sessionId, answer });
  },

  close: async (liveId: number, sessionId: string, mids: string[]): Promise<void> => {
    await apiClient.put(LIVE_REALTIME_URLS.CLOSE(liveId), { sessionId, mids });
  },
};
