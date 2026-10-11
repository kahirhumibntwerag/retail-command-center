import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  Bell,
  Binoculars,
  FileSpreadsheet,
  Languages,
  LayoutDashboard,
  RotateCcw,
  Search,
  Settings,
  ShieldCheck,
  Shirt,
  Sparkles,
  Store,
  Upload,
  UserRound,
  Users,
  Warehouse,
  X,
} from 'lucide-react'
import { parseWorkbook, downloadTemplate } from '../excel'
import { MONTH_LABEL } from '../data'
import { segmentLabel } from '../engine'
import { useStore } from '../store'
import type { ViewId } from '../types'
import { useDirection } from '@/components/ui/direction'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar'
import { AdvisorSheet } from './AdvisorReport'
import { Button, Drawer, Modal, Pill, Select, cx } from './kit'

const NAV: { groupAr: string; groupEn: string; items: { id: ViewId; ar: string; en: string; icon: typeof Store }[] }[] = [
  {
    groupAr: 'القرار',
    groupEn: 'Decide',
    items: [
      { id: 'executive', ar: 'النظرة التنفيذية', en: 'Executive', icon: LayoutDashboard },
      { id: 'branches', ar: 'أداء الفروع', en: 'Branches', icon: Store },
    ],
  },
  {
    groupAr: 'الناس',
    groupEn: 'People',
    items: [
      { id: 'sellers', ar: 'البائعون والتدريب', en: 'Sellers & coaching', icon: Users },
      { id: 'manager', ar: 'رؤية مدير الفرع', en: 'Store manager', icon: UserRound },
    ],
  },
  {
    groupAr: 'البضاعة',
    groupEn: 'Merchandise',
    items: [
      { id: 'assortment', ar: 'التشكيلة والموديلات', en: 'Assortment', icon: Shirt },
      { id: 'customers', ar: 'دورة العملاء', en: 'Customers', icon: Users },
      { id: 'inventory', ar: 'حركة المخزون', en: 'Inventory', icon: Warehouse },
    ],
  },
  {
    groupAr: 'الذكاء',
    groupEn: 'Intelligence',
    items: [
      { id: 'advisor', ar: 'المستشار الذكي', en: 'Advisor', icon: Sparkles },
      { id: 'competitors', ar: 'المنافسون', en: 'Competitors', icon: Binoculars },
      { id: 'audit', ar: 'تدقيق البيانات', en: 'Data audit', icon: ShieldCheck },
      { id: 'settings', ar: 'الإعدادات', en: 'Settings', icon: Settings },
    ],
  },
]

