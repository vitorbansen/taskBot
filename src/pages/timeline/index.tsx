import { useState, useEffect, useRef, useCallback } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import axios from 'axios'
import { ZoomIn, ZoomOut, RefreshCw, Clock, Settings, Activity } from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Robot {
  id: number
  name: string
  startTime: string
  endTime: string
  color: string
  manual: boolean
  day: number
  description?: string
}

type Status = 'running' | 'completed' | 'pending'

interface LayoutItem {
  robot: Robot
  status: Status
  col: number
  totalCols: number
  top: number
  height: number
}

interface TooltipData {
  robot: Robot
  status: Status
  x: number
  y: number
}

// ─── Constants ───────────────────────────────────────────────────────────────

const DAYS_COUNT = 10
const TIME_COL_WIDTH = 68
const DAY_MIN_WIDTH = 180
const HEADER_HEIGHT = 88
const ZOOM_LEVELS = [48, 64, 80, 96, 120]
const HOURS = Array.from({ length: 24 }, (_, i) => i)
const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MONTH_NAMES = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
]

const STATUS_CONFIG: Record<Status, {
  label: string
  dotColor: string
  borderColor: string
  bgColor: string
  textColor: string
}> = {
  running: {
    label: 'Executando',
    dotColor: '#22c55e',
    borderColor: '#16a34a',
    bgColor: 'rgba(34,197,94,0.14)',
    textColor: '#4ade80',
  },
  completed: {
    label: 'Concluído',
    dotColor: '#9ca3af',
    borderColor: '#6b7280',
    bgColor: 'rgba(156,163,175,0.1)',
    textColor: '#9ca3af',
  },
  pending: {
    label: 'Pendente',
    dotColor: '#60a5fa',
    borderColor: '#3b82f6',
    bgColor: 'rgba(96,165,250,0.12)',
    textColor: '#93c5fd',
  },
}

// ─── Pure helpers ─────────────────────────────────────────────────────────────

const toMin = (t: string) => {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

const getDays = (): Date[] => {
  const now = new Date()
  return Array.from({ length: DAYS_COUNT }, (_, i) => {
    const d = new Date(now)
    d.setDate(now.getDate() + i)
    d.setHours(0, 0, 0, 0)
    return d
  })
}

const isToday = (d: Date): boolean => {
  const now = new Date()
  return (
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  )
}

const isPast = (d: Date): boolean => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return d < today
}

const getStatus = (robot: Robot, date: Date): Status => {
  if (isPast(date)) return 'completed'
  if (!isToday(date)) return 'pending'

  const now = new Date()
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const start = toMin(robot.startTime)
  const end = toMin(robot.endTime)

  if (nowMin >= start && nowMin <= end) return 'running'
  if (nowMin > end) return 'completed'
  return 'pending'
}

const layoutRobots = (robots: Robot[], hourHeight: number, date: Date): LayoutItem[] => {
  if (!robots.length) return []

  const items = robots
    .map(r => ({
      robot: r,
      status: getStatus(r, date),
      start: toMin(r.startTime),
      end: Math.max(toMin(r.endTime), toMin(r.startTime) + 15),
      col: 0,
      totalCols: 1,
      top: (toMin(r.startTime) / 60) * hourHeight,
      height: Math.max(
        ((toMin(r.endTime) - toMin(r.startTime)) / 60) * hourHeight,
        28,
      ),
    }))
    .sort((a, b) => a.start - b.start)

  const colEnds: number[] = []
  for (const item of items) {
    let c = colEnds.findIndex(e => item.start >= e)
    if (c === -1) {
      c = colEnds.length
      colEnds.push(item.end)
    } else {
      colEnds[c] = item.end
    }
    item.col = c
  }

  for (const item of items) {
    const overlapping = items.filter(o => o.start < item.end && o.end > item.start)
    item.totalCols = Math.max(...overlapping.map(o => o.col)) + 1
  }

  return items
}

const formatDuration = (startTime: string, endTime: string): string => {
  const mins = toMin(endTime) - toMin(startTime)
  if (mins <= 0) return '—'
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h > 0 && m > 0) return `${h}h ${m}min`
  if (h > 0) return `${h}h`
  return `${m}min`
}

// ─── RobotCard ───────────────────────────────────────────────────────────────

interface RobotCardProps {
  item: LayoutItem
  dayWidth: number
  onEnter: (e: React.MouseEvent, robot: Robot, status: Status) => void
  onLeave: () => void
}

