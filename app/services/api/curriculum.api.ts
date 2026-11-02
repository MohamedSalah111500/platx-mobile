import apiClient from './client';
import { GRADES_URLS, GROUP_ASSIGNMENT_URLS } from './endpoints';
import type { CurriculumGrade } from '../../types/group.types';

function toGrade(raw: any): CurriculumGrade {
  return {
    id: Number(raw?.id),
    name: raw?.name ?? '',
    description: raw?.description ?? '',
    isAssignedToGroup: !!raw?.isAssignedToGroup,
    units: (raw?.units ?? []).map((u: any) => ({
      id: Number(u?.id),
      name: u?.name ?? '',
      isCompleted: !!u?.isCompleted,
      subjects: (u?.subjects ?? []).map((s: any) => ({
        id: Number(s?.id),
        name: s?.name ?? '',
        isCompleted: !!s?.isCompleted,
      })),
    })),
  };
}

export const curriculumApi = {
  getGrades: async (): Promise<CurriculumGrade[]> => {
    const { data } = await apiClient.get<any>(GRADES_URLS.GET);
    const list = Array.isArray(data) ? data : data?.items ?? [];
    return list.map(toGrade);
  },

  getProgress: async (groupId: number, subGroupId?: number): Promise<CurriculumGrade[]> => {
    const { data } = await apiClient.get<any>(GROUP_ASSIGNMENT_URLS.GRADES_WITH_PROGRESS(groupId, subGroupId));
    return (Array.isArray(data) ? data : []).map(toGrade);
  },

  assignGrade: async (groupId: number, gradeId: number, subGroupId?: number): Promise<void> => {
    await apiClient.post(GROUP_ASSIGNMENT_URLS.ASSIGN_GRADE, { groupId, subGroupId, gridId: gradeId });
  },

  toggleSubject: async (
    groupId: number,
    gradeId: number,
    unitId: number,
    subjectId: number,
    subGroupId?: number
  ): Promise<void> => {
    await apiClient.post(GROUP_ASSIGNMENT_URLS.PROGRESS, {
      groupId,
      subGroupId,
      gridId: gradeId,
      assignedUnits: [{ unitId, subjectIds: [subjectId] }],
    });
  },

  removeGrade: async (groupId: number, subGroupId?: number): Promise<void> => {
    await apiClient.delete(GROUP_ASSIGNMENT_URLS.REMOVE(groupId, subGroupId));
  },
};
