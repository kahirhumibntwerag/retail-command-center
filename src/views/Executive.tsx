import { useMemo, useState } from 'react'
import { Area, Bar, CartesianGrid, Cell, ComposedChart, Line, XAxis, YAxis } from 'recharts'
import { MONTH_LABEL } from '../data'
import { exportRows } from '../excel'
import { buildExecutiveReport } from '../advisor'
import { branchDaily, forecastSeries, projectForecast, segmentLabel } from '../engine'
import { compact, money, num, percent, weekdayName } from '../format'
import { useStore } from '../store'
import type { Segment } from '../types'
import { ChartContainer, ChartLegend, ChartLegendContent, type ChartConfig } from '@/components/ui/chart'
import { MoneyTooltip, chartAxis } from '../components/charts'
import { Button, Kpi, PageHeader, Panel, Seg, Select, Trend } from '../components/kit'

export default function ExecutiveView() {
  const { model, locale, tx, dataset, filters, setView, setManagerId, setAdvisorOpen } = useStore()
  const [scenario, setScenario] = useState<1 | 0.9 | 1.1>(1)
  const [range, setRange] = useState<'both' | 'future'>('both')
  const [forecastBranch, setForecastBranch] = useState('all')
  const fullChain = useMemo(() => dataset.branches.filter((b) => b.currency === 'EGP').reduce((s, b) => s + b.sales, 0), [dataset.branches])
  const focus = forecastBranch === 'all' ? null : dataset.branches.find((b) => b.id === forecastBranch) ?? null
  const salesBase = focus ? (focus.currency === 'QAR' ? 0 : focus.sales) : model.kpis.sales
  const forecast = projectForecast(salesBase || model.kpis.sales, fullChain, scenario)
  const actualPoints = focus
    ? branchDaily(focus).map((sales, index) => ({ label: String(index + 1).padStart(2, '0'), sales }))
    : model.daily.map((d) => ({ label: d.label, sales: d.sales }))
  const chart = forecastSeries(range === 'future' ? [] : actualPoints, forecast.days, range).map((point) => ({
    ...point,
    band: point.low != null && point.high != null ? [point.low, point.high] : null,
  }))
  const dailyConfig = {
    sales: { label: tx('المبيعات', 'Sales'), color: 'var(--chart-2)' },
    weekend: { label: tx('جمعة وسبت', 'Friday and Saturday'), color: 'var(--chart-1)' },
  } satisfies ChartConfig
  const weekdayConfig = {
    avg: { label: tx('متوسط اليوم', 'Weekday average'), color: 'var(--chart-2)' },
  } satisfies ChartConfig
  const included = model.branches.filter((branch) => branch.included)
  const fullTarget = included.reduce((sum, branch) => sum + branch.target, 0)
  const target = fullTarget * (filters.period === 'full' ? 1 : model.daily.length / 31)
  const achievement = target ? model.kpis.sales / target : 0
  const targetTone = achievement >= 1 ? 'good' : achievement < 0.9 ? 'bad' : 'warn'
  const headline = buildExecutiveReport(model, locale, 'monthly').headline
  const critical = model.alerts.filter((alert) => alert.severity === 'critical')
  const forecastConfig = {
    actual: { label: tx('الفعلي', 'Actual'), color: 'var(--foreground)' },
    forecast: { label: tx('التوقع', 'Forecast'), color: 'var(--chart-1)' },
    low: { label: tx('النطاق الأدنى', 'Lower band'), color: 'var(--chart-2)' },
    high: { label: tx('النطاق الأعلى', 'Upper band'), color: 'var(--chart-3)' },
  } satisfies ChartConfig

  return (
    <div>
      <PageHeader
        eyebrow={tx('لوحة القيادة', 'Command')}
        title={tx('المؤشرات الكلية', 'Chain scorecard')}
        subtitle={tx(
          `أداء الفروع الظاهرة لشهر ${MONTH_LABEL.ar}. المعدلات مرجّحة بمجموع الفواتير والقطع، لا بمتوسط الفروع.`,
          `Visible stores for ${MONTH_LABEL.en}. Rates are weighted by receipts and units, not by a simple store average.`,
        )}
      />

      <section className="grid gap-3 lg:grid-cols-5">
        <div className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10 lg:col-span-3">
          <p className="text-sm text-muted-foreground">{tx('صافي المبيعات', 'Net sales')}</p>
          <p className="num mt-1 text-3xl font-semibold text-primary sm:text-4xl">{money(model.kpis.sales, locale)}</p>
          <p className="mt-3 text-sm">
            {tx('مقابل المستهدف', 'Against target')}{' '}
            <span className={targetTone === 'good' ? 'num text-emerald-300' : targetTone === 'bad' ? 'num text-red-300' : 'num text-amber-200'}>{percent(achievement, locale, 0)}</span>
            <span className="num text-muted-foreground"> · {money(target, locale)}</span>
          </p>
          <p className="mt-2 text-sm">
            {tx('تغيّر النصف الثاني', 'Second-half change')}{' '}
            <Trend ratio={model.h2Delta}>{percent(model.h2Delta, locale, 1, true)}</Trend>
            <span className="text-muted-foreground"> · {money(model.h2Rate, locale)} {tx('في اليوم', 'a day')}</span>
          </p>
          <button type="button" onClick={() => setAdvisorOpen(true)} className="mt-4 text-start text-sm leading-7 text-primary hover:underline">
            {headline}
          </button>
        </div>
        <div className="flex flex-col gap-2 lg:col-span-2">
          {critical.map((alert) => (
            <button
              key={alert.id}
              type="button"
              onClick={() => {
                if (alert.branchId) {
                  setManagerId(alert.branchId)
                  setView('manager')
                }
              }}
              className="rounded-2xl border border-red-400/40 bg-card p-3 text-start"
            >
              <p className="text-xs font-medium text-red-300">{tx('حرج', 'Critical')}</p>
              <p className="mt-1 font-medium">{tx(alert.titleAr, alert.titleEn)}</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{tx(alert.actionAr, alert.actionEn)}</p>
            </button>
          ))}
          {critical.length === 0 && <p className="rounded-2xl bg-card p-4 text-sm text-muted-foreground ring-1 ring-foreground/10">{tx('لا تنبيه حرج داخل هذه التصفية.', 'No critical alert inside this filter.')}</p>}
        </div>
      </section>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <Kpi label={tx('القطع المباعة', 'Units')} value={num(Math.round(model.kpis.units), locale)} hint={tx(`${model.kpis.active} فرعاً نشطاً في الإجمالي`, `${model.kpis.active} stores in the total`)} />
        <Kpi label={tx('عدد الفواتير', 'Receipts')} value={num(Math.round(model.kpis.trx), locale)} hint={tx('مجموع الفواتير', 'Sum of receipts')} />
        <Kpi label={tx('متوسط الفاتورة', 'Average ticket')} value={money(model.kpis.atv, locale)} hint="ATV = Σ sales ÷ Σ TRX" />
        <Kpi label={tx('قطع الفاتورة', 'Units per receipt')} value={num(model.kpis.upt, locale, 2)} hint="UPT = Σ units ÷ Σ TRX" />
        <Kpi label={tx('متوسط سعر القطعة', 'Unit value')} value={money(model.kpis.utv, locale)} hint="UTV = Σ sales ÷ Σ units" />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-5">
        <Panel className="xl:col-span-3">
          <h2 className="text-lg font-semibold">{tx('المبيعات اليومية', 'Daily sales')}</h2>
          <p className="mb-3 flex flex-wrap gap-3 text-sm text-[#a8b3c7]">
            <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-chart-1" />{tx('جمعة وسبت', 'Friday and Saturday')}</span>
            <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-chart-2" />{tx('باقي الأسبوع', 'Other weekdays')}</span>
          </p>
          <p className="sr-only">{tx(`مبيعات يومية من 1 إلى ${model.daily.length}. أعلى يوم ظاهر ${model.daily.reduce((best, day) => (day.sales > best.sales ? day : best), model.daily[0])?.label ?? ''}.`, `Daily sales for days 1 to ${model.daily.length}.`)}</p>
          <ChartContainer config={dailyConfig} className="aspect-auto h-56 w-full sm:h-72">
            <ComposedChart data={model.daily} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" {...chartAxis} />
              <YAxis {...chartAxis} width={52} tickFormatter={(value) => compact(Number(value), locale)} />
              <MoneyTooltip locale={locale} />
              <Bar dataKey="sales" radius={[6, 6, 0, 0]}>
                {model.daily.map((day) => (
                  <Cell key={day.label} fill={day.weekend ? 'var(--chart-1)' : 'var(--chart-2)'} />
                ))}
              </Bar>
            </ComposedChart>
          </ChartContainer>
        </Panel>
        <Panel className="xl:col-span-2">
          <h2 className="text-lg font-semibold">{tx('حسب أيام الأسبوع', 'By weekday')}</h2>
          <p className="mb-3 text-sm text-muted-foreground">{tx('متوسط اليوم مقسوماً على عدد مرات تكراره.', 'Average of that weekday across the month.')}</p>
          <ChartContainer config={weekdayConfig} className="aspect-auto h-56 w-full sm:h-72">
            <ComposedChart data={model.weekdays.map((day) => ({ ...day, name: weekdayName(day.key, locale), weekend: day.key === 5 || day.key === 6 }))} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="name" {...chartAxis} />
              <YAxis {...chartAxis} width={52} tickFormatter={(value) => compact(Number(value), locale)} />
              <MoneyTooltip locale={locale} />
              <Bar dataKey="avg" radius={[6, 6, 0, 0]}>
                {model.weekdays.map((day) => (
                  <Cell key={day.key} fill={day.key === 5 || day.key === 6 ? 'var(--chart-1)' : 'var(--chart-2)'} />
                ))}
              </Bar>
            </ComposedChart>
          </ChartContainer>
          <p className="mt-3 text-sm text-primary">
            {tx(
              `الجمعة أعلى من منتصف الأسبوع بنسبة ${percent(model.weekendLift.fri, locale, 0, true)} والسبت بنسبة ${percent(model.weekendLift.sat, locale, 0, true)}.`,
              `Friday runs ${percent(model.weekendLift.fri, locale, 0, true)} above midweek, Saturday ${percent(model.weekendLift.sat, locale, 0, true)}.`,
            )}
          </p>
        </Panel>
      </div>

      <Panel className="mt-4">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{tx('توقع 30 يوماً', 'Next 30 days')}</h2>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              {tx(
                'الخط الأساس للسلسلة الكاملة معاير على 26.9 مليون، ثم يُضرب في حصة التصفية الحالية. شكل كل يوم يتبع جمعة وسبت مصر مع ميل هبوط خفيف.',
                'The full-chain baseline is calibrated at 26.9 million, then scaled by the current filter share. Each day follows the Egypt Friday-Saturday pattern with a gentle downward drift.',
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select
              ariaLabel={tx('فرع التوقع', 'Forecast branch')}
              value={forecastBranch}
              onValueChange={setForecastBranch}
              className="w-full sm:w-52"
              options={[
                { value: 'all', label: tx('إجمالي الظاهر', 'Visible total') },
                ...model.options.filter((b) => b.currency === 'EGP').map((b) => ({ value: b.id, label: b.name })),
              ]}
            />
            <Seg value={range} onChange={setRange} options={[
              { id: 'both', label: tx('الشهر مع التوقع', 'Month + forecast') },
              { id: 'future', label: tx('30 يوماً فقط', '30 days only') },
            ]} />
            <Button onClick={() => exportRows('forecast.xlsx', 'Forecast', forecast.days.map((d) => ({ date: d.date, sales: Math.round(d.value) })))}>{tx('تصدير التوقع', 'Export forecast')}</Button>
          </div>
        </div>
        <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl bg-card px-4 py-4 ring-1 ring-foreground/10 sm:col-span-2 xl:col-span-2">
            <p className="text-sm text-muted-foreground">{tx('المبيعات المتوقعة', 'Forecast sales')}</p>
            <p className="num mt-2 text-2xl font-semibold sm:text-3xl">{money(forecast.total, locale)}</p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">{tx('المتوقع مقابل أغسطس', 'Projected versus August')} {percent(forecast.vsPrevious, locale, 1, true)}</p>
            <div className="mt-3">
              <Seg value={String(scenario)} onChange={(id) => setScenario(Number(id) as 1 | 0.9 | 1.1)} options={[
                { id: '0.9', label: tx('متحفظ -10%', 'Cautious -10%') },
                { id: '1', label: tx('الأساس', 'Baseline') },
                { id: '1.1', label: tx('متفائل +10%', 'Upside +10%') },
              ]} />
            </div>
          </div>
          <Kpi label={tx('المعدل اليومي', 'Daily rate')} value={money(forecast.dailyRate, locale)} hint={tx('على 30 يوماً', 'Across 30 days')} />
          <Kpi label={tx('يوم الذروة', 'Peak day')} value={weekdayName(forecast.peak.wd, locale)} hint={`${forecast.peak.date} · ${money(forecast.peak.value, locale)}`} />
          <Kpi label={tx('علاوة الويكند', 'Weekend lift')} value={`${percent(forecast.satLift, locale, 0, true)} / ${percent(forecast.friLift, locale, 0, true)}`} hint={tx('سبت / جمعة مقابل منتصف الأسبوع', 'Sat / Fri versus midweek')} />
        </div>
        <ChartContainer config={forecastConfig} className="aspect-auto h-64 w-full sm:h-80">
          <ComposedChart data={chart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="date" {...chartAxis} minTickGap={24} />
            <YAxis {...chartAxis} width={52} tickFormatter={(value) => compact(Number(value), locale)} />
            <MoneyTooltip locale={locale} />
            <ChartLegend content={<ChartLegendContent />} />
            <Area type="monotone" dataKey="band" stroke="none" fill="var(--chart-1)" fillOpacity={0.18} legendType="none" tooltipType="none" />
            <Line type="monotone" dataKey="actual" stroke="var(--color-actual)" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="forecast" stroke="var(--color-forecast)" strokeWidth={2.5} dot={false} />
            <Line type="monotone" dataKey="low" stroke="var(--color-low)" strokeDasharray="4 4" dot={false} strokeWidth={1.5} />
            <Line type="monotone" dataKey="high" stroke="var(--color-high)" strokeDasharray="4 4" dot={false} strokeWidth={1.5} />
          </ComposedChart>
        </ChartContainer>
      </Panel>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <RankList title={tx('أعلى الفروع', 'Top stores')} rows={model.branches.filter((b) => b.included).slice(0, 5)} locale={locale} start={1} step={1} onOpen={(id) => { setManagerId(id); setView('manager') }} openLabel={tx('افتح الفرع', 'Open store')} />
        <RankList title={tx('أقل الفروع', 'Softest stores')} rows={model.branches.filter((b) => b.included).slice(-5).reverse()} locale={locale} start={model.branches.filter((b) => b.included).length} step={-1} onOpen={(id) => { setManagerId(id); setView('manager') }} openLabel={tx('افتح الفرع', 'Open store')} />
      </div>
    </div>
  )
}

function RankList({
  title,
  rows,
  locale,
  start,
  step,
  onOpen,
  openLabel,
}: {
  title: string
  rows: { id: string; name: string; segment: string; periodSalesEgp: number; share: number; upt: number; target: number; unattributed: number; top3: number; currency: string; sales: number }[]
  locale: 'ar' | 'en'
  start: number
  step: number
  onOpen: (id: string) => void
  openLabel: string
}) {
  return (
    <Panel>
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      <ol className="space-y-2">
        {rows.map((row, index) => {
          const ratio = row.target ? (row.currency === 'QAR' ? row.sales : row.periodSalesEgp) / row.target : 0
          return (
          <li key={row.id}>
            <button type="button" onClick={() => onOpen(row.id)} className="flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-start hover:bg-white/6">
              <span className="num grid h-8 w-8 place-items-center rounded-full bg-white/6 text-sm">{start + index * step}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{row.name}</span>
                <span className="block text-xs text-[#a8b3c7]">{segmentLabel(row.segment as Segment, locale)} · {locale === 'ar' ? 'قطع الفاتورة' : 'units per receipt'} {num(row.upt, locale, 2)}</span>
              </span>
              <span className="text-end">
                <span className="num block text-sm">{money(row.periodSalesEgp, locale)}</span>
                <span className="block text-xs text-[#a8b3c7]">{percent(row.share, locale)}</span>
                {ratio >= 1 && <span className="block text-xs text-emerald-300">{locale === 'ar' ? 'الهدف' : 'Target'} {percent(ratio, locale, 0)}</span>}
                {ratio > 0 && ratio < 0.9 && <span className="block text-xs text-red-300">{locale === 'ar' ? 'الهدف' : 'Target'} {percent(ratio, locale, 0)}</span>}
                {row.unattributed >= 0.1 && <span className="block text-xs text-red-300">{locale === 'ar' ? 'غير منسوب' : 'Unattributed'} {percent(row.unattributed, locale, 0)}</span>}
                {row.top3 > 0.7 && <span className="block text-xs text-amber-200">{locale === 'ar' ? 'أعلى 3' : 'Top 3'} {percent(row.top3, locale, 0)}</span>}
              </span>
              <span className="sr-only">{openLabel}</span>
            </button>
          </li>
          )
        })}
      </ol>
    </Panel>
  )
}

