import React from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { ContentWidthProvider, FRAME_MAX_WIDTH, type FrameKind } from '../utils/responsive';

const FORM_SCREENS = [
  'TenantSelection',
  'Register',
  'ForgotPassword',
  'OTPVerification',
  'ResetPassword',
  'ParentLink',
  'ParentSettings',
  'Settings',
  'ChangePassword',
  'DeleteAccount',
  'GroupForm',
  'CourseForm',
  'SectionForm',
  'LessonForm',
  'CourseSettings',
  'Checkout',
  'EnrollStudent',
  'SendNotification',
  'CreateNews',
  'CreateLive',
  'StudentForm',
  'StaffForm',
  'StaffPermissions',
  'StudentsBulkImport',
  'CreateExam',
];

const FULL_SCREENS = ['Login', 'LessonPlayer', 'LiveClassroom', 'Homework'];

function frameKind(routeName: string): FrameKind {
  if (FULL_SCREENS.includes(routeName)) return 'full';
  if (FORM_SCREENS.includes(routeName)) return 'form';
  return 'content';
}

function ScreenFrame({ kind, children }: { kind: FrameKind; children: React.ReactNode }) {
  const { width } = useWindowDimensions();
  if (kind === 'full') return <>{children}</>;
  const frameWidth = Math.min(width, FRAME_MAX_WIDTH[kind]);
  return (
    <View style={styles.outer}>
      <View style={[styles.inner, { width: frameWidth }]}>
        <ContentWidthProvider value={frameWidth}>{children}</ContentWidthProvider>
      </View>
    </View>
  );
}

export function frameScreenLayout({ route, children }: { route: { name: string }; children: React.ReactElement }) {
  return <ScreenFrame kind={frameKind(route.name)}>{children}</ScreenFrame>;
}

const styles = StyleSheet.create({
  outer: { flex: 1, alignItems: 'center' },
  inner: { flex: 1 },
});
