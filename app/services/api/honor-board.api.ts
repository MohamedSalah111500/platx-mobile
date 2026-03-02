import apiClient from './client';
import { HONOR_BOARD_URLS } from './endpoints';

export interface HonorBoardEntry {
  id: number;
  studentId: number;
  studentName: string;
  studentProfileImage: string | null;
  month: number;
  year: number;
  rank: number;
}

export interface SaveHonorBoardPayload {
  month: number;
  year: number;
  students: { studentId: number; rank: number }[];
}

export const honorBoardApi = {
  getRankings: async (month: number, year: number): Promise<HonorBoardEntry[]> => {
    const { data } = await apiClient.get<any>(HONOR_BOARD_URLS.GET(month, year));
    return Array.isArray(data) ? data : data?.data || data?.items || [];
  },

  saveRankings: async (payload: SaveHonorBoardPayload): Promise<void> => {
    await apiClient.post(HONOR_BOARD_URLS.SAVE, payload);
  },
};
