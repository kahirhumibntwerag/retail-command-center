import { useState } from 'react'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { exportRows } from '../excel'
import { segmentLabel } from '../engine'
import { money, num, percent } from '../format'
import { useStore } from '../store'
import type { Segment } from '../types'
import { ChartContainer, type ChartConfig } from '@/components/ui/chart'
import { MoneyTooltip, chartAxis } from '../components/charts'
import { Button, cx, Drawer, PageHeader, Panel, Pill, SortTh, TableWrap, useSort } from '../components/kit'

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
      <Panel>
        <TableWrap>
          <table className="w-full min-w-[980px] text-sm">
            <caption className="sr-only">{tx('أداء الفروع. العناوين قابلة للترتيب.', 'Branch performance. Headers can be sorted.')}</caption>
            <thead className="text-[#a8b3c7]">
              <tr>
                <SortTh label={tx('الفرع', 'Store')} column="name" active={key} dir={dir} onSort={toggle} />
                <SortTh label={tx('المبيعات', 'Sales')} column="periodSalesEgp" active={key} dir={dir} onSort={toggle} />
                <SortTh label={tx('الحصة', 'Share')} column="share" active={key} dir={dir} onSort={toggle} />
                <SortTh label="TRX" column="periodTrx" active={key} dir={dir} onSort={toggle} />
                <SortTh label="ATV" column="atv" active={key} dir={dir} onSort={toggle} />
                <SortTh label="UPT" column="upt" active={key} dir={dir} onSort={toggle} />
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
                return (
                  <tr key={branch.id} className="border-t border-white/8 hover:bg-white/4">
                    <td className="px-2 py-3">
                      <button type="button" className="text-start" onClick={() => setOpenId(branch.id)}>
                        <span className="font-medium">{branch.name}</span>
                        <span className="mt-1 block text-xs text-muted-foreground">{segmentLabel(branch.segment, locale)} · {branch.staff} {tx('بائعين', 'associates')}</span>
                      </button>
                    </td>
                    <td className="num px-2 py-3">{money(branch.included ? branch.periodSalesEgp : branch.periodSales, locale, branch.included ? 'EGP' : branch.currency)}</td>
                    <td className="num px-2 py-3">{branch.included ? percent(branch.share, locale) : tx('مستبعد', 'Excluded')}</td>
                    <td className="num px-2 py-3">{num(Math.round(branch.periodTrx), locale)}</td>
                    <td className="num px-2 py-3">{num(Math.round(branch.atv), locale)}</td>
                    <td className="num px-2 py-3">{num(branch.upt, locale, 2)}</td>
                    <td className="num px-2 py-3">{num(Math.round(branch.utv), locale)}</td>
                    <td className="num px-2 py-3">{num(branch.cv, locale, 3)}</td>
                    <td className="num px-2 py-3">{percent(branch.h2vsH1, locale, 1, true)}</td>
                    <td className="px-2 py-3"><Pill tone={branch.top3 > 0.7 ? 'warn' : 'neutral'}>{percent(branch.top3, locale, 1)}</Pill></td>
                    <td className="px-2 py-3"><Pill tone={branch.unattributed >= 0.1 ? 'bad' : 'neutral'}>{percent(branch.unattributed, locale, 1)}</Pill></td>
                    <td className="px-2 py-3">
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(achievement * 100)} aria-label={tx(`تحقيق الهدف ${percent(achievement, locale, 0)}`, `Target progress ${percent(achievement, locale, 0)}`)}>
                        <div className="h-full bg-primary" style={{ width: `${Math.min(100, achievement * 100)}%` }} />
                      </div>
                      <span className="num text-xs text-muted-foreground">{percent(achievement, locale, 0)}</span>
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
            <Mini label="ATV" value={money(open.atv, locale, open.currency)} />
            <Mini label="UPT" value={num(open.upt, locale, 2)} />
            <Mini label="UTV" value={money(open.utv, locale, open.currency)} />
            <Mini label={tx('غير منسوب', 'Unattributed')} value={percent(open.unattributed, locale)} />
          </div>
          <ChartContainer config={{ sales: { label: tx('المبيعات', 'Sales'), color: 'var(--chart-1)' } } satisfies ChartConfig} className="mt-4 aspect-auto h-48 w-full">
            <AreaChart data={open.series.map((sales, i) => ({ day: i + 1, sales }))} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="day" {...chartAxis} />
              <YAxis {...chartAxis} width={40} />
              <MoneyTooltip locale={locale} currency={open.currency} />
              <Area type="monotone" dataKey="sales" stroke="var(--color-sales)" fill="var(--color-sales)" fillOpacity={0.2} strokeWidth={2} />
            </AreaChart>
          </ChartContainer>
          <Button tone="gold" onClick={() => { setManagerId(open.id); setView('manager'); setOpenId(null) }}>{tx('رؤية مدير الفرع', 'Open store manager')}</Button>
        </Drawer>
      )}
    </div>
  )
}

function Mini({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl bg-muted/60 p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="num mt-1">{value}</p></div>
}
