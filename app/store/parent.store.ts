import { create } from 'zustand';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../config';
import { guardianApi } from '../services/api/guardian.api';
import { setInMemoryToken, setParentMode } from '../services/api/client';
import { enablePushNotifications, registerForPushNotifications } from '../services/realtime/pushNotifications';
import i18n from '../i18n/i18n.config';
import type { GuardianChild } from '../types/guardian.types';

interface ParentState {
  token: string | null;
  children: GuardianChild[];
  selectedChildId: number | null;
  unreadCount: number;
}

interface ParentActions {
  redeem: (code: string) => Promise<boolean>;
  restore: () => Promise<boolean>;
  refreshChildren: () => Promise<void>;
  selectChild: (studentId: number) => void;
  fetchUnreadCount: () => Promise<void>;
  setUnreadCount: (count: number) => void;
  logout: () => Promise<void>;
  clear: () => Promise<void>;
}

type ParentStore = ParentState & ParentActions;

const EMPTY_STATE: ParentState = {
  token: null,
  children: [],
  selectedChildId: null,
  unreadCount: 0,
};

const PARENT_KEYS = [STORAGE_KEYS.PARENT_TOKEN, STORAGE_KEYS.PARENT_CHILDREN];

function pickChild(children: GuardianChild[], preferred: number | null): number | null {
  if (preferred != null && children.some((child) => child.studentId === preferred)) return preferred;
  return children[0]?.studentId ?? null;
}

function confirmReplaceChildren(): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      i18n.t('parent.otherAcademyTitle'),
      i18n.t('parent.otherAcademyMessage'),
      [
        { text: i18n.t('common.cancel'), style: 'cancel', onPress: () => resolve(false) },
        { text: i18n.t('parent.otherAcademyContinue'), style: 'destructive', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) }
    );
  });
}

function activate(token: string) {
  setInMemoryToken(token);
  setParentMode(true);
}

export const useParentStore = create<ParentStore>((set, get) => ({
  ...EMPTY_STATE,

  redeem: async (code: string) => {
    const previousToken = get().token;
    const known = get().children.map((child) => child.studentId);
    const result = await guardianApi.redeem(code);
    const dropsKnown = known.some((id) => !result.children.some((child) => child.studentId === id));
    if (previousToken && dropsKnown) {
      if (!(await confirmReplaceChildren())) return false;
      if (get().token !== previousToken) return false;
    }
    const added = result.children.find((child) => !known.includes(child.studentId));
    await AsyncStorage.multiSet([
      [STORAGE_KEYS.PARENT_TOKEN, result.token],
      [STORAGE_KEYS.PARENT_CHILDREN, JSON.stringify(result.children)],
    ]);
    activate(result.token);
    set({
      token: result.token,
      children: result.children,
      selectedChildId: pickChild(result.children, added?.studentId ?? get().selectedChildId),
    });
    enablePushNotifications().catch(() => {});
    get().fetchUnreadCount();
    return true;
  },

  restore: async () => {
    const [[, token], [, storedChildren]] = await AsyncStorage.multiGet(PARENT_KEYS);
    if (!token) return false;
    let children: GuardianChild[] = [];
    try {
      children = storedChildren ? JSON.parse(storedChildren) : [];
    } catch {}
    activate(token);
    set({ token, children, selectedChildId: pickChild(children, null), unreadCount: 0 });
    get().refreshChildren().catch(() => {});
    get().fetchUnreadCount();
    registerForPushNotifications().catch(() => {});
    return true;
  },

  refreshChildren: async () => {
    const token = get().token;
    if (!token) return;
    const children = await guardianApi.children();
    if (get().token !== token) return;
    set({ children, selectedChildId: pickChild(children, get().selectedChildId) });
    await AsyncStorage.setItem(STORAGE_KEYS.PARENT_CHILDREN, JSON.stringify(children));
  },

  selectChild: (studentId: number) => set({ selectedChildId: studentId }),

  fetchUnreadCount: async () => {
    const token = get().token;
    if (!token) return;
    try {
      const count = await guardianApi.unreadCount();
      if (get().token === token) set({ unreadCount: Number(count) || 0 });
    } catch {}
  },

  setUnreadCount: (count: number) => set({ unreadCount: Math.max(0, count) }),

  logout: async () => {
    const pushToken = await AsyncStorage.getItem(STORAGE_KEYS.PUSH_TOKEN).catch(() => null);
    await guardianApi.logout(pushToken).catch(() => {});
    await get().clear();
  },

  clear: async () => {
    setInMemoryToken(null);
    setParentMode(false);
    set(EMPTY_STATE);
    try {
      await AsyncStorage.multiRemove([...PARENT_KEYS, STORAGE_KEYS.PUSH_TOKEN]);
    } catch {}
  },
}));

export const selectCurrentChild = (state: ParentStore): GuardianChild | null =>
  state.children.find((child) => child.studentId === state.selectedChildId) ?? null;
