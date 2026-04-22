import { useState, useMemo } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuPortal,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Users, ClipboardList, CheckCircle, Clock, Plus, Search,
  MoreHorizontal, Edit, Trash, Eye, Award, Lock, MessageSquare,
  FileText, Download, ExternalLink, Trash2, CalendarDays, Filter, X,
  Bell, ChevronDown, ChevronUp,
} from 'lucide-react'
import { useTasks, useDeleteTask, type Task } from '@/hooks/use-tasks'
import { useInternProfiles, type InternProfile } from '@/hooks/use-profiles'
import { useEvaluations, type Evaluation } from '@/hooks/use-evaluations'
import { useBatches } from '@/hooks/use-batches'
import { useDocuments, useDeleteDocument, formatFileSize } from '@/hooks/use-documents'
import TaskFormDialog from '@/components/mentor/TaskFormDialog'
import TaskReportReviewDialog from '@/components/mentor/TaskReportReviewDialog'
import EvaluationFormDialog from '@/components/mentor/EvaluationFormDialog'
import DeleteConfirmDialog from '@/components/admin/DeleteConfirmDialog'
import InternDetailDialog from '@/components/mentor/InternDetailDialog'
import TaskChatDialog from '@/components/mentor/TaskChatDialog'
import DocumentUploadDialog from '@/components/mentor/DocumentUploadDialog'
import WeeklyFeedbackSection from '@/components/mentor/WeeklyFeedbackSection'
import MentorScheduleTab from '@/components/mentor/MentorScheduleTab'
import PaginationBar from '@/components/ui/pagination-bar'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { useWeeklyFeedbackStatus } from '@/hooks/use-weekly-feedbacks'
import EvaluationsTab from '@/components/mentor/EvaluationsTab'

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive'; cls?: string }> = {
  new:            { label: 'Mới',          variant: 'secondary' },
  submitted:      { label: 'Đã nộp',       variant: 'default' },
  request_change: { label: 'Yêu cầu sửa', variant: 'destructive' },
  approved:       { label: 'Đã duyệt',    variant: 'secondary', cls: 'bg-green-100 text-green-800' },
  overdue:        { label: 'Quá hạn',     variant: 'destructive' },
}

const rankingColors: Record<string, string> = {
  'Xuất sắc':   'bg-purple-100 text-purple-800',
  'Giỏi':       'bg-green-100 text-green-800',
  'Khá':        'bg-blue-100 text-blue-800',
  'Trung bình': 'bg-yellow-100 text-yellow-800',
  'Yếu':        'bg-red-100 text-red-800',
}

const docTypeConfig: Record<string, { label: string; cls: string }> = {
  pdf:   { label: 'PDF',   cls: 'bg-red-50 text-red-700' },
  slide: { label: 'Slide', cls: 'bg-orange-50 text-orange-700' },
  link:  { label: 'Link',  cls: 'bg-blue-50 text-blue-700' },
  other: { label: 'Khác',  cls: 'bg-gray-50 text-gray-700' },
}

function isBatchEnded(endDate?: string, status?: 'open' | 'closed'): boolean {
  if (status === 'closed') return true
  if (!endDate) return false
  return new Date(endDate) < new Date()
}

function getInternshipWeek(taskDeadline: string, batchStartDate?: string): number | null {
  if (!batchStartDate) return null
  const start = new Date(batchStartDate)
  const deadline = new Date(taskDeadline)
  const diffMs = deadline.getTime() - start.getTime()
  if (diffMs < 0) return null
  return Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1
}

const TH = 'text-xs font-semibold text-muted-foreground border-b border-gray-100'
const TR = 'border-b border-gray-100 last:border-0 hover:bg-gray-50/60'
const TD = 'py-3'

