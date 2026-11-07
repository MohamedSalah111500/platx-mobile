import apiClient from './client';
import { JOB_TITLES_URLS, STAFF_URLS, withPagination } from './endpoints';
import { appendFile } from './students.api';
import { toModulePermissions } from '../../utils/modulePermissions';
import type {
  JobTitle,
  ManagedStaff,
  ModulePermission,
  Paged,
  StaffFormValues,
} from '../../types/people.types';

const UPLOAD_TIMEOUT = 60000;
const ALL_STAFF_PAGE_SIZE = 200;
const ALL_STAFF_MAX_PAGES = 20;
const MULTIPART = { 'Content-Type': 'multipart/form-data' };

function toManagedStaff(raw: any): ManagedStaff {
  return {
    id: Number(raw?.id),
    firstName: raw?.firstName ?? '',
    lastName: raw?.lastName ?? '',
    email: raw?.email ?? '',
    dateOfBirth: raw?.dateOfBirth ?? null,
    address: raw?.address ?? null,
    phoneNumber: raw?.phoneNumber ?? null,
    userId: raw?.userId ?? null,
    profileImage: raw?.profileImage ?? null,
    subjectsTaught: raw?.subjectsTaught ?? null,
    groups: Array.isArray(raw?.groups) ? raw.groups : [],
    permissions: toModulePermissions(raw?.permissions),
    jobTitleId: raw?.jobTitleId ?? null,
    jobTitleName: raw?.jobTitleName ?? null,
  };
}

function toStaffForm(values: StaffFormValues): FormData {
  const form = new FormData();
  if (values.id) form.append('Id', String(values.id));
  form.append('FirstName', values.firstName.trim());
  form.append('LastName', values.lastName.trim());
  form.append('Email', values.email.trim());
  form.append('PhoneNumber', values.phoneNumber);
  form.append('Address', values.address.trim());
  form.append('DateOfBirth', values.dateOfBirth);
  values.groupIds.forEach((id) => form.append('GroupIds', String(id)));
  if (values.jobTitleId) form.append('JobTitleId', String(values.jobTitleId));
  if (values.photo) appendFile(form, 'ProfileImage', values.photo);
  return form;
}

export const staffApi = {
  getPage: async (page: number, size: number): Promise<Paged<ManagedStaff>> => {
    const { data } = await apiClient.get<any>(withPagination(STAFF_URLS.GET_ALL, page, size));
    const items: any[] = Array.isArray(data) ? data : data?.items ?? [];
    return { items: items.map(toManagedStaff), totalCount: Number(data?.totalCount ?? items.length) };
  },

  getAll: async (): Promise<Paged<ManagedStaff>> => {
    const items: ManagedStaff[] = [];
    let totalCount = 0;
    for (let page = 1; page <= ALL_STAFF_MAX_PAGES; page++) {
      const res = await staffApi.getPage(page, ALL_STAFF_PAGE_SIZE);
      items.push(...res.items);
      totalCount = res.totalCount;
      if (res.items.length < ALL_STAFF_PAGE_SIZE || items.length >= totalCount) break;
    }
    return { items, totalCount: Math.max(totalCount, items.length) };
  },

  getMyPermissions: async (): Promise<ModulePermission[]> => {
    const { data } = await apiClient.get<any>(STAFF_URLS.MY_PERMISSIONS);
    return toModulePermissions(data);
  },

  getById: async (id: number): Promise<ManagedStaff> => {
    const { data } = await apiClient.get<any>(STAFF_URLS.GET_BY_ID(id));
    return toManagedStaff(data);
  },

  create: async (values: StaffFormValues): Promise<void> => {
    await apiClient.post(STAFF_URLS.CREATE, toStaffForm(values), { headers: MULTIPART, timeout: UPLOAD_TIMEOUT });
  },

  update: async (values: StaffFormValues): Promise<void> => {
    await apiClient.put(STAFF_URLS.UPDATE, toStaffForm(values), { headers: MULTIPART, timeout: UPLOAD_TIMEOUT });
  },

  remove: async (id: number): Promise<void> => {
    await apiClient.delete(STAFF_URLS.DELETE(id));
  },

  getPermissions: async (id: number): Promise<ModulePermission[]> => {
    const { data } = await apiClient.get<any>(STAFF_URLS.PERMISSIONS(id));
    return toModulePermissions(data);
  },

  updatePermissions: async (id: number, permissions: ModulePermission[]): Promise<void> => {
    await apiClient.put(STAFF_URLS.PERMISSIONS(id), { staffId: id, permissions });
  },

  getJobTitles: async (): Promise<JobTitle[]> => {
    const { data } = await apiClient.get<JobTitle[]>(JOB_TITLES_URLS.GET_ALL);
    return Array.isArray(data) ? data : [];
  },
};
