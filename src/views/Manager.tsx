import { useMemo } from 'react'
import type { ApexOptions } from 'apexcharts'
import { segmentLabel } from '../engine'
import { money, num, percent } from '../format'
import { useStore } from '../store'
import { PrettyGauge, PrettyRadar, categoryX, useChartColors } from '../components/prettyCharts'
import { useDirection } from '@/components/ui/direction'
import { cx, Kpi, PageHeader, Panel, Pill, Select, toneAccent, Trend } from '../components/kit'

export default function ManagerView() {
  const { dataset, settings, managerId, setManagerId, locale, tx } = useStore()
  const colors = useChartColors()
  const dir = useDirection()
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
  const quality = Math.max(0, 1 - Math.max(branch.unattributed, 0))
  const vsPeer = (store: number, base: number) => (base ? store / base - 1 : 0)
  const uptTone = peer.upt ? (branch.upt >= peer.upt ? 'good' : branch.upt < peer.upt * 0.9 ? 'bad' : 'warn') : undefined
  const atvTone = peer.atv ? (branch.atv >= peer.atv ? 'good' : branch.atv < peer.atv * 0.9 ? 'bad' : 'warn') : undefined
  const qualityTone = branch.unattributed >= 0.1 ? 'bad' : quality >= 0.95 ? 'good' : 'warn'
  const compareOptions = useMemo<ApexOptions>(() => ({
    xaxis: categoryX(['UPT', 'ATV', 'UTV']),
    colors: [colors.gold, colors.blue],
    yaxis: {
      max: 160,
      tickAmount: 4,
      labels: {
        formatter: (value) => `${Math.round(Number(value))}`,
        offsetX: dir === 'rtl' ? -4 : 0,
      },
    },
    tooltip: {
      y: {
        formatter: (value) => `${num(Number(value ?? 0), locale, 0)}% ${tx('من متوسط الشريحة', 'of segment avg')}`,
      },
    },
    legend: { show: true },
  }), [colors.blue, colors.gold, dir, locale, tx])
  const compareSeries = useMemo(() => {
    const index = (store: number, base: number) => (base ? Math.round((store / base) * 100) : 100)
    return [
      { name: branch.name, data: [index(branch.upt, peer.upt), index(branch.atv, peer.atv), index(branch.utv, peer.utv)] },
      { name: tx('متوسط الشريحة', 'Segment'), data: [100, 100, 100] },
    ]
  }, [branch.atv, branch.name, branch.upt, branch.utv, peer.atv, peer.upt, peer.utv, tx])

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
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Kpi label={tx('صافي المبيعات', 'Net sales')} value={money(branch.sales, locale, branch.currency)} hint={`${tx('متوسط الشريحة', 'Segment average ticket')} ${money(peer.atv, locale, branch.currency)}`} tone="gold" />
        <Kpi label={tx('قطع الفاتورة', 'Units per receipt')} value={num(branch.upt, locale, 2)} hint={`${tx('الشريحة', 'Segment')} ${num(peer.upt, locale, 2)}`} tone={uptTone} />
        <Kpi label={tx('متوسط الفاتورة', 'Average ticket')} value={money(branch.atv, locale, branch.currency)} hint={`${tx('الشريحة', 'Segment')} ${money(peer.atv, locale, branch.currency)}`} tone={atvTone} />
        <Kpi label={tx('جودة البيانات', 'Data quality')} value={percent(quality, locale, 0)} hint={`${tx('غير منسوب', 'Unattributed')} ${percent(branch.unattributed, locale)}`} tone={qualityTone} />
        <div className="rounded-xl bg-card ring-1 ring-foreground/10 sm:col-span-2 xl:col-span-1">
          <PrettyGauge
            value={quality}
            label={tx('نظافة البيانات', 'Data clean')}
            tone={qualityTone === 'bad' ? 'bad' : qualityTone === 'good' ? 'good' : 'warn'}
            height="compact"
            title={tx('جودة البيانات', 'Data quality')}
            summary={tx(
              `نظافة البيانات ${percent(quality, locale, 0)}. غير منسوب ${percent(branch.unattributed, locale)}.`,
              `Data clean ${percent(quality, locale, 0)}. Unattributed ${percent(branch.unattributed, locale)}.`,
            )}
          />
        </div>
      </div>

      <Panel className="mt-4">
        <h2 className="text-sm font-semibold sm:text-base">{tx(`مقابل شريحة ${segmentLabel(branch.segment, locale)}`, `Versus ${segmentLabel(branch.segment, locale)}`)}</h2>
        <p className="mb-3 text-sm text-muted-foreground">{tx('الرادار بمؤشر 100 = متوسط الشريحة. فوق 100 يعني الفرع أقوى من المعيار.', 'Radar index 100 = segment average. Above 100 means the store beats the benchmark.')}</p>
        <div className="grid gap-4 lg:grid-cols-2">
          <PrettyRadar
            series={compareSeries}
            options={compareOptions}
            height="panel"
            title={tx(`مقابل شريحة ${segmentLabel(branch.segment, locale)}`, `Versus ${segmentLabel(branch.segment, locale)}`)}
            summary={tx(
              'رادار مؤشر 100 = متوسط الشريحة لـ UPT و ATV و UTV.',
              'Radar index 100 = segment average for UPT, ATV, and UTV.',
            )}
          />
          <ul className="space-y-3 text-sm">
            <Compare label="UPT" store={num(branch.upt, locale, 2)} peer={num(peer.upt, locale, 2)} delta={vsPeer(branch.upt, peer.upt)} locale={locale} />
            <Compare label="ATV" store={money(branch.atv, locale, branch.currency)} peer={money(peer.atv, locale, branch.currency)} delta={vsPeer(branch.atv, peer.atv)} locale={locale} />
            <Compare label="UTV" store={money(branch.utv, locale, branch.currency)} peer={money(peer.utv, locale, branch.currency)} delta={vsPeer(branch.utv, peer.utv)} locale={locale} />
          </ul>
        </div>
      </Panel>

      <Panel className="mt-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold sm:text-base">{tx('صحة الكادر', 'Staff health')}</h2>
          <Pill tone={top3 > 0.7 ? 'warn' : 'good'}>{tx('أعلى 3', 'Top 3')} {percent(top3, locale, 0)}</Pill>
        </div>
        {top3 > 0.7 && <p className="mb-3 text-sm text-amber-200">{tx('أعلى 3 بائعين يحملون أغلب الفرع. وزّع العملاء ودرّب الرابع والخامس.', 'The top three carry most of the store. Spread customers and coach the fourth and fifth.')}</p>}
        <ol className="space-y-2">
          {staff.map((seller, index) => (
            <li
              key={seller.id}
              className={cx(
                'grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-2xl border-s-2 bg-muted/60 px-3 py-2',
                index < 3 && top3 > 0.7 ? toneAccent('warn') : index === 0 ? toneAccent('gold') : toneAccent(),
              )}
            >
              <span className={cx('num grid h-7 w-7 place-items-center rounded-full text-sm', index < 3 ? 'bg-primary/15 text-primary' : 'text-muted-foreground')}>{index + 1}</span>
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

function Compare({ label, store, peer, delta, locale }: { label: string; store: string; peer: string; delta: number; locale: 'ar' | 'en' }) {
  return (
    <li className={cx('rounded-2xl border-s-2 bg-muted/60 p-3', delta >= 0.005 ? toneAccent('good') : delta <= -0.005 ? toneAccent('bad') : toneAccent())}>
      <div className="flex justify-between gap-2">
        <span>{label}</span>
        <Trend ratio={delta}>{percent(delta, locale, 1, true)}</Trend>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{store} · {peer}</p>
    </li>
  )
}
