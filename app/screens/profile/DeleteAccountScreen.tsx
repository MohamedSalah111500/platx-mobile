import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { Button } from '../../components/ui/Button';
import { useTheme } from '../../theme/ThemeProvider';
import { useRTL } from '../../i18n/RTLProvider';
import { useAuth } from '../../hooks/useAuth';
import { spacing } from '../../theme/spacing';
import { fontSize } from '../../theme/typography';
import type { ProfileStackParamList } from '../../types/navigation.types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'DeleteAccount'>;

export default function DeleteAccountScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { t } = useRTL();
  const { deleteAccount } = useAuth();
  const insets = useSafeAreaInsets();
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const confirmWord = t('deleteAccount.confirmWord');
  // Typing the word is the deliberate step; the alert below is the final one.
  const confirmed = confirmText.trim().toLowerCase() === confirmWord.toLowerCase();

  const runDeletion = async () => {
    setDeleting(true);
    try {
      await deleteAccount();
      // The session is cleared by now, so the app is already back on the login screen.
      Alert.alert(t('deleteAccount.deletedTitle'), t('deleteAccount.deletedMessage'));
    } catch (error: any) {
      const status = error?.status ?? error?.response?.status;
      const message =
        status === 409
          ? t('deleteAccount.lastAdmin')
          : status === 403
          ? t('deleteAccount.notAllowed')
          : t('deleteAccount.failed');
      Alert.alert(t('common.error'), message);
      setDeleting(false);
    }
  };

  const handleDelete = () => {
    if (!confirmed || deleting) return;
    Alert.alert(t('deleteAccount.finalTitle'), t('deleteAccount.finalMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('deleteAccount.deleteButton'), style: 'destructive', onPress: runDeletion },
    ]);
  };

  const Bullet = ({ icon, text, color }: { icon: keyof typeof Ionicons.glyphMap; text: string; color: string }) => (
    <View style={styles.bulletRow}>
      <Ionicons name={icon} size={18} color={color} />
      <Text style={[styles.bulletText, { color: theme.colors.textSecondary }]}>{text}</Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScreenHeader title={t('deleteAccount.title')} onBack={() => navigation.goBack()} />

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing['2xl'] }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.warningCard, { backgroundColor: theme.colors.danger + '14' }]}>
            <Ionicons name="warning" size={28} color={theme.colors.danger} />
            <Text style={[styles.warningTitle, { color: theme.colors.danger }]}>
              {t('deleteAccount.warningTitle')}
            </Text>
            <Text style={[styles.warningBody, { color: theme.colors.text }]}>
              {t('deleteAccount.warningBody')}
            </Text>
          </View>

          <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
              {t('deleteAccount.whatIsDeleted')}
            </Text>
            <Bullet icon="close-circle" color={theme.colors.danger} text={t('deleteAccount.deletedProfile')} />
            <Bullet icon="close-circle" color={theme.colors.danger} text={t('deleteAccount.deletedAccess')} />
            <Bullet icon="close-circle" color={theme.colors.danger} text={t('deleteAccount.deletedDevices')} />
          </View>

          <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
              {t('deleteAccount.whatIsKept')}
            </Text>
            <Bullet
              icon="document-text-outline"
              color={theme.colors.textMuted}
              text={t('deleteAccount.keptRecords')}
            />
          </View>

          <Text style={[styles.confirmLabel, { color: theme.colors.text }]}>
            {t('deleteAccount.typeToConfirm', { word: confirmWord })}
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                borderColor: confirmed ? theme.colors.danger : theme.colors.inputBorder,
                backgroundColor: theme.colors.inputBackground,
                color: theme.colors.inputText,
              },
            ]}
            value={confirmText}
            onChangeText={setConfirmText}
            placeholder={confirmWord}
            placeholderTextColor={theme.colors.inputPlaceholder}
            autoCapitalize="characters"
            autoCorrect={false}
            editable={!deleting}
          />

          <Button
            title={t('deleteAccount.deleteButton')}
            variant="danger"
            onPress={handleDelete}
            disabled={!confirmed}
            loading={deleting}
            fullWidth
            size="large"
          />
          <Button
            title={t('common.cancel')}
            variant="ghost"
            onPress={() => navigation.goBack()}
            disabled={deleting}
            fullWidth
            style={styles.cancelButton}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.xl,
    gap: spacing.lg,
  },
  warningCard: {
    borderRadius: 20,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  warningTitle: {
    fontSize: fontSize.lg,
    fontFamily: 'Cairo_700Bold',
    textAlign: 'center',
  },
  warningBody: {
    fontSize: fontSize.sm,
    fontFamily: 'Cairo_400Regular',
    textAlign: 'center',
  },
  card: {
    borderRadius: 20,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  cardTitle: {
    fontSize: fontSize.base,
    fontFamily: 'Cairo_700Bold',
    marginBottom: spacing.xs,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  bulletText: {
    flex: 1,
    fontSize: fontSize.sm,
    fontFamily: 'Cairo_400Regular',
  },
  confirmLabel: {
    fontSize: fontSize.sm,
    fontFamily: 'Cairo_600SemiBold',
  },
  input: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: 'Cairo_400Regular',
  },
  cancelButton: {
    marginTop: -spacing.sm,
  },
});
