export const LANGUAGE_OPTIONS = [
  { code: 'pt', label: 'Português' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'de', label: 'Deutsch' },
]

export function languageLabel(code) {
  return LANGUAGE_OPTIONS.find((option) => option.code === code)?.label ?? code
}
