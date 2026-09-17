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
  // Raw backend (EventDetailsReadDto) names; eventsApi maps them onto the fields above.
  name?: string;
  onlineMeetingLink?: string | null;
  locationLink?: string | null;
  // This occurrence: Date + StartTime, lasting Duration hours. startDate/endDate
  // above are derived from these (the DTO's own StartDate/EndDate are the
  // recurring series' bounds).
  date?: string;
  startTime?: string;
  duration?: number;
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
