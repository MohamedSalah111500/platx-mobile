import apiClient from './client';
import { PROFILE_URLS } from './endpoints';

export interface ProfilePhotoAsset {
  uri: string;
  name: string;
  type: string;
}

const PHOTO_UPLOAD_TIMEOUT = 60000;

export const profileApi = {
  // The photo belongs to the signed-in account, whatever its type, so no id is sent.
  uploadPhoto: async (photo: ProfilePhotoAsset): Promise<string | null> => {
    const body = new FormData();
    body.append('photo', {
      uri: photo.uri,
      name: photo.name,
      type: photo.type,
    } as unknown as Blob);

    const { data } = await apiClient.post<{ url: string | null }>(
      PROFILE_URLS.PHOTO,
      body,
      {
        timeout: PHOTO_UPLOAD_TIMEOUT,
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    );
    return data?.url ?? null;
  },

  removePhoto: async (): Promise<void> => {
    await apiClient.delete(PROFILE_URLS.PHOTO);
  },
};
