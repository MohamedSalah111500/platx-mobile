import apiClient from './client';
import { PAYMENT_METHODS_URLS, RESERVATIONS_URLS } from './endpoints';
import type { PaymentMethod, CreateReservationInput } from '../../types/reservation.types';

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
    formData.append('PaymentMethod', String(input.paymentMethod));
    formData.append('ReservationImg', input.proofImage as unknown as Blob);

    await apiClient.post(RESERVATIONS_URLS.CREATE, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  enrollStudentDirectly: async (studentId: number, courseId: number, adminNotes?: string): Promise<void> => {
    await apiClient.post(RESERVATIONS_URLS.ENROLL_STUDENT, {
      studentId,
      courseId,
      adminNotes: adminNotes ?? '',
    });
  },
};
