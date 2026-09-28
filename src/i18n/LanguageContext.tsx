import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { SupportedLanguage, LanguageOption, TranslationDictionary } from './types';
import { LANGUAGES, translations, translateWeatherCondition } from './translations';

interface LanguageContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  currentLanguageOption: LanguageOption;
  languages: LanguageOption[];
  t: (key: keyof TranslationDictionary, params?: Record<string, string | number>) => string;
  tCondition: (condition: string) => string;
  speechCode: string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'weathergpt_lang';

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<SupportedLanguage>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && (saved === 'en' || saved === 'hi' || saved === 'ta' || saved === 'te' || saved === 'ml' || saved === 'kn' || saved === 'mr')) {
        return saved;
      }
    } catch {
      // Ignore localStorage errors (e.g. sandboxed iframe)
    }
    return 'en';
  });

  const setLanguage = (lang: SupportedLanguage) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // Ignore localStorage write error
    }
  };

  const currentLanguageOption = useMemo(() => {
    return LANGUAGES.find((l) => l.code === language) || LANGUAGES[0];
  }, [language]);

  const t = useMemo(() => {
    return (key: keyof TranslationDictionary, params?: Record<string, string | number>): string => {
      const dict = translations[language] || translations.en;
      let text = dict[key] || translations.en[key] || (key as string);

      if (params) {
        Object.entries(params).forEach(([paramKey, paramVal]) => {
          text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramVal));
        });
      }

      return text;
    };
  }, [language]);

  const tCondition = useMemo(() => {
    return (condition: string): string => {
      return translateWeatherCondition(condition, language);
    };
  }, [language]);

  const value = {
    language,
    setLanguage,
    currentLanguageOption,
    languages: LANGUAGES,
    t,
    tCondition,
    speechCode: currentLanguageOption.speechCode,
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
