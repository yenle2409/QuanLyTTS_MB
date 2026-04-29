import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { useBatches } from '@/hooks/use-batches'
import { useEvaluations } from '@/hooks/use-evaluations'
import { useTasks } from '@/hooks/use-tasks'
import { useToast } from '@/hooks/use-toast'
import { useInternProfiles, DEPARTMENTS } from '@/hooks/use-profiles'
import {
  Download, Users, Award, TrendingUp, Calendar,
  CheckCircle, Star, BarChart3, FileSpreadsheet, Loader2, Building2,
} from 'lucide-react'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'

// ── Colors ─────────────────────────────────────────────────────
const RANKING_COLORS: Record<string, string> = {
  'Xuất sắc':   '#8b5cf6',
  'Giỏi':       '#22c55e',
  'Khá':        '#3b82f6',
  'Trung bình': '#f59e0b',
  'Yếu':        '#ef4444',
}

const STATUS_COLORS: Record<string, string> = {
  approved:       '#22c55e',
  submitted:      '#3b82f6',
  request_change: '#f97316',
  new:            '#94a3b8',
  overdue:        '#ef4444',
}

const STATUS_LABELS: Record<string, string> = {
  approved: 'Đã duyệt', submitted: 'Đã nộp',
  request_change: 'Cần sửa', new: 'Chưa nộp', overdue: 'Quá hạn',
}

// ── API Hooks ──────────────────────────────────────────────────
function useStatisticsOverview() {
  return useQuery({
    queryKey: ['statistics', 'overview'],
    queryFn: async () => (await api.get('/statistics/overview')).data,
  })
}

function useStatisticsByBatch() {
  return useQuery({
    queryKey: ['statistics', 'by-batch'],
    queryFn: async () => (await api.get('/statistics/by-batch')).data as Array<{
      batch_id: number; batch_name: string; status: string
      intern_count: number; total_tasks: number; approved_tasks: number
      task_completion_rate: number; evaluated_count: number; avg_score: number | null
      start_date: string; end_date: string
    }>,
  })
}

function useTaskCompletion() {
  return useQuery({
    queryKey: ['statistics', 'task-completion'],
    queryFn: async () => (await api.get('/statistics/task-completion')).data as Array<{
      intern_id: number; intern_name: string; batch_id: number; department?: string
      total_tasks: number; approved: number; submitted: number
      overdue: number; completion_rate: number
    }>,
  })
}

