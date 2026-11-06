import React, { useCallback } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useRTL } from '../../i18n/RTLProvider';
import { useAuth } from '../../hooks/useAuth';
import { examApi } from '../../services/api/exam.api';
import { ExamResultView } from '../../components/exams/ExamResultView';
import type { ExamsStackParamList } from '../../types/navigation.types';

type Props = NativeStackScreenProps<ExamsStackParamList, 'ExamResult'>;

export default function ExamResultScreen({ navigation, route }: Props) {
  const { examId } = route.params;
  const { t } = useRTL();
  const { user } = useAuth();
  const studentId = route.params.studentId ?? user?.studentId;
  const load = useCallback(() => examApi.getResults(examId, studentId as number), [examId, studentId]);

  return (
    <ExamResultView
      title={t('exams.results')}
      load={studentId ? load : null}
      onBack={() => navigation.goBack()}
      answerLabel={t('exams.yourAnswer')}
    />
  );
}