function RobotCard({ item, dayWidth, onEnter, onLeave }: RobotCardProps) {
  const { robot, status, col, totalCols, top, height } = item
  const cfg = STATUS_CONFIG[status]
  const slotW = dayWidth / totalCols
  const cardLeft = col * slotW + 4
  const cardWidth = slotW - 8

  return (
    <div
      className="absolute rounded-lg overflow-hidden cursor-pointer select-none transition-all duration-150 hover:brightness-125"
      style={{
        top,
        height,
        left: cardLeft,
        width: cardWidth,
        backgroundColor: cfg.bgColor,
        borderLeft: `3px solid ${cfg.borderColor}`,
        zIndex: 10 + col,
        boxShadow: status === 'running'
          ? `0 0 12px rgba(34,197,94,0.25), inset 0 0 0 1px ${cfg.borderColor}22`
          : undefined,
      }}
      onMouseEnter={e => onEnter(e, robot, status)}
      onMouseLeave={onLeave}
    >
      <div className="h-full px-2 py-1.5 flex flex-col gap-0.5 overflow-hidden">
        {/* Name row */}
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: robot.color }}
          />
          <span
            className="text-xs font-semibold leading-tight truncate"
            style={{ color: cfg.textColor }}
          >
            {robot.name}
          </span>
        </div>

        {/* Status badge */}
        {height > 38 && (
          <div className="flex items-center gap-1.5 mt-auto">
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{
                backgroundColor: cfg.dotColor,
                boxShadow: status === 'running' ? `0 0 5px ${cfg.dotColor}` : 'none',
              }}
            />
            <span className="text-[10px] leading-none" style={{ color: cfg.dotColor }}>
              {cfg.label}
            </span>
            {robot.manual && (
              <span className="ml-auto text-[9px] px-1 py-0.5 rounded bg-yellow-900/40 text-yellow-400 leading-none">
                M
              </span>
            )}
          </div>
        )}

        {/* Time */}
        {height > 56 && (
          <div className="text-[10px] text-gray-500 leading-none">
            {robot.startTime} – {robot.endTime}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Tooltip ─────────────────────────────────────────────────────────────────

function Tooltip({ data }: { data: TooltipData }) {
  const cfg = STATUS_CONFIG[data.status]
  const { robot } = data

  const safeX = typeof window !== 'undefined'
    ? Math.min(data.x + 16, window.innerWidth - 230)
    : data.x + 16

  return (
    <div
      className="fixed z-[200] pointer-events-none"
      style={{ left: safeX, top: data.y, transform: 'translateY(-40%)' }}
    >
      <div
        className="rounded-xl shadow-2xl border p-3.5 w-52"
        style={{ backgroundColor: '#0c1222', borderColor: '#1e2d45' }}
      >
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <span
            className="w-3 h-3 rounded-full shrink-0"
            style={{ backgroundColor: robot.color }}
          />
          <span className="text-white font-semibold text-sm leading-tight truncate">
            {robot.name}
          </span>
        </div>

        {/* Status */}
        <div className="flex items-center gap-2 mb-3">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{
              backgroundColor: cfg.dotColor,
              boxShadow: data.status === 'running' ? `0 0 6px ${cfg.dotColor}` : 'none',
            }}
          />
          <span className="text-xs font-medium" style={{ color: cfg.dotColor }}>
            {cfg.label}
          </span>
        </div>

        {/* Details */}
        <div className="space-y-1.5 text-xs border-t pt-2.5" style={{ borderColor: '#1e2d45' }}>
          <Row label="Início" value={robot.startTime} />
          <Row label="Fim" value={robot.endTime} />
          <Row label="Duração" value={formatDuration(robot.startTime, robot.endTime)} />
          <Row
            label="Modo"
            value={robot.manual ? 'Manual' : 'Automático'}
            valueClass={robot.manual ? 'text-yellow-400' : 'text-green-400'}
          />
        </div>

        {/* Description */}
        {robot.description && (
          <div
            className="mt-2.5 pt-2.5 text-[11px] text-gray-400 leading-relaxed border-t"
            style={{ borderColor: '#1e2d45' }}
          >
            {robot.description}
          </div>
        )}
      </div>
    </div>
  )
}

function Row({
  label,
  value,
  valueClass = 'text-gray-200',
}: {
  label: string
  value: string
  valueClass?: string
}) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-gray-500">{label}</span>
      <span className={valueClass}>{value}</span>
    </div>
  )
}

// ─── Current time indicator ───────────────────────────────────────────────────

