import apiClient from './client';
import { REGISTRATION_SETTINGS_URLS } from './endpoints';

export type RegistrationFieldMode = 'Hidden' | 'Optional' | 'Required';

export interface RegistrationSettings {
  allowSocialSignUp: boolean;
  fields: { key: string; mode: RegistrationFieldMode }[];
}

export const DEFAULT_REGISTRATION_SETTINGS: RegistrationSettings = {
  allowSocialSignUp: true,
  fields: [
    { key: 'phoneNumber', mode: 'Hidden' },
    { key: 'educationStage', mode: 'Hidden' },
  ],
};

export const registrationFieldMode = (
  settings: RegistrationSettings,
  key: string
): RegistrationFieldMode => settings.fields.find((f) => f.key === key)?.mode ?? 'Hidden';

export const registrationApi = {
  forDomain: async (domain: string, signal?: AbortSignal): Promise<RegistrationSettings> => {
    const { data } = await apiClient.get<RegistrationSettings>(
      REGISTRATION_SETTINGS_URLS.PUBLIC(domain),
      { signal }
    );
    return data;
  },
};
