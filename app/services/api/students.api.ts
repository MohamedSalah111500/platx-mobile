import apiClient from './client';
import { BULK_STUDENT_IMPORT_URLS, STUDENTS_URLS, withPagination } from './endpoints';
import type {
  BulkImportJob,
  BulkImportJobDetail,
  ManagedStudent,
  Paged,
  PhotoAsset,
  StudentFormValues,
} from '../../types/people.types';

const ALL_STUDENTS_PAGE_SIZE = 200;
const ALL_STUDENTS_MAX_PAGES = 50;
const UPLOAD_TIMEOUT = 60000;
const MULTIPART = { 'Content-Type': 'multipart/form-data' };

export interface TopStudent {
  id: number;
  firstName: string;
  lastName: string;
  profileImage?: string;
  email?: string;
  totalPoints?: number;
  completedCourses?: number;
  completedLessons?: number;
  rank?: number;
}

export interface StudentProfile {
  id: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  profileImage?: string;
  code?: string | null;
}

export function appendFile(form: FormData, field: string, file: PhotoAsset) {
  form.append(field, { uri: file.uri, name: file.name, type: file.type } as unknown as Blob);
}

function toManagedStudent(raw: any): ManagedStudent {
  return {
    id: Number(raw?.id),
    firstName: raw?.firstName ?? '',
    lastName: raw?.lastName ?? '',
    email: raw?.email ?? '',
    dateOfBirth: raw?.dateOfBirth ?? null,
    address: raw?.address ?? null,
    phoneNumber: raw?.phoneNumber ?? null,
    guardianPhoneNumber: raw?.guardianPhoneNumber ?? null,
    userId: raw?.userId ?? null,
    profileImage: raw?.profileImage ?? null,
    groups: Array.isArray(raw?.groups) ? raw.groups : [],
    code: raw?.code ?? null,
    educationStage: raw?.educationStage ?? null,
  };
}

function toStudentForm(values: StudentFormValues): FormData {
  const form = new FormData();
  if (values.id) form.append('id', String(values.id));
  form.append('firstName', values.firstName.trim());
  form.append('lastName', values.lastName.trim());
  form.append('email', values.email.trim());
  form.append('address', values.address.trim());
  form.append('phoneNumber', values.phoneNumber);
  form.append('guardianPhoneNumber', values.guardianPhoneNumber ?? '');
  if (values.dateOfBirth) form.append('dateOfBirth', values.dateOfBirth);
  if (values.groupId) form.append('groupId', String(values.groupId));
  if (values.code) form.append('code', values.code);
  if (values.educationStage) form.append('educationStage', values.educationStage);
  if (values.photo) appendFile(form, 'ProfileImage', values.photo);
  return form;
}

export const studentsApi = {
  getMe: async (): Promise<StudentProfile | null> => {
    const { data } = await apiClient.get<any>(STUDENTS_URLS.ME);
    const raw = data?.data ?? data;
    const id = Number(raw?.id ?? raw?.Id);
    if (!raw || !Number.isFinite(id) || id <= 0) return null;
    return { ...raw, id };
  },

  getAll: async (): Promise<TopStudent[]> => {
    const all: TopStudent[] = [];
    for (let page = 1; page <= ALL_STUDENTS_MAX_PAGES; page++) {
      const { data } = await apiClient.get<any>(
        withPagination(STUDENTS_URLS.GET_ALL, page, ALL_STUDENTS_PAGE_SIZE)
      );
      if (Array.isArray(data)) {
        all.push(...data);
        break;
      }
      const items: TopStudent[] = data?.items || data?.data || [];
      all.push(...items);
      const totalCount = Number(data?.totalCount);
      if (
        items.length < ALL_STUDENTS_PAGE_SIZE ||
        (Number.isFinite(totalCount) && all.length >= totalCount)
      ) {
        break;
      }
    }
    return all;
  },

  getPage: async (page: number, size: number): Promise<Paged<ManagedStudent>> => {
    const { data } = await apiClient.get<any>(withPagination(STUDENTS_URLS.GET_ALL, page, size));
    const items: any[] = Array.isArray(data) ? data : data?.items ?? [];
    return { items: items.map(toManagedStudent), totalCount: Number(data?.totalCount ?? items.length) };
  },

  getAllManaged: async (): Promise<ManagedStudent[]> => {
    const all = await studentsApi.getAll();
    return all.map(toManagedStudent);
  },

  getById: async (id: number): Promise<ManagedStudent> => {
    const { data } = await apiClient.get<any>(STUDENTS_URLS.GET_BY_ID(id));
    return toManagedStudent(data);
  },

  create: async (values: StudentFormValues): Promise<void> => {
    await apiClient.post(STUDENTS_URLS.CREATE, toStudentForm(values), { headers: MULTIPART, timeout: UPLOAD_TIMEOUT });
  },

  update: async (values: StudentFormValues): Promise<void> => {
    await apiClient.put(STUDENTS_URLS.UPDATE, toStudentForm(values), { headers: MULTIPART, timeout: UPLOAD_TIMEOUT });
  },

  remove: async (id: number): Promise<void> => {
    await apiClient.delete(STUDENTS_URLS.DELETE(id));
  },
};

export const bulkImportApi = {
  templateUrl: BULK_STUDENT_IMPORT_URLS.TEMPLATE,

  upload: async (file: PhotoAsset): Promise<BulkImportJob> => {
    const form = new FormData();
    appendFile(form, 'file', file);
    const { data } = await apiClient.post<BulkImportJob>(BULK_STUDENT_IMPORT_URLS.UPLOAD, form, {
      headers: MULTIPART,
      timeout: UPLOAD_TIMEOUT,
    });
    return data;
  },

  getJobs: async (page: number, size: number): Promise<Paged<BulkImportJob>> => {
    const { data } = await apiClient.get<Paged<BulkImportJob>>(withPagination(BULK_STUDENT_IMPORT_URLS.JOBS, page, size));
    return { items: data?.items ?? [], totalCount: data?.totalCount ?? 0 };
  },

  getJob: async (id: number): Promise<BulkImportJobDetail> => {
    const { data } = await apiClient.get<BulkImportJobDetail>(BULK_STUDENT_IMPORT_URLS.JOB_DETAILS(id));
    return { ...data, rows: data?.rows ?? [] };
  },
};