function CurrentTimeIndicator({ top, dayWidth }: { top: number; dayWidth: number }) {
  return (
    <div
      className="absolute left-0 z-20 pointer-events-none"
      style={{ top, width: dayWidth }}
    >
      <div
        className="w-full"
        style={{
          borderTop: '2px solid #ef4444',
          boxShadow: '0 0 10px rgba(239,68,68,0.5)',
        }}
      />
      <div
        className="absolute rounded-full bg-red-500"
        style={{
          left: -5,
          top: -5,
          width: 10,
          height: 10,
          boxShadow: '0 0 8px 2px rgba(239,68,68,0.7)',
        }}
      />
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function TimelinePage() {
  const [robots, setRobots] = useState<Robot[]>([])
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(new Date())
  const [zoomIdx, setZoomIdx] = useState(1)
  const [tooltip, setTooltip] = useState<TooltipData | null>(null)
  const [dayWidth, setDayWidth] = useState(240)

  const scrollRef = useRef<HTMLDivElement>(null)
  const initialScrolled = useRef(false)
  const days = getDays()
  const hourHeight = ZOOM_LEVELS[zoomIdx]
  const totalTimeHeight = 24 * hourHeight
  const totalWidth = TIME_COL_WIDTH + DAYS_COUNT * dayWidth
  const nowTop = ((now.getHours() * 60 + now.getMinutes()) / 60) * hourHeight

  // Responsive day width
  useEffect(() => {
    const update = () => {
      const available = window.innerWidth - TIME_COL_WIDTH
      setDayWidth(Math.max(DAY_MIN_WIDTH, Math.floor(available / DAYS_COUNT)))
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  // Fetch robots
  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await axios.get('/api/robots')
        setRobots(data)
      } catch (err) {
        console.error('Erro ao buscar robôs:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Tick clock every minute
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(timer)
  }, [])

  // Scroll to current time + today column on first load
  useEffect(() => {
    if (!loading && scrollRef.current && !initialScrolled.current) {
      initialScrolled.current = true
      const todayIdx = days.findIndex(d => isToday(d))
      const nowMin = now.getHours() * 60 + now.getMinutes()
      scrollRef.current.scrollLeft = Math.max(0, todayIdx * dayWidth - 40)
      scrollRef.current.scrollTop = Math.max(0, (nowMin / 60) * hourHeight - 200)
    }
  }, [loading, dayWidth])

  const handleTooltipShow = useCallback(
    (e: React.MouseEvent, robot: Robot, status: Status) => {
      setTooltip({ robot, status, x: e.clientX, y: e.clientY })
    },
    [],
  )
  const handleTooltipHide = useCallback(() => setTooltip(null), [])
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setTooltip(prev => (prev ? { ...prev, x: e.clientX, y: e.clientY } : null))
  }, [])

  const refresh = async () => {
    setLoading(true)
    try {
      const { data } = await axios.get('/api/robots')
      setRobots(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const runningCount = robots.filter(r => {
    const today = days.find(d => isToday(d))
    if (!today || r.day !== today.getDate()) return false
    const nowMin = now.getHours() * 60 + now.getMinutes()
    return nowMin >= toMin(r.startTime) && nowMin <= toMin(r.endTime)
  }).length

  return (
    <>
      <Head>
        <title>Timeline – Controle RPA</title>
      </Head>

      <div
        className="flex flex-col bg-gray-950 text-white"
        style={{ height: '100dvh', overflow: 'hidden' }}
        onMouseMove={handleMouseMove}
      >
        {/* ── Navbar ── */}
        <nav
          className="shrink-0 flex items-center justify-between px-4 border-b border-gray-800"
          style={{ height: 48, backgroundColor: '#0a0f1a' }}
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Activity size={15} className="text-blue-400" />
              <span className="text-sm font-semibold tracking-wide">Timeline de Robôs</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Live clock */}
            <div className="flex items-center gap-1.5 text-xs text-gray-500 pr-3 mr-1 border-r border-gray-800">
              <Clock size={12} className="text-red-400" />
              <span className="tabular-nums">
                {now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            {/* Zoom controls */}
            <button
              onClick={() => setZoomIdx(i => Math.max(0, i - 1))}
              disabled={zoomIdx === 0}
              className="p-1.5 rounded hover:bg-gray-800 text-gray-400 hover:text-white disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
              title="Reduzir zoom"
            >
              <ZoomOut size={14} />
            </button>
            <span className="text-[11px] text-gray-600 w-10 text-center tabular-nums">
              {hourHeight}px
            </span>
            <button
              onClick={() => setZoomIdx(i => Math.min(ZOOM_LEVELS.length - 1, i + 1))}
              disabled={zoomIdx === ZOOM_LEVELS.length - 1}
              className="p-1.5 rounded hover:bg-gray-800 text-gray-400 hover:text-white disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
              title="Aumentar zoom"
            >
              <ZoomIn size={14} />
            </button>

            <div className="w-px h-4 bg-gray-800 mx-2" />

            <button
              onClick={refresh}
              disabled={loading}
              className="p-1.5 rounded hover:bg-gray-800 text-gray-400 hover:text-white disabled:opacity-25 transition-colors"
              title="Atualizar"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>

            <Link
              href="/robots"
              className="ml-2 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-500 rounded-md transition-colors"
            >
              <Settings size={11} />
              Gerenciar
            </Link>
          </div>
        </nav>

        {/* ── Status legend bar ── */}
        <div
          className="shrink-0 flex items-center gap-5 px-4 border-b border-gray-800 text-xs"
          style={{ height: 36, backgroundColor: '#080d18' }}
        >
          {(Object.entries(STATUS_CONFIG) as [Status, typeof STATUS_CONFIG[Status]][]).map(
            ([key, cfg]) => (
              <div key={key} className="flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: cfg.dotColor,
                    boxShadow: key === 'running' ? `0 0 6px ${cfg.dotColor}` : 'none',
                  }}
                />
                <span className="text-gray-400">{cfg.label}</span>
              </div>
            ),
          )}
          <div className="flex items-center gap-1.5 pl-4 border-l border-gray-800">
            <span
              className="block rounded-full bg-red-500"
              style={{ width: 6, height: 6, boxShadow: '0 0 6px rgba(239,68,68,0.8)' }}
            />
            <span className="text-gray-400">Agora</span>
          </div>
          <div className="ml-auto flex items-center gap-3 text-gray-600">
            {runningCount > 0 && (
              <span className="text-green-400 font-medium">
                {runningCount} executando agora
              </span>
            )}
            <span>{robots.length} robô{robots.length !== 1 ? 's' : ''} cadastrado{robots.length !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* ── Timeline ── */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-gray-500">Carregando robôs...</span>
            </div>
          </div>
        ) : (
          <div
            ref={scrollRef}
            className="flex-1 overflow-auto"
            style={{ scrollbarColor: '#1f2937 #030712', scrollbarWidth: 'thin' }}
          >
            {/* ── Total canvas ── */}
            <div style={{ width: totalWidth, height: HEADER_HEIGHT + totalTimeHeight }}>

              {/* ── Day headers (sticky top) ── */}
              <div
                className="sticky top-0 z-30 flex"
                style={{ height: HEADER_HEIGHT, width: totalWidth, backgroundColor: '#080d18' }}
              >
                {/* Corner cell */}
                <div
                  className="sticky left-0 z-40 flex items-end justify-center pb-2 border-b border-r border-gray-800 shrink-0"
                  style={{ width: TIME_COL_WIDTH, backgroundColor: '#080d18' }}
                >
                  <span className="text-[10px] text-gray-700 uppercase tracking-widest">Hora</span>
                </div>

                {/* Day columns */}
                {days.map((day, i) => {
                  const today = isToday(day)
                  const past = isPast(day)
                  const dayRobotCount = robots.filter(r => r.day === day.getDate()).length
                  return (
                    <div
                      key={i}
                      className="shrink-0 flex flex-col items-center justify-center gap-1 border-b border-l border-gray-800 relative"
                      style={{
                        width: dayWidth,
                        backgroundColor: today
                          ? 'rgba(37,99,235,0.07)'
                          : past
                          ? '#040810'
                          : '#080d18',
                      }}
                    >
                      {today && (
                        <div
                          className="absolute inset-x-0 bottom-0 h-0.5 bg-blue-500"
                          style={{ boxShadow: '0 0 8px rgba(59,130,246,0.6)' }}
                        />
                      )}
                      <span
                        className={`text-[10px] uppercase tracking-widest font-medium ${
                          past ? 'text-gray-700' : today ? 'text-blue-400' : 'text-gray-600'
                        }`}
                      >
                        {DAY_NAMES[day.getDay()]}
                      </span>
                      <div className="flex items-baseline gap-1">
                        <span
                          className={`text-2xl font-bold tabular-nums leading-none ${
                            past ? 'text-gray-700' : today ? 'text-white' : 'text-gray-300'
                          }`}
                          style={
                            today ? { textShadow: '0 0 20px rgba(59,130,246,0.6)' } : undefined
                          }
                        >
                          {String(day.getDate()).padStart(2, '0')}
                        </span>
                        <span
                          className={`text-xs ${
                            past ? 'text-gray-700' : today ? 'text-blue-400' : 'text-gray-600'
                          }`}
                        >
                          {MONTH_NAMES[day.getMonth()]}
                        </span>
                      </div>
                      {today ? (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-600 text-white font-bold tracking-wider uppercase">
                          Hoje
                        </span>
                      ) : dayRobotCount > 0 ? (
                        <span className="text-[9px] text-gray-600">
                          {dayRobotCount} robô{dayRobotCount !== 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span className="text-[9px] text-gray-800">—</span>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* ── Body ── */}
              <div className="flex" style={{ height: totalTimeHeight, width: totalWidth }}>

                {/* ── Hour labels (sticky left) ── */}
                <div
                  className="sticky left-0 z-20 shrink-0 border-r border-gray-800"
                  style={{ width: TIME_COL_WIDTH, height: totalTimeHeight, backgroundColor: '#080d18' }}
                >
                  {HOURS.map(h => (
                    <div
                      key={h}
                      className="absolute flex items-start justify-end pr-3"
                      style={{ top: h * hourHeight, height: hourHeight, width: TIME_COL_WIDTH }}
                    >
                      <span className="text-[11px] text-gray-600 leading-none -translate-y-2 tabular-nums">
                        {String(h).padStart(2, '0')}:00
                      </span>
                    </div>
                  ))}
                </div>

                {/* ── Day columns ── */}
                {days.map((day, dayIdx) => {
                  const today = isToday(day)
                  const past = isPast(day)
                  const dayRobots = robots.filter(r => r.day === day.getDate())
                  const laidOut = layoutRobots(dayRobots, hourHeight, day)

                  return (
                    <div
                      key={dayIdx}
                      className="shrink-0 relative border-l border-gray-800"
                      style={{
                        width: dayWidth,
                        height: totalTimeHeight,
                        backgroundColor: today
                          ? 'rgba(23,37,84,0.06)'
                          : past
                          ? 'rgba(0,0,0,0.15)'
                          : 'transparent',
                      }}
                    >
                      {/* Hour grid lines */}
                      {HOURS.map(h => (
                        <div
                          key={h}
                          className="absolute left-0 right-0"
                          style={{
                            top: h * hourHeight,
                            borderTop:
                              h === 0
                                ? 'none'
                                : `1px solid ${
                                    h % 6 === 0
                                      ? 'rgba(55,65,81,0.55)'
                                      : 'rgba(31,41,55,0.7)'
                                  }`,
                          }}
                        />
                      ))}

                      {/* 30-min dashed lines when zoomed in enough */}
                      {hourHeight >= 80 &&
                        HOURS.map(h => (
                          <div
                            key={`${h}-half`}
                            className="absolute left-0 right-0"
                            style={{
                              top: h * hourHeight + hourHeight / 2,
                              borderTop: '1px dashed rgba(31,41,55,0.55)',
                            }}
                          />
                        ))}

                      {/* Subtle today column highlight */}
                      {today && (
                        <div
                          className="absolute inset-0 pointer-events-none"
                          style={{
                            background:
                              'linear-gradient(to right, rgba(37,99,235,0.04) 0%, transparent 100%)',
                          }}
                        />
                      )}

                      {/* Past overlay */}
                      {past && (
                        <div
                          className="absolute inset-0 pointer-events-none"
                          style={{ backgroundColor: 'rgba(0,0,0,0.18)' }}
                        />
                      )}

                      {/* Robot cards */}
                      {laidOut.map((item, idx) => (
                        <RobotCard
                          key={`${item.robot.id}-${idx}`}
                          item={item}
                          dayWidth={dayWidth}
                          onEnter={handleTooltipShow}
                          onLeave={handleTooltipHide}
                        />
                      ))}

                      {/* Current time indicator */}
                      {today && (
                        <CurrentTimeIndicator top={nowTop} dayWidth={dayWidth} />
                      )}

                      {/* Empty day hint */}
                      {laidOut.length === 0 && !past && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100">
                          <span className="text-xs text-gray-800">Sem agendamentos</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {tooltip && <Tooltip data={tooltip} />}
    </>
  )
}
