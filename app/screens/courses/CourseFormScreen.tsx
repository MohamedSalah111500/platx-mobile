import React, { useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
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
import { SelectField } from '../../components/ui/SelectField';
import { SwitchField } from '../../components/ui/SwitchField';
import { DateField } from '../../components/ui/DateField';
import { ImageUploadField } from '../../components/ui/ImageUploadField';
import { spacing } from '../../theme/spacing';
import { fontSize } from '../../theme/typography';
import { courseManageApi } from '../../services/api/courseManage.api';
import { CURRENCIES, DEFAULT_CURRENCY_CODE } from '../../utils/price';
import { htmlToText, textToHtml } from '../../utils/richText';
import { REQUEST_ONLY } from '../../config/storePolicy';
import { QUIZ_POLICY, QUIZ_POLICY_SCOPE, type CourseFormValues } from '../../types/course.types';
import type { HomeStackParamList } from '../../types/navigation.types';

type Props = NativeStackScreenProps<HomeStackParamList, 'CourseForm'>;

const LEARN_MAX = 1000;
const PRICE_MAX = 1_000_000;
const SCHEDULE_YEARS_AHEAD = 5;

const EMPTY: CourseFormValues = {
  name: '',
  shortDescription: '',
  description: '',
  whatYouWillLearn: '',
  language: 'Arabic',
  price: 0,
  discountPrice: 0,
  currencyCode: DEFAULT_CURRENCY_CODE,
  totalHours: 0,
  previewImageUrl: '',
  previewVideoUrl: '',
  showOnHomePage: false,
  category: '',
  subCategory: '',
  courseTags: '',
  isFree: false,
  hasCertificate: false,
  sellSectionsSeparately: false,
  sellLessonsSeparately: false,
  quizPolicy: QUIZ_POLICY.NotMandatory,
  quizPolicyScope: QUIZ_POLICY_SCOPE.EntireCourse,
  startDate: null,
  endDate: null,
};

const toNumber = (value: string) => {
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : NaN;
};

export default function CourseFormScreen({ navigation, route }: Props) {
  const courseId = route.params?.courseId;
  const editing = !!courseId;
  const { theme } = useTheme();
  const { t, locale } = useRTL();
  const { domain } = useAuth();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [loading, setLoading] = useState(editing);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState<CourseFormValues>(EMPTY);
  const [learnText, setLearnText] = useState('');
  const [learnDirty, setLearnDirty] = useState(false);
  const [hasSchedule, setHasSchedule] = useState(false);
  const [price, setPrice] = useState('0');
  const [discount, setDiscount] = useState('0');
  const [hours, setHours] = useState('0');

  const set = <K extends keyof CourseFormValues>(key: K, value: CourseFormValues[K]) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const load = async () => {
    if (!courseId) return;
    setLoading(true);
    setLoadError(null);
    try {
      const data = await courseManageApi.getCourseForm(courseId);
      setValues(data);
      setLearnText(htmlToText(data.whatYouWillLearn));
      setHasSchedule(!!(data.startDate || data.endDate));
      setPrice(String(data.price));
      setDiscount(String(data.discountPrice));
      setHours(String(data.totalHours));
    } catch (err: any) {
      setLoadError(err?.userMessage || t('courseManage.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (courseId) {
      load();
      return;
    }
    courseManageApi.getDefaultCurrency(domain).then((code) => {
      if (code) setValues((prev) => ({ ...prev, currencyCode: code }));
    });
  }, [courseId]);

  const learnHtml = learnDirty ? textToHtml(learnText) : values.whatYouWillLearn;
  const priceValue = toNumber(price);
  const discountValue = toNumber(discount);
  const hoursValue = toNumber(hours);

  const required = (value: string) => (!value.trim() ? t('validation.required') : undefined);
  const amountError = (value: number) =>
    !Number.isFinite(value) || value < 0 ? t('courseManage.invalidAmount') : value > PRICE_MAX ? t('courseManage.invalidAmount') : undefined;

  const errors = {
    name: required(values.name),
    whatYouWillLearn: !learnText.trim()
      ? t('validation.required')
      : learnHtml.length > LEARN_MAX
      ? t('courseManage.learnTooLong', { max: LEARN_MAX })
      : undefined,
    price: values.isFree ? undefined : amountError(priceValue),
    discountPrice: values.isFree ? undefined : amountError(discountValue),
    totalHours: !Number.isFinite(hoursValue) || hoursValue < 0 ? t('courseManage.invalidAmount') : undefined,
    endDate:
      hasSchedule && values.startDate && values.endDate && values.endDate < values.startDate
        ? t('courseManage.endBeforeStart')
        : undefined,
  };
  const shown = (key: keyof typeof errors) => (submitted ? errors[key] : undefined);

  const languageOptions = useMemo(
    () => [
      { value: 'Arabic', label: t('courseManage.arabic') },
      { value: 'English', label: t('courseManage.english') },
    ],
    [t]
  );
  const currencyOptions = useMemo(
    () => CURRENCIES.map((c) => ({ value: c.code, label: `${c.code} · ${locale === 'ar' ? c.symbol : c.symbolEn}` })),
    [locale]
  );
  const quizOptions = useMemo(
    () => [
      { value: String(QUIZ_POLICY.NotMandatory), label: t('courseManage.quiz.notMandatory') },
      { value: String(QUIZ_POLICY.SolveOnly), label: t('courseManage.quiz.solveOnly') },
      { value: String(QUIZ_POLICY.SolveAndPass), label: t('courseManage.quiz.solveAndPass') },
    ],
    [t]
  );
  const scopeOptions = useMemo(
    () => [
      { value: String(QUIZ_POLICY_SCOPE.EntireCourse), label: t('courseManage.quiz.scopeCourse') },
      { value: String(QUIZ_POLICY_SCOPE.CurrentSection), label: t('courseManage.quiz.scopeSection') },
    ],
    [t]
  );

  const save = async () => {
    setSubmitted(true);
    if (Object.values(errors).some(Boolean) || saving) return;
    setSaving(true);
    const payload: CourseFormValues = {
      ...values,
      name: values.name.trim(),
      shortDescription: values.shortDescription.trim(),
      description: values.description.trim(),
      whatYouWillLearn: learnHtml,
      price: values.isFree ? 0 : priceValue,
      discountPrice: values.isFree ? 0 : discountValue,
      totalHours: hoursValue,
      startDate: hasSchedule ? values.startDate : null,
      endDate: hasSchedule ? values.endDate : null,
    };
    try {
      if (courseId) {
        await courseManageApi.update(courseId, payload);
        Alert.alert(t('common.success'), t('courseManage.updated'));
        navigation.goBack();
      } else {
        const newId = await courseManageApi.create(payload);
        Alert.alert(t('common.success'), t('courseManage.created'));
        if (newId) navigation.replace('CourseContent', { courseId: newId, courseName: payload.name });
        else navigation.goBack();
      }
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.userMessage || t('courseManage.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const title = editing ? t('courseManage.editCourse') : t('courseManage.addCourse');

  if (loading || loadError) {
    return (
      <View style={styles.container}>
        <ScreenHeader title={title} onBack={() => navigation.goBack()} />
        {loading ? <Spinner /> : <ErrorRetry message={loadError ?? ''} onRetry={load} />}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title={title} onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing['3xl'] }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.section}>{t('courseManage.sections.general')}</Text>
          <Input label={t('courseManage.fields.name')} value={values.name} onChangeText={(v) => set('name', v)} error={shown('name')} />
          <Input
            label={t('courseManage.fields.shortDescription')}
            value={values.shortDescription}
            onChangeText={(v) => set('shortDescription', v)}
          />
          <SelectField
            label={t('courseManage.fields.language')}
            placeholder={t('courseManage.fields.language')}
            value={values.language}
            options={languageOptions}
            onChange={(v) => set('language', v)}
          />
          <Input
            label={t('courseManage.fields.description')}
            value={values.description}
            onChangeText={(v) => set('description', v)}
            multiline
          />
          <Input
            label={t('courseManage.fields.whatYouWillLearn')}
            value={learnText}
            onChangeText={(v) => {
              setLearnText(v);
              setLearnDirty(true);
            }}
            multiline
            hint={t('courseManage.learnHint', { count: learnHtml.length, max: LEARN_MAX })}
            error={shown('whatYouWillLearn')}
          />
          <ImageUploadField label={t('courseManage.fields.cover')} value={values.previewImageUrl} onChange={(v) => set('previewImageUrl', v)} />
          <SwitchField label={t('courseManage.fields.showOnHome')} value={values.showOnHomePage} onChange={(v) => set('showOnHomePage', v)} />

          <Text style={styles.section}>{t('courseManage.sections.settings')}</Text>
          <SwitchField
            label={t('courseManage.fields.certificate')}
            hint={t('courseManage.hints.certificate')}
            value={values.hasCertificate}
            onChange={(v) => set('hasCertificate', v)}
          />
          <SwitchField
            label={t('courseManage.fields.hasSchedule')}
            hint={t('courseManage.hints.schedule')}
            value={hasSchedule}
            onChange={(v) => {
              setHasSchedule(v);
              if (!v) setValues((prev) => ({ ...prev, startDate: null, endDate: null }));
            }}
          />
          {hasSchedule ? (
            <>
              <DateField
                label={t('courseManage.fields.startDate')}
                value={values.startDate}
                onChange={(v) => set('startDate', v)}
                yearsAhead={SCHEDULE_YEARS_AHEAD}
                earliestYear={new Date().getFullYear() - 1}
                clearable
              />
              <DateField
                label={t('courseManage.fields.endDate')}
                value={values.endDate}
                onChange={(v) => set('endDate', v)}
                yearsAhead={SCHEDULE_YEARS_AHEAD}
                earliestYear={new Date().getFullYear() - 1}
                clearable
                error={shown('endDate')}
              />
              <Text style={styles.note}>{t('courseManage.hints.dates')}</Text>
            </>
          ) : null}
          <SelectField
            label={t('courseManage.quiz.label')}
            placeholder={t('courseManage.quiz.label')}
            value={String(values.quizPolicy)}
            options={quizOptions}
            onChange={(v) => set('quizPolicy', Number(v))}
          />
          {values.quizPolicy !== QUIZ_POLICY.NotMandatory ? (
            <SelectField
              label={t('courseManage.quiz.scopeLabel')}
              placeholder={t('courseManage.quiz.scopeLabel')}
              value={String(values.quizPolicyScope)}
              options={scopeOptions}
              onChange={(v) => set('quizPolicyScope', Number(v))}
            />
          ) : null}

          {!REQUEST_ONLY ? (
            <>
              <Text style={styles.section}>{t('courseManage.sections.pricing')}</Text>
              <SwitchField
                label={t('courseManage.fields.free')}
                hint={t('courseManage.hints.free')}
                value={values.isFree}
                onChange={(v) => set('isFree', v)}
              />
              {!values.isFree ? (
                <>
                  <Input
                    label={t('courseManage.fields.price')}
                    value={price}
                    onChangeText={setPrice}
                    keyboardType="decimal-pad"
                    error={shown('price')}
                  />
                  <Input
                    label={t('courseManage.fields.discountPrice')}
                    value={discount}
                    onChangeText={setDiscount}
                    keyboardType="decimal-pad"
                    error={shown('discountPrice')}
                  />
                  <SelectField
                    label={t('courseManage.fields.currency')}
                    placeholder={t('courseManage.fields.currency')}
                    value={values.currencyCode}
                    options={currencyOptions}
                    onChange={(v) => set('currencyCode', v)}
                  />
                  <SwitchField
                    label={t('courseManage.fields.sellSections')}
                    hint={t('courseManage.hints.sellSections')}
                    value={values.sellSectionsSeparately}
                    onChange={(v) => set('sellSectionsSeparately', v)}
                  />
                  <SwitchField
                    label={t('courseManage.fields.sellLessons')}
                    hint={t('courseManage.hints.sellLessons')}
                    value={values.sellLessonsSeparately}
                    onChange={(v) => set('sellLessonsSeparately', v)}
                  />
                </>
              ) : null}
            </>
          ) : null}

          <Text style={styles.section}>{t('courseManage.sections.additional')}</Text>
          <Input
            label={t('courseManage.fields.totalHours')}
            value={hours}
            onChangeText={setHours}
            keyboardType="number-pad"
            error={shown('totalHours')}
          />
          <Input label={t('courseManage.fields.category')} value={values.category} onChangeText={(v) => set('category', v)} />
          <Input label={t('courseManage.fields.subCategory')} value={values.subCategory} onChangeText={(v) => set('subCategory', v)} />
          <Input label={t('courseManage.fields.tags')} value={values.courseTags} onChangeText={(v) => set('courseTags', v)} />

          {submitted && Object.values(errors).some(Boolean) ? (
            <Text style={[styles.note, { color: theme.colors.danger }]}>{t('courseManage.fixErrors')}</Text>
          ) : null}
          <Button title={editing ? t('common.save') : t('courseManage.addCourse')} onPress={save} loading={saving} fullWidth />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function createStyles(theme: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    content: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm },
    section: {
      fontSize: fontSize.base,
      fontFamily: 'Cairo_700Bold',
      color: theme.colors.text,
      textAlign: 'left',
      marginTop: spacing.md,
      marginBottom: spacing.md,
    },
    note: {
      fontSize: fontSize.sm,
      fontFamily: 'Cairo_400Regular',
      color: theme.colors.textMuted,
      textAlign: 'left',
      marginBottom: spacing.lg,
    },
  });
}
