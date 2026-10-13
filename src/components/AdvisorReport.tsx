import { useMemo, useState } from 'react'
import { Printer, Sparkles } from 'lucide-react'
import { PROMPTS, answerQuestion, buildExecutiveReport, type Advice } from '../advisor'
import { projectForecast } from '../engine'
import { weekdayName } from '../format'
import { useStore } from '../store'
import { useDirection } from '@/components/ui/direction'
import { Input } from './ui/input'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from './ui/sheet'
import { Button, Modal, Pill, Seg } from './kit'

export function AdvisorSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { model, locale, tx, dataset, setView, setManagerId } = useStore()
  const dir = useDirection()
  const [kind, setKind] = useState<'monthly' | 'daily'>('monthly')
  const [printing, setPrinting] = useState(false)
  const [question, setQuestion] = useState('')
  const [advice, setAdvice] = useState<Advice | null>(null)
  const forecast = useMemo(() => {
    const fullChain = dataset.branches.filter((branch) => branch.currency === 'EGP').reduce((sum, branch) => sum + branch.sales, 0)
    return projectForecast(model.kpis.sales, fullChain, 1)
  }, [dataset.branches, model.kpis.sales])
  const report = useMemo(() => buildExecutiveReport(model, locale, kind, {
    total: forecast.total,
    vsPrevious: forecast.vsPrevious,
    peakName: weekdayName(forecast.peak.wd, locale),
    peakDate: forecast.peak.date,
  }), [model, locale, kind, forecast])

  function ask(text: string) {
    const next = text.trim()
    if (!next) return
    setAdvice(answerQuestion(next, model, locale))
    setQuestion('')
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side={dir === 'rtl' ? 'left' : 'right'}
          aria-label={tx('المستشار', 'Advisor')}
          className="h-full w-full max-w-full gap-0 overflow-hidden p-0 data-[side=left]:w-full data-[side=right]:w-full data-[side=left]:max-w-none data-[side=right]:max-w-none sm:data-[side=left]:max-w-2xl sm:data-[side=right]:max-w-2xl"
        >
          <div className="flex h-full flex-col">
            <SheetHeader className="border-b border-border px-5 py-4 pe-14">
              <p className="inline-flex items-center gap-2 text-xs font-medium tracking-[0.16em] text-primary uppercase">
                <Sparkles size={14} />
                {tx('المستشار', 'Advisor')}
              </p>
              <SheetTitle className="text-start text-xl">{report.headline}</SheetTitle>
              <SheetDescription className="text-start">
                {tx('القراءة محسوبة من الأرقام الظاهرة بعد الفلاتر.', 'This reading is calculated from the numbers inside the current filters.')}
              </SheetDescription>
              <div className="flex flex-wrap gap-2 pt-1">
                <Seg
                  value={kind}
                  onChange={setKind}
                  options={[
                    { id: 'monthly', label: tx('شهري', 'Monthly') },
                    { id: 'daily', label: tx('يومي', 'Daily') },
                  ]}
                />
                <Button onClick={() => setPrinting(true)}><Printer size={16} />{tx('طباعة', 'Print')}</Button>
              </div>
            </SheetHeader>

            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
              <div className="space-y-2 text-sm leading-7">
                <p>{report.reading}</p>
                <p>{report.shape}</p>
                <p>{report.move}</p>
              </div>

              <dl className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
                {report.evidence.map((item) => (
                  <div key={item.label} className="rounded-xl bg-muted/70 px-3 py-2">
                    <dt className="text-xs text-muted-foreground">{item.label}</dt>
                    <dd className="num mt-1 text-sm font-medium">{item.value}</dd>
                  </div>
                ))}
              </dl>

              <section>
                <h3 className="text-sm font-semibold">{tx('ماذا تفعل الآن', 'What to do now')}</h3>
                {report.priorities.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">{tx('لا تنبيهات داخل هذه التصفية.', 'No alerts inside this filter.')}</p>
                ) : (
                  <div className="mt-2 space-y-2">
                    {report.priorities.map((item) => (
                      <article key={item.id} className={`rounded-xl border border-border border-s-4 bg-muted/40 p-3 ${item.severity === 'critical' ? 'border-s-red-400/80 bg-red-500/10' : 'border-s-amber-400/80 bg-amber-500/5'}`}>
                        <div className="mb-1 flex items-start justify-between gap-2">
                          <h4 className="text-sm font-medium">{item.title}</h4>
                          <Pill tone={item.severity === 'critical' ? 'bad' : 'warn'}>{item.severity === 'critical' ? tx('حرج', 'Critical') : tx('تحذير', 'Warning')}</Pill>
                        </div>
                        <p className="text-sm leading-6 text-muted-foreground">{item.action}</p>
                        {item.branchId && (
                          <button
                            type="button"
                            className="mt-2 text-sm text-primary underline-offset-2 hover:underline"
                            onClick={() => { setManagerId(item.branchId!); setView('manager'); onOpenChange(false) }}
                          >
                            {tx('افتح الفرع', 'Open the store')}
                          </button>
                        )}
                      </article>
                    ))}
                  </div>
                )}
                <p className="mt-3 text-xs leading-5 text-muted-foreground">{report.formula}</p>
              </section>

              {advice && (
                <article className="rounded-xl bg-primary/10 p-3">
                  <h3 className="font-medium">{advice.title}</h3>
                  <p className="mt-1 text-sm leading-7">{advice.summary}</p>
                  {advice.rows.length > 0 && (
                    <ul className="mt-2 space-y-1 text-sm">
                      {advice.rows.map((row) => {
                        const signed = /[+\-−]/.test(row.value) && /%|٪/.test(row.value)
                        const negative = signed && /[-−]/.test(row.value)
                        return (
                          <li key={row.label} className="flex justify-between gap-3">
                            <span>{row.label}</span>
                            <span className={`num ${signed ? (negative ? 'text-red-300' : 'text-emerald-300') : 'text-primary'}`}>{row.value}</span>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                  <p className="mt-2 text-xs text-primary">{advice.formula}</p>
                  <p className="mt-2 text-sm">{advice.action}</p>
                </article>
              )}
            </div>

            <div className="border-t border-border bg-popover px-5 py-3">
              <form className="flex flex-col gap-2 sm:flex-row" onSubmit={(event) => { event.preventDefault(); ask(question) }}>
                <Input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder={tx('اسأل المستشار عن هذه الأرقام', 'Ask the advisor about these numbers')} className="h-10 flex-1" />
                <Button type="submit" tone="gold">{tx('اسأل', 'Ask')}</Button>
              </form>
              <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                {PROMPTS.map((prompt) => (
                  <button key={prompt.en} type="button" onClick={() => ask(tx(prompt.ar, prompt.en))} className="shrink-0 rounded-full bg-muted px-3 py-1.5 text-start text-xs hover:bg-accent">
                    {tx(prompt.ar, prompt.en)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
      {printing && (
        <Modal title={tx('تقرير المستشار', 'Advisor report')} wide print onClose={() => setPrinting(false)}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-2xl font-semibold">{report.headline}</h2>
            <div className="flex gap-2">
              <Button onClick={() => window.print()}><Printer size={16} />{tx('طباعة', 'Print')}</Button>
              <Button onClick={() => setPrinting(false)}>{tx('إغلاق', 'Close')}</Button>
            </div>
          </div>
          <div className="space-y-3 text-sm leading-7">
            <p>{report.reading}</p>
            <p>{report.shape}</p>
            <p>{report.move}</p>
            <ul className="list-disc ps-5">
              {report.priorities.map((item) => <li key={item.id}>{item.title} — {item.action}</li>)}
            </ul>
            <p className="text-muted-foreground">{report.formula}</p>
          </div>
        </Modal>
      )}
    </>
  )
}
