/**
 * #2 — Multi-language Admin Panel Switcher
 *
 * Compact language picker for the backend admin interface.
 * Supports: English, Arabic, French, Turkish, Urdu, Hindi.
 * Changes the entire admin UI language instantly (persists in user profile).
 *
 * Usage: Already integrated in Layout.tsx header
 */
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'ar', label: 'العربية', flag: '🇶🇦' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'tr', label: 'Türkçe', flag: '🇹🇷' },
  { code: 'ur', label: 'اردو', flag: '🇵🇰' },
  { code: 'hi', label: 'हिंदी', flag: '🇮🇳' },
];

interface Props {
  compact?: boolean; // Shows only flag in compact mode
}

export default function LanguageSwitcher({ compact = false }: Props) {
  const { i18n } = useTranslation();
  const { updateLanguage } = useAuth();
  const current = LANGUAGES.find(l => l.code === i18n.language) || LANGUAGES[0];

  const handleChange = (code: string) => {
    updateLanguage(code);
  };

  if (compact) {
    return (
      <div className="relative group">
        <button className="w-8 h-8 rounded-lg flex items-center justify-center text-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" title={current.label}>
          {current.flag}
        </button>
        {/* Dropdown on hover */}
        <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg py-1 min-w-[140px] hidden group-hover:block z-50">
          {LANGUAGES.map(lang => (
            <button
              key={lang.code}
              onClick={() => handleChange(lang.code)}
              className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-800 ${
                lang.code === i18n.language ? 'text-primary font-medium' : 'text-gray-700 dark:text-gray-300'
              }`}
            >
              <span>{lang.flag}</span>
              <span>{lang.label}</span>
              {lang.code === i18n.language && <span className="ms-auto text-primary">✓</span>}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <select
      value={i18n.language}
      onChange={(e) => handleChange(e.target.value)}
      className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5 text-sm"
    >
      {LANGUAGES.map(lang => (
        <option key={lang.code} value={lang.code}>{lang.flag} {lang.label}</option>
      ))}
    </select>
  );
}
