import apiClient from './client';
import { EVENT_URLS } from './endpoints';
import type { EventItem, EventDetail, CreateEventPayload } from '../../types/event.types';

export const eventsApi = {
  getAll: async (date: string, viewType = 0): Promise<EventItem[]> => {
    const { data } = await apiClient.get<EventItem[]>(
      EVENT_URLS.GET_ALL(date, viewType)
    );
    return data;
  },

  getAllForStudent: async (date: string, viewType = 0): Promise<EventItem[]> => {
    const { data } = await apiClient.get<EventItem[]>(
      EVENT_URLS.GET_ALL_STUDENT(date, viewType)
    );
    return data;
  },

  getSingle: async (id: number): Promise<EventDetail> => {
    const { data } = await apiClient.get<EventDetail>(EVENT_URLS.GET_SINGLE(id));
    return data;
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