export default function Shell({ children }: { children: ReactNode }) {
  const store = useStore()
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [paletteIndex, setPaletteIndex] = useState(0)
  const [alertFilter, setAlertFilter] = useState<'all' | 'critical' | 'warning'>('all')
  const [uploadError, setUploadError] = useState('')
  const [confirmReset, setConfirmReset] = useState(false)
  const [advisorOpen, setAdvisorOpen] = useState(false)
  const { tx, locale, model, filters, settings } = store
  const current = NAV.flatMap((group) => group.items).find((item) => item.id === store.view)
  const criticalCount = model.alerts.filter((alert) => alert.severity === 'critical').length

  const skipFirstView = useRef(true)
  useEffect(() => {
    if (skipFirstView.current) {
      skipFirstView.current = false
      return
    }
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
    document.getElementById('main')?.focus()
  }, [store.view])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    const pages = NAV.flatMap((group) => group.items)
      .filter((item) => !q || item.ar.includes(query) || item.en.toLowerCase().includes(q))
      .map((item) => ({ kind: 'page' as const, id: item.id, label: tx(item.ar, item.en) }))
    const branches = model.options
      .filter((branch) => !q || branch.name.toLowerCase().includes(q))
      .slice(0, 8)
      .map((branch) => ({ kind: 'branch' as const, id: branch.id, label: `${branch.name} · ${segmentLabel(branch.segment, locale)}` }))
    return [...pages, ...branches]
  }, [query, model.options, tx, locale])

  useEffect(() => {
    setPaletteIndex(0)
  }, [query, store.paletteOpen])

  const periodLabels = {
    full: tx(`الشهر كاملاً (${MONTH_LABEL.ar})`, `Full month (${MONTH_LABEL.en})`),
    h1: tx('النصف الأول 1–15', 'First half 1–15'),
    h2: tx('النصف الثاني 16–31', 'Second half 16–31'),
    last7: tx('آخر 7 أيام 25–31', 'Last 7 days 25–31'),
  }
  const deptLabels = {
    all: tx('كل الأقسام', 'All departments'),
    CASUAL: tx('كاجوال', 'Casual'),
    JEANS: tx('جينز', 'Jeans'),
    ACCESSORY: tx('إكسسوار', 'Accessory'),
    DEFOU: tx('ديفو', 'Defou'),
  }
  const branchName = filters.branchId === 'all'
    ? tx(`كل الفروع (${model.options.length})`, `All branches (${model.options.length})`)
    : model.options.find((branch) => branch.id === filters.branchId)?.name ?? filters.branchId
  const segmentName = filters.segment === 'all' ? tx('كل الشرائح', 'All segments') : segmentLabel(filters.segment, locale)
  const activeCount = [filters.period !== 'full', filters.segment !== 'all', filters.branchId !== 'all', filters.dept !== 'all'].filter(Boolean).length

  function openResult(item: (typeof results)[number]) {
    if (item.kind === 'page') store.setView(item.id)
    else {
      store.setManagerId(item.id)
      store.setFilters({ branchId: item.id })
      store.setView('manager')
    }
    store.setPaletteOpen(false)
    setQuery('')
  }

  async function onFile(file: File) {
    setUploadError('')
    try {
      const buffer = await file.arrayBuffer()
      const parsed = parseWorkbook(buffer, file.name)
      store.setDataset(parsed.dataset)
      store.setUploadOpen(false)
      store.notify(tx('تم اعتماد الملف', 'Workbook applied'))
    } catch {
      setUploadError(tx('تعذر قراءة الملف. استخدم القالب وتأكد من وجود شيت Branches.', 'Could not read that file. Use the template and include a Branches sheet.'))
    }
  }

  return (
    <SidebarProvider>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground">
        {tx('تخطَّ إلى المحتوى', 'Skip to content')}
      </a>
      <AppSidebar onReset={() => setConfirmReset(true)} />
      <SidebarInset className="min-w-0 bg-transparent">
        <header className="sticky top-0 z-10 border-b border-border bg-background/80 px-3 py-2 shadow-sm backdrop-blur-md sm:px-4 sm:py-3">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="size-11 shrink-0 border border-border bg-card" aria-label={tx('القائمة', 'Menu')} />
            {current && <p className="min-w-0 flex-1 truncate text-sm font-semibold">{tx(current.ar, current.en)}</p>}
            <button
              type="button"
              onClick={() => setAdvisorOpen(true)}
              className="inline-flex h-11 shrink-0 items-center gap-2 rounded-lg border border-primary/50 bg-primary/15 px-3 text-sm font-medium text-primary shadow-xs transition-colors hover:bg-primary/25"
              aria-label={tx('المستشار', 'Advisor')}
            >
              <Sparkles size={16} />
              <span className="hidden md:inline">{tx('المستشار', 'Advisor')}</span>
            </button>
            <button
              type="button"
              onClick={() => store.setAlertsOpen(true)}
              className="inline-flex h-11 shrink-0 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm shadow-xs transition-colors hover:bg-accent"
              aria-label={tx(
                `${model.alerts.length} تنبيهاً، منها ${criticalCount} حرج`,
                `${model.alerts.length} alerts, ${criticalCount} critical`,
              )}
            >
              <Bell size={16} />
              <span className="hidden md:inline">{tx('التنبيهات', 'Alerts')}</span>
              <span className={cx('rounded-full px-1.5 text-xs font-semibold text-white', criticalCount ? 'bg-[#ff6b7d]' : 'bg-white/15 text-[#f7f4ee]')}>{model.alerts.length}</span>
            </button>
            <button type="button" onClick={() => store.setUploadOpen(true)} className="inline-flex h-11 shrink-0 items-center gap-2 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/80" aria-label="Excel">
              <Upload size={16} />
              <span className="hidden md:inline">Excel</span>
            </button>
            <button type="button" onClick={() => store.setLocale(locale === 'ar' ? 'en' : 'ar')} className="inline-flex h-11 shrink-0 items-center gap-1 rounded-lg border border-border bg-card px-3 text-sm shadow-xs transition-colors hover:bg-accent" aria-label={tx('التبديل إلى الإنجليزية', 'Switch to Arabic')}>
              <Languages size={16} />{locale === 'ar' ? 'EN' : 'ع'}
            </button>
          </div>
          <button type="button" onClick={() => store.setPaletteOpen(true)} className="mt-2 flex h-11 w-full min-w-0 items-center gap-2 rounded-lg border border-border bg-card px-3 text-start text-sm text-muted-foreground shadow-xs transition-colors hover:bg-accent">
            <Search size={15} />
            <span className="truncate">{tx('ابحث عن فرع أو قسم', 'Search a store or section')}</span>
            <kbd className="ms-auto hidden rounded-md border border-border px-1.5 text-[11px] sm:inline">Ctrl K</kbd>
          </button>
          {store.view !== 'settings' && (
            <div className="mt-3">
              <div className="mb-2 flex items-center gap-2 overflow-x-auto">
                <button type="button" className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl border border-border px-3 text-sm lg:hidden" aria-expanded={filtersOpen} onClick={() => setFiltersOpen((open) => !open)}>
                  {tx('الفلاتر', 'Filters')}
                  {activeCount > 0 && <span className="rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground">{activeCount}</span>}
                </button>
                <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground lg:sr-only">
                  {periodLabels[filters.period]} · {segmentName} · {branchName} · {deptLabels[filters.dept]}
                </p>
                <span className="hidden shrink-0 sm:contents">
                  <Pill tone={datasetTone(store.dataset.source)}>{store.dataset.source === 'sample' ? tx('عينة أغسطس 2026', 'August 2026 sample') : store.dataset.sourceName}</Pill>
                  {!settings.includeDoha && <Pill>{tx('الدوحة مستبعدة من الإجمالي', 'Doha excluded from the total')}</Pill>}
                </span>
              </div>
              <div className={cx('flex-wrap items-end gap-2', filtersOpen ? 'flex' : 'hidden', 'lg:flex')}>
                <div className="flex w-full flex-wrap gap-2 sm:hidden">
                  <Pill tone={datasetTone(store.dataset.source)}>{store.dataset.source === 'sample' ? tx('عينة أغسطس 2026', 'August 2026 sample') : store.dataset.sourceName}</Pill>
                  {!settings.includeDoha && <Pill>{tx('الدوحة مستبعدة من الإجمالي', 'Doha excluded from the total')}</Pill>}
                </div>
                <div className="flex w-full min-w-0 flex-col gap-1 sm:min-w-[180px] sm:flex-1">
                  <Label className="text-[11px] text-muted-foreground">{tx('الفترة', 'Period')}</Label>
                  <Select
                    ariaLabel={tx('الفترة', 'Period')}
                    value={filters.period}
                    onValueChange={(value) => store.setFilters({ period: value as typeof filters.period })}
                    options={[
                      { value: 'full', label: periodLabels.full },
                      { value: 'h1', label: periodLabels.h1 },
                      { value: 'h2', label: periodLabels.h2 },
                      { value: 'last7', label: periodLabels.last7 },
                    ]}
                  />
                </div>
                <div className="flex w-full min-w-0 flex-col gap-1 sm:min-w-[180px] sm:flex-1">
                  <Label className="text-[11px] text-muted-foreground">{tx('الشريحة', 'Segment')}</Label>
                  <Select
                    ariaLabel={tx('الشريحة', 'Segment')}
                    value={filters.segment}
                    onValueChange={(value) => store.setFilters({ segment: value as typeof filters.segment })}
                    options={[
                      { value: 'all', label: tx('كل الشرائح', 'All segments') },
                      ...(['Mall', 'Governorate', 'Outlet', 'Online', 'International'] as const).map((segment) => ({ value: segment, label: segmentLabel(segment, locale) })),
                    ]}
                  />
                </div>
                <div className="flex w-full min-w-0 flex-col gap-1 sm:min-w-[180px] sm:flex-1">
                  <Label className="text-[11px] text-muted-foreground">{tx('الفرع', 'Branch')}</Label>
                  <Select
                    ariaLabel={tx('الفرع', 'Branch')}
                    value={filters.branchId}
                    onValueChange={(value) => { store.setFilters({ branchId: value }); store.setManagerId(value === 'all' ? store.managerId : value) }}
                    options={[
                      { value: 'all', label: tx(`كل الفروع (${model.options.length})`, `All branches (${model.options.length})`) },
                      ...model.options.map((branch) => ({ value: branch.id, label: branch.name })),
                    ]}
                  />
                </div>
                <div className="flex w-full min-w-0 flex-col gap-1 sm:min-w-[180px] sm:flex-1">
                  <Label className="text-[11px] text-muted-foreground">{tx('القسم', 'Department')}</Label>
                  <Select
                    ariaLabel={tx('القسم', 'Department')}
                    value={filters.dept}
                    onValueChange={(value) => store.setFilters({ dept: value as typeof filters.dept })}
                    options={(Object.keys(deptLabels) as Array<keyof typeof deptLabels>).map((dept) => ({ value: dept, label: deptLabels[dept] }))}
                  />
                </div>
              </div>
              {activeCount > 0 && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {filters.period !== 'full' && <FilterChip label={periodLabels[filters.period]} onClear={() => store.setFilters({ period: 'full' })} clearLabel={tx('إزالة', 'Remove')} />}
                  {filters.segment !== 'all' && <FilterChip label={segmentName} onClear={() => store.setFilters({ segment: 'all' })} clearLabel={tx('إزالة', 'Remove')} />}
                  {filters.branchId !== 'all' && <FilterChip label={branchName} onClear={() => store.setFilters({ branchId: 'all' })} clearLabel={tx('إزالة', 'Remove')} />}
                  {filters.dept !== 'all' && <FilterChip label={deptLabels[filters.dept]} onClear={() => store.setFilters({ dept: 'all' })} clearLabel={tx('إزالة', 'Remove')} />}
                  <button type="button" onClick={store.clearFilters} className="min-h-9 rounded-full px-2 text-xs text-primary underline-offset-2 hover:underline">{tx('مسح الفلاتر', 'Clear filters')}</button>
                </div>
              )}
            </div>
          )}
        </header>
        <div id="main" tabIndex={-1} className="min-w-0 px-3 py-4 outline-none sm:px-6 sm:py-5">{children}</div>
      </SidebarInset>

      {store.toast && (
        <div role="status" aria-live="polite" className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full bg-primary py-1 ps-4 pe-1 text-sm font-medium text-primary-foreground shadow-lg">
          {store.toast}
          <button type="button" onClick={store.dismissToast} aria-label={tx('إخفاء الرسالة', 'Dismiss message')} className="grid h-9 w-9 place-items-center rounded-full hover:bg-black/10">
            <X size={16} />
          </button>
        </div>
      )}

      <AdvisorSheet open={advisorOpen} onOpenChange={setAdvisorOpen} />

      {store.alertsOpen && (
        <Drawer title={tx('التنبيهات', 'Alerts')} onClose={() => store.setAlertsOpen(false)}>
          <h2 className="mb-4 text-xl font-semibold">{tx('مركز التنبيهات', 'Alert center')}</h2>
          <div className="mb-4 flex gap-2">
            {(['all', 'critical', 'warning'] as const).map((id) => (
              <button key={id} type="button" aria-pressed={alertFilter === id} onClick={() => setAlertFilter(id)} className={cx('rounded-full px-3 py-1 text-sm', alertFilter === id ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                {id === 'all' ? tx('الكل', 'All') : id === 'critical' ? tx('حرج', 'Critical') : tx('تحذير', 'Warning')}
              </button>
            ))}
          </div>
          <div className="space-y-3">
            {model.alerts.filter((alert) => alertFilter === 'all' || alert.severity === alertFilter).map((alert) => (
              <article key={alert.id} className={cx('rounded-2xl border border-border border-s-4 p-3', alert.severity === 'critical' ? 'border-s-[#ff6b7d]' : 'border-s-[#f0b429]')}>
                <div className="mb-2 flex items-start justify-between gap-3">
                  <h3 className="font-medium">{tx(alert.titleAr, alert.titleEn)}</h3>
                  <Pill tone={alert.severity === 'critical' ? 'bad' : 'warn'}>{alert.badge}</Pill>
                </div>
                <p className="text-sm leading-6 text-[#c5ccda]">{tx(alert.bodyAr, alert.bodyEn)}</p>
                <p className="mt-2 text-sm text-primary">{tx('الإجراء: ', 'Action: ')}{tx(alert.actionAr, alert.actionEn)}</p>
                {alert.branchId && (
                  <button type="button" className="mt-2 text-sm underline" onClick={() => { store.setManagerId(alert.branchId!); store.setView('manager'); store.setAlertsOpen(false) }}>
                    {tx('افتح الفرع', 'Open the store')}
                  </button>
                )}
              </article>
            ))}
            {model.alerts.filter((alert) => alertFilter === 'all' || alert.severity === alertFilter).length === 0 && (
              <p className="text-sm text-muted-foreground">{tx('لا تنبيهات داخل هذه التصفية.', 'No alerts inside this filter.')}</p>
            )}
          </div>
        </Drawer>
      )}

      {store.uploadOpen && (
        <Modal title={tx('رفع إكسيل', 'Upload Excel')} onClose={() => store.setUploadOpen(false)}>
          <h2 className="mb-3 text-xl font-semibold">{tx('رفع ملفات Excel', 'Upload an Excel workbook')}</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            {tx('الشيت المطلوب اسمه Branches. الأعمدة: name, segment, sales, trx, upt, atv, utv, h2vsH1, staff, top3, unattributed, currency, target. صفوف TOTAL تُسقط حتى لا ينكسر المتوسط.', 'Required sheet: Branches. Columns: name, segment, sales, trx, upt, atv, utv, h2vsH1, staff, top3, unattributed, currency, target. TOTAL rows are dropped so averages stay weighted.')}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button tone="gold" onClick={downloadTemplate}><FileSpreadsheet size={16} />{tx('تنزيل القالب', 'Download template')}</Button>
          </div>
          <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-muted/60 px-4 py-10 text-center">
            <Upload />
            <span className="mt-2 text-sm">{tx('أسقط الملف أو اختره', 'Drop a file or choose one')}</span>
            <input
              className="sr-only"
              type="file"
              accept=".xlsx,.xls"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) void onFile(file)
              }}
            />
          </label>
          {uploadError && <p className="mt-3 text-sm text-[#ffb3bd]">{uploadError}</p>}
        </Modal>
      )}

      {store.paletteOpen && (
        <Modal title={tx('بحث', 'Search')} onClose={() => store.setPaletteOpen(false)}>
          <h2 className="mb-3 text-xl font-semibold">{tx('الانتقال السريع', 'Jump to')}</h2>
          <Input
            autoFocus
            className="h-11"
            role="combobox"
            aria-expanded="true"
            aria-controls="command-results"
            aria-activedescendant={results[paletteIndex] ? `command-${results[paletteIndex].kind}-${results[paletteIndex].id}` : undefined}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown') {
                event.preventDefault()
                setPaletteIndex((index) => Math.min(Math.max(results.length - 1, 0), index + 1))
              } else if (event.key === 'ArrowUp') {
                event.preventDefault()
                setPaletteIndex((index) => Math.max(0, index - 1))
              } else if (event.key === 'Enter' && results[paletteIndex]) {
                event.preventDefault()
                openResult(results[paletteIndex])
              }
            }}
            placeholder={tx('فرع، قسم، أو صفحة', 'Store, section, or page')}
          />
          <p className="mt-2 text-xs text-muted-foreground">{tx('الأسهم للتنقل، Enter للفتح، Esc للإغلاق.', 'Arrows move, Enter opens, Esc closes.')}</p>
          <div id="command-results" role="listbox" className="mt-3 space-y-1">
            {results.map((item, index) => (
              <button
                key={`${item.kind}-${item.id}`}
                id={`command-${item.kind}-${item.id}`}
                type="button"
                role="option"
                aria-selected={index === paletteIndex}
                className={cx('block min-h-11 w-full rounded-xl px-3 py-2 text-start', index === paletteIndex ? 'bg-primary font-medium text-primary-foreground' : 'hover:bg-accent')}
                onMouseEnter={() => setPaletteIndex(index)}
                onClick={() => openResult(item)}
              >
                <span className="me-2 text-xs opacity-70">{item.kind === 'page' ? tx('صفحة', 'Page') : tx('فرع', 'Store')}</span>
                {item.label}
              </button>
            ))}
            {results.length === 0 && <p className="px-3 py-6 text-sm text-muted-foreground">{tx('لا نتائج. جرّب اسم فرع أو قسم من القائمة.', 'Nothing matches. Try a store name or a section from the menu.')}</p>}
          </div>
        </Modal>
      )}

      {confirmReset && (
        <Modal title={tx('استعادة العينة', 'Restore sample')} onClose={() => setConfirmReset(false)}>
          <h2 className="text-xl font-semibold">{tx('استعادة بيانات أغسطس؟', 'Restore the August sample?')}</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{tx('هذا يستبدل الملف المرفوع ويعيد الفلاتر. الإعدادات المحفوظة تبقى.', 'This replaces the uploaded workbook and clears filters. Saved settings stay.')}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button tone="gold" onClick={() => { store.resetSample(); setConfirmReset(false); store.notify(tx('تمت استعادة عينة أغسطس', 'August sample restored')) }}>{tx('استعادة', 'Restore')}</Button>
            <Button onClick={() => setConfirmReset(false)}>{tx('إلغاء', 'Cancel')}</Button>
          </div>
        </Modal>
      )}
    </SidebarProvider>
  )
}

