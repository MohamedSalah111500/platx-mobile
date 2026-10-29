import { useCallback } from 'react';
import { Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing } from '../theme/spacing';

export const TAB_BAR_HEIGHT = Dimensions.get('window').width >= 768 ? 76 : 68;

export const HIDE_TAB_BAR_SCREENS = [
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
  'MyExams',
  'Homework',
  'CreateLive',
  'CourseDetail',
  'NotificationsList',
  'Reports',
  'AttendanceDetail',
  'MySessions',
  'Sessions',
  'SessionAttendance',
  'ExamReportDetail',
  'Checkout',
  'EnrollStudent',
  'LessonQuiz',
];

const TAB_ROOT_SCREENS = ['Home', 'ExamsList', 'ChatList', 'Profile'];

export function useTabBarSpace(): number {
  const insets = useSafeAreaInsets();
  return TAB_BAR_HEIGHT + Math.max(insets.bottom, spacing.md) + spacing.sm + spacing.lg;
}

export function useStackContentStyle() {
  const space = useTabBarSpace();
  return useCallback(
    ({ route }: { route: { name: string } }) => ({
      headerShown: false,
      contentStyle: {
        paddingBottom:
          TAB_ROOT_SCREENS.includes(route.name) || HIDE_TAB_BAR_SCREENS.includes(route.name) ? 0 : space,
      },
    }),
    [space],
  );
}
