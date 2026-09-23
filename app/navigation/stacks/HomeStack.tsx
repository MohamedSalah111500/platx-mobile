import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../../types/navigation.types';

import HomeScreen from '../../screens/home/HomeScreen';
import NewsDetailScreen from '../../screens/news/NewsDetailScreen';
import EventDetailScreen from '../../screens/events/EventDetailScreen';
import CoursesListScreen from '../../screens/courses/CoursesListScreen';
import CourseDetailScreen from '../../screens/courses/CourseDetailScreen';
import CheckoutScreen from '../../screens/courses/CheckoutScreen';
import EnrollStudentScreen from '../../screens/courses/EnrollStudentScreen';
import LessonPlayerScreen from '../../screens/courses/LessonPlayerScreen';
import CourseSettingsScreen from '../../screens/courses/CourseSettingsScreen';
import CourseStudentsScreen from '../../screens/courses/CourseStudentsScreen';
import EnrollmentRequestsScreen from '../../screens/courses/EnrollmentRequestsScreen';
import SendNotificationScreen from '../../screens/notifications/SendNotificationScreen';
import CreateNewsScreen from '../../screens/news/CreateNewsScreen';
import NotificationsListScreen from '../../screens/notifications/NotificationsListScreen';
import HomeworkStack from './HomeworkStack';

const Stack = createNativeStackNavigator<HomeStackParamList>();

export default function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="NewsDetail" component={NewsDetailScreen} />
      <Stack.Screen name="EventDetail" component={EventDetailScreen} />
      <Stack.Screen name="CoursesList" component={CoursesListScreen} />
      <Stack.Screen name="CourseDetail" component={CourseDetailScreen} />
      <Stack.Screen name="Checkout" component={CheckoutScreen} />
      <Stack.Screen name="EnrollStudent" component={EnrollStudentScreen} />
      <Stack.Screen name="LessonPlayer" component={LessonPlayerScreen} />
      <Stack.Screen name="NotificationsList" component={NotificationsListScreen} />
      <Stack.Screen name="CourseSettings" component={CourseSettingsScreen} />
      <Stack.Screen name="CourseStudents" component={CourseStudentsScreen} />
      <Stack.Screen name="EnrollmentRequests" component={EnrollmentRequestsScreen} />
      <Stack.Screen name="SendNotification" component={SendNotificationScreen} />
      <Stack.Screen name="CreateNews" component={CreateNewsScreen} />
      <Stack.Screen name="Homework" component={HomeworkStack} />
    </Stack.Navigator>
  );
}
