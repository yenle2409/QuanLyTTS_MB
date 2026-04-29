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
async function exportReport(type: 'excel' | 'pdf', batchId: string, department: string) {
  const p = new URLSearchParams()
  if (batchId    !== 'all') p.append('batch_id',   batchId)
  if (department !== 'all') p.append('department', department)
  const qs = p.toString() ? `?${p}` : ''
  const endpoint = type === 'excel'
    ? `/statistics/export-excel${qs}`
    : `/statistics/export-pdf${qs}`
  const res  = await api.get(endpoint, { responseType: 'blob' })
  const ext  = type === 'excel' ? 'xlsx' : 'pdf'
  const mime = type === 'excel'
    ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    : 'application/pdf'
  const blob = new Blob([res.data], { type: mime })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url
  a.download = `bao-cao-thuc-tap-${new Date().toISOString().slice(0, 10)}.${ext}`
  a.click()
  URL.revokeObjectURL(url)
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


function escapeHtml(value: unknown) {
  return String(value ?? '—')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function safeDate(value: unknown) {
  if (!value) return '—'
  const d = new Date(String(value))
  if (Number.isNaN(d.getTime())) return '—'
  return format(d, 'dd/MM/yyyy', { locale: vi })
}

function getBatchLabel(batchFilter: string, batches: any[]) {
  if (batchFilter === 'all') return 'Tất cả đợt'
  return batches.find((b: any) => String(b.id) === batchFilter)?.batch_name || 'Đợt đã chọn'
}

function getFilteredReportData({
  batchFilter,
  deptFilter,
  batches,
  profiles,
  tasks,
  evaluations,
  completionData,
}: {
  batchFilter: string
  deptFilter: string
  batches: any[]
  profiles: any[]
  tasks: any[]
  evaluations: any[]
  completionData: any[]
}) {
  const selectedProfiles = profiles.filter((p: any) => {
    const batchOk = batchFilter === 'all' || String(p.batch_id) === batchFilter
    const deptOk = deptFilter === 'all' || p.department === deptFilter
    return batchOk && deptOk
  })
  const selectedInternIds = new Set(selectedProfiles.map((p: any) => p.user_id))

  const filteredTasks = tasks.filter((t: any) => {
    const batchOk = batchFilter === 'all' || String(t.batch_id) === batchFilter
    const deptOk = deptFilter === 'all' || selectedInternIds.has(t.intern_id)
    return batchOk && deptOk
  })

  const filteredEvaluations = evaluations.filter((e: any) => {
    if (deptFilter !== 'all' || batchFilter !== 'all') return selectedInternIds.has(e.intern_id)
    return true
  })

  const filteredCompletion = completionData.filter((c: any) => {
    const batchOk = batchFilter === 'all' || String(c.batch_id) === batchFilter
    const deptOk = deptFilter === 'all' || selectedInternIds.has(c.intern_id)
    return batchOk && deptOk
  })

  const totalTasks = filteredTasks.length
  const approvedTasks = filteredTasks.filter((t: any) => t.status === 'approved').length
  const submittedTasks = filteredTasks.filter((t: any) => t.status === 'submitted').length
  const overdueTasks = filteredTasks.filter((t: any) => t.status === 'overdue').length
  const completionRate = totalTasks ? Math.round((approvedTasks / totalTasks) * 1000) / 10 : 0
  const avgScore = filteredEvaluations.length
    ? Math.round((filteredEvaluations.reduce((sum: number, e: any) => sum + Number(e.total_score || 0), 0) / filteredEvaluations.length) * 10) / 10
    : 0

  const batchRows = batches
    .filter((b: any) => batchFilter === 'all' || String(b.id) === batchFilter)
    .map((b: any) => {
      const bProfiles = selectedProfiles.filter((p: any) => p.batch_id === b.id)
      const bIds = new Set(bProfiles.map((p: any) => p.user_id))
      const bTasks = filteredTasks.filter((t: any) => t.batch_id === b.id)
      const bEvals = filteredEvaluations.filter((e: any) => bIds.has(e.intern_id))
      const bApproved = bTasks.filter((t: any) => t.status === 'approved').length
      return {
        name: b.batch_name,
        status: b.status === 'open' ? 'Đang mở' : 'Đã đóng',
        period: `${safeDate(b.start_date)} - ${safeDate(b.end_date)}`,
        internCount: bProfiles.length,
        totalTasks: bTasks.length,
        approvedTasks: bApproved,
        completionRate: bTasks.length ? Math.round((bApproved / bTasks.length) * 1000) / 10 : 0,
        evaluatedCount: bEvals.length,
      }
    })

  return {
    selectedProfiles,
    filteredTasks,
    filteredEvaluations,
    filteredCompletion,
    batchRows,
    totalTasks,
    approvedTasks,
    submittedTasks,
    overdueTasks,
    completionRate,
    avgScore,
  }
}

function buildPrintableReportHtml(args: {
  batchFilter: string
  deptFilter: string
  batches: any[]
  profiles: any[]
  tasks: any[]
  evaluations: any[]
  completionData: any[]
}) {
  const data = getFilteredReportData(args)
  const generatedAt = format(new Date(), 'dd/MM/yyyy HH:mm', { locale: vi })
  const batchLabel = getBatchLabel(args.batchFilter, args.batches)
  const deptLabel = args.deptFilter === 'all' ? 'Tất cả phòng ban' : args.deptFilter
  const refNo = `MB-HR-INT-${format(new Date(), 'yyyyMMdd')}-001`

  const statusRows = Object.entries(STATUS_LABELS).map(([key, label]) => {
    const count = data.filteredTasks.filter((t: any) => t.status === key).length
    const rate = data.totalTasks ? Math.round((count / data.totalTasks) * 1000) / 10 : 0
    return `<tr><td>${escapeHtml(label)}</td><td>${count}</td><td>${rate}%</td></tr>`
  }).join('')

  const batchRows = data.batchRows.length
    ? data.batchRows.map((b: any) => `
      <tr>
        <td>${escapeHtml(b.name)}</td>
        <td>${escapeHtml(b.period)}</td>
        <td>${escapeHtml(b.status)}</td>
        <td>${b.internCount}</td>
        <td>${b.totalTasks}</td>
        <td>${b.approvedTasks}</td>
        <td>${b.completionRate}%</td>
        <td>${b.evaluatedCount}</td>
      </tr>
    `).join('')
    : '<tr><td colspan="8" class="empty">Không có dữ liệu</td></tr>'

  const topRows = [...data.filteredCompletion]
    .sort((a: any, b: any) => Number(b.completion_rate || 0) - Number(a.completion_rate || 0))
    .slice(0, 12)
    .map((c: any, idx: number) => `
      <tr>
        <td>${idx + 1}</td>
        <td>${escapeHtml(c.intern_name)}</td>
        <td>${Number(c.total_tasks || 0)}</td>
        <td>${Number(c.approved || 0)}</td>
        <td>${Number(c.submitted || 0)}</td>
        <td>${Number(c.overdue || 0)}</td>
        <td>${Number(c.completion_rate || 0)}%</td>
      </tr>
    `).join('') || '<tr><td colspan="7" class="empty">Không có dữ liệu</td></tr>'

  const evalRows = [...data.filteredEvaluations]
    .sort((a: any, b: any) => Number(b.total_score || 0) - Number(a.total_score || 0))
    .slice(0, 15)
    .map((e: any, idx: number) => `
      <tr>
        <td>${idx + 1}</td>
        <td>${escapeHtml(e.intern_name)}</td>
        <td>${escapeHtml(e.mentor_name)}</td>
        <td>${escapeHtml(e.total_score)}</td>
        <td>${escapeHtml(e.ranking)}</td>
      </tr>
    `).join('') || '<tr><td colspan="5" class="empty">Chưa có đánh giá</td></tr>'

  return `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <title>Báo cáo thực tập sinh</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Arial, sans-serif; margin: 0; color: #111827; background: #ffffff; }
    .page { width: 210mm; min-height: 297mm; padding: 16mm; margin: 0 auto; }
    .banner { background: #003f8f; color: #fff; padding: 14px 18px; border-radius: 10px; }
    .bank { font-size: 18px; font-weight: 800; letter-spacing: .04em; }
    .sub { margin-top: 4px; font-size: 12px; opacity: .9; }
    h1 { color: #002b64; margin: 22px 0 8px; font-size: 22px; text-align: center; }
    h2 { color: #003f8f; margin: 24px 0 10px; font-size: 15px; border-left: 5px solid #003f8f; padding-left: 8px; }
    .meta { text-align: center; color: #4b5563; font-size: 12px; margin-bottom: 16px; }
    .cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 16px 0; }
    .card { border: 1px solid #dbeafe; background: #eff6ff; border-radius: 10px; padding: 12px; }
    .card .label { color: #4b5563; font-size: 11px; text-transform: uppercase; font-weight: 700; }
    .card .value { color: #003f8f; font-size: 24px; font-weight: 900; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 11px; page-break-inside: auto; }
    th { background: #003f8f; color: #fff; text-align: left; padding: 8px; border: 1px solid #003f8f; }
    td { padding: 7px 8px; border: 1px solid #d1d5db; vertical-align: middle; }
    tr:nth-child(even) td { background: #f9fafb; }
    .empty { text-align: center; color: #6b7280; padding: 18px; }
    .note { font-size: 11px; color: #4b5563; line-height: 1.5; background: #f9fafb; padding: 10px 12px; border-radius: 8px; }
    .signatures { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 26px; }
    .sig { height: 90px; border: 1px solid #d1d5db; border-radius: 8px; text-align: center; padding-top: 12px; color: #374151; font-weight: 700; }
    .sig span { display: block; margin-top: 46px; color: #9ca3af; font-size: 10px; font-weight: 400; }
    .footer { margin-top: 22px; border-top: 1px solid #d1d5db; padding-top: 8px; color: #6b7280; font-size: 10px; display: flex; justify-content: space-between; }
    @media print {
      body { background: #fff; }
      .page { width: auto; min-height: auto; padding: 12mm; }
      .no-print { display: none !important; }
      h2, table { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="banner">
      <div class="bank">MB MILITARY BANK</div>
      <div class="sub">Hệ thống Quản lý Thực tập</div>
    </div>

    <h1>BÁO CÁO TỔNG HỢP TÌNH HÌNH THỰC TẬP SINH</h1>
    <div class="meta">Đợt: ${escapeHtml(batchLabel)} &nbsp;•&nbsp; Phòng ban: ${escapeHtml(deptLabel)} &nbsp;•&nbsp; Ngày xuất: ${generatedAt} &nbsp;•&nbsp; Mã BC: ${refNo}</div>

    <div class="cards">
      <div class="card"><div class="label">Tổng TTS</div><div class="value">${data.selectedProfiles.length}</div></div>
      <div class="card"><div class="label">Tổng nhiệm vụ</div><div class="value">${data.totalTasks}</div></div>
      <div class="card"><div class="label">Tỷ lệ hoàn thành</div><div class="value">${data.completionRate}%</div></div>
      <div class="card"><div class="label">Điểm TB</div><div class="value">${data.avgScore}/10</div></div>
    </div>

    <h2>I. Tóm tắt điều hành</h2>
    <div class="note">
      Hệ thống ghi nhận ${data.selectedProfiles.length} thực tập sinh trong phạm vi lọc. Có ${data.approvedTasks}/${data.totalTasks} nhiệm vụ đã hoàn thành, ${data.submittedTasks} nhiệm vụ đã nộp chờ xử lý và ${data.overdueTasks} nhiệm vụ quá hạn. Điểm đánh giá trung bình hiện tại là ${data.avgScore}/10.
    </div>

    <h2>II. Thống kê theo đợt thực tập</h2>
    <table>
      <thead><tr><th>Tên đợt</th><th>Thời gian</th><th>Trạng thái</th><th>TTS</th><th>Tổng NV</th><th>Đã duyệt</th><th>Tỷ lệ HT</th><th>Đã ĐG</th></tr></thead>
      <tbody>${batchRows}</tbody>
    </table>

    <h2>III. Phân bố trạng thái nhiệm vụ</h2>
    <table>
      <thead><tr><th>Trạng thái</th><th>Số lượng</th><th>Tỷ lệ</th></tr></thead>
      <tbody>${statusRows}</tbody>
    </table>

    <h2>IV. Top thực tập sinh theo tỷ lệ hoàn thành</h2>
    <table>
      <thead><tr><th>#</th><th>Họ tên</th><th>Tổng NV</th><th>Đã duyệt</th><th>Đã nộp</th><th>Quá hạn</th><th>Tỷ lệ HT</th></tr></thead>
      <tbody>${topRows}</tbody>
    </table>

    <h2>V. Kết quả đánh giá</h2>
    <table>
      <thead><tr><th>#</th><th>Họ tên TTS</th><th>Mentor</th><th>Tổng điểm</th><th>Xếp loại</th></tr></thead>
      <tbody>${evalRows}</tbody>
    </table>

    <h2>VI. Kết luận và ký duyệt</h2>
    <div class="note">
      HR cần tiếp tục theo dõi các nhiệm vụ quá hạn và các thực tập sinh có tỷ lệ hoàn thành thấp. Báo cáo được tạo từ dữ liệu hiện có trên hệ thống tại thời điểm xuất.
    </div>
    <div class="signatures">
      <div class="sig">Người lập báo cáo<span>Ký tên & ngày</span></div>
      <div class="sig">Trưởng phòng HR<span>Ký tên & ngày</span></div>
      <div class="sig">Ban quản lý<span>Ký tên & ngày</span></div>
    </div>

    <div class="footer"><span>CONFIDENTIAL — For Management Use Only</span><span>${refNo}</span></div>
  </div>
</body>
</html>`
}

function writePrintableReport(printWindow: Window, html: string) {
  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.focus()
  setTimeout(() => printWindow.print(), 500)
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

    // PDF trên Render có thể lỗi do thiếu thư viện/font backend.
    // Vì vậy PDF sẽ thử tải từ backend trước; nếu lỗi thì xuất bằng trình duyệt từ dữ liệu frontend.
    let pdfWindow: Window | null = null
    if (type === 'pdf') {
      pdfWindow = window.open('', '_blank')
      if (pdfWindow) {
        pdfWindow.document.write('<p style="font-family: Arial, sans-serif; padding: 24px">Đang chuẩn bị báo cáo PDF...</p>')
      }
    }

    try {
      await exportReport(type, batchFilter, deptFilter)
      if (pdfWindow && !pdfWindow.closed) pdfWindow.close()
      toast({ title: 'Thành công', description: `Đã xuất ${type === 'excel' ? 'Excel' : 'PDF'} thành công.` })
    } catch {
      if (type === 'pdf' && pdfWindow) {
        const html = buildPrintableReportHtml({
          batchFilter,
          deptFilter,
          batches,
          profiles: allProfiles,
          tasks,
          evaluations,
          completionData,
        })
        writePrintableReport(pdfWindow, html)
        toast({
          title: 'Đã mở bản PDF',
          description: 'Chọn Save as PDF/Lưu thành PDF trong hộp thoại in của trình duyệt.',
        })
      } else {
        toast({ title: 'Lỗi', description: `Không xuất được ${type === 'excel' ? 'Excel' : 'PDF'}. Vui lòng thử lại.` })
      }
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