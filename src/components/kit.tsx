import { useMemo, useState, type ReactNode } from 'react'
import { cn } from 'cn'
import { Badge } from '@/components/ui/badge'
import { Button as UiButton } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { useDirection } from '@/components/ui/direction'
import { Select as ShadSelect, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent } from '@/components/ui/sheet'

export function cx(...parts: Array<string | false | null | undefined>) {
  return cn(...parts)
}

export function Modal({
  title,
  onClose,
  children,
  wide,
  print,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
  print?: boolean
}) {
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent
        aria-label={title}
        className={cx(
          'print-root max-h-[92vh] overflow-y-auto p-5 sm:max-w-2xl',
          wide && 'sm:max-w-5xl',
          print && 'print:max-h-none print:overflow-visible',
        )}
      >
        {children}
      </DialogContent>
    </Dialog>
  )
}

export function Drawer({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const dir = useDirection()
  return (
    <Sheet open onOpenChange={(open) => { if (!open) onClose() }}>
      <SheetContent side={dir === 'rtl' ? 'left' : 'right'} aria-label={title} className="w-full overflow-y-auto p-5 sm:max-w-xl">
        {children}
      </SheetContent>
    </Sheet>
  )
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow?: string
  title: string
  subtitle: string
  actions?: ReactNode
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-3xl">
        {eyebrow && <p className="mb-1 text-xs font-medium tracking-[0.16em] text-primary uppercase">{eyebrow}</p>}
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{subtitle}</p>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <Card className={cx('px-4 shadow-sm sm:px-5', className)}>{children}</Card>
}

export function Kpi({
  label,
  value,
  hint,
  tone,
  emphasis,
}: {
  label: string
  value: string
  hint: ReactNode
  tone?: 'good' | 'bad' | 'gold'
  emphasis?: boolean
}) {
  return (
    <Card className={cx('px-4 shadow-sm xl:col-span-2', emphasis && 'bg-[linear-gradient(160deg,color-mix(in_oklch,var(--primary)_24%,var(--card))_0%,var(--card)_58%)] ring-primary/40 sm:col-span-2')}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={cx('num mt-2 font-semibold tracking-tight', emphasis ? 'text-3xl sm:text-4xl' : 'text-2xl sm:text-3xl', tone === 'good' && 'text-emerald-300', tone === 'bad' && 'text-red-300', tone === 'gold' && 'text-primary')}>{value}</p>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{hint}</p>
    </Card>
  )
}

export function Trend({ ratio, children }: { ratio: number; children: ReactNode }) {
  const direction = ratio > 0.005 ? 'up' : ratio < -0.005 ? 'down' : 'flat'
  const label = direction === 'up' ? '▲' : direction === 'down' ? '▼' : '–'
  const word = document.documentElement.lang === 'ar'
    ? direction === 'up' ? 'ارتفاع' : direction === 'down' ? 'انخفاض' : 'ثبات'
    : direction === 'up' ? 'Up' : direction === 'down' ? 'Down' : 'Flat'
  return (
    <span className={cx('inline-flex items-center gap-1', direction === 'up' && 'text-emerald-300', direction === 'down' && 'text-red-300', direction === 'flat' && 'text-muted-foreground')}>
      <span aria-hidden="true">{label}</span>
      <span className="sr-only">{word}</span>
      {children}
    </span>
  )
}

export function SortTh<T extends string>({
  label,
  column,
  active,
  dir,
  onSort,
}: {
  label: string
  column: T
  active: string
  dir: 'asc' | 'desc'
  onSort: (column: T) => void
}) {
  const on = active === column
  return (
    <th className="px-2 py-2 text-start font-medium" aria-sort={on ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button type="button" onClick={() => onSort(column)} className="inline-flex min-h-9 items-center gap-1 rounded-md px-1 hover:text-foreground">
        {label}
        <span aria-hidden="true" className={on ? 'text-primary' : 'text-muted-foreground'}>{on ? (dir === 'asc' ? '↑' : '↓') : '↕'}</span>
      </button>
    </th>
  )
}

export function Pill({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'good' | 'bad' | 'warn' | 'gold' }) {
  const tones = {
    neutral: 'bg-secondary text-secondary-foreground',
    good: 'border-transparent bg-emerald-400/15 text-emerald-200',
    bad: 'border-transparent bg-destructive/15 text-red-200',
    warn: 'border-transparent bg-amber-400/15 text-amber-200',
    gold: 'border-transparent bg-primary/15 text-primary',
  }
  return <Badge variant="outline" className={cx('h-6 px-2.5', tones[tone])}>{children}</Badge>
}

export function Seg<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { id: T; label: string }[]
  onChange: (id: T) => void
}) {
  return (
    <div className="flex flex-wrap gap-1 rounded-xl bg-muted p-1">
      {options.map((option) => (
        <UiButton
          key={option.id}
          type="button"
          size="sm"
          variant={value === option.id ? 'default' : 'ghost'}
          aria-pressed={value === option.id}
          onClick={() => onChange(option.id)}
        >
          {option.label}
        </UiButton>
      ))}
    </div>
  )
}

export function Select({
  value,
  onValueChange,
  options,
  ariaLabel,
  className,
}: {
  value: string
  onValueChange: (value: string) => void
  options: { value: string; label: string }[]
  ariaLabel?: string
  className?: string
}) {
  return (
    <ShadSelect value={value} onValueChange={onValueChange}>
      <SelectTrigger aria-label={ariaLabel} className={cx('h-10 w-full min-w-[10rem]', className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper" className="max-h-72">
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value} className="py-2">
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </ShadSelect>
  )
}

export function Button({
  children,
  onClick,
  tone = 'ghost',
  type = 'button',
}: {
  children: ReactNode
  onClick?: () => void
  tone?: 'ghost' | 'gold' | 'danger'
  type?: 'button' | 'submit'
}) {
  return (
    <UiButton type={type} onClick={onClick} size="lg" className="h-10" variant={tone === 'gold' ? 'default' : tone === 'danger' ? 'destructive' : 'outline'}>
      {children}
    </UiButton>
  )
}

export function TableWrap({ children }: { children: ReactNode }) {
  return <div className="overflow-x-auto">{children}</div>
}

export function useSort<T>(rows: T[], initial: keyof T, direction: 'asc' | 'desc' = 'desc') {
  const [key, setKey] = useState<keyof T>(initial)
  const [dir, setDir] = useState(direction)
  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const av = a[key]
      const bv = b[key]
      const cmp = typeof av === 'string' || typeof bv === 'string'
        ? String(av).localeCompare(String(bv))
        : Number(av) - Number(bv)
      return dir === 'asc' ? cmp : -cmp
    })
  }, [rows, key, dir])
  const toggle = (next: keyof T) => {
    if (next === key) setDir((current) => (current === 'asc' ? 'desc' : 'asc'))
    else {
      setKey(next)
      setDir('desc')
    }
  }
  return { sorted, toggle, key, dir }
}

export function chartTipStyle() {
  return {
    background: 'var(--popover)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    color: 'var(--popover-foreground)',
  }
}
