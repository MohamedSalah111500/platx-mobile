import apiClient from './client';
import {
  COURSE_LESSON_URLS,
  COURSE_SECTION_URLS,
  ENROLLMENT_TOKEN_URLS,
  HOME_SETTING_URL,
  ONLINE_COURSE_URLS,
} from './endpoints';
import {
  LESSON_TYPE,
  type CourseFormValues,
  type EnrollmentToken,
  type EnrollmentTokenStats,
  type EnrollmentTokenStatus,
  type GenerateTokensInput,
  type LessonFormValues,
  type ManagedLesson,
  type ManagedSection,
  type SectionFormValues,
} from '../../types/course.types';
import type { PaginatedResponse } from '../../types/api.types';
import { DEFAULT_CURRENCY_CODE } from '../../utils/price';

function dateOnly(value: unknown): string | null {
  if (!value || typeof value !== 'string') return null;
  const match = value.match(/^\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : null;
}

function toCourseForm(raw: any): CourseFormValues {
  return {
    name: raw?.name ?? raw?.title ?? '',
    shortDescription: raw?.shortDescription ?? '',
    description: raw?.description ?? '',
    whatYouWillLearn: raw?.whatYouWillLearn ?? '',
    language: raw?.language || 'Arabic',
    price: Number(raw?.price) || 0,
    discountPrice: Number(raw?.discountPrice) || 0,
    currencyCode: raw?.currencyCode || DEFAULT_CURRENCY_CODE,
    totalHours: Number(raw?.totalHours) || 0,
    previewImageUrl: raw?.previewImageUrl ?? '',
    previewVideoUrl: raw?.previewVideoUrl ?? '',
    showOnHomePage: !!raw?.showOnHomePage,
    category: raw?.category ?? '',
    subCategory: raw?.subCategory ?? '',
    courseTags: raw?.courseTags ?? '',
    isFree: !!raw?.isFree,
    hasCertificate: !!raw?.hasCertificate,
    sellSectionsSeparately: !!raw?.sellSectionsSeparately,
    sellLessonsSeparately: !!raw?.sellLessonsSeparately,
    quizPolicy: Number(raw?.quizPolicy) || 0,
    quizPolicyScope: Number(raw?.quizPolicyScope) || 0,
    startDate: dateOnly(raw?.startDate),
    endDate: dateOnly(raw?.endDate),
  };
}

function toLesson(raw: any, sectionId: number): ManagedLesson {
  return {
    id: Number(raw?.id),
    sectionId: Number(raw?.courseSectionId ?? sectionId),
    title: raw?.title ?? '',
    description: raw?.description ?? '',
    type: (Number(raw?.type) || LESSON_TYPE.Video) as ManagedLesson['type'],
    durationInSeconds: Number(raw?.durationInSeconds) || 0,
    freePreview: !!raw?.freePreview,
    price: raw?.price ?? null,
    coverImageUrl: raw?.coverImageUrl ?? '',
    videoUrl: raw?.videoUrl ?? '',
    attachementId: raw?.attachementId ? Number(raw.attachementId) : null,
    attachmentName: raw?.attachmentName ?? null,
    linkUrl: raw?.linkUrl ?? '',
    openInNewTab: !!raw?.openInNewTab,
    isInternalExam: !!raw?.isInternalExam,
    examId: raw?.examId ? Number(raw.examId) : null,
    orderIndex: Number(raw?.orderIndex) || 0,
  };
}

function byOrder<T extends { orderIndex: number }>(a: T, b: T): number {
  return a.orderIndex - b.orderIndex;
}

function toSection(raw: any): ManagedSection {
  const id = Number(raw?.id);
  return {
    id,
    courseId: Number(raw?.courseId),
    title: raw?.title ?? '',
    description: raw?.description ?? '',
    freePreview: !!raw?.freePreview,
    price: raw?.price ?? null,
    orderIndex: Number(raw?.orderIndex) || 0,
    lessons: (raw?.lessons ?? []).map((l: any) => toLesson(l, id)).sort(byOrder),
  };
}

function lessonPayload(sectionId: number, values: LessonFormValues) {
  const base = {
    courseSectionId: sectionId,
    title: values.title.trim(),
    description: values.description,
    durationInSeconds: values.durationInSeconds || 0,
    isPreview: values.freePreview,
    type: values.type,
    coverImageUrl: values.coverImageUrl,
    price: values.type === LESSON_TYPE.Divider ? 0 : Number(values.price) || 0,
  };
  switch (values.type) {
    case LESSON_TYPE.Video:
      return { ...base, videoUrl: values.videoUrl };
    case LESSON_TYPE.Document:
    case LESSON_TYPE.File:
      return { ...base, attachementId: values.attachementId };
    case LESSON_TYPE.Link:
      return { ...base, linkUrl: values.linkUrl.trim(), openInNewTab: values.openInNewTab };
    case LESSON_TYPE.Exam:
      return { ...base, isInternalExam: values.isInternalExam, examId: values.examId };
    default:
      return base;
  }
}

function toToken(raw: any): EnrollmentToken {
  return {
    id: Number(raw?.id),
    courseId: Number(raw?.courseId),
    courseSectionId: raw?.courseSectionId ?? null,
    courseLessonId: raw?.courseLessonId ?? null,
    targetTitle: raw?.targetTitle ?? null,
    token: raw?.token ?? '',
    serial: Number(raw?.serial) || 0,
    redeemUrl: raw?.redeemUrl ?? '',
    status: (Number(raw?.status) || 0) as EnrollmentTokenStatus,
    usedByStudentName: raw?.usedByStudentName ?? null,
    usedAt: raw?.usedAt ?? null,
    expireAt: raw?.expireAt ?? null,
    creationTime: raw?.creationTime ?? '',
  };
}

export const courseManageApi = {
  getDefaultCurrency: async (domain: string | null): Promise<string | null> => {
    try {
      const { data } = await apiClient.post<any>(HOME_SETTING_URL, { domian: domain ?? '' });
      return data?.defaultCurrency || null;
    } catch {
      return null;
    }
  },

  getCourseForm: async (courseId: number): Promise<CourseFormValues> => {
    const { data } = await apiClient.get<any>(ONLINE_COURSE_URLS.GET_SINGLE(courseId));
    return toCourseForm(data);
  },

  create: async (values: CourseFormValues): Promise<number> => {
    const { data } = await apiClient.post<any>(ONLINE_COURSE_URLS.CREATE, values);
    return Number(data?.id);
  },

  update: async (courseId: number, values: CourseFormValues): Promise<void> => {
    await apiClient.put(ONLINE_COURSE_URLS.GET_SINGLE(courseId), values);
  },

  remove: async (courseId: number): Promise<void> => {
    await apiClient.delete(ONLINE_COURSE_URLS.DELETE(courseId));
  },

  getSections: async (courseId: number): Promise<ManagedSection[]> => {
    const { data } = await apiClient.get<any>(COURSE_SECTION_URLS.GET_BY_COURSE(courseId));
    const list = Array.isArray(data) ? data : data?.items ?? [];
    return list.map(toSection).sort(byOrder);
  },

  createSection: async (courseId: number, values: SectionFormValues): Promise<void> => {
    await apiClient.post(COURSE_SECTION_URLS.CREATE, {
      courseId,
      title: values.title.trim(),
      description: values.description.trim(),
      IsPreview: values.freePreview,
      price: Number(values.price) || 0,
    });
  },

  updateSection: async (sectionId: number, values: SectionFormValues): Promise<void> => {
    await apiClient.put(COURSE_SECTION_URLS.SINGLE(sectionId), {
      title: values.title.trim(),
      description: values.description.trim(),
      IsPreview: values.freePreview,
      isActive: false,
      price: Number(values.price) || 0,
    });
  },

  removeSection: async (sectionId: number): Promise<void> => {
    await apiClient.delete(COURSE_SECTION_URLS.SINGLE(sectionId));
  },

  reorderSection: async (sectionId: number, position: number): Promise<void> => {
    await apiClient.put(COURSE_SECTION_URLS.REORDER(sectionId, position), {});
  },

  getLesson: async (lessonId: number, sectionId: number): Promise<ManagedLesson> => {
    const { data } = await apiClient.get<any>(COURSE_LESSON_URLS.ADMIN_SINGLE(lessonId));
    return toLesson(data, sectionId);
  },

  createLesson: async (sectionId: number, values: LessonFormValues): Promise<void> => {
    await apiClient.post(COURSE_LESSON_URLS.CREATE, lessonPayload(sectionId, values));
  },

  updateLesson: async (lessonId: number, sectionId: number, values: LessonFormValues): Promise<void> => {
    await apiClient.put(COURSE_LESSON_URLS.SINGLE(lessonId), lessonPayload(sectionId, values));
  },

  removeLesson: async (lessonId: number): Promise<void> => {
    await apiClient.delete(COURSE_LESSON_URLS.SINGLE(lessonId));
  },

  reorderLesson: async (lessonId: number, position: number): Promise<void> => {
    await apiClient.put(COURSE_LESSON_URLS.REORDER(lessonId, position), {});
  },

  getTokens: async (
    courseId: number,
    page: number,
    size: number,
    status: EnrollmentTokenStatus | null
  ): Promise<PaginatedResponse<EnrollmentToken>> => {
    const params: Record<string, number> = { page, size };
    if (status != null) params.status = status;
    const { data } = await apiClient.get<any>(ENROLLMENT_TOKEN_URLS.BY_COURSE(courseId), { params });
    return { items: (data?.items ?? []).map(toToken), totalCount: Number(data?.totalCount) || 0 };
  },

  getTokenStats: async (courseId: number): Promise<EnrollmentTokenStats> => {
    const { data } = await apiClient.get<any>(ENROLLMENT_TOKEN_URLS.STATS(courseId));
    return {
      total: Number(data?.total) || 0,
      available: Number(data?.available) || 0,
      used: Number(data?.used) || 0,
      expired: Number(data?.expired) || 0,
    };
  },

  generateTokens: async (courseId: number, input: GenerateTokensInput): Promise<void> => {
    await apiClient.post(ENROLLMENT_TOKEN_URLS.GENERATE(courseId), input);
  },

  deactivateToken: async (tokenId: number): Promise<void> => {
    await apiClient.put(ENROLLMENT_TOKEN_URLS.DEACTIVATE(tokenId), {});
  },

  removeToken: async (tokenId: number): Promise<void> => {
    await apiClient.delete(ENROLLMENT_TOKEN_URLS.SINGLE(tokenId));
  },
};
