import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Award, TrendingUp, Users, ChevronDown, ChevronUp, BarChart3, Eye, Filter, X, Lock } from 'lucide-react'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import type { Evaluation } from '@/hooks/use-evaluations'
import type { InternProfile } from '@/hooks/use-profiles'
import { useBatches } from '@/hooks/use-batches'

// ─── Constants ────────────────────────────────────────────────────────────────

const rankingConfig: Record<string, {
  bg: string; text: string; border: string; dot: string; bar: string; order: number
}> = {
  'Xuất sắc':   { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500', bar: 'bg-purple-500', order: 5 },
  'Giỏi':       { bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200',  dot: 'bg-green-500',  bar: 'bg-green-500',  order: 4 },
  'Khá':        { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200',   dot: 'bg-blue-500',   bar: 'bg-blue-500',   order: 3 },
  'Trung bình': { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', dot: 'bg-yellow-500', bar: 'bg-yellow-400', order: 2 },
  'Yếu':        { bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200',    dot: 'bg-red-500',    bar: 'bg-red-500',    order: 1 },
}

const criteriaLabels: Record<string, string> = {
  attitude:    'Thái độ',
  discipline:  'Kỷ luật',
  learning:    'Học hỏi',
  skills:      'Kỹ năng',
  task_result: 'Kết quả',
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ScoreBar({ value, max = 10, color }: { value: number; max?: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-500`}
          style={{ width: `${(value / max) * 100}%` }} />
      </div>
      <span className="text-xs font-semibold text-gray-700 w-6 text-right">{value}</span>
    </div>
  )
}

function RadarChart({ scores, color = '#1e56b0' }: { scores: { [key: string]: number }; color?: string }) {
  const keys   = ['attitude', 'discipline', 'learning', 'skills', 'task_result']
  const labels = ['Thái độ', 'Kỷ luật', 'Học hỏi', 'Kỹ năng', 'Kết quả']
  const cx = 110, cy = 110, r = 80, max = 10
  const angles = keys.map((_, i) => (Math.PI * 2 * i) / keys.length - Math.PI / 2)
  const point  = (i: number, val: number) => ({
    x: cx + r * (val / max) * Math.cos(angles[i]),
    y: cy + r * (val / max) * Math.sin(angles[i]),
  })
  const gridLevels  = [2, 4, 6, 8, 10]
  const dataPoints  = keys.map((k, i) => point(i, scores[k] ?? 0))
  const polyPath    = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + 'Z'

  return (
    <svg viewBox="0 0 220 220" className="w-full max-w-[200px] mx-auto">
      {gridLevels.map(level => {
        const pts  = angles.map(a => ({ x: cx + r * (level / max) * Math.cos(a), y: cy + r * (level / max) * Math.sin(a) }))
        const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + 'Z'
        return <path key={level} d={path} fill="none" stroke="#e5e7eb" strokeWidth="1" />
      })}
      {angles.map((a, i) => (
        <line key={i} x1={cx} y1={cy} x2={cx + r * Math.cos(a)} y2={cy + r * Math.sin(a)} stroke="#e5e7eb" strokeWidth="1" />
      ))}
      <path d={polyPath} fill={color} fillOpacity="0.15" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      {dataPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3.5" fill={color} stroke="white" strokeWidth="1.5" />
      ))}
      {angles.map((a, i) => {
        const lx = cx + (r + 20) * Math.cos(a)
        const ly = cy + (r + 20) * Math.sin(a)
        return <text key={i} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fontSize="9" fontWeight="600" fill="#6b7280">{labels[i]}</text>
      })}
      <text x={cx} y={cy - 6} textAnchor="middle" fontSize="16" fontWeight="800" fill={color}>
        {Object.values(scores).length
          ? (Object.values(scores).reduce((a, b) => a + b, 0) / Object.values(scores).length).toFixed(1)
          : '—'}
      </text>
      <text x={cx} y={cy + 10} textAnchor="middle" fontSize="8" fill="#9ca3af">điểm TB</text>
    </svg>
  )
}

function EvaluationRow({ ev, onEdit }: { ev: Evaluation; onEdit?: (ev: Evaluation) => void }) {
  const [expanded, setExpanded] = useState(false)
  const cfg    = rankingConfig[ev.ranking] || rankingConfig['Trung bình']
  const scores = ev.criteria_scores

  return (
    <>
      <tr className="border-b border-gray-100 hover:bg-gray-50/60 cursor-pointer transition-colors"
        onClick={() => setExpanded(e => !e)}>
        <td className="py-3 pr-4">
          <div className="flex items-center gap-2.5">
            <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
            <span className="font-medium text-sm text-gray-800">{ev.intern_name}</span>
          </div>
        </td>
        <td className="py-3 pr-4">
          <div className="space-y-1 min-w-[140px]">
            {Object.entries(scores).map(([k, v]) => (
              <ScoreBar key={k} value={v} color={cfg.bar} />
            ))}
          </div>
        </td>
        <td className="py-3 pr-4 text-center">
          <div className={`inline-flex flex-col items-center justify-center w-12 h-12 rounded-xl border-2 ${cfg.border} ${cfg.bg}`}>
            <span className={`text-lg font-extrabold leading-none ${cfg.text}`}>{ev.total_score}</span>
            <span className={`text-[9px] font-medium ${cfg.text} opacity-70`}>/10</span>
          </div>
        </td>
        <td className="py-3 pr-4">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {ev.ranking}
          </span>
        </td>
        <td className="py-3 pr-4 text-xs text-muted-foreground whitespace-nowrap">
          {format(new Date(ev.created_at), 'dd/MM/yyyy', { locale: vi })}
        </td>
        <td className="py-3 text-right">
          <div className="flex items-center justify-end gap-2">
            {onEdit && (
              <Button size="sm" variant="outline" className="h-7 text-xs px-2"
                onClick={e => { e.stopPropagation(); onEdit(ev) }}>Sửa</Button>
            )}
            {expanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
          </div>
        </td>
      </tr>

      {expanded && (
        <tr className="border-b border-gray-100">
          <td colSpan={6} className="px-4 pb-4 pt-1">
            <div className={`rounded-xl border ${cfg.border} ${cfg.bg} p-4`}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="flex flex-col items-center">
                  <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">Biểu đồ năng lực</p>
                  <RadarChart scores={{ ...scores }} color={
                    ev.ranking === 'Xuất sắc' ? '#9333ea'
                    : ev.ranking === 'Giỏi'   ? '#16a34a'
                    : ev.ranking === 'Khá'    ? '#1e56b0'
                    : ev.ranking === 'Trung bình' ? '#ca8a04'
                    : '#dc2626'
                  } />
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">Điểm chi tiết</p>
                    <div className="space-y-2">
                      {Object.entries(scores).map(([k, v]) => (
                        <div key={k} className="flex items-center gap-3">
                          <span className="text-xs text-gray-600 w-24 shrink-0">{criteriaLabels[k]}</span>
                          <div className="flex-1 h-2 bg-white/80 rounded-full overflow-hidden border border-gray-200">
                            <div className={`h-full rounded-full ${cfg.bar} transition-all duration-500`}
                              style={{ width: `${(v / 10) * 100}%` }} />
                          </div>
                          <span className="text-xs font-bold text-gray-700 w-6 text-right">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {ev.final_comment && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Nhận xét tổng quát</p>
                      <p className={`text-sm ${cfg.text} leading-relaxed bg-white/70 rounded-lg p-3 border ${cfg.border}`}>
                        "{ev.final_comment}"
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

interface EvaluationsTabProps {
  evaluations: Evaluation[]
  isLoading: boolean
  interns: InternProfile[]
  onEvaluate: (intern: InternProfile) => void
}

export default function EvaluationsTab({ evaluations, isLoading, interns, onEvaluate }: EvaluationsTabProps) {
  const { data: batches = [] } = useBatches()

  const [filterBatch,   setFilterBatch]   = useState('all')
  const [filterRanking, setFilterRanking] = useState('all')

  // ✅ Helper kiểm tra đợt của TTS có còn mở không
  const isBatchOpen = (batchId: number) => {
    const batch = batches.find((b: any) => b.id === batchId)
    return batch?.status === 'open'
  }

  const filteredEvaluations = useMemo(() => {
    return evaluations.filter(ev => {
      const intern   = interns.find(i => i.user_id === ev.intern_id)
      const batchId  = intern?.batch_id
      const matchBatch   = filterBatch === 'all' || String(batchId) === filterBatch
      const matchRanking = filterRanking === 'all' || ev.ranking === filterRanking
      return matchBatch && matchRanking
    })
  }, [evaluations, interns, filterBatch, filterRanking])

  // ✅ TTS chưa đánh giá — CHỈ hiện TTS thuộc đợt còn MỞ
  const notEvaluated = useMemo(() => {
    return interns.filter(i => {
      const hasEval    = !!evaluations.find(e => e.intern_id === i.user_id)
      const matchBatch = filterBatch === 'all' || String(i.batch_id) === filterBatch
      const batchOpen  = isBatchOpen(i.batch_id)   // ← chỉ đợt open mới cần đánh giá
      return !hasEval && matchBatch && batchOpen
    })
  }, [interns, evaluations, filterBatch, batches])

  const stats = useMemo(() => {
    if (!filteredEvaluations.length) return null
    const total    = filteredEvaluations.length
    const avgScore = filteredEvaluations.reduce((s, e) => s + e.total_score, 0) / total
    const rankCount: Record<string, number> = {}
    filteredEvaluations.forEach(e => { rankCount[e.ranking] = (rankCount[e.ranking] || 0) + 1 })
    const topRanking = Object.entries(rankCount).sort((a, b) => b[1] - a[1])[0]?.[0] || ''
    const criteriaAvg: Record<string, number> = {}
    Object.keys(criteriaLabels).forEach(k => {
      criteriaAvg[k] = filteredEvaluations.reduce((s, e) => s + (e.criteria_scores[k as keyof typeof e.criteria_scores] ?? 0), 0) / total
    })
    const strongestCriteria = Object.entries(criteriaAvg).sort((a, b) => b[1] - a[1])[0]
    const weakestCriteria   = Object.entries(criteriaAvg).sort((a, b) => a[1] - b[1])[0]
    return { total, avgScore, rankCount, topRanking, criteriaAvg, strongestCriteria, weakestCriteria }
  }, [filteredEvaluations])

  const activeFilterCount = [filterBatch, filterRanking].filter(v => v !== 'all').length
  const resetFilters = () => { setFilterBatch('all'); setFilterRanking('all') }

  if (isLoading) return (
    <Card className="border-0 shadow-sm ring-1 ring-gray-200">
      <CardContent className="py-16 text-center text-muted-foreground">Đang tải...</CardContent>
    </Card>
  )

  return (
    <div className="space-y-5">

      {/* Filter bar */}
      <Card className="border-0 shadow-sm ring-1 ring-gray-200">
        <CardContent className="py-3 px-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Filter className="h-3.5 w-3.5" />
              <span className="font-medium">Lọc:</span>
            </div>

            <Select value={filterBatch} onValueChange={setFilterBatch}>
              <SelectTrigger className={`h-8 text-xs w-[190px] ${filterBatch !== 'all' ? 'border-blue-500 text-blue-700 bg-blue-50' : ''}`}>
                <SelectValue placeholder="Tất cả đợt" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả đợt</SelectItem>
                {batches.map((b: any) => (
                  <SelectItem key={b.id} value={String(b.id)}>
                    <span className="flex items-center gap-1.5">
                      {b.batch_name}
                      {/* ✅ Hiện rõ trạng thái đợt trong dropdown */}
                      {b.status === 'open'
                        ? <span className="text-green-500 text-[10px]">● Đang mở</span>
                        : <span className="text-gray-400 text-[10px]">● Đã đóng</span>
                      }
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterRanking} onValueChange={setFilterRanking}>
              <SelectTrigger className={`h-8 text-xs w-[160px] ${filterRanking !== 'all' ? 'border-blue-500 text-blue-700 bg-blue-50' : ''}`}>
                <SelectValue placeholder="Tất cả xếp loại" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả xếp loại</SelectItem>
                {['Xuất sắc', 'Giỏi', 'Khá', 'Trung bình', 'Yếu'].map(r => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={resetFilters}
                className="h-8 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2">
                <X className="h-3.5 w-3.5 mr-1" />Xóa bộ lọc
                <span className="ml-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {activeFilterCount}
                </span>
              </Button>
            )}

            <span className="text-xs text-muted-foreground ml-auto">
              {filteredEvaluations.length}/{evaluations.length} đánh giá
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      {stats ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-0 shadow-sm ring-1 ring-gray-200 overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-[#0f2d6b] to-[#1e56b0]" />
            <CardContent className="p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Đã đánh giá</p>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-gray-800">{stats.total}</span>
                <span className="text-sm text-gray-400">/ {filterBatch === 'all' ? interns.length : interns.filter(i => String(i.batch_id) === filterBatch).length}</span>
              </div>
              <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-[#0f2d6b] rounded-full transition-all duration-700"
                  style={{ width: `${interns.length > 0 ? (stats.total / interns.length) * 100 : 0}%` }} />
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm ring-1 ring-gray-200 overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-purple-500 to-purple-700" />
            <CardContent className="p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Điểm trung bình</p>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-gray-800">{stats.avgScore.toFixed(1)}</span>
                <span className="text-sm text-gray-400">/10</span>
              </div>
              <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-purple-500 rounded-full" style={{ width: `${(stats.avgScore / 10) * 100}%` }} />
              </div>
              <p className="text-[11px] text-gray-400 mt-1">Phổ biến: <span className="font-semibold">{stats.topRanking}</span></p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm ring-1 ring-gray-200 overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-emerald-500 to-emerald-700" />
            <CardContent className="p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Điểm mạnh nhất</p>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-gray-800">{stats.strongestCriteria[1].toFixed(1)}</span>
                <span className="text-sm text-gray-400">/10</span>
              </div>
              <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(stats.strongestCriteria[1] / 10) * 100}%` }} />
              </div>
              <p className="text-[11px] text-gray-400 mt-1">{criteriaLabels[stats.strongestCriteria[0]]}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm ring-1 ring-gray-200 overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-orange-400 to-orange-600" />
            <CardContent className="p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Cần cải thiện</p>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-gray-800">{stats.weakestCriteria[1].toFixed(1)}</span>
                <span className="text-sm text-gray-400">/10</span>
              </div>
              <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-orange-400 rounded-full" style={{ width: `${(stats.weakestCriteria[1] / 10) * 100}%` }} />
              </div>
              <p className="text-[11px] text-gray-400 mt-1">{criteriaLabels[stats.weakestCriteria[0]]}</p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Phân bố xếp loại */}
        {stats && (
          <Card className="border-0 shadow-sm ring-1 ring-gray-200">
            <CardHeader className="pb-2 border-b border-gray-100">
              <CardTitle className="text-sm flex items-center gap-2 text-gray-700">
                <BarChart3 className="h-4 w-4 text-[#0f2d6b]" />Phân bố xếp loại
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              {['Xuất sắc', 'Giỏi', 'Khá', 'Trung bình', 'Yếu'].map(rank => {
                const count = stats.rankCount[rank] || 0
                const pct   = stats.total > 0 ? (count / stats.total) * 100 : 0
                const cfg   = rankingConfig[rank]
                return (
                  <div key={rank} className="flex items-center gap-3">
                    <span className="text-xs text-gray-600 w-20 shrink-0">{rank}</span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${cfg.bar} transition-all duration-700`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs font-semibold text-gray-700 w-8 text-right">{count}</span>
                  </div>
                )
              })}
              <div className="pt-2 border-t border-gray-100">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Điểm TB các tiêu chí</p>
                {Object.entries(stats.criteriaAvg).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-3 mb-2">
                    <span className="text-xs text-gray-600 w-20 shrink-0">{criteriaLabels[k]}</span>
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[#1e56b0] rounded-full" style={{ width: `${(v / 10) * 100}%` }} />
                    </div>
                    <span className="text-xs font-semibold text-gray-700 w-8 text-right">{v.toFixed(1)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ✅ TTS chưa đánh giá — chỉ hiện đợt còn mở */}
        <Card className={`border-0 shadow-sm ring-1 ring-gray-200 ${stats ? '' : 'lg:col-span-3'}`}>
          <CardHeader className="pb-2 border-b border-gray-100">
            <CardTitle className="text-sm flex items-center gap-2 text-gray-700">
              <Users className="h-4 w-4 text-orange-500" />
              Chưa được đánh giá
              {notEvaluated.length > 0 && (
                <Badge className="bg-orange-100 text-orange-700 text-xs ml-1">{notEvaluated.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-3">
            {notEvaluated.length === 0 ? (
              <div className="py-6 text-center text-muted-foreground">
                <Award className="h-8 w-8 mx-auto mb-2 text-green-400" />
                <p className="text-sm font-medium text-green-600">Tất cả TTS đã được đánh giá!</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {notEvaluated.map(intern => (
                  <div key={intern.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50 hover:bg-orange-50 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{intern.user_full_name}</p>
                      <p className="text-xs text-gray-400">{intern.batch_name}</p>
                    </div>
                    {/* ✅ Nút đánh giá — chỉ hiện với đợt open */}
                    <Button size="sm" variant="outline"
                      className="h-7 text-xs border-orange-200 text-orange-600 hover:bg-orange-50"
                      onClick={() => onEvaluate(intern)}>
                      Đánh giá
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Radar tổng hợp */}
        {stats && filteredEvaluations.length > 0 && (
          <Card className="border-0 shadow-sm ring-1 ring-gray-200">
            <CardHeader className="pb-2 border-b border-gray-100">
              <CardTitle className="text-sm flex items-center gap-2 text-gray-700">
                <TrendingUp className="h-4 w-4 text-[#0f2d6b]" />Biểu đồ năng lực tổng hợp
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2 flex items-center justify-center">
              <RadarChart scores={stats.criteriaAvg} color="#1e56b0" />
            </CardContent>
          </Card>
        )}
      </div>

      {/* ✅ Bảng chi tiết — thêm nút "Xem" cho đợt đã đóng, "Sửa" cho đợt còn mở */}
      {filteredEvaluations.length > 0 && (
        <Card className="border-0 shadow-sm ring-1 ring-gray-200">
          <CardHeader className="border-b border-gray-100 bg-gray-50/60 rounded-t-xl">
            <CardTitle className="text-sm flex items-center gap-2 text-gray-700">
              <Eye className="h-4 w-4 text-[#0f2d6b]" />
              Chi tiết từng thực tập sinh
              <span className="text-xs text-gray-400 font-normal">— nhấn vào hàng để xem chi tiết</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Thực tập sinh', 'Điểm các tiêu chí', 'Tổng', 'Xếp loại', 'Ngày', ''].map((h, i) => (
                    <th key={i} className={`text-xs font-semibold text-muted-foreground border-b border-gray-100 ${i < 5 ? 'text-left py-3 px-4' : 'py-3 px-4'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredEvaluations
                  .slice()
                  .sort((a, b) => b.total_score - a.total_score)
                  .map(ev => {
                    const intern     = interns.find(i => i.user_id === ev.intern_id)
                    const batchOpen  = intern ? isBatchOpen(intern.batch_id) : false
                    return (
                      <EvaluationRow
                        key={ev.id}
                        ev={ev}
                        // ✅ Chỉ truyền onEdit nếu đợt còn mở, đợt đóng chỉ xem
                        onEdit={batchOpen ? () => {} : undefined}
                      />
                    )
                  })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {filteredEvaluations.length === 0 && !isLoading && (
        <Card className="border-0 shadow-sm ring-1 ring-gray-200">
          <CardContent className="py-16 text-center text-muted-foreground">
            <Award className="h-14 w-14 mx-auto mb-3 opacity-20" />
            <p className="font-medium">
              {activeFilterCount > 0 ? 'Không có đánh giá nào phù hợp' : 'Chưa có đánh giá nào'}
            </p>
            {activeFilterCount > 0 && (
              <Button variant="outline" size="sm" className="mt-3" onClick={resetFilters}>
                <X className="h-3.5 w-3.5 mr-1" />Xóa bộ lọc
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}