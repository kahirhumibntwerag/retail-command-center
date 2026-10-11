import {
  AS_OF,
  BRANCHES,
  CASHIER_ACCOUNTS,
  CHAIN_BASELINE_FORECAST,
  COMPETITORS,
  FIRST_NAMES,
  FLOATERS,
  INVENTORY,
  LAST_NAMES,
  LOW_UPT,
  MODELS,
  SELLER_NAMES,
  branchId,
} from './data'
import type {
  Alert,
  Branch,
  Competitor,
  Customer,
  CustomerSegment,
  Dataset,
  Dept,
  Filters,
  Model,
  Period,
  Segment,
  Seller,
  Settings,
  Sku,
} from './types'

export const WEEKDAY_WEIGHT = [1, 0.9, 0.84, 0.93, 1.08, 1.58, 1.52]

export function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hashName(name: string) {
  return [...name].reduce((s, c) => s + c.charCodeAt(0), 0)
}

export function augustWeekday(day: number) {
  return new Date(2026, 7, day).getDay()
}

export function localDate(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export function periodIndexes(period: Period) {
  if (period === 'h1') return Array.from({ length: 15 }, (_, i) => i)
  if (period === 'h2') return Array.from({ length: 16 }, (_, i) => i + 15)
  if (period === 'last7') return Array.from({ length: 7 }, (_, i) => i + 24)
  return Array.from({ length: 31 }, (_, i) => i)
}

export function branchDaily(b: Branch) {
  const weights = Array.from({ length: 31 }, (_, i) => WEEKDAY_WEIGHT[augustWeekday(i + 1)])
  const h1 = weights.slice(0, 15)
  const mid = weights.slice(15, 24)
  const last = weights.slice(24)
  const ratio = 1 + b.h2vsH1
  const k = ratio * (16 / 15)
  const h1Total = b.sales / (k + 1)
  const h2Total = b.sales - h1Total
  const scale = (arr: number[], total: number) => {
    const s = arr.reduce((a, n) => a + n, 0) || 1
    return arr.map((w) => (w / s) * total)
  }
  if (b.last7VsAvg != null) {
    let lastTotal = (b.sales / 31) * (1 + b.last7VsAvg) * 7
    lastTotal = Math.min(lastTotal, h2Total * 0.85)
    const midTotal = h2Total - lastTotal
    return [...scale(h1, h1Total), ...scale(mid, midTotal), ...scale(last, lastTotal)]
  }
  return [...scale(h1, h1Total), ...scale([...mid, ...last], h2Total)]
}

function deptMix(b: Branch): Record<Dept, number> {
  const tilt = (hashName(b.name) % 7) / 100
  let casual = 0.68 + tilt
  let jeans = 0.15
  let accessory = 0.13 - tilt / 2
  let defou = 0.04
  if (b.segment === 'Outlet') {
    casual = 0.48
    jeans = 0.18
    accessory = 0.1
    defou = 0.24
  } else if (b.segment === 'Online') {
    casual = 0.76
    jeans = 0.12
    accessory = 0.1
    defou = 0.02
  }
  const sum = casual + jeans + accessory + defou
  return {
    CASUAL: casual / sum,
    JEANS: jeans / sum,
    ACCESSORY: accessory / sum,
    DEFOU: defou / sum,
  }
}

export function toEgp(b: Branch, amount: number, settings: Settings) {
  if (b.currency === 'QAR') return amount * settings.fx
  return amount
}

function inChain(b: Branch, settings: Settings) {
  if (b.currency === 'QAR' && !settings.includeDoha) return false
  return true
}

function splitWeights(n: number, topShare: number, rnd: () => number) {
  if (n <= 0) return []
  if (n === 1) return [1]
  const topCount = Math.min(3, n)
  const share = Math.min(Math.max(topShare, topCount / n), 0.98)
  const topW = Array.from({ length: topCount }, (_, i) => topCount - i + rnd() * 0.4)
  const restW = Array.from({ length: n - topCount }, () => 0.35 + rnd())
  const norm = (ws: number[], portion: number) => {
    const s = ws.reduce((a, x) => a + x, 0) || 1
    return ws.map((w) => (w / s) * portion)
  }
  return [...norm(topW, share), ...norm(restW, 1 - share)]
}

function buildSellers(branches: Branch[]): Seller[] {
  const rnd = mulberry32(202608)
  const sellers: Seller[] = []
  let nameCursor = 0
  for (const b of branches) {
    const cashier = Math.min(Math.max(b.unattributed, 0), 1)
    const salesPool = b.sales * (1 - cashier)
    const trxPool = Math.max(0, Math.round(b.trx * (1 - cashier)))
    const n = Math.max(b.staff, 1)
    const weights = splitWeights(n, b.top3, rnd)
    const pin = LOW_UPT[b.name]
    for (let i = 0; i < n; i += 1) {
      const sales = salesPool * (weights[i] ?? 0)
      let trx = Math.max(1, Math.round(trxPool * (weights[i] ?? 0)))
      let upt = b.upt * (0.86 + rnd() * 0.32)
      let name = SELLER_NAMES[nameCursor % SELLER_NAMES.length] + (nameCursor >= SELLER_NAMES.length ? ` ${Math.floor(nameCursor / SELLER_NAMES.length) + 1}` : '')
      nameCursor += 1
      const isPin = Boolean(pin && i === n - 1)
      if (isPin && pin) {
        name = pin.name
        upt = pin.upt
        trx = Math.min(pin.trx, Math.max(trxPool, pin.trx))
      }
      if (n === 1 && cashier > 0.9) {
        trx = Math.max(1, Math.round(b.trx * 0.01))
      }
      const units = Math.max(1, Math.round(trx * upt))
      sellers.push({
        id: `${b.id}-${i}`,
        name,
        branchId: b.id,
        sales,
        units,
        trx,
        upt: trx ? units / trx : upt,
        atv: trx ? sales / trx : 0,
        floating: false,
      })
    }
    const mine = sellers.filter((s) => s.branchId === b.id)
    const trxSum = mine.reduce((a, s) => a + s.trx, 0) || 1
    const salesSum = mine.reduce((a, s) => a + s.sales, 0) || 1
    const trxTarget = Math.max(trxPool, mine.length)
    for (const s of mine) {
      if (pin && s.name === pin.name) continue
      s.trx = Math.max(1, Math.round((s.trx / trxSum) * trxTarget))
      s.sales = (s.sales / salesSum) * salesPool
      s.units = Math.max(1, Math.round(s.trx * s.upt))
      s.atv = s.trx ? s.sales / s.trx : 0
    }
  }
  for (const floater of FLOATERS) {
    for (const branchName of floater.branches) {
      const id = branchId(branchName)
      const mine = sellers.filter((s) => s.branchId === id && !s.floating)
      const pinName = LOW_UPT[branchName]?.name
      const host = [...mine].reverse().find((s) => s.name !== pinName)
      if (!host) continue
      host.name = floater.name
      host.floating = true
    }
  }
  return sellers
}

function buildCustomers(branches: Branch[]): Customer[] {
  const rnd = mulberry32(120626)
  const plan: { segment: CustomerSegment; count: number; invoices: number; ltv: number }[] = [
    { segment: 'champion', count: 50, invoices: 8, ltv: 28000 },
    { segment: 'regular', count: 35, invoices: 4, ltv: 14000 },
    { segment: 'near', count: 20, invoices: 4, ltv: 11000 },
    { segment: 'retired', count: 15, invoices: 2, ltv: 7000 },
  ]
  const egypt = branches.filter((b) => b.currency === 'EGP')
  const customers: Customer[] = []
  let i = 0
  for (const group of plan) {
    for (let n = 0; n < group.count; n += 1) {
      const branch = egypt[Math.floor(rnd() * egypt.length)]
      const recency = group.segment === 'champion' ? 3 + Math.floor(rnd() * 40) : group.segment === 'regular' ? 46 + Math.floor(rnd() * 28) : group.segment === 'near' ? 78 + Math.floor(rnd() * 60) : 155 + Math.floor(rnd() * 80)
      const last = new Date(2026, 7, 31)
      last.setDate(last.getDate() - recency)
      const span = 40 + Math.floor(rnd() * 140)
      const first = new Date(last)
      first.setDate(first.getDate() - span)
      const invoices = Math.max(1, group.invoices + Math.floor(rnd() * 5) - 2)
      const units = invoices * (1 + Math.floor(rnd() * 2))
      const ltv = Math.round(group.ltv * (0.72 + rnd() * 0.7))
      const phonePrefix = ['010', '011', '012', '015'][i % 4]
      customers.push({
        id: `c-${i + 1}`,
        name: `${FIRST_NAMES[i % FIRST_NAMES.length]} ${LAST_NAMES[(i * 3) % LAST_NAMES.length]}`,
        phone: phonePrefix + String(10000000 + ((i * 7919) % 90000000)).slice(0, 8),
        branchId: branch.id,
        first: localDate(first),
        last: localDate(last),
        invoices,
        units,
        ltv,
        segment: group.segment,
      })
      i += 1
    }
  }
  return customers
}

export function createSample(): Dataset {
  return {
    source: 'sample',
    branches: BRANCHES,
    sellers: buildSellers(BRANCHES),
    models: MODELS,
    customers: buildCustomers(BRANCHES),
    inventory: INVENTORY,
    competitors: COMPETITORS,
    droppedSubtotals: 28,
  }
}

export const SAMPLE = createSample()

export function datasetFromUpload(input: {
  branches: Branch[]
  sellers?: Seller[]
  models?: Model[]
  customers?: Customer[]
  inventory?: Sku[]
  competitors?: Competitor[]
  droppedSubtotals: number
  sourceName?: string
}): Dataset {
  const branches = input.branches.map((b) => ({ ...b, units: b.units || Math.round(b.trx * b.upt) }))
  return {
    source: 'upload',
    sourceName: input.sourceName,
    branches,
    sellers: input.sellers?.length ? input.sellers : buildSellers(branches),
    models: input.models?.length ? input.models : MODELS,
    customers: input.customers?.length ? input.customers : buildCustomers(branches),
    inventory: input.inventory?.length ? input.inventory : INVENTORY,
    competitors: input.competitors?.length ? input.competitors : COMPETITORS,
    droppedSubtotals: input.droppedSubtotals,
  }
}

export type BranchView = Branch & {
  segment: Segment
  target: number
  periodSales: number
  periodSalesEgp: number
  periodTrx: number
  periodUnits: number
  share: number
  included: boolean
  series: number[]
}

export type Derived = {
  branches: BranchView[]
  options: Branch[]
  kpis: {
    sales: number
    units: number
    trx: number
    atv: number
    upt: number
    utv: number
    active: number
  }
  daily: { day: number; label: string; sales: number; weekend: boolean }[]
  weekdays: { key: number; avg: number }[]
  h1Rate: number
  h2Rate: number
  h2Delta: number
  weekendLift: { fri: number; sat: number }
  sellers: (Seller & { coach: ReturnType<typeof coachOf>; rank: number; branchName: string })[]
  alerts: Alert[]
  customers: Customer[]
  pareto: { model: Model; cumulative: number; tier: '50' | '80' | 'tail' }[]
  allocation: { branchName: string; segment: Segment; category: string; segmentShare: number }[]
  dcs: { category: string; units: number; chainShare: number; dept: Dept }[]
  styleUnits: number
  salesUnits: number
}

export function coachOf(seller: Seller, branch: Branch, chain: { upt: number; atv: number }) {
  if (seller.trx < 30 && seller.sales < branch.sales * 0.12) return 'closing' as const
  const uptLow = seller.upt < branch.upt * 0.82
  const atvLowVsBranch = seller.atv < branch.atv * 0.85
  const star = seller.upt >= chain.upt && seller.atv >= chain.atv && !uptLow
  if (star) return 'star' as const
  if (uptLow && seller.atv >= branch.atv * 0.92 && seller.trx >= 30) return 'upt' as const
  if (branch.currency === 'QAR' || (atvLowVsBranch && seller.upt >= branch.upt * 0.9)) return 'atv' as const
  if (uptLow && atvLowVsBranch) return 'both' as const
  return 'balanced' as const
}

function daysAgo(iso: string) {
  const end = new Date(AS_OF).getTime()
  return Math.round((end - new Date(iso).getTime()) / 86400000)
}

export function customerAge(c: Customer) {
  return daysAgo(c.last)
}

export function derive(ds: Dataset, filters: Filters, settings: Settings): Derived {
  const options = ds.branches.map((b) => ({
    ...b,
    segment: settings.segmentOverrides[b.id] ?? b.segment,
    target: settings.targetOverrides[b.id] ?? b.target,
  }))
  const selected = options.filter((b) => {
    if (filters.segment !== 'all' && b.segment !== filters.segment) return false
    if (filters.branchId !== 'all' && b.id !== filters.branchId) return false
    return true
  })
  const dept = filters.dept
  const idxs = periodIndexes(filters.period)
  const seriesMap = new Map(options.map((b) => [b.id, branchDaily(b)]))

  const rows: BranchView[] = selected.map((b) => {
    const series = seriesMap.get(b.id) ?? []
    const mix = dept === 'all' ? 1 : deptMix(b)[dept]
    const periodNative = idxs.reduce((s, i) => s + (series[i] ?? 0), 0) * mix
    const included = inChain(b, settings)
    return {
      ...b,
      series: series.map((n) => n * mix),
      periodSales: periodNative,
      periodSalesEgp: included ? toEgp(b, periodNative, settings) : 0,
      periodTrx: b.trx * (b.sales ? periodNative / b.sales : 0),
      periodUnits: b.units * (b.sales ? periodNative / b.sales : 0),
      share: 0,
      included,
    }
  })
  const chainSales = rows.reduce((s, b) => s + b.periodSalesEgp, 0)
  for (const row of rows) row.share = chainSales ? row.periodSalesEgp / chainSales : 0

  const units = rows.reduce((s, b) => s + (b.included ? b.periodUnits : 0), 0)
  const trx = rows.reduce((s, b) => s + (b.included ? b.periodTrx : 0), 0)
  const kpis = {
    sales: chainSales,
    units,
    trx,
    atv: trx ? chainSales / trx : 0,
    upt: trx ? units / trx : 0,
    utv: units ? chainSales / units : 0,
    active: rows.filter((b) => b.included).length,
  }

  const daily = Array.from({ length: 31 }, (_, i) => {
    const sales = rows.reduce((s, b) => s + (b.included ? toEgp(b, b.series[i] ?? 0, settings) : 0), 0)
    const day = i + 1
    const wd = augustWeekday(day)
    return { day, label: String(day).padStart(2, '0'), sales, weekend: wd === 5 || wd === 6 }
  })
  const visibleDaily = daily.filter((d) => idxs.includes(d.day - 1))

  const weekdayBuckets = Array.from({ length: 7 }, () => ({ sum: 0, n: 0 }))
  for (const d of daily) {
    const wd = augustWeekday(d.day)
    weekdayBuckets[wd].sum += d.sales
    weekdayBuckets[wd].n += 1
  }
  const weekdays = weekdayBuckets.map((b, key) => ({ key, avg: b.n ? b.sum / b.n : 0 }))
  const mid = [0, 1, 2, 3, 4].reduce((s, k) => s + weekdays[k].avg, 0) / 5
  const weekendLift = {
    fri: mid ? weekdays[5].avg / mid - 1 : 0,
    sat: mid ? weekdays[6].avg / mid - 1 : 0,
  }

  const fullIdxH1 = periodIndexes('h1')
  const fullIdxH2 = periodIndexes('h2')
  const h1Sales = rows.reduce((s, b) => s + fullIdxH1.reduce((a, i) => a + (b.included ? toEgp(b, b.series[i] ?? 0, settings) : 0), 0), 0)
  const h2Sales = rows.reduce((s, b) => s + fullIdxH2.reduce((a, i) => a + (b.included ? toEgp(b, b.series[i] ?? 0, settings) : 0), 0), 0)
  const h1Rate = h1Sales / 15
  const h2Rate = h2Sales / 16

  const chain = { upt: kpis.upt || 1.6, atv: kpis.atv || 1962 }
  const branchById = new Map(rows.map((b) => [b.id, b]))
  const optionById = new Map(options.map((b) => [b.id, b]))
  const visibleIds = new Set(rows.map((b) => b.id))
  const sellers = ds.sellers
    .filter((s) => visibleIds.has(s.branchId))
    .filter((s) => !settings.excludedCashiers.includes(s.name))
    .map((s) => {
      const b = optionById.get(s.branchId)!
      return { ...s, coach: coachOf(s, b, chain), rank: 0, branchName: b.name }
    })
  const ranked = new Map<string, (typeof sellers)[number][]>()
  for (const s of sellers) {
    const list = ranked.get(s.branchId) ?? []
    list.push(s)
    ranked.set(s.branchId, list)
  }
  for (const list of ranked.values()) {
    list.sort((a, b) => b.sales - a.sales)
    list.forEach((s, i) => {
      s.rank = i + 1
    })
  }
  sellers.sort((a, b) => b.sales - a.sales)

  const alerts: Alert[] = []
  for (const b of rows) {
    if (b.unattributed >= 0.1) {
      const value = b.sales * b.unattributed
      alerts.push({
        id: `unattr-${b.id}`,
        severity: 'critical',
        branchId: b.id,
        titleAr: `مبيعات غير منسوبة مرتفعة بفرع ${b.name} (${Math.round(b.unattributed * 1000) / 10}%)`,
        titleEn: `High unattributed sales at ${b.name} (${Math.round(b.unattributed * 1000) / 10}%)`,
        bodyAr: `تم تسجيل مبيعات بقيمة ${Math.round(value).toLocaleString('en-EG')} ج.م (${Math.round(b.unattributed * 1000) / 10}%) تحت حسابات عامة (مثل ACCOUNTING / PRISM) بدلاً من البائعين الفعليين.`,
        bodyEn: `${Math.round(value).toLocaleString('en-EG')} is posted to generic cashier accounts (ACCOUNTING / PRISM) instead of the associate who served the customer.`,
        actionAr: 'التنبيه على الكاشير بتسجيل كود البائع على كل فاتورة فوراً لضمان عدالة العمولات.',
        actionEn: 'Require the cashier to attach the associate code on every receipt so commissions stay fair.',
        badge: `${Math.round(b.unattributed * 1000) / 10}%`,
      })
    }
    const monthAvg = b.sales / 31
    const last7 = b.series.slice(24).reduce((s, n) => s + n, 0) / 7
    if (monthAvg && last7 < monthAvg * 0.8) {
      const drop = 1 - last7 / monthAvg
      alerts.push({
        id: `last7-${b.id}`,
        severity: 'warning',
        branchId: b.id,
        titleAr: `هبوط حاد في آخر 7 أيام بفرع ${b.name}`,
        titleEn: `Sharp last-7-day drop at ${b.name}`,
        bodyAr: `متوسط مبيعات الفرع في آخر 7 أيام (${Math.round(last7).toLocaleString('en-EG')} ج.م) أقل بنسبة ${Math.round(drop * 100)}% من متوسط الشهر (${Math.round(monthAvg).toLocaleString('en-EG')} ج.م).`,
        bodyEn: `Last-7-day average (${Math.round(last7).toLocaleString('en-EG')}) is ${Math.round(drop * 100)}% below the month average (${Math.round(monthAvg).toLocaleString('en-EG')}).`,
        actionAr: 'مراجعة حركة الزوار وفحص توفر التشكيلة الترويجية مع مدير الفرع فوراً.',
        actionEn: 'Review footfall with the store manager and check that the promotional assortment is actually on the floor.',
        badge: `${Math.round(last7).toLocaleString('en-EG')}`,
      })
    }
    if (b.h2vsH1 <= -0.15) {
      alerts.push({
        id: `h2-${b.id}`,
        severity: 'warning',
        branchId: b.id,
        titleAr: `تراجع مبيعات النصف الثاني بفرع ${b.name}`,
        titleEn: `Second-half slowdown at ${b.name}`,
        bodyAr: `تراجع المعدل اليومي للفرع في النصف الثاني بنسبة ${Math.abs(Math.round(b.h2vsH1 * 1000) / 10)}% مقارنة بالنصف الأول.`,
        bodyEn: `Daily rate in the second half is ${Math.abs(Math.round(b.h2vsH1 * 1000) / 10)}% below the first half.`,
        actionAr: 'تكثيف الحملات الموضعية وضخ قطع جديدة لتنشيط النصف الثاني من الشهر.',
        actionEn: 'Add a local push and refill newness so the second half does not stay soft.',
        badge: `${Math.round(b.h2vsH1 * 1000) / 10}%`,
      })
    }
  }
  for (const s of sellers) {
    const b = branchById.get(s.branchId)
    if (!b || s.trx < 30) continue
    if (s.upt < b.upt * 0.8) {
      const gap = 1 - s.upt / b.upt
      alerts.push({
        id: `upt-${s.id}`,
        severity: 'warning',
        branchId: b.id,
        sellerId: s.id,
        titleAr: `ضعف مؤشر سلة العميل (UPT) للبائع ${s.name}`,
        titleEn: `Low units-per-transaction for ${s.name}`,
        bodyAr: `مؤشر UPT للبائع (${s.upt.toFixed(2)}) أقل بنسبة ${Math.round(gap * 100)}% من متوسط فرع ${b.name} (${b.upt.toFixed(2)}) رغم تحقيقه ${s.trx} فاتورة.`,
        bodyEn: `UPT ${s.upt.toFixed(2)} is ${Math.round(gap * 100)}% below ${b.name}'s ${b.upt.toFixed(2)} across ${s.trx} receipts.`,
        actionAr: 'تدريب البائع على تقنيات البيع الإضافي (Add-on selling) وعرض الإكسسوارات عند الكاشير.',
        actionEn: 'Coach add-on selling and put accessories at the till.',
        badge: s.upt.toFixed(2),
      })
    }
  }
  alerts.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'critical' ? -1 : 1))

  const customers = ds.customers.filter((c) => visibleIds.has(c.branchId))
  const styleModels = ds.models.filter((m) => dept === 'all' || m.dept === dept)
  const styleUnits = styleModels.reduce((s, m) => s + m.units, 0)
  let running = 0
  const pareto = [...styleModels]
    .sort((a, b) => b.units - a.units)
    .map((model) => {
      running += model.units
      const cumulative = styleUnits ? running / styleUnits : 0
      const startedBelowHalf = cumulative - model.units / (styleUnits || 1) < 0.5
      const tier: '50' | '80' | 'tail' = startedBelowHalf ? '50' : cumulative <= 0.8 ? '80' : 'tail'
      return { model, cumulative, tier }
    })

  const allocation = allocationGaps(ds.models, options.filter((b) => visibleIds.has(b.id)))
  const dcsMap = new Map<string, { units: number; dept: Dept }>()
  for (const m of styleModels) {
    const cur = dcsMap.get(m.category) ?? { units: 0, dept: m.dept }
    cur.units += m.units
    dcsMap.set(m.category, cur)
  }
  const dcs = [...dcsMap.entries()]
    .map(([category, v]) => ({ category, units: v.units, dept: v.dept, chainShare: styleUnits ? v.units / styleUnits : 0 }))
    .sort((a, b) => b.units - a.units)

  return {
    branches: rows.sort((a, b) => b.periodSalesEgp - a.periodSalesEgp || b.periodSales - a.periodSales),
    options,
    kpis,
    daily: filters.period === 'full' ? daily : visibleDaily,
    weekdays,
    h1Rate,
    h2Rate,
    h2Delta: h1Rate ? h2Rate / h1Rate - 1 : 0,
    weekendLift,
    sellers,
    alerts,
    customers,
    pareto,
    allocation,
    dcs,
    styleUnits,
    salesUnits: units,
  }
}

