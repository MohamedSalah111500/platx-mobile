import * as Crypto from 'expo-crypto';
import apiClient from './client';
import { STORE_URLS } from './endpoints';
import { useAuthStore } from '../../store/auth.store';

export enum StoreOrderStatus {
  Pending = 1,
  Confirmed = 2,
  Delivered = 3,
  Cancelled = 4,
}

export enum StorePaymentMethod {
  Points = 1,
  CashOnDelivery = 2,
  Transfer = 3,
}

export enum StoreDeliveryMethod {
  Delivery = 1,
  Pickup = 2,
}

export enum StoreOrderActor {
  Student = 1,
  Staff = 2,
  System = 3,
}

export type StoreProductSort = 'newest' | 'price_asc' | 'price_desc';
export const STORE_SORTS: StoreProductSort[] = ['newest', 'price_asc', 'price_desc'];

export interface StoreSettings {
  enabled: boolean;
  acceptPoints: boolean;
  acceptCashOnDelivery: boolean;
  showOnLanding: boolean;
  acceptTransfer: boolean;
}

export interface StoreStatus extends StoreSettings {
  currencyCode: string;
  available: boolean;
}

export interface StoreTransferAccount {
  id: number;
  method: number;
  phoneNumber: string | null;
  accountNumber: string | null;
  bankName: string | null;
  accountHolderName: string | null;
}

export interface StoreMe {
  enabled: boolean;
  hasOrders: boolean;
  pointsBalance: number | null;
  pointsCurrency: string | null;
  phone: string | null;
  transferAccounts: StoreTransferAccount[] | null;
}

export interface StoreCategory {
  id: number;
  name: string;
  sortOrder: number;
  productCount: number;
}

export interface StoreProductCard {
  id: number;
  name: string;
  price: number;
  discountPrice: number | null;
  imageUrl: string | null;
  categoryId: number | null;
  categoryName: string | null;
  stock: number | null;
  isVisible: boolean;
  isFeatured: boolean;
}

export interface StoreProductImage {
  id: number;
  url: string;
}

export interface StoreProductDetails extends Omit<StoreProductCard, 'imageUrl'> {
  description: string | null;
  images: StoreProductImage[];
}

export interface SaveStoreProduct {
  name: string;
  description: string | null;
  price: number;
  discountPrice: number | null;
  stock: number | null;
  categoryId: number | null;
  isVisible: boolean;
  keepStock: boolean;
  isFeatured: boolean;
  originalStock: number | null;
}

export interface StoreProductQuery {
  search?: string | null;
  categoryId?: number | null;
  featured?: boolean;
  inStock?: boolean;
  visible?: boolean | null;
  sort?: StoreProductSort | null;
  page: number;
  size: number;
}

export interface StoreOrderItem {
  productId: number | null;
  productName: string;
  imageUrl: string | null;
  unitPrice: number;
  quantity: number;
}

export interface StoreOrder {
  id: number;
  status: StoreOrderStatus;
  paymentMethod: StorePaymentMethod;
  deliveryMethod: StoreDeliveryMethod;
  isPaid: boolean;
  total: number;
  currencyCode: string;
  phone: string;
  address: string | null;
  notes: string | null;
  createdAt: string;
  studentId: number;
  studentName: string;
  studentCode: string | null;
  items: StoreOrderItem[];
  transferChannel: number | null;
  hasReceipt: boolean;
  awaitingReview: boolean;
  confirmedAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  cancelledBy: StoreOrderActor | null;
  cancelReason: string | null;
}

export interface StoreOrderCounts {
  pending: number;
  confirmed: number;
  delivered: number;
  cancelled: number;
  awaitingReview: number;
}

export interface StoreOrdersPage {
  items: StoreOrder[];
  totalCount: number;
  counts: StoreOrderCounts;
}

export interface StoreOrderFilter {
  status: StoreOrderStatus | null;
  awaitingReview: boolean;
  paymentMethod: StorePaymentMethod | null;
  search: string;
  page: number;
  size: number;
}

export interface PlaceStoreOrder {
  items: { productId: number; quantity: number }[];
  paymentMethod: StorePaymentMethod;
  deliveryMethod: StoreDeliveryMethod;
  phone: string;
  address: string | null;
  notes: string | null;
  expectedTotal: number;
  clientRequestId: string;
}

