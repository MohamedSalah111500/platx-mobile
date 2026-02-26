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
