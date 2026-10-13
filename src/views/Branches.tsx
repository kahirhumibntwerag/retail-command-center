import { useMemo, useState } from 'react'
import type { ApexOptions } from 'apexcharts'
import { exportRows } from '../excel'
import { segmentLabel } from '../engine'
import { compact, money, num, percent } from '../format'
import { useStore } from '../store'
import type { Segment } from '../types'
import { PrettyArea, categoryX, compactYAxis, moneyTooltip } from '../components/prettyCharts'
import { achievementBar, achievementTone, Button, cx, Drawer, Kpi, PageHeader, Panel, Pill, SortTh, Stat, TableWrap, Trend, useSort } from '../components/kit'

export default function BranchesView() {
  const { model, locale, tx, setView, setManagerId, setFilters, filters } = useStore()
  const [openId, setOpenId] = useState<string | null>(null)
  const { sorted, toggle, key, dir } = useSort(model.branches, 'periodSalesEgp')
  const open = model.branches.find((b) => b.id === openId)
  const segments: Array<Segment | 'all'> = ['all', 'Mall', 'Governorate', 'Outlet', 'Online', 'International']

  return (
    <div>
      <PageHeader
        eyebrow={tx('الفروع', 'Stores')}
        title={tx('جدول أداء السلسلة', 'Chain performance')}
        subtitle={tx('الحصة والتذبذب واعتماد أعلى 3 بائعين ونسبة المبيعات غير المنسوبة. اضغط صفاً لفتح المدير.', 'Share, volatility, top-3 reliance, and unattributed sales. Open a row to reach the manager view.')}
        actions={<Button onClick={() => exportRows('branches.xlsx', 'Branches', sorted.map((b) => ({ name: b.name, segment: b.segment, sales: Math.round(b.periodSales), trx: Math.round(b.periodTrx), atv: Math.round(b.atv), upt: Number(b.upt.toFixed(2)), utv: Math.round(b.utv), h2: b.h2vsH1, top3: b.top3, unattributed: b.unattributed })))}>{tx('تصدير', 'Export')}</Button>}
      />
      <div className="mb-4 flex flex-wrap gap-2">
        {segments.map((segment) => (
          <button key={segment} type="button" aria-pressed={filters.segment === segment} onClick={() => setFilters({ segment })} className={cx('min-h-9 rounded-full border px-3 py-1 text-sm', filters.segment === segment ? 'border-primary bg-primary font-semibold text-primary-foreground' : 'border-border hover:bg-accent')}>
            {segment === 'all' ? tx('كل الفروع', 'All stores') : segmentLabel(segment, locale)}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-2 md:hidden">
        {sorted.map((branch) => {
          const achievement = branch.target ? (branch.currency === 'QAR' ? branch.sales : branch.periodSalesEgp) / branch.target : 0
          const flagged = branch.unattributed >= 0.1 || (achievement > 0 && achievement < 0.9)
          return (
          <button key={branch.id} type="button" onClick={() => setOpenId(branch.id)} className={cx('rounded-2xl bg-card p-3 text-start ring-1 ring-foreground/10', flagged && 'bg-red-500/5 ring-red-400/25')}>
            <span className="font-medium">{branch.name}</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">{segmentLabel(branch.segment, locale)} · {branch.staff} {tx('بائعين', 'associates')}</span>
            <span className="num mt-2 block text-sm font-semibold sm:text-base">{money(branch.included ? branch.periodSalesEgp : branch.periodSales, locale, branch.included ? 'EGP' : branch.currency)}</span>
            <span className="mt-2 grid grid-cols-3 gap-2">
              <Stat label={tx('الهدف', 'Target')} value={percent(achievement, locale, 0)} tone={achievementTone(achievement)} />
              <Stat label={tx('غير منسوب', 'Unattributed')} value={percent(branch.unattributed, locale, 0)} tone={branch.unattributed >= 0.1 ? 'bad' : undefined} />
              <Stat label={tx('أعلى 3', 'Top 3')} value={percent(branch.top3, locale, 0)} tone={branch.top3 > 0.7 ? 'warn' : undefined} />
            </span>
          </button>
          )
        })}
      </div>
      <Panel className="hidden md:block">
        <TableWrap>
          <table className="w-full min-w-[980px] text-sm">
            <caption className="sr-only">{tx('أداء الفروع. العناوين قابلة للترتيب.', 'Branch performance. Headers can be sorted.')}</caption>
            <thead className="text-muted-foreground">
              <tr>
                <SortTh label={tx('الفرع', 'Store')} column="name" active={key} dir={dir} onSort={toggle} />
                <SortTh label={tx('المبيعات', 'Sales')} column="periodSalesEgp" active={key} dir={dir} onSort={toggle} />
                <SortTh label={tx('الحصة', 'Share')} column="share" active={key} dir={dir} onSort={toggle} />
                <SortTh label="TRX" column="periodTrx" active={key} dir={dir} onSort={toggle} />
                <SortTh label={tx('متوسط الفاتورة', 'Average ticket')} column="atv" active={key} dir={dir} onSort={toggle} />
                <SortTh label={tx('قطع الفاتورة', 'Units per receipt')} column="upt" active={key} dir={dir} onSort={toggle} />
                <SortTh label="UTV" column="utv" active={key} dir={dir} onSort={toggle} />
                <SortTh label="CV" column="cv" active={key} dir={dir} onSort={toggle} />
                <SortTh label="H2/H1" column="h2vsH1" active={key} dir={dir} onSort={toggle} />
                <SortTh label={tx('أعلى 3', 'Top 3')} column="top3" active={key} dir={dir} onSort={toggle} />
                <SortTh label={tx('غير منسوب', 'Unattributed')} column="unattributed" active={key} dir={dir} onSort={toggle} />
                <th className="px-2 py-2 text-start">{tx('الهدف', 'Target')}</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((branch) => {
                const achievement = branch.target ? (branch.currency === 'QAR' ? branch.sales : branch.periodSalesEgp) / branch.target : 0
                const targetTone = achievementTone(achievement)
                return (
                  <tr key={branch.id} className={cx('border-t border-white/8 hover:bg-white/4', branch.unattributed >= 0.1 && 'bg-red-500/5')}>
                    <td className="px-2 py-3">
                      <button type="button" className="text-start" onClick={() => setOpenId(branch.id)}>
                        <span className="font-medium">{branch.name}</span>
                        <span className="mt-1 block text-xs text-muted-foreground">{segmentLabel(branch.segment, locale)} · {branch.staff} {tx('بائعين', 'associates')}</span>
                      </button>
                    </td>
                    <td className="num px-2 py-3">{money(branch.included ? branch.periodSalesEgp : branch.periodSales, locale, branch.included ? 'EGP' : branch.currency)}</td>
                    <td className="num px-2 py-3">{branch.included ? percent(branch.share, locale) : <Pill tone="warn">{tx('مستبعد', 'Excluded')}</Pill>}</td>
                    <td className="num px-2 py-3">{num(Math.round(branch.periodTrx), locale)}</td>
                    <td className="num px-2 py-3">{num(Math.round(branch.atv), locale)}</td>
                    <td className="num px-2 py-3">{num(branch.upt, locale, 2)}</td>
                    <td className="num px-2 py-3">{num(Math.round(branch.utv), locale)}</td>
                    <td className={cx('num px-2 py-3', branch.cv >= 0.45 && 'text-amber-200')}>{num(branch.cv, locale, 3)}</td>
                    <td className="num px-2 py-3"><Trend ratio={branch.h2vsH1}>{percent(branch.h2vsH1, locale, 1, true)}</Trend></td>
                    <td className="px-2 py-3"><Pill tone={branch.top3 > 0.7 ? 'warn' : 'neutral'}>{percent(branch.top3, locale, 1)}</Pill></td>
                    <td className="px-2 py-3"><Pill tone={branch.unattributed >= 0.1 ? 'bad' : 'neutral'}>{percent(branch.unattributed, locale, 1)}</Pill></td>
                    <td className="px-2 py-3">
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(achievement * 100)} aria-label={tx(`تحقيق الهدف ${percent(achievement, locale, 0)}`, `Target progress ${percent(achievement, locale, 0)}`)}>
                        <div className={cx('h-full', achievementBar(targetTone))} style={{ width: `${Math.min(100, achievement * 100)}%` }} />
                      </div>
                      <span className="mt-1 inline-flex"><Pill tone={targetTone ?? 'neutral'}>{percent(achievement, locale, 0)}</Pill></span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </TableWrap>
      </Panel>

      {open && (
        <Drawer title={open.name} onClose={() => setOpenId(null)}>
          <h2 className="text-2xl font-semibold">{open.name}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{segmentLabel(open.segment, locale)}</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Kpi label={tx('متوسط الفاتورة', 'Average ticket')} value={money(open.atv, locale, open.currency)} hint="" tone="gold" />
            <Kpi label={tx('قطع الفاتورة', 'Units per receipt')} value={num(open.upt, locale, 2)} hint="" tone={open.upt >= 2 ? 'good' : open.upt < 1.5 ? 'bad' : 'warn'} />
            <Kpi label={tx('سعر القطعة', 'Unit value')} value={money(open.utv, locale, open.currency)} hint="" tone="gold" />
            <Kpi label={tx('غير منسوب', 'Unattributed')} value={percent(open.unattributed, locale)} hint="" tone={open.unattributed >= 0.1 ? 'bad' : 'good'} />
          </div>
          <BranchSeriesChart series={open.series} locale={locale} currency={open.currency} label={tx('المبيعات', 'Sales')} />
          <Button tone="gold" onClick={() => { setManagerId(open.id); setView('manager'); setOpenId(null) }}>{tx('رؤية مدير الفرع', 'Open store manager')}</Button>
        </Drawer>
      )}
    </div>
  )
}

function BranchSeriesChart({ series, locale, currency, label }: { series: number[]; locale: 'ar' | 'en'; currency: 'EGP' | 'QAR'; label: string }) {
  const options = useMemo<ApexOptions>(() => ({
    xaxis: categoryX(series.map((_, index) => String(index + 1))),
    yaxis: compactYAxis((value) => compact(value, locale)),
    tooltip: moneyTooltip((value) => money(Number(value ?? 0), locale, currency)),
    legend: { show: false },
  }), [currency, locale, series])
  const chartSeries = useMemo(() => [{ name: label, data: series.map((value) => Math.round(value)) }], [label, series])
  const peak = series.reduce((best, value, index) => (value > best.value ? { value, index } : best), { value: 0, index: 0 })
  return (
    <div className="mt-4">
      <PrettyArea
        series={chartSeries}
        options={options}
        height="compact"
        title={label}
        summary={locale === 'ar'
          ? `مبيعات يومية على ${series.length} يوماً. أعلى يوم ${peak.index + 1}.`
          : `Daily sales across ${series.length} days. Peak day ${peak.index + 1}.`}
      />
    </div>
  )
}