// ── Export ─────────────────────────────────────────────────────
function getFileNameFromContentDisposition(header: string | undefined, fallback: string) {
  if (!header) return fallback

  const utf8Match = header.match(/filename\*=UTF-8''([^;]+)/i)
  if (utf8Match?.[1]) return decodeURIComponent(utf8Match[1].replace(/"/g, ''))

  const normalMatch = header.match(/filename="?([^";]+)"?/i)
  if (normalMatch?.[1]) return normalMatch[1]

  return fallback
}

async function exportReport(type: 'excel' | 'pdf', batchId: string, department: string) {
  const p = new URLSearchParams()
  if (batchId    !== 'all') p.append('batch_id',   batchId)
  if (department !== 'all') p.append('department', department)

  const qs = p.toString() ? `?${p}` : ''
  const endpoint = type === 'excel'
    ? `/statistics/export-excel${qs}`
    : `/statistics/export-pdf${qs}`

  const ext  = type === 'excel' ? 'xlsx' : 'pdf'
  const mime = type === 'excel'
    ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    : 'application/pdf'

  const res = await api.get(endpoint, {
    responseType: 'blob',
    headers: { Accept: mime },
  })

  const blob = res.data instanceof Blob
    ? res.data
    : new Blob([res.data], { type: mime })

  if (!blob || blob.size === 0) {
    throw new Error('EMPTY_EXPORT_FILE')
  }

  const contentDisposition = res.headers?.['content-disposition'] as string | undefined
  const fallbackName = `bao-cao-thuc-tap-${new Date().toISOString().slice(0, 10)}.${ext}`
  const fileName = getFileNameFromContentDisposition(contentDisposition, fallbackName)

  const url = URL.createObjectURL(new Blob([blob], { type: blob.type || mime }))
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)

  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function exportToCSV(data: any[], filename: string) {
  if (!data.length) return
  const headers = Object.keys(data[0])
  const rows = data.map(row => headers.map(h => `"${row[h] ?? ''}"`).join(','))
  const csv = [headers.join(','), ...rows].join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

function getScoreColor(s: number) {
  if (s >= 9)   return 'text-purple-600'
  if (s >= 8)   return 'text-green-600'
  if (s >= 6.5) return 'text-blue-600'
  if (s >= 5)   return 'text-yellow-600'
  return 'text-red-600'
}

// ── Main ───────────────────────────────────────────────────────
export default function StatisticsTab() {
  const { toast } = useToast()
  const { data: overview,    isLoading: overviewLoading } = useStatisticsOverview()
  const { data: batchStats = [], isLoading: batchLoading } = useStatisticsByBatch()
  const { data: completionData = [] } = useTaskCompletion()
  const { data: evaluations = [] }    = useEvaluations()
  const { data: batches = [] }        = useBatches()
  const { data: tasks = [] }          = useTasks()
  const { data: allProfiles = [] }    = useInternProfiles()   // để lấy danh sách phòng ban

  const [batchFilter,  setBatchFilter]  = useState('all')
  const [deptFilter,   setDeptFilter]   = useState('all')     // ← mới
  const [section,      setSection]      = useState<'overview' | 'batch' | 'interns' | 'evaluation'>('overview')
  const [exporting,    setExporting]    = useState<'excel' | 'pdf' | null>(null)

  // Lấy danh sách phòng ban thực tế từ data (kết hợp với constant list)
  const availableDepts = useMemo(() => {
    const fromData = [...new Set(allProfiles.map(p => p.department).filter(Boolean) as string[])]
    const merged   = [...new Set([...fromData, ...DEPARTMENTS])].sort()
    return merged
  }, [allProfiles])

  const handleExport = async (type: 'excel' | 'pdf') => {
    setExporting(type)
    try {
      await exportReport(type, batchFilter, deptFilter)
    } catch {
      toast({ title: 'Lỗi', description: `Không xuất được ${type === 'excel' ? 'Excel' : 'PDF'}. Vui lòng thử lại.` })
    } finally {
      setExporting(null)
    }
  }

  // ── Filtered sets ──────────────────────────────────────────
  // intern_ids trong filter hiện tại (batch + dept)
  const filteredInternIds = useMemo(() => {
    let list = allProfiles
    if (batchFilter !== 'all') list = list.filter(p => String(p.batch_id) === batchFilter)
    if (deptFilter  !== 'all') list = list.filter(p => p.department === deptFilter)
    return new Set(list.map(p => p.user_id))
  }, [allProfiles, batchFilter, deptFilter])

  const filteredCompletion = useMemo(() =>
    completionData.filter((c: any) => {
      const batchOk = batchFilter === 'all' || String(c.batch_id) === batchFilter
      const deptOk  = deptFilter  === 'all' || filteredInternIds.has(c.intern_id)
      return batchOk && deptOk
    }),
    [completionData, batchFilter, deptFilter, filteredInternIds]
  )

  const filteredEvaluations = useMemo(() =>
    evaluations.filter(e => {
      const deptOk = deptFilter === 'all' || filteredInternIds.has(e.intern_id)
      if (!deptOk) return false
      if (batchFilter === 'all') return true
      const intern = completionData.find((c: any) => c.intern_id === e.intern_id)
      return intern ? String(intern.batch_id) === batchFilter : true
    }),
    [evaluations, completionData, batchFilter, deptFilter, filteredInternIds]
  )

  // ── Charts ─────────────────────────────────────────────────
  const taskStatusChartData = useMemo(() =>
    Object.entries(STATUS_LABELS).map(([key, label]) => ({
      name: label, value: tasks.filter(t => t.status === key).length, fill: STATUS_COLORS[key],
    })).filter(d => d.value > 0),
    [tasks]
  )

  const rankingChartData = useMemo(() =>
    Object.entries(RANKING_COLORS).map(([ranking, color]) => ({
      name: ranking, value: filteredEvaluations.filter(e => e.ranking === ranking).length, fill: color,
    })).filter(d => d.value > 0),
    [filteredEvaluations]
  )

  const batchComparisonData = useMemo(() =>
    batchStats.map(b => ({
      name: b.batch_name.length > 12 ? b.batch_name.slice(0, 12) + '…' : b.batch_name,
      'TTS': b.intern_count, 'Tổng NV': b.total_tasks,
      'Hoàn thành': b.approved_tasks, 'Tỷ lệ (%)': b.task_completion_rate,
    })),
    [batchStats]
  )

  const topInterns = useMemo(() =>
    [...filteredCompletion].sort((a: any, b: any) => b.completion_rate - a.completion_rate).slice(0, 10),
    [filteredCompletion]
  )

  const avgCriteriaData = useMemo(() => {
    if (!filteredEvaluations.length) return []
    const keys = ['attitude', 'discipline', 'learning', 'skills', 'task_result']
    const labels: Record<string, string> = {
      attitude: 'Thái độ', discipline: 'Kỷ luật', learning: 'Học hỏi',
      skills: 'Kỹ năng', task_result: 'Kết quả',
    }
    return keys.map(k => ({
      subject: labels[k],
      score: Math.round(
        filteredEvaluations.reduce((sum, e) => sum + ((e.criteria_scores as any)?.[k] ?? 0), 0)
        / filteredEvaluations.length * 10
      ) / 10,
    }))
  }, [filteredEvaluations])

  // Active filters badge
  const activeFilters = [
    batchFilter !== 'all' && batches.find(b => String(b.id) === batchFilter)?.batch_name,
    deptFilter  !== 'all' && deptFilter,
  ].filter(Boolean) as string[]

  if (overviewLoading || batchLoading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Đang tải thống kê...</div>
  }

  return (
    <div className="space-y-5">

      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Section tabs */}
        <div className="flex gap-2 flex-wrap">
          {([
            { key: 'overview',   label: 'Tổng quan', icon: <BarChart3 className="h-4 w-4" /> },
            { key: 'batch',      label: 'Theo đợt',  icon: <Calendar className="h-4 w-4" /> },
            { key: 'interns',    label: 'TTS',        icon: <Users className="h-4 w-4" /> },
            { key: 'evaluation', label: 'Đánh giá',  icon: <Award className="h-4 w-4" /> },
          ] as const).map(s => (
            <Button key={s.key} size="sm"
              variant={section === s.key ? 'default' : 'outline'}
              onClick={() => setSection(s.key)}
              className="gap-1.5"
            >
              {s.icon}{s.label}
            </Button>
          ))}
        </div>

        {/* Filters + Export */}
        <div className="flex gap-2 items-center flex-wrap">
          {/* Lọc theo đợt */}
          <Select value={batchFilter} onValueChange={setBatchFilter}>
            <SelectTrigger className="w-[160px] h-9 text-xs">
              <SelectValue placeholder="Tất cả đợt" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả đợt</SelectItem>
              {batches.map(b => (
                <SelectItem key={b.id} value={String(b.id)}>{b.batch_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Lọc theo phòng ban ← mới */}
          <Select value={deptFilter} onValueChange={setDeptFilter}>
            <SelectTrigger className="w-[175px] h-9 text-xs">
              <Building2 className="h-3.5 w-3.5 mr-1 shrink-0 text-gray-400" />
              <SelectValue placeholder="Tất cả phòng ban" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả phòng ban</SelectItem>
              {availableDepts.map(d => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Nút reset filter nếu đang lọc */}
          {activeFilters.length > 0 && (
            <Button size="sm" variant="ghost" className="text-xs text-gray-400 h-9 px-2"
              onClick={() => { setBatchFilter('all'); setDeptFilter('all') }}>
              Xoá lọc ×
            </Button>
          )}

          {/* Xuất Excel */}
          <Button size="sm" variant="outline"
            className="gap-1.5 border-green-600 text-green-700 hover:bg-green-50"
            disabled={exporting !== null} onClick={() => handleExport('excel')}>
            {exporting === 'excel' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
            Excel
          </Button>

          {/* Xuất PDF */}
          <Button size="sm" className="gap-1.5 bg-red-700 hover:bg-red-800"
            disabled={exporting !== null} onClick={() => handleExport('pdf')}>
            {exporting === 'pdf' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            PDF
          </Button>
        </div>
      </div>

      {/* Active filter badges */}
      {activeFilters.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>Đang xem:</span>
          {activeFilters.map(f => (
            <Badge key={f} className="bg-blue-50 text-blue-700 border border-blue-200">{f}</Badge>
          ))}
        </div>
      )}

      {/* ══ Section: Tổng quan ══════════════════════════════════ */}
      {section === 'overview' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Tổng TTS',    value: overview?.total_interns ?? 0,    sub: `${overview?.total_evaluations ?? 0} đã đánh giá`, icon: <Users className="h-7 w-7 text-blue-600" />,  bg: 'bg-blue-50'   },
              { label: 'Tỷ lệ HT NV', value: `${overview?.completion_rate ?? 0}%`, sub: `${overview?.task_status_counts?.approved ?? 0} / ${overview?.total_tasks ?? 0} NV`, icon: <TrendingUp className="h-7 w-7 text-green-600" />, bg: 'bg-green-50'  },
              { label: 'Đã đánh giá', value: overview?.total_evaluations ?? 0, sub: `/ ${overview?.total_interns ?? 0} TTS`, icon: <Award className="h-7 w-7 text-purple-600" />, bg: 'bg-purple-50' },
              { label: 'Điểm TB',     value: overview?.avg_score ?? 0,         sub: '/ 10 điểm', icon: <Star className="h-7 w-7 text-yellow-500" />, bg: 'bg-yellow-50' },
            ].map(s => (
              <Card key={s.label}>
                <CardContent className={`p-5 flex items-center gap-4 ${s.bg} rounded-lg`}>
                  {s.icon}
                  <div>
                    <p className="text-2xl font-black">{s.value}</p>
                    <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
                    <p className="text-xs text-muted-foreground">{s.sub}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />Phân bố trạng thái nhiệm vụ
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={taskStatusChartData} cx="50%" cy="50%" outerRadius={90}
                      dataKey="value" labelLine={false}
                      label={({ name, percent }) => percent > 0.05 ? `${name}\n${(percent*100).toFixed(0)}%` : ''}>
                      {taskStatusChartData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                    </Pie>
                    <Tooltip /><Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Award className="h-4 w-4 text-purple-600" />Phân bố xếp loại TTS
                </CardTitle>
              </CardHeader>
              <CardContent>
                {rankingChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={rankingChartData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 12 }} />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={80} />
                      <Tooltip />
                      <Bar dataKey="value" name="Số TTS" radius={[0,4,4,0]}>
                        {rankingChartData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                    <div className="text-center">
                      <Award className="h-12 w-12 mx-auto mb-2 opacity-20" /><p>Chưa có đánh giá</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {avgCriteriaData.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-500" />
                  Điểm năng lực trung bình
                  {activeFilters.map(f => (
                    <Badge key={f} className="bg-blue-100 text-blue-700 text-xs">{f}</Badge>
                  ))}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex justify-center">
                <ResponsiveContainer width="100%" height={280}>
                  <RadarChart data={avgCriteriaData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 13 }} />
                    <PolarRadiusAxis domain={[0, 10]} tick={{ fontSize: 10 }} />
                    <Radar dataKey="score" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ══ Section: Theo đợt ═══════════════════════════════════ */}
      {section === 'batch' && (
        <div className="space-y-5">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-blue-600" />So sánh các đợt thực tập
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={batchComparisonData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip /><Legend />
                  <Bar dataKey="TTS"        fill="#3b82f6" radius={[3,3,0,0]} />
                  <Bar dataKey="Tổng NV"    fill="#94a3b8" radius={[3,3,0,0]} />
                  <Bar dataKey="Hoàn thành" fill="#22c55e" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Chi tiết từng đợt</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left">
                      {['Tên đợt','Thời gian','TTS','Tổng NV','HT','Tỷ lệ','Đã ĐG','Điểm TB','Trạng thái'].map(h => (
                        <th key={h} className="py-2 pr-4 text-xs font-semibold text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {batchStats.length === 0 ? (
                      <tr><td colSpan={9} className="text-center py-8 text-muted-foreground">Chưa có dữ liệu</td></tr>
                    ) : batchStats.map(b => (
                      <tr key={b.batch_id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 pr-4 font-medium">{b.batch_name}</td>
                        <td className="py-3 pr-4 text-xs text-muted-foreground">
                          {b.start_date ? format(new Date(b.start_date), 'dd/MM/yy') : '—'} –{' '}
                          {b.end_date   ? format(new Date(b.end_date),   'dd/MM/yy') : '—'}
                        </td>
                        <td className="py-3 pr-4">{b.intern_count}</td>
                        <td className="py-3 pr-4">{b.total_tasks}</td>
                        <td className="py-3 pr-4 text-green-700 font-semibold">{b.approved_tasks}</td>
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 bg-gray-100 rounded-full">
                              <div className="h-1.5 rounded-full bg-green-500" style={{ width: `${b.task_completion_rate}%` }} />
                            </div>
                            <span className={b.task_completion_rate >= 70 ? 'text-green-600 font-medium' : b.task_completion_rate >= 40 ? 'text-yellow-600' : 'text-red-600'}>
                              {b.task_completion_rate}%
                            </span>
                          </div>
                        </td>
                        <td className="py-3 pr-4">{b.evaluated_count}/{b.intern_count}</td>
                        <td className="py-3 pr-4">
                          {b.avg_score != null
                            ? <span className={`font-bold ${getScoreColor(b.avg_score)}`}>{b.avg_score}</span>
                            : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="py-3">
                          <Badge className={b.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}>
                            {b.status === 'open' ? 'Đang mở' : 'Đã đóng'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ══ Section: TTS ════════════════════════════════════════ */}
      {section === 'interns' && (
        <div className="space-y-5">
          {topInterns.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />Tiến độ hoàn thành nhiệm vụ
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={topInterns.map((c: any) => ({
                    name: c.intern_name.split(' ').slice(-1)[0],
                    'Hoàn thành': c.approved, 'Đã nộp': c.submitted, 'Quá hạn': c.overdue,
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip /><Legend />
                    <Bar dataKey="Hoàn thành" stackId="a" fill="#22c55e" />
                    <Bar dataKey="Đã nộp"     stackId="a" fill="#3b82f6" />
                    <Bar dataKey="Quá hạn"    stackId="a" fill="#ef4444" radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Bảng tiến độ chi tiết</CardTitle>
                <Button size="sm" variant="outline" className="gap-1.5"
                  onClick={() => exportToCSV(
                    filteredCompletion.map((c: any) => ({
                      'Họ tên': c.intern_name,
                      'Phòng ban': allProfiles.find(p => p.user_id === c.intern_id)?.department || '—',
                      'Tổng NV': c.total_tasks, 'Hoàn thành': c.approved,
                      'Đã nộp': c.submitted, 'Quá hạn': c.overdue, 'Tỷ lệ (%)': c.completion_rate,
                    })),
                    `tien-do-tts-${format(new Date(), 'yyyy-MM-dd')}.csv`
                  )}>
                  <FileSpreadsheet className="h-3.5 w-3.5" />Xuất CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="py-2 pr-3 text-left text-xs font-semibold text-muted-foreground">#</th>
                      <th className="py-2 pr-3 text-left text-xs font-semibold text-muted-foreground">Họ tên</th>
                      <th className="py-2 pr-3 text-left text-xs font-semibold text-muted-foreground">Phòng ban</th>
                      <th className="py-2 pr-3 text-center text-xs font-semibold text-muted-foreground">Tổng</th>
                      <th className="py-2 pr-3 text-center text-xs font-semibold text-green-700">HT</th>
                      <th className="py-2 pr-3 text-center text-xs font-semibold text-blue-700">Nộp</th>
                      <th className="py-2 pr-3 text-center text-xs font-semibold text-red-700">QH</th>
                      <th className="py-2 text-left text-xs font-semibold text-muted-foreground">Tiến độ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCompletion.length === 0 ? (
                      <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">Chưa có dữ liệu</td></tr>
                    ) : (filteredCompletion as any[]).map((c, idx) => {
                      const dept = allProfiles.find(p => p.user_id === c.intern_id)?.department
                      return (
                        <tr key={c.intern_id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-2.5 pr-3 text-muted-foreground text-xs">{idx + 1}</td>
                          <td className="py-2.5 pr-3 font-medium">{c.intern_name}</td>
                          <td className="py-2.5 pr-3">
                            {dept
                              ? <Badge className="bg-purple-50 text-purple-700 text-xs font-normal">{dept}</Badge>
                              : <span className="text-gray-300 text-xs">—</span>}
                          </td>
                          <td className="py-2.5 pr-3 text-center">{c.total_tasks}</td>
                          <td className="py-2.5 pr-3 text-center font-bold text-green-700">{c.approved}</td>
                          <td className="py-2.5 pr-3 text-center text-blue-700">{c.submitted}</td>
                          <td className="py-2.5 pr-3 text-center text-red-700">{c.overdue}</td>
                          <td className="py-2.5">
                            <div className="flex items-center gap-2">
                              <div className="h-2 bg-gray-100 rounded-full w-24">
                                <div className="h-2 rounded-full transition-all"
                                  style={{
                                    width: `${c.completion_rate}%`,
                                    backgroundColor: c.completion_rate >= 70 ? '#22c55e' : c.completion_rate >= 40 ? '#f59e0b' : '#ef4444',
                                  }} />
                              </div>
                              <span className={`text-xs font-semibold ${c.completion_rate >= 70 ? 'text-green-600' : c.completion_rate >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                                {c.completion_rate}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ══ Section: Đánh giá ═══════════════════════════════════ */}
      {section === 'evaluation' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Đã đánh giá',     value: filteredEvaluations.length, color: 'text-blue-700',   bg: 'bg-blue-50'   },
              { label: 'Điểm TB',          value: filteredEvaluations.length ? (filteredEvaluations.reduce((s, e) => s + e.total_score, 0) / filteredEvaluations.length).toFixed(1) : '—', color: 'text-green-700', bg: 'bg-green-50' },
              { label: 'Xuất sắc + Giỏi', value: filteredEvaluations.filter(e => ['Xuất sắc','Giỏi'].includes(e.ranking)).length, color: 'text-purple-700', bg: 'bg-purple-50' },
              { label: 'Cần cải thiện',   value: filteredEvaluations.filter(e => ['Trung bình','Yếu'].includes(e.ranking)).length, color: 'text-red-700', bg: 'bg-red-50' },
            ].map(s => (
              <Card key={s.label}>
                <CardContent className={`p-4 text-center ${s.bg} rounded-lg`}>
                  <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Phân bố xếp loại</CardTitle></CardHeader>
              <CardContent>
                {rankingChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie data={rankingChartData} cx="50%" cy="50%" outerRadius={85}
                        dataKey="value" labelLine={false}
                        label={({ name, value, percent }) => percent > 0.05 ? `${name}: ${value}` : ''}>
                        {rankingChartData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                      </Pie>
                      <Tooltip /><Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <div className="flex items-center justify-center h-[240px] text-muted-foreground">Chưa có đánh giá</div>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Điểm năng lực trung bình</CardTitle></CardHeader>
              <CardContent>
                {avgCriteriaData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <RadarChart data={avgCriteriaData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
                      <PolarRadiusAxis domain={[0, 10]} tick={{ fontSize: 10 }} />
                      <Radar dataKey="score" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                ) : <div className="flex items-center justify-center h-[240px] text-muted-foreground">Chưa có đánh giá</div>}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Bảng kết quả đánh giá</CardTitle>
                <Button size="sm" variant="outline" className="gap-1.5"
                  onClick={() => exportToCSV(
                    filteredEvaluations.map(e => ({
                      'Họ tên': e.intern_name,
                      'Phòng ban': allProfiles.find(p => p.user_id === e.intern_id)?.department || '—',
                      'Thái độ':  (e.criteria_scores as any)?.attitude    ?? '',
                      'Kỷ luật':  (e.criteria_scores as any)?.discipline  ?? '',
                      'Học hỏi':  (e.criteria_scores as any)?.learning    ?? '',
                      'Kỹ năng':  (e.criteria_scores as any)?.skills      ?? '',
                      'Kết quả':  (e.criteria_scores as any)?.task_result ?? '',
                      'Tổng điểm': e.total_score,
                      'Xếp loại': e.ranking,
                      'Mentor': e.mentor_name,
                      'Ngày ĐG': format(new Date(e.created_at), 'dd/MM/yyyy'),
                    })),
                    `danh-gia-${format(new Date(), 'yyyy-MM-dd')}.csv`
                  )}>
                  <FileSpreadsheet className="h-3.5 w-3.5" />Xuất CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      {['#','Họ tên','Phòng ban','Thái độ','Kỷ luật','Học hỏi','Kỹ năng','Kết quả','Tổng','Xếp loại','Mentor'].map(h => (
                        <th key={h} className="py-2 pr-3 text-left text-xs font-semibold text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEvaluations.length === 0 ? (
                      <tr><td colSpan={11} className="text-center py-8 text-muted-foreground">Chưa có đánh giá nào</td></tr>
                    ) : [...filteredEvaluations]
                        .sort((a, b) => b.total_score - a.total_score)
                        .map((ev, idx) => {
                          const dept = allProfiles.find(p => p.user_id === ev.intern_id)?.department
                          return (
                            <tr key={ev.id} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-2.5 pr-3 text-muted-foreground text-xs">{idx + 1}</td>
                              <td className="py-2.5 pr-3 font-medium">{ev.intern_name}</td>
                              <td className="py-2.5 pr-3">
                                {dept
                                  ? <Badge className="bg-purple-50 text-purple-700 text-xs font-normal">{dept}</Badge>
                                  : <span className="text-gray-300 text-xs">—</span>}
                              </td>
                              {(['attitude','discipline','learning','skills','task_result'] as const).map(k => (
                                <td key={k} className="py-2.5 pr-3 text-center">
                                  <span className={getScoreColor((ev.criteria_scores as any)?.[k] ?? 0)}>
                                    {(ev.criteria_scores as any)?.[k] ?? '—'}
                                  </span>
                                </td>
                              ))}
                              <td className="py-2.5 pr-3 font-black text-lg">
                                <span className={getScoreColor(ev.total_score)}>{ev.total_score}</span>
                              </td>
                              <td className="py-2.5 pr-3">
                                <Badge style={{ backgroundColor: RANKING_COLORS[ev.ranking] + '22', color: RANKING_COLORS[ev.ranking], border: `1px solid ${RANKING_COLORS[ev.ranking]}44` }}>
                                  {ev.ranking}
                                </Badge>
                              </td>
                              <td className="py-2.5 text-muted-foreground text-xs">{ev.mentor_name}</td>
                            </tr>
                          )
                        })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}