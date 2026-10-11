import { useState } from 'react'
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { exportRows } from '../excel'
import { num, percent } from '../format'
import { useStore } from '../store'
import { Button, chartTipStyle, PageHeader, Panel, Pill, Seg, TableWrap } from '../components/kit'

type Tab = 'pareto' | 'allocation' | 'dcs' | 'dead'

export default function AssortmentView() {
  const { model, locale, tx } = useStore()
  const [tab, setTab] = useState<Tab>('pareto')
  const tier50 = model.pareto.filter((row) => row.tier === '50').length
  const tier80 = model.pareto.filter((row) => row.tier !== 'tail').length
  const dead = model.pareto.filter((row) => row.model.units <= 10)
  const chart = model.pareto.slice(0, 16).map((row) => ({ code: row.model.code, units: row.model.units, cumulative: Math.round(row.cumulative * 1000) / 10 }))

  return (
    <div>
      <PageHeader
        eyebrow={tx('التشكيلة', 'Assortment')}
        title={tx('الموديلات والتوزيع', 'Styles and allocation')}
        subtitle={tx('باريتو 50/80، فجوات الإرسال، وانحراف الفئات، ثم الراكد الذي يستحق الترحيل إلى شبرا.', 'Pareto 50/80, send gaps, category deviation, then the dead styles that belong in Shubra.')}
        actions={<Button onClick={() => exportRows('models.xlsx', 'Models', model.pareto.map((row) => ({ code: row.model.code, name: row.model.name, units: row.model.units, cumulative: row.cumulative, tier: row.tier })))}>{tx('تصدير', 'Export')}</Button>}
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        <Mini label={tx('الموديلات', 'Styles')} value={String(model.pareto.length)} />
        <Mini label={tx('تصنع 50%', 'Make 50%')} value={String(tier50)} />
        <Mini label={tx('تصنع 80%', 'Make 80%')} value={String(tier80)} />
        <Mini label={tx('راكد ≤ 10', 'Dead ≤ 10')} value={String(dead.length)} />
      </div>
      <Seg value={tab} onChange={setTab} options={[
        { id: 'pareto', label: tx('باريتو', 'Pareto') },
        { id: 'allocation', label: `${tx('فحص التوزيع', 'Allocation')} ${model.allocation.length}` },
        { id: 'dcs', label: tx('انحراف الفئات', 'Category mix') },
        { id: 'dead', label: tx('الراكد', 'Dead stock') },
      ]} />

      {tab === 'pareto' && (
        <Panel className="mt-4">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chart}>
                <CartesianGrid stroke="rgba(255,255,255,.06)" vertical={false} />
                <XAxis dataKey="code" stroke="#93a0b8" fontSize={11} interval={0} angle={-35} height={60} textAnchor="end" />
                <YAxis yAxisId="u" stroke="#93a0b8" fontSize={12} />
                <YAxis yAxisId="c" orientation="right" stroke="var(--primary)" fontSize={12} unit="%" />
                <Tooltip contentStyle={chartTipStyle()} />
                <Bar yAxisId="u" dataKey="units" fill="#35527a" radius={[6, 6, 0, 0]} />
                <Line yAxisId="c" dataKey="cumulative" stroke="var(--primary)" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <TableWrap>
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
            <Panel key={`${gap.branchName}-${gap.category}`}>
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
          <p className="mb-3 text-sm text-muted-foreground">{tx('حصة كل فئة من قطع ملف التشكيلة. الأخضر فوق المتوسط ليس متاحاً هنا لأن المقارنة على مستوى السلسلة.', 'Share of each category in the style file.')}</p>
          <ul className="space-y-3">
            {model.dcs.map((row) => (
              <li key={row.category}>
                <div className="mb-1 flex justify-between text-sm"><span>{row.category}</span><span className="num">{num(row.units, locale)} · {percent(row.chainShare, locale)}</span></div>
                <div className="h-2 overflow-hidden rounded-full bg-white/8"><div className="h-full bg-[#7eb6ff]" style={{ width: `${Math.min(100, row.chainShare * 100)}%` }} /></div>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {tab === 'dead' && (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {dead.map((row) => (
            <Panel key={row.model.code}>
              <p className="text-xs text-muted-foreground">{row.model.code}</p>
              <h3 className="font-semibold">{row.model.name}</h3>
              <p className="mt-2 text-sm">{tx(`${row.model.units} قطع فقط. انقل المتبقي إلى أوتلت شبرا أو اخفض السعر.`, `Only ${row.model.units} units. Move the remainder to Shubra outlet or mark it down.`)}</p>
            </Panel>
          ))}
        </div>
      )}
    </div>
  )
}

function Mini({ label, value }: { label: string; value: string }) {
  return <article className="rounded-xl bg-card p-4 text-card-foreground shadow-sm ring-1 ring-foreground/10"><p className="text-sm text-muted-foreground">{label}</p><p className="num mt-2 text-2xl">{value}</p></article>
}
