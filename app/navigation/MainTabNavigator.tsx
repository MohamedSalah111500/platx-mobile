import React from 'react';
import { View, Platform, StyleSheet, Dimensions } from 'react-native';

const { width: SCREEN_W } = Dimensions.get('window');
const isTablet = SCREEN_W >= 768;
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../theme/ThemeProvider';
import { useAuth } from '../hooks/useAuth';
import { useRTL } from '../i18n/RTLProvider';
import type { MainTabParamList } from '../types/navigation.types';

// Import stacks
import HomeStack from './stacks/HomeStack';
import ChatStack from './stacks/ChatStack';
import NotificationsStack from './stacks/NotificationsStack';
import ExamsStack from './stacks/ExamsStack';
import ProfileStack from './stacks/ProfileStack';

const Tab = createBottomTabNavigator<MainTabParamList>();

const TAB_ICONS: Record<string, [string, string]> = {
  HomeTab: ['home', 'home-outline'],
  ExamsTab: ['clipboard', 'clipboard-outline'],
  ChatTab: ['chatbubbles', 'chatbubbles-outline'],
  NotificationsTab: ['notifications', 'notifications-outline'],
  ProfileTab: ['person', 'person-outline'],
};

// Screens where the tab bar should be hidden
const HIDE_TAB_BAR_SCREENS = [
  'ChatRoom',
  'LessonPlayer',
  'LiveClassroom',
  'GroupDetail',
  'NewsDetail',
  'EventDetail',
  'NotificationDetail',
  'HonorBoard',
  'ExamTaking',
  'ExamResult',
  'CreateLive',
  'CourseDetail',
];

function shouldHideTabBar(route: any): boolean {
  const routeName = getFocusedRouteNameFromRoute(route);
  return HIDE_TAB_BAR_SCREENS.includes(routeName as string);
}

const TAB_BAR_HEIGHT = isTablet
  ? 80
  : Platform.OS === 'ios' ? 85 : 65;

export default function MainTabNavigator() {
  const { theme } = useTheme();
  const { can } = useAuth();
  const { t } = useRTL();
  const insets = useSafeAreaInsets();

  const bottomInset = Platform.OS === 'ios' ? 26 : Math.max(insets.bottom, 8);

  const baseTabBarStyle = {
    backgroundColor: theme.colors.tabBarBackground,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
    height: TAB_BAR_HEIGHT + (Platform.OS === 'android' ? insets.bottom : 0),
    paddingBottom: bottomInset,
    paddingTop: 8,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    position: 'absolute' as const,
  };

  const hiddenTabBarStyle = {
    ...baseTabBarStyle,
    display: 'none' as const,
  };

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color }) => {
          const [filled, outlined] = TAB_ICONS[route.name] || ['ellipse', 'ellipse-outline'];
          const iconName = focused ? filled : outlined;
          return (
            <View style={styles.iconContainer}>
              <Ionicons name={iconName as any} size={isTablet ? 26 : 22} color={color} />
              {focused && <View style={[styles.activeDot, { backgroundColor: theme.colors.primary }]} />}
            </View>
          );
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.tabBarInactive,
        tabBarStyle: shouldHideTabBar(route) ? hiddenTabBarStyle : baseTabBarStyle,
        tabBarLabelStyle: {
          fontSize: isTablet ? 13 : 11,
          fontFamily: 'Cairo_600SemiBold',
          marginTop: 2,
        },
        tabBarItemStyle: {
          paddingTop: 4,
        },
      })}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStack}
        options={{ tabBarLabel: t('tabs.home') }}
      />
      <Tab.Screen
        name="ExamsTab"
        component={ExamsStack}
        options={{ tabBarLabel: t('tabs.exams') }}
      />
      <Tab.Screen
        name="ChatTab"
        component={ChatStack}
        options={{ tabBarLabel: t('tabs.chat') }}
      />
      <Tab.Screen
        name="NotificationsTab"
        component={NotificationsStack}
        options={{ tabBarLabel: t('tabs.alerts') }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStack}
        options={{ tabBarLabel: t('tabs.profile') }}
      />
    </Tab.Navigator>
  );
}

export { TAB_BAR_HEIGHT };

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 3,
  },
});
