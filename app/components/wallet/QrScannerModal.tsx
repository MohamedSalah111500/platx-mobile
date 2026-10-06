import React, { useEffect, useRef } from 'react';
import { Linking, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRTL } from '../../i18n/RTLProvider';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';

interface Props {
  visible: boolean;
  onClose: () => void;
  onScanned: (value: string) => void | Promise<void>;
  continuous?: boolean;
  hint?: string;
  feedback?: { ok: boolean; text: string } | null;
}

const FRAME = 240;
const REARM_MS = 1200;
const SAME_CODE_MS = 4000;

export function QrScannerModal({ visible, onClose, onScanned, continuous = false, hint, feedback }: Props) {
  const { t } = useRTL();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const handled = useRef(false);
  const last = useRef<{ value: string; at: number } | null>(null);

  useEffect(() => {
    if (visible) {
      handled.current = false;
      if (permission && !permission.granted && permission.canAskAgain) requestPermission();
    }
  }, [visible, permission, requestPermission]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.container}>
        {permission?.granted ? (
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={({ data }) => {
              if (handled.current) return;
              const now = Date.now();
              if (continuous && last.current && last.current.value === data && now - last.current.at < SAME_CODE_MS) return;
              handled.current = true;
              last.current = { value: data, at: now };
              const done = Promise.resolve(onScanned(data));
              if (continuous)
                done.finally(() => {
                  last.current = { value: data, at: Date.now() };
                  setTimeout(() => (handled.current = false), REARM_MS);
                });
            }}
          />
        ) : (
          <View style={styles.centered}>
            <Ionicons name="camera-outline" size={48} color="#FFFFFF" />
            <Text style={styles.message}>{t('wallet.cameraNeeded')}</Text>
            <TouchableOpacity
              style={styles.primary}
              onPress={() => (permission && !permission.canAskAgain ? Linking.openSettings() : requestPermission())}
              accessibilityRole="button"
            >
              <Text style={styles.primaryText}>
                {permission && !permission.canAskAgain ? t('wallet.openSettings') : t('wallet.allowCamera')}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {permission?.granted && (
          <View pointerEvents="none" style={styles.overlay}>
            <View style={styles.frame} />
            <Text style={styles.message}>{hint ?? t('wallet.scanHint')}</Text>
            {feedback && (
              <View style={[styles.feedback, { backgroundColor: feedback.ok ? '#34C38F' : '#F46A6A' }]}>
                <Text style={styles.feedbackText}>{feedback.text}</Text>
              </View>
            )}
          </View>
        )}

        <TouchableOpacity
          style={[styles.close, { top: insets.top + spacing.md }]}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
        >
          <Ionicons name="close" size={26} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    start: 0,
    end: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  frame: {
    width: FRAME,
    height: FRAME,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
  },
  message: {
    ...typography.body,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  feedback: {
    marginHorizontal: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  feedbackText: {
    ...typography.body,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  primary: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  primaryText: {
    ...typography.button,
    color: '#000000',
  },
  close: {
    position: 'absolute',
    end: spacing.lg,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
