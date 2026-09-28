import { SupportedLanguage, LanguageOption, TranslationDictionary } from './types';
import { en } from './locales/en';
import { hi } from './locales/hi';
import { ta } from './locales/ta';
import { te } from './locales/te';
import { ml } from './locales/ml';
import { kn } from './locales/kn';
import { mr } from './locales/mr';
import { WEATHER_CONDITIONS, translateWeatherCondition } from './locales/conditions';

export const LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English', char: 'E', speechCode: 'en-IN' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', char: 'ह', speechCode: 'hi-IN' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', char: 'த', speechCode: 'ta-IN' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', char: 'త', speechCode: 'te-IN' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', char: 'മ', speechCode: 'ml-IN' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', char: 'ಕ', speechCode: 'kn-IN' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', char: 'म', speechCode: 'mr-IN' },
];

export const translations: Record<SupportedLanguage, TranslationDictionary> = {
  en,
  hi,
  ta,
  te,
  ml,
  kn,
  mr,
};

export { WEATHER_CONDITIONS, translateWeatherCondition };
