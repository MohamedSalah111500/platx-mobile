import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { ParentStackParamList } from '../types/navigation.types';

import ParentHomeScreen from '../screens/parent/ParentHomeScreen';
import ParentAttendanceScreen from '../screens/parent/ParentAttendanceScreen';
import ParentExamsScreen from '../screens/parent/ParentExamsScreen';
import ParentHomeworkScreen from '../screens/parent/ParentHomeworkScreen';
import ParentNotificationsScreen from '../screens/parent/ParentNotificationsScreen';
import ParentLinkScreen from '../screens/parent/ParentLinkScreen';

const Stack = createNativeStackNavigator<ParentStackParamList>();

export default function ParentNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="ParentHome" component={ParentHomeScreen} />
      <Stack.Screen name="ParentAttendance" component={ParentAttendanceScreen} />
      <Stack.Screen name="ParentExams" component={ParentExamsScreen} />
      <Stack.Screen name="ParentHomework" component={ParentHomeworkScreen} />
      <Stack.Screen name="ParentNotifications" component={ParentNotificationsScreen} />
      <Stack.Screen name="ParentLink" component={ParentLinkScreen} />
    </Stack.Navigator>
  );
}
