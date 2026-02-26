import apiClient from './client';
import { GROUPS_URLS, withPagination } from './endpoints';
import type { Group, GroupMember, StudentGroupsResponse } from '../../types/group.types';
import type { PaginatedResponse } from '../../types/api.types';

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

  getGroup: async (groupId: number): Promise<Group> => {
    const { data } = await apiClient.get<Group>(GROUPS_URLS.GET_GROUP(groupId));
    return data;
  },

  getGroupStudents: async (groupId: number): Promise<GroupMember[]> => {
    const { data } = await apiClient.get<GroupMember[]>(
      GROUPS_URLS.GET_GROUP_STUDENTS(groupId)
    );
    return data;
  },

  getGroupStaff: async (groupId: number): Promise<GroupMember[]> => {
    const { data } = await apiClient.get<GroupMember[]>(
      GROUPS_URLS.GET_GROUP_STAFF(groupId)
    );
    return data;
  },

  create: async (payload: {
    name: string;
    description?: string;
    gradeId?: number;
  }): Promise<Group> => {
    const { data } = await apiClient.post<Group>(GROUPS_URLS.BASE, payload);
    return data;
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

  getStudentGroups: async (studentId: number | string): Promise<StudentGroupsResponse> => {
    const { data } = await apiClient.get<StudentGroupsResponse>(
      GROUPS_URLS.GET_STUDENT_GROUPS(studentId)
    );
    return data;
  },
};
