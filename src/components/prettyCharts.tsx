import { useId, useMemo } from 'react'
import Chart from 'react-apexcharts'
import type { ApexOptions } from 'apexcharts'
import { useDirection } from '@/components/ui/direction'
import { cx } from './kit'

/** Soft brand palette — no glow */
const C = {
  gold: '#e4b15d',
  blue: '#7eb6ff',
  teal: '#3dcea0',
  amber: '#f0b429',
  rose: '#ff6b7d',
  muted: '#a8b3c7',
  ink: '#f7f4ee',
  track: 'rgba(255,255,255,0.08)',
  grid: 'rgba(255,255,255,0.12)',
} as const

export const CHART_HEIGHT = {
  compact: 168,
  panel: 240,
  hero: 260,
} as const

export type ChartHeight = keyof typeof CHART_HEIGHT

function prefersReducedMotion() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function useChartColors() {
  return useMemo(() => ({
    gold: C.gold,
    blue: C.blue,
    teal: C.teal,
    amber: C.amber,
    rose: C.rose,
    muted: C.muted,
    foreground: C.ink,
    border: C.grid,
    track: C.track,
  }), [])
}

export function categoryX(categories: string[], extra: ApexOptions['xaxis'] = {}): ApexOptions['xaxis'] {
  return {
    type: 'category',
    categories,
    ...extra,
    labels: {
      style: { colors: C.muted, fontSize: '11px' },
      ...extra?.labels,
    },
  }
}

type ApexSingleYAxis = Exclude<NonNullable<ApexOptions['yaxis']>, unknown[]>

export function compactYAxis(
  formatter: (value: number) => string,
  extra: ApexSingleYAxis = {},
): ApexOptions['yaxis'] {
  return {
    ...extra,
    labels: {
      ...(extra.labels ?? {}),
      formatter: (value) => formatter(Number(value)),
      style: { colors: C.muted, fontSize: '11px', ...(extra.labels?.style ?? {}) },
    },
  }
}

export function moneyTooltip(formatter: (value: number | null) => string): ApexOptions['tooltip'] {
  return {
    theme: 'dark',
    y: {
      formatter: (value) => formatter(value == null ? null : Number(value)),
    },
  }
}

export function dualAxisPercent(opts: {
  leftTitle: string
  rightTitle: string
  leftFormat: (value: number) => string
  rightFormat: (value: number) => string
  rtl?: boolean
}): ApexOptions['yaxis'] {
  return [
    {
      title: { text: opts.leftTitle, style: { color: C.muted } },
      labels: {
        formatter: (value) => opts.leftFormat(Number(value)),
        style: { colors: C.muted, fontSize: '11px' },
      },
    },
    {
      opposite: true,
      max: 100,
      title: { text: opts.rightTitle, style: { color: C.muted } },
      labels: {
        formatter: (value) => opts.rightFormat(Number(value)),
        style: { colors: C.muted, fontSize: '11px' },
        offsetX: opts.rtl ? 4 : 0,
      },
    },
  ]
}

function resolveHeight(height?: number | string | ChartHeight): number | string {
  if (height == null) return CHART_HEIGHT.panel
  if (typeof height === 'string' && height in CHART_HEIGHT) return CHART_HEIGHT[height as ChartHeight]
  return height
}

function softFill(from = 0.45, to = 0.05): ApexOptions['fill'] {
  return {
    type: 'gradient',
    gradient: {
      shade: 'dark',
      type: 'vertical',
      shadeIntensity: 0.35,
      opacityFrom: from,
      opacityTo: to,
      stops: [0, 90, 100],
    },
  }
}

function mergeOptions(base: ApexOptions, patch: ApexOptions = {}): ApexOptions {
  const baseY = Array.isArray(base.yaxis) ? undefined : base.yaxis
  const patchY = Array.isArray(patch.yaxis) ? undefined : patch.yaxis
  return {
    ...base,
    ...patch,
    chart: { ...base.chart, ...patch.chart, dropShadow: { enabled: false } },
    grid: { ...base.grid, ...patch.grid },
    legend: { ...base.legend, ...patch.legend },
    stroke: { ...base.stroke, ...patch.stroke },
    tooltip: { ...base.tooltip, ...patch.tooltip },
    xaxis: { ...base.xaxis, ...patch.xaxis, labels: { ...base.xaxis?.labels, ...patch.xaxis?.labels } },
    yaxis: Array.isArray(patch.yaxis)
      ? patch.yaxis
      : { ...baseY, ...patchY, labels: { ...baseY?.labels, ...patchY?.labels } },
    plotOptions: {
      ...base.plotOptions,
      ...patch.plotOptions,
      bar: { ...base.plotOptions?.bar, ...patch.plotOptions?.bar },
      radialBar: { ...base.plotOptions?.radialBar, ...patch.plotOptions?.radialBar },
      radar: { ...base.plotOptions?.radar, ...patch.plotOptions?.radar },
      polarArea: { ...base.plotOptions?.polarArea, ...patch.plotOptions?.polarArea },
      bubble: { ...base.plotOptions?.bubble, ...patch.plotOptions?.bubble },
    },
    fill: patch.fill?.type === 'solid'
      ? { ...base.fill, ...patch.fill, gradient: undefined }
      : { ...base.fill, ...patch.fill, gradient: { ...base.fill?.gradient, ...patch.fill?.gradient } },
    markers: { ...base.markers, ...patch.markers },
    dataLabels: { ...base.dataLabels, ...patch.dataLabels },
    colors: patch.colors ?? base.colors,
    annotations: patch.annotations ?? base.annotations,
  }
}

