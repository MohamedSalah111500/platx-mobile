import type { User } from '../../types/auth.types';
import type { ChatMessage } from '../../types/chat.types';

/**
 * Whether a chat message was sent by the current user.
 * Backend MessageDto exposes senderStudentId / senderStaffId (numeric), never the
 * user GUID, so compare against the matching numeric profile id.
 */
export function isOwnMessage(
  message: Pick<ChatMessage, 'senderStudentId' | 'senderStaffId'>,
  user: User | null | undefined,
  isStudent: boolean,
): boolean {
  if (!user) return false;
  const studentId = message.senderStudentId;
  const staffId = message.senderStaffId;

  if (isStudent) {
    return user.studentId != null && studentId != null && Number(studentId) === Number(user.studentId);
  }

  if (user.staffId != null) {
    return staffId != null && Number(staffId) === Number(user.staffId);
  }
  // staffId not resolved yet: any staff-authored message is treated as ours.
  return staffId != null && studentId == null;
}
