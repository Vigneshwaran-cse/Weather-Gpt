import { SupportedLanguage } from '../types';

export const WEATHER_CONDITIONS: Record<string, Record<SupportedLanguage, string>> = {
  'clear sky': {
    en: 'Clear Sky',
    hi: 'साफ़ आसमान',
    ta: 'தெளிவான வானம்',
    te: 'నిర్మలమైన ఆకాశం',
    ml: 'തെളിഞ്ഞ ആകാശം',
    kn: 'ಸ್ವಚ್ಛ ಆಕಾಶ',
    mr: 'निरभ್ರ ಆಕಾಶ',
  },
  'clear': {
    en: 'Clear',
    hi: 'साफ़',
    ta: 'தெளிவானது',
    te: 'నిర్మలం',
    ml: 'തെളിഞ്ഞത്',
    kn: 'ಸ್ವಚ್ಛ',
    mr: 'स्वच्छ',
  },
  'mainly clear': {
    en: 'Mainly clear',
    hi: 'मुख्यतः साफ़',
    ta: 'பெரும்பாலும் தெளிவானது',
    te: 'ఎక్కువగా నిర్మలం',
    ml: 'പ്രധാനമായും തെളിഞ്ഞത്',
    kn: 'ಹೆಚ್ಚಾಗಿ ಸ್ವಚ್ಛ',
    mr: 'मुख्यतः स्वच्छ',
  },
  'partly cloudy': {
    en: 'Partly cloudy',
    hi: 'आंशिक रूप से बादल',
    ta: 'பகுதி மேகமூட்டம்',
    te: 'పాక్షికంగా మేఘావృతం',
    ml: 'ഭാഗികമായി മേഘാവൃതം',
    kn: 'ಭಾಗಶಃ ಮೋಡ ಕವಿದಿದೆ',
    mr: 'थोड्या प्रमाणात ढगाळ',
  },
  'overcast': {
    en: 'Overcast',
    hi: 'घने बादल',
    ta: 'முழு மேகமூட்டம்',
    te: 'పూర్తిగా మేఘావృతం',
    ml: 'പൂർണ്ണമായും മേഘാവൃതം',
    kn: 'ಸಂಪೂರ್ಣ ಮೋಡ ಕವಿದಿದೆ',
    mr: 'ढगाळलेले',
  },
  'fog': {
    en: 'Fog',
    hi: 'कोहरा',
    ta: 'மூடுபனி',
    te: 'పొగమంచు',
    ml: 'മൂടൽമഞ്ഞ്',
    kn: 'ದಟ್ಟ ಮಂಜು',
    mr: 'धુके',
  },
  'depositing rime fog': {
    en: 'Depositing rime fog',
    hi: 'पाला जमाने वाला कोहरा',
    ta: 'உறைபனி மூடுபனி',
    te: 'ఘనీభవించే పొగమంచు',
    ml: 'തണുത്തുറഞ്ഞ മൂടൽമഞ്ഞ്',
    kn: 'ಹಿಮ ಹೆಪ್ಪುಗಟ್ಟುವ ಮಂಜು',
    mr: 'अतिथंड धुके',
  },
  'light drizzle': {
    en: 'Light drizzle',
    hi: 'हल्की बूंदाबांदी',
    ta: 'லேசான தூறல்',
    te: 'తేలికపాటి జల్లు',
    ml: 'നേരിയ ചാറ്റൽമഴ',
    kn: 'ಹಗುರ ತುಂತುರು ಮಳೆ',
    mr: 'हलकी रिमझिम',
  },
  'moderate drizzle': {
    en: 'Moderate drizzle',
    hi: 'मध्यम बूंदाबांदी',
    ta: 'மிதமான தூறல்',
    te: 'మోస్తరు జల్లు',
    ml: 'മിതമായ ചാറ്റൽമഴ',
    kn: 'ಮಧ್ಯಮ ತುಂತುರು ಮಳೆ',
    mr: 'मध्यम रिमझिम',
  },
  'dense drizzle': {
    en: 'Dense drizzle',
    hi: 'घनी बूंदाबांदी',
    ta: 'அடர்ந்த தூறல்',
    te: 'దట్టమైన జల్లు',
    ml: 'കനത്ത ചാറ്റൽമഴ',
    kn: 'ದಟ್ಟ ತುಂತುರು ಮಳೆ',
    mr: 'दाट रिमझिम',
  },
  'slight rain': {
    en: 'Slight rain',
    hi: 'हल्की बारिश',
    ta: 'லேசான மழை',
    te: 'తేలికపాటి వర్షం',
    ml: 'നേരിയ മഴ',
    kn: 'ಹಗುರ ಮಳೆ',
    mr: 'हलका पाऊस',
  },
  'moderate rain': {
    en: 'Moderate rain',
    hi: 'मध्यम बारिश',
    ta: 'மிதமான மழை',
    te: 'మోస్తరు వర్షం',
    ml: 'മിതമായ മഴ',
    kn: 'ಮಧ್ಯಮ ಮಳೆ',
    mr: 'मध्यम पाऊस',
  },
  'heavy rain': {
    en: 'Heavy rain',
    hi: 'भारी बारिश',
    ta: 'கனமழை',
    te: 'భారీ వర్షం',
    ml: 'കനത്ത മഴ',
    kn: 'ಭಾರೀ ಮಳೆ',
    mr: 'मुसळधार पाऊस',
  },
  'slight rain showers': {
    en: 'Slight rain showers',
    hi: 'हल्की वर्षा की फुहारें',
    ta: 'லேசான மழைச்சாரல்',
    te: 'తేలికపాటి వర్షపు జల్లులు',
    ml: 'നേരിയ മഴത്തുള്ളികൾ',
    kn: 'ಹಗುರ ಮಳೆಯ ಸಿಂಚನ',
    mr: 'हलक्या पावसाच्या सरी',
  },
  'moderate rain showers': {
    en: 'Moderate rain showers',
    hi: 'मध्यम वर्षा की फुहारें',
    ta: 'மிதமான மழைச்சாரல்',
    te: 'మోస్తరు వర్షపు జల్లులు',
    ml: 'മിതമായ മഴത്തുള്ളികൾ',
    kn: 'ಮಧ್ಯಮ ಮಳೆಯ ಸಿಂಚನ',
    mr: 'मध्यम पावसाच्या सरी',
  },
  'violent rain showers': {
    en: 'Violent rain showers',
    hi: 'अति भारी वर्षा की फुहारें',
    ta: 'கடும் மழைச்சாரல்',
    te: 'తీవ్ర వర్షపు జల్లులు',
    ml: 'കനത്ത പേമാരി',
    kn: 'ಅತಿ ಭಾರೀ ಮಳೆಯ ಸಿಂಚನ',
    mr: 'मुसळधार सरी',
  },
  'thunderstorm': {
    en: 'Thunderstorm',
    hi: 'गरज के साथ तूफान',
    ta: 'இடியுடன் கூடிய மழை',
    te: 'ఉరుములతో కూడిన వర్షం',
    ml: 'ഇടിമിന്നലോടു കൂടിയ മഴ',
    kn: 'ಗುಡುಗು ಸಹಿತ ಮಳೆ',
    mr: 'वादळी पाऊस',
  },
  'thunderstorm with slight hail': {
    en: 'Thunderstorm with slight hail',
    hi: 'हल्की ओलावृष्टि के साथ तूफान',
    ta: 'ஆலங்கட்டி இடிமழை',
    te: 'తేలికపాటి వడగండ్ల వాన',
    ml: 'നേരിയ ആലിപ്പഴത്തോടെ ഇടിമിന്നൽ',
    kn: 'ಸಣ್ಣ ಆಲಿಕಲ್ಲು ಸಹಿತ ಗುಡುಗು ಮಳೆ',
    mr: 'गारपिटीसह वादळ',
  },
  'thunderstorm with heavy hail': {
    en: 'Thunderstorm with heavy hail',
    hi: 'भारी ओलावृष्टि के साथ तूफान',
    ta: 'பலத்த ஆலங்கட்டி இடிமழை',
    te: 'భారీ వడగండ్ల వాన',
    ml: 'കനത്ത ആലിപ്പഴത്തോടെ ഇടിമിന്നൽ',
    kn: 'ಭಾರೀ ಆಲಿಕಲ್ಲು ಸಹಿತ ಗುಡುಗು ಮಳೆ',
    mr: 'मोठ्या गारपिटीसह वादळ',
  },
};

export function translateWeatherCondition(conditionText: string, lang: SupportedLanguage): string {
  if (!conditionText) return '';
  const lower = conditionText.trim().toLowerCase();

  // Exact match
  if (WEATHER_CONDITIONS[lower] && WEATHER_CONDITIONS[lower][lang]) {
    return WEATHER_CONDITIONS[lower][lang];
  }

  // Substring match
  for (const [key, mapping] of Object.entries(WEATHER_CONDITIONS)) {
    if (lower.includes(key)) {
      return mapping[lang] || conditionText;
    }
  }

  return conditionText;
}
