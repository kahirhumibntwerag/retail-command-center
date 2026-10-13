import { useMemo, useState } from 'react'
import type { ApexOptions } from 'apexcharts'
import { exportRows } from '../excel'
import { num, percent } from '../format'
import { useStore } from '../store'
import {
  PrettyBar,
  PrettyCombo,
  categoryX,
  dualAxisPercent,
  useChartColors,
} from '../components/prettyCharts'
import { useDirection } from '@/components/ui/direction'
import { Button, cx, Kpi, PageHeader, Panel, Pill, Seg, Stat, TableWrap, toneAccent } from '../components/kit'

type Tab = 'pareto' | 'allocation' | 'dcs' | 'dead'

export default function AssortmentView() {
  const { model, locale, tx } = useStore()
  const colors = useChartColors()
  const dir = useDirection()
  const [tab, setTab] = useState<Tab>('pareto')
  const tier50 = model.pareto.filter((row) => row.tier === '50').length
  const tier80 = model.pareto.filter((row) => row.tier !== 'tail').length
  const dead = model.pareto.filter((row) => row.model.units <= 10)
  const chart = useMemo(
    () => model.pareto.slice(0, 16).map((row) => ({ code: row.model.code, units: row.model.units, cumulative: Math.round(row.cumulative * 1000) / 10 })),
    [model.pareto],
  )
  const paretoOptions = useMemo<ApexOptions>(() => ({
    colors: [colors.blue, colors.gold],
    stroke: { width: [0, 3] },
    xaxis: categoryX(chart.map((row) => row.code), {
      labels: { rotate: dir === 'rtl' ? 35 : -35, trim: true, hideOverlappingLabels: true },
    }),
    yaxis: dualAxisPercent({
      leftTitle: tx('القطع', 'Units'),
      rightTitle: tx('تراكمي %', 'Cumulative %'),
      leftFormat: (value) => num(value, locale),
      rightFormat: (value) => `${num(value, locale, 0)}%`,
      rtl: dir === 'rtl',
    }),
    tooltip: {
      shared: true,
      y: {
        formatter: (value, opts) => (
          opts?.seriesIndex === 1 ? `${num(Number(value ?? 0), locale, 1)}%` : num(Number(value ?? 0), locale)
        ),
      },
    },
  }), [chart, colors.blue, colors.gold, dir, locale, tx])
  const paretoSeries = useMemo(() => [
    { name: tx('القطع', 'Units'), type: 'column', data: chart.map((row) => row.units) },
    { name: tx('تراكمي', 'Cumulative'), type: 'line', data: chart.map((row) => row.cumulative) },
  ], [chart, tx])

  const dcsMean = model.dcs.length ? model.dcs.reduce((s, r) => s + r.chainShare, 0) / model.dcs.length : 0
  const dcsOptions = useMemo<ApexOptions>(() => ({
    xaxis: {
      categories: model.dcs.map((row) => row.category),
      max: Math.max(...model.dcs.map((row) => Math.round(row.chainShare * 1000) / 10), 1),
      labels: {
        formatter: (value) => {
          const n = Number(value)
          return Number.isFinite(n) ? `${num(n, locale, 1)}%` : String(value)
        },
      },
    },
    colors: model.dcs.map((row) => (
      row.chainShare >= dcsMean * 1.25 ? colors.teal :
      row.chainShare <= dcsMean * 0.6 ? colors.amber :
      colors.blue
    )),
    dataLabels: {
      enabled: true,
      formatter: (value) => `${num(Number(value), locale, 1)}%`,
    },
    tooltip: {
      y: {
        formatter: (_value, opts) => {
          const row = model.dcs[opts?.dataPointIndex ?? 0]
          return row ? `${num(row.units, locale)} · ${percent(row.chainShare, locale)}` : ''
        },
      },
    },
    legend: { show: false },
  }), [colors.amber, colors.blue, colors.teal, dcsMean, locale, model.dcs])
  const dcsSeries = useMemo(() => [{
    name: tx('حصة الفئة', 'Category share'),
    data: model.dcs.map((row) => Math.round(row.chainShare * 1000) / 10),
  }], [model.dcs, tx])

  return (
    <div>
      <PageHeader
        eyebrow={tx('التشكيلة', 'Assortment')}
        title={tx('الموديلات والتوزيع', 'Styles and allocation')}
        subtitle={tx('باريتو 50/80، فجوات الإرسال، وانحراف الفئات، ثم الراكد الذي يستحق الترحيل إلى شبرا.', 'Pareto 50/80, send gaps, category deviation, then the dead styles that belong in Shubra.')}
        actions={<Button onClick={() => exportRows('models.xlsx', 'Models', model.pareto.map((row) => ({ code: row.model.code, name: row.model.name, units: row.model.units, cumulative: row.cumulative, tier: row.tier })))}>{tx('تصدير', 'Export')}</Button>}
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        <Kpi label={tx('الموديلات', 'Styles')} value={String(model.pareto.length)} hint="" />
        <Kpi label={tx('تصنع 50%', 'Make 50%')} value={String(tier50)} hint="" tone="gold" />
        <Kpi label={tx('تصنع 80%', 'Make 80%')} value={String(tier80)} hint="" tone="good" />
        <Kpi label={tx('راكد ≤ 10', 'Dead ≤ 10')} value={String(dead.length)} hint="" tone="bad" />
      </div>
      <Seg value={tab} onChange={setTab} options={[
        { id: 'pareto', label: tx('باريتو', 'Pareto') },
        { id: 'allocation', label: `${tx('فحص التوزيع', 'Allocation')} ${model.allocation.length}` },
        { id: 'dcs', label: tx('انحراف الفئات', 'Category mix') },
        { id: 'dead', label: tx('الراكد', 'Dead stock') },
      ]} />

      {tab === 'pareto' && (
        <Panel className="mt-4">
          <PrettyCombo
            series={paretoSeries}
            options={paretoOptions}
            height="panel"
            title={tx('باريتو', 'Pareto')}
            summary={tx(
              `أعلى 16 موديلاً. ${tier50} تصنع 50٪ و${tier80} تصنع 80٪.`,
              `Top 16 styles. ${tier50} make 50% and ${tier80} make 80%.`,
            )}
          />
          <div className="mt-4 flex flex-col gap-2 md:hidden">
            {model.pareto.map((row, index) => (
              <article key={row.model.code} className="rounded-2xl bg-muted/50 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">#{index + 1} · {row.model.code}</p>
                    <p className="font-medium">{row.model.name}</p>
                  </div>
                  <Pill tone={row.tier === '50' ? 'gold' : row.tier === '80' ? 'neutral' : 'warn'}>{row.tier === 'tail' ? tx('ذيل', 'Long tail') : row.tier === '50' ? '50%' : '80%'}</Pill>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Stat label={tx('القطع', 'Units')} value={num(row.model.units, locale)} />
                  <Stat label={tx('تراكمي', 'Cumulative')} value={percent(row.cumulative, locale, 1)} />
                </div>
              </article>
            ))}
          </div>
          <TableWrap className="hidden md:block">
            <table className="mt-4 w-full min-w-[640px] text-sm">
              <thead className="text-muted-foreground"><tr><th className="px-2 py-2 text-start">#</th><th className="px-2 py-2 text-start">{tx('الكود', 'Code')}</th><th className="px-2 py-2 text-start">{tx('الوصف', 'Description')}</th><th className="px-2 py-2 text-start">{tx('القطع', 'Units')}</th><th className="px-2 py-2 text-start">{tx('تراكمي', 'Cumulative')}</th><th className="px-2 py-2 text-start">{tx('الشريحة', 'Tier')}</th></tr></thead>
              <tbody>
                {model.pareto.map((row, index) => (
                  <tr key={row.model.code} className="border-t border-white/8">
                    <td className="num px-2 py-2">{index + 1}</td>
                    <td className="px-2 py-2">{row.model.code}</td>
                    <td className="px-2 py-2">{row.model.name}</td>
                    <td className="num px-2 py-2">{num(row.model.units, locale)}</td>
                    <td className="num px-2 py-2">{percent(row.cumulative, locale, 1)}</td>
                    <td className="px-2 py-2"><Pill tone={row.tier === '50' ? 'gold' : row.tier === '80' ? 'neutral' : 'warn'}>{row.tier === 'tail' ? tx('ذيل', 'Long tail') : row.tier === '50' ? '50%' : '80%'}</Pill></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        </Panel>
      )}

      {tab === 'allocation' && (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-muted-foreground">{tx('فئة وزنها 5% أو أكثر في السلسلة ومبيعاتها صفر داخل فرع من نفس الشريحة.', 'A category with at least 5% of chain units and zero sales in a store from the same segment.')}</p>
          {model.allocation.length === 0 && <Panel><p>{tx('لا فجوات داخل التصفية الحالية.', 'No gaps inside the current filter.')}</p></Panel>}
          {model.allocation.map((gap) => (
            <Panel key={`${gap.branchName}-${gap.category}`} className={cx('border-s-2', toneAccent('bad'))}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold">{gap.branchName}</h3>
                <Pill tone="bad">{gap.category}</Pill>
              </div>
              <p className="mt-2 text-sm leading-6">{tx(`حصة الفئة في السلسلة ${percent(gap.segmentShare, locale)} والمباع في الفرع صفر. افحص الإرسال قبل الحكم على الطلب.`, `Chain share is ${percent(gap.segmentShare, locale)} and the store sold zero. Check the send before blaming demand.`)}</p>
            </Panel>
          ))}
        </div>
      )}

      {tab === 'dcs' && (
        <Panel className="mt-4">
          <p className="mb-3 text-sm text-muted-foreground">{tx('حصة كل فئة من قطع ملف التشكيلة.', 'Share of each category in the style file.')}</p>
          <PrettyBar
            series={dcsSeries}
            options={dcsOptions}
            height="panel"
            horizontal
            distributed
            title={tx('انحراف الفئات', 'Category mix')}
            summary={tx(
              `حصص ${model.dcs.length} فئة من ملف التشكيلة.`,
              `Share of ${model.dcs.length} categories in the style file.`,
            )}
          />
        </Panel>
      )}

      {tab === 'dead' && (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {dead.map((row) => (
            <Panel key={row.model.code} className={cx('border-s-2', toneAccent('bad'))}>
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs text-muted-foreground">{row.model.code}</p>
                <Pill tone="bad">{tx('راكد', 'Dead')}</Pill>
              </div>
              <h3 className="font-semibold">{row.model.name}</h3>
              <p className="mt-2 text-sm">{tx(`${row.model.units} قطع فقط. انقل المتبقي إلى أوتلت شبرا أو اخفض السعر.`, `Only ${row.model.units} units. Move the remainder to Shubra outlet or mark it down.`)}</p>
            </Panel>
          ))}
        </div>
      )}
    </div>
  )
}
