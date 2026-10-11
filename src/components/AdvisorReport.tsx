import { useState } from 'react'
import { Printer, Sparkles } from 'lucide-react'
import { PROMPTS, answerQuestion, type Advice, type ExecutiveReport } from '../advisor'
import { useStore } from '../store'
import { Input } from './ui/input'
import { Button, Pill, Seg } from './kit'

export function AdvisorReport({
  report,
  kind,
  onKind,
  onPrint,
  showAsk = true,
}: {
  report: ExecutiveReport
  kind: 'monthly' | 'daily'
  onKind: (kind: 'monthly' | 'daily') => void
  onPrint: () => void
  showAsk?: boolean
}) {
  const { model, locale, tx, setView, setManagerId } = useStore()
  const [question, setQuestion] = useState('')
  const [advice, setAdvice] = useState<Advice | null>(null)

  function ask(text: string) {
    const next = text.trim()
    if (!next) return
    setAdvice(answerQuestion(next, model, locale))
    setQuestion('')
  }

  return (
    <section className="rounded-xl bg-card px-4 py-5 text-card-foreground shadow-sm ring-1 ring-primary/40 sm:px-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-3xl">
          <p className="inline-flex items-center gap-2 text-xs font-medium tracking-[0.16em] text-primary uppercase">
            <Sparkles size={14} />
            {tx('المستشار', 'Advisor')}
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">{report.headline}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Seg
            value={kind}
            onChange={onKind}
            options={[
              { id: 'monthly', label: tx('شهري', 'Monthly') },
              { id: 'daily', label: tx('يومي', 'Daily') },
            ]}
          />
          <Button onClick={onPrint}><Printer size={16} />{tx('طباعة', 'Print')}</Button>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-3 text-sm leading-7">
          <p>{report.reading}</p>
          <p>{report.shape}</p>
          <p>{report.move}</p>
          <p className="text-xs leading-5 text-muted-foreground">{report.formula}</p>
        </div>
        <dl className="grid grid-cols-2 gap-2">
          {report.evidence.map((item) => (
            <div key={item.label} className="rounded-xl bg-muted/70 px-3 py-2">
              <dt className="text-xs text-muted-foreground">{item.label}</dt>
              <dd className="num mt-1 text-sm font-medium">{item.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="mt-4">
        <h3 className="text-sm font-semibold">{tx('ماذا تفعل الآن', 'What to do now')}</h3>
        {report.priorities.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">{tx('لا تنبيهات داخل هذه التصفية.', 'No alerts inside this filter.')}</p>
        ) : (
          <div className="mt-2 grid gap-2 md:grid-cols-2">
            {report.priorities.map((item) => (
              <article key={item.id} className="rounded-xl bg-muted/50 p-3">
                <div className="mb-1 flex items-start justify-between gap-2">
                  <h4 className="text-sm font-medium">{item.title}</h4>
                  <Pill tone={item.severity === 'critical' ? 'bad' : 'warn'}>{item.severity === 'critical' ? tx('حرج', 'Critical') : tx('تحذير', 'Warning')}</Pill>
                </div>
                <p className="text-sm leading-6 text-muted-foreground">{item.action}</p>
                {item.branchId && (
                  <button type="button" className="mt-2 text-sm text-primary underline-offset-2 hover:underline" onClick={() => { setManagerId(item.branchId!); setView('manager') }}>
                    {tx('افتح الفرع', 'Open the store')}
                  </button>
                )}
              </article>
            ))}
          </div>
        )}
      </div>

      {showAsk && <form className="mt-4 flex flex-col gap-2 sm:flex-row" onSubmit={(event) => { event.preventDefault(); ask(question) }}>
        <Input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder={tx('اسأل المستشار عن هذه الأرقام', 'Ask the advisor about these numbers')} className="h-10 flex-1" />
        <Button type="submit" tone="gold">{tx('اسأل', 'Ask')}</Button>
      </form>}
      {showAsk && (
        <div className="mt-2 flex flex-wrap gap-2">
          {PROMPTS.slice(0, 3).map((prompt) => (
            <button key={prompt.en} type="button" onClick={() => ask(tx(prompt.ar, prompt.en))} className="rounded-full bg-muted px-3 py-1 text-start text-xs hover:bg-accent">
              {tx(prompt.ar, prompt.en)}
            </button>
          ))}
        </div>
      )}
      {showAsk && advice && (
        <article className="mt-3 rounded-xl bg-primary/10 p-3">
          <h3 className="font-medium">{advice.title}</h3>
          <p className="mt-1 text-sm leading-7">{advice.summary}</p>
          {advice.rows.length > 0 && (
            <ul className="mt-2 space-y-1 text-sm">
              {advice.rows.map((row) => (
                <li key={row.label} className="flex justify-between gap-3"><span>{row.label}</span><span className="num">{row.value}</span></li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-xs text-primary">{advice.formula}</p>
          <p className="mt-2 text-sm">{advice.action}</p>
        </article>
      )}
    </section>
  )
}
