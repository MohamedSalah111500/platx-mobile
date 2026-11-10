import apiClient from './client';
import { ACCOUNTING_URLS } from './endpoints';

export enum LedgerEntryType {
  Income = 1,
  Expense = 2,
}

export enum LedgerEntryOrigin {
  Manual = 1,
  Sale = 2,
}

export enum LedgerPaymentMethod {
  Cash = 1,
  EWallet = 2,
  BankTransfer = 3,
  PlatformWallet = 4,
  CourseCode = 5,
  Other = 6,
}

export enum SaleItemKind {
  Course = 1,
  Section = 2,
  Lesson = 3,
  Live = 4,
}

export const MANUAL_METHODS = [
  LedgerPaymentMethod.Cash,
  LedgerPaymentMethod.EWallet,
  LedgerPaymentMethod.BankTransfer,
  LedgerPaymentMethod.Other,
];

export interface LedgerCategory {
  id: number;
  type: LedgerEntryType;
  systemKey: string | null;
  name: string | null;
}

export interface LedgerEntry {
  id: number;
  type: LedgerEntryType;
  origin: LedgerEntryOrigin;
  amount: number;
  currencyCode: string;
  occurredAt: string;
  paymentMethod: LedgerPaymentMethod;
  categoryId: number | null;
  categoryKey: string | null;
  categoryName: string | null;
  description: string | null;
  saleItem: SaleItemKind | null;
  itemTitle: string | null;
  studentId: number | null;
  studentName: string | null;
}

export interface SaveLedgerEntry {
  type: LedgerEntryType;
  amount: number;
  occurredAt: string;
  categoryId: number;
  paymentMethod: LedgerPaymentMethod;
  description: string | null;
}

export interface CategoryTotal {
  categoryId: number | null;
  systemKey: string | null;
  name: string | null;
  total: number;
  count: number;
}

export interface MethodTotal {
  method: LedgerPaymentMethod;
  total: number;
  count: number;
}

export interface ItemSales {
  kind: SaleItemKind;
  courseId: number | null;
  title: string;
  count: number;
  total: number;
}

export interface AccountingSummary {
  currencyCode: string;
  currencies: string[];
  income: number;
  expense: number;
  net: number;
  salesIncome: number;
  salesCount: number;
  buyers: number;
  previousIncome: number;
  previousExpense: number;
  previousNet: number;
  incomeByCategory: CategoryTotal[];
  expenseByCategory: CategoryTotal[];
  incomeByMethod: MethodTotal[];
  topItems: ItemSales[];
}

export interface EntriesPage {
  items: LedgerEntry[];
  totalCount: number;
}

const offset = () => -new Date().getTimezoneOffset();

export const accountingApi = {
  summary: async (from: string, to: string, currency: string | null): Promise<AccountingSummary> =>
    (await apiClient.get<AccountingSummary>(ACCOUNTING_URLS.SUMMARY, { params: { from, to, offset: offset(), ...(currency ? { currency } : {}) } })).data,
  entries: async (from: string, to: string, currency: string | null, page: number, size: number): Promise<EntriesPage> =>
    (await apiClient.get<EntriesPage>(ACCOUNTING_URLS.ENTRIES, { params: { from, to, page, size, ...(currency ? { currency } : {}) } })).data,
  categories: async (): Promise<LedgerCategory[]> => (await apiClient.get<LedgerCategory[]>(ACCOUNTING_URLS.CATEGORIES)).data,
  create: async (entry: SaveLedgerEntry): Promise<LedgerEntry> => (await apiClient.post<LedgerEntry>(ACCOUNTING_URLS.ENTRIES, entry)).data,
  update: async (id: number, entry: SaveLedgerEntry): Promise<LedgerEntry> =>
    (await apiClient.put<LedgerEntry>(ACCOUNTING_URLS.ENTRY(id), entry)).data,
  remove: async (id: number): Promise<void> => {
    await apiClient.delete(ACCOUNTING_URLS.ENTRY(id));
  },
};