function useChartTheme(): ApexOptions {
  const dir = useDirection()
  const animate = !prefersReducedMotion()

  return useMemo(() => ({
    chart: {
      background: 'transparent',
      foreColor: C.muted,
      fontFamily: '"Readex Pro", "IBM Plex Sans", sans-serif',
      toolbar: { show: false },
      zoom: { enabled: false },
      dropShadow: { enabled: false },
      animations: {
        enabled: animate,
        speed: 800,
        animateGradually: { enabled: true, delay: 40 },
        dynamicAnimation: { enabled: true, speed: 350 },
      },
    },
    theme: { mode: 'dark' },
    colors: [C.gold, C.blue, C.teal, C.amber, C.rose],
    grid: {
      borderColor: C.grid,
      strokeDashArray: 3,
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } },
      padding: { left: 8, right: 8 },
    },
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 2.5 },
    legend: {
      show: true,
      position: 'top',
      horizontalAlign: dir === 'rtl' ? 'right' : 'left',
      labels: { colors: C.muted },
      markers: { size: 7, strokeWidth: 0 },
      fontSize: '12px',
    },
    tooltip: {
      theme: 'dark',
      style: { fontSize: '12px' },
      fillSeriesColor: false,
    },
    xaxis: {
      labels: { style: { colors: C.muted, fontSize: '11px' } },
      axisBorder: { show: false },
      axisTicks: { show: false },
      tooltip: { enabled: false },
    },
    yaxis: {
      labels: {
        style: { colors: C.muted, fontSize: '11px' },
        offsetX: dir === 'rtl' ? -4 : 0,
      },
      title: { style: { color: C.muted } },
    },
    states: {
      hover: { filter: { type: 'lighten', value: 0.08 } },
      active: { filter: { type: 'none' } },
    },
  }), [animate, dir])
}

type Series = NonNullable<ApexOptions['series']>
type ChartType = NonNullable<React.ComponentProps<typeof Chart>['type']>

type CommonProps = {
  series: Series
  options?: ApexOptions
  height?: number | string | ChartHeight
  className?: string
  type?: ChartType
  title?: string
  summary?: string
}

function ApexShell({
  type,
  series,
  options = {},
  height = 'panel',
  className,
  title,
  summary,
}: CommonProps & { type: ChartType }) {
  const theme = useChartTheme()
  const merged = useMemo(() => mergeOptions(theme, options), [theme, options])
  const titleId = useId()
  const summaryId = useId()

  return (
    <div className={cx('w-full', className)}>
      {title ? <p id={titleId} className="sr-only">{title}</p> : null}
      {summary ? <p id={summaryId} className="sr-only">{summary}</p> : null}
      <div
        role="img"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={summary ? summaryId : undefined}
      >
        <Chart type={type} series={series} options={merged} height={resolveHeight(height)} width="100%" />
      </div>
    </div>
  )
}

