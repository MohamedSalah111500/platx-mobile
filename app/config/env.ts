export const ENV = {
  DEV: {
    API_URL: 'https://platx.runasp.net/',
    AI_API_URL: 'https://exam-ai-14pq.onrender.com/',
    CLIENT_URL: 'http://localhost:4200',
  },
  PROD: {
    API_URL: 'https://platx-backend-prod.runasp.net/',
    AI_API_URL: 'https://exam-ai-14pq.onrender.com/',
    CLIENT_URL: 'https://platx.run',
  },
};

const isDev = __DEV__;

export const API_CONFIG = {
  BASE_URL: isDev ? ENV.DEV.API_URL : ENV.PROD.API_URL,
  AI_API_URL: isDev ? ENV.DEV.AI_API_URL : ENV.PROD.AI_API_URL,
  CLIENT_URL: isDev ? ENV.DEV.CLIENT_URL : ENV.PROD.CLIENT_URL,
};

export default API_CONFIG;