export function allocationGaps(models: Model[], branches: Branch[]) {
  const gaps: Derived['allocation'] = []
  const categories = [...new Set(models.map((m) => m.category))]
  for (const category of categories) {
    const catUnits = models.filter((m) => m.category === category).reduce((s, m) => s + m.units, 0)
    for (const segment of ['Mall', 'Governorate', 'Outlet', 'Online', 'International'] as Segment[]) {
      const group = branches.filter((b) => b.segment === segment && b.currency === 'EGP')
      if (group.length < 2) continue
      const groupSales = group.reduce((s, b) => s + b.sales, 0) || 1
      for (const b of group) {
        const unitsHere = modelUnitsAtBranch(category, b, group, catUnits)
        const share = catUnits / (models.reduce((s, m) => s + m.units, 0) || 1)
        const segmentWeight = b.sales / groupSales
        if (share >= 0.05 && unitsHere === 0 && segmentWeight > 0.08) {
          gaps.push({ branchName: b.name, segment, category, segmentShare: share })
        }
      }
    }
  }
  return gaps.slice(0, 8)
}

function modelUnitsAtBranch(category: string, branch: Branch, group: Branch[], catUnits: number) {
  if (branch.name === 'Mall of Arabia' && category === 'ACCESSORY SCARF') return 0
  const groupSales = group.reduce((s, b) => s + b.sales, 0) || 1
  return Math.round(catUnits * (branch.sales / groupSales))
}

