export const SITE = {
  origin: 'https://unalomecodes.com',
  name: 'Unalome Codes',
  defaultLang: 'zh',
  ogDefault: '/assets/og-default.jpg',
  ogFallback: '/img/logo.png'
};

export const LANGS = {
  zh: { key: 'zh', locale: 'zh-Hant', label: '繁中', prefix: '/zh', name: '中文' },
  en: { key: 'en', locale: 'en', label: 'EN', prefix: '/en', name: 'English' }
};

export const DEFAULT_CITY = { key: 'bangkok', zh: '曼谷', en: 'Bangkok' };

export const GUIDE_TYPES = [
  { key: 'first-time', zh: '第一次到訪', en: 'First time in the city' },
  { key: 'rainy-day', zh: '雨天備案', en: 'Rainy-day plan' },
  { key: 'scams', zh: '防詐提醒', en: 'Scam awareness' },
  { key: 'temple-etiquette', zh: '寺廟禮儀', en: 'Temple etiquette' }
];

export const SNAPSHOT_DIR = 'src/seo/snapshots';
export const CACHE_DIR = 'src/seo/.cache';
export const OUTPUT_DIR = 'public';

export const PAGE_SIZE = 50;
export const SITEMAP_LIMIT = 45000;

export const QUALITY_THRESHOLDS = {
  listing: 62,
  aggregation: 58,
  guide: 60,
  about: 45,
  index: 45
};
