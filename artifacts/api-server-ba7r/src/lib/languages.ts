export const SUPPORTED_LANGS: {
  code: string;
  name: string;
  nativeName: string;
  rtl?: boolean;
}[] = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "ar", name: "Arabic", nativeName: "العربية", rtl: true },
  { code: "fr", name: "French", nativeName: "Français" },
  { code: "es", name: "Spanish", nativeName: "Español" },
  { code: "it", name: "Italian", nativeName: "Italiano" },
  { code: "pt", name: "Portuguese", nativeName: "Português" },
  { code: "tr", name: "Turkish", nativeName: "Türkçe" },
  { code: "ru", name: "Russian", nativeName: "Русский" },
  { code: "fa", name: "Persian", nativeName: "فارسی", rtl: true },
  { code: "ur", name: "Urdu", nativeName: "اردو", rtl: true },
  { code: "he", name: "Hebrew", nativeName: "עברית", rtl: true },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी" },
  { code: "zh", name: "Chinese", nativeName: "中文" },
  { code: "ja", name: "Japanese", nativeName: "日本語" },
  { code: "ko", name: "Korean", nativeName: "한국어" },
  { code: "pl", name: "Polish", nativeName: "Polski" },
  { code: "nl", name: "Dutch", nativeName: "Nederlands" },
];

export const SUPPORTED_LANG_CODES = SUPPORTED_LANGS.map((l) => l.code);
export const RTL_LANGS = new Set(
  SUPPORTED_LANGS.filter((l) => l.rtl).map((l) => l.code),
);

export function isSupportedLang(code: string): boolean {
  return SUPPORTED_LANG_CODES.includes(code);
}