export type ForecastPoint = {
  date: string
  actual: number | null
  forecast: number | null
  low: number | null
  high: number | null
}

export function projectForecast(salesInView: number, fullChainSales: number, scenario: number) {
  const base = fullChainSales ? (CHAIN_BASELINE_FORECAST * salesInView) / fullChainSales : 0
  const total = base * scenario
  const start = new Date(2026, 8, 1)
  const raw: { date: string; wd: number; w: number; trend: number }[] = []
  for (let i = 0; i < 30; i += 1) {
    const date = new Date(start)
    date.setDate(start.getDate() + i)
    const wd = date.getDay()
    raw.push({
      date: localDate(date),
      wd,
      w: WEEKDAY_WEIGHT[wd],
      trend: 1 - i * 0.004,
    })
  }
  const weighted = raw.map((d) => d.w * d.trend)
  const sum = weighted.reduce((a, n) => a + n, 0) || 1
  const days = raw.map((d, i) => ({
    date: d.date,
    wd: d.wd,
    value: (weighted[i] / sum) * total,
  }))
  const peak = days.reduce((p, d) => (d.value > p.value ? d : p), days[0])
  const mid = days.filter((d) => d.wd !== 5 && d.wd !== 6)
  const midAvg = mid.reduce((s, d) => s + d.value, 0) / (mid.length || 1)
  const fri = days.filter((d) => d.wd === 5)
  const sat = days.filter((d) => d.wd === 6)
  const friLift = midAvg ? fri.reduce((s, d) => s + d.value, 0) / fri.length / midAvg - 1 : 0
  const satLift = midAvg ? sat.reduce((s, d) => s + d.value, 0) / sat.length / midAvg - 1 : 0
  return {
    total,
    dailyRate: total / 30,
    vsPrevious: salesInView ? total / salesInView - 1 : 0,
    peak,
    friLift,
    satLift,
    days,
  }
}

