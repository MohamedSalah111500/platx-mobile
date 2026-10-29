import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { ChatStackParamList } from '../../types/navigation.types';

import ChatListScreen from '../../screens/chat/ChatListScreen';
import { useStackContentStyle } from '../tabBar';
import ChatRoomScreen from '../../screens/chat/ChatRoomScreen';

const Stack = createNativeStackNavigator<ChatStackParamList>();

export default function ChatStack() {
  const screenOptions = useStackContentStyle();
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="ChatList" component={ChatListScreen} />
      <Stack.Screen name="ChatRoom" component={ChatRoomScreen} />
    </Stack.Navigator>
  );
}
