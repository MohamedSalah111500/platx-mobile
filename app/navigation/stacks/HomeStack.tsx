import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { frameScreenLayout } from '../screenFrame';
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
import GroupsScreen from '../../screens/groups/GroupsListScreen';
import GroupDetailScreen from '../../screens/groups/GroupDetailScreen';
import SubGroupDetailScreen from '../../screens/groups/SubGroupDetailScreen';
import GroupFormScreen from '../../screens/groups/GroupFormScreen';
import CourseFormScreen from '../../screens/courses/CourseFormScreen';
import CourseContentScreen from '../../screens/courses/CourseContentScreen';
import SectionFormScreen from '../../screens/courses/SectionFormScreen';
import LessonFormScreen from '../../screens/courses/LessonFormScreen';
import EnrollmentCodesScreen from '../../screens/courses/EnrollmentCodesScreen';
import LiveSessionsScreen from '../../screens/live/LiveSessionsListScreen';
import CreateLiveScreen from '../../screens/live/CreateLiveScreen';
import HonorBoardScreen from '../../screens/profile/HonorBoardScreen';
import ReportsListScreen from '../../screens/reports/ReportsListScreen';
import AccountingScreen from '../../screens/accounting/AccountingScreen';
import AttendanceDetailScreen from '../../screens/reports/AttendanceDetailScreen';
import ExamReportDetailScreen from '../../screens/reports/ExamReportDetailScreen';
import MyExamsScreen from '../../screens/exams/MyExamsScreen';
import ExamResultScreen from '../../screens/exams/ExamResultScreen';
import { useStackContentStyle } from '../tabBar';
import HomeworkStack from './HomeworkStack';

const Stack = createNativeStackNavigator<HomeStackParamList>();

export default function HomeStack() {
  const screenOptions = useStackContentStyle();
  return (
    <Stack.Navigator screenLayout={frameScreenLayout} screenOptions={screenOptions}>
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
      <Stack.Screen name="Groups" component={GroupsScreen} />
      <Stack.Screen name="GroupDetail" component={GroupDetailScreen} />
      <Stack.Screen name="SubGroupDetail" component={SubGroupDetailScreen} />
      <Stack.Screen name="GroupForm" component={GroupFormScreen} />
      <Stack.Screen name="CourseForm" component={CourseFormScreen} />
      <Stack.Screen name="CourseContent" component={CourseContentScreen} />
      <Stack.Screen name="SectionForm" component={SectionFormScreen} />
      <Stack.Screen name="LessonForm" component={LessonFormScreen} />
      <Stack.Screen name="EnrollmentCodes" component={EnrollmentCodesScreen} />
      <Stack.Screen name="LiveSessions" component={LiveSessionsScreen} />
      <Stack.Screen name="CreateLive" component={CreateLiveScreen} />
      <Stack.Screen name="HonorBoard" component={HonorBoardScreen} />
      <Stack.Screen name="Reports" component={ReportsListScreen} />
      <Stack.Screen name="Accounting" component={AccountingScreen} />
      <Stack.Screen name="AttendanceDetail" component={AttendanceDetailScreen} />
      <Stack.Screen name="ExamReportDetail" component={ExamReportDetailScreen} />
      <Stack.Screen name="MyExams" component={MyExamsScreen} />
      <Stack.Screen name="ExamResult" component={ExamResultScreen} />
    </Stack.Navigator>
  );
}
