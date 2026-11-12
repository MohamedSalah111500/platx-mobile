import apiClient from './client';
import { CHAT_URLS } from './endpoints';
import type {
  ChatMessage,
  ChatVoice,
  StaffChatContact,
  SendMessageToStaffPayload,
  SendVoicePayload,
  VoiceRoute,
} from '../../types/chat.types';

const VOICE_UPLOAD_TIMEOUT = 120000;

const VOICE_URLS: Record<VoiceRoute, string> = {
  staffToStudent: CHAT_URLS.SEND_VOICE_TO_STUDENT,
  studentToStaff: CHAT_URLS.SEND_VOICE_TO_STAFF_FROM_STUDENT,
  staffToGroup: CHAT_URLS.SEND_VOICE_TO_GROUP,
  studentToGroup: CHAT_URLS.SEND_VOICE_TO_GROUP_FROM_STUDENT,
  staffToSubGroup: CHAT_URLS.SEND_VOICE_TO_SUBGROUP,
  studentToSubGroup: CHAT_URLS.SEND_VOICE_TO_SUBGROUP_FROM_STUDENT,
};

export const CHAT_PAGE_SIZE = 30;

const pageParams = (beforeId?: number) => (beforeId ? { take: CHAT_PAGE_SIZE, beforeId } : { take: CHAT_PAGE_SIZE });

export const chatApi = {
  getMessagesWithStudent: async (
    studentId: number,
    groupId: number,
    beforeId?: number
  ): Promise<ChatMessage[]> => {
    const { data } = await apiClient.get<ChatMessage[]>(
      CHAT_URLS.GET_MESSAGES_WITH_STUDENT(studentId, groupId),
      { params: pageParams(beforeId) }
    );
    return data;
  },

  getMessagesForTeacher: async (groupId: number, beforeId?: number): Promise<ChatMessage[]> => {
    const { data } = await apiClient.get<ChatMessage[]>(
      CHAT_URLS.GET_MESSAGES_FOR_TEACHER(groupId),
      { params: pageParams(beforeId) }
    );
    return data;
  },

  getMessagesForStudent: async (groupId: number, beforeId?: number): Promise<ChatMessage[]> => {
    const { data } = await apiClient.get<ChatMessage[]>(
      CHAT_URLS.GET_MESSAGES_FOR_STUDENT(groupId),
      { params: pageParams(beforeId) }
    );
    return data;
  },

  // Student: get list of staff the student can chat with
  getStaffHasMessages: async (): Promise<StaffChatContact[]> => {
    const { data } = await apiClient.get<StaffChatContact[]>(
      CHAT_URLS.GET_STAFF_HAS_MESSAGES
    );
    return data;
  },

  // Student: get messages with a specific staff member
  getMessagesWithStaff: async (
    groupId: number,
    staffId: number,
    beforeId?: number
  ): Promise<ChatMessage[]> => {
    const { data } = await apiClient.get<ChatMessage[]>(
      CHAT_URLS.GET_MESSAGES_WITH_STAFF(groupId, staffId),
      { params: pageParams(beforeId) }
    );
    return data;
  },

  sendToGroup: async (payload: {
    content: string;
    groupId: number;
  }): Promise<ChatMessage> => {
    const { data } = await apiClient.post<ChatMessage>(
      CHAT_URLS.SEND_TO_GROUP,
      payload
    );
    return data;
  },

  sendToStudent: async (payload: {
    content: string;
    studentId: number;
    groupId: number;
  }): Promise<ChatMessage> => {
    const { data } = await apiClient.post<ChatMessage>(
      CHAT_URLS.SEND_TO_STUDENT,
      payload
    );
    return data;
  },

  sendToGroupFromStudent: async (payload: {
    content: string;
    groupId: number;
  }): Promise<ChatMessage> => {
    const { data } = await apiClient.post<ChatMessage>(
      CHAT_URLS.SEND_TO_GROUP_FROM_STUDENT,
      payload
    );
    return data;
  },

  // Student: send message to a specific staff member
  sendToStaffFromStudent: async (payload: SendMessageToStaffPayload): Promise<ChatMessage> => {
    const { data } = await apiClient.post<ChatMessage>(
      CHAT_URLS.SEND_TO_STAFF_FROM_STUDENT,
      payload
    );
    return data;
  },

  deleteMessage: async (messageId: number): Promise<void> => {
    await apiClient.delete(CHAT_URLS.DELETE_MESSAGE(messageId));
  },

  getMessagesForTeacherSubGroup: async (subGroupId: number, beforeId?: number): Promise<ChatMessage[]> => {
    const { data } = await apiClient.get<ChatMessage[]>(
      CHAT_URLS.GET_MESSAGES_FOR_TEACHER_SUBGROUP(subGroupId),
      { params: pageParams(beforeId) }
    );
    return data;
  },

  getMessagesForStudentSubGroup: async (subGroupId: number, beforeId?: number): Promise<ChatMessage[]> => {
    const { data } = await apiClient.get<ChatMessage[]>(
      CHAT_URLS.GET_MESSAGES_FOR_STUDENT_SUBGROUP(subGroupId),
      { params: pageParams(beforeId) }
    );
    return data;
  },

  sendToSubGroup: async (payload: {
    content: string;
    subGroupId: number;
  }): Promise<ChatMessage> => {
    const { data } = await apiClient.post<ChatMessage>(CHAT_URLS.SEND_TO_SUBGROUP, payload);
    return data;
  },

  sendToSubGroupFromStudent: async (payload: {
    content: string;
    subGroupId: number;
  }): Promise<ChatMessage> => {
    const { data } = await apiClient.post<ChatMessage>(
      CHAT_URLS.SEND_TO_SUBGROUP_FROM_STUDENT,
      payload
    );
    return data;
  },

  sendVoice: async (payload: SendVoicePayload): Promise<ChatMessage> => {
    const form = new FormData();
    form.append('Audio', {
      uri: payload.uri,
      name: 'voice.m4a',
      type: 'audio/mp4',
    } as unknown as Blob);
    form.append('DurationMs', String(Math.round(payload.durationMs)));
    form.append('Waveform', payload.waveform);
    form.append('TargetId', String(payload.targetId));
    if (payload.groupId != null) form.append('GroupId', String(payload.groupId));
    const { data } = await apiClient.post<ChatMessage>(VOICE_URLS[payload.route], form, {
      timeout: VOICE_UPLOAD_TIMEOUT,
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  getVoice: async (messageId: number): Promise<ChatVoice> => {
    const { data } = await apiClient.get<ChatVoice>(CHAT_URLS.GET_VOICE(messageId));
    return data;
  },
};
