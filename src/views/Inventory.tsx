import { useMemo, useState } from 'react'
import { skuSplit } from '../engine'
import { exportRows } from '../excel'
import { money, num } from '../format'
import { useStore } from '../store'
import type { MoveStatus, Sku } from '../types'
import { Button, Drawer, Modal, PageHeader, Panel, Pill, Select, Stat, TableWrap } from '../components/kit'

const STATUS: Record<MoveStatus, { ar: string; en: string; tone: 'good' | 'neutral' | 'bad' }> = {
  fast: { ar: 'سريع', en: 'Fast', tone: 'good' },
  normal: { ar: 'طبيعي', en: 'Normal', tone: 'neutral' },
  dead: { ar: 'راكد', en: 'Dead', tone: 'bad' },
}

const ACTION = {
  clear35: { ar: 'خصم تصفية 35% أو حزمة مع قطعة أساسية.', en: '35% clearance, or bundle with a core piece.' },
  bundle: { ar: 'اشتري واحدة والثانية بنصف السعر، أو حوّل لفروع الإقبال.', en: 'Second piece at half price, or transfer into high-traffic stores.' },
  outlet: { ar: 'تصفية فورية في شبرا.', en: 'Clear immediately through Shubra.' },
  replenish: { ar: 'حافظ على التغذية. النفاد هنا يضيع مبيعاً.', en: 'Keep feeding it. A stockout here loses sales.' },
  steady: { ar: 'دورة توريد عادية.', en: 'Stay on the normal replenishment cycle.' },
}

