import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { DirectionProvider } from '@/components/ui/direction'
import { TooltipProvider } from '@/components/ui/tooltip'
import { derive, defaultSettings, SAMPLE } from './engine'
import type { Dataset, Filters, Locale, Settings, ViewId } from './types'

type Store = {
  locale: Locale
  setLocale: (locale: Locale) => void
  view: ViewId
  setView: (view: ViewId) => void
  filters: Filters
  setFilters: (patch: Partial<Filters>) => void
  clearFilters: () => void
  settings: Settings
  setSettings: (patch: Partial<Settings>) => void
  dataset: Dataset
  setDataset: (dataset: Dataset) => void
  resetSample: () => void
  model: ReturnType<typeof derive>
  managerId: string
  setManagerId: (id: string) => void
  alertsOpen: boolean
  setAlertsOpen: (open: boolean) => void
  uploadOpen: boolean
  setUploadOpen: (open: boolean) => void
  paletteOpen: boolean
  setPaletteOpen: (open: boolean) => void
  advisorOpen: boolean
  setAdvisorOpen: (open: boolean) => void
  toast: string | null
  notify: (message: string) => void
  dismissToast: () => void
  tx: (ar: string, en: string) => string
}

const Ctx = createContext<Store | null>(null)

const defaultFilters: Filters = { period: 'full', segment: 'all', branchId: 'all', dept: 'all' }

function loadSettings(): Settings {
  const base = defaultSettings()
  try {
    const raw = localStorage.getItem('rcc-settings')
    if (!raw) return base
    const parsed = JSON.parse(raw) as Partial<Settings>
    return {
      ...base,
      ...parsed,
      excludedCashiers: Array.isArray(parsed.excludedCashiers) ? parsed.excludedCashiers : base.excludedCashiers,
      segmentOverrides: parsed.segmentOverrides ?? {},
      targetOverrides: parsed.targetOverrides ?? {},
    }
  } catch {
    return base
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(() => (localStorage.getItem('rcc-locale') === 'en' ? 'en' : 'ar'))
  const [view, setView] = useState<ViewId>('executive')
  const [filters, setFilterState] = useState<Filters>(defaultFilters)
  const [settings, setSettingsState] = useState<Settings>(loadSettings)
  const [dataset, setDataset] = useState<Dataset>(SAMPLE)
  const [managerId, setManagerId] = useState('mall-of-tanta')
  const [alertsOpen, setAlertsOpen] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [advisorOpen, setAdvisorOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    document.documentElement.lang = locale
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr'
    localStorage.setItem('rcc-locale', locale)
  }, [locale])

  useEffect(() => {
    const titles: Record<ViewId, [string, string]> = {
      executive: ['النظرة التنفيذية', 'Executive'],
      branches: ['أداء الفروع', 'Branches'],
      sellers: ['البائعون والتدريب', 'Sellers'],
      manager: ['رؤية مدير الفرع', 'Store manager'],
      assortment: ['التشكيلة والموديلات', 'Assortment'],
      customers: ['دورة العملاء', 'Customers'],
      inventory: ['حركة المخزون', 'Inventory'],
      advisor: ['المستشار الذكي', 'Advisor'],
      competitors: ['المنافسون', 'Competitors'],
      audit: ['تدقيق البيانات', 'Data audit'],
      settings: ['الإعدادات', 'Settings'],
    }
    const [ar, en] = titles[view]
    document.title = `${locale === 'ar' ? ar : en} · ${locale === 'ar' ? 'مركز قيادة التجزئة' : 'Retail Command'}`
  }, [view, locale])

  useEffect(() => {
    localStorage.setItem('rcc-settings', JSON.stringify(settings))
  }, [settings])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setPaletteOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 2600)
    return () => window.clearTimeout(timer)
  }, [toast])

  const model = useMemo(() => derive(dataset, filters, settings), [dataset, filters, settings])

  const value = useMemo<Store>(() => ({
    locale,
    setLocale,
    view,
    setView,
    filters,
    setFilters: (patch) => setFilterState((current) => ({ ...current, ...patch })),
    clearFilters: () => setFilterState(defaultFilters),
    settings,
    setSettings: (patch) => setSettingsState((current) => ({ ...current, ...patch })),
    dataset,
    setDataset,
    resetSample: () => {
      setDataset(SAMPLE)
      setFilterState(defaultFilters)
    },
    model,
    managerId,
    setManagerId,
    alertsOpen,
    setAlertsOpen,
    uploadOpen,
    setUploadOpen,
    paletteOpen,
    setPaletteOpen,
    advisorOpen,
    setAdvisorOpen,
    toast,
    notify: setToast,
    dismissToast: () => setToast(null),
    tx: (ar, en) => (locale === 'ar' ? ar : en),
  }), [locale, view, filters, settings, dataset, model, managerId, alertsOpen, uploadOpen, paletteOpen, advisorOpen, toast])

  return (
    <Ctx.Provider value={value}>
      <DirectionProvider dir={locale === 'ar' ? 'rtl' : 'ltr'}>
        <TooltipProvider>{children}</TooltipProvider>
      </DirectionProvider>
    </Ctx.Provider>
  )
}

export function useStore() {
  const value = useContext(Ctx)
  if (!value) throw new Error('Store missing')
  return value
}
