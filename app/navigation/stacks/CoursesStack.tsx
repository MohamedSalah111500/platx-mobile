import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { CoursesStackParamList } from '../../types/navigation.types';

import CoursesListScreen from '../../screens/courses/CoursesListScreen';
import CourseDetailScreen from '../../screens/courses/CourseDetailScreen';
import LessonPlayerScreen from '../../screens/courses/LessonPlayerScreen';

const Stack = createNativeStackNavigator<CoursesStackParamList>();

export default function CoursesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CoursesList" component={CoursesListScreen} />
      <Stack.Screen name="CourseDetail" component={CourseDetailScreen} />
      <Stack.Screen name="LessonPlayer" component={LessonPlayerScreen} />
    </Stack.Navigator>
  );
}
