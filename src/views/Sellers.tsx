import { useMemo, useState } from 'react'
import type { ApexOptions } from 'apexcharts'
import { exportRows } from '../excel'
import type { CoachKind } from '../types'
import { compact, money, num } from '../format'
import { useStore } from '../store'
import { Input } from '@/components/ui/input'
import { PrettyBubble, useChartColors } from '../components/prettyCharts'
import { useDirection } from '@/components/ui/direction'
import { Button, cx, Drawer, PageHeader, Panel, Pill, Select, SortTh, Stat, TableWrap, toneAccent, useSort } from '../components/kit'

const COACH: Record<CoachKind, { ar: string; en: string; tone: 'good' | 'warn' | 'bad' | 'gold' | 'neutral'; tipAr: string; tipEn: string }> = {
  star: { ar: 'نجم مبيعات', en: 'Star', tone: 'good', tipAr: 'اطلب منه تدريب زميل هذا الأسبوع، ولا تنقله من العملاء.', tipEn: 'Ask them to coach one peer this week. Do not pull them off customers.' },
  upt: { ar: 'يحتاج تدريب سلة', en: 'Needs UPT coaching', tone: 'warn', tipAr: 'درّبه على قطعة إضافية عند الكاشير: إيشارب، بروش، أو حزام.', tipEn: 'Coach one add-on at the till: scarf, brooch, or belt.' },
  atv: { ar: 'يحتاج رفع الفاتورة', en: 'Needs a higher ticket', tone: 'warn', tipAr: 'اعرض القطعة الأعلى قماشاً قبل الخصم. المشكلة سعر السلة لا عدد القطع.', tipEn: 'Show the better fabric before the discount. The gap is ticket value, not units.' },
  both: { ar: 'تطوير شامل', en: 'Full development', tone: 'bad', tipAr: 'أسبوع ظل مع نجم الفرع، ثم قياس UPT و ATV على 20 فاتورة.', tipEn: 'One week shadowing a star, then measure UPT and ATV on 20 receipts.' },
  closing: { ar: 'دعم إغلاق', en: 'Needs closing support', tone: 'neutral', tipAr: 'راجع أول جملتين في التحية ومحاولات الإغلاق. الحجم ما زال صغيراً.', tipEn: 'Review the opening two lines and the close. Volume is still small.' },
  balanced: { ar: 'متوازن', en: 'Balanced', tone: 'neutral', tipAr: 'حافظ على الإيقاع وراقبه أسبوعياً دون تدخل ثقيل.', tipEn: 'Keep the rhythm and review weekly without a heavy intervention.' },
}