export default function InventoryView() {
  const { dataset, filters, locale, tx } = useStore()
  const [status, setStatus] = useState<MoveStatus | 'all'>('all')
  const [sort, setSort] = useState<'frozen' | 'sold' | 'hand' | 'doi'>('frozen')
  const [rules, setRules] = useState(false)
  const [plan, setPlan] = useState(false)
  const [sku, setSku] = useState<Sku | null>(null)
  const rows = useMemo(() => {
    const list = dataset.inventory.filter((item) => (status === 'all' || item.status === status) && (filters.dept === 'all' || item.dept === filters.dept))
    return [...list].sort((a, b) => {
      if (sort === 'sold') return b.sold30 - a.sold30
      if (sort === 'hand') return b.onHand - a.onHand
      if (sort === 'doi') return (b.doi ?? 999) - (a.doi ?? 999)
      return b.frozen - a.frozen
    })
  }, [dataset.inventory, status, sort, filters.dept])
  const onHand = rows.reduce((s, r) => s + r.onHand, 0)
  const frozen = dataset.inventory.filter((r) => r.status === 'dead').reduce((s, r) => s + r.frozen, 0)
  const fastValue = dataset.inventory.filter((r) => r.status === 'fast').reduce((s, r) => s + r.stockValue, 0)

  return (
    <div>
      <PageHeader
        eyebrow={tx('المخزون', 'Inventory')}
        title={tx('سريع، طبيعي، راكد', 'Fast, normal, dead')}
        subtitle={tx('الراكد رأس مال متجمد. السريع يحتاج تغذية قبل النفاد. اضغط الصنف لترى توزيع الفروع.', 'Dead stock is frozen cash. Fast stock needs a refill before it runs out. Open a style to see the store split.')}
        actions={
          <>
            <Button onClick={() => setRules(true)}>{tx('معايير السرعة', 'Speed rules')}</Button>
            <Button onClick={() => exportRows('inventory.xlsx', 'Inventory', rows.map((r) => ({ code: r.code, name: r.name, status: r.status, onHand: r.onHand, sold30: r.sold30, weekly: r.weekly, doi: r.doi ?? '', frozen: r.frozen })))}>{tx('تصدير', 'Export')}</Button>
          </>
        }
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Mini label={tx('الأصناف الظاهرة', 'Visible styles')} value={String(rows.length)} hint={tx(`${num(onHand, locale)} قطعة`, `${num(onHand, locale)} units`)} />
        <Mini label={tx('سريعة الحركة', 'Fast')} value={String(dataset.inventory.filter((r) => r.status === 'fast').length)} hint={money(fastValue, locale)} />
        <Mini label={tx('راكدة', 'Dead')} value={String(dataset.inventory.filter((r) => r.status === 'dead').length)} hint={tx('تحتاج قرار تسييل', 'Need a cash decision')} />
        <Mini label={tx('رأس المال المجمد', 'Frozen capital')} value={money(frozen, locale)} hint={tx('مجموع قيمة الراكد المقيدة', 'Tied up in non-moving styles')} />
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        {(['all', 'fast', 'normal', 'dead'] as const).map((id) => (
          <button key={id} type="button" aria-pressed={status === id} onClick={() => setStatus(id)} className={`rounded-full px-3 py-1 text-sm ${status === id ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
            {id === 'all' ? tx('الكل', 'All') : tx(STATUS[id].ar, STATUS[id].en)}
          </button>
        ))}
        <Select
          ariaLabel={tx('الترتيب', 'Sort')}
          value={sort}
          onValueChange={(value) => setSort(value as typeof sort)}
          className="w-full sm:w-48"
          options={[
            { value: 'frozen', label: tx('الأعلى تجميداً', 'Most frozen') },
            { value: 'sold', label: tx('الأسرع مبيعاً', 'Fastest selling') },
            { value: 'hand', label: tx('الأعلى مخزوناً', 'Highest stock') },
            { value: 'doi', label: tx('أطول تغطية', 'Longest cover') },
          ]}
        />
        <Button tone="gold" onClick={() => setPlan(true)}>{tx('خطة تسييل', 'Liquidation plan')}</Button>
      </div>
      <div className="flex flex-col gap-2 md:hidden">
        {rows.map((item) => (
          <button key={item.code} type="button" onClick={() => setSku(item)} className="rounded-2xl bg-card p-3 text-start ring-1 ring-foreground/10">
            <span className="flex items-start justify-between gap-2">
              <span className="min-w-0">
                <span className="block font-medium">{item.code}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{item.name}</span>
              </span>
              <Pill tone={STATUS[item.status].tone}>{tx(STATUS[item.status].ar, STATUS[item.status].en)}</Pill>
            </span>
            <span className="mt-3 grid grid-cols-2 gap-2">
              <Stat label={tx('المخزون', 'On hand')} value={num(item.onHand, locale)} />
              <Stat label={tx('مبيعات 30 يوم', '30-day sales')} value={num(item.sold30, locale)} />
              <Stat label="DOI" value={item.doi == null ? '∞' : tx(`${item.doi} يوم`, `${item.doi} days`)} />
              <Stat label={tx('مجمّد', 'Frozen')} value={item.frozen ? money(item.frozen, locale) : '—'} tone={item.frozen ? 'bad' : undefined} />
            </span>
          </button>
        ))}
      </div>
      <Panel className="hidden md:block">
        <TableWrap>
          <table className="w-full min-w-[880px] text-sm">
            <thead className="text-muted-foreground"><tr><th className="px-2 py-2 text-start">SKU</th><th className="px-2 py-2 text-start">{tx('الحالة', 'Status')}</th><th className="px-2 py-2 text-start">{tx('المخزون', 'On hand')}</th><th className="px-2 py-2 text-start">{tx('مبيعات 30 يوم', '30-day sales')}</th><th className="px-2 py-2 text-start">DOI</th><th className="px-2 py-2 text-start">{tx('مجمّد', 'Frozen')}</th></tr></thead>
            <tbody>
              {rows.map((item) => (
                <tr key={item.code} className="border-t border-white/8">
                  <td className="px-2 py-3"><p className="font-medium">{item.code}</p><p className="text-xs text-muted-foreground">{item.name} · {item.dept}</p></td>
                  <td className="px-2 py-3"><Pill tone={STATUS[item.status].tone}>{tx(STATUS[item.status].ar, STATUS[item.status].en)}</Pill></td>
                  <td className="num px-2 py-3">{num(item.onHand, locale)}</td>
                  <td className="num px-2 py-3">{num(item.sold30, locale)} · {item.weekly}/w</td>
                  <td className="num px-2 py-3">{item.doi == null ? '∞' : tx(`${item.doi} يوم`, `${item.doi} days`)}</td>
                  <td className="px-2 py-3">
                    <div className="num">{item.frozen ? money(item.frozen, locale) : '—'}</div>
                    <button type="button" className="mt-1 text-xs text-primary underline" onClick={() => setSku(item)}>{tx('التوزيع', 'Split')}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      </Panel>

      {rules && (
        <Modal title={tx('السرعة', 'Speed')} onClose={() => setRules(false)}>
          <h2 className="mb-2 text-xl font-semibold">{tx('كيف تُصنَّف الحركة', 'How movement is classed')}</h2>
          <ul className="space-y-2 text-sm leading-6">
            <li>{tx('سريع: تغطية أقل من 21 يوماً ومبيعات أسبوعية عالية.', 'Fast: cover under 21 days and a high weekly rate.')}</li>
            <li>{tx('طبيعي: تغطية بين 21 و 90 يوماً.', 'Normal: cover between 21 and 90 days.')}</li>
            <li>{tx('راكد: مبيعات شبه صفر وتغطية غير محدودة.', 'Dead: almost no sales and unlimited cover.')}</li>
          </ul>
          <div className="mt-4"><Button onClick={() => setRules(false)}>{tx('حسناً', 'Done')}</Button></div>
        </Modal>
      )}

      {plan && (
        <Modal title={tx('التسييل', 'Liquidation')} wide onClose={() => setPlan(false)}>
          <h2 className="mb-2 text-xl font-semibold">{tx('خطة رأس المال المجمد', 'Frozen-capital plan')}</h2>
          <ol className="space-y-3 text-sm leading-6">
            {dataset.inventory.filter((item) => item.status === 'dead').slice(0, 6).map((item, index) => (
              <li key={item.code}><strong>{index + 1}. {item.code}</strong> — {money(item.frozen, locale)} — {tx(ACTION[item.action].ar, ACTION[item.action].en)}</li>
            ))}
          </ol>
          <p className="mt-4 text-sm text-muted-foreground">{tx('الخطة مرتبة من الأكبر تجميداً. لا تخصم السريع لتمويل الراكد.', 'Ordered by frozen value. Do not discount fast styles to fund the dead ones.')}</p>
          <div className="mt-4"><Button onClick={() => setPlan(false)}>{tx('إغلاق', 'Close')}</Button></div>
        </Modal>
      )}

      {sku && (
        <Drawer title={sku.code} onClose={() => setSku(null)}>
          <p className="text-xs text-primary">{sku.category}</p>
          <h2 className="text-2xl font-semibold">{sku.name}</h2>
          <p className="mt-3 leading-7">{tx(ACTION[sku.action].ar, ACTION[sku.action].en)}</p>
          <ul className="mt-4 space-y-2">
            {skuSplit(sku, dataset.branches).map((row) => (
              <li key={row.id} className="flex justify-between rounded-xl bg-muted/60 px-3 py-2 text-sm">
                <span>{row.name}</span><span className="num">{row.qty === 0 ? tx('صفر — افحص الإرسال', 'Zero — check the send') : num(row.qty, locale)}</span>
              </li>
            ))}
          </ul>
        </Drawer>
      )}
    </div>
  )
}

function Mini({ label, value, hint }: { label: string; value: string; hint: string }) {
  return <article className="rounded-xl bg-card p-4 text-card-foreground shadow-sm ring-1 ring-foreground/10"><p className="text-sm text-muted-foreground">{label}</p><p className="num mt-2 text-2xl">{value}</p><p className="mt-1 text-xs text-muted-foreground">{hint}</p></article>
}
