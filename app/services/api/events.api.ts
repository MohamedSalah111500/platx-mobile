import apiClient from './client';
import { EVENT_URLS } from './endpoints';
import type { EventItem, EventDetail, CreateEventPayload } from '../../types/event.types';

// Backend CalendarViewType: Month = 1, Week = 2, Day = 3 (0 is invalid).
export const CALENDAR_VIEW_TYPE = {
  Month: 1,
  Week: 2,
  Day: 3,
} as const;

const normalizeViewType = (viewType?: number): number =>
  viewType === CALENDAR_VIEW_TYPE.Week || viewType === CALENDAR_VIEW_TYPE.Day
    ? viewType
    : CALENDAR_VIEW_TYPE.Month;

const pad = (n: number) => String(n).padStart(2, '0');

// Wall-clock ISO without an offset — `new Date(...)` reads it back as local time,
// which is how the backend means StartTime.
const toLocalIso = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
  `T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

// EventDetailsReadDto.StartDate/EndDate are the *series* bounds, not this
// occurrence — the occurrence is Date + StartTime, lasting Duration hours
// (same maths as the web calendar).
function occurrenceRange(raw: EventItem): { startDate?: string; endDate?: string } {
  const day = typeof raw.date === 'string' ? raw.date.split('T')[0] : null;
  const time = typeof raw.startTime === 'string' ? raw.startTime : null;
  if (!day || !time) return {};
  const start = new Date(`${day}T${time}`);
  if (Number.isNaN(start.getTime())) return {};
  const hours = Number(raw.duration);
  return {
    startDate: toLocalIso(start),
    endDate:
      Number.isFinite(hours) && hours > 0
        ? toLocalIso(new Date(start.getTime() + hours * 3600000))
        : undefined,
  };
}

// EventDetailsReadDto names these Name / OnlineMeetingLink / LocationLink; map them
// onto the fields the screens read.
function normalizeEvent<T extends EventItem>(raw: T): T {
  if (!raw || typeof raw !== 'object') return raw;
  const range = occurrenceRange(raw);
  return {
    ...raw,
    title: raw.title ?? raw.name ?? '',
    meetingLink: raw.meetingLink ?? raw.onlineMeetingLink ?? undefined,
    location: raw.location ?? raw.locationLink ?? undefined,
    startDate: range.startDate ?? raw.startDate,
    endDate: range.endDate ?? raw.endDate,
  };
}

export const eventsApi = {
  // `date` is YYYY-MM-DD (build it from local date parts, e.g. toLocalDateString).
  getAll: async (date: string, viewType?: number): Promise<EventItem[]> => {
    const { data } = await apiClient.get<EventItem[]>(
      EVENT_URLS.GET_ALL(date, normalizeViewType(viewType))
    );
    return Array.isArray(data) ? data.map(normalizeEvent) : data;
  },

  getAllForStudent: async (date: string, viewType?: number): Promise<EventItem[]> => {
    const { data } = await apiClient.get<EventItem[]>(
      EVENT_URLS.GET_ALL_STUDENT(date, normalizeViewType(viewType))
    );
    return Array.isArray(data) ? data.map(normalizeEvent) : data;
  },

  // api/EventDetails/{id} is Admin/Staff only; students use GetEventDetailsByIdForStudent.
  getSingle: async (id: number, isStudent = false): Promise<EventDetail> => {
    const { data } = await apiClient.get<EventDetail>(
      isStudent ? EVENT_URLS.GET_SINGLE_STUDENT(id) : EVENT_URLS.GET_SINGLE(id)
    );
    return normalizeEvent(data);
  },

  create: async (payload: CreateEventPayload): Promise<EventItem> => {
    const { data } = await apiClient.post<EventItem>(EVENT_URLS.CREATE, payload);
    return data;
  },

  update: async (payload: EventItem): Promise<EventItem> => {
    const { data } = await apiClient.put<EventItem>(EVENT_URLS.UPDATE, payload);
    return data;
  },

  delete: async (
    mainEventId: number,
    eventDetailsId: number
  ): Promise<void> => {
    await apiClient.delete(EVENT_URLS.DELETE(mainEventId, eventDetailsId));
  },
};
