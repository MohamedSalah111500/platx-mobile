import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeProvider';
import { useRTL } from '../../i18n/RTLProvider';
import { spacing } from '../../theme/spacing';
import { typography, fontSize, buttonLineHeight } from '../../theme/typography';
import type { ChatStackParamList } from '../../types/navigation.types';
import { ChatConversation } from '../../components/chat/ChatConversation';
import { BackButton } from '../../components/ui/BackButton';

type Props = NativeStackScreenProps<ChatStackParamList, 'ChatRoom'>;

export default function ChatRoomScreen({ navigation, route }: Props) {
  const { groupId, groupName, staffId, staffName, subGroupId, chatType, membersCount, studentId } = route.params;
  const { theme } = useTheme();
  const { t } = useRTL();
  const isStaffChat = chatType === 'staff' && !!staffId;
  const isSubGroupChat = chatType === 'subgroup' && !!subGroupId;
  const isStudentChat = chatType === 'student' && !!studentId;
  const isPersonChat = isStaffChat || isStudentChat;

  const headerTitle = isStaffChat ? staffName || groupName : groupName;
  const headerInitial = (headerTitle?.[0] || '?').toUpperCase();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.colors.divider }]}>
        <BackButton onPress={() => navigation.goBack()} />
        <View style={[styles.headerAvatar, { backgroundColor: theme.colors.primary }]}>
          {isPersonChat ? (
            <Text style={[styles.headerAvatarText, { color: theme.colors.onPrimary }]}>{headerInitial}</Text>
          ) : (
            <Ionicons
              name={isSubGroupChat ? 'git-branch-outline' : 'people'}
              size={18}
              color={theme.colors.onPrimary}
            />
          )}
        </View>
        <View style={styles.headerInfo}>
          <Text style={[styles.headerName, { color: theme.colors.text }]} numberOfLines={1}>
            {headerTitle}
          </Text>
          <Text style={[styles.headerSub, { color: theme.colors.textMuted }]}>
            {isStaffChat
              ? t('chat.staff')
              : isStudentChat
                ? t('chat.student')
                : isSubGroupChat
                  ? t('groups.subGroups')
                  : membersCount != null
                    ? t('home.membersCount', { count: membersCount })
                    : t('chat.groupChat')}
          </Text>
        </View>
      </View>

      <ChatConversation
        groupId={groupId}
        chatType={chatType}
        staffId={staffId}
        subGroupId={subGroupId}
        studentId={studentId}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    gap: spacing.sm,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAvatarText: {
    fontSize: 17,
    fontFamily: 'Cairo_700Bold',
    textAlign: 'left',
    lineHeight: buttonLineHeight(17),
    includeFontPadding: false,
  },
  headerInfo: { flex: 1, gap: 1 },
  headerName: { ...typography.body, fontFamily: 'Cairo_700Bold' },
  headerSub: { fontSize: fontSize.xs, textAlign: 'left' },
});
