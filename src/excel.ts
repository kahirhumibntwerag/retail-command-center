import * as XLSX from 'xlsx'
import { datasetFromUpload } from './engine'
import type { Branch, Dataset, Segment } from './types'

const SEGMENTS: Segment[] = ['Mall', 'Governorate', 'Outlet', 'Online', 'International']

function sheet(rows: unknown[][]) {
  return XLSX.utils.aoa_to_sheet(rows)
}

export function downloadTemplate() {
  const book = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(book, sheet([
    ['name', 'segment', 'sales', 'trx', 'upt', 'atv', 'utv', 'cv', 'h2vsH1', 'staff', 'top3', 'unattributed', 'currency', 'target'],
    ['Mall of Tanta', 'Mall', 3368512, 1731, 1.69, 1946, 1152, 0.262, -0.038, 13, 0.578, 0, 'EGP', 3500000],
    ['Al Doha', 'International', 263717, 750, 2.44, 352, 144, 0.262, -0.038, 5, 0.816, 0, 'QAR', 2000000],
  ]), 'Branches')
  XLSX.utils.book_append_sheet(book, sheet([
    ['code', 'name', 'units', 'dept', 'category'],
    ['S6121', 'DRESS CHIFFON PRINTED', 358, 'CASUAL', 'CASUAL DRESS'],
  ]), 'Models')
  XLSX.utils.book_append_sheet(book, sheet([
    ['name', 'phone', 'branch', 'segment', 'first', 'last', 'invoices', 'units', 'ltv'],
    ['رنا سالم', '01012345678', 'Mall of Tanta', 'champion', '2026-01-20', '2026-08-06', 12, 26, 41500],
  ]), 'Customers')
  XLSX.utils.book_append_sheet(book, sheet([
    ['code', 'name', 'dept', 'category', 'status', 'onHand', 'sold30', 'weekly', 'doi', 'stockValue', 'frozen', 'action'],
    ['S6121', 'DRESS CHIFFON PRINTED', 'CASUAL', 'CASUAL DRESS', 'fast', 191, 358, 83.5, 16, 418290, 0, 'replenish'],
  ]), 'Inventory')
  XLSX.writeFile(book, 'retail-command-template.xlsx')
}

export function exportRows(filename: string, sheetName: string, rows: Record<string, unknown>[]) {
  const book = XLSX.utils.book_new()
  const data = rows.length ? XLSX.utils.json_to_sheet(rows) : sheet([['empty']])
  XLSX.utils.book_append_sheet(book, data, sheetName.slice(0, 31))
  XLSX.writeFile(book, filename)
}

function num(value: unknown, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const n = Number(String(value ?? '').replace(/,/g, '').trim())
  return Number.isFinite(n) ? n : fallback
}

function text(value: unknown) {
  return String(value ?? '').trim()
}

export function parseWorkbook(file: ArrayBuffer, filename: string): { dataset: Dataset; warnings: string[] } {
  const book = XLSX.read(file, { type: 'array' })
  const warnings: string[] = []
  const branchSheet = book.Sheets.Branches ?? book.Sheets[book.SheetNames[0]]
  if (!branchSheet) throw new Error('missing-branches')
  const table = XLSX.utils.sheet_to_json<Record<string, unknown>>(branchSheet, { defval: '' })
  let dropped = 0
  const branches: Branch[] = []
  for (const row of table) {
    const name = text(row.name ?? row.Name ?? row['الفرع'] ?? row.branch)
    if (!name) continue
    if (/total|subtotal|الإجمالي|اجمالي/i.test(name)) {
      dropped += 1
      continue
    }
    const segmentRaw = text(row.segment ?? row.Segment ?? row['الشريحة']) || 'Governorate'
    const segment = SEGMENTS.find((s) => s.toLowerCase() === segmentRaw.toLowerCase()) ?? 'Governorate'
    if (!SEGMENTS.includes(segmentRaw as Segment) && segmentRaw !== segment) warnings.push(name)
    const sales = num(row.sales ?? row.Sales ?? row['المبيعات'])
    const trx = num(row.trx ?? row.TRX ?? row['الفواتير'], 1)
    const upt = num(row.upt ?? row.UPT, 1.5)
    const currency = text(row.currency ?? row.Currency) === 'QAR' ? 'QAR' : 'EGP'
    branches.push({
      id: name.toLowerCase().replace(/\s+/g, '-'),
      name,
      segment,
      sales,
      trx,
      units: Math.round(trx * upt),
      upt,
      atv: num(row.atv ?? row.ATV, trx ? sales / trx : 0),
      utv: num(row.utv ?? row.UTV, upt ? (trx ? sales / trx : 0) / upt : 0),
      cv: num(row.cv ?? row.CV, 0.26),
      h2vsH1: num(row.h2vsH1 ?? row.h2 ?? row.H2, -0.04),
      staff: Math.max(1, Math.round(num(row.staff ?? row.Staff, 4))),
      top3: num(row.top3 ?? row.Top3, 0.5),
      unattributed: num(row.unattributed ?? row.Unattributed, 0),
      currency,
      target: num(row.target ?? row.Target, Math.round(sales * 1.05)),
    })
  }
  if (!branches.length) throw new Error('no-rows')
  return {
    warnings,
    dataset: datasetFromUpload({
      branches,
      droppedSubtotals: dropped,
      sourceName: filename,
    }),
  }
}
