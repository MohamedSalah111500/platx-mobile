import apiClient from './client';
import { LIVE_URLS } from './endpoints';
import type {
  LiveSession,
  LiveParticipant,
  AgoraTokenResponse,
  CreateLivePayload,
  JoinLivePayload,
} from '../../types/live.types';

export const liveApi = {
  create: async (payload: CreateLivePayload): Promise<LiveSession> => {
    const { data } = await apiClient.post<LiveSession>(LIVE_URLS.CREATE, payload);
    return data;
  },

  join: async (payload: JoinLivePayload): Promise<any> => {
    // Web sends FormData for student join (supports payment proof upload)
    const formData = new FormData();
    formData.append('liveClassroomId', String(payload.liveClassroomId));
    formData.append('studentId', String(payload.studentId));
    formData.append('paymentTransactionId', '');
    formData.append('paymentTransactionImg', '');
    // In React Native, set multipart/form-data explicitly so the networking
    // layer adds the boundary automatically. Using `undefined` (browser trick)
    // does NOT work in RN and leaves the default application/json header.
    const { data } = await apiClient.post<any>(LIVE_URLS.JOIN, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  joinStaff: async (payload: {
    liveClassroomId: number;
    staffId: number;
  }): Promise<any> => {
    const { data } = await apiClient.post<any>(
      LIVE_URLS.JOIN_STAFF,
      { liveClassroomId: payload.liveClassroomId, staffId: payload.staffId, role: 'staff' }
    );
    return data;
  },

  getActive: async (): Promise<LiveSession[]> => {
    const { data } = await apiClient.get<any>(LIVE_URLS.ACTIVE);
    // Handle both array and paginated response { data: [], totalCount }
    if (Array.isArray(data)) return data;
    if (data?.data && Array.isArray(data.data)) return data.data;
    if (data?.items && Array.isArray(data.items)) return data.items;
    return [];
  },

  getToken: async (payload: {
    channelName: string;
    uid: number;
    role: number;
  }): Promise<AgoraTokenResponse> => {
    const { data } = await apiClient.post<AgoraTokenResponse>(
      LIVE_URLS.GET_TOKEN,
      payload
    );
    return data;
  },

  getRoom: async (roomId: number): Promise<LiveSession> => {
    const { data } = await apiClient.get<LiveSession>(LIVE_URLS.GET_ROOM(roomId));
    return data;
  },

  getParticipants: async (roomId: number): Promise<LiveParticipant[]> => {
    const { data } = await apiClient.get<LiveParticipant[]>(
      LIVE_URLS.GET_PARTICIPANTS(roomId)
    );
    return data;
  },

  approve: async (payload: {
    liveClassroomId: number;
    studentId: number;
    approve: boolean;
  }): Promise<void> => {
    await apiClient.post(LIVE_URLS.APPROVE, payload);
  },

  removeParticipant: async (
    roomId: number,
    studentId: number
  ): Promise<void> => {
    await apiClient.delete(LIVE_URLS.REMOVE_PARTICIPANT(roomId, studentId));
  },

  endLive: async (payload: {
    liveClassroomId: number;
    teacherId: number;
  }): Promise<void> => {
    await apiClient.post(LIVE_URLS.END_LIVE, payload);
  },
};
