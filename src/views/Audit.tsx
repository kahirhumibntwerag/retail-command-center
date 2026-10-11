import { useMemo, useState } from 'react'
import { money, num, percent } from '../format'
import { useStore } from '../store'
import { Button, Modal, PageHeader, Panel, Pill } from '../components/kit'

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

  return (
    <div>
      <PageHeader
        eyebrow={tx('النزاهة', 'Integrity')}
        title={tx('تدقيق البيانات', 'Data audit')}
        subtitle={tx('غير المنسوب، البائعون المتنقلون، صفوف الإجمالي المسقطة، وفرق وحدات ملف التشكيلة عن وحدات المبيعات.', 'Unattributed sales, floating associates, dropped total rows, and the unit gap between the style file and the sales file.')}
        actions={<Button onClick={() => setExplain(true)}>{tx('أثر الجودة', 'Why quality matters')}</Button>}
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Mini label={tx('نظافة البيانات', 'Cleanliness')} value={percent(quality, locale, 0)} hint={tx('فروع بلا مشكلة غير منسوب حرجة', 'Stores without a critical unattributed problem')} />
        <Mini label={tx('فروع حرجة', 'Critical stores')} value={String(dirty.length)} hint="> 10%" />
        <Mini label={tx('متنقلون', 'Floating people')} value={String(floaters.length)} hint={tx('نفس الاسم في أكثر من فرع', 'Same name in more than one store')} />
        <Mini label={tx('إجماليات مسقطة', 'Dropped totals')} value={num(dataset.droppedSubtotals, locale)} hint={tx('حتى لا يُحسب المتوسط مرتين', 'So averages are not counted twice')} />
      </div>

      <Panel>
        <h2 className="mb-3 text-lg font-semibold">{tx('المبيعات غير المنسوبة', 'Unattributed sales')}</h2>
        <ul className="space-y-2">
          {[...model.branches].filter((b) => b.unattributed > 0.001).sort((a, b) => b.unattributed - a.unattributed).map((branch) => (
            <li key={branch.id} className="flex items-center justify-between gap-3 rounded-2xl bg-muted/60 px-3 py-2">
              <span>{branch.name}</span>
              <span className="flex items-center gap-2"><span className="num text-sm">{money(branch.sales * branch.unattributed, locale, branch.currency)}</span><Pill tone={branch.unattributed >= 0.1 ? 'bad' : 'neutral'}>{percent(branch.unattributed, locale, 1)}</Pill></span>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel className="mt-4">
        <h2 className="mb-3 text-lg font-semibold">{tx('موظفون متنقلون', 'Floating associates')}</h2>
        <ul className="space-y-3">
          {floaters.map((person) => (
            <li key={person.name} className="rounded-2xl bg-muted/60 p-3">
              <div className="flex justify-between"><strong>{person.name}</strong><span className="num">{money(person.sales, locale)}</span></div>
              <p className="mt-1 text-sm text-muted-foreground">{person.branches.join(' · ')}</p>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel className="mt-4">
        <h2 className="mb-2 text-lg font-semibold">{tx('فرق الملفات', 'File mismatch')}</h2>
        <p className="text-sm leading-7">
          {tx(
            `وحدات المبيعات الظاهرة ${num(Math.round(model.salesUnits), locale)} بينما وحدات ملف التشكيلة ${num(model.styleUnits, locale)}. الفرق ${num(Math.round(gap), locale)} قطعة. لا تبنِ قرار تشكيلة على ملف لا يطابق المبيعات.`,
            `Visible sales units are ${num(Math.round(model.salesUnits), locale)} and the style file has ${num(model.styleUnits, locale)}. The gap is ${num(Math.round(gap), locale)} units. Do not make an assortment decision on a file that does not match sales.`,
          )}
        </p>
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

function Mini({ label, value, hint }: { label: string; value: string; hint: string }) {
  return <article className="rounded-xl bg-card p-4 text-card-foreground shadow-sm ring-1 ring-foreground/10"><p className="text-sm text-muted-foreground">{label}</p><p className="num mt-2 text-2xl">{value}</p><p className="mt-1 text-xs text-muted-foreground">{hint}</p></article>
}
