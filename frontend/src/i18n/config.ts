import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import ko from './locales/ko.json';
import en from './locales/en.json';
import zhCN from './locales/zh-CN.json';
import ja from './locales/ja.json';
import ru from './locales/ru.json';
import hi from './locales/hi.json';
import de from './locales/de.json';
import ptBR from './locales/pt-BR.json';

const resources = {
  ko: { translation: ko },
  en: { translation: en },
  'zh-CN': { translation: zhCN },
  ja: { translation: ja },
  ru: { translation: ru },
  hi: { translation: hi },
  de: { translation: de },
  'pt-BR': { translation: ptBR },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    // lng: removed to enable automatic language detection
    debug: false,
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

export default i18n;
