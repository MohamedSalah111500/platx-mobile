import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { HomeworkStackParamList } from '../../types/navigation.types';

import HomeworkListScreen from '../../screens/homework/HomeworkListScreen';
import HomeworkDetailScreen from '../../screens/homework/HomeworkDetailScreen';
import HomeworkSubmissionsScreen from '../../screens/homework/HomeworkSubmissionsScreen';
import HomeworkReviewScreen from '../../screens/homework/HomeworkReviewScreen';

const Stack = createNativeStackNavigator<HomeworkStackParamList>();

export default function HomeworkStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeworkList" component={HomeworkListScreen} />
      <Stack.Screen name="HomeworkDetail" component={HomeworkDetailScreen} />
      <Stack.Screen name="HomeworkSubmissions" component={HomeworkSubmissionsScreen} />
      <Stack.Screen name="HomeworkReview" component={HomeworkReviewScreen} />
    </Stack.Navigator>
  );
}
