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
    </Stack.Navigator>
  );
}
