import WalletScreen from '../../screens/wallet/WalletScreen';
import MySessionsScreen from '../../screens/sessions/MySessionsScreen';
import SessionsListScreen from '../../screens/sessions/SessionsListScreen';
import SessionAttendanceScreen from '../../screens/sessions/SessionAttendanceScreen';
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { frameScreenLayout } from '../screenFrame';
import type { ProfileStackParamList } from '../../types/navigation.types';

import ProfileScreen from '../../screens/profile/ProfileScreen';
import SettingsScreen from '../../screens/profile/SettingsScreen';
import GroupsScreen from '../../screens/groups/GroupsListScreen';
import GroupDetailScreen from '../../screens/groups/GroupDetailScreen';
import SubGroupDetailScreen from '../../screens/groups/SubGroupDetailScreen';
import GroupFormScreen from '../../screens/groups/GroupFormScreen';
import LiveSessionsScreen from '../../screens/live/LiveSessionsListScreen';
import CreateLiveScreen from '../../screens/live/CreateLiveScreen';
import ChangePasswordScreen from '../../screens/profile/ChangePasswordScreen';
import DeleteAccountScreen from '../../screens/profile/DeleteAccountScreen';
import HonorBoardScreen from '../../screens/profile/HonorBoardScreen';
import HomeworkStack from './HomeworkStack';
import ReportsListScreen from '../../screens/reports/ReportsListScreen';
import AccountingScreen from '../../screens/accounting/AccountingScreen';
import AttendanceDetailScreen from '../../screens/reports/AttendanceDetailScreen';
import { useStackContentStyle } from '../tabBar';
import ExamReportDetailScreen from '../../screens/reports/ExamReportDetailScreen';
import ExamResultScreen from '../../screens/exams/ExamResultScreen';
import StudentsListScreen from '../../screens/people/StudentsListScreen';
import StudentFormScreen from '../../screens/people/StudentFormScreen';
import StudentDetailScreen from '../../screens/people/StudentDetailScreen';
import StudentDevicesScreen from '../../screens/people/StudentDevicesScreen';
import StudentsBulkImportScreen from '../../screens/people/StudentsBulkImportScreen';
import StaffListScreen from '../../screens/people/StaffListScreen';
import StaffFormScreen from '../../screens/people/StaffFormScreen';
import StaffDetailScreen from '../../screens/people/StaffDetailScreen';
import StaffPermissionsScreen from '../../screens/people/StaffPermissionsScreen';

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export default function ProfileStack() {
  const screenOptions = useStackContentStyle();
  return (
    <Stack.Navigator screenLayout={frameScreenLayout} screenOptions={screenOptions}>
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
      <Stack.Screen name="DeleteAccount" component={DeleteAccountScreen} />
      <Stack.Screen name="Groups" component={GroupsScreen} />
      <Stack.Screen name="GroupDetail" component={GroupDetailScreen} />
      <Stack.Screen name="SubGroupDetail" component={SubGroupDetailScreen} />
      <Stack.Screen name="GroupForm" component={GroupFormScreen} />
      <Stack.Screen name="LiveSessions" component={LiveSessionsScreen} />
      <Stack.Screen name="CreateLive" component={CreateLiveScreen} />
      <Stack.Screen name="HonorBoard" component={HonorBoardScreen} />
      <Stack.Screen name="Homework" component={HomeworkStack} />
      <Stack.Screen name="Reports" component={ReportsListScreen} />
      <Stack.Screen name="Accounting" component={AccountingScreen} />
      <Stack.Screen name="Wallet" component={WalletScreen} />
      <Stack.Screen name="MySessions" component={MySessionsScreen} />
      <Stack.Screen name="Sessions" component={SessionsListScreen} />
      <Stack.Screen name="SessionAttendance" component={SessionAttendanceScreen} />
      <Stack.Screen name="AttendanceDetail" component={AttendanceDetailScreen} />
      <Stack.Screen name="ExamReportDetail" component={ExamReportDetailScreen} />
      <Stack.Screen name="Students" component={StudentsListScreen} />
      <Stack.Screen name="StudentForm" component={StudentFormScreen} />
      <Stack.Screen name="StudentDetail" component={StudentDetailScreen} />
      <Stack.Screen name="StudentDevices" component={StudentDevicesScreen} />
      <Stack.Screen name="StudentsBulkImport" component={StudentsBulkImportScreen} />
      <Stack.Screen name="StaffList" component={StaffListScreen} />
      <Stack.Screen name="StaffForm" component={StaffFormScreen} />
      <Stack.Screen name="StaffDetail" component={StaffDetailScreen} />
      <Stack.Screen name="StaffPermissions" component={StaffPermissionsScreen} />
      <Stack.Screen name="ExamResult" component={ExamResultScreen} />
    </Stack.Navigator>
  );
}
