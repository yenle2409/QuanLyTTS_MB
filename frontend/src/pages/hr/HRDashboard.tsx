import { useState, useMemo } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import AddInternDialog from '@/components/hr/AddInternDialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import {
  Users, Calendar, ClipboardList, BarChart3, Plus, Search,
  Pencil, Trash2, Upload, UserPlus, Loader2, CheckCircle,
  Clock, AlertCircle, Eye, FileText, Filter, CalendarDays,
  CalendarOff, XCircle, Award, Lock, Unlock, ExternalLink,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'
import { useBatches, useDeleteBatch, useUpdateBatch, type Batch } from '@/hooks/use-batches'
import {
  useInternProfiles, useInternDetail, useUpdateProfile, useUpdateUserProfile, useBulkUpdateStatus,
  INTERN_STATUS_LABELS, type InternProfile, type InternStatus,
} from '@/hooks/use-profiles'
import { useTasks, useTaskReports, type Task } from '@/hooks/use-tasks'
import {
  useLeaveRequests, useReviewLeaveRequest,
  LEAVE_STATUS_LABELS, type LeaveRequest, type LeaveStatus,
} from '@/hooks/use-leave-request'
import { useEvaluations } from '@/hooks/use-evaluations'
import BatchFormDialog from '@/components/hr/BatchFormDialog'
import BatchDetailDialog from '@/components/hr/BatchDetailDialog'
import ImportExcelDialog from '@/components/hr/ImportExcelDialog'
import AssignMentorDialog from '@/components/hr/AssignMentorDialog'
import DeleteConfirmDialog from '@/components/admin/DeleteConfirmDialog'
import StatisticsTab from '@/components/hr/StatisticsTab'
import HRScheduleTab from '@/components/hr/HRScheduleTab'
import EvaluationReviewTab from '@/components/hr/EvaluationReviewTab'
import PaginationBar from '@/components/ui/pagination-bar'
import { useToast } from '@/hooks/use-toast'
import { formatDate } from '@/lib/utils'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import HRLeaveTab from '@/components/hr/HRLeaveTab'
// ─── Constants ────────────────────────────────────────────────
const batchStatusLabels: Record<string, string> = { open: 'Đang mở', closed: 'Đã đóng' }
const batchStatusColors: Record<string, string> = {
  open: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-800',
}
const taskStatusLabels: Record<string, string> = {
  new: 'Chưa nộp', submitted: 'Đã nộp', request_change: 'Cần chỉnh sửa',
  approved: 'Đã duyệt', overdue: 'Quá hạn',
}
const taskStatusColors: Record<string, string> = {
  new: 'bg-gray-100 text-gray-700', submitted: 'bg-blue-100 text-blue-700',
  request_change: 'bg-orange-100 text-orange-700', approved: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
}
const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']
const DEFAULT_DEPARTMENTS = ['KHDN', 'KHCN', 'TCHC', 'KTNB', 'TĐH', 'Tín dụng', 'Quản lý rủi ro']

type TabType = 'overview' | 'batches' | 'interns' | 'tasks' | 'schedule' | 'leaves' | 'evaluations' | 'statistics'

// ─── Helper ───────────────────────────────────────────────────
function getDeleteBlockReason(batch: Batch, internCount: number): string | null {
  if (batch.status !== 'closed' && internCount > 0)
    return `Đợt đang mở và còn ${internCount} thực tập sinh`
  if (batch.status !== 'closed')
    return 'Phải đóng đợt trước khi xóa'
  if (internCount > 0)
    return `Còn ${internCount} thực tập sinh trong đợt này`
  return null
}

// Kiểm tra đợt đã đóng (status closed)
function isBatchClosed(batch: Batch): boolean {
  return batch.status === 'closed'
}

// ─── Stat Card ────────────────────────────────────────────────
function StatCard({
  label, value, sub, icon, gradient, accentColor, progress,
}: {
  label: string; value: number | string; sub: string
  icon: React.ReactNode; gradient: string; accentColor: string; progress?: number
}) {
  return (
    <div className={`relative overflow-hidden rounded-xl ${gradient} p-5 text-white shadow-lg`}>
      <div className="absolute -right-5 -top-5 h-28 w-28 rounded-full bg-white/10" />
      <div className="absolute -bottom-8 -right-2 h-20 w-20 rounded-full bg-white/[0.06]" />
      <div className="absolute top-1/2 -left-6 h-14 w-14 rounded-full bg-white/[0.05]" />
      <div className="relative">
        <div className="mb-3 flex items-start justify-between">
          <span className={`text-[10px] font-bold uppercase tracking-[0.15em] ${accentColor}`}>{label}</span>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20 shadow-inner backdrop-blur-sm">
            {icon}
          </div>
        </div>
        <span className="text-[2.5rem] font-extrabold leading-none tracking-tight">{value}</span>
        {progress !== undefined && (
          <div className="mt-3">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/20">
              <div className="h-full rounded-full bg-white/80 transition-all duration-700"
                style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }} />
            </div>
          </div>
        )}
        <p className={`mt-1.5 text-[11px] font-medium ${accentColor}`}>{sub}</p>
      </div>
    </div>
  )
}

