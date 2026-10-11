import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { segmentLabel } from '../engine'
import { money, num, percent } from '../format'
import { useStore } from '../store'
import { ChartContainer, ChartLegend, ChartLegendContent, type ChartConfig } from '@/components/ui/chart'
import { chartAxis } from '../components/charts'
import { PageHeader, Panel, Pill, Select } from '../components/kit'

export default function ManagerView() {
  const { dataset, settings, managerId, setManagerId, locale, tx } = useStore()
  const branches = useMemo(() => dataset.branches.map((b) => ({
    ...b,
    segment: settings.segmentOverrides[b.id] ?? b.segment,
    target: settings.targetOverrides[b.id] ?? b.target,
  })), [dataset.branches, settings])
  const branch = branches.find((b) => b.id === managerId) ?? branches[0]
  const peers = branches.filter((b) => b.segment === branch.segment && b.id !== branch.id && b.currency === branch.currency)
  const peerTrx = peers.reduce((s, b) => s + b.trx, 0)
  const peer = {
    upt: peerTrx ? peers.reduce((s, b) => s + b.units, 0) / peerTrx : 0,
    atv: peerTrx ? peers.reduce((s, b) => s + b.sales, 0) / peerTrx : 0,
    utv: peers.reduce((s, b) => s + b.units, 0) ? peers.reduce((s, b) => s + b.sales, 0) / peers.reduce((s, b) => s + b.units, 0) : 0,
  }
  const staff = dataset.sellers.filter((s) => s.branchId === branch.id).sort((a, b) => b.sales - a.sales)
  const staffSales = staff.reduce((s, a) => s + a.sales, 0) || 1
  const top3 = staff.slice(0, 3).reduce((s, a) => s + a.sales, 0) / staffSales
  const chart = [
    { metric: 'UPT', store: branch.upt, peer: peer.upt },
    { metric: 'ATV / 100', store: branch.atv / 100, peer: peer.atv / 100 },
    { metric: 'UTV / 100', store: branch.utv / 100, peer: peer.utv / 100 },
  ]
  const quality = Math.max(0, 1 - Math.max(branch.unattributed, 0))

  return (
    <div>
      <PageHeader
        eyebrow={tx('المتجر', 'Store')}
        title={tx('رؤية مدير الفرع', 'Store manager')}
        subtitle={tx('مقارنة بمعيار نفس الشريحة، ثم صحة توزيع الكادر. الأرقام هنا لشهر أغسطس كاملاً حتى لا يختلط الأسبوع الناقص بصورة الفرع.', 'Compared with the same segment, then staff balance. Figures are the full August file so a partial week is not mistaken for the store.')}
        actions={
          <Select
            ariaLabel={tx('اختر الفرع', 'Choose a store')}
            value={branch.id}
            onValueChange={setManagerId}
            className="w-full sm:w-52"
            options={branches.map((item) => ({ value: item.id, label: item.name }))}
          />
        }
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label={tx('صافي المبيعات', 'Net sales')} value={money(branch.sales, locale, branch.currency)} hint={`${tx('متوسط الشريحة', 'Segment average ticket')} ${money(peer.atv, locale, branch.currency)}`} />
        <Stat label="UPT" value={num(branch.upt, locale, 2)} hint={`${tx('الشريحة', 'Segment')} ${num(peer.upt, locale, 2)}`} />
        <Stat label="ATV" value={money(branch.atv, locale, branch.currency)} hint={`${tx('الشريحة', 'Segment')} ${money(peer.atv, locale, branch.currency)}`} />
        <Stat label={tx('جودة البيانات', 'Data quality')} value={percent(quality, locale, 0)} hint={`${tx('غير منسوب', 'Unattributed')} ${percent(branch.unattributed, locale)}`} />
      </div>

      <Panel className="mt-4">
        <h2 className="text-lg font-semibold">{tx(`مقابل شريحة ${segmentLabel(branch.segment, locale)}`, `Versus ${segmentLabel(branch.segment, locale)}`)}</h2>
        <p className="mb-3 text-sm text-muted-foreground">{tx('ATV و UTV مقسومان على 100 ليظهرا مع UPT على محور واحد. الجدول بجانب الرسم هو الرقم الحقيقي.', 'ATV and UTV are divided by 100 so they share an axis with UPT. The table beside the chart is the real number.')}</p>
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartContainer
            config={{
              store: { label: branch.name, color: 'var(--chart-1)' },
              peer: { label: tx('متوسط الشريحة', 'Segment'), color: 'var(--chart-2)' },
            } satisfies ChartConfig}
            className="aspect-auto h-56 w-full sm:h-64"
          >
            <BarChart data={chart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="metric" {...chartAxis} />
              <YAxis {...chartAxis} width={36} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="store" fill="var(--color-store)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="peer" fill="var(--color-peer)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ChartContainer>
          <ul className="space-y-3 text-sm">
            <Compare label="UPT" store={num(branch.upt, locale, 2)} peer={num(peer.upt, locale, 2)} delta={peer.upt ? branch.upt / peer.upt - 1 : 0} locale={locale} />
            <Compare label="ATV" store={money(branch.atv, locale, branch.currency)} peer={money(peer.atv, locale, branch.currency)} delta={peer.atv ? branch.atv / peer.atv - 1 : 0} locale={locale} />
            <Compare label="UTV" store={money(branch.utv, locale, branch.currency)} peer={money(peer.utv, locale, branch.currency)} delta={peer.utv ? branch.utv / peer.utv - 1 : 0} locale={locale} />
          </ul>
        </div>
      </Panel>

      <Panel className="mt-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">{tx('صحة الكادر', 'Staff health')}</h2>
          <Pill tone={top3 > 0.7 ? 'warn' : 'good'}>{tx('أعلى 3', 'Top 3')} {percent(top3, locale, 0)}</Pill>
        </div>
        {top3 > 0.7 && <p className="mb-3 text-sm text-[#ffd78a]">{tx('أعلى 3 بائعين يحملون أغلب الفرع. وزّع العملاء ودرّب الرابع والخامس.', 'The top three carry most of the store. Spread customers and coach the fourth and fifth.')}</p>}
        <ol className="space-y-2">
          {staff.map((seller, index) => (
            <li key={seller.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-2xl bg-muted/60 px-3 py-2">
              <span className="num text-muted-foreground">{index + 1}</span>
              <div>
                <p className="font-medium">{seller.name} {seller.floating && <span className="text-xs text-primary">{tx('متنقل', 'Floating')}</span>}</p>
                <p className="text-xs text-muted-foreground">UPT {num(seller.upt, locale, 2)} · ATV {money(seller.atv, locale, branch.currency)}</p>
              </div>
              <p className="num text-sm">{money(seller.sales, locale, branch.currency)} · {percent(seller.sales / staffSales, locale, 0)}</p>
            </li>
          ))}
        </ol>
      </Panel>
    </div>
  )
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return <article className="rounded-xl bg-card p-4 text-card-foreground shadow-sm ring-1 ring-foreground/10"><p className="text-sm text-muted-foreground">{label}</p><p className="num mt-2 text-2xl">{value}</p><p className="mt-1 text-xs text-muted-foreground">{hint}</p></article>
}

function Compare({ label, store, peer, delta, locale }: { label: string; store: string; peer: string; delta: number; locale: 'ar' | 'en' }) {
  return (
    <li className="rounded-2xl bg-muted/60 p-3">
      <div className="flex justify-between"><span>{label}</span><span className={delta >= 0 ? 'text-[#8ef0cf]' : 'text-[#ffb3bd]'}>{percent(delta, locale, 1, true)}</span></div>
      <p className="mt-1 text-[#c5ccda]">{store} · {peer}</p>
    </li>
  )
}
