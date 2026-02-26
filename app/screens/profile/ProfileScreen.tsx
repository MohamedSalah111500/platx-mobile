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
import { useAuth } from '../../hooks/useAuth';
import { useRTL } from '../../i18n/RTLProvider';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography, fontSize } from '../../theme/typography';
import type { ProfileStackParamList } from '../../types/navigation.types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'Profile'>;

const ACCENT = '#7c63fd';
const BG = '#FFFFFF';

export default function ProfileScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { user, role: authRole, can, isStudent, logout } = useAuth();
  const { t } = useRTL();
  const insets = useSafeAreaInsets();

  const role = authRole || 'Student';
  const canManageGroups = can('GROUPS');
  const canMyGroup = can('MY_GROUP');
  const canLive = can('LIVE_CLASSROOM');

  const handleLogout = () => {
    Alert.alert(t('auth.signOut'), t('auth.signOutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('auth.signOut'),
        style: 'destructive',
        onPress: () => logout(),
      },
    ]);
  };

  const firstName = user?.firstName || '';
  const lastName = user?.lastName || '';
  const initials = (firstName?.[0] || '') + (lastName?.[0] || '');

  const bgColor = theme.dark ? theme.colors.background : BG;

  const generalMenuItems: { iconName: string; iconBg: string; iconColor: string; label: string; onPress: () => void }[] = [];
  if (canManageGroups || canMyGroup) {
    generalMenuItems.push({
      iconName: 'people',
      iconBg: '#E8F4FD',
      iconColor: '#3B82F6',
      label: isStudent ? t('groups.myGroups') : t('groups.title'),
      onPress: () => navigation.navigate('Groups'),
    });
  }
  if (canLive) {
    generalMenuItems.push({
      iconName: 'videocam',
      iconBg: '#E8F8F0',
      iconColor: '#34C38F',
      label: t('live.title'),
      onPress: () => navigation.navigate('LiveSessions'),
    });
  }
  generalMenuItems.push({
    iconName: 'trophy',
    iconBg: '#FFF4E5',
    iconColor: '#F5A623',
    label: t('honorBoard.title'),
    onPress: () => navigation.navigate('HonorBoard'),
  });

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Purple header */}
        <View style={[styles.headerBg, { paddingTop: insets.top + spacing.lg }]}>
          <View style={[styles.avatar, { backgroundColor: theme.dark ? theme.colors.surface : '#F0EDFF' }]}>
            <Text style={styles.avatarText}>
              {initials.toUpperCase() || '?'}
            </Text>
          </View>
          <Text style={styles.userName}>
            {firstName} {lastName}
          </Text>
          {user?.email ? (
            <Text style={styles.email}>{user.email}</Text>
          ) : null}
          <View style={styles.rolePill}>
            <Text style={styles.roleText}>{role}</Text>
          </View>
        </View>

        {/* Stats Row - overlaps header */}
        <View style={styles.statsRow}>
          <TouchableOpacity
            style={[styles.statCard, { backgroundColor: theme.colors.card }]}
            activeOpacity={0.7}
            onPress={() => navigation.getParent()?.navigate('CoursesTab')}
          >
            <View style={[styles.statIcon, { backgroundColor: '#F0EDFF' }]}>
              <Ionicons name="book" size={18} color={ACCENT} />
            </View>
            <Text style={[styles.statValue, { color: theme.colors.text }]}>-</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textMuted }]}>{t('profile.courses')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.statCard, { backgroundColor: theme.colors.card }]}
            activeOpacity={0.7}
            onPress={() => navigation.getParent()?.navigate('ChatTab')}
          >
            <View style={[styles.statIcon, { backgroundColor: '#E8F8F0' }]}>
              <Ionicons name="chatbubbles" size={18} color="#34C38F" />
            </View>
            <Text style={[styles.statValue, { color: theme.colors.text }]}>-</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textMuted }]}>{t('profile.messages')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.statCard, { backgroundColor: theme.colors.card }]}
            activeOpacity={0.7}
            onPress={() => navigation.getParent()?.navigate('CoursesTab')}
          >
            <View style={[styles.statIcon, { backgroundColor: '#FFF4E5' }]}>
              <Ionicons name="trophy" size={18} color="#F5A623" />
            </View>
            <Text style={[styles.statValue, { color: theme.colors.text }]}>-</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textMuted }]}>{t('profile.completed')}</Text>
          </TouchableOpacity>
        </View>

        {/* General Section */}
        {generalMenuItems.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textMuted }]}>
              {t('profile.general')}
            </Text>
            <View style={[styles.menuCard, { backgroundColor: theme.colors.card }]}>
              {generalMenuItems.map((item, idx) => (
                <TouchableOpacity
                  key={`${item.iconName}-${item.label}`}
                  style={[
                    styles.menuRow,
                    idx < generalMenuItems.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.colors.divider },
                  ]}
                  onPress={item.onPress}
                  activeOpacity={0.6}
                >
                  <View style={[styles.menuIcon, { backgroundColor: item.iconBg }]}>
                    <Ionicons name={item.iconName as any} size={20} color={item.iconColor} />
                  </View>
                  <Text style={[styles.menuLabel, { color: theme.colors.text }]}>{item.label}</Text>
                  <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Preferences Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textMuted }]}>
            {t('profile.preferences')}
          </Text>
          <View style={[styles.menuCard, { backgroundColor: theme.colors.card }]}>
            <TouchableOpacity
              style={[styles.menuRow, { borderBottomWidth: 1, borderBottomColor: theme.colors.divider }]}
              onPress={() => navigation.navigate('Settings')}
              activeOpacity={0.6}
            >
              <View style={[styles.menuIcon, { backgroundColor: '#F0EDFF' }]}>
                <Ionicons name="settings" size={20} color={ACCENT} />
              </View>
              <Text style={[styles.menuLabel, { color: theme.colors.text }]}>{t('profile.settings')}</Text>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => navigation.navigate('ChangePassword')}
              activeOpacity={0.6}
            >
              <View style={[styles.menuIcon, { backgroundColor: '#FFF4E5' }]}>
                <Ionicons name="lock-closed" size={20} color="#F5A623" />
              </View>
              <Text style={[styles.menuLabel, { color: theme.colors.text }]}>{t('auth.changePassword')}</Text>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
            </TouchableOpacity>
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
  headerBg: {
    backgroundColor: ACCENT,
    paddingBottom: 44,
    alignItems: 'center',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.35)',
    marginBottom: spacing.md,
  },
  avatarText: {
    fontSize: 30,
    fontWeight: '800',
    color: ACCENT,
  },
  userName: {
    ...typography.h3,
    color: '#ffffff',
    fontWeight: '700',
  },
  email: {
    ...typography.bodySmall,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  rolePill: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: borderRadius.full,
  },
  roleText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: spacing.xl,
    marginTop: -24,
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 18,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
      },
      android: { elevation: 1 },
    }),
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  statValue: {
    fontSize: fontSize.lg,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
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
  menuCard: {
    borderRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
      },
      android: { elevation: 1 },
    }),
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
  },
  menuIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  menuLabel: {
    flex: 1,
    fontSize: fontSize.base,
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
