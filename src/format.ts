import type { Locale } from './types'

const loc = (locale: Locale) => (locale === 'ar' ? 'ar-EG' : 'en-EG')

export function num(value: number, locale: Locale, digits = 0) {
  return new Intl.NumberFormat(loc(locale), {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value)
}

export function money(value: number, locale: Locale, currency: 'EGP' | 'QAR' = 'EGP') {
  const formatted = num(Math.round(value), locale)
  if (currency === 'QAR') return locale === 'ar' ? `${formatted} ر.ق` : `${formatted} QAR`
  return locale === 'ar' ? `${formatted} ج.م` : `EGP ${formatted}`
}

export function percent(ratio: number, locale: Locale, digits = 1, signed = false) {
  return new Intl.NumberFormat(loc(locale), {
    style: 'percent',
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
    signDisplay: signed ? 'exceptZero' : 'auto',
  }).format(ratio)
}

export function compact(value: number, locale: Locale) {
  const abs = Math.abs(value)
  if (abs >= 1_000_000) {
    const v = value / 1_000_000
    return locale === 'ar' ? `${num(v, locale, 1)} م` : `${num(v, locale, 1)}m`
  }
  if (abs >= 1000) return locale === 'ar' ? `${num(value / 1000, locale, 0)} ألف` : `${num(value / 1000, locale, 0)}k`
  return num(value, locale)
}

export const WEEKDAYS = [
  { ar: 'الأحد', en: 'Sun' },
  { ar: 'الإثنين', en: 'Mon' },
  { ar: 'الثلاثاء', en: 'Tue' },
  { ar: 'الأربعاء', en: 'Wed' },
  { ar: 'الخميس', en: 'Thu' },
  { ar: 'الجمعة', en: 'Fri' },
  { ar: 'السبت', en: 'Sat' },
]

export function weekdayName(index: number, locale: Locale) {
  return WEEKDAYS[index]?.[locale] ?? ''
}
