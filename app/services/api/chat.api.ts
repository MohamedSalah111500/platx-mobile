import apiClient from './client';
import { CHAT_URLS } from './endpoints';
import type { ChatMessage, StaffChatContact, SendMessageToStaffPayload } from '../../types/chat.types';

export const chatApi = {
  getMessagesWithStudent: async (
    studentId: number,
    groupId: number
  ): Promise<ChatMessage[]> => {
    const { data } = await apiClient.get<ChatMessage[]>(
      CHAT_URLS.GET_MESSAGES_WITH_STUDENT(studentId, groupId)
    );
    return data;
  },

  getMessagesForTeacher: async (groupId: number): Promise<ChatMessage[]> => {
    const { data } = await apiClient.get<ChatMessage[]>(
      CHAT_URLS.GET_MESSAGES_FOR_TEACHER(groupId)
    );
    return data;
  },

  getMessagesForStudent: async (groupId: number): Promise<ChatMessage[]> => {
    const { data } = await apiClient.get<ChatMessage[]>(
      CHAT_URLS.GET_MESSAGES_FOR_STUDENT(groupId)
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
    staffId: number
  ): Promise<ChatMessage[]> => {
    const { data } = await apiClient.get<ChatMessage[]>(
      CHAT_URLS.GET_MESSAGES_WITH_STAFF(groupId, staffId)
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
};
