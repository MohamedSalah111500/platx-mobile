import apiClient from './client';
import { PAYMENT_METHODS_URLS, RESERVATIONS_URLS } from './endpoints';
import type { ProcessedReservation } from '../../types/course.types';
import type {
  PaymentMethod,
  CreateReservationInput,
  PendingReservation,
  StudentReservation,
} from '../../types/reservation.types';

export const reservationsApi = {
  getPaymentMethods: async (): Promise<PaymentMethod[]> => {
    const { data } = await apiClient.get<PaymentMethod[]>(PAYMENT_METHODS_URLS.GET);
    return Array.isArray(data) ? data : [];
  },

  create: async (input: CreateReservationInput): Promise<void> => {
    const formData = new FormData();
    formData.append('studentId', String(input.studentId));
    formData.append('courseId', String(input.courseId));
    formData.append('studentMessage', input.studentMessage ?? '');
    // Both are optional on the backend; the iOS "request to join" flow sends neither.
    if (input.paymentMethod != null) formData.append('PaymentMethod', String(input.paymentMethod));
    if (input.proofImage) formData.append('ReservationImg', input.proofImage as unknown as Blob);

    await apiClient.post(RESERVATIONS_URLS.CREATE, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  getPending: async (): Promise<PendingReservation[]> => {
    const { data } = await apiClient.get<any>(RESERVATIONS_URLS.PENDING);
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.items)) return data.items;
    return [];
  },

  getProcessed: async (filter: {
    page: number;
    size: number;
    search?: string;
    status?: number | null;
  }): Promise<{ items: ProcessedReservation[]; totalCount: number; retentionDays: number }> => {
    const params: Record<string, string | number> = { page: filter.page, size: filter.size };
    if (filter.search) params.search = filter.search;
    if (filter.status != null) params.status = filter.status;
    const { data } = await apiClient.get<any>(RESERVATIONS_URLS.PROCESSED, { params });
    return {
      items: (data?.items ?? []).map((r: any) => ({
        id: Number(r.id),
        studentName: r.studentName ?? '',
        studentEmail: r.studentEmail ?? null,
        courseName: r.courseName ?? '',
        status: Number(r.status),
        processedDate: r.processedDate ?? '',
        adminNotes: r.adminNotes ?? null,
        receiptUrl: r.receiptUrl ?? null,
        daysUntilDeletion: Number(r.daysUntilDeletion) || 0,
      })),
      totalCount: Number(data?.totalCount) || 0,
      retentionDays: Number(data?.retentionDays) || 0,
    };
  },

  // Student's own purchase requests (all statuses), used to show "under review".
  getMine: async (studentId: number): Promise<StudentReservation[]> => {
    const { data } = await apiClient.get<any>(RESERVATIONS_URLS.MY(studentId));
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.items)) return data.items;
    return [];
  },

  approve: async (reservationId: number, adminNotes = ''): Promise<void> => {
    await apiClient.post(RESERVATIONS_URLS.APPROVE(reservationId), { adminNotes });
  },

  reject: async (reservationId: number, adminNotes = ''): Promise<void> => {
    await apiClient.post(RESERVATIONS_URLS.REJECT(reservationId), { adminNotes });
  },

  enrollStudentDirectly: async (studentId: number, courseId: number, adminNotes?: string): Promise<void> => {
    await apiClient.post(RESERVATIONS_URLS.ENROLL_STUDENT, {
      studentId,
      courseId,
      adminNotes: adminNotes ?? '',
    });
  },
};
