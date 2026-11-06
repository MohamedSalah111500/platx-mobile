import React, { useCallback } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ParentStackParamList } from '../../types/navigation.types';
import { useRTL } from '../../i18n/RTLProvider';
import { guardianApi } from '../../services/api/guardian.api';
import { ExamResultView } from '../../components/exams/ExamResultView';

type Props = NativeStackScreenProps<ParentStackParamList, 'ParentExamDetail'>;

export default function ParentExamDetailScreen({ navigation, route }: Props) {
  const { studentId, examId } = route.params;
  const { t } = useRTL();
  const load = useCallback(() => guardianApi.examResult(studentId, examId), [studentId, examId]);

  return (
    <ExamResultView
      title={t('parent.examDetails')}
      load={load}
      onBack={() => navigation.goBack()}
      answerLabel={t('parent.childAnswer')}
    />
  );
}
