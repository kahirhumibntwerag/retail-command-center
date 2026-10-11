import { useState } from 'react'
import { segmentLabel } from '../engine'
import { money, percent } from '../format'
import { useStore } from '../store'
import type { Segment } from '../types'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button, PageHeader, Panel, Seg, Select } from '../components/kit'

const TABS = ['currency', 'segments', 'cashiers', 'targets'] as const
type Tab = (typeof TABS)[number]

export default function SettingsView() {
  const { dataset, settings, setSettings, locale, tx, notify } = useStore()
  const [tab, setTab] = useState<Tab>('currency')
  const [account, setAccount] = useState('')
  const [targetBranch, setTargetBranch] = useState(dataset.branches[0]?.id ?? '')
  const [targetValue, setTargetValue] = useState('2000000')

  function saveTarget() {
    const value = Number(targetValue)
    if (!targetBranch || !Number.isFinite(value)) return
    setSettings({ targetOverrides: { ...settings.targetOverrides, [targetBranch]: value } })
    notify(tx('حُفظ المستهدف', 'Target saved'))
  }

  return (
    <div>
      <PageHeader
        eyebrow={tx('النظام', 'System')}
        title={tx('الإعدادات والعملات', 'Settings and currencies')}
        subtitle={tx('شريحة الفرع، عملة الدوحة، حسابات الكاشير المستبعدة، ومستهدف كل فرع. تُحفظ على هذا الجهاز.', 'Store segment, Doha currency, excluded cashier accounts, and each store target. Saved on this device.')}
      />
      <Seg value={tab} onChange={setTab} options={[
        { id: 'currency', label: tx('العملة والدوحة', 'Currency') },
        { id: 'segments', label: tx('الشرائح', 'Segments') },
        { id: 'cashiers', label: tx('حسابات الكاشير', 'Cashier accounts') },
        { id: 'targets', label: tx('المستهدفات', 'Targets') },
      ]} />

      {tab === 'currency' && (
        <Panel className="mt-4">
          <p className="text-sm leading-7 text-[#c5ccda]">
            {tx('متوسط سعر القطعة في الدوحة حوالي 144 مقابل نحو 1,200 جنيه في مصر. لذلك تُستبعد الدوحة من إجمالي السلسلة إلى أن تؤكد سعر الصرف.', 'Doha’s unit value is about 144 against roughly 1,200 EGP in Egypt. Doha stays out of the chain total until you confirm the exchange rate.')}
          </p>
          <div className="mt-4">
            <Label htmlFor="fx">{tx('سعر الريال بالجنيه', 'QAR to EGP')}</Label>
            <Input id="fx" type="number" value={settings.fx} onChange={(e) => setSettings({ fx: Number(e.target.value) })} className="mt-2 h-10 w-40" />
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm">
            <Checkbox id="include-doha" checked={settings.includeDoha} onCheckedChange={(checked) => setSettings({ includeDoha: checked === true })} />
            <Label htmlFor="include-doha">{tx('أدخل الدوحة في الإجمالي بعد التحويل', 'Include Doha in the total after conversion')}</Label>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">{settings.includeDoha ? tx('الدوحة داخلة الآن.', 'Doha is included.') : tx('الدوحة مستبعدة، وهذا هو الوضع الموصى به.', 'Doha is excluded, which is the recommended setup.')}</p>
        </Panel>
      )}

      {tab === 'segments' && (
        <Panel className="mt-4">
          <p className="mb-3 text-sm text-muted-foreground">{tx('غيّر شريحة الفرع لتتغير مقارنة المدير ومتوسط الشريحة.', 'Change a store’s segment and the manager comparison follows.')}</p>
          <ul className="space-y-2">
            {dataset.branches.map((branch) => {
              const segment = settings.segmentOverrides[branch.id] ?? branch.segment
              return (
                <li key={branch.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-muted/60 px-3 py-2">
                  <span>{branch.name}</span>
                  <Select
                    ariaLabel={branch.name}
                    value={segment}
                    className="w-full sm:w-44"
                    onValueChange={(value) => setSettings({ segmentOverrides: { ...settings.segmentOverrides, [branch.id]: value as Segment } })}
                    options={(['Mall', 'Governorate', 'Outlet', 'Online', 'International'] as Segment[]).map((item) => ({ value: item, label: segmentLabel(item, locale) }))}
                  />
                </li>
              )
            })}
          </ul>
        </Panel>
      )}

      {tab === 'cashiers' && (
        <Panel className="mt-4">
          <p className="mb-3 text-sm text-muted-foreground">{tx('هذه الحسابات تبقى في مبيعات الفرع وتخرج من ترتيب البائعين.', 'These accounts stay in store sales and leave the associate ranking.')}</p>
          <form className="mb-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (!account.trim()) return; setSettings({ excludedCashiers: [...settings.excludedCashiers, account.trim().toUpperCase()] }); setAccount('') }}>
            <Input value={account} onChange={(e) => setAccount(e.target.value)} placeholder="ACCOUNTING" aria-label={tx('حساب كاشير', 'Cashier account')} className="h-11 w-full sm:h-10 sm:w-56" />
            <Button type="submit" tone="gold">{tx('إضافة', 'Add')}</Button>
          </form>
          <div className="flex flex-wrap gap-2">
            {settings.excludedCashiers.map((name) => (
              <button key={name} type="button" onClick={() => setSettings({ excludedCashiers: settings.excludedCashiers.filter((item) => item !== name) })} className="rounded-full bg-white/8 px-3 py-1 text-sm">
                {name} ×
              </button>
            ))}
          </div>
        </Panel>
      )}

      {tab === 'targets' && (
        <Panel className="mt-4">
          <form className="mb-4 flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); saveTarget() }}>
            <Select
              ariaLabel={tx('الفرع', 'Store')}
              value={targetBranch}
              onValueChange={setTargetBranch}
              className="w-full sm:w-52"
              options={dataset.branches.map((b) => ({ value: b.id, label: b.name }))}
            />
            <Input aria-label={tx('المستهدف', 'Target')} value={targetValue} onChange={(e) => setTargetValue(e.target.value)} className="h-10 w-40" />
            <Button type="submit" tone="gold">{tx('حفظ المستهدف', 'Save target')}</Button>
          </form>
          <ul className="space-y-3">
            {dataset.branches.map((branch) => {
              const target = settings.targetOverrides[branch.id] ?? branch.target
              const ratio = target ? branch.sales / target : 0
              return (
                <li key={branch.id}>
                  <div className="mb-1 flex justify-between text-sm"><span>{branch.name}</span><span className="num">{percent(ratio, locale, 0)}</span></div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/8"><div className="h-full bg-primary" style={{ width: `${Math.min(100, ratio * 100)}%` }} /></div>
                  <p className="mt-1 text-xs text-muted-foreground">{money(branch.sales, locale, branch.currency)} / {money(target, locale, branch.currency)}</p>
                </li>
              )
            })}
          </ul>
        </Panel>
      )}
    </div>
  )
}
