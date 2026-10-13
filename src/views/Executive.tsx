import { useMemo, useState } from 'react'
import type { ApexOptions } from 'apexcharts'
import { MONTH_LABEL } from '../data'
import { exportRows } from '../excel'
import { buildExecutiveReport } from '../advisor'
import { branchDaily, forecastSeries, projectForecast, segmentLabel } from '../engine'
import { compact, money, num, percent, weekdayName } from '../format'
import { useStore } from '../store'
import type { Segment } from '../types'
import {
  PrettyBar,
  PrettyForecast,
  PrettyGauge,
  categoryX,
  compactYAxis,
  moneyTooltip,
  useChartColors,
} from '../components/prettyCharts'
import { Button, Kpi, PageHeader, Panel, Pill, Seg, Select, Trend } from '../components/kit'

export default function ExecutiveView() {
  const { model, locale, tx, dataset, filters, setView, setManagerId, setAdvisorOpen } = useStore()
  const colors = useChartColors()
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
  const chart = forecastSeries(range === 'future' ? [] : actualPoints, forecast.days, range)
  const included = model.branches.filter((branch) => branch.included)
  const fullTarget = included.reduce((sum, branch) => sum + branch.target, 0)
  const target = fullTarget * (filters.period === 'full' ? 1 : model.daily.length / 31)
  const achievement = target ? model.kpis.sales / target : 0
  const targetTone = achievement >= 1 ? 'good' : achievement < 0.9 ? 'bad' : 'warn'
  const uptTone = model.kpis.upt >= 2 ? 'good' : model.kpis.upt < 1.5 ? 'bad' : 'warn'
  const forecastTone = forecast.vsPrevious > 0.005 ? 'good' : forecast.vsPrevious < -0.005 ? 'bad' : 'warn'
  const headline = buildExecutiveReport(model, locale, 'monthly').headline
  const critical = model.alerts.filter((alert) => alert.severity === 'critical')
  const targetChip =
    targetTone === 'good' ? 'border-transparent bg-emerald-400/15 text-emerald-200' :
    targetTone === 'bad' ? 'border-transparent bg-destructive/15 text-red-200' :
    'border-transparent bg-amber-400/15 text-amber-200'
  const heroAccent =
    targetTone === 'good' ? 'border-s-emerald-400/70' :
    targetTone === 'bad' ? 'border-s-red-400/70' :
    'border-s-amber-400/70'

  const peakDay = model.daily.reduce((best, day) => (day.sales > best.sales ? day : best), model.daily[0])
  const dailyOptions = useMemo<ApexOptions>(() => ({
    chart: { type: 'bar' },
    plotOptions: {
      bar: {
        distributed: true,
        columnWidth: '92%',
        borderRadius: 3,
        borderRadiusApplication: 'end',
      },
    },
    fill: { type: 'solid', opacity: 1 },
    xaxis: categoryX(model.daily.map((day) => day.label), {
      labels: { rotate: 0, hideOverlappingLabels: true },
      tickAmount: Math.min(model.daily.length, 10),
    }),
    yaxis: compactYAxis((value) => compact(value, locale)),
    tooltip: {
      theme: 'dark',
      y: {
        formatter: (value, opts) => {
          const day = model.daily[opts?.dataPointIndex ?? 0]
          const amount = money(Number(value ?? 0), locale)
          if (!day) return amount
          return day.weekend
            ? `${amount} · ${tx('جمعة/سبت', 'Weekend')}`
            : amount
        },
      },
    },
    colors: model.daily.map((day) => (day.weekend ? colors.gold : colors.blue)),
    legend: { show: false },
    dataLabels: { enabled: false },
  }), [colors.blue, colors.gold, locale, model.daily, tx])
  const dailySeries = useMemo(() => [
    { name: tx('المبيعات', 'Sales'), data: model.daily.map((day) => Math.round(day.sales)) },
  ], [model.daily, tx])

  const weekdays = useMemo(
    () => model.weekdays.map((day) => ({ ...day, name: weekdayName(day.key, locale), weekend: day.key === 5 || day.key === 6 })),
    [locale, model.weekdays],
  )
  const midweekAvg = useMemo(() => {
    const mid = weekdays.filter((day) => !day.weekend)
    return mid.length ? mid.reduce((sum, day) => sum + day.avg, 0) / mid.length : 0
  }, [weekdays])
  const weekdayOptions = useMemo<ApexOptions>(() => ({
    chart: { type: 'bar' },
    plotOptions: {
      bar: {
        horizontal: true,
        distributed: true,
        barHeight: '78%',
        borderRadius: 4,
        dataLabels: { position: 'top' },
      },
    },
    fill: { type: 'solid', opacity: 1 },
    xaxis: {
      categories: weekdays.map((day) => day.name),
      labels: { formatter: (value) => compact(Number(value), locale) },
    },
    yaxis: {
      labels: { style: { colors: colors.muted, fontSize: '11px' } },
    },
    colors: weekdays.map((day) => (day.weekend ? colors.gold : colors.blue)),
    dataLabels: {
      enabled: true,
      formatter: (value) => compact(Number(value), locale),
      offsetX: 4,
      style: { colors: [colors.foreground], fontSize: '10px', fontWeight: 600 },
      background: { enabled: false },
      dropShadow: { enabled: false },
    },
    tooltip: moneyTooltip((value) => money(Number(value ?? 0), locale)),
    legend: { show: false },
    annotations: midweekAvg > 0 ? {
      xaxis: [{
        x: midweekAvg,
        borderColor: colors.muted,
        strokeDashArray: 4,
        label: {
          text: tx('منتصف الأسبوع', 'Midweek avg'),
          orientation: 'horizontal',
          borderWidth: 0,
          style: { color: colors.muted, background: 'transparent', fontSize: '10px' },
        },
      }],
    } : undefined,
    grid: { xaxis: { lines: { show: true } }, yaxis: { lines: { show: false } } },
  }), [colors.blue, colors.foreground, colors.gold, colors.muted, locale, midweekAvg, tx, weekdays])
  const weekdaySeries = useMemo(() => [
    { name: tx('متوسط اليوم', 'Day average'), data: weekdays.map((day) => Math.round(day.avg)) },
  ], [tx, weekdays])

  const forecastOptions = useMemo<ApexOptions>(() => ({
    xaxis: categoryX(chart.map((point) => point.date), {
      labels: { hideOverlappingLabels: true, trim: true },
      tickAmount: 8,
    }),
    yaxis: compactYAxis((value) => compact(value, locale)),
    tooltip: moneyTooltip((value) => (value == null ? '—' : money(value, locale))),
  }), [chart, locale])
  const forecastSeriesData = useMemo(() => [
    {
      name: tx('النطاق', 'Band'),
      type: 'rangeArea',
      data: chart.map((point) => (
        point.low != null && point.high != null
          ? { x: point.date, y: [Math.round(point.low), Math.round(point.high)] }
          : { x: point.date, y: [null, null] }
      )),
    },
    {
      name: tx('الفعلي', 'Actual'),
      type: 'line',
      data: chart.map((point) => ({ x: point.date, y: point.actual != null ? Math.round(point.actual) : null })),
    },
    {
      name: tx('التوقع', 'Forecast'),
      type: 'line',
      data: chart.map((point) => ({ x: point.date, y: point.forecast != null ? Math.round(point.forecast) : null })),
    },
  ], [chart, tx])

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

      <section className="grid gap-2 lg:grid-cols-5">
        <div className={`rounded-xl border-s-2 bg-card p-3 ring-1 ring-foreground/10 lg:col-span-3 ${heroAccent}`}>
          <div className="grid gap-3 sm:grid-cols-[1fr_150px] sm:items-center">
            <div>
              <p className="text-xs text-muted-foreground">{tx('صافي المبيعات', 'Net sales')}</p>
              <p className="num mt-0.5 text-xl font-semibold text-primary sm:text-2xl">{money(model.kpis.sales, locale)}</p>
              <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-muted-foreground">{tx('مقابل المستهدف', 'Against target')}</span>
                <span className={`num inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${targetChip}`}>{percent(achievement, locale, 0)}</span>
                <span className="num text-muted-foreground">· {money(target, locale)}</span>
              </p>
              <p className="mt-1.5 text-xs">
                {tx('تغيّر النصف الثاني', 'Second-half change')}{' '}
                <Trend ratio={model.h2Delta}>{percent(model.h2Delta, locale, 1, true)}</Trend>
                <span className="text-muted-foreground"> · {money(model.h2Rate, locale)} {tx('في اليوم', 'a day')}</span>
              </p>
              <button type="button" onClick={() => setAdvisorOpen(true)} className="mt-2.5 text-start text-xs leading-5 text-primary hover:underline sm:text-sm">
                {headline}
              </button>
            </div>
            <PrettyGauge
              value={achievement}
              label={tx('تحقيق الهدف', 'Target hit')}
              tone={targetTone === 'good' ? 'good' : targetTone === 'bad' ? 'bad' : 'warn'}
              height="compact"
              title={tx('تحقيق الهدف', 'Target hit')}
              summary={tx(`تحقيق الهدف ${percent(achievement, locale, 0)} من ${money(target, locale)}.`, `Target hit ${percent(achievement, locale, 0)} of ${money(target, locale)}.`)}
            />
          </div>
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
              className="rounded-xl border border-red-400/35 border-s-2 border-s-red-400/80 bg-red-500/10 p-2.5 text-start"
            >
              <Pill tone="bad">{tx('حرج', 'Critical')}</Pill>
              <p className="mt-1.5 text-sm font-medium">{tx(alert.titleAr, alert.titleEn)}</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{tx(alert.actionAr, alert.actionEn)}</p>
            </button>
          ))}
          {critical.length === 0 && <p className="rounded-xl bg-card p-3 text-xs text-muted-foreground ring-1 ring-foreground/10">{tx('لا تنبيه حرج داخل هذه التصفية.', 'No critical alert inside this filter.')}</p>}
        </div>
      </section>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
        <Kpi className="xl:col-span-2" label={tx('القطع المباعة', 'Units')} value={num(Math.round(model.kpis.units), locale)} hint={tx(`${model.kpis.active} فرعاً نشطاً في الإجمالي`, `${model.kpis.active} stores in the total`)} />
        <Kpi className="xl:col-span-2" label={tx('عدد الفواتير', 'Receipts')} value={num(Math.round(model.kpis.trx), locale)} hint={tx('مجموع الفواتير', 'Sum of receipts')} />
        <Kpi className="xl:col-span-2" label={tx('متوسط الفاتورة', 'Average ticket')} value={money(model.kpis.atv, locale)} hint="ATV = Σ sales ÷ Σ TRX" tone="gold" />
        <Kpi className="xl:col-span-2" label={tx('قطع الفاتورة', 'Units per receipt')} value={num(model.kpis.upt, locale, 2)} hint="UPT = Σ units ÷ Σ TRX" tone={uptTone} />
        <Kpi className="xl:col-span-2" label={tx('متوسط سعر القطعة', 'Unit value')} value={money(model.kpis.utv, locale)} hint="UTV = Σ sales ÷ Σ units" tone="gold" />
      </div>

      <div className="mt-3 grid gap-2 xl:grid-cols-5">
        <Panel className="xl:col-span-3">
          <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold sm:text-base">{tx('المبيعات اليومية', 'Daily sales')}</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {tx(
                  `عمود لكل يوم · الذروة يوم ${peakDay?.label ?? '—'}`,
                  `One bar per day · peak on day ${peakDay?.label ?? '—'}`,
                )}
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-sm bg-chart-2" aria-hidden="true" />
                {tx('أيام الأسبوع', 'Weekdays')}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-sm bg-chart-1" aria-hidden="true" />
                {tx('جمعة وسبت', 'Fri & Sat')}
              </span>
            </div>
          </div>
          <PrettyBar
            series={dailySeries}
            options={dailyOptions}
            height="panel"
            distributed
            title={tx('المبيعات اليومية', 'Daily sales')}
            summary={tx(
              `مبيعات يومية من 1 إلى ${model.daily.length}. أعلى يوم ظاهر ${peakDay?.label ?? ''}.`,
              `Daily sales for days 1 to ${model.daily.length}. Peak visible day ${peakDay?.label ?? ''}.`,
            )}
          />
        </Panel>
        <Panel className="xl:col-span-2">
          <div className="mb-2">
            <h2 className="text-sm font-semibold sm:text-base">{tx('حسب أيام الأسبوع', 'By weekday')}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {tx('متوسط المبيعات لكل يوم من أيام الأسبوع.', 'Average sales for each day of the week.')}
            </p>
          </div>
          <p className="mb-2 rounded-md bg-primary/10 px-2.5 py-1.5 text-[11px] leading-4 text-primary">
            {tx(
              `الجمعة أعلى من منتصف الأسبوع ${percent(model.weekendLift.fri, locale, 0, true)} · السبت ${percent(model.weekendLift.sat, locale, 0, true)}`,
              `Friday ${percent(model.weekendLift.fri, locale, 0, true)} above midweek · Saturday ${percent(model.weekendLift.sat, locale, 0, true)}`,
            )}
          </p>
          <PrettyBar
            series={weekdaySeries}
            options={weekdayOptions}
            height="panel"
            horizontal
            distributed
            title={tx('حسب أيام الأسبوع', 'By weekday')}
            summary={tx(
              `الجمعة أعلى من منتصف الأسبوع بنسبة ${percent(model.weekendLift.fri, locale, 0, true)} والسبت بنسبة ${percent(model.weekendLift.sat, locale, 0, true)}.`,
              `Friday runs ${percent(model.weekendLift.fri, locale, 0, true)} above midweek, Saturday ${percent(model.weekendLift.sat, locale, 0, true)}.`,
            )}
          />
        </Panel>
      </div>

      <Panel className="mt-3">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold sm:text-base">{tx('توقع 30 يوماً', 'Next 30 days')}</h2>
            <p className="mt-1 max-w-3xl text-xs text-muted-foreground">
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
        <div className="mb-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <div className={`rounded-xl border-s-2 bg-card px-3 py-2.5 ring-1 ring-foreground/10 sm:col-span-2 xl:col-span-2 ${
            forecastTone === 'good' ? 'border-s-emerald-400/70' : forecastTone === 'bad' ? 'border-s-red-400/70' : 'border-s-amber-400/70'
          }`}>
            <p className="text-xs text-muted-foreground">{tx('المبيعات المتوقعة', 'Forecast sales')}</p>
            <p className="num mt-1 text-xl font-semibold text-primary sm:text-2xl">{money(forecast.total, locale)}</p>
            <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] leading-4">
              <span className="text-muted-foreground">{tx('المتوقع مقابل أغسطس', 'Projected versus August')}</span>
              <Trend ratio={forecast.vsPrevious}>{percent(forecast.vsPrevious, locale, 1, true)}</Trend>
            </p>
            <div className="mt-2">
              <Seg value={String(scenario)} onChange={(id) => setScenario(Number(id) as 1 | 0.9 | 1.1)} options={[
                { id: '0.9', label: tx('متحفظ -10%', 'Cautious -10%') },
                { id: '1', label: tx('الأساس', 'Baseline') },
                { id: '1.1', label: tx('متفائل +10%', 'Upside +10%') },
              ]} />
            </div>
          </div>
          <Kpi label={tx('المعدل اليومي', 'Daily rate')} value={money(forecast.dailyRate, locale)} hint={tx('على 30 يوماً', 'Across 30 days')} tone="gold" />
          <Kpi label={tx('يوم الذروة', 'Peak day')} value={weekdayName(forecast.peak.wd, locale)} hint={`${forecast.peak.date} · ${money(forecast.peak.value, locale)}`} tone="gold" />
          <Kpi label={tx('علاوة الويكند', 'Weekend lift')} value={`${percent(forecast.satLift, locale, 0, true)} / ${percent(forecast.friLift, locale, 0, true)}`} hint={tx('سبت / جمعة مقابل منتصف الأسبوع', 'Sat / Fri versus midweek')} tone="good" />
        </div>
        <PrettyForecast
          series={forecastSeriesData}
          options={forecastOptions}
          height="hero"
          title={tx('توقع 30 يوماً', 'Next 30 days')}
          summary={tx(
            `المبيعات المتوقعة ${money(forecast.total, locale)} بمعدل يومي ${money(forecast.dailyRate, locale)}.`,
            `Forecast sales ${money(forecast.total, locale)} at a daily rate of ${money(forecast.dailyRate, locale)}.`,
          )}
        />
      </Panel>

      <div className="mt-3 grid gap-2 lg:grid-cols-2">
        <RankList variant="top" title={tx('أعلى الفروع', 'Top stores')} rows={model.branches.filter((b) => b.included).slice(0, 5)} locale={locale} start={1} step={1} onOpen={(id) => { setManagerId(id); setView('manager') }} openLabel={tx('افتح الفرع', 'Open store')} />
        <RankList variant="soft" title={tx('أقل الفروع', 'Softest stores')} rows={model.branches.filter((b) => b.included).slice(-5).reverse()} locale={locale} start={model.branches.filter((b) => b.included).length} step={-1} onOpen={(id) => { setManagerId(id); setView('manager') }} openLabel={tx('افتح الفرع', 'Open store')} />
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
  variant,
}: {
  title: string
  rows: { id: string; name: string; segment: string; periodSalesEgp: number; share: number; upt: number; target: number; unattributed: number; top3: number; currency: string; sales: number }[]
  locale: 'ar' | 'en'
  start: number
  step: number
  onOpen: (id: string) => void
  openLabel: string
  variant: 'top' | 'soft'
}) {
  return (
    <Panel>
      <h2 className="mb-2 text-sm font-semibold sm:text-base">{title}</h2>
      <ol className="space-y-1">
        {rows.map((row, index) => {
          const ratio = row.target ? (row.currency === 'QAR' ? row.sales : row.periodSalesEgp) / row.target : 0
          const flagged = row.unattributed >= 0.1 || (ratio > 0 && ratio < 0.9) || row.top3 > 0.7
          return (
          <li key={row.id}>
            <button
              type="button"
              onClick={() => onOpen(row.id)}
              className={`flex w-full items-center gap-2 rounded-lg px-1.5 py-1.5 text-start hover:bg-white/6 ${
                variant === 'soft' && flagged ? 'bg-red-500/5 ring-1 ring-red-400/20' : ''
              }`}
            >
              <span className={`num grid h-7 w-7 place-items-center rounded-full text-xs ${
                variant === 'top'
                  ? 'bg-primary/15 text-primary'
                  : 'bg-red-400/15 text-red-200'
              }`}>{start + index * step}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{row.name}</span>
                <span className="block text-[11px] text-muted-foreground">{segmentLabel(row.segment as Segment, locale)} · {locale === 'ar' ? 'قطع الفاتورة' : 'units per receipt'} {num(row.upt, locale, 2)}</span>
              </span>
              <span className="flex flex-col items-end gap-0.5 text-end">
                <span className="num block text-xs">{money(row.periodSalesEgp, locale)}</span>
                <span className="block text-[11px] text-muted-foreground">{percent(row.share, locale)}</span>
                <span className="flex flex-wrap justify-end gap-1">
                  {ratio >= 1 && <Pill tone="good">{locale === 'ar' ? 'الهدف' : 'Target'} {percent(ratio, locale, 0)}</Pill>}
                  {ratio > 0 && ratio < 0.9 && <Pill tone="bad">{locale === 'ar' ? 'الهدف' : 'Target'} {percent(ratio, locale, 0)}</Pill>}
                  {row.unattributed >= 0.1 && <Pill tone="bad">{locale === 'ar' ? 'غير منسوب' : 'Unattributed'} {percent(row.unattributed, locale, 0)}</Pill>}
                  {row.top3 > 0.7 && <Pill tone="warn">{locale === 'ar' ? 'أعلى 3' : 'Top 3'} {percent(row.top3, locale, 0)}</Pill>}
                </span>
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
