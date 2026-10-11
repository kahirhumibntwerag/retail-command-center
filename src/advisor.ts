import { money, num, percent } from './format'
import type { Derived } from './engine'
import type { Locale } from './types'

export type Advice = {
  title: string
  summary: string
  rows: { label: string; value: string }[]
  formula: string
  action: string
}

function tx(locale: Locale, ar: string, en: string) {
  return locale === 'ar' ? ar : en
}

export function answerQuestion(question: string, model: Derived, locale: Locale): Advice {
  const q = question.toLowerCase()
  const mansoura = model.branches.find((b) => b.name === 'Mansoura')
  const port = model.branches.find((b) => b.name === 'Port Said')
  const online = model.branches.find((b) => b.name === 'Online')
  const malls = model.options.filter((b) => b.segment === 'Mall')
  const gov = model.options.filter((b) => b.segment === 'Governorate' && b.currency === 'EGP')

  if (/منصور|بورسعيد|port said|mansoura|نصف|h2|second half/.test(q)) {
    const rows = [mansoura, port].filter(Boolean).map((b) => ({
      label: b!.name,
      value: tx(locale, `H2 مقابل H1 ${percent(b!.h2vsH1, locale)}`, `H2 vs H1 ${percent(b!.h2vsH1, locale)}`),
    }))
    return {
      title: tx(locale, 'تراجع النصف الثاني في المنصورة وبورسعيد', 'Second-half drop in Mansoura and Port Said'),
      summary: tx(
        locale,
        'الهبوط ليس عاماً على السلسلة. أغلب الفروع تتراجع حوالي 3.8% فقط بين النصفين، بينما المنصورة وبورسعيد ينكسران بحدة، وآخر 7 أيام فيهما أضعف من متوسط الشهر.',
        'The chain is only slightly softer in the second half. Mansoura and Port Said break the pattern, and their last seven days are weaker than their own month average.',
      ),
      rows,
      formula: tx(locale, 'تغير النصفين = (معدل H2 اليومي ÷ معدل H1 اليومي) − 1', 'Half change = (H2 daily rate ÷ H1 daily rate) − 1'),
      action: tx(locale, 'زيارة الفرعين هذا الأسبوع: فحص التشكيلة المعروضة، وحركة الزوار، وحملة محلية قصيرة بدل خصم واسع على السلسلة.', 'Visit both stores this week. Check the floor set and footfall, and run a short local push instead of a chain-wide discount.'),
    }
  }

  if (/أونلاين|online|مرتجع|return/.test(q)) {
    return {
      title: tx(locale, 'الأونلاين: مبيعات ظاهرة وجودة بيانات ضعيفة', 'Online: visible sales, weak data quality'),
      summary: tx(
        locale,
        'ملف المبيعات لا يحتوي عمود مرتجعات، لذلك لا يمكن حساب نسبة المرتجعات بصدق. ما يمكن قياسه: الأونلاين يساهم في المبيعات، لكن كل القيمة تقريباً مسجلة على حساب عام، وسلة العميل أقل من الفروع.',
        'The sales file has no returns column, so a return rate would be invented. What is measurable: online contributes revenue, almost all of it sits on a generic account, and units per receipt are below stores.',
      ),
      rows: online
        ? [
            { label: tx(locale, 'المبيعات', 'Sales'), value: money(online.sales, locale) },
            { label: tx(locale, 'غير منسوب', 'Unattributed'), value: percent(online.unattributed, locale, 1) },
            { label: 'UPT', value: online.upt.toFixed(2) },
            { label: 'ATV', value: money(online.atv, locale) },
          ]
        : [],
      formula: tx(locale, 'نسبة غير المنسوب = مبيعات الحسابات العامة ÷ مبيعات الفرع', 'Unattributed % = generic-account sales ÷ branch sales'),
      action: tx(locale, 'أضف شيت مرتجعات (تاريخ، فاتورة، قيمة، سبب) قبل أي قرار عن الأونلاين، وأوقف تسجيل الطلبات على حساب ACCOUNTING.', 'Add a returns sheet (date, receipt, value, reason) before any online decision, and stop posting orders to ACCOUNTING.'),
    }
  }

  if (/غير منسوب|unattrib|accounting|prism|عمول/.test(q)) {
    const hot = model.branches.filter((b) => b.unattributed >= 0.1)
    return {
      title: tx(locale, 'الفروع التي تشوّه العمولات', 'Branches distorting commissions'),
      summary: tx(
        locale,
        'أي فرع فوق 10% مبيعات غير منسوبة يُعامل كحرج. الرقم يدخل إجمالي الفرع لكن يخرج من ترتيب البائعين، فيبدو الفرع أفضل مما يستحق كادره.',
        'Anything over 10% unattributed is critical. Those sales stay in the branch total and drop out of associate ranking, so the store looks healthier than its team.',
      ),
      rows: hot.map((b) => ({ label: b.name, value: percent(b.unattributed, locale, 1) })),
      formula: tx(locale, 'غير المنسوب = Σ مبيعات ACCOUNTING / PRISM / SYS ÷ مبيعات الفرع', 'Unattributed = Σ ACCOUNTING / PRISM / SYS sales ÷ branch sales'),
      action: tx(locale, 'أغلق اليوم التشغيلي التالي بشرط كود بائع إجباري، وراجع أسوان والأونلاين أولاً.', 'Make the associate code mandatory on the next trading day. Start with Aswan and Online.'),
    }
  }

  if (/مول|mall|محافظ|governorate|atv|upt/.test(q) && /قارن|compare|مقابل|vs/.test(q)) {
    const avg = (list: typeof malls, pick: 'atv' | 'upt') => {
      const trx = list.reduce((s, b) => s + b.trx, 0)
      if (pick === 'upt') return trx ? list.reduce((s, b) => s + b.units, 0) / trx : 0
      return trx ? list.reduce((s, b) => s + b.sales, 0) / trx : 0
    }
    return {
      title: tx(locale, 'المولات مقابل المحافظات', 'Malls versus governorates'),
      summary: tx(
        locale,
        'المقارنة مرجّحة بعدد الفواتير حتى لا يطغى فرع كبير على المتوسط. المولات أقوى في سلة العميل، والمحافظات أقرب في قيمة الفاتورة مع تشتت أوسع بين الفروع.',
        'The comparison is weighted by receipts so one large store cannot dominate. Malls lead on units per receipt. Governorates sit close on ticket value, with a wider spread between stores.',
      ),
      rows: [
        { label: tx(locale, 'UPT المولات', 'Mall UPT'), value: avg(malls, 'upt').toFixed(2) },
        { label: tx(locale, 'ATV المولات', 'Mall ATV'), value: money(avg(malls, 'atv'), locale) },
        { label: tx(locale, 'UPT المحافظات', 'Governorate UPT'), value: avg(gov, 'upt').toFixed(2) },
        { label: tx(locale, 'ATV المحافظات', 'Governorate ATV'), value: money(avg(gov, 'atv'), locale) },
      ],
      formula: 'ATV = Σ sales ÷ Σ TRX    ·    UPT = Σ units ÷ Σ TRX',
      action: tx(locale, 'انقل تدريب الإكسسوار عند الكاشير من أفضل مول إلى أضعف ثلاث محافظات في UPT.', 'Take the till-accessory routine from the best mall and teach it in the three governorate stores with the weakest UPT.'),
    }
  }

  if (/مخزون|توزيع|allocat|فئات|missing|ناقص/.test(q)) {
    return {
      title: tx(locale, 'فجوات التوزيع', 'Allocation gaps'),
      summary: tx(
        locale,
        model.allocation.length
          ? 'ظهرت فئات تمثل وزناً معتبراً في السلسلة بينما مبيعاتها صفر في فرع داخل نفس الشريحة. هذا أقرب لنقص إرسال من ضعف طلب.'
          : 'لا توجد فجوة توزيع واضحة داخل التصفية الحالية.',
        model.allocation.length
          ? 'Some categories carry real weight in the chain and still show zero sales in a store inside the same segment. That points to allocation, not demand.'
          : 'No allocation gap shows up inside the current filter.',
      ),
      rows: model.allocation.slice(0, 5).map((g) => ({
        label: `${g.branchName}`,
        value: g.category,
      })),
      formula: tx(locale, 'فجوة = حصة الفئة في السلسلة ≥ 5% ووحدات الفرع = 0', 'Gap = category chain share ≥ 5% and branch units = 0'),
      action: tx(locale, 'حوّل دفعة أوشحة/إكسسوار إلى Mall of Arabia هذا الأسبوع وأعد القياس بعد 14 يوماً.', 'Transfer a scarf and accessory pack into Mall of Arabia this week and remeasure after 14 days.'),
    }
  }

  if (/اعتماد|top 3|أعلى 3|تركيز|concentrat/.test(q)) {
    const risky = [...model.branches].filter((b) => b.top3 >= 0.7 && b.staff >= 3).sort((a, b) => b.top3 - a.top3).slice(0, 5)
    return {
      title: tx(locale, 'فروع تعتمد على ثلاثة بائعين', 'Stores leaning on three associates'),
      summary: tx(
        locale,
        'إذا صنع أعلى 3 بائعين أكثر من 70% من مبيعات الفرع، فإجازة أو استقالة واحدة تهز الأسبوع. الخطر تشغيلي وليس بطولة.',
        'When the top three associates produce more than 70% of a store, one holiday or resignation moves the week. That is an operating risk, not a trophy.',
      ),
      rows: risky.map((b) => ({ label: b.name, value: percent(b.top3, locale, 1) })),
      formula: tx(locale, 'اعتماد القمة = مبيعات أعلى 3 بائعين ÷ مبيعات الفرع المنسوبة', 'Top-3 reliance = sales of top 3 associates ÷ attributed branch sales'),
      action: tx(locale, 'وزّع العملاء على البائع الرابع والخامس في هذه الفروع، وحدد ظلاً تدريبياً لكل نجم.', 'Shift customers toward the fourth and fifth associate, and pair each star with a shadow.'),
    }
  }

  const top = model.branches.filter((b) => b.included).slice(0, 3)
  return {
    title: tx(locale, 'ملخص السلسلة الظاهرة الآن', 'Snapshot of the current view'),
    summary: tx(
      locale,
      'هذه الإجابة محسوبة من الصفوف الظاهرة بعد الفلاتر. غيّر الشريحة أو الفرع ثم أعد السؤال ليتغير الأساس.',
      'This answer is calculated from the rows inside the current filters. Change the segment or branch and ask again to move the base.',
    ),
    rows: [
      { label: tx(locale, 'صافي المبيعات', 'Net sales'), value: money(model.kpis.sales, locale) },
      { label: 'ATV', value: money(model.kpis.atv, locale) },
      { label: 'UPT', value: model.kpis.upt.toFixed(2) },
      { label: 'UTV', value: money(model.kpis.utv, locale) },
      ...top.map((b) => ({ label: b.name, value: money(b.periodSalesEgp || b.periodSales, locale, b.currency === 'QAR' && !b.included ? 'QAR' : 'EGP') })),
    ],
    formula: 'ATV = Σ sales ÷ Σ TRX · UPT = Σ units ÷ Σ TRX · UTV = Σ sales ÷ Σ units',
    action: tx(locale, 'ابدأ بالتنبيهات الحرجة، ثم بفرع هبط في آخر 7 أيام، ثم بفجوة التوزيع.', 'Start with critical alerts, then any store down over the last 7 days, then the allocation gap.'),
  }
}

