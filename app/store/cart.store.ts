import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { useAuthStore } from './auth.store';
import { fromCents, storeEffectivePrice, toCents, type StoreProductCard } from '../services/api/store.api';

export const MAX_CART_QUANTITY = 99;
export const MAX_CART_LINES = 30;

export type CartAddResult = 'added' | 'partial' | 'limit' | 'full';

export interface CartLine {
  productId: number;
  name: string;
  imageUrl: string | null;
  unitPrice: number;
  listPrice?: number;
  stock: number | null;
  quantity: number;
}

type CartProduct = Pick<StoreProductCard, 'id' | 'name' | 'price' | 'discountPrice' | 'stock'>;

interface CartState {
  key: string | null;
  lines: CartLine[];
  add: (product: CartProduct, imageUrl: string | null, quantity?: number) => CartAddResult;
  setQuantity: (productId: number, quantity: number) => void;
  remove: (productId: number) => void;
  sync: (fresh: StoreProductCard[]) => boolean;
  clear: () => void;
}

export const cartLimitOf = (stock: number | null) => (stock === null ? MAX_CART_QUANTITY : Math.min(stock, MAX_CART_QUANTITY));

const cartKey = () => {
  const { domain, user } = useAuthStore.getState();
  return domain && user ? `platx-cart:${domain.toLowerCase()}:${user.userId}` : null;
};

const sanitize = (raw: unknown): CartLine[] =>
  Array.isArray(raw) ? raw.filter((line) => line?.productId && line.quantity > 0).slice(0, MAX_CART_LINES) : [];

export const useCartStore = create<CartState>((set, get) => {
  const write = (lines: CartLine[]) => {
    set({ lines });
    const { key } = get();
    if (key) AsyncStorage.setItem(key, JSON.stringify(lines)).catch(() => {});
  };
  const quantityOf = (productId: number) => get().lines.find((line) => line.productId === productId)?.quantity ?? 0;

  return {
    key: null,
    lines: [],
    add: (product, imageUrl, quantity = 1) => {
      const lines = get().lines;
      const existing = lines.find((line) => line.productId === product.id);
      if (!existing && lines.length >= MAX_CART_LINES) return 'full';
      const room = Math.max(0, cartLimitOf(product.stock) - quantityOf(product.id));
      if (room <= 0) return 'limit';
      const added = Math.min(quantity, room);
      if (existing) {
        write(lines.map((line) => (line.productId === product.id ? { ...line, quantity: line.quantity + added } : line)));
      } else {
        write([
          ...lines,
          {
            productId: product.id,
            name: product.name,
            imageUrl,
            unitPrice: storeEffectivePrice(product),
            listPrice: product.price,
            stock: product.stock,
            quantity: added,
          },
        ]);
      }
      return added < quantity ? 'partial' : 'added';
    },
    setQuantity: (productId, quantity) => {
      if (quantity < 1) return;
      write(get().lines.map((line) => (line.productId === productId ? { ...line, quantity: Math.min(quantity, cartLimitOf(line.stock)) } : line)));
    },
    remove: (productId) => write(get().lines.filter((line) => line.productId !== productId)),
    sync: (fresh) => {
      const byId = new Map(fresh.map((product) => [product.id, product]));
      const meaningful = (list: CartLine[]) => JSON.stringify(list.map(({ listPrice, ...line }) => line));
      const current = get().lines;
      const lines = current.flatMap((line) => {
        const product = byId.get(line.productId);
        if (!product || product.stock === 0) return [];
        return [
          {
            ...line,
            name: product.name,
            imageUrl: product.imageUrl ?? line.imageUrl,
            unitPrice: storeEffectivePrice(product),
            listPrice: product.price,
            stock: product.stock,
            quantity: Math.min(line.quantity, cartLimitOf(product.stock)),
          },
        ];
      });
      if (JSON.stringify(lines) !== JSON.stringify(current)) write(lines);
      return meaningful(lines) !== meaningful(current);
    },
    clear: () => write([]),
  };
});

export const cartCount = (lines: CartLine[]) => lines.reduce((sum, line) => sum + line.quantity, 0);
export const cartTotal = (lines: CartLine[]) => fromCents(lines.reduce((sum, line) => sum + toCents(line.unitPrice) * line.quantity, 0));

async function hydrate() {
  const key = cartKey();
  if (key === useCartStore.getState().key) return;
  useCartStore.setState({ key, lines: [] });
  if (!key) return;
  try {
    const lines = sanitize(JSON.parse((await AsyncStorage.getItem(key)) ?? '[]'));
    if (useCartStore.getState().key === key) useCartStore.setState({ lines });
  } catch {}
}

hydrate();
useAuthStore.subscribe(() => {
  hydrate();
});
