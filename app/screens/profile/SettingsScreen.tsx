import React from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { AppPreferences, LogoutButton, SettingsRow, SettingsSection } from '../../components/settings/SettingsSections';
import { useTheme } from '../../theme/ThemeProvider';
import { useAuth } from '../../hooks/useAuth';
import { useRTL } from '../../i18n/RTLProvider';
import type { ProfileStackParamList } from '../../types/navigation.types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'Settings'>;

export default function SettingsScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { logout } = useAuth();
  const { t } = useRTL();

  const handleLogout = () => {
    Alert.alert(t('auth.signOut'), t('auth.signOutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('auth.signOut'), style: 'destructive', onPress: () => logout() },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScreenHeader title={t('settings.title')} onBack={() => navigation.goBack()} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <AppPreferences />

        <SettingsSection title={t('settings.account')}>
          <SettingsRow
            icon="trash-outline"
            iconBg={theme.colors.danger + '1A'}
            iconColor={theme.colors.danger}
            label={t('deleteAccount.title')}
            description={t('settings.deleteAccountDesc')}
            danger
            onPress={() => navigation.navigate('DeleteAccount')}
          />
        </SettingsSection>

        <LogoutButton label={t('auth.signOut')} onPress={handleLogout} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 120,
  },
});
