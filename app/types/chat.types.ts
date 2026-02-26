export interface ChatMessage {
  id: number;
  content: string;
  senderId: number;
  senderName: string;
  senderImage?: string;
  groupId: number;
  createdAt: string;
  isRead?: boolean;
  attachmentUrl?: string;
  attachmentType?: string;
  // Fields from the staff/student message response format
  senderStudentId?: number;
  senderStudent?: { id?: number; firstName?: string; lastName?: string; profileImage?: string | null; groupId?: number };
  senderStaffId?: number;
  senderStaff?: { id?: number; firstName?: string; lastName?: string; profileImage?: string | null; staffId?: number };
  sentAt?: string;
  isSendToGroup?: boolean;
}

export interface ChatConversation {
  groupId: number;
  groupName: string;
  lastMessage?: string;
  lastMessageDate?: string;
  unreadCount: number;
  participants?: ChatParticipant[];
}

export interface ChatParticipant {
  id: number;
  name: string;
  profileImage?: string;
  isOnline?: boolean;
}

export interface SendMessagePayload {
  content: string;
  groupId: number;
  studentId?: number;
  attachmentUrl?: string;
}

// Staff contact returned by GetStaffHasMessages
export interface StaffChatContact {
  id: number;
  firstName: string;
  lastName: string;
  profileImage?: string | null;
  groupId: number;
  staffId?: number;
}

export interface SendMessageToStaffPayload {
  staffId: number;
  groupId: number;
  content: string;
}
