import apiClient from './client';
import { DEVICE_PROTECTION_URLS, GUARDIAN_URLS, WHATSAPP_URLS } from './endpoints';
import type {
  DeviceSecurityEvent,
  GuardianLink,
  GuardianLinkCode,
  Paged,
  StudentDevices,
  WhatsAppStudent,
  WhatsAppStudentUpdate,
} from '../../types/people.types';

export const deviceProtectionApi = {
  getDevices: async (studentId: number): Promise<StudentDevices> =>
    (await apiClient.get<StudentDevices>(DEVICE_PROTECTION_URLS.STUDENT_DEVICES(studentId))).data,
  getActivity: async (studentId: number, page: number, size: number): Promise<Paged<DeviceSecurityEvent>> => {
    const { data } = await apiClient.get<Paged<DeviceSecurityEvent>>(DEVICE_PROTECTION_URLS.ACTIVITY(studentId), {
      params: { page, size },
    });
    return { items: data?.items ?? [], totalCount: data?.totalCount ?? 0 };
  },
  removeDevice: async (studentId: number, deviceId: number): Promise<void> => {
    await apiClient.delete(DEVICE_PROTECTION_URLS.REMOVE_DEVICE(studentId, deviceId));
  },
  revokeSessions: async (studentId: number): Promise<void> => {
    await apiClient.post(DEVICE_PROTECTION_URLS.REVOKE_SESSIONS(studentId), {});
  },
  block: async (studentId: number): Promise<void> => {
    await apiClient.post(DEVICE_PROTECTION_URLS.BLOCK(studentId), {});
  },
  unblock: async (studentId: number): Promise<void> => {
    await apiClient.post(DEVICE_PROTECTION_URLS.UNBLOCK(studentId), {});
  },
};

export const guardianLinksApi = {
  createCode: async (studentId: number): Promise<GuardianLinkCode> =>
    (await apiClient.post<GuardianLinkCode>(GUARDIAN_URLS.STUDENT_CODE(studentId), {})).data,
  getLinks: async (studentId: number): Promise<GuardianLink[]> => {
    const { data } = await apiClient.get<GuardianLink[]>(GUARDIAN_URLS.STUDENT_LINKS(studentId));
    return Array.isArray(data) ? data : [];
  },
  revoke: async (studentId: number, linkId: number): Promise<void> => {
    await apiClient.delete(GUARDIAN_URLS.STUDENT_LINK(studentId, linkId));
  },
};

export const whatsAppStudentApi = {
  get: async (studentId: number): Promise<WhatsAppStudent> =>
    (await apiClient.get<WhatsAppStudent>(WHATSAPP_URLS.STUDENT(studentId))).data,
  update: async (studentId: number, request: WhatsAppStudentUpdate): Promise<WhatsAppStudent> =>
    (await apiClient.put<WhatsAppStudent>(WHATSAPP_URLS.STUDENT(studentId), request)).data,
  sendReport: async (studentId: number): Promise<void> => {
    await apiClient.post(WHATSAPP_URLS.STUDENT_REPORT(studentId), {});
  },
};
