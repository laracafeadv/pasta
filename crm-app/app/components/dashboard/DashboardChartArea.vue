<template>
  <div
    id="dashboard-chart-area"
    class="bg-white dark:bg-slate-900/50 rounded-lg p-6 border border-slate-200 dark:border-white/10 backdrop-blur-xl relative shadow-sm dark:shadow-none h-full flex flex-col"
  >
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
      <div>
        <h3 class="text-xl font-bold text-slate-900 dark:text-white">Desempenho de Leads vs Vendas</h3>
        <p class="text-xs text-slate-400 dark:text-slate-500 mt-1">
          {{ chartData.length }} dias · {{ totalLeads.toLocaleString('pt-BR') }} leads ·
          {{ totalVendas }} vendas no período
        </p>
      </div>
      <div class="flex items-center gap-5 text-xs font-medium flex-shrink-0">
        <div class="flex items-center gap-2">
          <span class="w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20"></span>
          <span class="text-slate-500 dark:text-slate-400">Novos Leads</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="w-3 h-3 rounded-full bg-blue-500 ring-2 ring-blue-500/20"></span>
          <span class="text-slate-500 dark:text-slate-400">Recorrentes</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="w-3 h-3 rounded-full bg-orange-400 ring-2 ring-orange-400/20"></span>
          <span class="text-slate-500 dark:text-slate-400">Vendas</span>
        </div>
      </div>
    </div>

    <!-- Chart Scroll Wrapper -->
    <div class="overflow-x-auto -mx-1 px-1 scrollbar-thin flex-1 flex items-center" ref="wrapperRef">
      <div :style="{ minWidth: chartMinWidth }" class="relative">

        <!-- SVG Chart -->
        <svg
          :viewBox="`0 0 ${svgWidth} ${SVG_HEIGHT}`"
          :width="svgWidth"
          :height="SVG_HEIGHT"
          class="overflow-visible block"
          style="font-family: inherit"
          ref="svgRef"
          @mousemove="onMouseMove"
          @mouseleave="tooltip.visible = false"
        >
          <!-- Defs: gradients -->
          <defs>
            <linearGradient id="gradLeads" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#10b981" stop-opacity="0.25" />
              <stop offset="100%" stop-color="#10b981" stop-opacity="0" />
            </linearGradient>
            <linearGradient id="gradRecorrentes" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.2" />
              <stop offset="100%" stop-color="#3b82f6" stop-opacity="0" />
            </linearGradient>
            <linearGradient id="gradVendas" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#fb923c" stop-opacity="0.22" />
              <stop offset="100%" stop-color="#fb923c" stop-opacity="0" />
            </linearGradient>
          </defs>

          <!-- Y-axis gridlines + labels -->
          <g v-for="(tick, i) in yTicks" :key="'ytick-' + i">
            <line
              :x1="MARGIN_LEFT"
              :y1="yPos(tick)"
              :x2="svgWidth - MARGIN_RIGHT"
              :y2="yPos(tick)"
              stroke="currentColor"
              stroke-width="0.5"
              :stroke-opacity="i === 0 ? 0.15 : 0.08"
              class="text-slate-400 dark:text-slate-600"
            />
            <text
              :x="MARGIN_LEFT - 8"
              :y="yPos(tick) + 4"
              text-anchor="end"
              class="fill-slate-400 dark:fill-slate-500"
              font-size="10"
            >{{ tick }}</text>
          </g>

          <!-- Area fills -->
          <path :d="areaPath('leads')"      fill="url(#gradLeads)"       class="transition-all duration-700" />
          <path :d="areaPath('recorrentes')" fill="url(#gradRecorrentes)" class="transition-all duration-700" />
          <path :d="areaPath('vendas')"      fill="url(#gradVendas)"      class="transition-all duration-700" />

          <!-- Stroke lines -->
          <path :d="linePath('leads')"       fill="none" stroke="#10b981" stroke-width="2"   stroke-linejoin="round" stroke-linecap="round" class="transition-all duration-700" />
          <path :d="linePath('recorrentes')" fill="none" stroke="#3b82f6" stroke-width="2"   stroke-linejoin="round" stroke-linecap="round" class="transition-all duration-700" />
          <path :d="linePath('vendas')"      fill="none" stroke="#fb923c" stroke-width="1.5" stroke-dasharray="4 3" stroke-linejoin="round" stroke-linecap="round" class="transition-all duration-700" />

          <!-- Dots on each data point (vendas line) -->
          <circle
            v-for="(pt, i) in chartData"
            :key="'dot-v-' + i"
            :cx="xPos(i)"
            :cy="yPos(pt.vendas)"
            r="3"
            fill="#fb923c"
            stroke="white"
            stroke-width="1.5"
            class="dark:stroke-slate-900"
          />

          <!-- X-Axis labels (thinned) -->
          <g v-for="(pt, i) in chartData" :key="'xlabel-' + i">
            <text
              v-if="showLabel(i)"
              :x="xPos(i)"
              :y="SVG_HEIGHT - 6"
              text-anchor="middle"
              font-size="10"
              class="fill-slate-400 dark:fill-slate-500"
            >{{ pt.date }}</text>
          </g>

          <!-- Hover crosshair line -->
          <line
            v-if="tooltip.visible"
            :x1="tooltip.x"
            :y1="MARGIN_TOP"
            :x2="tooltip.x"
            :y2="SVG_HEIGHT - MARGIN_BOTTOM"
            stroke="#94a3b8"
            stroke-width="1"
            stroke-dasharray="3 3"
          />

          <!-- Hover dots highlight -->
          <template v-if="tooltip.visible && tooltip.point">
            <circle :cx="tooltip.x" :cy="yPos(tooltip.point.leads)"       r="5" fill="#10b981" stroke="white" stroke-width="2" class="dark:stroke-slate-900" />
            <circle :cx="tooltip.x" :cy="yPos(tooltip.point.recorrentes)" r="5" fill="#3b82f6" stroke="white" stroke-width="2" class="dark:stroke-slate-900" />
            <circle :cx="tooltip.x" :cy="yPos(tooltip.point.vendas)"      r="5" fill="#fb923c" stroke="white" stroke-width="2" class="dark:stroke-slate-900" />
          </template>
        </svg>

        <!-- Floating Tooltip (HTML over SVG) -->
        <Transition name="fade">
          <div
            v-if="tooltip.visible && tooltip.point"
            class="absolute pointer-events-none z-30"
            :style="tooltipStyle"
          >
            <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-md shadow-2xl px-4 py-3 min-w-[160px]">
              <p class="text-xs font-bold text-slate-700 dark:text-white border-b border-slate-100 dark:border-white/10 pb-2 mb-2">
                📅 {{ tooltip.point.date }}
              </p>
              <div class="space-y-1.5 text-xs">
                <div class="flex items-center justify-between gap-8">
                  <span class="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                    <span class="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>Novos
                  </span>
                  <span class="font-bold text-slate-800 dark:text-white">{{ tooltip.point.leads }}</span>
                </div>
                <div class="flex items-center justify-between gap-8">
                  <span class="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                    <span class="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>Recorrentes
                  </span>
                  <span class="font-bold text-slate-800 dark:text-white">{{ tooltip.point.recorrentes }}</span>
                </div>
                <div class="flex items-center justify-between gap-8 pt-1 border-t border-slate-100 dark:border-white/10">
                  <span class="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                    <span class="w-2 h-2 rounded-full bg-orange-400 inline-block"></span>Vendas
                  </span>
                  <span class="font-bold text-orange-500">{{ tooltip.point.vendas }}</span>
                </div>
              </div>
            </div>
          </div>
        </Transition>

      </div>
    </div>

    <!-- Empty state -->
    <div v-if="!chartData.length" class="flex items-center justify-center h-40 text-slate-400 dark:text-slate-500 text-sm">
      Nenhum dado disponível para o período.
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'

