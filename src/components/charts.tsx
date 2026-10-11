import type { ReactNode } from 'react'
import { ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { money } from '../format'
import type { Locale } from '../types'

export const chartAxis = {
  tickLine: false,
  axisLine: false,
  tickMargin: 8,
} as const

export function MoneyTooltip({ locale, currency }: { locale: Locale; currency?: 'EGP' | 'QAR' }) {
  return (
    <ChartTooltip
      content={
        <ChartTooltipContent
          formatter={(value, name) => (
            <TipRow label={String(name ?? '')} value={value == null ? '—' : money(Number(value), locale, currency)} />
          )}
        />
      }
    />
  )
}

export function TipRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex w-full items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="num font-medium text-foreground">{value}</span>
    </div>
  )
}
