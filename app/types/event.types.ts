export interface EventItem {
  id: number;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  location?: string;
  isOnline?: boolean;
  meetingLink?: string;
  color?: string;
  mainEventId?: number;
}

export interface EventDetail extends EventItem {
  attendees?: EventAttendee[];
  createdBy?: string;
}

export interface EventAttendee {
  id: number;
  name: string;
  email?: string;
  status?: 'accepted' | 'declined' | 'pending';
}

export interface CreateEventPayload {
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  location?: string;
  isOnline?: boolean;
  meetingLink?: string;
  color?: string;
  isRecurring?: boolean;
  recurrenceType?: number;
}