interface ChartPoint {
  date: string
  leads: number
  recorrentes: number
  vendas: number
}

interface Props {
  chartData: ChartPoint[]
}

const props = defineProps<Props>()

// ── Layout constants ──────────────────────────────────────────────
const SVG_HEIGHT    = 260
const MARGIN_LEFT   = 36
const MARGIN_RIGHT  = 12
const MARGIN_TOP    = 16
const MARGIN_BOTTOM = 28

// Min pixel width per data point to avoid cramping
const MIN_BAR_PX = 24
const MAX_SVG_WIDTH = 1400

const wrapperRef = ref<HTMLElement | null>(null)
const svgRef     = ref<SVGSVGElement | null>(null)

// Dynamic SVG width based on data density
const svgWidth = computed(() => {
  const n = props.chartData.length
  if (!n) return 600
  const ideal = n * MIN_BAR_PX + MARGIN_LEFT + MARGIN_RIGHT
  return Math.min(Math.max(ideal, 500), MAX_SVG_WIDTH)
})

const chartMinWidth = computed(() => `${svgWidth.value}px`)

// ── Y-axis ────────────────────────────────────────────────────────
const maxLeads = computed(() =>
  Math.max(...props.chartData.map(d => d.leads + d.recorrentes), 10)
)
const maxVendas = computed(() =>
  Math.max(...props.chartData.map(d => d.vendas), 1)
)
// Use a shared max across all series so they share the y-scale
const globalMax = computed(() => Math.max(maxLeads.value, maxVendas.value))

const yTicks = computed(() => {
  const max = globalMax.value
  const step = niceStep(max, 5)
  const ticks: number[] = []
  for (let v = 0; v <= max; v += step) ticks.push(v)
  return ticks.reverse()
})