export function PrettyGauge({
  value,
  label,
  tone = 'gold',
  height = 'compact',
  className,
  title,
  summary,
}: {
  value: number
  label: string
  tone?: 'gold' | 'good' | 'bad' | 'warn'
  height?: number | string | ChartHeight
  className?: string
  title?: string
  summary?: string
}) {
  const color =
    tone === 'good' ? C.teal :
    tone === 'bad' ? C.rose :
    tone === 'warn' ? C.amber :
    C.gold
  const pct = Math.max(0, Math.min(100, Math.round(value * 100)))
  const options = useMemo<ApexOptions>(() => ({
    chart: { type: 'radialBar', dropShadow: { enabled: false } },
    colors: [color],
    plotOptions: {
      radialBar: {
        startAngle: -135,
        endAngle: 135,
        hollow: { size: '58%', margin: 4 },
        track: {
          background: C.track,
          strokeWidth: '97%',
          margin: 0,
          dropShadow: { enabled: false },
        },
        dataLabels: {
          name: { show: true, offsetY: 28, color: C.muted, fontSize: '11px' },
          value: {
            show: true,
            offsetY: -12,
            fontSize: '22px',
            fontWeight: 700,
            color: C.ink,
            formatter: () => `${pct}%`,
          },
        },
      },
    },
    fill: { type: 'solid' },
    stroke: { lineCap: 'round' },
    labels: [label],
    legend: { show: false },
    grid: { show: false },
  }), [color, label, pct])

  return (
    <ApexShell
      type="radialBar"
      series={[pct]}
      options={options}
      height={height}
      className={className}
      title={title ?? label}
      summary={summary ?? `${label}: ${pct}%`}
    />
  )
}

export function PrettyRibbon({ series, options, height = 'panel', className, title, summary }: CommonProps) {
  const mergedOptions = useMemo<ApexOptions>(() => mergeOptions({
    chart: { type: 'line', dropShadow: { enabled: false } },
    stroke: { width: [0, 2.5], curve: 'smooth' },
    plotOptions: {
      bar: {
        borderRadius: 8,
        borderRadiusApplication: 'end',
        columnWidth: '52%',
      },
    },
    fill: {
      type: ['gradient', 'solid'],
      gradient: {
        shade: 'dark',
        type: 'vertical',
        shadeIntensity: 0.4,
        opacityFrom: 0.55,
        opacityTo: 0.05,
        stops: [0, 90, 100],
      },
    },
    markers: { size: 0, hover: { size: 5 } },
    colors: [C.blue, C.gold],
    legend: { show: true },
  }, options ?? {}), [options])

  return <ApexShell type="line" series={series} options={mergedOptions} height={height} className={className} title={title} summary={summary} />
}

export function PrettyForecast({ series, options, height = 'hero', className, title, summary }: CommonProps) {
  const dir = useDirection()
  const mergedOptions = useMemo<ApexOptions>(() => mergeOptions({
    chart: { type: 'rangeArea', dropShadow: { enabled: false } },
    colors: [C.gold, C.teal, C.gold],
    stroke: { curve: 'smooth', width: [0, 2.5, 2.5] },
    fill: {
      type: ['solid', 'solid', 'solid'],
      opacity: [0.18, 1, 1],
    },
    markers: {
      size: [0, 0, 4],
      colors: [C.gold],
      strokeWidth: 0,
      hover: { size: 6 },
    },
    xaxis: {
      labels: {
        rotate: dir === 'rtl' ? 35 : -35,
        hideOverlappingLabels: true,
        trim: true,
      },
      tickAmount: 8,
    },
    legend: { show: true },
  }, options ?? {}), [dir, options])

  return <ApexShell type="rangeArea" series={series} options={mergedOptions} height={height} className={className} title={title} summary={summary} />
}

export function PrettyPolar({ series, options, height = 'panel', className, title, summary }: CommonProps) {
  const mergedOptions = useMemo<ApexOptions>(() => mergeOptions({
    chart: { type: 'polarArea', dropShadow: { enabled: false } },
    stroke: { colors: ['rgba(9,13,22,0.65)'], width: 2 },
    fill: { opacity: 0.82 },
    plotOptions: {
      polarArea: {
        rings: { strokeWidth: 1, strokeColor: C.grid },
        spokes: { strokeWidth: 1, connectorColors: C.grid },
      },
    },
    yaxis: { show: false },
    legend: { position: 'bottom' },
    dataLabels: {
      enabled: true,
      style: { fontSize: '11px', fontWeight: 600, colors: [C.ink] },
      background: { enabled: false },
      dropShadow: { enabled: false },
    },
    colors: [C.blue, C.blue, C.blue, C.blue, C.blue, C.gold, C.gold],
  }, options ?? {}), [options])

  return <ApexShell type="polarArea" series={series} options={mergedOptions} height={height} className={className} title={title} summary={summary} />
}

export function PrettyRadar({ series, options, height = 'panel', className, title, summary }: CommonProps) {
  const mergedOptions = useMemo<ApexOptions>(() => mergeOptions({
    chart: { type: 'radar', dropShadow: { enabled: false } },
    stroke: { width: 2 },
    fill: { opacity: 0.2, type: 'solid' },
    markers: { size: 4, hover: { size: 6 }, strokeWidth: 0 },
    plotOptions: {
      radar: {
        polygons: {
          strokeColors: C.grid,
          connectorColors: C.grid,
          fill: { colors: ['rgba(255,255,255,0.02)', 'rgba(255,255,255,0.04)'] },
        },
      },
    },
    yaxis: { show: false },
    colors: [C.gold, C.blue],
  }, options ?? {}), [options])

  return <ApexShell type="radar" series={series} options={mergedOptions} height={height} className={className} title={title} summary={summary} />
}