// ─── Task Detail Dialog ───────────────────────────────────────
function TaskDetailDialog({ task, open, onOpenChange }: { task: Task | null; open: boolean; onOpenChange: (v: boolean) => void }) {
  const { data: reports, isLoading } = useTaskReports(task?.id ?? 0)
  if (!task) return null
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />Chi tiết nhiệm vụ
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <h3 className="font-semibold text-base">{task.title}</h3>
              <Badge className={taskStatusColors[task.status]}>{taskStatusLabels[task.status]}</Badge>
            </div>
            {task.description && <p className="text-sm text-muted-foreground">{task.description}</p>}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">Thực tập sinh:</span><span className="ml-2 font-medium">{task.intern_name}</span></div>
              <div><span className="text-muted-foreground">Mentor:</span><span className="ml-2 font-medium">{task.mentor_name}</span></div>
              <div><span className="text-muted-foreground">Đợt:</span><span className="ml-2 font-medium">{task.batch_name}</span></div>
              <div><span className="text-muted-foreground">Deadline:</span><span className="ml-2 font-medium text-red-600">{formatDate(task.deadline)}</span></div>
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />Báo cáo đã nộp
              {reports && reports.length > 0 && <Badge className="bg-blue-100 text-blue-700 text-xs">{reports.length}</Badge>}
            </h4>
            {isLoading ? (
              <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : !reports || reports.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm bg-gray-50 rounded-lg">Chưa có báo cáo nào</div>
            ) : (
              <div className="space-y-3">
                {reports.map((report, idx) => (
                  <div key={report.id} className="border rounded-lg p-3 space-y-2">
                    <span className="text-xs font-medium text-muted-foreground">Lần nộp #{idx + 1} — {formatDate(report.submitted_at)}</span>
                    <p className="text-sm">{report.content}</p>
                    {report.mentor_comment && (
                      <div className="bg-blue-50 rounded p-2 text-sm">
                        <span className="font-medium text-blue-700">Nhận xét Mentor: </span>
                        <span className="text-blue-800">{report.mentor_comment}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Tasks Monitor Tab ────────────────────────────────────────
function TasksMonitorTab() {
  const { data: tasks, isLoading } = useTasks()
  const { data: batches } = useBatches()
  const { data: profiles = [] } = useInternProfiles()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [batchFilter, setBatchFilter] = useState('all')
  const [deptFilter, setDeptFilter] = useState('all')
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const stats = useMemo(() => {
    if (!tasks) return { total: 0, new: 0, submitted: 0, request_change: 0, approved: 0, overdue: 0 }
    return {
      total: tasks.length,
      new: tasks.filter(t => t.status === 'new').length,
      submitted: tasks.filter(t => t.status === 'submitted').length,
      request_change: tasks.filter(t => t.status === 'request_change').length,
      approved: tasks.filter(t => t.status === 'approved').length,
      overdue: tasks.filter(t => t.status === 'overdue').length,
    }
  }, [tasks])

  const filteredTasks = useMemo(() => {
    if (!tasks) return []
    const deptMap = Object.fromEntries(profiles.map(p => [p.user_id, p.department]))
    return tasks.filter(task => {
      const matchSearch = task.title.toLowerCase().includes(search.toLowerCase()) ||
        task.intern_name.toLowerCase().includes(search.toLowerCase()) ||
        task.mentor_name.toLowerCase().includes(search.toLowerCase())
      const matchDept = deptFilter === 'all' || deptMap[task.intern_id] === deptFilter
      return matchSearch && (statusFilter === 'all' || task.status === statusFilter) &&
        (batchFilter === 'all' || task.batch_id.toString() === batchFilter) && matchDept
    })
  }, [tasks, search, statusFilter, batchFilter, deptFilter, profiles])

  const pagedTasks = useMemo(() =>
    filteredTasks.slice((page - 1) * pageSize, page * pageSize),
    [filteredTasks, page, pageSize])

  const statusChartData = useMemo(() =>
    Object.entries(taskStatusLabels)
      .map(([key, label]) => ({ name: label, value: tasks?.filter(t => t.status === key).length || 0 }))
      .filter(d => d.value > 0), [tasks])

  const batchChartData = useMemo(() => {
    if (!tasks || !batches) return []
    return batches.map(batch => {
      const bt = tasks.filter(t => t.batch_id === batch.id)
      return {
        name: batch.batch_name.length > 14 ? batch.batch_name.slice(0, 14) + '…' : batch.batch_name,
        'Tổng': bt.length,
        'Hoàn thành': bt.filter(t => t.status === 'approved').length,
      }
    }).filter(d => d['Tổng'] > 0)
  }, [tasks, batches])

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {[
          { label: 'Tổng', value: stats.total, color: 'text-gray-800' },
          { label: 'Chưa nộp', value: stats.new, color: 'text-gray-600' },
          { label: 'Đã nộp', value: stats.submitted, color: 'text-blue-600' },
          { label: 'Cần sửa', value: stats.request_change, color: 'text-orange-600' },
          { label: 'Đã duyệt', value: stats.approved, color: 'text-green-600' },
          { label: 'Quá hạn', value: stats.overdue, color: 'text-red-600' },
        ].map(s => (
          <Card key={s.label}><CardContent className="p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </CardContent></Card>
        ))}
      </div>
      {(statusChartData.length > 0 || batchChartData.length > 0) && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Phân bố trạng thái</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={statusChartData} cx="50%" cy="50%" outerRadius={75} dataKey="value" labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                    {statusChartData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie><Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Tiến độ theo đợt</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={batchChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} />
                  <Tooltip /><Legend />
                  <Bar dataKey="Tổng" fill="#94a3b8" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Hoàn thành" fill="#22c55e" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4" />Danh sách nhiệm vụ
            <Badge className="bg-gray-100 text-gray-700 ml-1">{filteredTasks.length}/{tasks?.length || 0}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Tìm tên nhiệm vụ, TTS, Mentor..." value={search}
                onChange={e => { setSearch(e.target.value); setPage(1) }} className="pl-10" />
            </div>
            <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1) }}>
              <SelectTrigger className="w-full sm:w-[170px]"><SelectValue placeholder="Trạng thái" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                {Object.entries(taskStatusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={batchFilter} onValueChange={v => { setBatchFilter(v); setPage(1) }}>
              <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Đợt thực tập" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả đợt</SelectItem>
                {batches?.map(b => <SelectItem key={b.id} value={b.id.toString()}>{b.batch_name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={deptFilter} onValueChange={v => { setDeptFilter(v); setPage(1) }}>
              <SelectTrigger className="w-full sm:w-[190px]"><SelectValue placeholder="Phòng ban" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả phòng ban</SelectItem>
                {[...new Set(profiles.map(p => p.department).filter((d): d is string => !!d))].length > 0
                  ? [...new Set(profiles.map(p => p.department).filter((d): d is string => !!d))].map(d => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))
                  : DEFAULT_DEPARTMENTS.map(d => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))
                }
              </SelectContent>
            </Select>
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center h-48"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : (
            <>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tên nhiệm vụ</TableHead><TableHead>Thực tập sinh</TableHead>
                      <TableHead>Mentor</TableHead><TableHead>Đợt</TableHead>
                      <TableHead>Deadline</TableHead><TableHead>Trạng thái</TableHead>
                      <TableHead className="text-right">Xem</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedTasks.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">Không có nhiệm vụ nào</TableCell></TableRow>
                    ) : pagedTasks.map(task => (
                      <TableRow key={task.id}>
                        <TableCell className="font-medium max-w-[200px] truncate" title={task.title}>{task.title}</TableCell>
                        <TableCell>{task.intern_name}</TableCell>
                        <TableCell>{task.mentor_name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          <span>{task.batch_name}</span>
                          {batches?.find(b => b.id === task.batch_id)?.status === 'closed' && (
                            <Badge className="ml-1.5 bg-gray-100 text-gray-500 text-[10px] py-0">Đã đóng</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className={new Date(task.deadline) < new Date() && task.status !== 'approved' ? 'text-red-600 font-medium' : ''}>
                            {formatDate(task.deadline)}
                          </span>
                        </TableCell>
                        <TableCell><Badge className={taskStatusColors[task.status]}>{taskStatusLabels[task.status]}</Badge></TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => { setSelectedTask(task); setDetailOpen(true) }}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <PaginationBar currentPage={page} totalItems={filteredTasks.length} pageSize={pageSize}
                onPageChange={setPage} onPageSizeChange={s => { setPageSize(s); setPage(1) }} />
            </>
          )}
        </CardContent>
      </Card>
      <TaskDetailDialog task={selectedTask} open={detailOpen} onOpenChange={setDetailOpen} />
    </div>
  )
}

// ─── Leave Review Tab ──────────────────────────────────────────
function LeaveReviewTab() {
  const { toast } = useToast()
  const { data: leaveRequests = [], isLoading } = useLeaveRequests()
  const { data: batches = [] } = useBatches()
  const reviewLeave = useReviewLeaveRequest()

  const [statusFilter, setStatusFilter] = useState('pending')
  const [batchFilter, setBatchFilter] = useState('all')
  const [reviewOpen, setReviewOpen] = useState(false)
  const [reviewing, setReviewing] = useState<LeaveRequest | null>(null)
  const [hrNote, setHrNote] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const pendingCount = leaveRequests.filter(r => r.status === 'pending').length
  const filtered = leaveRequests.filter(r =>
    (statusFilter === 'all' || r.status === statusFilter) &&
    (batchFilter === 'all' || r.batch_id.toString() === batchFilter)
  )
  const isClosedBatch = (batchId: number) => {
    const b = batches.find(x => x.id === batchId)
    return b ? b.status === 'closed' : false
  }
  const selectedBatchClosed = batchFilter !== 'all' && isClosedBatch(parseInt(batchFilter))
  const pagedLeaves = useMemo(() =>
    filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page, pageSize])

  const openReview = (leave: LeaveRequest) => { setReviewing(leave); setHrNote(leave.hr_note || ''); setReviewOpen(true) }

  const handleReview = async (status: LeaveStatus) => {
    if (!reviewing) return
    try {
      await reviewLeave.mutateAsync({ id: reviewing.id, data: { status, hr_note: hrNote } })
      toast({
        title: status === 'approved' ? '✅ Đã duyệt đơn nghỉ' : '❌ Đã từ chối đơn nghỉ',
        description: `${reviewing.intern_name} — ${format(new Date(reviewing.leave_date), 'dd/MM/yyyy', { locale: vi })}`,
      })
      setReviewOpen(false); setReviewing(null)
    } catch (err: any) {
      toast({ title: 'Lỗi', description: err.response?.data?.detail || 'Có lỗi xảy ra' })
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Chờ duyệt', count: leaveRequests.filter(r => r.status === 'pending').length, color: 'text-yellow-600' },
          { label: 'Đã duyệt', count: leaveRequests.filter(r => r.status === 'approved').length, color: 'text-green-600' },
          { label: 'Từ chối', count: leaveRequests.filter(r => r.status === 'rejected').length, color: 'text-red-600' },
        ].map(s => (
          <Card key={s.label}><CardContent className="p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </CardContent></Card>
        ))}
      </div>
      {selectedBatchClosed && (
        <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          <Lock className="h-4 w-4 shrink-0 text-amber-600" />
          <span><strong>Đợt đã đóng</strong> — Chỉ xem, không thể thực hiện thao tác duyệt</span>
        </div>
      )}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarOff className="h-4 w-4 text-red-500" />
            Danh sách đơn xin nghỉ
            {pendingCount > 0 && <Badge className="bg-yellow-100 text-yellow-700">{pendingCount} chờ duyệt</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 mb-4">
            <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1) }}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="pending">Chờ duyệt</SelectItem>
                <SelectItem value="approved">Đã duyệt</SelectItem>
                <SelectItem value="rejected">Từ chối</SelectItem>
              </SelectContent>
            </Select>
            <Select value={batchFilter} onValueChange={v => { setBatchFilter(v); setPage(1) }}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả đợt</SelectItem>
                {batches.map(b => <SelectItem key={b.id} value={b.id.toString()}>{b.batch_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CalendarOff className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>Không có đơn nghỉ nào</p>
            </div>
          ) : (
            <>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Thực tập sinh</TableHead><TableHead>Ngày nghỉ</TableHead>
                      <TableHead>Lý do</TableHead><TableHead>Ngày gửi</TableHead>
                      <TableHead>Trạng thái</TableHead><TableHead className="text-right">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedLeaves.map(leave => (
                      <TableRow key={leave.id} className={leave.status === 'pending' ? 'bg-yellow-50/40' : ''}>
                        <TableCell className="font-medium">{leave.intern_name}</TableCell>
                        <TableCell className="font-medium">{format(new Date(leave.leave_date), 'EEE dd/MM/yyyy', { locale: vi })}</TableCell>
                        <TableCell className="max-w-[200px]"><p className="truncate text-sm" title={leave.reason}>{leave.reason}</p></TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {leave.created_at ? format(new Date(leave.created_at), 'dd/MM/yyyy', { locale: vi }) : '—'}
                        </TableCell>
                        <TableCell>
                          <Badge className={LEAVE_STATUS_LABELS[leave.status].color}>{LEAVE_STATUS_LABELS[leave.status].label}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {isClosedBatch(leave.batch_id) ? (
                            <Button size="sm" variant="ghost" onClick={() => openReview(leave)}>
                              <Eye className="h-3.5 w-3.5 mr-1" />Xem
                            </Button>
                          ) : (
                            <Button size="sm" variant={leave.status === 'pending' ? 'default' : 'ghost'} onClick={() => openReview(leave)}>
                              {leave.status === 'pending' ? 'Xét duyệt' : 'Xem'}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <PaginationBar currentPage={page} totalItems={filtered.length} pageSize={pageSize}
                onPageChange={setPage} onPageSizeChange={s => { setPageSize(s); setPage(1) }} />
            </>
          )}
        </CardContent>
      </Card>
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarOff className="h-5 w-5 text-red-500" />Xét duyệt đơn nghỉ
            </DialogTitle>
          </DialogHeader>
          {reviewing && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Thực tập sinh</span><span className="font-semibold">{reviewing.intern_name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Ngày nghỉ</span><span className="font-semibold capitalize">{format(new Date(reviewing.leave_date), 'EEEE, dd/MM/yyyy', { locale: vi })}</span></div>
                <div className="flex justify-between items-start gap-4"><span className="text-muted-foreground shrink-0">Lý do</span><span className="text-right">{reviewing.reason}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Trạng thái</span><Badge className={LEAVE_STATUS_LABELS[reviewing.status].color}>{LEAVE_STATUS_LABELS[reviewing.status].label}</Badge></div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Ghi chú cho intern (tuỳ chọn)</label>
                <Textarea placeholder="VD: Đã xác nhận, nghỉ có lương..." value={hrNote} onChange={e => setHrNote(e.target.value)} rows={3} className="resize-none" />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setReviewOpen(false)}>Đóng</Button>
            {reviewing?.status === 'pending' && !isClosedBatch(reviewing?.batch_id ?? 0) && (
              <>
                <Button variant="outline" className="border-red-300 text-red-600 hover:bg-red-50"
                  disabled={reviewLeave.isPending} onClick={() => handleReview('rejected')}>
                  {reviewLeave.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><XCircle className="h-4 w-4 mr-1" />Từ chối</>}
                </Button>
                <Button className="bg-green-600 hover:bg-green-700"
                  disabled={reviewLeave.isPending} onClick={() => handleReview('approved')}>
                  {reviewLeave.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CheckCircle className="h-4 w-4 mr-1" />Duyệt</>}
                </Button>
              </>
            )}
            {reviewing?.status === 'pending' && isClosedBatch(reviewing?.batch_id ?? 0) && (
              <span className="text-xs text-amber-600 flex items-center gap-1">
                <Lock className="h-3.5 w-3.5" />Đợt đã đóng — không thể duyệt
              </span>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Intern Tab ───────────────────────────────────────────────
function InternTab({ profiles, batches, isLoading, totalCount, internSearch, setInternSearch,
  internBatchFilter, setInternBatchFilter, deptFilter, setDeptFilter, allProfiles, onImport, onAdd, onAssignMentor }: {
  profiles: InternProfile[], batches: any, isLoading: boolean, totalCount: number,
  internSearch: string, setInternSearch: (v: string) => void,
  internBatchFilter: string, setInternBatchFilter: (v: string) => void,
  deptFilter: string, setDeptFilter: (v: string) => void,
  allProfiles: InternProfile[],
  onImport: () => void, onAdd: () => void, onAssignMentor: (p: InternProfile) => void
}) {
  const { toast } = useToast()
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [detailProfile, setDetailProfile] = useState<InternProfile | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editingProfile, setEditingProfile] = useState<InternProfile | null>(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const updateUserProfile = useUpdateUserProfile()
  const { data: detail, isLoading: detailLoading } = useInternDetail(detailProfile?.id ?? null)
  const updateProfile = useUpdateProfile()
  const bulkStatus = useBulkUpdateStatus()

  const taskStatusLabelsLocal: Record<string, string> = {
    new: 'Chưa nộp', submitted: 'Đã nộp', request_change: 'Cần sửa',
    approved: 'Đã duyệt', overdue: 'Quá hạn',
  }
  const taskStatusColorsLocal: Record<string, string> = {
    new: 'bg-gray-100 text-gray-700', submitted: 'bg-blue-100 text-blue-700',
    request_change: 'bg-orange-100 text-orange-700',
    approved: 'bg-green-100 text-green-700', overdue: 'bg-red-100 text-red-700',
  }

  const filtered = profiles.filter(p => {
    const matchStatus = statusFilter === 'all' || p.intern_status === statusFilter
    const matchDept = deptFilter === 'all' || p.department === deptFilter
    return matchStatus && matchDept
  })

  const isInternBatchClosed = (batchId: number) => {
    const b = (batches as any[])?.find((x: any) => x.id === batchId)
    return b ? b.status === 'closed' : false
  }

  const pagedProfiles = useMemo(() =>
    filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page, pageSize])

  const allChecked = pagedProfiles.length > 0 && pagedProfiles.every(p => selectedIds.includes(p.id))
  const toggleAll = () => {
    const pageIds = pagedProfiles.map(p => p.id)
    if (allChecked) setSelectedIds(prev => prev.filter(id => !pageIds.includes(id)))
    else setSelectedIds(prev => [...new Set([...prev, ...pageIds])])
  }
  const toggleOne = (id: number) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const handleBulkStatus = async (s: InternStatus) => {
    if (!selectedIds.length) return
    try {
      await bulkStatus.mutateAsync({ profileIds: selectedIds, internStatus: s })
      toast({ title: 'Thành công', description: `Đã cập nhật ${selectedIds.length} hồ sơ` })
      setSelectedIds([])
    } catch { toast({ title: 'Lỗi', description: 'Có lỗi xảy ra' }) }
  }

  const handleSaveEdit = async () => {
    if (!editingProfile) return
    try {
      await updateUserProfile.mutateAsync({
        userId: editingProfile.user_id,
        data: {
          full_name: editingProfile.user_full_name, phone: editingProfile.user_phone,
          gender: editingProfile.gender === 'none' ? '' : editingProfile.gender,
          date_of_birth: editingProfile.date_of_birth,
          address: editingProfile.address, university: editingProfile.university,
          gpa: editingProfile.gpa, cv_link: editingProfile.cv_link,
          department: editingProfile.department === 'none' ? '' : editingProfile.department,
          intern_status: editingProfile.intern_status,
        }
      })
      toast({ title: 'Thành công', description: 'Đã cập nhật hồ sơ' })
      setEditOpen(false)
    } catch { toast({ title: 'Lỗi', description: 'Có lỗi xảy ra' }) }
  }

  // Helper mở edit, kiểm tra lock
  const openEdit = (profile: InternProfile) => {
    if (isInternBatchClosed(profile.batch_id)) return
    setEditingProfile({ ...profile })
    setEditOpen(true)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Quản lý thực tập sinh</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onImport}><Upload className="h-4 w-4 mr-2" />Import Excel</Button>
            <Button onClick={onAdd}><UserPlus className="h-4 w-4 mr-2" />Thêm thủ công</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Tìm kiếm thực tập sinh..." value={internSearch}
              onChange={e => { setInternSearch(e.target.value); setPage(1) }} className="pl-10" />
          </div>
          <Select value={internBatchFilter} onValueChange={v => { setInternBatchFilter(v); setPage(1) }}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Đợt thực tập" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả đợt</SelectItem>
              {batches?.map((b: any) => <SelectItem key={b.id} value={b.id.toString()}>{b.batch_name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={deptFilter} onValueChange={v => { setDeptFilter(v); setPage(1) }}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Phòng ban" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả phòng ban</SelectItem>
              {[...new Set(allProfiles.map(p => p.department).filter((d): d is string => !!d))].length > 0
                ? [...new Set(allProfiles.map(p => p.department).filter((d): d is string => !!d))].map(dept => (
                  <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                ))
                : DEFAULT_DEPARTMENTS.map(dept => (
                  <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                ))
              }
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1) }}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Trạng thái" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả trạng thái</SelectItem>
              <SelectItem value="active">Đang làm</SelectItem>
              <SelectItem value="quit">Đã nghỉ</SelectItem>
              <SelectItem value="completed">Hoàn thành</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {selectedIds.length > 0 && (
          <div className="flex items-center gap-3 mb-3 p-3 bg-blue-50 rounded-lg flex-wrap">
            <span className="text-sm font-medium text-blue-700">Đã chọn {selectedIds.length} TTS</span>
            {selectedIds.some(id => {
              const p = profiles.find(x => x.id === id)
              return isInternBatchClosed(p?.batch_id ?? 0) || p?.intern_status === 'quit' || p?.intern_status === 'completed'
            }) ? (
              <span className="text-xs text-amber-600 flex items-center gap-1">
                <Lock className="h-3.5 w-3.5" />Một số TTS đã nghỉ/hoàn thành hoặc thuộc đợt đã đóng
              </span>
            ) : (
              <>
                <span className="text-sm text-muted-foreground">Đổi trạng thái:</span>
                {(['active', 'completed', 'quit'] as InternStatus[]).map(s => (
                  <Button key={s} size="sm" variant="outline" className={INTERN_STATUS_LABELS[s].color} onClick={() => handleBulkStatus(s)}>
                    {INTERN_STATUS_LABELS[s].label}
                  </Button>
                ))}
              </>
            )}
            <Button size="sm" variant="ghost" onClick={() => setSelectedIds([])}>Bỏ chọn</Button>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center h-64 items-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : (
          <>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <input type="checkbox" checked={allChecked} onChange={toggleAll} className="rounded border-gray-300 cursor-pointer" />
                    </TableHead>
                    <TableHead>Họ tên</TableHead><TableHead>Email</TableHead><TableHead>Phòng ban</TableHead><TableHead>Trường</TableHead>
                    <TableHead>GPA</TableHead><TableHead>Đợt</TableHead><TableHead>Mentor</TableHead>
                    <TableHead>Trạng thái</TableHead><TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedProfiles.length === 0 ? (
                    <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">Không có thực tập sinh nào</TableCell></TableRow>
                  ) : pagedProfiles.map(profile => (
                    <TableRow key={profile.id} className={selectedIds.includes(profile.id) ? 'bg-blue-50/40' : ''}>
                      <TableCell>
                        {/* Không cho chọn TTS thuộc đợt đã đóng */}
                        {isInternBatchClosed(profile.batch_id) ? (
                          <Lock className="h-3.5 w-3.5 text-gray-300" />
                        ) : (
                          <input type="checkbox" checked={selectedIds.includes(profile.id)} onChange={() => toggleOne(profile.id)} className="rounded border-gray-300 cursor-pointer" />
                        )}
                      </TableCell>
                      <TableCell className="font-medium cursor-pointer hover:text-blue-600" onClick={() => { setDetailProfile(profile); setDetailOpen(true) }}>{profile.user_full_name}</TableCell>
                      <TableCell>{profile.user_email}</TableCell>
                      <TableCell>
                        {profile.department
                          ? <Badge className="bg-purple-50 text-purple-700 border-purple-200 text-xs font-normal">{profile.department}</Badge>
                          : <span className="text-gray-300 text-xs">—</span>}
                      </TableCell>
                      <TableCell>{profile.university || '-'}</TableCell>
                      <TableCell>{profile.gpa || '-'}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <span>{profile.batch_name}</span>
                          {isInternBatchClosed(profile.batch_id) && (
                            <Badge className="bg-gray-100 text-gray-500 text-[10px] py-0 w-fit">Đã đóng</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{profile.mentor_name || <span className="text-muted-foreground text-sm">Chưa phân công</span>}</TableCell>
                      <TableCell>
                        <Badge
                          className={`whitespace-nowrap inline-flex min-w-[96px] items-center justify-center px-3 py-1 leading-none ${
                            INTERN_STATUS_LABELS[profile.intern_status]?.color || 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {INTERN_STATUS_LABELS[profile.intern_status]?.label || profile.intern_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => { setDetailProfile(profile); setDetailOpen(true) }} title="Xem chi tiết">
                            <Eye className="h-4 w-4" />
                          </Button>
                          {isInternBatchClosed(profile.batch_id) ? (
                            // Đợt đã đóng: ẩn hết nút thao tác, chỉ hiện icon khóa
                            <span className="flex items-center px-2" title="Đợt đã đóng — không thể thao tác">
                              <Lock className="h-4 w-4 text-gray-300" />
                            </span>
                          ) : (
                            <>
                              <Button variant="ghost" size="icon"
                                disabled={profile.intern_status === 'quit' || profile.intern_status === 'completed'}
                                title={profile.intern_status === 'quit' ? 'TTS đã nghỉ' : profile.intern_status === 'completed' ? 'TTS đã hoàn thành' : 'Chỉnh sửa'}
                                className={profile.intern_status === 'quit' || profile.intern_status === 'completed' ? 'opacity-30 cursor-not-allowed' : ''}
                                onClick={() => openEdit(profile)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon"
                                disabled={profile.intern_status === 'quit' || profile.intern_status === 'completed'}
                                title={profile.intern_status === 'quit' ? 'TTS đã nghỉ' : profile.intern_status === 'completed' ? 'TTS đã hoàn thành' : 'Phân công Mentor'}
                                className={profile.intern_status === 'quit' || profile.intern_status === 'completed' ? 'opacity-30 cursor-not-allowed' : ''}
                                onClick={() => { if (profile.intern_status !== 'quit' && profile.intern_status !== 'completed') onAssignMentor(profile) }}>
                                <UserPlus className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <PaginationBar currentPage={page} totalItems={filtered.length} pageSize={pageSize}
              onPageChange={setPage} onPageSizeChange={s => { setPageSize(s); setPage(1) }} />
          </>
        )}
      </CardContent>

      {/* Detail Modal */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-blue-600" />Chi tiết thực tập sinh</DialogTitle></DialogHeader>
          {detailLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : detail && (
            <div className="space-y-5">
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Thông tin cá nhân</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Họ tên:</span><span className="ml-2 font-medium">{detail.full_name}</span></div>
                  <div><span className="text-muted-foreground">Email:</span><span className="ml-2">{detail.email}</span></div>
                  <div><span className="text-muted-foreground">SĐT:</span><span className="ml-2">{detail.phone || '-'}</span></div>
                  <div><span className="text-muted-foreground">Trường:</span><span className="ml-2">{detail.university || '-'}</span></div>
                  <div><span className="text-muted-foreground">GPA:</span><span className="ml-2">{detail.gpa || '-'}</span></div>
                  <div><span className="text-muted-foreground">Giới tính:</span><span className="ml-2">{detail.gender || '-'}</span></div>
                  <div><span className="text-muted-foreground">Phòng ban:</span><span className="ml-2">{detail.department || '-'}</span></div>
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">Link CV:</span>
                    {detail.cv_link
                      ? <a href={detail.cv_link} target="_blank" rel="noopener noreferrer"
                          className="ml-2 text-blue-600 hover:underline flex items-center gap-1 text-xs">
                          Xem CV <ExternalLink className="h-3 w-3" />
                        </a>
                      : <span className="ml-2 text-gray-400">—</span>}
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Thông tin thực tập</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Đợt:</span><span className="ml-2 font-medium">{detail.batch_name}</span></div>
                  <div><span className="text-muted-foreground">Mentor:</span><span className="ml-2">{detail.mentor_name || 'Chưa phân công'}</span></div>
                  <div className="flex items-center">
                    <span className="text-muted-foreground">Trạng thái:</span>
                    <Badge
                      className={`ml-2 whitespace-nowrap inline-flex min-w-[96px] items-center justify-center px-3 py-1 leading-none ${
                        INTERN_STATUS_LABELS[detail.intern_status]?.color
                      }`}
                    >
                      {INTERN_STATUS_LABELS[detail.intern_status]?.label}
                    </Badge>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-3 flex items-center gap-2"><ClipboardList className="h-4 w-4" />Lịch sử nhiệm vụ<Badge className="bg-gray-100 text-gray-700">{detail.tasks.length}</Badge></h4>
                {detail.tasks.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground text-sm bg-gray-50 rounded-lg">Chưa có nhiệm vụ nào</div>
                ) : (
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow><TableHead>Tên nhiệm vụ</TableHead><TableHead>Deadline</TableHead><TableHead>Trạng thái</TableHead></TableRow>
                      </TableHeader>
                      <TableBody>
                        {detail.tasks.map(task => (
                          <TableRow key={task.id}>
                            <TableCell className="font-medium">{task.title}</TableCell>
                            <TableCell className="text-sm">{formatDate(task.deadline)}</TableCell>
                            <TableCell><Badge className={taskStatusColorsLocal[task.status]}>{taskStatusLabelsLocal[task.status]}</Badge></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOpen(false)}>Đóng</Button>
            {/* Chỉ hiện nút Chỉnh sửa nếu đợt chưa đóng */}
            {detailProfile && !isInternBatchClosed(detailProfile.batch_id) && (
              <Button onClick={() => { setDetailOpen(false); openEdit(detailProfile) }}>
                <Pencil className="h-4 w-4 mr-2" />Chỉnh sửa
              </Button>
            )}
            {detailProfile && isInternBatchClosed(detailProfile.batch_id) && (
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <Lock className="h-3.5 w-3.5" />Đợt đã đóng
              </span>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Pencil className="h-5 w-5" />Chỉnh sửa hồ sơ</DialogTitle></DialogHeader>
          {editingProfile && (
            <div className="space-y-4">
              <div className="space-y-2"><label className="text-sm font-medium">Email</label><Input value={editingProfile.user_email || ''} disabled className="bg-gray-50 text-muted-foreground" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><label className="text-sm font-medium">Họ tên</label><Input value={editingProfile.user_full_name || ''} onChange={e => setEditingProfile({ ...editingProfile, user_full_name: e.target.value })} /></div>
                <div className="space-y-2"><label className="text-sm font-medium">Số điện thoại</label><Input value={editingProfile.user_phone || ''} onChange={e => setEditingProfile({ ...editingProfile, user_phone: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Giới tính</label>
                  <Select
                    value={editingProfile.gender || 'none'}
                    onValueChange={v => setEditingProfile({ ...editingProfile, gender: v === 'none' ? '' : v })}
                  >
                    <SelectTrigger><SelectValue placeholder="Chọn giới tính" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Chưa chọn</SelectItem>
                      <SelectItem value="male">Nam</SelectItem>
                      <SelectItem value="female">Nữ</SelectItem>
                      <SelectItem value="other">Khác</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><label className="text-sm font-medium">Ngày sinh</label><Input type="date" value={editingProfile.date_of_birth || ''} onChange={e => setEditingProfile({ ...editingProfile, date_of_birth: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><label className="text-sm font-medium">Trường đại học</label><Input value={editingProfile.university || ''} onChange={e => setEditingProfile({ ...editingProfile, university: e.target.value })} /></div>
                <div className="space-y-2"><label className="text-sm font-medium">GPA</label><Input type="number" step="0.1" min="0" max="4" value={editingProfile.gpa || ''} onChange={e => setEditingProfile({ ...editingProfile, gpa: parseFloat(e.target.value) || undefined })} /></div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1">
                  Link CV
                  {editingProfile.cv_link && (
                    <a href={editingProfile.cv_link} target="_blank" rel="noopener noreferrer"
                      className="ml-1 text-blue-500 hover:text-blue-700" title="Mở CV">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </label>
                <Input
                  type="url"
                  placeholder="https://drive.google.com/..."
                  value={editingProfile.cv_link || ''}
                  onChange={e => setEditingProfile({ ...editingProfile, cv_link: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Phòng ban</label>
                <Select
                  value={editingProfile.department || 'none'}
                  onValueChange={v => setEditingProfile({ ...editingProfile, department: v === 'none' ? '' : v })}
                >
                  <SelectTrigger><SelectValue placeholder="Chọn phòng ban" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Chưa phân công</SelectItem>
                    {[...new Set(allProfiles.map(p => p.department).filter((d): d is string => !!d))].length > 0
                      ? [...new Set(allProfiles.map(p => p.department).filter((d): d is string => !!d))].map(d => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))
                      : DEFAULT_DEPARTMENTS.map(d => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Trạng thái thực tập</label>
                <Select value={editingProfile.intern_status} onValueChange={v => setEditingProfile({ ...editingProfile, intern_status: v as InternStatus })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Đang làm</SelectItem>
                    <SelectItem value="completed">Hoàn thành</SelectItem>
                    <SelectItem value="quit">Đã nghỉ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Hủy</Button>
            <Button onClick={handleSaveEdit} disabled={updateUserProfile.isPending}>
              {updateUserProfile.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Lưu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

// ─── Main HRDashboard ──────────────────────────────────────────
export default function HRDashboard() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<TabType>('overview')

  const { data: batches, isLoading: batchesLoading } = useBatches()
  const { data: profiles, isLoading: profilesLoading } = useInternProfiles()
  const { data: tasks, isLoading: tasksLoading } = useTasks()
  const { data: leaveRequests = [] } = useLeaveRequests()
  const { data: evaluations = [] } = useEvaluations()
  const deleteBatch = useDeleteBatch()
  const updateBatch = useUpdateBatch()

  const [togglingBatchId, setTogglingBatchId] = useState<number | null>(null)
  const [batchFormOpen, setBatchFormOpen] = useState(false)
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null)
  const [detailBatch, setDetailBatch] = useState<Batch | null>(null)
  const [detailBatchOpen, setDetailBatchOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingBatch, setDeletingBatch] = useState<Batch | null>(null)
  const [importExcelOpen, setImportExcelOpen] = useState(false)
  const [assignMentorOpen, setAssignMentorOpen] = useState(false)
  const [selectedProfile, setSelectedProfile] = useState<InternProfile | null>(null)
  const [addInternOpen, setAddInternOpen] = useState(false)
  const [batchSearch, setBatchSearch] = useState('')
  const [batchStatusFilter, setBatchStatusFilter] = useState('all')
  const [batchPage, setBatchPage] = useState(1)
  const [batchPageSize, setBatchPageSize] = useState(10)
  const [internSearch, setInternSearch] = useState('')
  const [internBatchFilter, setInternBatchFilter] = useState('all')
  const [internDeptFilter, setInternDeptFilter] = useState('all')

  const pendingLeaveCount = leaveRequests.filter(r => r.status === 'pending').length
  const pendingEvalCount = evaluations.filter(e => e.approval_status === 'pending').length

  const stats = useMemo(() => {
    const completedTasks = tasks?.filter(t => t.status === 'approved').length || 0
    const totalTasks = tasks?.length || 0
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
    return {
      openBatches: batches?.filter(b => b.status === 'open').length || 0,
      totalInterns: profiles?.length || 0,
      totalTasks,
      completedTasks,
      completionRate,
    }
  }, [batches, profiles, tasks])

  const taskStatusData = useMemo(() => {
    if (!tasks) return []
    const counts: Record<string, number> = {}
    tasks.forEach(t => { counts[t.status] = (counts[t.status] || 0) + 1 })
    return Object.entries(counts).map(([status, count]) => ({ name: taskStatusLabels[status] || status, value: count }))
  }, [tasks])

  const internsPerBatchData = useMemo(() => {
    if (!batches || !profiles) return []
    return batches.map(batch => ({
      name: batch.batch_name,
      'Thực tập sinh': profiles.filter(p => p.batch_id === batch.id).length,
    }))
  }, [batches, profiles])

  const filteredBatches = useMemo(() => {
    if (!batches) return []
    return batches.filter(b =>
      b.batch_name.toLowerCase().includes(batchSearch.toLowerCase()) &&
      (batchStatusFilter === 'all' || b.status === batchStatusFilter)
    )
  }, [batches, batchSearch, batchStatusFilter])

  const pagedBatches = useMemo(() =>
    filteredBatches.slice((batchPage - 1) * batchPageSize, batchPage * batchPageSize),
    [filteredBatches, batchPage, batchPageSize])

  const filteredProfiles = useMemo(() => {
    if (!profiles) return []
    return profiles.filter(p =>
      (p.user_full_name.toLowerCase().includes(internSearch.toLowerCase()) ||
        p.user_email.toLowerCase().includes(internSearch.toLowerCase())) &&
      (internBatchFilter === 'all' || p.batch_id.toString() === internBatchFilter) &&
      (internDeptFilter === 'all' || p.department === internDeptFilter)
    )
  }, [profiles, internSearch, internBatchFilter, internDeptFilter])

  const handleToggleStatus = async (batch: Batch) => {
    const newStatus = batch.status === 'open' ? 'closed' : 'open'
    setTogglingBatchId(batch.id)
    try {
      await updateBatch.mutateAsync({ batchId: batch.id, data: { status: newStatus } })
      toast({
        title: newStatus === 'closed' ? '🔒 Đã đóng đợt' : '🔓 Đã mở đợt',
        description: batch.batch_name,
      })
    } catch (error: any) {
      toast({ title: 'Lỗi', description: error.response?.data?.detail || 'Không thể cập nhật trạng thái' })
    } finally {
      setTogglingBatchId(null)
    }
  }

  const handleDeleteBatchConfirm = async () => {
    if (!deletingBatch) return
    try {
      await deleteBatch.mutateAsync(deletingBatch.id)
      toast({ title: 'Thành công', description: 'Đã xóa đợt thực tập' })
      setDeleteDialogOpen(false); setDeletingBatch(null)
    } catch (error: any) {
      toast({ title: 'Không thể xóa', description: error.response?.data?.detail || 'Có lỗi xảy ra' })
      setDeleteDialogOpen(false)
    }
  }

  const isLoading = batchesLoading || profilesLoading || tasksLoading

  const deletingBatchInternCount = deletingBatch
    ? (profiles?.filter(p => p.batch_id === deletingBatch.id).length || 0)
    : 0
  const deleteBlockReason = deletingBatch
    ? getDeleteBlockReason(deletingBatch, deletingBatchInternCount)
    : null

  const tabs: { key: TabType; label: string; icon: React.ReactNode; badge?: number }[] = [
    { key: 'overview', label: 'Tổng quan', icon: <BarChart3 className="h-4 w-4 shrink-0" /> },
    { key: 'batches', label: 'Đợt thực tập', icon: <Calendar className="h-4 w-4 shrink-0" /> },
    { key: 'interns', label: 'Thực tập sinh', icon: <Users className="h-4 w-4 shrink-0" /> },
    { key: 'tasks', label: 'Giám sát nhiệm vụ', icon: <ClipboardList className="h-4 w-4 shrink-0" /> },
    { key: 'schedule', label: 'Lịch thực tập', icon: <CalendarDays className="h-4 w-4 shrink-0" /> },
    { key: 'leaves', label: 'Đơn xin nghỉ', icon: <CalendarOff className="h-4 w-4 shrink-0" />, badge: pendingLeaveCount },
    { key: 'evaluations', label: 'Đánh giá', icon: <Award className="h-4 w-4 shrink-0" />, badge: pendingEvalCount },
    { key: 'statistics', label: 'Thống kê', icon: <BarChart3 className="h-4 w-4 shrink-0" /> },
  ]

  return (
    <DashboardLayout role="hr" activeTab={activeTab} onTabChange={(t) => setActiveTab(t as TabType)} pendingLeaveCount={pendingLeaveCount}>
      <div className="space-y-5">

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Thực tập sinh" value={stats.totalInterns}
            sub={`${batches?.filter(b => b.status === 'open').length || 0} đợt đang mở`}
            icon={<Users className="h-5 w-5 text-white" />}
            gradient="bg-gradient-to-br from-[#0f2d6b] via-[#1a3d8a] to-[#1e56b0]"
            accentColor="text-blue-200" progress={100}
          />
          <StatCard
            label="Tổng nhiệm vụ" value={stats.totalTasks}
            sub={`${stats.completionRate}% hoàn thành`}
            icon={<ClipboardList className="h-5 w-5 text-white" />}
            gradient="bg-gradient-to-br from-[#4c1d95] via-[#6d28d9] to-[#7c3aed]"
            accentColor="text-purple-200" progress={stats.completionRate}
          />
          <StatCard
            label="Đã hoàn thành" value={stats.completedTasks}
            sub={`${stats.totalTasks - stats.completedTasks} nhiệm vụ còn lại`}
            icon={<BarChart3 className="h-5 w-5 text-white" />}
            gradient="bg-gradient-to-br from-[#064e3b] via-[#065f46] to-[#047857]"
            accentColor="text-emerald-200" progress={stats.completionRate}
          />
          <StatCard
            label="Chờ xử lý" value={pendingLeaveCount + pendingEvalCount}
            sub={`${pendingLeaveCount} đơn nghỉ · ${pendingEvalCount} đánh giá`}
            icon={<Clock className="h-5 w-5 text-white" />}
            gradient={(pendingLeaveCount + pendingEvalCount) > 0
              ? 'bg-gradient-to-br from-[#78350f] via-[#92400e] to-[#b45309]'
              : 'bg-gradient-to-br from-[#374151] via-[#4b5563] to-[#6b7280]'}
            accentColor={(pendingLeaveCount + pendingEvalCount) > 0 ? 'text-amber-200' : 'text-gray-300'}
          />
        </div>

        {/* Tab bar */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="h-[3px] w-full bg-gradient-to-r from-[#0f2d6b] via-[#2563eb] to-[#0f2d6b]" />
          <div className="flex h-auto w-full items-stretch gap-0 overflow-x-auto">
            {tabs.map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`relative flex flex-1 min-w-0 items-center justify-center gap-1.5 border-b-[3px] px-3 py-3.5 text-[11px] font-semibold whitespace-nowrap transition-all duration-150 ${activeTab === tab.key
                  ? 'border-[#0f2d6b] bg-blue-50/70 text-[#0f2d6b]'
                  : 'border-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                  }`}>
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white bg-orange-500">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab contents */}
        <div>
          {activeTab === 'overview' && (
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader><CardTitle>Trạng thái nhiệm vụ</CardTitle></CardHeader>
                <CardContent>
                  {taskStatusData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie data={taskStatusData} cx="50%" cy="50%" outerRadius={80} dataKey="value" labelLine={false}
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                          {taskStatusData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                        </Pie>
                        <Tooltip /><Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : <div className="flex items-center justify-center h-[300px] text-muted-foreground">Chưa có dữ liệu</div>}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Thực tập sinh theo đợt</CardTitle></CardHeader>
                <CardContent>
                  {internsPerBatchData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={internsPerBatchData}>
                        <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip />
                        <Bar dataKey="Thực tập sinh" fill="#3b82f6" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <div className="flex items-center justify-center h-[300px] text-muted-foreground">Chưa có dữ liệu</div>}
                </CardContent>
              </Card>
              <Card className="md:col-span-2">
                <CardHeader><CardTitle>Tổng quan nhiệm vụ</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {[
                      { label: 'Chưa nộp', status: 'new', bg: 'bg-gray-50', icon: <Clock className="h-8 w-8 text-gray-500" /> },
                      { label: 'Đã nộp', status: 'submitted', bg: 'bg-blue-50', icon: <ClipboardList className="h-8 w-8 text-blue-600" /> },
                      { label: 'Cần sửa', status: 'request_change', bg: 'bg-orange-50', icon: <AlertCircle className="h-8 w-8 text-orange-600" /> },
                      { label: 'Đã duyệt', status: 'approved', bg: 'bg-green-50', icon: <CheckCircle className="h-8 w-8 text-green-600" /> },
                      { label: 'Quá hạn', status: 'overdue', bg: 'bg-red-50', icon: <AlertCircle className="h-8 w-8 text-red-600" /> },
                    ].map(s => (
                      <div key={s.label} className={`flex items-center gap-3 p-3 ${s.bg} rounded-lg`}>
                        {s.icon}
                        <div>
                          <p className="text-2xl font-bold">{tasks?.filter(t => t.status === s.status).length || 0}</p>
                          <p className="text-sm text-muted-foreground">{s.label}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'batches' && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Quản lý đợt thực tập</CardTitle>
                  <Button onClick={() => { setEditingBatch(null); setBatchFormOpen(true) }}>
                    <Plus className="h-4 w-4 mr-2" />Tạo đợt mới
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Tìm kiếm đợt thực tập..." value={batchSearch}
                      onChange={e => { setBatchSearch(e.target.value); setBatchPage(1) }} className="pl-10" />
                  </div>
                  <Select value={batchStatusFilter} onValueChange={v => { setBatchStatusFilter(v); setBatchPage(1) }}>
                    <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Trạng thái" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả</SelectItem>
                      <SelectItem value="open">Đang mở</SelectItem>
                      <SelectItem value="closed">Đã đóng</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {isLoading ? (
                  <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                ) : (
                  <>
                    <div className="border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Tên đợt</TableHead><TableHead>Thời gian</TableHead>
                            <TableHead>Số TTS</TableHead><TableHead>Trạng thái</TableHead>
                            <TableHead className="text-right">Thao tác</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pagedBatches.length === 0 ? (
                            <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Không có đợt thực tập nào</TableCell></TableRow>
                          ) : pagedBatches.map(batch => {
                            const internCount = profiles?.filter(p => p.batch_id === batch.id).length || 0
                            const blockReason = getDeleteBlockReason(batch, internCount)
                            const canDelete = !blockReason
                            const closed = isBatchClosed(batch)
                            return (
                              <TableRow key={batch.id} className={closed ? 'opacity-60' : ''}>
                                <TableCell
                                  className="font-medium cursor-pointer hover:text-blue-600 hover:underline"
                                  onClick={() => { setDetailBatch(batch); setDetailBatchOpen(true) }}
                                >
                                  {batch.batch_name}
                                </TableCell>
                                <TableCell>{formatDate(batch.start_date)} - {formatDate(batch.end_date)}</TableCell>
                                <TableCell>{internCount}</TableCell>
                                <TableCell>
                                  <Badge className={batchStatusColors[batch.status]}>
                                    {batchStatusLabels[batch.status]}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end items-center gap-1">
                                    {/* Chỉ cho chỉnh sửa đợt đang mở */}
                                    {!closed && (
                                      <Button variant="ghost" size="icon" title="Chỉnh sửa đợt thực tập"
                                        onClick={() => { setEditingBatch(batch); setBatchFormOpen(true) }}>
                                        <Pencil className="h-4 w-4 text-blue-500" />
                                      </Button>
                                    )}
                                    <Button variant="ghost" size="sm"
                                      title={batch.status === 'open' ? 'Đóng đợt' : 'Mở đợt'}
                                      disabled={togglingBatchId === batch.id}
                                      className={batch.status === 'open'
                                        ? 'text-orange-600 hover:text-orange-700 hover:bg-orange-50 gap-1 text-xs'
                                        : 'text-green-600 hover:text-green-700 hover:bg-green-50 gap-1 text-xs'}
                                      onClick={() => handleToggleStatus(batch)}>
                                      {togglingBatchId === batch.id
                                        ? <Loader2 className="h-4 w-4 animate-spin" />
                                        : batch.status === 'open'
                                          ? <><Lock className="h-3.5 w-3.5" />Đóng</>
                                          : <><Unlock className="h-3.5 w-3.5" />Mở</>
                                      }
                                    </Button>
                                    <Button variant="ghost" size="icon"
                                      title={blockReason ?? 'Xóa đợt thực tập'}
                                      disabled={!canDelete}
                                      className={canDelete ? 'text-destructive hover:text-destructive' : 'text-gray-300 cursor-not-allowed'}
                                      onClick={() => { if (!canDelete) return; setDeletingBatch(batch); setDeleteDialogOpen(true) }}>
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>
                    <PaginationBar currentPage={batchPage} totalItems={filteredBatches.length} pageSize={batchPageSize}
                      onPageChange={setBatchPage} onPageSizeChange={s => { setBatchPageSize(s); setBatchPage(1) }} />
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === 'interns' && (
            <InternTab
              profiles={filteredProfiles} batches={batches} isLoading={isLoading}
              totalCount={profiles?.length || 0}
              internSearch={internSearch} setInternSearch={setInternSearch}
              internBatchFilter={internBatchFilter} setInternBatchFilter={setInternBatchFilter}
              deptFilter={internDeptFilter} setDeptFilter={setInternDeptFilter}
              allProfiles={profiles || []}
              onImport={() => setImportExcelOpen(true)}
              onAdd={() => setAddInternOpen(true)}
              onAssignMentor={(p) => { setSelectedProfile(p); setAssignMentorOpen(true) }}
            />
          )}

          {activeTab === 'tasks' && <TasksMonitorTab />}
          {activeTab === 'schedule' && <HRScheduleTab />}
          {activeTab === 'leaves' && <HRLeaveTab />}
          {activeTab === 'evaluations' && <EvaluationReviewTab />}
          {activeTab === 'statistics' && <StatisticsTab />}
        </div>
      </div>

      {/* Dialogs */}
      <BatchFormDialog open={batchFormOpen} onOpenChange={(open) => { setBatchFormOpen(open); if (!open) setEditingBatch(null) }} batch={editingBatch} />
      <BatchDetailDialog batch={detailBatch} open={detailBatchOpen} onOpenChange={setDetailBatchOpen} />
      <DeleteConfirmDialog
        open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteBatchConfirm}
        title="Xóa đợt thực tập"
        description={deleteBlockReason
          ? `⚠️ Không thể xóa: ${deleteBlockReason}`
          : `Bạn có chắc chắn muốn xóa đợt "${deletingBatch?.batch_name}"? Hành động này không thể hoàn tác.`}
        isLoading={deleteBatch.isPending}
      />
      <ImportExcelDialog open={importExcelOpen} onOpenChange={setImportExcelOpen} />
      <AssignMentorDialog open={assignMentorOpen} onOpenChange={setAssignMentorOpen} profile={selectedProfile} />
      <AddInternDialog open={addInternOpen} onOpenChange={setAddInternOpen} />
    </DashboardLayout>
  )
}