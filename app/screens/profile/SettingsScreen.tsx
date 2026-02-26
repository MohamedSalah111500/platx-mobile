import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeProvider';
import type { ThemeMode } from '../../theme/ThemeProvider';
import { useAuth } from '../../hooks/useAuth';
import { useRTL } from '../../i18n/RTLProvider';
import { SUPPORTED_LANGUAGES } from '../../config/constants';
import { spacing } from '../../theme/spacing';
import { typography, fontSize } from '../../theme/typography';
import type { ProfileStackParamList } from '../../types/navigation.types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'Settings'>;

const ACCENT = '#7c63fd';
const BG = '#FFFFFF';

export default function SettingsScreen({ navigation }: Props) {
  const { theme, setTheme, themeMode } = useTheme();
  const { logout } = useAuth();
  const { locale, setLocale, t } = useRTL();
  const insets = useSafeAreaInsets();

  const bgColor = theme.dark ? theme.colors.background : BG;

  const handleLogout = () => {
    Alert.alert(t('auth.signOut'), t('auth.signOutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('auth.signOut'), style: 'destructive', onPress: () => logout() },
    ]);
  };

  const handleLanguageChange = async (langCode: string) => {
    if (langCode === locale) return;
    await setLocale(langCode);
    if (langCode === 'ar') {
      Alert.alert(
        t('settings.restartRequired'),
        t('settings.restartMessage'),
      );
    }
  };

  const Chip = ({
    value,
    label,
    currentValue,
    onPress,
  }: {
    value: string;
    label: string;
    currentValue: string;
    onPress: (v: string) => void;
  }) => {
    const isActive = currentValue === value;
    return (
      <TouchableOpacity
        style={[
          styles.chip,
          {
            backgroundColor: isActive ? ACCENT : theme.colors.card,
            borderColor: isActive ? ACCENT : theme.colors.border,
          },
        ]}
        onPress={() => onPress(value)}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.chipText,
            { color: isActive ? '#fff' : theme.colors.text },
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: theme.colors.card }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={20} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          {t('settings.title')}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Theme */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textMuted }]}>
            {t('settings.appearance')}
          </Text>
          <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
            <View style={styles.cardRow}>
              <View style={[styles.settingIcon, { backgroundColor: '#F0EDFF' }]}>
                <Ionicons name="color-palette" size={20} color={ACCENT} />
              </View>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: theme.colors.text }]}>
                  {t('settings.theme')}
                </Text>
                <Text style={[styles.settingDesc, { color: theme.colors.textMuted }]}>
                  {t('settings.chooseTheme')}
                </Text>
              </View>
            </View>
            <View style={styles.chipRow}>
              <Chip value="light" label={t('settings.light')} currentValue={themeMode} onPress={(v) => setTheme(v as ThemeMode)} />
              <Chip value="dark" label={t('settings.dark')} currentValue={themeMode} onPress={(v) => setTheme(v as ThemeMode)} />
              <Chip value="system" label={t('settings.system')} currentValue={themeMode} onPress={(v) => setTheme(v as ThemeMode)} />
            </View>
          </View>
        </View>

        {/* Language */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textMuted }]}>
            {t('settings.language')}
          </Text>
          <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
            <View style={styles.cardRow}>
              <View style={[styles.settingIcon, { backgroundColor: '#E8F4FD' }]}>
                <Ionicons name="globe" size={20} color="#3B82F6" />
              </View>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: theme.colors.text }]}>
                  {t('settings.selectLanguage')}
                </Text>
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
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textMuted }]}>
            {t('settings.about')}
          </Text>
          <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
            <View style={[styles.cardRow, { paddingBottom: 0 }]}>
              <View style={[styles.settingIcon, { backgroundColor: '#E8F8F0' }]}>
                <Ionicons name="information-circle" size={20} color="#34C38F" />
              </View>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: theme.colors.text }]}>
                  {t('settings.version')}
                </Text>
              </View>
              <Text style={[styles.versionText, { color: theme.colors.textMuted }]}>1.0.0</Text>
            </View>
          </View>
        </View>

        {/* Logout */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.logoutBtn, { backgroundColor: theme.colors.danger + '10' }]}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={22} color={theme.colors.danger} />
            <Text style={[styles.logoutText, { color: theme.colors.danger }]}>
              {t('auth.signOut')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.h3,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  section: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  card: {
    borderRadius: 20,
    padding: spacing.lg,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 3,
      },
      android: { elevation: 1 },
    }),
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: spacing.md,
  },
  settingIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: fontSize.base,
    fontWeight: '600',
  },
  settingDesc: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  chipRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  chip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
  },
  chipText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  versionText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  logoutBtn: {
    borderRadius: 20,
    padding: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutText: {
    ...typography.button,
    marginLeft: spacing.sm,
  },
});
