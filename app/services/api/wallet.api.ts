import apiClient from './client';
import { WALLET_URLS } from './endpoints';

export type WalletTransactionType =
  | 'VoucherRedeem'
  | 'ManualCredit'
  | 'ManualDebit'
  | 'CoursePurchase'
  | 'LivePurchase'
  | 'SectionPurchase'
  | 'LessonPurchase';

export type PayKind = 'course' | 'section' | 'lesson' | 'live';

export interface Wallet {
  balance: number;
  currencyCode: string;
}

export interface WalletTransaction {
  id: number;
  type: WalletTransactionType;
  amount: number;
  balanceAfter: number;
  currencyCode: string;
  reason: string | null;
  courseName: string | null;
  sectionTitle?: string | null;
  lessonTitle?: string | null;
  liveName: string | null;
  voucherCode: string | null;
  createdAt: string;
}

export interface WalletPage {
  items: WalletTransaction[];
  totalCount: number;
}

export interface WalletRedeemResult {
  amount: number;
  balance: number;
  currencyCode: string;
}

export interface WalletPaymentResult {
  charged: number;
  balance: number;
  currencyCode: string;
}

export const walletApi = {
  me: async (): Promise<Wallet> => (await apiClient.get<Wallet>(WALLET_URLS.ME)).data,
  transactions: async (page: number, size: number): Promise<WalletPage> =>
    (await apiClient.get<WalletPage>(WALLET_URLS.MY_TRANSACTIONS, { params: { page, size } })).data,
  redeem: async (code: string): Promise<WalletRedeemResult> =>
    (await apiClient.post<WalletRedeemResult>(WALLET_URLS.REDEEM, { code })).data,
  pay: async (kind: PayKind, id: number): Promise<WalletPaymentResult> =>
    (await apiClient.post<WalletPaymentResult>(PAY_URL[kind](id), {})).data,
};

const PAY_URL: Record<PayKind, (id: number) => string> = {
  course: WALLET_URLS.PAY_COURSE,
  section: WALLET_URLS.PAY_SECTION,
  lesson: WALLET_URLS.PAY_LESSON,
  live: WALLET_URLS.PAY_LIVE,
};
