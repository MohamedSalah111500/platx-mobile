export interface LiveSession {
  id: number;
  liveName?: string;
  title?: string;
  channelName: string;
  teacherId: number;
  teacherName?: string;
  groupId?: number;
  groupName?: string;
  isActive?: boolean;
  isLive?: boolean;
  isPaid?: boolean;
  price?: number | null;
  status?: number;
  canJoin?: boolean;
  startedAt?: string;
  endedAt?: string | null;
  createdAt?: string;
  participantCount?: number;
  participantsCount?: number;
  maxParticipants?: number;
  joinLink?: string;
  isEnded?: boolean;
}

export interface LiveParticipant {
  id: number;
  studentId: number;
  studentName: string;
  profileImage?: string;
  status: 'pending' | 'approved' | 'rejected';
  joinedAt?: string;
  isMuted?: boolean;
  isVideoOff?: boolean;
  isHandRaised?: boolean;
}

export interface LiveMessage {
  id?: number;
  senderId: number;
  senderName: string;
  message: string;
  timestamp: string;
}

export interface CreateLivePayload {
  liveName: string;
  groupId?: number;
  isPaid?: boolean;
  price?: number | null;
}

export interface JoinLivePayload {
  liveClassroomId: number;
  studentId: number;
}

export interface AgoraTokenResponse {
  token: string;
  channelName: string;
  uid: number;
  appId: string;
}