export default function SellersView() {
  const { model, locale, tx, dataset } = useStore()
  const colors = useChartColors()
  const layoutDir = useDirection()
  const [q, setQ] = useState('')
  const [branch, setBranch] = useState('all')
  const [only, setOnly] = useState<CoachKind | 'all'>('all')
  const [id, setId] = useState<string | null>(null)
  const rows = useMemo(() => model.sellers.filter((s) => {
    if (branch !== 'all' && s.branchId !== branch) return false
    if (only !== 'all' && s.coach !== only) return false
    if (q && !s.name.toLowerCase().includes(q.toLowerCase())) return false
    return true
  }), [model.sellers, branch, only, q])
  const { sorted, toggle, key, dir } = useSort(rows, 'sales')
  const selected = model.sellers.find((s) => s.id === id)
  const scatter = useMemo(
    () => model.sellers.filter((s) => s.sales > 0).slice(0, 120).map((s) => ({ name: s.name, atv: Math.round(s.atv), upt: Number(s.upt.toFixed(2)), sales: Math.round(s.sales) })),
    [model.sellers],
  )
  const maxSales = useMemo(() => Math.max(...scatter.map((row) => row.sales), 1), [scatter])
  const scatterOptions = useMemo<ApexOptions>(() => ({
    colors: [colors.gold],
    xaxis: {
      title: { text: 'ATV', style: { color: colors.muted } },
      labels: { formatter: (value) => compact(Number(value), locale) },
      tickAmount: 6,
      min: Math.min(...scatter.map((row) => row.atv), model.kpis.atv) * 0.9,
    },
    yaxis: {
      title: { text: 'UPT', style: { color: colors.muted } },
      labels: {
        formatter: (value) => num(Number(value), locale, 1),
        offsetX: layoutDir === 'rtl' ? -4 : 0,
      },
      tickAmount: 5,
    },
    annotations: {
      xaxis: [{ x: model.kpis.atv, borderColor: colors.gold, strokeDashArray: 5, label: { text: 'ATV ⌀', style: { color: '#0b101b', background: colors.gold } } }],
      yaxis: [{ y: model.kpis.upt, borderColor: colors.blue, strokeDashArray: 5, label: { text: 'UPT ⌀', style: { color: '#0b101b', background: colors.blue } } }],
    },
    tooltip: {
      custom: ({ dataPointIndex }) => {
        const row = scatter[dataPointIndex]
        if (!row) return ''
        return `<div class="rounded-lg border border-white/10 bg-[#151b28] px-2.5 py-1.5 text-xs shadow-xl">
          <p class="mb-1 font-medium text-white">${row.name}</p>
          <p class="text-[#a8b3c7]">ATV <span class="text-white">${money(row.atv, locale)}</span></p>
          <p class="text-[#a8b3c7]">UPT <span class="text-white">${num(row.upt, locale, 2)}</span></p>
          <p class="text-[#a8b3c7]">${tx('المبيعات', 'Sales')} <span class="text-white">${money(row.sales, locale)}</span></p>
        </div>`
      },
    },
  }), [colors.blue, colors.gold, colors.muted, layoutDir, locale, model.kpis.atv, model.kpis.upt, scatter, tx])
  const scatterSeries = useMemo(() => [{
    name: tx('البائعون', 'Associates'),
    data: scatter.map((row) => [row.atv, row.upt, Math.max(6, Math.round((row.sales / maxSales) * 32))]),
  }], [maxSales, scatter, tx])

  return (
    <div>
      <PageHeader
        eyebrow={tx('التدريب', 'Coaching')}
        title={tx('بطاقة البائعين', 'Associate scorecards')}
        subtitle={tx('المحور الأفقي متوسط الفاتورة، والرأسي سلة العميل، والحجم هو المبيعات. الحسابات العامة مستبعدة.', 'Horizontal is ticket, vertical is units per receipt, size is sales. Generic cashier accounts are excluded.')}
        actions={<Button onClick={() => exportRows('sellers.xlsx', 'Sellers', sorted.map((s) => ({ name: s.name, branch: s.branchName, sales: Math.round(s.sales), trx: s.trx, upt: Number(s.upt.toFixed(2)), atv: Math.round(s.atv), coach: s.coach, floating: s.floating })))}>{tx('تصدير', 'Export')}</Button>}
      />
      <Panel>
        <h2 className="mb-1 text-sm font-semibold sm:text-base">{tx('مصفوفة التدريب', 'Coaching quadrants')}</h2>
        <p className="mb-3 text-sm text-muted-foreground">{tx(`متوسط السلسلة: قطع الفاتورة ${num(model.kpis.upt, locale, 2)} · متوسط الفاتورة ${money(model.kpis.atv, locale)}`, `Chain average: units per receipt ${num(model.kpis.upt, locale, 2)} · average ticket ${money(model.kpis.atv, locale)}`)}</p>
        <PrettyBubble
          series={scatterSeries}
          options={scatterOptions}
          height="hero"
          title={tx('مصفوفة التدريب', 'Coaching quadrants')}
          summary={tx(
            `مصفوفة: المحور الأفقي متوسط الفاتورة، والرأسي عدد القطع في الفاتورة. متوسط السلسلة UPT ${num(model.kpis.upt, locale, 2)} و ATV ${money(model.kpis.atv, locale)}.`,
            `Scatter: horizontal is ticket, vertical is units per receipt. Chain average UPT ${num(model.kpis.upt, locale, 2)} and ATV ${money(model.kpis.atv, locale)}.`,
          )}
        />
        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <Note title={tx('نجوم', 'Stars')} body={tx('UPT و ATV فوق السلسلة', 'UPT and ATV above the chain')} tone="good" />
          <Note title={tx('تدريب سلة', 'UPT coaching')} body={tx('فاتورة قوية وقطع قليلة', 'Strong ticket, thin basket')} tone="warn" />
          <Note title={tx('رفع الفاتورة', 'Raise ATV')} body={tx('قطع أكثر بسعر أقل', 'More units, lower price')} tone="warn" />
          <Note title={tx('تطوير شامل', 'Full development')} body={tx('ضعف على المحورين', 'Weak on both axes')} tone="bad" />
        </div>
      </Panel>

      <div className="my-4 flex flex-wrap gap-2">
        <Input value={q} onChange={(e) => setQ(e.target.value)} aria-label={tx('ابحث بالاسم', 'Search by name')} placeholder={tx('ابحث بالاسم', 'Search by name')} className="h-11 w-full sm:h-10 sm:w-56" />
        <Select
          ariaLabel={tx('فرع', 'Branch')}
          value={branch}
          onValueChange={setBranch}
          className="w-full sm:w-52"
          options={[{ value: 'all', label: tx('كل الفروع', 'All stores') }, ...dataset.branches.map((b) => ({ value: b.id, label: b.name }))]}
        />
        <Select
          ariaLabel={tx('التصنيف', 'Classification')}
          value={only}
          onValueChange={(value) => setOnly(value as CoachKind | 'all')}
          className="w-full sm:w-52"
          options={[{ value: 'all', label: tx('كل التصنيفات', 'All classifications') }, ...(Object.keys(COACH) as CoachKind[]).map((key) => ({ value: key, label: tx(COACH[key].ar, COACH[key].en) }))]}
        />
      </div>

      <div className="flex flex-col gap-2 md:hidden">
        {sorted.slice(0, 80).map((seller) => (
          <article key={seller.id} className={cx('rounded-2xl border-s-2 bg-card p-3 ring-1 ring-foreground/10', toneAccent(COACH[seller.coach].tone === 'neutral' ? undefined : COACH[seller.coach].tone))}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium">{seller.name}</p>
                <p className="text-xs text-muted-foreground">{seller.branchName} · #{seller.rank} {seller.floating ? tx('· متنقل', '· floating') : ''}</p>
              </div>
              <Pill tone={COACH[seller.coach].tone}>{tx(COACH[seller.coach].ar, COACH[seller.coach].en)}</Pill>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <Stat label={tx('المبيعات', 'Sales')} value={money(seller.sales, locale)} tone="gold" />
              <Stat label={tx('قطع الفاتورة', 'Units per receipt')} value={num(seller.upt, locale, 2)} tone={seller.upt >= model.kpis.upt ? 'good' : 'warn'} />
              <Stat label={tx('متوسط الفاتورة', 'Average ticket')} value={money(seller.atv, locale)} tone={seller.atv >= model.kpis.atv ? 'good' : 'warn'} />
            </div>
            <div className="mt-3">
              <Button onClick={() => setId(seller.id)}>{tx('توجيه', 'Coach')}</Button>
            </div>
          </article>
        ))}
        {sorted.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">{tx('لا بائعين يطابقون البحث. امسح الاسم أو وسّع التصنيف.', 'No associates match. Clear the name or widen the classification.')}</p>}
      </div>
      <Panel className="hidden md:block">
        <TableWrap>
          <table className="w-full min-w-[860px] text-sm">
            <thead className="text-muted-foreground">
              <tr>
                <SortTh label={tx('البائع', 'Associate')} column="name" active={key} dir={dir} onSort={toggle} />
                <SortTh label={tx('المبيعات', 'Sales')} column="sales" active={key} dir={dir} onSort={toggle} />
                <SortTh label="TRX" column="trx" active={key} dir={dir} onSort={toggle} />
                <SortTh label={tx('قطع الفاتورة', 'Units per receipt')} column="upt" active={key} dir={dir} onSort={toggle} />
                <SortTh label={tx('متوسط الفاتورة', 'Average ticket')} column="atv" active={key} dir={dir} onSort={toggle} />
                <th className="px-2 py-2 text-start">{tx('التصنيف', 'Class')}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {sorted.slice(0, 80).map((seller) => (
                <tr key={seller.id} className={cx('border-t border-white/8 hover:bg-white/4', seller.coach === 'both' && 'bg-red-500/5', seller.coach === 'star' && 'bg-emerald-500/5')}>
                  <td className="px-2 py-3">
                    <p className="font-medium">{seller.name}</p>
                    <p className="text-xs text-muted-foreground">{seller.branchName} · #{seller.rank} {seller.floating ? tx('· متنقل', '· floating') : ''}</p>
                  </td>
                  <td className="num px-2 py-3">{money(seller.sales, locale)}</td>
                  <td className="num px-2 py-3">{seller.trx}</td>
                  <td className={cx('num px-2 py-3', seller.upt >= model.kpis.upt ? 'text-emerald-300' : 'text-amber-200')}>{num(seller.upt, locale, 2)}</td>
                  <td className={cx('num px-2 py-3', seller.atv >= model.kpis.atv ? 'text-emerald-300' : 'text-amber-200')}>{money(seller.atv, locale)}</td>
                  <td className="px-2 py-3"><Pill tone={COACH[seller.coach].tone}>{tx(COACH[seller.coach].ar, COACH[seller.coach].en)}</Pill></td>
                  <td className="px-2 py-3"><Button onClick={() => setId(seller.id)}>{tx('توجيه', 'Coach')}</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
        {sorted.length === 0 && <p className="py-8 text-center text-sm text-[#a8b3c7]">{tx('لا بائعين يطابقون البحث. امسح الاسم أو وسّع التصنيف.', 'No associates match. Clear the name or widen the classification.')}</p>}
        {sorted.length > 80 && <p className="mt-3 text-xs text-[#a8b3c7]">{tx(`يُعرض 80 من ${sorted.length}. ضيّق البحث للباقي.`, `Showing 80 of ${sorted.length}. Narrow the search for the rest.`)}</p>}
      </Panel>

      {selected && (
        <Drawer title={selected.name} onClose={() => setId(null)}>
          <p className="text-xs tracking-[0.14em] text-primary uppercase">{selected.branchName}</p>
          <h2 className="mt-1 text-2xl font-semibold">{selected.name}</h2>
          <div className="mt-4"><Pill tone={COACH[selected.coach].tone}>{tx(COACH[selected.coach].ar, COACH[selected.coach].en)}</Pill></div>
          <p className="mt-4 leading-7">{tx(COACH[selected.coach].tipAr, COACH[selected.coach].tipEn)}</p>
          <ul className="mt-4 space-y-2 text-sm text-[#c5ccda]">
            <li>UPT {num(selected.upt, locale, 2)} · ATV {money(selected.atv, locale)} · TRX {selected.trx}</li>
            <li>{tx('الترتيب داخل الفرع', 'Rank in store')}: #{selected.rank}</li>
            {selected.floating && <li>{tx('هذا الاسم يظهر في أكثر من فرع، فلا تستخدمه في مسابقة فرع واحد.', 'This name appears in more than one store, so do not use them in a single-store contest.')}</li>}
          </ul>
        </Drawer>
      )}
    </div>
  )
}

function Note({ title, body, tone }: { title: string; body: string; tone?: 'good' | 'bad' | 'warn' | 'gold' }) {
  return (
    <div className={cx('rounded-2xl border-s-2 bg-muted/60 p-3', toneAccent(tone))}>
      <p className="font-medium">{title}</p>
      <p className="text-xs text-muted-foreground">{body}</p>
    </div>
  )
}

