import React from 'react';
import { View, Text, Pressable, Platform, StyleSheet, Dimensions } from 'react-native';

const { width: SCREEN_W } = Dimensions.get('window');
const isTablet = SCREEN_W >= 768;
import { createBottomTabNavigator, type BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../theme/ThemeProvider';
import { useRTL } from '../i18n/RTLProvider';
import { useSound } from '../hooks/useSound';
import { spacing, borderRadius } from '../theme/spacing';
import type { MainTabParamList } from '../types/navigation.types';

// Import stacks
import HomeStack from './stacks/HomeStack';
import ChatStack from './stacks/ChatStack';
import ExamsStack from './stacks/ExamsStack';
import ProfileStack from './stacks/ProfileStack';

const Tab = createBottomTabNavigator<MainTabParamList>();

const TAB_ICONS: Record<string, [string, string]> = {
  HomeTab: ['home', 'home-outline'],
  ExamsTab: ['clipboard', 'clipboard-outline'],
  ChatTab: ['chatbubbles', 'chatbubbles-outline'],
  ProfileTab: ['person', 'person-outline'],
};

// Screens where the tab bar should be hidden
const HIDE_TAB_BAR_SCREENS = [
  'ChatRoom',
  'LessonPlayer',
  'LiveClassroom',
  'GroupDetail',
  'SubGroupDetail',
  'NewsDetail',
  'EventDetail',
  'NotificationDetail',
  'HonorBoard',
  'ExamTaking',
  'ExamResult',
  'Homework',
  'CreateLive',
  'CourseDetail',
  'NotificationsList',
  'Reports',
  'AttendanceDetail',
  'ExamReportDetail',
];

function shouldHideTabBar(route: any): boolean {
  const routeName = getFocusedRouteNameFromRoute(route);
  return HIDE_TAB_BAR_SCREENS.includes(routeName as string);
}

// Height of the bar itself (safe-area inset is added on top).
const TAB_BAR_HEIGHT = isTablet ? 76 : 68;

/**
 * Custom bottom bar: a rounded surface docked to the bottom edge, no top rule,
 * neutral (non-brand) active state — icon sits in a soft pill and the label
 * switches to the primary text colour. Colours come from the theme tokens so
 * it follows light/dark and tenant themes without any hard-coded purple.
 */
function ModernTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { play } = useSound();

  const focusedRoute = state.routes[state.index];
  if (shouldHideTabBar(focusedRoute)) return null;

  const bottomPad = Math.max(insets.bottom, Platform.OS === 'ios' ? 20 : spacing.sm);
  const pillBg = theme.dark ? 'rgba(255,255,255,0.10)' : 'rgba(17,24,39,0.06)';

  return (
    <View style={{ backgroundColor: theme.colors.background }}>
      <View
        style={[
          styles.bar,
          {
            backgroundColor: theme.colors.card,
            height: TAB_BAR_HEIGHT + bottomPad,
            paddingBottom: bottomPad,
            shadowOpacity: theme.dark ? 0.35 : 0.08,
          },
        ]}
      >
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label =
            typeof options.tabBarLabel === 'string'
              ? options.tabBarLabel
              : options.title ?? route.name;
          const focused = state.index === index;
          const [activeIcon, inactiveIcon] = TAB_ICONS[route.name] ?? ['ellipse', 'ellipse-outline'];

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) {
              play('tap');
              navigation.navigate(route.name, route.params);
            }
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
              testID={options.tabBarButtonTestID}
              onPress={onPress}
              onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
              style={({ pressed }) => [styles.item, pressed && { opacity: 0.7 }]}
              hitSlop={6}
            >
              {/* key remounts the pill on focus change: Android (Fabric) keeps
                  square corners when a background is added to a mounted view. */}
              <View
                key={focused ? 'pill-on' : 'pill-off'}
                style={[styles.iconPill, focused && { backgroundColor: pillBg }]}
              >
                <Ionicons
                  name={(focused ? activeIcon : inactiveIcon) as any}
                  size={isTablet ? 24 : 22}
                  color={focused ? theme.colors.text : theme.colors.textMuted}
                />
              </View>
              <Text
                numberOfLines={1}
                style={[
                  styles.label,
                  { color: focused ? theme.colors.text : theme.colors.textMuted },
                  focused && styles.labelActive,
                ]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function MainTabNavigator() {
  const { t } = useRTL();

  return (
    <Tab.Navigator
      tabBar={(props) => <ModernTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
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
        name="ProfileTab"
        component={ProfileStack}
        options={{ tabBarLabel: t('tabs.profile') }}
      />
    </Tab.Navigator>
  );
}

export { TAB_BAR_HEIGHT };

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowRadius: 12,
    elevation: 12,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: spacing.xs,
  },
  iconPill: {
    width: isTablet ? 60 : 52,
    height: isTablet ? 36 : 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: isTablet ? 18 : 16,
  },
  label: {
    fontSize: isTablet ? 12 : 11,
    fontFamily: 'Cairo_600SemiBold',
    lineHeight: isTablet ? 17 : 16,
  },
  labelActive: {
    fontFamily: 'Cairo_700Bold',
  },
});
