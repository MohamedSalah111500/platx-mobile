import apiClient from './client';
import { GROUPS_URLS, withPagination } from './endpoints';
import { appendFile } from './students.api';
import type {
  Group,
  GroupFormValues,
  GroupMember,
  GroupFile,
  StudentGroupsResponse,
} from '../../types/group.types';
import type { PaginatedResponse } from '../../types/api.types';

const DEFAULT_CRON = '*/20 * * * *';
const MULTIPART = { headers: { 'Content-Type': 'multipart/form-data' } };

function toGroupForm(values: GroupFormValues): FormData {
  const form = new FormData();
  if (values.id) form.append('id', String(values.id));
  form.append('name', values.name.trim());
  form.append('description', values.description.trim());
  form.append('status', String(values.status));
  if (!values.id) form.append('cron', DEFAULT_CRON);
  if (values.icon) appendFile(form, 'icon', values.icon);
  return form;
}

function listOf<T>(data: any): T[] {
  return data?.items || (Array.isArray(data) ? data : []);
}

export const groupsApi = {
  getAll: async (
    page = 1,
    size = 10,
    search?: string
  ): Promise<PaginatedResponse<Group>> => {
    const { data } = await apiClient.get<PaginatedResponse<Group>>(
      withPagination(GROUPS_URLS.BASE, page, size, search)
    );
    return data;
  },

  getLookup: async (): Promise<{ id: number; name: string }[]> => {
    const { data } = await apiClient.get<any>(GROUPS_URLS.ALL);
    return listOf<{ id: number; name: string }>(data);
  },

  getGroup: async (groupId: number): Promise<Group> => {
    const { data } = await apiClient.get<Group>(GROUPS_URLS.GET_GROUP(groupId));
    return data;
  },

  getGroupStudents: async (groupId: number): Promise<GroupMember[]> => {
    const { data } = await apiClient.get<any>(
      withPagination(GROUPS_URLS.GET_GROUP_STUDENTS(groupId), 1, 1000)
    );
    return listOf<GroupMember>(data);
  },

  getGroupStaff: async (groupId: number): Promise<GroupMember[]> => {
    const { data } = await apiClient.get<any>(GROUPS_URLS.GET_GROUP_STAFF(groupId));
    return listOf<GroupMember>(data);
  },

  getGroupFiles: async (groupId: number): Promise<GroupFile[]> => {
    const { data } = await apiClient.get<any>(
      withPagination(GROUPS_URLS.GET_GROUP_FILES(groupId), 1, 500)
    );
    return listOf<GroupFile>(data);
  },

  create: async (values: GroupFormValues): Promise<void> => {
    await apiClient.post(GROUPS_URLS.BASE, toGroupForm(values), MULTIPART);
  },

  update: async (values: GroupFormValues): Promise<void> => {
    await apiClient.put(GROUPS_URLS.BASE, toGroupForm(values), MULTIPART);
  },

  delete: async (groupId: number): Promise<void> => {
    await apiClient.delete(GROUPS_URLS.GET_GROUP(groupId));
  },

  addStudent: async (groupId: string, studentId: number): Promise<void> => {
    await apiClient.post(GROUPS_URLS.ADD_STUDENT(groupId, studentId));
  },

  removeStudent: async (groupId: string, studentId: number): Promise<void> => {
    await apiClient.delete(GROUPS_URLS.REMOVE_STUDENT(groupId, studentId));
  },

  moveStudent: async (groupId: number, studentId: number, targetGroupId: number): Promise<void> => {
    await apiClient.patch(GROUPS_URLS.MOVE_STUDENT(groupId, studentId, targetGroupId));
  },

  moveStudentToSubGroup: async (groupId: number, studentId: number, targetSubGroupId: number): Promise<void> => {
    await apiClient.patch(GROUPS_URLS.MOVE_STUDENT_TO_SUBGROUP(groupId, studentId, targetSubGroupId));
  },

  addStaff: async (groupId: number, staffId: number): Promise<void> => {
    await apiClient.post(GROUPS_URLS.ADD_STAFF(groupId, staffId), {});
  },

  removeStaff: async (groupId: number, staffId: number): Promise<void> => {
    await apiClient.delete(GROUPS_URLS.REMOVE_STAFF(groupId, staffId));
  },

  assignFiles: async (groupId: number, fileIds: number[]): Promise<void> => {
    await apiClient.post(GROUPS_URLS.ASSIGN_FILES(groupId), fileIds);
  },

  unassignFile: async (groupId: number, fileId: number): Promise<void> => {
    await apiClient.delete(GROUPS_URLS.UNASSIGN_FILE(groupId, fileId));
  },

  getStudentGroups: async (studentId: number | string): Promise<StudentGroupsResponse> => {
    const { data } = await apiClient.get<StudentGroupsResponse>(
      GROUPS_URLS.GET_STUDENT_GROUPS(studentId)
    );
    return data;
  },
};
