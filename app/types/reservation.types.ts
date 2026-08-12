export const PAYMENT_METHOD_VODAFONE = 1;
export const PAYMENT_METHOD_INSTAPAY = 2;

export interface PaymentMethod {
  id: number;
  method: number;
  phoneNumber?: string;
  accountNumber?: string;
  isActive?: boolean;
}

export interface ReservationProofImage {
  uri: string;
  name: string;
  type: string;
}

export interface CreateReservationInput {
  studentId: number;
  courseId: number;
  studentMessage?: string;
  paymentMethod: number;
  proofImage: ReservationProofImage;
}
