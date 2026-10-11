import { useMemo, useState } from 'react'
import { customerAge, customerLedger } from '../engine'
import { exportRows } from '../excel'
import { money, num } from '../format'
import { useStore } from '../store'
import type { CustomerSegment } from '../types'
import { Button, Drawer, Modal, PageHeader, Panel, Pill, Select, TableWrap, useSort } from '../components/kit'

const SEGMENTS: Record<CustomerSegment, { ar: string; en: string; tone: 'gold' | 'good' | 'warn' | 'bad' }> = {
  champion: { ar: 'بطل', en: 'Champion', tone: 'gold' },
  regular: { ar: 'منتظم', en: 'Regular', tone: 'good' },
  near: { ar: 'على وشك التوقف', en: 'Near to retire', tone: 'warn' },
  retired: { ar: 'متوقف', en: 'Retired', tone: 'bad' },
}

export default function CustomersView() {
  const { model, dataset, locale, tx, notify } = useStore()
  const [segment, setSegment] = useState<CustomerSegment | 'all'>('all')
  const [sortKey, setSortKey] = useState<'ltv' | 'invoices' | 'last' | 'first'>('ltv')
  const [rules, setRules] = useState(false)
  const [campaign, setCampaign] = useState<CustomerSegment | null>(null)
  const [id, setId] = useState<string | null>(null)
  const rows = useMemo(() => {
    const list = model.customers.filter((c) => segment === 'all' || c.segment === segment)
    return [...list].sort((a, b) => {
      if (sortKey === 'invoices') return b.invoices - a.invoices
      if (sortKey === 'last') return b.last.localeCompare(a.last)
      if (sortKey === 'first') return a.first.localeCompare(b.first)
      return b.ltv - a.ltv
    })
  }, [model.customers, segment, sortKey])
  const { sorted, toggle } = useSort(rows, 'ltv')
  const shown = sortKey === 'ltv' ? sorted : rows
  const selected = model.customers.find((c) => c.id === id)
  const ledger = selected ? customerLedger(selected, dataset.models) : []
  const counts = {
    champion: model.customers.filter((c) => c.segment === 'champion').length,
    regular: model.customers.filter((c) => c.segment === 'regular').length,
    near: model.customers.filter((c) => c.segment === 'near').length,
    retired: model.customers.filter((c) => c.segment === 'retired').length,
  }
  const ltv = model.customers.reduce((s, c) => s + c.ltv, 0) / (model.customers.length || 1)
  const championShare = model.customers.reduce((s, c) => s + c.ltv, 0)
  const champ = model.customers.filter((c) => c.segment === 'champion').reduce((s, c) => s + c.ltv, 0)

  function message(kind: CustomerSegment) {
    const names = model.customers.filter((c) => c.segment === kind).slice(0, 6).map((c) => c.name).join(locale === 'ar' ? '، ' : ', ')
    if (kind === 'champion') return tx(`عميلاتنا ${names}: قطعة جديدة وصلت من نفس الخامة التي تشترينها. الحجز باسمك 48 ساعة.`, `${names}: a new piece in the fabric you already buy is on hold for 48 hours.`)
    if (kind === 'near') return tx(`${names}، اشتقنا لزيارتكم. هديّة إكسسوار مع أول فاتورة هذا الأسبوع.`, `${names}, we kept an accessory gift for your next visit this week.`)
    return tx(`${names}، مجموعة جديدة وهدوء في الفروع صباح الأحد. يسعدنا نرجعكم بهدوء من غير خصم عشوائي.`, `${names}: a new collection and a quiet Sunday morning in store. We would like you back without a random discount.`)
  }

  return (
    <div>
      <PageHeader
        eyebrow={tx('العملاء', 'Customers')}
        title={tx('السجلات ودورة الشراء', 'Records and lifecycle')}
        subtitle={tx('تصنيف من أول شراء وآخر زيارة وقيمة العمر. الرسائل تُكتب من الشريحة، ويمكن نسخها لواتساب.', 'Classed from first purchase, last visit, and lifetime value. Messages are written from the segment and can be copied to WhatsApp.')}
        actions={
          <>
            <Button onClick={() => setRules(true)}>{tx('معايير التصنيف', 'Rules')}</Button>
            <Button onClick={() => exportRows('customers.xlsx', 'Customers', shown.map((c) => ({ name: c.name, phone: c.phone, segment: c.segment, branch: c.branchId, first: c.first, last: c.last, invoices: c.invoices, units: c.units, ltv: c.ltv })))}>{tx('تصدير', 'Export')}</Button>
          </>
        }
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Mini label={tx('العملاء', 'Customers')} value={num(model.customers.length, locale)} hint={tx(`حصة الأبطال من الإنفاق ${championShare ? Math.round((champ / championShare) * 100) : 0}%`, `Champions are ${championShare ? Math.round((champ / championShare) * 100) : 0}% of spend`)} />
        <Mini label={tx('أبطال / منتظمون', 'Champions / regulars')} value={`${counts.champion} / ${counts.regular}`} hint={tx('ولاء وإنفاق دوري', 'Loyalty and a steady rhythm')} />
        <Mini label={tx('معرضون / متوقفون', 'At risk / retired')} value={`${counts.near} / ${counts.retired}`} hint={tx('المتوقف غاب أكثر من 150 يوماً', 'Retired means more than 150 days away')} />
        <Mini label={tx('متوسط قيمة العميل', 'Average lifetime value')} value={money(ltv, locale)} hint={tx('إنفاق تراكمي', 'Cumulative spend')} />
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        <Select
          ariaLabel={tx('الشريحة', 'Segment')}
          value={segment}
          onValueChange={(value) => setSegment(value as CustomerSegment | 'all')}
          className="w-full sm:w-44"
          options={[{ value: 'all', label: tx('الكل', 'All') }, ...(Object.keys(SEGMENTS) as CustomerSegment[]).map((key) => ({ value: key, label: tx(SEGMENTS[key].ar, SEGMENTS[key].en) }))]}
        />
        <Select
          ariaLabel={tx('الترتيب', 'Sort')}
          value={sortKey}
          onValueChange={(value) => setSortKey(value as typeof sortKey)}
          className="w-full sm:w-48"
          options={[
            { value: 'ltv', label: tx('الأعلى إنفاقاً', 'Highest spend') },
            { value: 'invoices', label: tx('الأكثر فواتير', 'Most receipts') },
            { value: 'last', label: tx('الأحدث شراءً', 'Most recent') },
            { value: 'first', label: tx('الأقدم علاقة', 'Oldest relationship') },
          ]}
        />
        <Button onClick={() => setCampaign('champion')}>{tx('حملة الأبطال', 'Champion campaign')}</Button>
        <Button onClick={() => setCampaign('near')}>{tx('استعادة المعرضين', 'Win back at-risk')}</Button>
        <Button onClick={() => setCampaign('retired')}>{tx('تنشيط المتوقفين', 'Reactivate retired')}</Button>
      </div>
      <Panel>
        <TableWrap>
          <table className="w-full min-w-[860px] text-sm">
            <thead className="text-muted-foreground">
              <tr>
                <th className="px-2 py-2 text-start"><button type="button" onClick={() => toggle('name')}>{tx('العميلة', 'Customer')}</button></th>
                <th className="px-2 py-2 text-start">{tx('الشريحة', 'Segment')}</th>
                <th className="px-2 py-2 text-start">{tx('أول شراء', 'First buy')}</th>
                <th className="px-2 py-2 text-start">{tx('آخر شراء', 'Last buy')}</th>
                <th className="px-2 py-2 text-start">TRX</th>
                <th className="px-2 py-2 text-start">LTV</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {shown.slice(0, 40).map((customer) => (
                <tr key={customer.id} className="border-t border-white/8">
                  <td className="px-2 py-3"><p className="font-medium">{customer.name}</p><p className="num text-xs text-muted-foreground">{customer.phone}</p></td>
                  <td className="px-2 py-3"><Pill tone={SEGMENTS[customer.segment].tone}>{tx(SEGMENTS[customer.segment].ar, SEGMENTS[customer.segment].en)}</Pill></td>
                  <td className="num px-2 py-3">{customer.first}</td>
                  <td className="px-2 py-3"><p className="num">{customer.last}</p><p className="text-xs text-muted-foreground">{tx(`منذ ${customerAge(customer)} يوماً`, `${customerAge(customer)} days ago`)}</p></td>
                  <td className="num px-2 py-3">{customer.invoices}</td>
                  <td className="num px-2 py-3">{money(customer.ltv, locale)}<span className="block text-xs text-muted-foreground">ATV {money(customer.ltv / customer.invoices, locale)}</span></td>
                  <td className="px-2 py-3"><Button onClick={() => setId(customer.id)}>{tx('السجل', 'Ledger')}</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      </Panel>

      {rules && (
        <Modal title={tx('المعايير', 'Rules')} onClose={() => setRules(false)}>
          <h2 className="mb-3 text-xl font-semibold">{tx('كيف يُصنَّف العميل', 'How a customer is classed')}</h2>
          <ul className="space-y-2 text-sm leading-6">
            <li>{tx('بطل: إنفاق مرتفع وآخر زيارة خلال 45 يوماً.', 'Champion: high spend and a visit within 45 days.')}</li>
            <li>{tx('منتظم: آخر زيارة بين 46 و 75 يوماً.', 'Regular: last visit between 46 and 75 days.')}</li>
            <li>{tx('على وشك التوقف: آخر زيارة بين 76 و 150 يوماً.', 'Near to retire: last visit between 76 and 150 days.')}</li>
            <li>{tx('متوقف: غياب أطول من 150 يوماً.', 'Retired: away for more than 150 days.')}</li>
          </ul>
          <div className="mt-4"><Button onClick={() => setRules(false)}>{tx('حسناً', 'Done')}</Button></div>
        </Modal>
      )}

      {campaign && (
        <Modal title={tx('حملة', 'Campaign')} onClose={() => setCampaign(null)}>
          <h2 className="mb-2 text-xl font-semibold">{tx(SEGMENTS[campaign].ar, SEGMENTS[campaign].en)}</h2>
          <p className="rounded-2xl bg-muted/70 p-4 leading-7">{message(campaign)}</p>
          <div className="mt-4"><Button tone="gold" onClick={() => { void navigator.clipboard.writeText(message(campaign)); notify(tx('تم النسخ', 'Copied')) }}>{tx('نسخ الرسالة', 'Copy message')}</Button></div>
        </Modal>
      )}

      {selected && (
        <Drawer title={selected.name} onClose={() => setId(null)}>
          <h2 className="text-2xl font-semibold">{selected.name}</h2>
          <p className="num text-sm text-muted-foreground">{selected.phone}</p>
          <div className="mt-3"><Pill tone={SEGMENTS[selected.segment].tone}>{tx(SEGMENTS[selected.segment].ar, SEGMENTS[selected.segment].en)}</Pill></div>
          <ul className="mt-4 space-y-3">
            {ledger.map((invoice) => (
              <li key={invoice.id} className="rounded-2xl bg-muted/60 p-3">
                <div className="flex justify-between text-sm"><span className="num">{invoice.date}</span><span className="num">{money(invoice.total, locale)}</span></div>
                <ul className="mt-2 text-xs text-[#c5ccda]">
                  {invoice.lines.map((line) => <li key={line.code}>{line.code} · {line.name} · {money(line.price, locale)}</li>)}
                </ul>
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
