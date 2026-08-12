// Internal = built-in Agora RTC room. External = a Zoom/Meet link students open.
export enum LiveClassroomType {
  Internal = 0,
  External = 1,
}

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
  // External (Zoom/Meet) live sessions
  liveType?: LiveClassroomType;
  externalLink?: string | null;
  scheduledAt?: string | null;
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
  liveType?: LiveClassroomType;
  externalLink?: string;
  scheduledAt?: string;
}

export interface JoinLivePayload {
  liveClassroomId: number;
  studentId: number;
  paymentTransactionId?: string;
  paymentTransactionImg?: { uri: string; name: string; type: string };
}

export interface AgoraTokenResponse {
  token: string;
  channelName: string;
  uid: number;
  appId: string;
}
