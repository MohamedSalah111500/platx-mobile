import React from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ParentStackParamList } from '../../types/navigation.types';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { AppPreferences, LogoutButton, SettingsRow, SettingsSection } from '../../components/settings/SettingsSections';
import { useTheme } from '../../theme/ThemeProvider';
import { useRTL } from '../../i18n/RTLProvider';
import { useParentStore } from '../../store/parent.store';
import { spacing } from '../../theme/spacing';

type Props = NativeStackScreenProps<ParentStackParamList, 'ParentSettings'>;

export default function ParentSettingsScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { t } = useRTL();
  const logout = useParentStore((state) => state.logout);

  const confirmLogout = () => {
    Alert.alert(t('parent.logout'), t('parent.logoutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('parent.logout'), style: 'destructive', onPress: () => logout() },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScreenHeader title={t('settings.title')} onBack={() => navigation.goBack()} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <AppPreferences />

        <SettingsSection title={t('parent.children')}>
          <SettingsRow
            icon="person-add"
            iconBg={theme.colors.primaryLight}
            iconColor={theme.colors.primary}
            label={t('parent.addChild')}
            description={t('parent.addChildDesc')}
            onPress={() => navigation.navigate('ParentLink')}
          />
        </SettingsSection>

        <LogoutButton label={t('parent.logout')} onPress={confirmLogout} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: spacing['4xl'],
  },
});