function niceStep(max: number, targetTicks: number): number {
  const raw = max / targetTicks
  const mag = Math.pow(10, Math.floor(Math.log10(raw)))
  const candidates = [1, 2, 5, 10].map(c => c * mag)
  return candidates.find(c => c >= raw) || candidates[candidates.length - 1]!
}

// ── Coordinate helpers ────────────────────────────────────────────
const plotWidth  = computed(() => svgWidth.value - MARGIN_LEFT - MARGIN_RIGHT)
const plotHeight = computed(() => SVG_HEIGHT - MARGIN_TOP - MARGIN_BOTTOM)

function xPos(i: number): number {
  const n = props.chartData.length
  if (n <= 1) return MARGIN_LEFT + plotWidth.value / 2
  return MARGIN_LEFT + (i / (n - 1)) * plotWidth.value
}

function yPos(val: number): number {
  const max = globalMax.value
  const pct = max > 0 ? val / max : 0
  return MARGIN_TOP + plotHeight.value * (1 - pct)
}

// ── Smooth SVG paths ──────────────────────────────────────────────
type DataKey = 'leads' | 'recorrentes' | 'vendas'

function linePath(key: DataKey): string {
  const d = props.chartData
  if (!d.length) return ''
  let path = ''
  d.forEach((pt, i) => {
    const x = xPos(i)
    const y = yPos(pt[key])
    if (i === 0) {
      path += `M ${x} ${y}`
    } else {
      // Smooth cubic bezier
      const px = xPos(i - 1)
      const py = yPos(d[i - 1]![key])
      const cpx = (px + x) / 2
      path += ` C ${cpx} ${py}, ${cpx} ${y}, ${x} ${y}`
    }
  })
  return path
}

function areaPath(key: DataKey): string {
  const d = props.chartData
  if (!d.length) return ''
  const baseline = MARGIN_TOP + plotHeight.value
  const first = `M ${xPos(0)} ${baseline} L ${xPos(0)} ${yPos(d[0]![key])}`
  let curve = ''
  d.forEach((pt, i) => {
    if (i === 0) return
    const x = xPos(i)
    const y = yPos(pt[key])
    const px = xPos(i - 1)
    const py = yPos(d[i - 1]![key])
    const cpx = (px + x) / 2
    curve += ` C ${cpx} ${py}, ${cpx} ${y}, ${x} ${y}`
  })
  const close = ` L ${xPos(d.length - 1)} ${baseline} Z`
  return first + curve + close
}

// ── X-axis label thinning ─────────────────────────────────────────
const MAX_LABELS = 14

function showLabel(i: number): boolean {
  const n = props.chartData.length
  if (n <= MAX_LABELS) return true
  const step = Math.ceil(n / MAX_LABELS)
  return i % step === 0 || i === n - 1
}

// ── Totals for subtitle ───────────────────────────────────────────
const totalLeads = computed(() =>
  props.chartData.reduce((s, p) => s + p.leads + p.recorrentes, 0)
)
const totalVendas = computed(() =>
  props.chartData.reduce((s, p) => s + p.vendas, 0)
)

// ── Tooltip ───────────────────────────────────────────────────────
const tooltip = reactive<{
  visible: boolean
  x: number
  point: ChartPoint | null
  screenX: number
  screenY: number
}>({
  visible: false,
  x: 0,
  point: null,
  screenX: 0,
  screenY: 0,
})

function onMouseMove(evt: MouseEvent) {
  const svg = svgRef.value
  if (!svg || !props.chartData.length) return

  const rect = svg.getBoundingClientRect()
  // Convert client coords to SVG coords
  const mx = ((evt.clientX - rect.left) / rect.width) * svgWidth.value

  // Find nearest data point
  const n = props.chartData.length
  let best = 0
  let bestDist = Infinity
  for (let i = 0; i < n; i++) {
    const dist = Math.abs(xPos(i) - mx)
    if (dist < bestDist) { bestDist = dist; best = i }
  }

  tooltip.visible = true
  tooltip.x       = xPos(best)
  tooltip.point   = props.chartData[best]!

  // Store mouse position relative to wrapper for floating HTML tooltip
  const wrapperRect = wrapperRef.value?.getBoundingClientRect()
  if (wrapperRect) {
    tooltip.screenX = evt.clientX - wrapperRect.left
    tooltip.screenY = evt.clientY - wrapperRect.top
  }
}

const tooltipStyle = computed(() => {
  const TOOLTIP_W = 170
  const ww = wrapperRef.value?.clientWidth || 600
  let left = tooltip.screenX + 14
  if (left + TOOLTIP_W > ww) left = tooltip.screenX - TOOLTIP_W - 14
  return {
    left: `${left}px`,
    top:  `${Math.max(0, tooltip.screenY - 60)}px`,
  }
})
</script>
