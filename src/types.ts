export type Locale = 'ar' | 'en'
export type Segment = 'Mall' | 'Governorate' | 'Outlet' | 'Online' | 'International'
export type Dept = 'ACCESSORY' | 'CASUAL' | 'JEANS' | 'DEFOU'
export type Period = 'full' | 'h1' | 'h2' | 'last7'
export type Currency = 'EGP' | 'QAR'
export type ViewId =
  | 'executive'
  | 'branches'
  | 'sellers'
  | 'manager'
  | 'assortment'
  | 'customers'
  | 'inventory'
  | 'advisor'
  | 'competitors'
  | 'audit'
  | 'settings'

export type CoachKind = 'star' | 'upt' | 'atv' | 'both' | 'closing' | 'balanced'
export type CustomerSegment = 'champion' | 'regular' | 'near' | 'retired'
export type MoveStatus = 'fast' | 'normal' | 'dead'
export type Threat = 'high' | 'medium' | 'low'

export type Branch = {
  id: string
  name: string
  segment: Segment
  sales: number
  trx: number
  units: number
  upt: number
  atv: number
  utv: number
  cv: number
  h2vsH1: number
  staff: number
  top3: number
  unattributed: number
  currency: Currency
  target: number
  last7VsAvg?: number
}

export type Seller = {
  id: string
  name: string
  branchId: string
  sales: number
  units: number
  trx: number
  upt: number
  atv: number
  floating: boolean
}

export type Model = {
  code: string
  name: string
  units: number
  dept: Dept
  category: string
}

export type Customer = {
  id: string
  name: string
  phone: string
  branchId: string
  first: string
  last: string
  invoices: number
  units: number
  ltv: number
  segment: CustomerSegment
}

export type Sku = {
  code: string
  name: string
  dept: Dept
  category: string
  status: MoveStatus
  onHand: number
  sold30: number
  weekly: number
  doi: number | null
  stockValue: number
  frozen: number
  action: 'clear35' | 'bundle' | 'outlet' | 'replenish' | 'steady'
}

export type Competitor = {
  id: string
  name: string
  threat: Threat
  offers: string[]
  collections: string[]
  prices: { label: string; low: number; high: number }[]
  tagline: string
  expansion: string
  checked: string
}

export type Dataset = {
  source: 'sample' | 'upload'
  sourceName?: string
  branches: Branch[]
  sellers: Seller[]
  models: Model[]
  customers: Customer[]
  inventory: Sku[]
  competitors: Competitor[]
  droppedSubtotals: number
}

export type Filters = {
  period: Period
  segment: Segment | 'all'
  branchId: string | 'all'
  dept: Dept | 'all'
}

export type Settings = {
  includeDoha: boolean
  fx: number
  excludedCashiers: string[]
  segmentOverrides: Record<string, Segment>
  targetOverrides: Record<string, number>
}

export type Alert = {
  id: string
  severity: 'critical' | 'warning'
  branchId?: string
  sellerId?: string
  titleAr: string
  titleEn: string
  bodyAr: string
  bodyEn: string
  actionAr: string
  actionEn: string
  badge: string
}
