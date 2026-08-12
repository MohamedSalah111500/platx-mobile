import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '../../types/navigation.types';

import ProfileScreen from '../../screens/profile/ProfileScreen';
import SettingsScreen from '../../screens/profile/SettingsScreen';
import GroupsScreen from '../../screens/groups/GroupsListScreen';
import GroupDetailScreen from '../../screens/groups/GroupDetailScreen';
import LiveSessionsScreen from '../../screens/live/LiveSessionsListScreen';
import CreateLiveScreen from '../../screens/live/CreateLiveScreen';
import ChangePasswordScreen from '../../screens/profile/ChangePasswordScreen';
import HonorBoardScreen from '../../screens/profile/HonorBoardScreen';
import HomeworkStack from './HomeworkStack';
import ReportsListScreen from '../../screens/reports/ReportsListScreen';
import AttendanceDetailScreen from '../../screens/reports/AttendanceDetailScreen';
import ExamReportDetailScreen from '../../screens/reports/ExamReportDetailScreen';

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export default function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
      <Stack.Screen name="Groups" component={GroupsScreen} />
      <Stack.Screen name="GroupDetail" component={GroupDetailScreen} />
      <Stack.Screen name="LiveSessions" component={LiveSessionsScreen} />
      <Stack.Screen name="CreateLive" component={CreateLiveScreen} />
      <Stack.Screen name="HonorBoard" component={HonorBoardScreen} />
      <Stack.Screen name="Homework" component={HomeworkStack} />
      <Stack.Screen name="Reports" component={ReportsListScreen} />
      <Stack.Screen name="AttendanceDetail" component={AttendanceDetailScreen} />
      <Stack.Screen name="ExamReportDetail" component={ExamReportDetailScreen} />
    </Stack.Navigator>
  );
}
