import React, { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AppState, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../theme/ThemeProvider';
import type { ThemeMode } from '../../theme/ThemeProvider';
import { useRTL } from '../../i18n/RTLProvider';
import { SUPPORTED_LANGUAGES, RTL_LANGUAGES } from '../../config/constants';
import {
  enablePushNotifications,
  getPushPermission,
  registerForPushNotifications,
  type PushPermission,
} from '../../services/realtime/pushNotifications';
import { getAppVersion } from '../../utils/version';
import { spacing } from '../../theme/spacing';
import { typography, fontSize } from '../../theme/typography';

function Chip({
  value,
  label,
  currentValue,
  onPress,
}: {
  value: string;
  label: string;
  currentValue: string;
  onPress: (v: string) => void;
}) {
  const { theme } = useTheme();
  const isActive = currentValue === value;
  return (
    <TouchableOpacity
      style={[
        styles.chip,
        {
          backgroundColor: isActive ? theme.colors.text : theme.colors.background,
        },
      ]}
      onPress={() => onPress(value)}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
    >
      <Text style={[styles.chipText, { color: isActive ? theme.colors.background : theme.colors.text }]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function SettingsSection({ title, children }: { title?: string; children: ReactNode }) {
  const { theme } = useTheme();
  return (
    <View style={styles.section}>
      {!!title && <Text style={[styles.sectionTitle, { color: theme.colors.textMuted }]}>{title}</Text>}
      {children}
    </View>
  );
}

export function SettingsRow({
  icon,
  iconBg,
  iconColor,
  label,
  description,
  value,
  danger,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
  label: string;
  description?: string;
  value?: string;
  danger?: boolean;
  onPress?: () => void;
}) {
  const { theme } = useTheme();
  const { isRTL } = useRTL();
  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: theme.colors.card }]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.7}
      accessibilityRole={onPress ? 'button' : undefined}
    >
      <View style={[styles.cardRow, { paddingBottom: 0 }]}>
        <View style={[styles.settingIcon, { backgroundColor: iconBg }]}>
          <Ionicons name={icon} size={20} color={iconColor} />
        </View>
        <View style={styles.settingInfo}>
          <Text style={[styles.settingLabel, { color: danger ? theme.colors.danger : theme.colors.text }]}>{label}</Text>
          {!!description && (
            <Text style={[styles.settingDesc, { color: theme.colors.textMuted }]}>{description}</Text>
          )}
        </View>
        {!!value && <Text style={[styles.versionText, { color: theme.colors.textMuted }]}>{value}</Text>}
        {!!onPress && (
          <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={18} color={theme.colors.textMuted} />
        )}
      </View>
    </TouchableOpacity>
  );
}

export function LogoutButton({ label, onPress }: { label: string; onPress: () => void }) {
  const { theme } = useTheme();
  return (
    <View style={styles.section}>
      <TouchableOpacity
        style={[styles.logoutBtn, { backgroundColor: theme.colors.danger + '10' }]}
        onPress={onPress}
        activeOpacity={0.7}
        accessibilityRole="button"
      >
        <Ionicons name="log-out-outline" size={22} color={theme.colors.danger} />
        <Text style={[styles.logoutText, { color: theme.colors.danger }]}>{label}</Text>
      </TouchableOpacity>
    </View>
  );
}

function AppearanceSection() {
  const { theme, setTheme, themeMode } = useTheme();
  const { t } = useRTL();
  const pickTheme = (value: string) => setTheme(value as ThemeMode);
  return (
    <SettingsSection title={t('settings.appearance')}>
      <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
        <View style={styles.cardRow}>
          <View style={[styles.settingIcon, { backgroundColor: theme.colors.primaryLight }]}>
            <Ionicons name="color-palette" size={20} color={theme.colors.primary} />
          </View>
          <View style={styles.settingInfo}>
            <Text style={[styles.settingLabel, { color: theme.colors.text }]}>{t('settings.theme')}</Text>
            <Text style={[styles.settingDesc, { color: theme.colors.textMuted }]}>{t('settings.chooseTheme')}</Text>
          </View>
        </View>
        <View style={styles.chipRow}>
          <Chip value="light" label={t('settings.light')} currentValue={themeMode} onPress={pickTheme} />
          <Chip value="dark" label={t('settings.dark')} currentValue={themeMode} onPress={pickTheme} />
          <Chip value="system" label={t('settings.system')} currentValue={themeMode} onPress={pickTheme} />
        </View>
      </View>
    </SettingsSection>
  );
}

