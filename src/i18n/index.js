import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as RNLocalize from 'react-native-localize';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from './locales/en.json';
import es from './locales/es.json';

const LANGUAGES = {
  en,
  es,
};

const LANG_CODES = Object.keys(LANGUAGES);

const LANGUAGE_DETECTOR = {
  type: 'languageDetector',
  async: true,
  detect: callback => {
    AsyncStorage.getItem('@app_language', (err, language) => {
      // If we have a stored language, use it
      if (!err && language) {
        callback(language);
        return;
      }

      // Otherwise, try to detect the best available language
      try {
        const bestFit = RNLocalize.findBestLanguageTag(LANG_CODES);
        console.log('1Using detected language:', bestFit);
        const languageTag = bestFit?.languageTag || 'en';
        console.log('Using detected language:', languageTag);
        callback(languageTag);
      } catch (error) {
        console.warn('Error detecting language, using English as fallback', error);
        callback('en');
      }
    });
  },
  init: () => { },
  cacheUserLanguage: language => {
    AsyncStorage.setItem('@app_language', language);
  },
};

i18n
  .use(LANGUAGE_DETECTOR)
  .use(initReactI18next)
  .init({
    resources: LANGUAGES,
    react: {
      useSuspense: false,
    },
    interpolation: {
      escapeValue: false,
    },
    defaultNS: 'common',
    fallbackLng: 'en',
  });

export default i18n;
