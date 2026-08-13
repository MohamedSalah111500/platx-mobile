import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../theme/ThemeProvider';
import { useAuthStore } from '../../store/auth.store';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import type { AuthStackParamList } from '../../types/navigation.types';
import type { TenantInfo } from '../../types/auth.types';
import { useRTL } from '../../i18n/RTLProvider';
import { ErrorBanner } from '../../components/ui/ErrorBanner';
import { API_CONFIG } from '../../config';
import { isValidHexColor } from '../../utils/color';

type Props = NativeStackScreenProps<AuthStackParamList, 'TenantSelection'>;

export default function TenantSelectionScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { pendingTenants, selectTenant, clearPendingTenants, isLoading, error } = useAuthStore();
  const { t } = useRTL();

  const handleSelect = async (tenantId: string) => {
    try {
      await selectTenant(tenantId);
    } catch {
      // Error is shown in store
    }
  };

  const handleBack = () => {
    clearPendingTenants();
    navigation.goBack();
  };

  const getLogoUrl = (logoUrl: string) => {
    if (!logoUrl) return null;
    if (logoUrl.startsWith('http')) return logoUrl;
    return `${API_CONFIG.BASE_URL}${logoUrl.startsWith('/') ? logoUrl.slice(1) : logoUrl}`;
  };

  const renderTenant = ({ item }: { item: TenantInfo }) => {
    const logoUri = getLogoUrl(item.logoUrl);
    const accent = isValidHexColor(item.primaryColor) ? item.primaryColor : theme.colors.primary;
    return (
      <TouchableOpacity
        style={styles.tenantCard}
        onPress={() => handleSelect(item.tenantId)}
        activeOpacity={0.7}
        disabled={isLoading}
      >
        <View style={styles.tenantContent}>
          {logoUri ? (
            <Image
              source={{ uri: logoUri }}
              style={styles.tenantLogo}
              resizeMode="contain"
            />
          ) : (
            <View style={[styles.tenantLogo, styles.tenantLogoPlaceholder, { backgroundColor: accent + '15' }]}>
              <Ionicons name="school-outline" size={28} color={accent} />
            </View>
          )}
          <View style={styles.tenantInfo}>
            <Text style={styles.tenantName} numberOfLines={1}>{item.tenantName}</Text>
            <Text style={styles.tenantRoles}>
              {item.roles?.join(', ') || 'Member'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
        </View>
      </TouchableOpacity>
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.dark ? theme.colors.background : '#FFFFFF',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingTop: spacing['2xl'] + 20,
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.md,
    },
    backButton: {
      padding: spacing.sm,
      marginRight: spacing.sm,
    },
    content: {
      flex: 1,
      paddingHorizontal: spacing['2xl'],
    },
    title: {
      ...typography.h3,
      color: theme.colors.text,
      fontFamily: 'Cairo_700Bold',
      marginBottom: spacing.xs,
      textAlign: 'center',
    },
    subtitle: {
      ...typography.body,
      color: theme.colors.textSecondary,
      marginBottom: spacing.xl,
      textAlign: 'center',
    },
    tenantCard: {
      backgroundColor: theme.colors.card,
      borderRadius: borderRadius.xl,
      padding: spacing.lg,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.divider,
    },
    tenantContent: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    tenantLogo: {
      width: 48,
      height: 48,
      borderRadius: borderRadius.lg,
    },
    tenantLogoPlaceholder: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    tenantInfo: {
      flex: 1,
      marginLeft: spacing.md,
    },
    tenantName: {
      ...typography.body,
      color: theme.colors.text,
      fontFamily: 'Cairo_600SemiBold',
    },
    tenantRoles: {
      ...typography.caption,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    listContent: {
      paddingBottom: spacing['2xl'],
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>{t('auth.selectTenant')}</Text>
        <Text style={styles.subtitle}>{t('auth.selectTenantSubtitle')}</Text>

        {error && <ErrorBanner message={error} />}

        <FlatList
          data={pendingTenants || []}
          keyExtractor={(item) => item.tenantId}
          renderItem={renderTenant}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </View>
  );
}
