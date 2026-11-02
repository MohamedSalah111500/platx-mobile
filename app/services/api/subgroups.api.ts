import apiClient from './client';
import { SUBGROUPS_URLS, withPagination } from './endpoints';
import { appendFile } from './students.api';
import type {
  GroupMember,
  SubGroup,
  SubGroupFormValues,
  SubGroupLookup,
  StudentSubGroupsResponse,
} from '../../types/group.types';
import type { PaginatedResponse } from '../../types/api.types';

const MULTIPART = { headers: { 'Content-Type': 'multipart/form-data' } };

function toSubGroupForm(values: SubGroupFormValues): FormData {
  const form = new FormData();
  form.append('name', values.name.trim());
  form.append('status', String(values.status));
  if (values.id) form.append('id', String(values.id));
  else form.append('groupId', String(values.groupId));
  if (values.icon) appendFile(form, 'icon', values.icon);
  return form;
}

export const subGroupsApi = {
  getByGroup: async (groupId: number, page = 1, size = 50): Promise<PaginatedResponse<SubGroup>> => {
    const { data } = await apiClient.get<any>(withPagination(SUBGROUPS_URLS.LIST(groupId), page, size));
    return {
      items: data?.items || (Array.isArray(data) ? data : []),
      totalCount: data?.totalCount ?? data?.items?.length ?? 0,
    };
  },

  getById: async (id: number): Promise<SubGroup> => {
    const { data } = await apiClient.get<SubGroup>(SUBGROUPS_URLS.GET(id));
    return data;
  },

  create: async (values: SubGroupFormValues): Promise<void> => {
    await apiClient.post(SUBGROUPS_URLS.BASE, toSubGroupForm(values), MULTIPART);
  },

  update: async (values: SubGroupFormValues): Promise<void> => {
    await apiClient.put(SUBGROUPS_URLS.BASE, toSubGroupForm(values), MULTIPART);
  },

  remove: async (id: number): Promise<void> => {
    await apiClient.delete(SUBGROUPS_URLS.GET(id));
  },

  getStudents: async (subGroupId: number, page = 1, size = 1000): Promise<GroupMember[]> => {
    const { data } = await apiClient.get<any>(withPagination(SUBGROUPS_URLS.GET_STUDENTS(subGroupId), page, size));
    return data?.items || (Array.isArray(data) ? data : []);
  },

  addStudent: async (subGroupId: number, studentId: number): Promise<void> => {
    await apiClient.post(SUBGROUPS_URLS.ADD_STUDENT(subGroupId, studentId));
  },

  removeStudent: async (subGroupId: number, studentId: number): Promise<void> => {
    await apiClient.delete(SUBGROUPS_URLS.REMOVE_STUDENT(subGroupId, studentId));
  },

  moveStudentToGroup: async (subGroupId: number, studentId: number, targetGroupId: number): Promise<void> => {
    await apiClient.patch(SUBGROUPS_URLS.MOVE_TO_GROUP(subGroupId, studentId, targetGroupId));
  },

  moveStudentToSubGroup: async (subGroupId: number, studentId: number, targetSubGroupId: number): Promise<void> => {
    await apiClient.patch(SUBGROUPS_URLS.MOVE_TO_SUBGROUP(subGroupId, studentId, targetSubGroupId));
  },

  getStudentSubGroups: async (studentId: number): Promise<StudentSubGroupsResponse> => {
    const { data } = await apiClient.get<StudentSubGroupsResponse>(
      SUBGROUPS_URLS.GET_STUDENT_SUBGROUPS(studentId)
    );
    return data;
  },

  getAllLookup: async (): Promise<SubGroupLookup[]> => {
    const { data } = await apiClient.get<any>(SUBGROUPS_URLS.GET_ALL);
    return Array.isArray(data) ? data : [];
  },
};
