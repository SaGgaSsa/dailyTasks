import { en } from './en'
import { es } from './es'

export const translations = {
  en,
  es,
} as const

export type Locale = keyof typeof translations
export type TranslationKeys = typeof en

export function getTranslations(locale: Locale): TranslationKeys {
  return translations[locale] || translations.es
}

export function t(locale: Locale, key: string, params?: Record<string, string | number>): string {
  const keys = key.split('.')
  let value: unknown = translations[locale] || translations.es

  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = (value as Record<string, unknown>)[k]
    } else {
      return key
    }
  }

  if (typeof value !== 'string') {
    return key
  }

  if (params) {
    return Object.entries(params).reduce(
      (str, [paramKey, paramValue]) => str.replace(`{${paramKey}}`, String(paramValue)),
      value
    )
  }

  return value
}

export { en, es }