export type ExecutiveReport = {
  kind: 'monthly' | 'daily'
  headline: string
  reading: string
  shape: string
  move: string
  evidence: { label: string; value: string }[]
  priorities: { id: string; title: string; action: string; severity: 'critical' | 'warning'; branchId?: string }[]
  formula: string
}

export function buildExecutiveReport(
  model: Derived,
  locale: Locale,
  kind: 'monthly' | 'daily',
  outlook?: { total: number; vsPrevious: number; peakName: string; peakDate: string },
): ExecutiveReport {
  const included = model.branches.filter((branch) => branch.included)
  const leader = included[0]
  const softest = included[included.length - 1]
  const last = model.daily[model.daily.length - 1]
  const avg = model.daily.reduce((sum, day) => sum + day.sales, 0) / (model.daily.length || 1)
  const dayDelta = avg ? (last?.sales ?? 0) / avg - 1 : 0
  const critical = model.alerts.filter((alert) => alert.severity === 'critical')
  const priorities = model.alerts.slice(0, 4).map((alert) => ({
    id: alert.id,
    title: tx(locale, alert.titleAr, alert.titleEn),
    action: tx(locale, alert.actionAr, alert.actionEn),
    severity: alert.severity,
    branchId: alert.branchId,
  }))
  const half = percent(model.h2Delta, locale, 1, true)
  const sales = money(model.kpis.sales, locale)
  const gap = model.allocation[0]

  const reading = tx(
    locale,
    `الصافي الظاهر ${sales} من ${num(Math.round(model.kpis.trx), locale)} فاتورة. متوسط الفاتورة ${money(model.kpis.atv, locale)}، والسلة ${num(model.kpis.upt, locale, 2)} قطعة، ومتوسط القطعة ${money(model.kpis.utv, locale)}.`,
    `Visible net sales are ${sales} across ${num(Math.round(model.kpis.trx), locale)} receipts. Ticket is ${money(model.kpis.atv, locale)}, basket is ${num(model.kpis.upt, locale, 2)} units, and unit value is ${money(model.kpis.utv, locale)}.`,
  )
  const shape = kind === 'daily' && last
    ? tx(
        locale,
        `آخر يوم ظاهر (${last.label}) سجّل ${money(last.sales, locale)} مقابل متوسط الأيام الظاهرة ${money(avg, locale)} (${percent(dayDelta, locale, 1, true)}). الجمعة أعلى من منتصف الأسبوع ${percent(model.weekendLift.fri, locale, 0, true)} والسبت ${percent(model.weekendLift.sat, locale, 0, true)}.`,
        `The latest visible day (${last.label}) did ${money(last.sales, locale)} against a visible daily average of ${money(avg, locale)} (${percent(dayDelta, locale, 1, true)}). Friday runs ${percent(model.weekendLift.fri, locale, 0, true)} above midweek and Saturday ${percent(model.weekendLift.sat, locale, 0, true)}.`,
      )
    : tx(
        locale,
        `معدل النصف الثاني ${money(model.h2Rate, locale)} في اليوم مقابل ${money(model.h1Rate, locale)} في النصف الأول (${half}). الجمعة أعلى من منتصف الأسبوع ${percent(model.weekendLift.fri, locale, 0, true)} والسبت ${percent(model.weekendLift.sat, locale, 0, true)}.`,
        `The second-half daily rate is ${money(model.h2Rate, locale)} against ${money(model.h1Rate, locale)} in the first half (${half}). Friday runs ${percent(model.weekendLift.fri, locale, 0, true)} above midweek and Saturday ${percent(model.weekendLift.sat, locale, 0, true)}.`,
      )
  const move = tx(
    locale,
    `${leader ? `${leader.name} يتصدر بـ ${money(leader.periodSalesEgp, locale)} (${percent(leader.share, locale)}).` : ''} ${softest && softest !== leader ? `${softest.name} هو الأهدأ بـ ${money(softest.periodSalesEgp, locale)}.` : ''} ${critical.length ? `تنبيهات حرجة: ${critical.length}.` : 'لا تنبيه حرج داخل هذه التصفية.'} ${gap ? `فجوة توزيع: ${gap.category} في ${gap.branchName}.` : ''}`,
    `${leader ? `${leader.name} leads at ${money(leader.periodSalesEgp, locale)} (${percent(leader.share, locale)}).` : ''} ${softest && softest !== leader ? `${softest.name} is the quietest at ${money(softest.periodSalesEgp, locale)}.` : ''} ${critical.length ? `Critical alerts: ${critical.length}.` : 'No critical alert is inside this filter.'} ${gap ? `Allocation gap: ${gap.category} at ${gap.branchName}.` : ''}`,
  )
  const headline = kind === 'daily'
    ? tx(locale, `قراءة اليوم: ${last ? money(last.sales, locale) : sales}`, `Today's reading: ${last ? money(last.sales, locale) : sales}`)
    : model.h2Delta < -0.03
      ? tx(locale, `النصف الثاني أهدأ ${half}. عالج الحرج قبل أي خصم على السلسلة.`, `The second half is ${half} quieter. Fix the critical items before a chain-wide discount.`)
      : tx(locale, `السلسلة عند ${sales}. القرار التالي موجود في التنبيهات لا في المتوسط.`, `The chain sits at ${sales}. The next decision is in the alerts, not in the average.`)

  const evidence = [
    { label: tx(locale, 'صافي المبيعات', 'Net sales'), value: sales },
    { label: 'ATV', value: money(model.kpis.atv, locale) },
    { label: 'UPT', value: num(model.kpis.upt, locale, 2) },
    { label: 'UTV', value: money(model.kpis.utv, locale) },
    { label: tx(locale, 'H2 مقابل H1', 'H2 vs H1'), value: half },
    { label: tx(locale, 'تنبيهات حرجة', 'Critical alerts'), value: String(critical.length) },
  ]
  if (outlook) {
    evidence.push({
      label: tx(locale, 'توقع 30 يوماً', '30-day forecast'),
      value: `${money(outlook.total, locale)} · ${percent(outlook.vsPrevious, locale, 1, true)}`,
    })
    evidence.push({
      label: tx(locale, 'ذروة التوقع', 'Forecast peak'),
      value: `${outlook.peakName} · ${outlook.peakDate}`,
    })
  }

  return {
    kind,
    headline,
    reading,
    shape,
    move: move.replace(/\s+/g, ' ').trim(),
    evidence,
    priorities,
    formula: tx(
      locale,
      'ATV = Σ المبيعات ÷ Σ الفواتير · UPT = Σ القطع ÷ Σ الفواتير · UTV = Σ المبيعات ÷ Σ القطع · تغير النصفين = (معدل H2 ÷ معدل H1) − 1',
      'ATV = Σ sales ÷ Σ receipts · UPT = Σ units ÷ Σ receipts · UTV = Σ sales ÷ Σ units · Half change = (H2 rate ÷ H1 rate) − 1',
    ),
  }
}

export const PROMPTS = [
  { ar: 'ما سبب تراجع مبيعات المنصورة وبورسعيد في النصف الثاني من الشهر؟', en: 'Why did Mansoura and Port Said fall in the second half?' },
  { ar: 'حلل أداء متجر الأونلاين ونسبة المرتجعات مقارنة بالفروع', en: 'Review online performance and returns versus stores' },
  { ar: 'ما هي الفروع ذات المبيعات غير المنسوبة الحرجة وكيف تؤثر على الأرقام؟', en: 'Which branches have critical unattributed sales?' },
  { ar: 'قارن أداء المولات التجارية مقابل فروع المحافظات من حيث ATV و UPT', en: 'Compare malls and governorates on ATV and UPT' },
  { ar: 'ما هي الفئات المخزنية المفقودة في بعض الفروع وتحتاج إعادة توزيع؟', en: 'Which categories are missing and need reallocation?' },
  { ar: 'ما هي الفروع الأكثر اعتماداً على أعلى 3 بائعين ومخاطرها؟', en: 'Which stores depend too much on their top 3 associates?' },
]