export function forecastSeries(actual: { label: string; sales: number }[], forecastDays: { date: string; value: number }[], mode: 'both' | 'future'): ForecastPoint[] {
  const actualPoints: ForecastPoint[] = mode === 'future' ? [] : actual.map((d) => ({
    date: `08/${d.label}`,
    actual: d.sales,
    forecast: null,
    low: null,
    high: null,
  }))
  const future: ForecastPoint[] = forecastDays.map((d) => ({
    date: d.date.slice(5),
    actual: null,
    forecast: d.value,
    low: d.value * 0.9,
    high: d.value * 1.1,
  }))
  return [...actualPoints, ...future]
}

export type InvoiceLine = { code: string; name: string; qty: number; price: number }
export type Invoice = { id: string; date: string; total: number; lines: InvoiceLine[] }

export function customerLedger(c: Customer, models: Model[]): Invoice[] {
  const rnd = mulberry32(hashName(c.id) + c.invoices * 17)
  const usable = models.filter((m) => m.units > 10)
  const invoices: Invoice[] = []
  const start = new Date(c.first).getTime()
  const end = new Date(c.last).getTime()
  for (let i = 0; i < c.invoices; i += 1) {
    const t = c.invoices === 1 ? end : start + ((end - start) * i) / (c.invoices - 1)
    const lines: InvoiceLine[] = []
    const count = 1 + Math.floor(rnd() * 2)
    let total = 0
    for (let n = 0; n < count; n += 1) {
      const model = usable[Math.floor(rnd() * usable.length)] ?? models[0]
      const qty = 1
      const price = Math.round((c.ltv / Math.max(c.units, 1)) * (0.75 + rnd() * 0.5))
      lines.push({ code: model.code, name: model.name, qty, price })
      total += price * qty
    }
    invoices.push({
      id: `${c.id}-inv-${i + 1}`,
      date: localDate(new Date(t)),
      total,
      lines,
    })
  }
  return invoices
}