function AppSidebar({ onReset }: { onReset: () => void }) {
  const store = useStore()
  const direction = useDirection()
  const { setOpenMobile } = useSidebar()
  const { tx } = store
  const tooltipSide = direction === 'rtl' ? 'left' : 'right'

  return (
    <Sidebar side={direction === 'rtl' ? 'right' : 'left'} collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-1 py-1">
          <div className="grid size-8 shrink-0 place-items-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
            <Store size={16} />
          </div>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="truncate text-sm font-semibold">{tx('مركز قيادة التجزئة', 'Retail Command')}</p>
            <p className="truncate text-xs text-muted-foreground">{tx('مصر · 27 فرعاً', 'Egypt · 27 stores')}</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <nav aria-label={tx('أقسام اللوحة', 'Dashboard sections')}>
          {NAV.map((group) => (
            <SidebarGroup key={group.groupEn}>
              <SidebarGroupLabel>{tx(group.groupAr, group.groupEn)}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-1">
                  {group.items.map((item) => {
                    const Icon = item.icon
                    const label = tx(item.ar, item.en)
                    const active = store.view === item.id
                    return (
                      <SidebarMenuItem key={item.id}>
                        <SidebarMenuButton
                          size="lg"
                          isActive={active}
                          aria-current={active ? 'page' : undefined}
                          tooltip={{ children: label, side: tooltipSide }}
                          className="data-active:bg-sidebar-primary data-active:font-semibold data-active:text-sidebar-primary-foreground data-active:hover:bg-sidebar-primary data-active:hover:text-sidebar-primary-foreground"
                          onClick={() => {
                            store.setView(item.id)
                            setOpenMobile(false)
                          }}
                        >
                          <Icon />
                          <span>{label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </nav>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              tooltip={{ children: tx('بيانات أغسطس الافتراضية', 'August sample data'), side: tooltipSide }}
              onClick={onReset}
            >
              <RotateCcw />
              <span>{tx('بيانات أغسطس الافتراضية', 'August sample data')}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

function FilterChip({ label, onClear, clearLabel }: { label: string; onClear: () => void; clearLabel: string }) {
  return (
    <button type="button" onClick={onClear} className="inline-flex min-h-9 items-center gap-1 rounded-full bg-primary/15 px-3 text-xs font-medium text-primary">
      {label}
      <span aria-hidden="true">×</span>
      <span className="sr-only">{clearLabel}</span>
    </button>
  )
}

function datasetTone(source: 'sample' | 'upload') {
  return source === 'sample' ? 'gold' as const : 'good' as const
}
