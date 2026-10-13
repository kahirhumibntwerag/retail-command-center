import { useMemo, useState } from 'react'
import { money, num, percent } from '../format'
import { useStore } from '../store'
import { Button, cx, Kpi, Modal, PageHeader, Panel, Pill, toneAccent } from '../components/kit'

export default function AuditView() {
  const { model, dataset, locale, tx } = useStore()
  const [explain, setExplain] = useState(false)
  const floaters = useMemo(() => {
    const map = new Map<string, { sales: number; branches: Set<string> }>()
    for (const seller of dataset.sellers.filter((s) => s.floating)) {
      const current = map.get(seller.name) ?? { sales: 0, branches: new Set<string>() }
      current.sales += seller.sales
      const branch = dataset.branches.find((b) => b.id === seller.branchId)
      if (branch) current.branches.add(branch.name)
      map.set(seller.name, current)
    }
    return [...map.entries()].map(([name, value]) => ({ name, sales: value.sales, branches: [...value.branches] })).filter((row) => row.branches.length > 1)
  }, [dataset])
  const dirty = model.branches.filter((b) => b.unattributed >= 0.1)
  const quality = model.branches.length ? 1 - dirty.length / model.branches.length : 1
  const gap = model.salesUnits - model.styleUnits
  const qualityTone = quality >= 0.9 ? 'good' : quality < 0.7 ? 'bad' : 'warn'
  const gapTone = Math.abs(gap) > 500 ? 'bad' : Math.abs(gap) > 100 ? 'warn' : 'good'

  return (
    <div>
      <PageHeader
        eyebrow={tx('النزاهة', 'Integrity')}
        title={tx('تدقيق البيانات', 'Data audit')}
        subtitle={tx('غير المنسوب، البائعون المتنقلون، صفوف الإجمالي المسقطة، وفرق وحدات ملف التشكيلة عن وحدات المبيعات.', 'Unattributed sales, floating associates, dropped total rows, and the unit gap between the style file and the sales file.')}
        actions={<Button onClick={() => setExplain(true)}>{tx('أثر الجودة', 'Why quality matters')}</Button>}
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label={tx('نظافة البيانات', 'Cleanliness')} value={percent(quality, locale, 0)} hint={tx('فروع بلا مشكلة غير منسوب حرجة', 'Stores without a critical unattributed problem')} tone={qualityTone} />
        <Kpi label={tx('فروع حرجة', 'Critical stores')} value={String(dirty.length)} hint="> 10%" tone={dirty.length ? 'bad' : 'good'} />
        <Kpi label={tx('متنقلون', 'Floating people')} value={String(floaters.length)} hint={tx('نفس الاسم في أكثر من فرع', 'Same name in more than one store')} tone={floaters.length ? 'warn' : 'good'} />
        <Kpi label={tx('إجماليات مسقطة', 'Dropped totals')} value={num(dataset.droppedSubtotals, locale)} hint={tx('حتى لا يُحسب المتوسط مرتين', 'So averages are not counted twice')} tone="gold" />
      </div>

      <Panel>
        <h2 className="mb-3 text-sm font-semibold sm:text-base">{tx('المبيعات غير المنسوبة', 'Unattributed sales')}</h2>
        <ul className="space-y-2">
          {[...model.branches].filter((b) => b.unattributed > 0.001).sort((a, b) => b.unattributed - a.unattributed).map((branch) => (
            <li key={branch.id} className={cx('flex items-center justify-between gap-3 rounded-2xl border-s-2 bg-muted/60 px-3 py-2', branch.unattributed >= 0.1 ? toneAccent('bad') : branch.unattributed >= 0.05 ? toneAccent('warn') : toneAccent())}>
              <span>{branch.name}</span>
              <span className="flex items-center gap-2">
                <span className="num text-sm">{money(branch.sales * branch.unattributed, locale, branch.currency)}</span>
                <Pill tone={branch.unattributed >= 0.1 ? 'bad' : branch.unattributed >= 0.05 ? 'warn' : 'neutral'}>{percent(branch.unattributed, locale, 1)}</Pill>
              </span>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel className="mt-4">
        <h2 className="mb-3 text-sm font-semibold sm:text-base">{tx('موظفون متنقلون', 'Floating associates')}</h2>
        <ul className="space-y-3">
          {floaters.map((person) => (
            <li key={person.name} className="rounded-2xl border-s-2 border-s-amber-400/70 bg-muted/60 p-3">
              <div className="flex justify-between"><strong>{person.name}</strong><span className="num">{money(person.sales, locale)}</span></div>
              <p className="mt-1 text-sm text-muted-foreground">{person.branches.join(' · ')}</p>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel className={cx('mt-4 border-s-2', toneAccent(gapTone))}>
        <h2 className="mb-2 text-sm font-semibold sm:text-base">{tx('فرق الملفات', 'File mismatch')}</h2>
        <p className="text-sm leading-7">
          {tx(
            `وحدات المبيعات الظاهرة ${num(Math.round(model.salesUnits), locale)} بينما وحدات ملف التشكيلة ${num(model.styleUnits, locale)}. الفرق ${num(Math.round(gap), locale)} قطعة. لا تبنِ قرار تشكيلة على ملف لا يطابق المبيعات.`,
            `Visible sales units are ${num(Math.round(model.salesUnits), locale)} and the style file has ${num(model.styleUnits, locale)}. The gap is ${num(Math.round(gap), locale)} units. Do not make an assortment decision on a file that does not match sales.`,
          )}
        </p>
        <div className="mt-3"><Pill tone={gapTone}>{tx('فرق الوحدات', 'Unit gap')} {num(Math.round(Math.abs(gap)), locale)}</Pill></div>
      </Panel>

      {explain && (
        <Modal title={tx('الجودة', 'Quality')} onClose={() => setExplain(false)}>
          <h2 className="mb-2 text-xl font-semibold">{tx('ماذا تفسد البيانات الضعيفة', 'What weak data breaks')}</h2>
          <ul className="space-y-2 text-sm leading-6">
            <li>{tx('العمولة تذهب للحساب العام فيبدو البائع أضعف مما عمل.', 'Commission lands on a generic account, so the associate looks weaker than the work.')}</li>
            <li>{tx('المتنقل يُحسب مرتين في مسابقات الفروع.', 'A floating person is counted twice in store contests.')}</li>
            <li>{tx('صف الإجمالي لو بقي في الملف يضاعف المبيعات ويكسر ATV.', 'A leftover total row doubles sales and breaks ATV.')}</li>
          </ul>
          <div className="mt-4"><Button onClick={() => setExplain(false)}>{tx('إغلاق', 'Close')}</Button></div>
        </Modal>
      )}
    </div>
  )
}