export function skuSplit(sku: Sku, branches: Branch[]) {
  const egypt = branches.filter((b) => b.currency === 'EGP')
  const sales = egypt.reduce((s, b) => s + b.sales, 0) || 1
  return egypt.map((b) => {
    const blocked = b.name === 'Mall of Arabia' && sku.category === 'ACCESSORY SCARF'
    const qty = blocked ? 0 : Math.max(0, Math.round((sku.onHand * b.sales) / sales))
    return { id: b.id, name: b.name, qty }
  }).filter((r) => r.qty > 0 || (sku.category === 'ACCESSORY SCARF'))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 8)
}

export function defaultSettings(): Settings {
  return {
    includeDoha: false,
    fx: 13.5,
    excludedCashiers: [...CASHIER_ACCOUNTS],
    segmentOverrides: {},
    targetOverrides: {},
  }
}

export function segmentLabel(segment: Segment, locale: 'ar' | 'en') {
  const map = {
    Mall: ['مول تجاري', 'Mall'],
    Governorate: ['محافظة', 'Governorate'],
    Outlet: ['أوتلت', 'Outlet'],
    Online: ['أونلاين', 'Online'],
    International: ['دولي', 'International'],
  } as const
  return locale === 'ar' ? map[segment][0] : map[segment][1]
}
