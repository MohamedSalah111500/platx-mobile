import React, { useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeProvider';
import { useRTL } from '../../i18n/RTLProvider';
import { useAuth } from '../../hooks/useAuth';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { ErrorRetry } from '../../components/ui/ErrorRetry';
import { spacing } from '../../theme/spacing';
import { courseManageApi } from '../../services/api/courseManage.api';
import { REQUEST_ONLY } from '../../config/storePolicy';
import type { HomeStackParamList } from '../../types/navigation.types';

type Props = NativeStackScreenProps<HomeStackParamList, 'SectionForm'>;

const PRICE_MAX = 1_000_000;

export default function SectionFormScreen({ navigation, route }: Props) {
  const { courseId, sectionId } = route.params;
  const editing = !!sectionId;
  const { theme } = useTheme();
  const { t } = useRTL();
  const { canModule } = useAuth();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [loading, setLoading] = useState(editing);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [freePreview, setFreePreview] = useState(false);
  const [price, setPrice] = useState('');

  const load = async () => {
    if (!sectionId) return;
    setLoading(true);
    setLoadError(null);
    try {
      const sections = await courseManageApi.getSections(courseId);
      const section = sections.find((s) => s.id === sectionId);
      if (!section) throw new Error();
      setTitle(section.title);
      setDescription(section.description);
      setFreePreview(section.freePreview);
      setPrice(section.price ? String(section.price) : '');
    } catch (err: any) {
      setLoadError(err?.userMessage || t('courseManage.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [sectionId]);

  const priceValue = price.trim() ? Number(price.replace(',', '.')) : 0;
  const errors = {
    title: !title.trim() ? t('validation.required') : undefined,
    price: !Number.isFinite(priceValue) || priceValue < 0 || priceValue > PRICE_MAX ? t('courseManage.invalidAmount') : undefined,
  };
  const shown = (key: keyof typeof errors) => (submitted ? errors[key] : undefined);

  const save = async () => {
    setSubmitted(true);
    if (Object.values(errors).some(Boolean) || saving) return;
    setSaving(true);
    const values = { title, description, freePreview, price: priceValue };
    try {
      if (sectionId) await courseManageApi.updateSection(sectionId, values);
      else await courseManageApi.createSection(courseId, values);
      navigation.goBack();
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.userMessage || t('courseManage.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = () =>
    Alert.alert(t('courseManage.section.deleteTitle'), t('courseManage.section.deleteConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await courseManageApi.removeSection(sectionId!);
            navigation.goBack();
          } catch (err: any) {
            Alert.alert(t('common.error'), err?.userMessage || t('courseManage.deleteFailed'));
          }
        },
      },
    ]);

  const screenTitle = editing ? t('courseManage.section.edit') : t('courseManage.section.add');

  if (loading || loadError) {
    return (
      <View style={styles.container}>
        <ScreenHeader title={screenTitle} onBack={() => navigation.goBack()} />
        {loading ? <Spinner /> : <ErrorRetry message={loadError ?? ''} onRetry={load} />}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title={screenTitle} onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing['3xl'] }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Input label={t('courseManage.section.title')} value={title} onChangeText={setTitle} error={shown('title')} />
          <Input
            label={t('courseManage.section.description')}
            value={description}
            onChangeText={setDescription}
            multiline
          />
          {!REQUEST_ONLY ? (
            <Input
              label={t('courseManage.partPrice')}
              value={price}
              onChangeText={setPrice}
              keyboardType="decimal-pad"
              placeholder={t('courseManage.partPricePlaceholder')}
              hint={t('courseManage.section.priceHint')}
              error={shown('price')}
            />
          ) : null}
          <Button title={editing ? t('common.save') : t('courseManage.section.add')} onPress={save} loading={saving} fullWidth />
          {editing && canModule('OnlineCourses', 'delete') ? (
            <Button title={t('courseManage.section.delete')} variant="danger" onPress={confirmDelete} fullWidth style={styles.delete} />
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function createStyles(theme: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    content: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm },
    delete: { marginTop: spacing.md },
  });
}
