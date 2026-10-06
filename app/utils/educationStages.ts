export const EDUCATION_STAGES = [
  'Primary1',
  'Primary2',
  'Primary3',
  'Primary4',
  'Primary5',
  'Primary6',
  'Preparatory1',
  'Preparatory2',
  'Preparatory3',
  'Secondary1',
  'Secondary2',
  'Secondary3',
  'University',
] as const;

export type EducationStage = (typeof EDUCATION_STAGES)[number];
