import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NotificationsStackParamList } from '../../types/navigation.types';

import NotificationsListScreen from '../../screens/notifications/NotificationsListScreen';

const Stack = createNativeStackNavigator<NotificationsStackParamList>();

export default function NotificationsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="NotificationsList" component={NotificationsListScreen} />
    </Stack.Navigator>
  );
}
