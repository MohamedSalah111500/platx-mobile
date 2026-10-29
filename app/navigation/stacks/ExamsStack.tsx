import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { ExamsStackParamList } from '../../types/navigation.types';

import ExamsListScreen from '../../screens/exams/ExamsListScreen';
import ExamTakingScreen from '../../screens/exams/ExamTakingScreen';
import CreateExamScreen from '../../screens/exams/CreateExamScreen';
import ExamResultScreen from '../../screens/exams/ExamResultScreen';
import { useStackContentStyle } from '../tabBar';
import MyExamsScreen from '../../screens/exams/MyExamsScreen';

const Stack = createNativeStackNavigator<ExamsStackParamList>();

export default function ExamsStack() {
  const screenOptions = useStackContentStyle();
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="ExamsList" component={ExamsListScreen} />
      <Stack.Screen name="CreateExam" component={CreateExamScreen} />
      <Stack.Screen name="ExamTaking" component={ExamTakingScreen} />
      <Stack.Screen name="ExamResult" component={ExamResultScreen} />
      <Stack.Screen name="MyExams" component={MyExamsScreen} />
    </Stack.Navigator>
  );
}
