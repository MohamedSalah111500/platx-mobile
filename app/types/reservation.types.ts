export const PAYMENT_METHOD_VODAFONE = 1;
export const PAYMENT_METHOD_INSTAPAY = 2;
export const PAYMENT_METHOD_BANK = 3;
export const DEFAULT_WALLET_PROVIDER = 'Vodafone Cash';

export interface PaymentMethod {
  id: number;
  method: number;
  phoneNumber?: string | null;
  accountNumber?: string | null;
  bankName?: string | null;
  accountHolderName?: string | null;
  swiftCode?: string | null;
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
  paymentMethod?: number;
  proofImage?: ReservationProofImage;
}

export interface PendingReservation {
  id: number;
  studentId: number;
  courseId: number;
  requestDate?: string;
  creationTime?: string;
  studentMessage?: string | null;
  reservationImg?: string | null;
  paymentMethod?: number | null;
  status?: number;
  student?: { id: number; firstName?: string; lastName?: string; email?: string } | null;
  course?: { id: number; name?: string; title?: string } | null;
}

// Backend ReservationStatus enum
export const RESERVATION_STATUS = {
  Pending: 0,
  Approved: 1,
  Rejected: 2,
  Cancelled: 3,
} as const;

export interface StudentReservation {
  id: number;
  studentId: number;
  courseId: number;
  status?: number;
  studentMessage?: string | null;
  requestDate?: string;
  creationTime?: string;
  adminNotes?: string | null;
}
