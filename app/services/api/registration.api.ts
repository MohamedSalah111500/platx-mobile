import apiClient from './client';
import { REGISTRATION_SETTINGS_URLS } from './endpoints';
import { EDUCATION_STAGES } from '../../utils/educationStages';

export type RegistrationFieldMode = 'Hidden' | 'Optional' | 'Required';
export type RegistrationFieldType = 'Text' | 'Phone' | 'Select';

export interface LocalizedText {
  ar: string;
  en: string;
}

export interface RegistrationFieldOption {
  value: string;
  label: LocalizedText;
}

export interface RegistrationField {
  key: string;
  mode: RegistrationFieldMode;
  type: RegistrationFieldType;
  label: LocalizedText;
  placeholder: LocalizedText;
  requiredMessage: LocalizedText;
  invalidMessage: LocalizedText;
  options: RegistrationFieldOption[];
}

export interface RegistrationSettings {
  allowSocialSignUp: boolean;
  fields: RegistrationField[];
  domain?: string;
  name?: string;
  logoUrl?: string;
}

type Translate = (key: string) => string;

const EMPTY_TEXT: LocalizedText = { ar: '', en: '' };

export const DEFAULT_REGISTRATION_SETTINGS: RegistrationSettings = {
  allowSocialSignUp: true,
  fields: [],
};

export const localizedText = (text: LocalizedText | null | undefined, locale: string): string => {
  if (!text) return '';
  const preferred = locale.startsWith('ar') ? text.ar : text.en;
  return preferred || text.en || text.ar || '';
};

const translated = (t: Translate, key: string): LocalizedText => {
  const value = t(key);
  return { ar: value, en: value };
};

const withSchemaDefaults = (field: Partial<RegistrationField> & { key: string }, t: Translate): RegistrationField => {
  const isStage = field.key === 'educationStage';
  const type: RegistrationFieldType =
    field.type ?? (isStage ? 'Select' : field.key.toLowerCase().includes('phone') ? 'Phone' : 'Text');
  return {
    key: field.key,
    mode: field.mode ?? 'Hidden',
    type,
    label: field.label ?? translated(t, isStage ? 'auth.educationStage' : 'auth.phoneNumber'),
    placeholder: field.placeholder ?? (isStage ? translated(t, 'auth.educationStagePlaceholder') : EMPTY_TEXT),
    requiredMessage:
      field.requiredMessage ?? translated(t, isStage ? 'auth.educationStageRequired' : 'auth.phoneNumberRequired'),
    invalidMessage: field.invalidMessage ?? translated(t, 'auth.phoneNumberInvalid'),
    options:
      field.options ??
      (isStage ? EDUCATION_STAGES.map((stage) => ({ value: stage, label: translated(t, `educationStages.${stage}`) })) : []),
  };
};

export const registrationApi = {
  forDomain: async (domain: string, t: Translate, signal?: AbortSignal): Promise<RegistrationSettings> => {
    const { data } = await apiClient.get<RegistrationSettings>(
      REGISTRATION_SETTINGS_URLS.PUBLIC(domain),
      { signal }
    );
    return { ...data, fields: (data.fields ?? []).map((field) => withSchemaDefaults(field, t)) };
  },
};
