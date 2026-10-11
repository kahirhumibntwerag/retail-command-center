import { useState } from 'react'
import { PROMPTS, answerQuestion, type Advice } from '../advisor'
import { useStore } from '../store'
import { Input } from '@/components/ui/input'
import { Button, PageHeader, Panel } from '../components/kit'

type Turn = { role: 'user' | 'advisor'; text: string; advice?: Advice }

export default function AdvisorView() {
  const { model, locale, tx } = useStore()
  const [text, setText] = useState('')
  const [turns, setTurns] = useState<Turn[]>([])
  const greeting = tx(
    'أنا أحسب الإجابة من الأرقام الظاهرة بعد الفلاتر، وأكتب المعادلة مع كل نتيجة. لا أخمّن مرتجعات أو زيارات غير موجودة في الملف.',
    'I calculate from the numbers inside the current filters, and I show the formula with each answer. I will not invent returns or traffic that are not in the file.',
  )

  function ask(question: string) {
    const advice = answerQuestion(question, model, locale)
    setTurns((current) => [...current, { role: 'user', text: question }, { role: 'advisor', text: advice.summary, advice }])
    setText('')
  }

  return (
    <div>
      <PageHeader
        eyebrow={tx('مستشار', 'Advisor')}
        title={tx('المستشار على البيانات', 'Advisor on the data')}
        subtitle={tx('زر المستشار في أعلى الصفحة يفتح القراءة التنفيذية. هنا تسأل سؤالاً وتحصل على المعادلة مع الرقم.', 'The advisor button at the top of the page opens the executive reading. Ask a question here and the answer arrives with its formula.')}
      />
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <Panel>
          <p className="mb-2 text-sm font-medium">{tx('أسئلة جاهزة', 'Suggested questions')}</p>
          <div className="space-y-2">
            {PROMPTS.map((prompt) => (
              <button key={prompt.en} type="button" onClick={() => ask(tx(prompt.ar, prompt.en))} className="w-full rounded-2xl bg-muted/70 px-3 py-2 text-start text-sm leading-6 hover:bg-white/6">
                {tx(prompt.ar, prompt.en)}
              </button>
            ))}
          </div>
        </Panel>
        <Panel>
          <div className="space-y-4">
            <article className="me-8 rounded-2xl bg-muted/70 p-3">
              <p className="text-xs text-muted-foreground">{tx('المستشار', 'Advisor')}</p>
              <p className="mt-1 text-sm leading-7">{greeting}</p>
            </article>
            {turns.map((turn, index) => (
              <article key={`${turn.role}-${index}`} className={turn.role === 'user' ? 'ms-8 rounded-2xl bg-primary/15 p-3' : 'me-8 rounded-2xl bg-muted p-3'}>
                <p className="text-xs text-muted-foreground">{turn.role === 'user' ? tx('أنت', 'You') : tx('المستشار', 'Advisor')}</p>
                {turn.advice && <h2 className="mt-1 font-semibold">{turn.advice.title}</h2>}
                <p className="mt-1 text-sm leading-7">{turn.text}</p>
                {turn.advice && (
                  <div className="mt-3">
                    <ul className="space-y-1 text-sm">
                      {turn.advice.rows.map((row) => <li key={row.label} className="flex justify-between gap-3"><span>{row.label}</span><span className="num">{row.value}</span></li>)}
                    </ul>
                    <p className="mt-3 text-xs text-primary">{turn.advice.formula}</p>
                    <p className="mt-2 text-sm">{turn.advice.action}</p>
                  </div>
                )}
              </article>
            ))}
          </div>
          <form className="mt-4 flex gap-2" onSubmit={(event) => { event.preventDefault(); if (text.trim()) ask(text.trim()) }}>
            <Input value={text} onChange={(event) => setText(event.target.value)} placeholder={tx('اسأل عن فرع أو مؤشر', 'Ask about a store or a metric')} className="h-10 flex-1" />
            <Button type="submit" tone="gold">{tx('إرسال', 'Send')}</Button>
          </form>
        </Panel>
      </div>
    </div>
  )
}
