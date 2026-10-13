import { useState } from 'react'
import { money } from '../format'
import { useStore } from '../store'
import type { Competitor, Threat } from '../types'
import { Input } from '@/components/ui/input'
import { Button, cx, Kpi, Modal, PageHeader, Panel, Pill, Select, toneAccent } from '../components/kit'

export default function CompetitorsView() {
  const { dataset, setDataset, locale, tx, model, notify } = useStore()
  const [add, setAdd] = useState(false)
  const [weekly, setWeekly] = useState(false)
  const [ads, setAds] = useState(false)
  const [scan, setScan] = useState<string | null>(null)
  const [draft, setDraft] = useState({ name: '', threat: 'medium' as Threat, offer: '', low: '900', high: '1800' })

  function save() {
    if (!draft.name.trim()) return
    const next: Competitor = {
      id: draft.name.toLowerCase().replace(/\s+/g, '-'),
      name: draft.name.trim(),
      threat: draft.threat,
      offers: [draft.offer || tx('عرض غير محدد', 'Offer not specified')],
      collections: [tx('مجموعة مضافة يدوياً', 'Added manually')],
      prices: [{ label: 'Core', low: Number(draft.low) || 0, high: Number(draft.high) || 0 }],
      tagline: '',
      expansion: tx('بانتظار رصد التوسع', 'Expansion not captured yet'),
      checked: '2026-08-31',
    }
    setDataset({ ...dataset, competitors: [...dataset.competitors, next] })
    setAdd(false)
    notify(tx('أُضيف المنافس', 'Competitor added'))
  }

  return (
    <div>
      <PageHeader
        eyebrow={tx('السوق', 'Market')}
        title={tx('استخبارات المنافسين', 'Competitor intelligence')}
        subtitle={tx('العروض والأسعار والتوسع من لقطة 25–28 أغسطس 2026. التحديث هنا يعيد تركيب الموجز من هذه اللقطة، ولا يتصل ببحث حي.', 'Offers, prices, and expansion from the 25–28 August 2026 capture. Refresh rebuilds the brief from that capture. It does not call a live web search.')}
        actions={
          <>
            <Button onClick={() => notify(tx('أُعيد تركيب الموجز من اللقطة المحفوظة', 'Brief rebuilt from the saved capture'))}>{tx('تحديث الموجز', 'Refresh brief')}</Button>
            <Button onClick={() => setWeekly(true)}>{tx('التقرير الأسبوعي', 'Weekly report')}</Button>
            <Button onClick={() => setAds(true)}>{tx('قراءة الإعلانات', 'Read the ads')}</Button>
            <Button tone="gold" onClick={() => setAdd(true)}>{tx('إضافة منافس', 'Add competitor')}</Button>
          </>
        }
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Kpi label={tx('متوسط سعر القطعة', 'Our unit value')} value={money(model.kpis.utv, locale)} hint={tx('مرجع للمقارنة السعرية', 'Reference for price comparison')} tone="gold" />
        <Kpi label={tx('تهديد مرتفع', 'High threat')} value={String(dataset.competitors.filter((c) => c.threat === 'high').length)} hint={tx('يحتاج متابعة أسبوعية', 'Needs weekly attention')} tone={dataset.competitors.some((c) => c.threat === 'high') ? 'bad' : 'good'} />
        <Kpi label={tx('المنافسون', 'Competitors')} value={String(dataset.competitors.length)} hint={tx('في اللقطة الحالية', 'In the current capture')} />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {dataset.competitors.map((competitor) => {
          const threatTone = competitor.threat === 'high' ? 'bad' : competitor.threat === 'medium' ? 'warn' : undefined
          return (
          <Panel key={competitor.id} className={cx('border-s-2', toneAccent(threatTone))}>
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-sm font-semibold sm:text-base">{competitor.name}</h2>
              <Pill tone={competitor.threat === 'high' ? 'bad' : competitor.threat === 'medium' ? 'warn' : 'neutral'}>{competitor.threat === 'high' ? tx('تهديد مرتفع', 'High threat') : competitor.threat === 'medium' ? tx('متوسط', 'Medium') : tx('منخفض', 'Low')}</Pill>
            </div>
            {competitor.tagline && <p className="mt-2 text-sm text-primary">{competitor.tagline}</p>}
            <p className="mt-3 text-xs tracking-wide text-muted-foreground">{tx('العروض', 'Offers')}</p>
            <ul className="mt-1 list-disc ps-4 text-sm leading-6">{competitor.offers.map((offer) => <li key={offer}>{offer}</li>)}</ul>
            <p className="mt-3 text-xs tracking-wide text-muted-foreground">{tx('المجموعات', 'Collections')}</p>
            <ul className="mt-1 list-disc ps-4 text-sm leading-6">{competitor.collections.map((item) => <li key={item}>{item}</li>)}</ul>
            <div className="mt-3 space-y-1">
              {competitor.prices.map((price) => (
                <p key={price.label} className="flex justify-between text-sm"><span>{price.label}</span><span className="num">{money(price.low, locale)} – {money(price.high, locale)}</span></p>
              ))}
            </div>
            <p className="mt-3 text-sm text-[#c5ccda]">{competitor.expansion}</p>
            <p className="mt-2 text-xs text-muted-foreground">{tx('تاريخ الفحص', 'Checked')} {competitor.checked}</p>
            <div className="mt-3"><Button onClick={() => setScan(competitor.id)}>{tx('اقرأ اللقطة', 'Read the capture')}</Button></div>
          </Panel>
          )
        })}
      </div>

      {add && (
        <Modal title={tx('إضافة', 'Add')} onClose={() => setAdd(false)}>
          <h2 className="mb-3 text-xl font-semibold">{tx('منافس جديد', 'New competitor')}</h2>
          <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); save() }}>
            <Input required value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder={tx('الاسم', 'Name')} className="h-10" />
            <Select
              ariaLabel={tx('التهديد', 'Threat')}
              value={draft.threat}
              onValueChange={(value) => setDraft({ ...draft, threat: value as Threat })}
              options={[
                { value: 'high', label: tx('مرتفع', 'High') },
                { value: 'medium', label: tx('متوسط', 'Medium') },
                { value: 'low', label: tx('منخفض', 'Low') },
              ]}
            />
            <Input value={draft.offer} onChange={(e) => setDraft({ ...draft, offer: e.target.value })} placeholder={tx('أبرز عرض', 'Lead offer')} className="h-10" />
            <div className="grid grid-cols-2 gap-2">
              <Input value={draft.low} onChange={(e) => setDraft({ ...draft, low: e.target.value })} aria-label={tx('أقل سعر', 'Low price')} className="h-10" />
              <Input value={draft.high} onChange={(e) => setDraft({ ...draft, high: e.target.value })} aria-label={tx('أعلى سعر', 'High price')} className="h-10" />
            </div>
            <Button type="submit" tone="gold">{tx('حفظ', 'Save')}</Button>
          </form>
        </Modal>
      )}

      {weekly && (
        <Modal title={tx('أسبوعي', 'Weekly')} wide onClose={() => setWeekly(false)}>
          <h2 className="mb-2 text-xl font-semibold">{tx('مقارنة سعرية هذا الأسبوع', 'This week’s price comparison')}</h2>
          <p className="text-sm leading-7">{tx(`متوسط سعر قطعتنا الظاهر ${money(model.kpis.utv, locale)}. المنافسون أدناه يضغطون على الفستان والبلوزة من جهتين: خصم موسم من الأعلى، وعرض 2+1 من الأدنى.`, `Our visible unit value is ${money(model.kpis.utv, locale)}. Competitors below press dresses and blouses from two sides: a seasonal markdown from above, and a 2-for-1 from below.`)}</p>
          <ul className="mt-4 space-y-2 text-sm">
            {dataset.competitors.map((c) => {
              const dress = c.prices.find((p) => /dress/i.test(p.label)) ?? c.prices[0]
              return (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-muted/50 px-3 py-2">
                  <span>{c.name}: {dress ? `${money(dress.low, locale)} – ${money(dress.high, locale)}` : '—'} · {c.offers[0]}</span>
                  <Pill tone={c.threat === 'high' ? 'bad' : c.threat === 'medium' ? 'warn' : 'neutral'}>{c.threat === 'high' ? tx('مرتفع', 'High') : c.threat === 'medium' ? tx('متوسط', 'Medium') : tx('منخفض', 'Low')}</Pill>
                </li>
              )
            })}
          </ul>
          <div className="mt-4"><Button onClick={() => setWeekly(false)}>{tx('إغلاق', 'Close')}</Button></div>
        </Modal>
      )}

      {ads && (
        <Modal title={tx('الإعلانات', 'Ads')} onClose={() => setAds(false)}>
          <h2 className="mb-2 text-xl font-semibold">{tx('قراءة العروض المحفوظة', 'Reading of the saved offers')}</h2>
          <ul className="space-y-3 text-sm leading-6">
            <li>{tx('Zara يعلن خصم نهاية موسم حتى 40% وشحناً مجانياً فوق 2000. هذا يضغط على فساتيننا كاملة السعر في المولات.', 'Zara is on up to 40% mid-season markdown and free shipping over 2,000. That pressures our full-price dresses in malls.')}</li>
            <li>{tx('DeFacto يعرض 2+1 وخصم تطبيق. الرد الأنسب حزمة إكسسوار لا خصم على البطل السريع.', 'DeFacto is on buy-2-get-1 and an app code. Answer with an accessory bundle, not a discount on a fast hero.')}</li>
            <li>{tx('Dalydress يخصم البليزرات. عندنا البليزر بطيء نسبياً، فلا تدخل حرب سعر هناك.', 'Dalydress is discounting blazers. Ours are relatively slow, so do not start a price fight there.')}</li>
          </ul>
          <div className="mt-4"><Button onClick={() => setAds(false)}>{tx('إغلاق', 'Close')}</Button></div>
        </Modal>
      )}

      {scan && (
        <Modal title={tx('لقطة', 'Capture')} onClose={() => setScan(null)}>
          <h2 className="mb-2 text-xl font-semibold">{dataset.competitors.find((c) => c.id === scan)?.name}</h2>
          <p className="text-sm leading-7">{tx('هذه قراءة للبطاقة المحفوظة بتاريخ الفحص، وليست زيارة جديدة للموقع.', 'This reads the saved card at its check date. It is not a new visit to the site.')}</p>
          <p className="mt-3 text-sm">{dataset.competitors.find((c) => c.id === scan)?.expansion}</p>
          <div className="mt-4"><Button onClick={() => setScan(null)}>{tx('إغلاق', 'Close')}</Button></div>
        </Modal>
      )}
    </div>
  )
}