// ── Stat Card ──────────────────────────────────────────────────
function StatCard({
  label, value, sub, icon, gradient, accentColor, progress,
}: {
  label: string
  value: number
  sub: string
  icon: React.ReactNode
  gradient: string
  accentColor: string
  progress?: number
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
        <div className="flex items-baseline gap-1.5">
          <span className="text-[2.5rem] font-extrabold leading-none tracking-tight">{value}</span>
        </div>
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

export default function MentorDashboard() {
  const { toast } = useToast()
  const { data: tasks = [], isLoading: tasksLoading } = useTasks()
  const { data: interns = [], isLoading: internsLoading } = useInternProfiles()
  const { data: evaluations = [], isLoading: evaluationsLoading } = useEvaluations()
  const { data: batches = [] } = useBatches()
  const { data: documents = [] } = useDocuments()
  const { data: feedbackStatuses = [] } = useWeeklyFeedbackStatus()
  const deleteTask = useDeleteTask()
  const deleteDocument = useDeleteDocument()
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}')

  const [activeTab, setActiveTab] = useState('tasks')
  const [searchTask, setSearchTask] = useState('')
  const [searchIntern, setSearchIntern] = useState('')
  const [selectedFeedbackIntern, setSelectedFeedbackIntern] = useState<InternProfile | null>(null)
  const [collapsedBatches, setCollapsedBatches] = useState<Set<number>>(new Set())

  const [filterBatch, setFilterBatch]   = useState<string>('all')
  const [filterIntern, setFilterIntern] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterWeek, setFilterWeek]     = useState<string>('all')
  const [filterInternBatch, setFilterInternBatch]           = useState<string>('all')
  const [filterEvaluationStatus, setFilterEvaluationStatus] = useState<string>('all')

  const [taskPage, setTaskPage]             = useState(1)
  const [taskPageSize, setTaskPageSize]     = useState(10)
  const [internPage, setInternPage]         = useState(1)
  const [internPageSize, setInternPageSize] = useState(10)

  const [taskFormOpen, setTaskFormOpen]         = useState(false)
  const [selectedTask, setSelectedTask]         = useState<Task | null>(null)
  const [taskReviewOpen, setTaskReviewOpen]     = useState(false)
  const [reviewingTask, setReviewingTask]       = useState<Task | null>(null)
  const [deleteTaskOpen, setDeleteTaskOpen]     = useState(false)
  const [deletingTask, setDeletingTask]         = useState<Task | null>(null)
  const [chatOpen, setChatOpen]                 = useState(false)
  const [chatTask, setChatTask]                 = useState<Task | null>(null)
  const [evaluationOpen, setEvaluationOpen]     = useState(false)
  const [selectedIntern, setSelectedIntern]     = useState<InternProfile | null>(null)
  const [existingEvaluation, setExistingEvaluation] = useState<Evaluation | null>(null)
  const [internDetailOpen, setInternDetailOpen] = useState(false)
  const [detailIntern, setDetailIntern]         = useState<InternProfile | null>(null)
  const [docUploadOpen, setDocUploadOpen]       = useState(false)
  const [deletingDocId, setDeletingDocId]       = useState<number | null>(null)

  const totalInterns   = interns.length
  const totalTasks     = tasks.length
  const approvedTasks  = tasks.filter(t => t.status === 'approved').length
  const pendingTasks   = tasks.filter(t => t.status === 'submitted').length
  const overdueTasks   = tasks.filter(t => t.status === 'overdue').length
  const completionRate = totalTasks > 0 ? Math.round((approvedTasks / totalTasks) * 100) : 0
  const pendingFeedbackCount = feedbackStatuses.filter(s => s.batch_status === 'open' && !s.has_feedback_this_week).length

  const weekOptions = useMemo(() => {
    const batch = filterBatch !== 'all' ? batches.find(b => b.id === Number(filterBatch)) : null
    if (!batch?.start_date) return []
    const weeks = new Set<number>()
    tasks.filter(t => filterBatch !== 'all' ? t.batch_id === Number(filterBatch) : true)
      .forEach(t => { const w = getInternshipWeek(t.deadline, batch.start_date); if (w !== null && w > 0) weeks.add(w) })
    return Array.from(weeks).sort((a, b) => a - b)
  }, [tasks, batches, filterBatch])

  const internOptions = useMemo(() => {
    const map = new Map<string, string>()
    ;(filterBatch !== 'all' ? tasks.filter(t => t.batch_id === Number(filterBatch)) : tasks)
      .forEach(t => map.set(t.intern_name, t.intern_name))
    return Array.from(map.entries())
  }, [tasks, filterBatch])

  const filteredTasks = useMemo(() => {
    const selectedBatch = filterBatch !== 'all' ? batches.find(b => b.id === Number(filterBatch)) : null
    return tasks.filter(t => {
      if (searchTask) {
        const q = searchTask.toLowerCase()
        if (!t.title.toLowerCase().includes(q) && !t.intern_name.toLowerCase().includes(q)) return false
      }
      if (filterBatch !== 'all' && t.batch_id !== Number(filterBatch)) return false
      if (filterIntern !== 'all' && t.intern_name !== filterIntern) return false
      if (filterStatus !== 'all' && t.status !== filterStatus) return false
      if (filterWeek !== 'all' && selectedBatch?.start_date) {
        if (getInternshipWeek(t.deadline, selectedBatch.start_date) !== Number(filterWeek)) return false
      }
      return true
    })
  }, [tasks, searchTask, filterBatch, filterIntern, filterStatus, filterWeek, batches])

  const pagedTasks = useMemo(() =>
    filteredTasks.slice((taskPage - 1) * taskPageSize, taskPage * taskPageSize),
    [filteredTasks, taskPage, taskPageSize])

  const getInternEvaluation = (userId: number) => evaluations.find(e => e.intern_id === userId)
  const getBatchInfo        = (batchId: number) => batches.find(b => b.id === batchId)

  const filteredInterns = useMemo(() => interns.filter(i => {
    if (searchIntern) {
      const q = searchIntern.toLowerCase()
      if (!i.user_full_name.toLowerCase().includes(q) && !i.user_email.toLowerCase().includes(q)) return false
    }
    if (filterInternBatch !== 'all' && i.batch_id !== Number(filterInternBatch)) return false
    if (filterEvaluationStatus !== 'all') {
      const has = !!getInternEvaluation(i.user_id)
      if (filterEvaluationStatus === 'evaluated'     && !has) return false
      if (filterEvaluationStatus === 'not_evaluated' &&  has) return false
    }
    return true
  }), [interns, searchIntern, filterInternBatch, filterEvaluationStatus, evaluations])

  const pagedInterns = useMemo(() =>
    filteredInterns.slice((internPage - 1) * internPageSize, internPage * internPageSize),
    [filteredInterns, internPage, internPageSize])

  const activeFilterCount      = [filterBatch, filterIntern, filterStatus, filterWeek].filter(v => v !== 'all').length
  const activeInternFilterCount = [filterInternBatch, filterEvaluationStatus].filter(v => v !== 'all').length

  const resetFilters      = () => { setFilterBatch('all'); setFilterIntern('all'); setFilterStatus('all'); setFilterWeek('all'); setSearchTask(''); setTaskPage(1) }
  const resetInternFilters = () => { setFilterInternBatch('all'); setFilterEvaluationStatus('all'); setSearchIntern(''); setInternPage(1) }
  const toggleCollapseBatch = (id: number) => setCollapsedBatches(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  const handleEditTask   = (t: Task) => { setSelectedTask(t); setTaskFormOpen(true) }
  const handleReviewTask = (t: Task) => { setReviewingTask(t); setTaskReviewOpen(true) }
  const handleDeleteTask = (t: Task) => { setDeletingTask(t); setDeleteTaskOpen(true) }
  const handleOpenChat   = (t: Task) => { setChatTask(t); setChatOpen(true) }
  const handleViewIntern = (i: InternProfile) => { setDetailIntern(i); setInternDetailOpen(true) }

  const handleEvaluate = (intern: InternProfile) => {
    const b = getBatchInfo(intern.batch_id)
    if (!isBatchEnded(b?.end_date, b?.status)) {
      toast({
        title: 'Chưa thể đánh giá',
        description: `Đợt thực tập vẫn đang diễn ra${b?.end_date ? ` đến ${format(new Date(b.end_date), 'dd/MM/yyyy', { locale: vi })}` : ''}. Đánh giá chỉ khả dụng sau khi kết thúc đợt.`,
      })
      return
    }
    setSelectedIntern(intern)
    setExistingEvaluation(evaluations.find(e => e.intern_id === intern.user_id) || null)
    setEvaluationOpen(true)
  }

  const confirmDeleteTask = async () => {
    if (!deletingTask) return
    try { await deleteTask.mutateAsync(deletingTask.id); toast({ title: 'Đã xóa nhiệm vụ' }); setDeleteTaskOpen(false); setDeletingTask(null) }
    catch (e: any) { toast({ title: 'Lỗi', description: e.response?.data?.detail || 'Có lỗi xảy ra' }) }
  }
  const confirmDeleteDoc = async () => {
    if (!deletingDocId) return
    try { await deleteDocument.mutateAsync(deletingDocId); toast({ title: 'Đã xóa tài liệu' }); setDeletingDocId(null) }
    catch { toast({ title: 'Lỗi', description: 'Không thể xóa tài liệu' }) }
  }

  return (
    <DashboardLayout role="mentor" activeTab={activeTab} onTabChange={setActiveTab}>
      <div className="space-y-5">

        {/* ══ STATS ══════════════════════════════════════════════════════ */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="TTS phụ trách" value={totalInterns}
            sub={`${batches.filter(b => b.status === 'open').length} đợt đang mở`}
            icon={<Users className="h-5 w-5 text-white" />}
            gradient="bg-gradient-to-br from-[#0f2d6b] via-[#1a3d8a] to-[#1e56b0]"
            accentColor="text-blue-200" progress={100}
          />
          <StatCard
            label="Nhiệm vụ đã giao" value={totalTasks}
            sub={`${completionRate}% hoàn thành`}
            icon={<ClipboardList className="h-5 w-5 text-white" />}
            gradient="bg-gradient-to-br from-[#4c1d95] via-[#6d28d9] to-[#7c3aed]"
            accentColor="text-purple-200" progress={completionRate}
          />
          <StatCard
            label="Đã hoàn thành" value={approvedTasks}
            sub={`${totalTasks - approvedTasks} nhiệm vụ còn lại`}
            icon={<CheckCircle className="h-5 w-5 text-white" />}
            gradient="bg-gradient-to-br from-[#064e3b] via-[#065f46] to-[#047857]"
            accentColor="text-emerald-200" progress={completionRate}
          />
          <StatCard
            label="Chờ duyệt" value={pendingTasks}
            sub={pendingTasks > 0 ? `${overdueTasks} quá hạn cần xử lý` : 'Không có việc chờ'}
            icon={<Clock className="h-5 w-5 text-white" />}
            gradient={pendingTasks > 0
              ? 'bg-gradient-to-br from-[#78350f] via-[#92400e] to-[#b45309]'
              : 'bg-gradient-to-br from-[#374151] via-[#4b5563] to-[#6b7280]'}
            accentColor={pendingTasks > 0 ? 'text-amber-200' : 'text-gray-300'}
            progress={totalTasks > 0 ? Math.round((pendingTasks / totalTasks) * 100) : 0}
          />
        </div>

        {/* ══ TABS ═══════════════════════════════════════════════════════ */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-0">

          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="h-[3px] w-full bg-gradient-to-r from-[#0f2d6b] via-[#2563eb] to-[#0f2d6b]" />
            <TabsList className="flex h-auto w-full items-stretch gap-0 rounded-none bg-transparent p-0 overflow-x-auto">
              {[
                { value: 'tasks',       label: 'Quản lý nhiệm vụ', icon: <ClipboardList className="h-4 w-4 shrink-0" />, badge: pendingTasks || null,       badgeCls: 'bg-orange-500' },
                { value: 'interns',     label: 'TTS phụ trách',    icon: <Users className="h-4 w-4 shrink-0" />,         badge: null,                        badgeCls: '' },
                { value: 'schedule',    label: 'Lịch thực tập',    icon: <CalendarDays className="h-4 w-4 shrink-0" />,   badge: null,                        badgeCls: '' },
                { value: 'feedback',    label: 'Feedback tuần',    icon: <MessageSquare className="h-4 w-4 shrink-0" />,  badge: pendingFeedbackCount || null, badgeCls: 'bg-orange-500' },
                { value: 'evaluations', label: 'Đánh giá',         icon: <Award className="h-4 w-4 shrink-0" />,         badge: null,                        badgeCls: '' },
                { value: 'documents',   label: 'Tài liệu',         icon: <FileText className="h-4 w-4 shrink-0" />,      badge: documents.length || null,    badgeCls: 'bg-blue-500' },
              ].map(tab => (
                <TabsTrigger key={tab.value} value={tab.value}
                  className="relative flex flex-1 min-w-0 items-center justify-center gap-1.5 border-b-[3px] px-3 py-3.5 text-[11px] font-semibold whitespace-nowrap transition-all duration-150
                    data-[state=inactive]:border-transparent data-[state=inactive]:text-gray-500 data-[state=inactive]:hover:bg-gray-50 data-[state=inactive]:hover:text-gray-700
                    data-[state=active]:border-[#0f2d6b] data-[state=active]:bg-blue-50/70 data-[state=active]:text-[#0f2d6b]">
                  {tab.icon}
                  <span className="hidden sm:inline">{tab.label}</span>
                  {tab.badge !== null && (
                    <span className={`flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white ${tab.badgeCls}`}>
                      {tab.badge}
                    </span>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <div className="pt-4">

            {/* ── Tasks ─────────────────────────────────────────────────── */}
            <TabsContent value="tasks">
              <Card className="overflow-visible border-0 shadow-sm ring-1 ring-gray-200">
                <CardHeader className="flex flex-row items-center justify-between border-b border-gray-100 bg-gray-50/60 rounded-t-xl">
                  <div>
                    <CardTitle className="text-base font-semibold text-gray-800">Danh sách nhiệm vụ</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">{filteredTasks.length} nhiệm vụ</p>
                  </div>
                  <Button onClick={() => { setSelectedTask(null); setTaskFormOpen(true) }} className="bg-[#0f2d6b] hover:bg-[#1a3d8a]">
                    <Plus className="h-4 w-4 mr-2" />Tạo nhiệm vụ
                  </Button>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-3 mb-5">
                    <div className="relative max-w-sm">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Tìm theo tiêu đề hoặc tên TTS..." value={searchTask}
                        onChange={e => { setSearchTask(e.target.value); setTaskPage(1) }} className="pl-10" />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Filter className="h-3.5 w-3.5" /><span className="font-medium">Lọc:</span>
                      </div>
                      <Select value={filterBatch} onValueChange={v => { setFilterBatch(v); setFilterIntern('all'); setFilterWeek('all'); setTaskPage(1) }}>
                        <SelectTrigger className={`h-8 text-xs w-[160px] ${filterBatch !== 'all' ? 'border-blue-500 text-blue-700 bg-blue-50' : ''}`}>
                          <SelectValue placeholder="Tất cả đợt" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tất cả đợt</SelectItem>
                          {batches.map(b => <SelectItem key={b.id} value={String(b.id)}>{b.batch_name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      {filterBatch !== 'all' && weekOptions.length > 0 && (
                        <Select value={filterWeek} onValueChange={v => { setFilterWeek(v); setTaskPage(1) }}>
                          <SelectTrigger className={`h-8 text-xs w-[130px] ${filterWeek !== 'all' ? 'border-blue-500 text-blue-700 bg-blue-50' : ''}`}>
                            <SelectValue placeholder="Tất cả tuần" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Tất cả tuần</SelectItem>
                            {weekOptions.map(w => <SelectItem key={w} value={String(w)}>Tuần {w}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      )}
                      <Select value={filterIntern} onValueChange={v => { setFilterIntern(v); setTaskPage(1) }}>
                        <SelectTrigger className={`h-8 text-xs w-[170px] ${filterIntern !== 'all' ? 'border-blue-500 text-blue-700 bg-blue-50' : ''}`}>
                          <SelectValue placeholder="Tất cả TTS" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tất cả TTS</SelectItem>
                          {internOptions.map(([name]) => <SelectItem key={name} value={name}>{name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Select value={filterStatus} onValueChange={v => { setFilterStatus(v); setTaskPage(1) }}>
                        <SelectTrigger className={`h-8 text-xs w-[150px] ${filterStatus !== 'all' ? 'border-blue-500 text-blue-700 bg-blue-50' : ''}`}>
                          <SelectValue placeholder="Tất cả trạng thái" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tất cả trạng thái</SelectItem>
                          {Object.entries(statusConfig).map(([k, c]) => <SelectItem key={k} value={k}>{c.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      {(activeFilterCount > 0 || searchTask) && (
                        <Button variant="ghost" size="sm" onClick={resetFilters} className="h-8 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2">
                          <X className="h-3.5 w-3.5 mr-1" />Xóa bộ lọc
                          {activeFilterCount > 0 && <span className="ml-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">{activeFilterCount}</span>}
                        </Button>
                      )}
                    </div>
                    {(activeFilterCount > 0 || searchTask) && (
                      <p className="text-xs text-muted-foreground">Hiển thị <span className="font-semibold text-foreground">{filteredTasks.length}</span> / {tasks.length} nhiệm vụ</p>
                    )}
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        {['Tiêu đề','Thực tập sinh','Đợt','Hạn nộp','Trạng thái',''].map((h, i) => (
                          <th key={i} className={`${TH} ${i < 5 ? 'text-left py-2 pr-4' : 'text-right py-2'}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {tasksLoading ? (
                        <tr><td colSpan={6} className="text-center py-10 text-muted-foreground">Đang tải...</td></tr>
                      ) : pagedTasks.length === 0 ? (
                        <tr><td colSpan={6} className="text-center py-10 text-muted-foreground">
                          {activeFilterCount > 0 || searchTask ? 'Không tìm thấy nhiệm vụ nào phù hợp' : 'Không có nhiệm vụ nào'}
                        </td></tr>
                      ) : pagedTasks.map(task => {
                        const sc = statusConfig[task.status] || statusConfig.new
                        const batchInfo = getBatchInfo(task.batch_id)
                        const weekNum = batchInfo?.start_date ? getInternshipWeek(task.deadline, batchInfo.start_date) : null
                        return (
                          <tr key={task.id} className={TR}>
                            <td className={`${TD} pr-4 font-medium`}>{task.title}</td>
                            <td className={`${TD} pr-4`}>{task.intern_name}</td>
                            <td className={`${TD} pr-4`}>
                              <div className="flex flex-col gap-0.5">
                                <span className="text-xs text-muted-foreground">{task.batch_name}</span>
                                {weekNum !== null && <span className="text-xs font-medium text-blue-600">Tuần {weekNum}</span>}
                              </div>
                            </td>
                            <td className={`${TD} pr-4 text-muted-foreground`}>{format(new Date(task.deadline), 'dd/MM/yyyy HH:mm', { locale: vi })}</td>
                            <td className={`${TD} pr-4`}><Badge variant={sc.variant} className={sc.cls}>{sc.label}</Badge></td>
                            <td className={`${TD} text-right`}>
                              <DropdownMenu>
                                <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground h-9 w-9">
                                  <MoreHorizontal className="h-4 w-4" />
                                </DropdownMenuTrigger>
                                <DropdownMenuPortal>
                                  <DropdownMenuContent align="end" className="z-[9999]">
                                    <DropdownMenuItem onClick={() => handleReviewTask(task)}>
                                      <Eye className="h-4 w-4 mr-2" />Xem chi tiết
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleOpenChat(task)}>
                                      <MessageSquare className="h-4 w-4 mr-2" />Trao đổi
                                    </DropdownMenuItem>
                                    {task.status !== 'approved' && (
                                      <DropdownMenuItem onClick={() => handleEditTask(task)}>
                                        <Edit className="h-4 w-4 mr-2" />Chỉnh sửa
                                      </DropdownMenuItem>
                                    )}
                                    {task.status !== 'approved' && (
                                      <DropdownMenuItem onClick={() => handleDeleteTask(task)} className="text-red-600">
                                        <Trash className="h-4 w-4 mr-2" />Xóa
                                      </DropdownMenuItem>
                                    )}
                                    {task.status === 'approved' && (
                                      <DropdownMenuItem disabled className="text-gray-400 cursor-not-allowed">
                                        <Lock className="h-4 w-4 mr-2" />Đã duyệt — không thể sửa/xóa
                                      </DropdownMenuItem>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenuPortal>
                              </DropdownMenu>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  <PaginationBar currentPage={taskPage} totalItems={filteredTasks.length} pageSize={taskPageSize}
                    onPageChange={setTaskPage} onPageSizeChange={s => { setTaskPageSize(s); setTaskPage(1) }} />
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Interns ───────────────────────────────────────────────── */}
            <TabsContent value="interns">
              <Card className="overflow-visible border-0 shadow-sm ring-1 ring-gray-200">
                <CardHeader className="border-b border-gray-100 bg-gray-50/60 rounded-t-xl">
                  <CardTitle className="text-base font-semibold text-gray-800">Thực tập sinh phụ trách</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">{filteredInterns.length} thực tập sinh</p>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-3 mb-5">
                    <div className="relative max-w-sm">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Tìm theo tên hoặc email..." value={searchIntern}
                        onChange={e => { setSearchIntern(e.target.value); setInternPage(1) }} className="pl-10" />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Filter className="h-3.5 w-3.5" /><span className="font-medium">Lọc:</span>
                      </div>
                      <Select value={filterInternBatch} onValueChange={v => { setFilterInternBatch(v); setInternPage(1) }}>
                        <SelectTrigger className={`h-8 text-xs w-[160px] ${filterInternBatch !== 'all' ? 'border-blue-500 text-blue-700 bg-blue-50' : ''}`}>
                          <SelectValue placeholder="Tất cả đợt" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tất cả đợt</SelectItem>
                          {batches.map(b => (
                            <SelectItem key={b.id} value={String(b.id)}>
                              <span className="flex items-center gap-1.5">
                                {b.batch_name}
                                {/* ✅ Hiện trạng thái đợt trong dropdown */}
                                {b.status === 'open'
                                  ? <span className="text-green-500 text-[10px]">● Đang mở</span>
                                  : <span className="text-gray-400 text-[10px]">● Đã đóng</span>
                                }
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={filterEvaluationStatus} onValueChange={v => { setFilterEvaluationStatus(v); setInternPage(1) }}>
                        <SelectTrigger className={`h-8 text-xs w-[180px] ${filterEvaluationStatus !== 'all' ? 'border-blue-500 text-blue-700 bg-blue-50' : ''}`}>
                          <SelectValue placeholder="Tất cả trạng thái đánh giá" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tất cả trạng thái</SelectItem>
                          <SelectItem value="evaluated">Đã đánh giá</SelectItem>
                          <SelectItem value="not_evaluated">Chưa đánh giá</SelectItem>
                        </SelectContent>
                      </Select>
                      {(activeInternFilterCount > 0 || searchIntern) && (
                        <Button variant="ghost" size="sm" onClick={resetInternFilters} className="h-8 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2">
                          <X className="h-3.5 w-3.5 mr-1" />Xóa bộ lọc
                          {activeInternFilterCount > 0 && <span className="ml-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">{activeInternFilterCount}</span>}
                        </Button>
                      )}
                    </div>
                    {(activeInternFilterCount > 0 || searchIntern) && (
                      <p className="text-xs text-muted-foreground">Hiển thị <span className="font-semibold text-foreground">{filteredInterns.length}</span> / {interns.length} thực tập sinh</p>
                    )}
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        {['Họ tên','Email','Đợt thực tập','Trường','Đánh giá',''].map((h, i) => (
                          <th key={i} className={`${TH} ${i < 5 ? 'text-left py-2 pr-4' : 'text-right py-2'}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {internsLoading ? (
                        <tr><td colSpan={6} className="text-center py-10 text-muted-foreground">Đang tải...</td></tr>
                      ) : pagedInterns.length === 0 ? (
                        <tr><td colSpan={6} className="text-center py-10 text-muted-foreground">
                          {activeInternFilterCount > 0 || searchIntern ? 'Không tìm thấy thực tập sinh nào phù hợp' : 'Không có thực tập sinh nào'}
                        </td></tr>
                      ) : pagedInterns.map(intern => {
                        const evaluation = getInternEvaluation(intern.user_id)
                        const batchInfo  = getBatchInfo(intern.batch_id)
                        const ended      = isBatchEnded(batchInfo?.end_date, batchInfo?.status)
                        return (
                          <tr key={intern.id} className={TR}>
                            <td className={`${TD} pr-4`}>
                              <button onClick={() => handleViewIntern(intern)}
                                className="font-medium text-blue-600 hover:underline text-left">
                                {intern.user_full_name}
                              </button>
                            </td>
                            <td className={`${TD} pr-4 text-muted-foreground`}>{intern.user_email}</td>
                            <td className={`${TD} pr-4`}>
                              <div className="flex flex-col gap-0.5">
                                <span>{intern.batch_name}</span>
                                {/* ✅ Badge trạng thái đợt */}
                                {ended
                                  ? <span className="text-[11px] text-gray-400">Đã kết thúc</span>
                                  : <span className="text-[11px] text-green-600">Đang mở</span>
                                }
                              </div>
                            </td>
                            <td className={`${TD} pr-4`}>{intern.university || '—'}</td>

                            {/* ✅ Cột Đánh giá — phân biệt 3 trạng thái */}
                            <td className={`${TD} pr-4`}>
                              {evaluation ? (
                                <Badge className={rankingColors[evaluation.ranking]}>
                                  {evaluation.ranking} ({evaluation.total_score})
                                </Badge>
                              ) : ended ? (
                                // Đợt đã kết thúc, chưa đánh giá → cảnh báo cam
                                <span className="text-xs text-orange-500 font-medium">Chưa đánh giá</span>
                              ) : (
                                // Đợt vẫn đang chạy
                                <span className="text-muted-foreground text-xs">Đang thực tập</span>
                              )}
                            </td>

                            <td className={`${TD} text-right`}>
                              <div className="flex items-center justify-end gap-2">
                                <Button size="sm" variant="outline" onClick={() => handleViewIntern(intern)}>
                                  <Eye className="h-4 w-4 mr-1" />Xem hồ sơ
                                </Button>
                                {ended ? (
                                  // ✅ Đợt kết thúc → nút Đánh giá / Xem đánh giá
                                  <Button
                                    size="sm"
                                    variant={evaluation ? 'outline' : 'default'}
                                    className={evaluation ? '' : 'bg-[#0f2d6b] hover:bg-[#1a3d8a]'}
                                    onClick={() => handleEvaluate(intern)}
                                  >
                                    <Award className="h-4 w-4 mr-1" />
                                    {evaluation ? 'Xem đánh giá' : 'Đánh giá'}
                                  </Button>
                                ) : (
                                  // Đợt vẫn đang chạy → lock
                                  <Button size="sm" variant="outline" disabled className="opacity-50 cursor-not-allowed">
                                    <Lock className="h-4 w-4 mr-1" />Chưa thể đánh giá
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  <PaginationBar currentPage={internPage} totalItems={filteredInterns.length} pageSize={internPageSize}
                    onPageChange={setInternPage} onPageSizeChange={s => { setInternPageSize(s); setInternPage(1) }} />
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Schedule ──────────────────────────────────────────────── */}
            <TabsContent value="schedule"><MentorScheduleTab /></TabsContent>

            {/* ── Feedback tuần ─────────────────────────────────────────── */}
            <TabsContent value="feedback">
              <div className="space-y-4">
                {(() => {
                  const need = feedbackStatuses.filter(s => s.batch_status === 'open' && !s.has_feedback_this_week)
                  if (!need.length) return null
                  return (
                    <div className="flex items-start gap-3 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
                      <Bell className="h-4 w-4 mt-0.5 shrink-0 text-orange-500" />
                      <div>
                        {new Date().getDay() === 0 && <span className="font-semibold">Hôm nay là Chủ nhật — </span>}
                        <span className="font-semibold">{need.length} thực tập sinh</span>{' '}chưa được feedback tuần này:{' '}
                        <span className="font-medium">{need.map(s => s.intern_name).join(', ')}</span>
                      </div>
                    </div>
                  )
                })()}
                {(() => {
                  const openBatches = batches.filter(b => b.status === 'open')
                  if (!openBatches.length) return (
                    <Card><CardContent className="py-12 text-center text-muted-foreground">
                      <Lock className="h-12 w-12 mx-auto mb-3 opacity-20" />
                      <p className="font-medium">Không có đợt thực tập nào đang mở</p>
                    </CardContent></Card>
                  )
                  return openBatches.map(batch => {
                    const batchInterns = interns.filter(i => i.batch_id === batch.id)
                    if (!batchInterns.length) return null
                    const isCollapsed = collapsedBatches.has(batch.id)
                    const missingCount = batchInterns.filter(i => {
                      const s = feedbackStatuses.find(fs => fs.intern_id === i.user_id)
                      return s && !s.has_feedback_this_week
                    }).length
                    return (
                      <div key={batch.id} className="space-y-3">
                        <button onClick={() => toggleCollapseBatch(batch.id)}
                          className="w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50/30 transition-colors">
                          <div className="flex items-center gap-3 flex-wrap">
                            <Badge className="bg-green-100 text-green-700 text-xs">Đang mở</Badge>
                            <span className="font-semibold text-gray-800">{batch.batch_name}</span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(batch.start_date).toLocaleDateString('vi-VN')} – {new Date(batch.end_date).toLocaleDateString('vi-VN')}
                            </span>
                            <Badge className="bg-blue-100 text-blue-700 text-xs">{batchInterns.length} TTS</Badge>
                            {missingCount > 0 && <Badge className="bg-orange-100 text-orange-700 text-xs">{missingCount} chưa feedback</Badge>}
                          </div>
                          {isCollapsed ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />}
                        </button>
                        {!isCollapsed && (
                          <Card className="ml-2 border-l-4 border-l-green-400">
                            <CardHeader className="pb-3 border-b border-gray-100">
                              <CardTitle className="text-sm flex items-center gap-2">
                                <Users className="h-4 w-4 text-blue-500" />Chọn thực tập sinh để xem / thêm feedback
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-3">
                              <div className="flex flex-wrap gap-2">
                                {batchInterns.map(intern => {
                                  const fbStatus = feedbackStatuses.find(s => s.intern_id === intern.user_id)
                                  const missing = fbStatus && !fbStatus.has_feedback_this_week
                                  return (
                                    <button key={intern.id} onClick={() => setSelectedFeedbackIntern(intern)}
                                      className={`relative px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                                        selectedFeedbackIntern?.id === intern.id
                                          ? 'bg-[#0f2d6b] text-white border-[#0f2d6b]'
                                          : missing
                                          ? 'bg-orange-50 text-gray-700 border-orange-300 hover:border-orange-400'
                                          : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:text-blue-700'
                                      }`}>
                                      {intern.user_full_name}
                                      {missing && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-orange-500 rounded-full border-2 border-white" />}
                                    </button>
                                  )
                                })}
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    )
                  })
                })()}
                {selectedFeedbackIntern ? (() => {
                  const fbStatus = feedbackStatuses.find(s => s.intern_id === selectedFeedbackIntern.user_id)
                  const batchOfIntern = batches.find(b => b.id === selectedFeedbackIntern.batch_id)
                  return <WeeklyFeedbackSection
                    intern={selectedFeedbackIntern}
                    batchId={selectedFeedbackIntern.batch_id}
                    readonly={false}
                    batchStatus={batchOfIntern?.status ?? 'open'}
                    currentWeek={fbStatus?.current_week}
                    batchStartDate={batchOfIntern?.start_date}
                  />
                })() : (
                  <Card><CardContent className="py-12 text-center text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p>Chọn một TTS ở trên để xem hoặc thêm feedback</p>
                  </CardContent></Card>
                )}
              </div>
            </TabsContent>

            {/* ── Evaluations ───────────────────────────────────────────── */}
            <TabsContent value="evaluations">
              <EvaluationsTab
                evaluations={evaluations}
                isLoading={evaluationsLoading}
                interns={interns}
                onEvaluate={handleEvaluate}
              />
            </TabsContent>

            {/* ── Documents ─────────────────────────────────────────────── */}
            <TabsContent value="documents">
              <Card className="border-0 shadow-sm ring-1 ring-gray-200">
                <CardHeader className="flex flex-row items-center justify-between border-b border-gray-100 bg-gray-50/60 rounded-t-xl">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-800">
                      <FileText className="h-5 w-5 text-[#0f2d6b]" />Tài liệu training
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">Upload tài liệu để chia sẻ với thực tập sinh</p>
                  </div>
                  <Button onClick={() => setDocUploadOpen(true)} className="bg-[#0f2d6b] hover:bg-[#1a3d8a]">
                    <Plus className="h-4 w-4 mr-2" />Upload tài liệu
                  </Button>
                </CardHeader>
                <CardContent className="pt-4">
                  {documents.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
                      <p className="font-medium">Chưa có tài liệu nào</p>
                      <p className="text-sm mt-1">Upload tài liệu để TTS có thể xem và tải về</p>
                      <Button variant="outline" className="mt-4" onClick={() => setDocUploadOpen(true)}>
                        <Plus className="h-4 w-4 mr-1" />Upload tài liệu đầu tiên
                      </Button>
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {documents.map(doc => {
                        const dt = docTypeConfig[doc.doc_type] || docTypeConfig.other
                        const isFile = doc.file_url?.startsWith('/api')
                        const href = isFile ? `http://localhost:8000${doc.file_url}` : (doc.file_url || '#')
                        return (
                          <div key={doc.id} className="border border-gray-100 rounded-lg p-4 hover:border-blue-200 transition-colors">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <Badge className={`${dt.cls} text-xs`}>{dt.label}</Badge>
                                  {doc.batch_name
                                    ? <Badge className="bg-purple-100 text-purple-700 text-xs">{doc.batch_name}</Badge>
                                    : <Badge className="bg-gray-100 text-gray-600 text-xs">Tất cả đợt</Badge>}
                                </div>
                                <p className="font-medium text-sm">{doc.title}</p>
                                {doc.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{doc.description}</p>}
                                {doc.file_name && <p className="text-xs text-muted-foreground mt-1">📎 {doc.file_name}{doc.file_size && ` (${formatFileSize(doc.file_size)})`}</p>}
                              </div>
                              <div className="flex gap-1 shrink-0">
                                {doc.file_url && (
                                  <a href={href} target="_blank" rel="noopener noreferrer">
                                    <Button size="sm" variant="outline">
                                      {isFile ? <Download className="h-4 w-4" /> : <ExternalLink className="h-4 w-4" />}
                                    </Button>
                                  </a>
                                )}
                                <Button size="sm" variant="ghost" onClick={() => setDeletingDocId(doc.id)}
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                              {format(new Date(doc.created_at), 'dd/MM/yyyy', { locale: vi })}
                            </p>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

          </div>
        </Tabs>
      </div>

      {/* Dialogs */}
      <TaskFormDialog open={taskFormOpen} onOpenChange={setTaskFormOpen} task={selectedTask} />
      <TaskReportReviewDialog open={taskReviewOpen} onOpenChange={setTaskReviewOpen} task={reviewingTask} />
      <EvaluationFormDialog open={evaluationOpen} onOpenChange={setEvaluationOpen} intern={selectedIntern} existingEvaluation={existingEvaluation} />
      <DeleteConfirmDialog open={deleteTaskOpen} onOpenChange={setDeleteTaskOpen} onConfirm={confirmDeleteTask}
        title="Xóa nhiệm vụ" description={`Bạn có chắc chắn muốn xóa nhiệm vụ "${deletingTask?.title}"?`} isLoading={deleteTask.isPending} />
      <InternDetailDialog open={internDetailOpen} onOpenChange={setInternDetailOpen} intern={detailIntern} tasks={tasks}
        evaluation={detailIntern ? getInternEvaluation(detailIntern.user_id) : undefined}
        batchInfo={detailIntern ? getBatchInfo(detailIntern.batch_id) : undefined} />
      <TaskChatDialog open={chatOpen} onOpenChange={setChatOpen} task={chatTask} currentUserId={currentUser.id} currentUserRole={currentUser.role} />
      <DocumentUploadDialog open={docUploadOpen} onOpenChange={setDocUploadOpen} batches={batches} />

      <AlertDialog open={!!deletingDocId} onOpenChange={o => !o && setDeletingDocId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa tài liệu?</AlertDialogTitle>
            <AlertDialogDescription>Tài liệu sẽ bị xóa vĩnh viễn.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteDoc} className="bg-red-600 hover:bg-red-700">Xóa</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  )
}