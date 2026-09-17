export const NOTIFICATION_ENTITY_TYPE = {
  Course: 1,
} as const;
export type NotificationEntityType = (typeof NOTIFICATION_ENTITY_TYPE)[keyof typeof NOTIFICATION_ENTITY_TYPE];

export interface NotificationItem {
  id: number;
  title: string;
  body: string;
  isReaded: boolean;
  createdDate: string;
  staffId?: number | null;
  staffName?: string;
  type?: string;
  senderId?: number;
  senderName?: string;
  recipientId?: number;
  groupId?: number;
  entityType?: NotificationEntityType | null;
  entityId?: number | null;
}

export interface NotificationResponse {
  items: NotificationItem[];
  totalCount: number;
}

export interface CreateNotificationPayload {
  title: string;
  body: string;
  sendToAll: boolean;
  groupIds?: number[];
  studentIds?: number[];
}
