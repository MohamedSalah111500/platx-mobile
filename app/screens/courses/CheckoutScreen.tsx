import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useTheme } from '../../theme/ThemeProvider';
import { useAuth } from '../../hooks/useAuth';
import { useRTL } from '../../i18n/RTLProvider';
import { useSound } from '../../hooks/useSound';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { ErrorBanner } from '../../components/ui/ErrorBanner';
import { spacing, borderRadius } from '../../theme/spacing';
import { fontSize } from '../../theme/typography';
import { reservationsApi } from '../../services/api/reservations.api';
import { getFullImageUrl } from '../../utils/imageUrl';
import {
  PAYMENT_METHOD_VODAFONE,
  PAYMENT_METHOD_INSTAPAY,
  type PaymentMethod,
  type ReservationProofImage,
} from '../../types/reservation.types';

type Props = {
  navigation: NativeStackScreenProps<any, any>['navigation'];
  route: { params: { courseId: number; title?: string; price?: number; discountPrice?: number; image?: string } };
};

export default function CheckoutScreen({ navigation, route }: Props) {
  const { courseId, title, price, discountPrice, image } = route.params;
  const { theme } = useTheme();
  const { user } = useAuth();
  const { t, isRTL } = useRTL();
  const { play } = useSound();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [proof, setProof] = useState<ReservationProofImage | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const vodafone = methods.filter((m) => m.method === PAYMENT_METHOD_VODAFONE && m.isActive !== false);
  const instapay = methods.filter((m) => m.method === PAYMENT_METHOD_INSTAPAY && m.isActive !== false);

  useEffect(() => { loadMethods(); }, []);

  const loadMethods = async () => {
    try {
      setError(null);
      setLoading(true);
      const data = await reservationsApi.getPaymentMethods();
      setMethods(data);
      const firstVodafone = data.find((m) => m.method === PAYMENT_METHOD_VODAFONE && m.isActive !== false);
      const firstInstapay = data.find((m) => m.method === PAYMENT_METHOD_INSTAPAY && m.isActive !== false);
      setSelectedMethod(firstVodafone ? PAYMENT_METHOD_VODAFONE : firstInstapay ? PAYMENT_METHOD_INSTAPAY : null);
    } catch (err: any) {
      setError(err?.userMessage || t('checkout.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const pickProof = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('common.error'), t('checkout.permissionDenied'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];
    const name = asset.fileName || `reservation-${Date.now()}.jpg`;
    const type = asset.mimeType || 'image/jpeg';
    setProof({ uri: asset.uri, name, type });
  };

  const handleSubmit = async () => {
    if (!user?.studentId) {
      Alert.alert(t('common.error'), t('courses.missingStudentId'));
      return;
    }
    if (!selectedMethod) {
      Alert.alert(t('common.error'), t('checkout.selectMethodFirst'));
      return;
    }
    if (!proof) {
      Alert.alert(t('common.error'), t('checkout.proofRequired'));
      return;
    }
    setSubmitting(true);
    try {
      await reservationsApi.create({
        studentId: user.studentId,
        courseId,
        studentMessage: message.trim(),
        paymentMethod: selectedMethod,
        proofImage: proof,
      });
      play('success');
      Alert.alert(t('common.success'), t('checkout.submitted'), [
        { text: t('common.ok'), onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.userMessage || t('checkout.submitFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const displayPrice = discountPrice || price || 0;
  const coverUrl = getFullImageUrl(image);

  const renderMethodTab = (methodValue: number, label: string, available: boolean) => {
    if (!available) return null;
    const active = selectedMethod === methodValue;
    return (
      <TouchableOpacity
        key={methodValue}
        style={[
          styles.methodTab,
          { borderColor: active ? theme.colors.primary : theme.colors.divider, backgroundColor: active ? theme.colors.primary + '15' : theme.colors.card },
        ]}
        onPress={() => { play('tap'); setSelectedMethod(methodValue); }}
        activeOpacity={0.75}
      >
        <Text style={[styles.methodTabText, { color: active ? theme.colors.primary : theme.colors.textSecondary }]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderPayTo = () => {
    if (selectedMethod === PAYMENT_METHOD_VODAFONE) {
      return vodafone.map((m) => (
        <View key={m.id} style={styles.payToRow}>
          <Text style={[styles.payToLabel, { color: theme.colors.textMuted }]}>{t('checkout.vodafoneNumber')}</Text>
          <Text style={[styles.payToValue, { color: theme.colors.text }]}>{m.phoneNumber}</Text>
        </View>
      ));
    }
    if (selectedMethod === PAYMENT_METHOD_INSTAPAY) {
      return instapay.map((m) => (
        <View key={m.id} style={styles.payToRow}>
          <Text style={[styles.payToLabel, { color: theme.colors.textMuted }]}>{t('checkout.instapayAddress')}</Text>
          <Text style={[styles.payToValue, { color: theme.colors.text }]}>{m.accountNumber}</Text>
        </View>
      ));
    }
    return null;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm, borderBottomColor: theme.colors.divider }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>{t('checkout.title')}</Text>
        <View style={{ width: 22 }} />
      </View>

      {loading ? (
        <Spinner />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.xl, paddingBottom: insets.bottom + 120 }}>
          {error && <ErrorBanner message={error} />}

          <View style={[styles.summaryCard, { backgroundColor: theme.colors.card }]}>
            {coverUrl ? (
              <Image source={{ uri: coverUrl }} style={styles.summaryCover} resizeMode="cover" />
            ) : (
              <View style={[styles.summaryCover, { backgroundColor: theme.colors.primary + '22', justifyContent: 'center', alignItems: 'center' }]}>
                <Ionicons name="book" size={28} color={theme.colors.primary} />
              </View>
            )}
            <View style={styles.summaryInfo}>
              <Text style={[styles.summaryTitle, { color: theme.colors.text }]} numberOfLines={2}>
                {title || t('courses.untitled')}
              </Text>
              <View style={styles.priceRow}>
                <Text style={[styles.priceValue, { color: theme.colors.primary }]}>${displayPrice}</Text>
                {discountPrice != null && price != null && discountPrice < price && (
                  <Text style={[styles.priceOld, { color: theme.colors.textMuted }]}>${price}</Text>
                )}
              </View>
            </View>
          </View>

          <Text style={[styles.sectionLabel, { color: theme.colors.text }]}>{t('checkout.paymentMethod')}</Text>

          {vodafone.length === 0 && instapay.length === 0 ? (
            <View style={[styles.noticeCard, { backgroundColor: theme.colors.card }]}>
              <Ionicons name="alert-circle-outline" size={20} color={theme.colors.textMuted} />
              <Text style={[styles.noticeText, { color: theme.colors.textSecondary }]}>{t('checkout.noMethods')}</Text>
            </View>
          ) : (
            <>
              <View style={styles.methodTabs}>
                {renderMethodTab(PAYMENT_METHOD_VODAFONE, t('checkout.vodafoneCash'), vodafone.length > 0)}
                {renderMethodTab(PAYMENT_METHOD_INSTAPAY, t('checkout.instapay'), instapay.length > 0)}
              </View>

              <View style={[styles.payToCard, { backgroundColor: theme.colors.card }]}>
                {renderPayTo()}
                <Text style={[styles.payHint, { color: theme.colors.textMuted }]}>{t('checkout.payHint')}</Text>
              </View>
            </>
          )}

          <Text style={[styles.sectionLabel, { color: theme.colors.text }]}>{t('checkout.proofOfPayment')}</Text>
          <TouchableOpacity
            style={[styles.proofPicker, { borderColor: theme.colors.divider, backgroundColor: theme.colors.card }]}
            onPress={pickProof}
            activeOpacity={0.8}
          >
            {proof ? (
              <Image source={{ uri: proof.uri }} style={styles.proofPreview} resizeMode="cover" />
            ) : (
              <View style={styles.proofEmpty}>
                <Ionicons name="cloud-upload-outline" size={28} color={theme.colors.primary} />
                <Text style={[styles.proofEmptyText, { color: theme.colors.textSecondary }]}>{t('checkout.uploadProof')}</Text>
              </View>
            )}
          </TouchableOpacity>
          {proof && (
            <TouchableOpacity onPress={pickProof} style={styles.changeProof}>
              <Text style={[styles.changeProofText, { color: theme.colors.primary }]}>{t('checkout.changeImage')}</Text>
            </TouchableOpacity>
          )}

          <Text style={[styles.sectionLabel, { color: theme.colors.text }]}>
            {t('checkout.message')} <Text style={{ color: theme.colors.textMuted }}>({t('checkout.optional')})</Text>
          </Text>
          <TextInput
            style={[styles.messageInput, { backgroundColor: theme.colors.card, color: theme.colors.text, borderColor: theme.colors.divider, textAlign: isRTL ? 'right' : 'left' }]}
            placeholder={t('checkout.messagePlaceholder')}
            placeholderTextColor={theme.colors.textMuted}
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={3}
          />
        </ScrollView>
      )}

      {!loading && (
        <View style={[styles.stickyBar, { backgroundColor: theme.colors.card, paddingBottom: insets.bottom + spacing.md, borderTopColor: theme.colors.divider }]}>
          <Button
            title={t('checkout.submitRequest')}
            onPress={handleSubmit}
            loading={submitting}
            fullWidth
            size="large"
            icon={<Ionicons name="checkmark-circle" size={20} color="#fff" />}
            style={{ borderRadius: 16 }}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  backBtn: { width: 22, alignItems: 'flex-start' },
  headerTitle: { fontSize: fontSize.lg, fontFamily: 'Cairo_700Bold' },

  summaryCard: {
    flexDirection: 'row',
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    marginBottom: spacing.xl,
    gap: spacing.md,
  },
  summaryCover: { width: 84, height: 84, borderRadius: borderRadius.lg },
  summaryInfo: { flex: 1, justifyContent: 'center' },
  summaryTitle: { fontSize: fontSize.base, fontFamily: 'Cairo_600SemiBold', lineHeight: 22 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  priceValue: { fontSize: fontSize.lg, fontFamily: 'Cairo_700Bold' },
  priceOld: { fontSize: fontSize.sm, fontFamily: 'Cairo_500Medium', textDecorationLine: 'line-through' },

  sectionLabel: { fontSize: fontSize.base, fontFamily: 'Cairo_700Bold', marginBottom: spacing.md, marginTop: spacing.sm },

  methodTabs: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  methodTab: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  methodTabText: { fontSize: fontSize.sm, fontFamily: 'Cairo_600SemiBold' },

  payToCard: { borderRadius: borderRadius.lg, padding: spacing.lg, marginBottom: spacing.lg },
  payToRow: { marginBottom: spacing.sm },
  payToLabel: { fontSize: 12, fontFamily: 'Cairo_500Medium', marginBottom: 2 },
  payToValue: { fontSize: fontSize.xl, fontFamily: 'Cairo_700Bold', letterSpacing: 1 },
  payHint: { fontSize: 12, fontFamily: 'Cairo_400Regular', marginTop: spacing.xs },

  noticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  noticeText: { flex: 1, fontSize: fontSize.sm, fontFamily: 'Cairo_400Regular' },

  proofPicker: {
    height: 180,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  proofPreview: { width: '100%', height: '100%' },
  proofEmpty: { alignItems: 'center', gap: spacing.sm },
  proofEmptyText: { fontSize: fontSize.sm, fontFamily: 'Cairo_500Medium' },
  changeProof: { alignSelf: 'center', paddingVertical: spacing.sm, marginBottom: spacing.sm },
  changeProofText: { fontSize: fontSize.sm, fontFamily: 'Cairo_600SemiBold' },

  messageInput: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.md,
    minHeight: 90,
    textAlignVertical: 'top',
    fontSize: fontSize.sm,
    fontFamily: 'Cairo_400Regular',
  },

  stickyBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.xl,
    borderTopWidth: 1,
  },
});
