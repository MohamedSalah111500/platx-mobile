// Internal = built-in Agora RTC room. External = a Zoom/Meet link students open.
export enum LiveClassroomType {
  Internal = 0,
  External = 1,
}

export enum LiveMediaProvider {
  Agora = 0,
  CloudflareRealtime = 1,
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
  mediaProvider?: LiveMediaProvider;
  externalLink?: string | null;
  scheduledAt?: string | null;
}

export const PARTICIPANT_STATUS = {
  Pending: 'pending',
  Approved: 'approved',
  Rejected: 'rejected',
  Left: 'left',
} as const;
export type ParticipantStatusName = (typeof PARTICIPANT_STATUS)[keyof typeof PARTICIPANT_STATUS];

const PARTICIPANT_STATUS_BY_CODE: Record<number, ParticipantStatusName> = {
  0: PARTICIPANT_STATUS.Pending,
  1: PARTICIPANT_STATUS.Approved,
  2: PARTICIPANT_STATUS.Rejected,
  3: PARTICIPANT_STATUS.Left,
};

export function participantStatusOf(status: unknown): ParticipantStatusName {
  if (typeof status === 'number') return PARTICIPANT_STATUS_BY_CODE[status] ?? PARTICIPANT_STATUS.Approved;
  if (typeof status === 'string' && status) return status.toLowerCase() as ParticipantStatusName;
  return PARTICIPANT_STATUS.Approved;
}

export function presentParticipants(list: unknown): LiveParticipant[] {
  if (!Array.isArray(list)) return [];
  const seen = new Set<number>();
  const result: LiveParticipant[] = [];
  for (const raw of list) {
    if (raw?.studentId == null || seen.has(raw.studentId)) continue;
    const status = participantStatusOf(raw.status);
    if (status !== PARTICIPANT_STATUS.Pending && status !== PARTICIPANT_STATUS.Approved) continue;
    seen.add(raw.studentId);
    result.push({ ...raw, status });
  }
  return result;
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
  isPaid?: boolean;
  price?: number | null;
  liveType?: LiveClassroomType;
  externalLink?: string;
  scheduledAt?: string;
  sendToAll: boolean;
  groupIds?: number[];
  subGroupIds?: number[];
}

export interface JoinLivePayload {
  liveClassroomId: number;
  studentId: number;
  paymentTransactionId?: string;
  paymentTransactionImg?: { uri: string; name: string; type: string };
  // iOS: request the teacher's approval for a paid session without payment details.
  accessRequestOnly?: boolean;
}

export interface AgoraTokenResponse {
  token: string;
  channelName: string;
  uid: number;
  appId: string;
}
