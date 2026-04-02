import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { ExamsStackParamList } from '../../types/navigation.types';

import ExamsListScreen from '../../screens/exams/ExamsListScreen';
import ExamTakingScreen from '../../screens/exams/ExamTakingScreen';
import ExamResultScreen from '../../screens/exams/ExamResultScreen';

const Stack = createNativeStackNavigator<ExamsStackParamList>();

export default function ExamsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ExamsList" component={ExamsListScreen} />
      <Stack.Screen name="ExamTaking" component={ExamTakingScreen} />
      <Stack.Screen name="ExamResult" component={ExamResultScreen} />
    </Stack.Navigator>
  );
}
