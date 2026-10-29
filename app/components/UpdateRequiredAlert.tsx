import { useCallback, useEffect, useRef } from 'react';
import { Alert, AppState, Linking } from 'react-native';
import { useRTL } from '../i18n/RTLProvider';
import { useUIStore } from '../store/ui.store';

export default function UpdateRequiredAlert() {
  const { t } = useRTL();
  const updateRequired = useUIStore((s) => s.updateRequired);
  const isShowing = useRef(false);

  const openStore = useCallback(async () => {
    isShowing.current = false;
    const url = updateRequired?.storeUrl;
    if (!url) return;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert(t('common.error'), t('updateRequired.storeFailed'));
    }
  }, [updateRequired?.storeUrl, t]);

  const show = useCallback(() => {
    if (!updateRequired || isShowing.current) return;
    isShowing.current = true;
    Alert.alert(
      t('updateRequired.title'),
      t('updateRequired.body'),
      [{ text: t('updateRequired.update'), onPress: openStore }],
      { cancelable: false },
    );
  }, [updateRequired, openStore, t]);

  useEffect(() => {
    show();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') show();
    });
    return () => sub.remove();
  }, [show]);

  return null;
}
