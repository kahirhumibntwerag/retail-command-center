import { useMemo, useState } from 'react'
import { Printer } from 'lucide-react'
import { Bar, CartesianGrid, Cell, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { buildExecutiveReport } from '../advisor'
import { MONTH_LABEL } from '../data'
import { exportRows } from '../excel'
import { branchDaily, forecastSeries, projectForecast } from '../engine'
import { compact, money, num, percent, weekdayName } from '../format'
import { useStore } from '../store'
import { AdvisorReport } from '../components/AdvisorReport'
import { Button, chartTipStyle, Kpi, Modal, PageHeader, Panel, Seg, Select, Trend } from '../components/kit'

export default function ExecutiveView() {
  const { model, locale, tx, dataset, setView, setManagerId } = useStore()
  const [kind, setKind] = useState<'monthly' | 'daily'>('monthly')
  const [printing, setPrinting] = useState(false)
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
  const brief = useMemo(() => buildExecutiveReport(model, locale, kind, {
    total: forecast.total,
    vsPrevious: forecast.vsPrevious,
    peakName: weekdayName(forecast.peak.wd, locale),
    peakDate: forecast.peak.date,
  }), [model, locale, kind, forecast])

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

      <AdvisorReport report={brief} kind={kind} onKind={setKind} onPrint={() => setPrinting(true)} />

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <Kpi emphasis label={tx('صافي المبيعات', 'Net sales')} value={money(model.kpis.sales, locale)} hint={tx('مجموع الفروع داخل الإجمالي', 'Sum of stores inside the chain total')} tone="gold" />
        <Kpi label={tx('القطع المباعة', 'Units')} value={num(Math.round(model.kpis.units), locale)} hint={tx(`${model.kpis.active} فرعاً نشطاً في الإجمالي`, `${model.kpis.active} stores in the total`)} />
        <Kpi label={tx('عدد الفواتير (TRX)', 'Receipts (TRX)')} value={num(Math.round(model.kpis.trx), locale)} hint="TRX = Σ receipts" />
        <Kpi label={tx('متوسط الفاتورة (ATV)', 'Average ticket (ATV)')} value={money(model.kpis.atv, locale)} hint="ATV = Σ sales ÷ Σ TRX" />
        <Kpi label={tx('سلة العميل (UPT)', 'Units per receipt (UPT)')} value={num(model.kpis.upt, locale, 2)} hint="UPT = Σ units ÷ Σ TRX" />
        <Kpi label={tx('متوسط سعر القطعة (UTV)', 'Unit value (UTV)')} value={money(model.kpis.utv, locale)} hint="UTV = Σ sales ÷ Σ units" />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-5">
        <Panel className="xl:col-span-3">
          <h2 className="text-lg font-semibold">{tx('المبيعات اليومية', 'Daily sales')}</h2>
          <p className="mb-3 flex flex-wrap gap-3 text-sm text-[#a8b3c7]">
            <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-primary" />{tx('جمعة وسبت', 'Friday and Saturday')}</span>
            <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-[#35527a]" />{tx('باقي الأسبوع', 'Other weekdays')}</span>
          </p>
          <p className="sr-only">{tx(`مبيعات يومية من 1 إلى ${model.daily.length}. أعلى يوم ظاهر ${model.daily.reduce((best, day) => (day.sales > best.sales ? day : best), model.daily[0])?.label ?? ''}.`, `Daily sales for days 1 to ${model.daily.length}.`)}</p>
          <div className="h-72" aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={model.daily}>
                <CartesianGrid stroke="rgba(255,255,255,.06)" vertical={false} />
                <XAxis dataKey="label" stroke="#93a0b8" fontSize={12} />
                <YAxis stroke="#93a0b8" fontSize={12} tickFormatter={(value) => compact(Number(value), locale)} />
                <Tooltip formatter={(value) => money(Number(value), locale)} contentStyle={chartTipStyle()} />
                <Bar dataKey="sales" radius={[6, 6, 0, 0]}>
                  {model.daily.map((day) => (
                    <Cell key={day.label} fill={day.weekend ? 'var(--primary)' : '#35527a'} />
                  ))}
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div className="rounded-2xl bg-muted/60 p-3">
              <p className="text-xs text-muted-foreground">{tx('معدل النصف الأول', 'First-half daily rate')}</p>
              <p className="num mt-1 text-lg">{money(model.h1Rate, locale)}</p>
            </div>
            <div className="rounded-2xl bg-muted/60 p-3">
              <p className="text-xs text-muted-foreground">{tx('معدل النصف الثاني', 'Second-half daily rate')}</p>
              <p className="num mt-1 text-lg">{money(model.h2Rate, locale)} <Trend ratio={model.h2Delta}>{percent(model.h2Delta, locale, 1, true)}</Trend></p>
            </div>
          </div>
        </Panel>
        <Panel className="xl:col-span-2">
          <h2 className="text-lg font-semibold">{tx('حسب أيام الأسبوع', 'By weekday')}</h2>
          <p className="mb-3 text-sm text-muted-foreground">{tx('متوسط اليوم مقسوماً على عدد مرات تكراره.', 'Average of that weekday across the month.')}</p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={model.weekdays.map((day) => ({ ...day, name: weekdayName(day.key, locale) }))}>
                <CartesianGrid stroke="rgba(255,255,255,.06)" vertical={false} />
                <XAxis dataKey="name" stroke="#93a0b8" fontSize={12} />
                <YAxis stroke="#93a0b8" fontSize={12} tickFormatter={(value) => compact(Number(value), locale)} />
                <Tooltip formatter={(value) => money(Number(value), locale)} contentStyle={chartTipStyle()} />
                <Bar dataKey="avg" fill="#7eb6ff" radius={[6, 6, 0, 0]} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
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
              className="w-52"
              options={[
                { value: 'all', label: tx('إجمالي الظاهر', 'Visible total') },
                ...model.options.filter((b) => b.currency === 'EGP').map((b) => ({ value: b.id, label: b.name })),
              ]}
            />
            <Seg value={String(scenario)} onChange={(id) => setScenario(Number(id) as 1 | 0.9 | 1.1)} options={[
              { id: '0.9', label: tx('متحفظ -10%', 'Cautious -10%') },
              { id: '1', label: tx('الأساس', 'Baseline') },
              { id: '1.1', label: tx('متفائل +10%', 'Upside +10%') },
            ]} />
            <Seg value={range} onChange={setRange} options={[
              { id: 'both', label: tx('الشهر مع التوقع', 'Month + forecast') },
              { id: 'future', label: tx('30 يوماً فقط', '30 days only') },
            ]} />
            <Button onClick={() => exportRows('forecast.xlsx', 'Forecast', forecast.days.map((d) => ({ date: d.date, sales: Math.round(d.value) })))}>{tx('تصدير التوقع', 'Export forecast')}</Button>
          </div>
        </div>
        <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi label={tx('المبيعات المتوقعة', 'Forecast sales')} value={money(forecast.total, locale)} hint={<Trend ratio={forecast.vsPrevious}>{percent(forecast.vsPrevious, locale, 1, true)} {tx('مقابل الشهر', 'versus this month')}</Trend>} tone={forecast.vsPrevious < 0 ? 'bad' : 'good'} />
          <Kpi label={tx('المعدل اليومي', 'Daily rate')} value={money(forecast.dailyRate, locale)} hint={tx('على 30 يوماً', 'Across 30 days')} />
          <Kpi label={tx('يوم الذروة', 'Peak day')} value={weekdayName(forecast.peak.wd, locale)} hint={`${forecast.peak.date} · ${money(forecast.peak.value, locale)}`} />
          <Kpi label={tx('علاوة الويكند', 'Weekend lift')} value={`${percent(forecast.satLift, locale, 0, true)} / ${percent(forecast.friLift, locale, 0, true)}`} hint={tx('سبت / جمعة مقابل منتصف الأسبوع', 'Sat / Fri versus midweek')} />
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chart}>
              <CartesianGrid stroke="rgba(255,255,255,.06)" vertical={false} />
              <XAxis dataKey="date" stroke="#93a0b8" fontSize={11} minTickGap={24} />
              <YAxis stroke="#93a0b8" fontSize={12} tickFormatter={(value) => compact(Number(value), locale)} />
              <Tooltip formatter={(value) => (value == null ? '—' : money(Number(value), locale))} contentStyle={chartTipStyle()} />
              <Legend />
              <Line type="monotone" dataKey="actual" name={tx('الفعلي', 'Actual')} stroke="#f7f4ee" strokeWidth={2} dot={false} connectNulls={false} />
              <Line type="monotone" dataKey="low" name={tx('النطاق الأدنى', 'Lower band')} stroke="#7eb6ff" strokeDasharray="4 4" dot={false} />
              <Line type="monotone" dataKey="forecast" name={tx('التوقع', 'Forecast')} stroke="var(--primary)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="high" name={tx('النطاق الأعلى', 'Upper band')} stroke="#3dcea0" strokeDasharray="4 4" dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <RankList title={tx('أعلى الفروع', 'Top stores')} rows={model.branches.filter((b) => b.included).slice(0, 5)} locale={locale} start={1} step={1} onOpen={(id) => { setManagerId(id); setView('manager') }} openLabel={tx('افتح الفرع', 'Open store')} />
        <RankList title={tx('أقل الفروع', 'Softest stores')} rows={model.branches.filter((b) => b.included).slice(-5).reverse()} locale={locale} start={model.branches.filter((b) => b.included).length} step={-1} onOpen={(id) => { setManagerId(id); setView('manager') }} openLabel={tx('افتح الفرع', 'Open store')} />
      </div>

      {printing && (
        <Modal title={tx('تقرير المستشار', 'Advisor report')} wide print onClose={() => setPrinting(false)}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-2xl font-semibold">{brief.headline}</h2>
            <div className="flex gap-2">
              <Button onClick={() => window.print()}><Printer size={16} />{tx('طباعة', 'Print')}</Button>
              <Button onClick={() => setPrinting(false)}>{tx('إغلاق', 'Close')}</Button>
            </div>
          </div>
          <div className="space-y-3 text-sm leading-7">
            <p>{brief.reading}</p>
            <p>{brief.shape}</p>
            <p>{brief.move}</p>
            <ul className="list-disc ps-5">
              {brief.priorities.map((item) => <li key={item.id}>{item.title} — {item.action}</li>)}
            </ul>
            <p className="text-muted-foreground">{brief.formula}</p>
          </div>
        </Modal>
      )}
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
  rows: { id: string; name: string; segment: string; periodSalesEgp: number; share: number; upt: number }[]
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
        {rows.map((row, index) => (
          <li key={row.id}>
            <button type="button" onClick={() => onOpen(row.id)} className="flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-start hover:bg-white/6">
              <span className="num grid h-8 w-8 place-items-center rounded-full bg-white/6 text-sm">{start + index * step}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{row.name}</span>
                <span className="block text-xs text-[#a8b3c7]">{row.segment} · UPT {num(row.upt, locale, 2)}</span>
              </span>
              <span className="text-end">
                <span className="num block text-sm">{money(row.periodSalesEgp, locale)}</span>
                <span className="block text-xs text-[#a8b3c7]">{percent(row.share, locale)}</span>
              </span>
              <span className="sr-only">{openLabel}</span>
            </button>
          </li>
        ))}
      </ol>
    </Panel>
  )
}