function LanguageSection() {
  const { theme } = useTheme();
  const { locale, setLocale, t, isRTL } = useRTL();

  const handleLanguageChange = async (langCode: string) => {
    if (langCode === locale) return;
    const directionChanges = RTL_LANGUAGES.includes(langCode) !== isRTL;
    await setLocale(langCode);
    if (directionChanges) {
      Alert.alert(t('settings.restartRequired'), t('settings.restartMessage'));
    }
  };

  return (
    <SettingsSection title={t('settings.language')}>
      <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
        <View style={styles.cardRow}>
          <View style={[styles.settingIcon, { backgroundColor: theme.colors.primaryLight }]}>
            <Ionicons name="globe" size={20} color={theme.colors.primary} />
          </View>
          <View style={styles.settingInfo}>
            <Text style={[styles.settingLabel, { color: theme.colors.text }]}>{t('settings.selectLanguage')}</Text>
          </View>
        </View>
        <View style={styles.chipRow}>
          {SUPPORTED_LANGUAGES.map((lang) => (
            <Chip
              key={lang.code}
              value={lang.code}
              label={lang.nativeName}
              currentValue={locale}
              onPress={handleLanguageChange}
            />
          ))}
        </View>
      </View>
    </SettingsSection>
  );
}

const PERMISSION_DESCRIPTION: Record<PushPermission, string> = {
  granted: 'settings.notificationsOn',
  undetermined: 'settings.notificationsOff',
  blocked: 'settings.notificationsBlocked',
};

function NotificationsSection() {
  const { t } = useRTL();
  const { theme } = useTheme();
  const [permission, setPermission] = useState<PushPermission | null>(null);
  const previous = useRef<PushPermission | null>(null);

  const refresh = useCallback(async () => {
    const next = await getPushPermission();
    if (next === 'granted' && previous.current !== null && previous.current !== 'granted') {
      registerForPushNotifications().catch(() => {});
    }
    previous.current = next;
    setPermission(next);
  }, []);

  useEffect(() => {
    refresh();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => subscription.remove();
  }, [refresh]);

  const handlePress = async () => {
    if (permission === 'undetermined') {
      await enablePushNotifications();
      refresh();
      return;
    }
    Linking.openSettings().catch(() => {});
  };

  return (
    <SettingsSection title={t('settings.notifications')}>
      <SettingsRow
        icon="notifications"
        iconBg={theme.colors.primaryLight}
        iconColor={theme.colors.primary}
        label={t('settings.pushNotifications')}
        description={permission ? t(PERMISSION_DESCRIPTION[permission]) : undefined}
        onPress={permission ? handlePress : undefined}
      />
    </SettingsSection>
  );
}

function AboutSection() {
  const { t } = useRTL();
  const { theme } = useTheme();
  return (
    <SettingsSection title={t('settings.about')}>
      <SettingsRow
        icon="information-circle"
        iconBg={theme.colors.primaryLight}
        iconColor={theme.colors.primary}
        label={t('settings.version')}
        value={getAppVersion()}
      />
    </SettingsSection>
  );
}

export function AppPreferences() {
  return (
    <>
      <AppearanceSection />
      <LanguageSection />
      <NotificationsSection />
      <AboutSection />
    </>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSize.xs,
    fontFamily: 'Cairo_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
    marginStart: spacing.xs,
    textAlign: 'left',
  },
  card: {
    borderRadius: 20,
    padding: spacing.lg,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  settingIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: fontSize.base,
    fontFamily: 'Cairo_600SemiBold',
    textAlign: 'left',
  },
  settingDesc: {
    fontSize: fontSize.xs,
    fontFamily: 'Cairo_400Regular',
    marginTop: 2,
    textAlign: 'left',
  },
  chipRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  chip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    fontSize: fontSize.sm,
    fontFamily: 'Cairo_600SemiBold',
    textAlign: 'left',
  },
  versionText: {
    fontSize: fontSize.sm,
    fontFamily: 'Cairo_600SemiBold',
    textAlign: 'left',
  },
  logoutBtn: {
    borderRadius: 20,
    padding: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  logoutText: {
    ...typography.button,
  },
});
