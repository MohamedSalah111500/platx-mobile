import React from 'react';
import { View, Pressable, StyleSheet, Dimensions } from 'react-native';

const { width: SCREEN_W } = Dimensions.get('window');
const isTablet = SCREEN_W >= 768;
import { createBottomTabNavigator, type BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../theme/ThemeProvider';
import { useRTL } from '../i18n/RTLProvider';
import { spacing } from '../theme/spacing';
import type { MainTabParamList } from '../types/navigation.types';
import { TAB_BAR_HEIGHT, HIDE_TAB_BAR_SCREENS } from './tabBar';

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

function shouldHideTabBar(route: any): boolean {
  const routeName = getFocusedRouteNameFromRoute(route);
  return HIDE_TAB_BAR_SCREENS.includes(routeName as string);
}

function ModernTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const focusedRoute = state.routes[state.index];
  if (shouldHideTabBar(focusedRoute)) return null;

  const bottomPad = Math.max(insets.bottom, spacing.md);
  const barBg = theme.dark ? theme.colors.card : theme.colors.text;

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { paddingBottom: bottomPad }]}>
      <View style={[styles.bar, { backgroundColor: barBg, shadowOpacity: theme.dark ? 0.4 : 0.18 }]}>
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
              <View key={focused ? 'on' : 'off'} style={[styles.iconCircle, focused && styles.iconCircleActive]}>
                <Ionicons
                  name={(focused ? activeIcon : inactiveIcon) as any}
                  size={isTablet ? 26 : 24}
                  color={focused ? '#18181B' : 'rgba(255,255,255,0.7)'}
                />
              </View>
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


const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    start: 0,
    end: 0,
    bottom: 0,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: TAB_BAR_HEIGHT,
    borderRadius: TAB_BAR_HEIGHT / 2,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 10,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: TAB_BAR_HEIGHT - 16,
    height: TAB_BAR_HEIGHT - 16,
    borderRadius: (TAB_BAR_HEIGHT - 16) / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleActive: {
    backgroundColor: '#FFFFFF',
  },
});