export function PrettyBubble({ series, options, height = 'hero', className, title, summary }: CommonProps) {
  const mergedOptions = useMemo<ApexOptions>(() => mergeOptions({
    chart: { type: 'bubble', zoom: { enabled: false }, dropShadow: { enabled: false } },
    dataLabels: { enabled: false },
    fill: softFill(0.7, 0.25),
    plotOptions: {
      bubble: { minBubbleRadius: 6, maxBubbleRadius: 26 },
    },
    legend: { show: false },
    colors: [C.gold],
  }, options ?? {}), [options])

  return <ApexShell type="bubble" series={series} options={mergedOptions} height={height} className={className} title={title} summary={summary} />
}

export function PrettyBar({ series, options, height = 'panel', className, distributed, horizontal, title, summary }: CommonProps & { distributed?: boolean; horizontal?: boolean }) {
  const mergedOptions = useMemo<ApexOptions>(() => mergeOptions({
    chart: { type: 'bar', dropShadow: { enabled: false } },
    plotOptions: {
      bar: {
        borderRadius: 4,
        borderRadiusApplication: 'end',
        columnWidth: '88%',
        barHeight: horizontal ? '76%' : undefined,
        distributed,
        horizontal,
      },
    },
    legend: { show: !distributed },
    fill: { type: 'solid', opacity: 1 },
    colors: distributed
      ? [C.blue, C.teal, C.gold, C.amber, C.rose, C.blue, C.teal]
      : [C.gold, C.blue],
    dataLabels: horizontal
      ? {
          enabled: true,
          style: { colors: [C.ink], fontSize: '11px', fontWeight: 600 },
          dropShadow: { enabled: false },
        }
      : { enabled: false },
  }, options ?? {}), [distributed, horizontal, options])

  return <ApexShell type="bar" series={series} options={mergedOptions} height={height} className={className} title={title} summary={summary} />
}

export function PrettyArea({ series, options, height = 'compact', className, title, summary }: CommonProps) {
  const mergedOptions = useMemo<ApexOptions>(() => mergeOptions({
    chart: { type: 'area', dropShadow: { enabled: false } },
    stroke: { curve: 'smooth', width: 2.5 },
    fill: softFill(0.5, 0.04),
    markers: {
      size: 0,
      hover: { size: 5 },
      colors: [C.gold],
      strokeColors: '#0b101b',
      strokeWidth: 2,
    },
    legend: { show: false },
    colors: [C.gold],
  }, options ?? {}), [options])

  return <ApexShell type="area" series={series} options={mergedOptions} height={height} className={className} title={title} summary={summary} />
}

export function PrettyLine({ series, options, height = 'hero', className, type = 'line', title, summary }: CommonProps) {
  const mergedOptions = useMemo<ApexOptions>(() => mergeOptions({
    chart: { type, dropShadow: { enabled: false } },
    stroke: { curve: 'smooth', width: [0, 2.5, 2.5] },
    markers: {
      size: [0, 0, 4],
      hover: { size: 6 },
      strokeWidth: 0,
    },
    fill: {
      type: ['solid', 'solid', 'solid'],
      opacity: [0.18, 1, 1],
    },
    colors: [C.gold, C.teal, C.gold],
  }, options ?? {}), [options, type])

  return <ApexShell type={type} series={series} options={mergedOptions} height={height} className={className} title={title} summary={summary} />
}

export function PrettyCombo({ series, options, height = 'panel', className, title, summary }: CommonProps) {
  const mergedOptions = useMemo<ApexOptions>(() => mergeOptions({
    chart: { type: 'line', dropShadow: { enabled: false } },
    stroke: { width: [0, 2.5], curve: 'smooth' },
    plotOptions: {
      bar: {
        borderRadius: 7,
        borderRadiusApplication: 'end',
        columnWidth: '52%',
      },
    },
    fill: {
      type: ['gradient', 'solid'],
      gradient: {
        shade: 'dark',
        type: 'vertical',
        shadeIntensity: 0.4,
        opacityFrom: 0.85,
        opacityTo: 0.2,
        stops: [0, 100],
      },
    },
    markers: { size: [0, 4], hover: { size: 6 }, strokeWidth: 0 },
    colors: [C.blue, C.gold],
  }, options ?? {}), [options])

  return <ApexShell type="line" series={series} options={mergedOptions} height={height} className={className} title={title} summary={summary} />
}