export interface Paged<T> {
  items: T[];
  totalCount: number;
}

export interface UploadFile {
  uri: string;
  name: string;
  type: string;
}

const MULTIPART = { headers: { 'Content-Type': 'multipart/form-data' } };

const domainParam = () => ({ domain: useAuthStore.getState().domain ?? '' });

function productParams(query: StoreProductQuery): Record<string, string | number | boolean> {
  const params: Record<string, string | number | boolean> = { page: query.page, size: query.size };
  if (query.search?.trim()) params.search = query.search.trim();
  if (query.categoryId) params.categoryId = query.categoryId;
  if (query.featured) params.featured = true;
  if (query.inStock) params.inStock = true;
  if (query.visible !== null && query.visible !== undefined) params.visible = query.visible;
  if (query.sort && query.sort !== 'newest') params.sort = query.sort;
  return params;
}

export const storeApi = {
  publicStatus: async (): Promise<StoreStatus> =>
    (await apiClient.get<StoreStatus>(STORE_URLS.PUBLIC_STATUS, { params: domainParam() })).data,
  publicCategories: async (): Promise<StoreCategory[]> =>
    (await apiClient.get<StoreCategory[]>(STORE_URLS.PUBLIC_CATEGORIES, { params: domainParam() })).data,
  publicProducts: async (query: StoreProductQuery): Promise<Paged<StoreProductCard>> =>
    (await apiClient.get<Paged<StoreProductCard>>(STORE_URLS.PUBLIC_PRODUCTS, { params: { ...domainParam(), ...productParams(query) } })).data,
  publicProduct: async (id: number): Promise<StoreProductDetails> =>
    (await apiClient.get<StoreProductDetails>(STORE_URLS.PUBLIC_PRODUCT(id), { params: domainParam() })).data,
  lookupProducts: async (ids: number[]): Promise<StoreProductCard[]> => {
    const query = new URLSearchParams(domainParam());
    ids.forEach((id) => query.append('ids', String(id)));
    return (await apiClient.get<StoreProductCard[]>(`${STORE_URLS.PUBLIC_PRODUCTS_LOOKUP}?${query.toString()}`)).data;
  },
  me: async (): Promise<StoreMe> => (await apiClient.get<StoreMe>(STORE_URLS.ME)).data,
  placeOrder: async (order: PlaceStoreOrder): Promise<StoreOrder> =>
    (await apiClient.post<StoreOrder>(STORE_URLS.ORDERS, order)).data,
  placeTransferOrder: async (order: PlaceStoreOrder, channel: number, receipt: UploadFile): Promise<StoreOrder> => {
    const form = new FormData();
    form.append('Order', JSON.stringify(order));
    form.append('Channel', String(channel));
    form.append('Receipt', receipt as any);
    return (await apiClient.post<StoreOrder>(STORE_URLS.TRANSFER_ORDERS, form, MULTIPART)).data;
  },
  myOrders: async (page: number, size: number): Promise<Paged<StoreOrder>> =>
    (await apiClient.get<Paged<StoreOrder>>(STORE_URLS.MY_ORDERS, { params: { page, size } })).data,
  myOrder: async (id: number): Promise<StoreOrder> => (await apiClient.get<StoreOrder>(STORE_URLS.MY_ORDER(id))).data,
  cancelMyOrder: async (id: number): Promise<StoreOrder> =>
    (await apiClient.post<StoreOrder>(STORE_URLS.CANCEL_MY_ORDER(id), {})).data,
  myReceipt: async (id: number): Promise<{ url: string }> =>
    (await apiClient.get<{ url: string }>(STORE_URLS.MY_ORDER_RECEIPT(id))).data,

  settings: async (): Promise<StoreSettings> => (await apiClient.get<StoreSettings>(STORE_URLS.SETTINGS)).data,
  saveSettings: async (settings: StoreSettings): Promise<StoreSettings> =>
    (await apiClient.put<StoreSettings>(STORE_URLS.SETTINGS, settings)).data,
  categories: async (): Promise<StoreCategory[]> => (await apiClient.get<StoreCategory[]>(STORE_URLS.CATEGORIES)).data,
  createCategory: async (name: string): Promise<StoreCategory> =>
    (await apiClient.post<StoreCategory>(STORE_URLS.CATEGORIES, { name })).data,
  renameCategory: async (id: number, name: string): Promise<StoreCategory> =>
    (await apiClient.put<StoreCategory>(STORE_URLS.CATEGORY(id), { name })).data,
  deleteCategory: async (id: number): Promise<void> => {
    await apiClient.delete(STORE_URLS.CATEGORY(id));
  },
  products: async (query: StoreProductQuery): Promise<Paged<StoreProductCard>> =>
    (await apiClient.get<Paged<StoreProductCard>>(STORE_URLS.PRODUCTS, { params: productParams(query) })).data,
  product: async (id: number): Promise<StoreProductDetails> =>
    (await apiClient.get<StoreProductDetails>(STORE_URLS.PRODUCT(id))).data,
  createProduct: async (product: SaveStoreProduct): Promise<StoreProductDetails> =>
    (await apiClient.post<StoreProductDetails>(STORE_URLS.PRODUCTS, product)).data,
  updateProduct: async (id: number, product: SaveStoreProduct): Promise<StoreProductDetails> =>
    (await apiClient.put<StoreProductDetails>(STORE_URLS.PRODUCT(id), product)).data,
  deleteProduct: async (id: number): Promise<void> => {
    await apiClient.delete(STORE_URLS.PRODUCT(id));
  },
  addImages: async (id: number, files: UploadFile[]): Promise<StoreProductDetails> => {
    const form = new FormData();
    files.forEach((file) => form.append('files', file as any));
    return (await apiClient.post<StoreProductDetails>(STORE_URLS.PRODUCT_IMAGES(id), form, MULTIPART)).data;
  },
  removeImage: async (id: number, imageId: number): Promise<StoreProductDetails> =>
    (await apiClient.delete<StoreProductDetails>(STORE_URLS.PRODUCT_IMAGE(id, imageId))).data,
  setCover: async (id: number, imageId: number): Promise<StoreProductDetails> =>
    (await apiClient.put<StoreProductDetails>(STORE_URLS.PRODUCT_COVER(id, imageId), {})).data,
  setVisibility: async (id: number, isVisible: boolean): Promise<void> => {
    await apiClient.put(STORE_URLS.PRODUCT_VISIBILITY(id), { isVisible });
  },
  orders: async (filter: StoreOrderFilter): Promise<StoreOrdersPage> => {
    const params: Record<string, string | number | boolean> = { page: filter.page, size: filter.size };
    if (filter.awaitingReview) params.awaitingReview = true;
    else if (filter.status) params.status = filter.status;
    if (filter.paymentMethod) params.paymentMethod = filter.paymentMethod;
    if (filter.search.trim()) params.search = filter.search.trim();
    return (await apiClient.get<StoreOrdersPage>(STORE_URLS.ORDERS, { params })).data;
  },
  order: async (id: number): Promise<StoreOrder> => (await apiClient.get<StoreOrder>(STORE_URLS.ORDER(id))).data,
  changeStatus: async (id: number, status: StoreOrderStatus, reason: string | null = null): Promise<StoreOrder> =>
    (await apiClient.post<StoreOrder>(STORE_URLS.ORDER_STATUS(id), { status, reason })).data,
  receipt: async (id: number): Promise<{ url: string }> =>
    (await apiClient.get<{ url: string }>(STORE_URLS.ORDER_RECEIPT(id))).data,
  approvePayment: async (id: number): Promise<StoreOrder> =>
    (await apiClient.post<StoreOrder>(STORE_URLS.APPROVE_PAYMENT(id), {})).data,
  rejectPayment: async (id: number, reason: string): Promise<StoreOrder> =>
    (await apiClient.post<StoreOrder>(STORE_URLS.REJECT_PAYMENT(id), { reason })).data,
};

export function storeEffectivePrice(product: Pick<StoreProductCard, 'price' | 'discountPrice'>): number {
  return product.discountPrice && product.discountPrice < product.price ? product.discountPrice : product.price;
}

export function storeDiscountPercent(product: Pick<StoreProductCard, 'price' | 'discountPrice'>): number | null {
  const price = storeEffectivePrice(product);
  if (price >= product.price) return null;
  const percent = Math.round((1 - price / product.price) * 100);
  return percent > 0 ? percent : null;
}

export const toCents = (amount: number) => Math.round(amount * 100);
export const fromCents = (cents: number) => Math.round(cents) / 100;

export const newRequestId = () => Crypto.randomUUID();
