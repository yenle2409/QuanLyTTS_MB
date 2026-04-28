import { useState, useMemo } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  ClipboardList, CheckCircle, Clock, AlertCircle, Search, Eye, Send,
  Award, User, Calendar, MessageSquare, BookOpen, FileText,
  Download, MoreHorizontal, Edit, Trash2, Plus, CalendarDays,
  Lightbulb, AlertTriangle, ArrowRight, ExternalLink, Bell, CalendarCheck,
  ChevronRight, Flame,
} from 'lucide-react'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip,
} from 'recharts'
import { useTasks, useTaskReports, type Task } from '@/hooks/use-tasks'
import { useEvaluations } from '@/hooks/use-evaluations'
import { useInternProfiles } from '@/hooks/use-profiles'
import { useBatches } from '@/hooks/use-batches'
import { useDocuments, formatFileSize } from '@/hooks/use-documents'
import { useLogbook, useDeleteLogbook, type LogbookEntry } from '@/hooks/use-logbook'
import { useSchedules, SHIFT_LABELS, STATUS_LABELS, type InternSchedule } from '@/hooks/use-schedule'
// ✅ THÊM import useAttendanceHistory
import { useAttendanceHistory } from '@/hooks/use-attendance'
import { useLeaveRequests, type LeaveRequest as LeaveRequestType } from '@/hooks/use-leave-request'
import TaskSubmitDialog from '@/components/intern/TaskSubmitDialog'
import TaskViewDialog from '@/components/intern/TaskViewDialog'
import TaskChatDialog from '@/components/mentor/TaskChatDialog'
import LogbookDialog from '@/components/intern/LogbookDialog'
import WeeklyFeedbackSection from '@/components/mentor/WeeklyFeedbackSection'
import ScheduleRegisterDialog from '@/components/intern/ScheduleRegisterDialog'
import LeaveRequestDialog from '@/components/intern/LeaveRequestDialog'
import PaginationBar from '@/components/ui/pagination-bar'
import {
  format, differenceInDays, startOfMonth, endOfMonth,
  eachDayOfInterval, isSameDay, isToday, getDay, isSunday,
} from 'date-fns'
import { vi } from 'date-fns/locale'
import { useToast } from '@/hooks/use-toast'
import CheckInWidget from '@/components/intern/CheckInWidget'

// ─── Constants ────────────────────────────────────────────────────────────────

const statusConfig: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  new:            { label: 'Mới',           bg: 'bg-slate-100',  text: 'text-slate-600',   dot: 'bg-slate-400' },
  submitted:      { label: 'Đã nộp',        bg: 'bg-blue-50',    text: 'text-blue-600',    dot: 'bg-blue-500' },
  request_change: { label: 'Cần chỉnh sửa', bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-500' },
  approved:       { label: 'Đã duyệt',      bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  overdue:        { label: 'Quá hạn',       bg: 'bg-red-50',     text: 'text-red-600',     dot: 'bg-red-500' },
}

const docTypeConfig: Record<string, { label: string; bg: string; text: string; icon: string }> = {
  pdf:   { label: 'PDF',   bg: 'bg-red-50',    text: 'text-red-600',    icon: '📄' },
  slide: { label: 'Slide', bg: 'bg-orange-50', text: 'text-orange-600', icon: '📊' },
  link:  { label: 'Link',  bg: 'bg-blue-50',   text: 'text-blue-600',   icon: '🔗' },
  other: { label: 'Khác',  bg: 'bg-gray-50',   text: 'text-gray-600',   icon: '📎' },
}

// ✅ Giờ kết thúc ca — khớp với backend
const SHIFT_END_HOURS: Record<string, number> = {
  ca1:  12,
  ca2:  17,
  full: 17,
}

// ✅ Hàm tính trạng thái hiển thị cho ô lịch
function resolveDisplayStatus(
  schedule: InternSchedule,
  attendanceStatus: string | undefined,
): string | undefined {
  if (attendanceStatus) return attendanceStatus
  if (schedule.status !== 'approved') return undefined
  const todayStr    = format(new Date(), 'yyyy-MM-dd')
  const workDateStr = schedule.work_date
  if (workDateStr > todayStr) return undefined
  if (workDateStr < todayStr) return 'absent'
  const endHour = SHIFT_END_HOURS[schedule.shift]
  if (endHour === undefined) return undefined
  const now = new Date()
  const shiftEnd = new Date()
  shiftEnd.setHours(endHour, 0, 0, 0)
  return now >= shiftEnd ? 'absent' : undefined
}

function getDaysRemaining(deadline: string) {
  const days = differenceInDays(new Date(deadline), new Date())
  if (days < 0)   return { text: `Quá hạn ${Math.abs(days)}d`, color: '#ef4444' }
  if (days === 0) return { text: 'Hôm nay!',    color: '#f97316' }
  if (days <= 3)  return { text: `${days} ngày`, color: '#f59e0b' }
  return              { text: `${days} ngày`, color: '#22c55e' }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TaskCard({ task, onView, onSubmit, onChat }: {
  task: Task; onView: () => void; onSubmit: () => void; onChat: () => void
}) {
  const sc = statusConfig[task.status] || statusConfig.new
  const dl = getDaysRemaining(task.deadline)
  const { data: reports } = useTaskReports(task.id)
  const lastComment = reports?.[reports.length - 1]?.mentor_comment
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 hover:border-blue-200 hover:shadow-md transition-all duration-200">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className={`w-2 h-2 rounded-full shrink-0 ${sc.dot}`} />
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${sc.bg} ${sc.text}`}>{sc.label}</span>
        </div>
        <span className="text-xs font-bold shrink-0" style={{ color: dl.color }}>{dl.text}</span>
      </div>
      <h3 className="font-semibold text-gray-900 text-sm leading-snug mb-1 line-clamp-2">{task.title}</h3>
      <p className="text-xs text-gray-400 mb-3">Mentor: {task.mentor_name}</p>
      {lastComment && task.status === 'request_change' && (
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-2.5 mb-3 text-xs text-amber-800">
          <span className="font-semibold">💬 Mentor: </span>{lastComment}
        </div>
      )}
      <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-3">
        <Clock className="h-3 w-3" />
        <span>{format(new Date(task.deadline), 'dd/MM/yyyy HH:mm', { locale: vi })}</span>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={onView} className="flex-1 text-center text-xs font-medium py-1.5 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors">Xem</button>
        <button onClick={onChat} className="flex-1 text-center text-xs font-medium py-1.5 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors">Chat</button>
        {(task.status === 'new' || task.status === 'request_change') && (
          <button onClick={onSubmit} className="flex-1 text-center text-xs font-bold py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors">Nộp bài</button>
        )}
      </div>
    </div>
  )
}

function StatPill({ label, value, color, icon }: { label: string; value: number; color: string; icon: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
      <div className="mb-1" style={{ color }}>{icon}</div>
      <p className="text-2xl font-black text-gray-900">{value}</p>
      <p className="text-[10px] font-medium text-gray-400 text-center leading-tight mt-0.5">{label}</p>
    </div>
  )
}

function InternCalendar({ tasks, schedules, batchStart, batchEnd, leaveRequests, onLeaveRequest }: {
  tasks: Task[]; schedules: InternSchedule[]; batchStart?: string; batchEnd?: string
  leaveRequests: LeaveRequestType[]; onLeaveRequest: (s: InternSchedule) => void
}) {
  const [month, setMonth] = useState(new Date())
  const monthStart = startOfMonth(month)
  const days = eachDayOfInterval({ start: monthStart, end: endOfMonth(month) })
  const startDow = getDay(monthStart) === 0 ? 6 : getDay(monthStart) - 1
  const deadlineMap = new Map<string, Task[]>()
  tasks.forEach(t => { const k = t.deadline.split('T')[0]; if (!deadlineMap.has(k)) deadlineMap.set(k, []); deadlineMap.get(k)!.push(t) })
  const scheduleMap = new Map<string, InternSchedule>()
  schedules.forEach(s => scheduleMap.set(s.work_date, s))
  const leaveMap = new Map<string, LeaveRequestType>()
  leaveRequests.forEach(l => leaveMap.set(l.leave_date, l))
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <button onClick={() => setMonth(d => new Date(d.getFullYear(), d.getMonth() - 1))} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 text-gray-500 font-bold text-lg">‹</button>
        <span className="font-bold text-gray-800 capitalize">{format(month, 'MMMM yyyy', { locale: vi })}</span>
        <button onClick={() => setMonth(d => new Date(d.getFullYear(), d.getMonth() + 1))} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 text-gray-500 font-bold text-lg">›</button>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {['T2','T3','T4','T5','T6','T7','CN'].map(d => <div key={d} className="text-center text-[10px] font-bold text-gray-300 py-1">{d}</div>)}
        {Array(startDow).fill(null).map((_, i) => <div key={`p${i}`} />)}
        {days.map(day => {
          const key = format(day, 'yyyy-MM-dd')
          const dayTasks = deadlineMap.get(key) || []
          const sched = scheduleMap.get(key)
          const leave = leaveMap.get(key)
          const isSun = getDay(day) === 0
          let bg = '', textCls = isSun ? 'text-gray-300' : 'text-gray-700'
          if (isToday(day)) { bg = 'bg-blue-600'; textCls = 'text-white' }
          else if (leave?.status === 'approved') { bg = 'bg-orange-400'; textCls = 'text-white' }
          else if (leave?.status === 'pending') { bg = 'bg-orange-100'; textCls = 'text-orange-700' }
          else if (sched?.status === 'approved') { bg = 'bg-emerald-500'; textCls = 'text-white' }
          else if (sched?.status === 'pending') { bg = 'bg-yellow-400'; textCls = 'text-white' }
          else if (sched?.status === 'rejected') { bg = 'bg-red-400'; textCls = 'text-white' }
          return (
            <div key={key} className={`relative flex flex-col items-center group ${sched && !isSun ? 'cursor-pointer' : ''}`}
              onClick={() => sched && !isSun && onLeaveRequest(sched)}>
              <span className={`w-8 h-8 flex items-center justify-center text-xs font-semibold rounded-full transition-all ${bg} ${textCls} ${sched && !isSun ? 'hover:ring-2 hover:ring-offset-1 hover:ring-blue-300' : ''}`}>
                {format(day, 'd')}
              </span>
              {dayTasks.length > 0 && (
                <div className="flex gap-0.5 mt-0.5">
                  {dayTasks.slice(0, 3).map(t => (
                    <span key={t.id} className={`w-1 h-1 rounded-full ${t.status === 'approved' ? 'bg-emerald-500' : t.status === 'overdue' ? 'bg-red-500' : 'bg-blue-500'}`} />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 pt-3 border-t border-gray-100">
        {[
          { color: 'bg-blue-600',   label: 'Hôm nay' },
          { color: 'bg-emerald-500', label: 'Ca duyệt' },
          { color: 'bg-yellow-400', label: 'Chờ duyệt' },
          { color: 'bg-orange-400', label: 'Nghỉ phép' },
          { color: 'bg-blue-500',   label: 'Deadline' },
        ].map(l => (
          <span key={l.label} className="flex items-center gap-1.5 text-[10px] text-gray-400">
            <span className={`w-2 h-2 rounded-full ${l.color}`} />{l.label}
          </span>
        ))}
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function InternDashboard() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState('home')
  const { data: tasks = [], isLoading: tasksLoading } = useTasks()
  const { data: evaluations = [], isLoading: evaluationsLoading } = useEvaluations()
  const { data: profiles = [] } = useInternProfiles()
  const { data: batches = [] } = useBatches()
  const { data: documents = [] } = useDocuments()
  const { data: logbookEntries = [] } = useLogbook()
  const deleteLogbook = useDeleteLogbook()
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}')

  const myProfile    = profiles.find(p => p.user_id === currentUser.id)
  const myBatch      = myProfile ? batches.find(b => b.id === myProfile.batch_id) : null
  const myEvaluation = evaluations[0]

  const { data: schedules = [] }     = useSchedules({ intern_id: currentUser.id, batch_id: myBatch?.id })
  const { data: leaveRequests = [] } = useLeaveRequests({ intern_id: currentUser.id })

  // ✅ Fetch lịch sử điểm danh của TTS
  const { data: myAttendances = [] } = useAttendanceHistory(
    myBatch ? { intern_id: currentUser.id, batch_id: myBatch.id } : undefined
  )

  // ✅ Map: date → attendance status
  const myAttendanceMap = useMemo(() => {
    const map: Record<string, string> = {}
    myAttendances.forEach((a: any) => { map[a.date] = a.status })
    return map
  }, [myAttendances])

  const [scheduleOpen, setScheduleOpen]                   = useState(false)
  const [leaveOpen, setLeaveOpen]                         = useState(false)
  const [selectedLeaveSchedule, setSelectedLeaveSchedule] = useState<InternSchedule | null>(null)
  const todayIsSunday = isSunday(new Date())

  const [searchTask, setSearchTask]     = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [taskPage, setTaskPage]         = useState(1)
  const [taskPageSize, setTaskPageSize] = useState(9)
  const [submitOpen, setSubmitOpen]     = useState(false)
  const [viewOpen, setViewOpen]         = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [chatOpen, setChatOpen]         = useState(false)
  const [chatTask, setChatTask]         = useState<Task | null>(null)

  const [docSearch, setDocSearch]         = useState('')
  const [docTypeFilter, setDocTypeFilter] = useState('all')

  const [logbookOpen, setLogbookOpen]         = useState(false)
  const [editingEntry, setEditingEntry]       = useState<LogbookEntry | null>(null)
  const [deletingEntryId, setDeletingEntryId] = useState<number | null>(null)
  const [logTypeFilter, setLogTypeFilter]     = useState('all')
  const [logPage, setLogPage]                 = useState(1)
  const [logPageSize, setLogPageSize]         = useState(5)

  const totalTasks       = tasks.length
  const approvedTasks    = tasks.filter(t => t.status === 'approved').length
  const pendingTasks     = tasks.filter(t => t.status === 'new' || t.status === 'submitted').length
  const needsChangeTasks = tasks.filter(t => t.status === 'request_change').length
  const completionRate   = totalTasks > 0 ? Math.round(approvedTasks / totalTasks * 100) : 0

  const upcomingTasks = tasks
    .filter(t => { const d = differenceInDays(new Date(t.deadline), new Date()); return d >= 0 && d <= 7 && t.status !== 'approved' })
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
    .slice(0, 3)

  const filteredTasks = useMemo(() => tasks.filter(t => {
    const match = t.title.toLowerCase().includes(searchTask.toLowerCase()) || t.mentor_name.toLowerCase().includes(searchTask.toLowerCase())
    return match && (statusFilter === 'all' || t.status === statusFilter)
  }), [tasks, searchTask, statusFilter])

  const pagedTasks  = useMemo(() => filteredTasks.slice((taskPage - 1) * taskPageSize, taskPage * taskPageSize), [filteredTasks, taskPage, taskPageSize])
  const filteredLog = useMemo(() => logbookEntries.filter((e: LogbookEntry) => logTypeFilter === 'all' || e.entry_type === logTypeFilter), [logbookEntries, logTypeFilter])
  const pagedLog    = useMemo(() => filteredLog.slice((logPage - 1) * logPageSize, logPage * logPageSize), [filteredLog, logPage, logPageSize])
  const filteredDocs = documents.filter(d => d.title.toLowerCase().includes(docSearch.toLowerCase()) && (docTypeFilter === 'all' || d.doc_type === docTypeFilter))

  const radarData = myEvaluation?.criteria_scores ? [
    { subject: 'Thái độ', score: (myEvaluation.criteria_scores as any).attitude    ?? 0 },
    { subject: 'Kỷ luật', score: (myEvaluation.criteria_scores as any).discipline  ?? 0 },
    { subject: 'Học hỏi', score: (myEvaluation.criteria_scores as any).learning    ?? 0 },
    { subject: 'Kỹ năng', score: (myEvaluation.criteria_scores as any).skills      ?? 0 },
    { subject: 'Kết quả', score: (myEvaluation.criteria_scores as any).task_result ?? 0 },
  ] : []

  const renderContent = () => {
    switch (activeTab) {

      case 'home': return (
        <div className="space-y-5">
          <CheckInWidget />
          {todayIsSunday && (
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 p-5 text-white shadow-lg">
              <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-white/10" />
              <div className="flex items-start gap-4 relative">
                <div className="bg-white/20 rounded-2xl p-3 shrink-0"><Bell className="h-6 w-6" /></div>
                <div className="flex-1">
                  <p className="font-bold text-base">Chủ nhật — Đăng ký lịch tuần tới! 🗓️</p>
                  <p className="text-blue-100 text-sm mt-1">Đừng quên đăng ký để Mentor biết lịch của bạn</p>
                  <button onClick={() => setScheduleOpen(true)} className="mt-3 bg-white text-blue-700 text-sm font-bold px-4 py-1.5 rounded-full hover:bg-blue-50 transition-colors">Đăng ký ngay →</button>
                </div>
              </div>
            </div>
          )}

          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0f2d6b] via-[#1a3d8a] to-[#2b5fc7] p-5 text-white shadow-lg">
            <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-white/10 -translate-y-1/2 translate-x-1/2" />
            <p className="mb-0.5 text-sm text-blue-100">Xin chào 👋</p>
            <h2 className="mb-1 text-xl font-black">{currentUser.full_name || 'Thực tập sinh'}</h2>
            {myBatch && <p className="mb-4 text-xs text-blue-200">{myBatch.batch_name}</p>}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-blue-100">Tiến độ hoàn thành</span>
                <span className="font-bold text-cyan-200">{completionRate}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/15">
                <div className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-sky-200 transition-all duration-700" style={{ width: `${completionRate}%` }} />
              </div>
              <p className="text-xs text-blue-200">{approvedTasks} / {totalTasks} nhiệm vụ</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatPill label="Tổng nhiệm vụ" value={totalTasks}       color="#3b82f6" icon={<ClipboardList className="h-5 w-5" />} />
            <StatPill label="Hoàn thành"     value={approvedTasks}    color="#10b981" icon={<CheckCircle   className="h-5 w-5" />} />
            <StatPill label="Đang làm"       value={pendingTasks}     color="#f59e0b" icon={<Clock         className="h-5 w-5" />} />
            <StatPill label="Cần chỉnh sửa" value={needsChangeTasks} color="#ef4444" icon={<AlertCircle  className="h-5 w-5" />} />
          </div>

          {upcomingTasks.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-900 flex items-center gap-2"><Flame className="h-4 w-4 text-orange-500" />Sắp đến hạn</h3>
                <button onClick={() => setActiveTab('tasks')} className="text-xs text-blue-600 font-medium flex items-center gap-0.5">Xem tất cả <ChevronRight className="h-3.5 w-3.5" /></button>
              </div>
              <div className="space-y-2">
                {upcomingTasks.map(task => {
                  const dl = getDaysRemaining(task.deadline)
                  const sc = statusConfig[task.status] || statusConfig.new
                  return (
                    <div key={task.id} className="flex items-center gap-3 bg-white border border-gray-100 rounded-2xl p-3.5 hover:border-orange-200 transition-colors">
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${sc.dot}`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-900 truncate">{task.title}</p>
                        <p className="text-xs text-gray-400">{task.mentor_name}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-bold" style={{ color: dl.color }}>{dl.text}</span>
                        {(task.status === 'new' || task.status === 'request_change') && (
                          <button onClick={() => { setSelectedTask(task); setSubmitOpen(true) }} className="text-xs font-bold bg-blue-600 text-white px-3 py-1 rounded-full hover:bg-blue-700 transition-colors">Nộp</button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div>
            <h3 className="font-bold text-gray-900 mb-3">Truy cập nhanh</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Đăng ký lịch', icon: CalendarCheck, color: 'from-blue-500 to-blue-600',       action: () => setScheduleOpen(true) },
                { label: 'Thêm nhật ký', icon: BookOpen,      color: 'from-emerald-500 to-emerald-600', action: () => { setEditingEntry(null); setLogbookOpen(true) } },
                { label: 'Xem lịch',     icon: CalendarDays,  color: 'from-purple-500 to-purple-600',   action: () => setActiveTab('calendar') },
                { label: 'Tài liệu',     icon: FileText,      color: 'from-orange-500 to-orange-600',   action: () => setActiveTab('documents') },
              ].map(a => (
                <button key={a.label} onClick={a.action} className={`bg-gradient-to-br ${a.color} text-white rounded-2xl p-4 flex flex-col items-center gap-2 hover:opacity-90 transition-opacity shadow-sm`}>
                  <a.icon className="h-6 w-6" />
                  <span className="text-xs font-semibold text-center leading-tight">{a.label}</span>
                </button>
              ))}
            </div>
          </div>

          {myBatch && (
            <div className="bg-white border border-gray-100 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center"><Calendar className="h-4 w-4 text-blue-600" /></div>
                <h3 className="font-bold text-gray-900 text-sm">Đợt thực tập</h3>
                <Badge className={`ml-auto text-xs ${myBatch.status === 'open' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                  {myBatch.status === 'open' ? 'Đang mở' : 'Đã đóng'}
                </Badge>
              </div>
              <p className="font-semibold text-gray-800 mb-2">{myBatch.batch_name}</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-emerald-50 rounded-xl p-2.5 text-center"><p className="text-emerald-500 font-medium mb-0.5">Bắt đầu</p><p className="font-bold text-gray-700">{format(new Date(myBatch.start_date), 'dd/MM/yyyy', { locale: vi })}</p></div>
                <div className="bg-red-50 rounded-xl p-2.5 text-center"><p className="text-red-500 font-medium mb-0.5">Kết thúc</p><p className="font-bold text-gray-700">{format(new Date(myBatch.end_date), 'dd/MM/yyyy', { locale: vi })}</p></div>
              </div>
            </div>
          )}
        </div>
      )

      case 'tasks': return (
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
              <input className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 placeholder:text-gray-300"
                placeholder="Tìm nhiệm vụ..." value={searchTask} onChange={e => { setSearchTask(e.target.value); setTaskPage(1) }} />
            </div>
            <select className="px-3 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none text-gray-600"
              value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setTaskPage(1) }}>
              <option value="all">Tất cả</option>
              <option value="new">Mới</option>
              <option value="submitted">Đã nộp</option>
              <option value="request_change">Cần sửa</option>
              <option value="approved">Đã duyệt</option>
              <option value="overdue">Quá hạn</option>
            </select>
          </div>
          <p className="text-xs text-gray-400">{filteredTasks.length} nhiệm vụ</p>
          {tasksLoading ? (
            <div className="text-center py-16 text-gray-300"><ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-30" /><p className="text-sm">Đang tải...</p></div>
          ) : pagedTasks.length === 0 ? (
            <div className="text-center py-16"><ClipboardList className="h-12 w-12 mx-auto mb-3 text-gray-200" /><p className="text-sm font-medium text-gray-400">Không có nhiệm vụ nào</p></div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {pagedTasks.map(task => (
                <TaskCard key={task.id} task={task}
                  onView={() => { setSelectedTask(task); setViewOpen(true) }}
                  onSubmit={() => { setSelectedTask(task); setSubmitOpen(true) }}
                  onChat={() => { setChatTask(task); setChatOpen(true) }} />
              ))}
            </div>
          )}
          <PaginationBar currentPage={taskPage} totalItems={filteredTasks.length} pageSize={taskPageSize}
            onPageChange={setTaskPage} onPageSizeChange={s => { setTaskPageSize(s); setTaskPage(1) }} />
        </div>
      )

      case 'calendar': return (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900 text-base">Lịch thực tập</h3>
              <button onClick={() => setScheduleOpen(true)} className="text-xs font-bold bg-blue-600 text-white px-4 py-2 rounded-full hover:bg-blue-700 flex items-center gap-1.5 transition-colors">
                <Plus className="h-3.5 w-3.5" />Đăng ký lịch
              </button>
            </div>
            <InternCalendar tasks={tasks} schedules={schedules} batchStart={myBatch?.start_date} batchEnd={myBatch?.end_date}
              leaveRequests={leaveRequests} onLeaveRequest={s => { setSelectedLeaveSchedule(s); setLeaveOpen(true) }} />
          </div>

          <div className="space-y-4">
            {/* ✅ Danh sách lịch đã đăng ký — có badge điểm danh */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold text-gray-900 text-sm">Lịch đã đăng ký</h4>
                <span className="text-xs bg-blue-50 text-blue-600 font-bold px-2 py-0.5 rounded-full">{schedules.length}</span>
              </div>
              {schedules.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-xs text-gray-400 mb-2">Chưa có lịch nào</p>
                  <button onClick={() => setScheduleOpen(true)} className="text-xs font-semibold text-blue-600 border border-blue-200 px-3 py-1.5 rounded-full hover:bg-blue-50">+ Đăng ký ngay</button>
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {schedules.sort((a, b) => a.work_date.localeCompare(b.work_date)).map(s => {
                    const attStatus     = myAttendanceMap[s.work_date]
                    const displayStatus = resolveDisplayStatus(s, attStatus)
                    const isAbsent      = displayStatus === 'absent'
                    const isAutoAbsent  = isAbsent && !attStatus
                    const isPresent     = displayStatus === 'present'
                    const isCheckedOut  = displayStatus === 'checked_out'

                    return (
                      <div key={s.id} className={`flex items-center justify-between p-2.5 rounded-xl border transition-colors ${
                        isAbsent ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-transparent'
                      }`}>
                        <div>
                          <p className="text-xs font-semibold text-gray-700 capitalize">
                            {format(new Date(s.work_date), 'EEE dd/MM', { locale: vi })}
                          </p>
                          <p className="text-[10px] text-gray-400">{SHIFT_LABELS[s.shift].time}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${SHIFT_LABELS[s.shift].color}`}>
                            {SHIFT_LABELS[s.shift].label}
                          </span>

                          {/* Trạng thái lịch — ẩn khi vắng */}
                          {!isAbsent && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${STATUS_LABELS[s.status].color}`}>
                              {STATUS_LABELS[s.status].label}
                            </span>
                          )}

                          {/* ✅ Badge điểm danh — chỉ hiện khi lịch đã duyệt */}
                          {s.status === 'approved' && displayStatus && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                              isAbsent      ? 'bg-red-100 text-red-700'
                              : isCheckedOut ? 'bg-green-100 text-green-700'
                              : isPresent    ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-600'
                            }`}>
                              {isAbsent
                                ? isAutoAbsent ? '⚠ Vắng (quá giờ)' : '✗ Vắng mặt'
                                : isCheckedOut ? '✓ Đã check-out'
                                : isPresent    ? '● Đang làm việc'
                                : displayStatus
                              }
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
              <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2 mb-3"><Clock className="h-4 w-4 text-orange-500" />Deadline sắp tới</h4>
              <div className="space-y-2">
                {tasks.filter(t => t.status !== 'approved').sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime()).slice(0, 4).map(t => {
                  const dl = getDaysRemaining(t.deadline)
                  return <div key={t.id} className="flex items-center justify-between"><span className="text-xs text-gray-600 truncate flex-1 mr-2">{t.title}</span><span className="text-[10px] font-bold shrink-0" style={{ color: dl.color }}>{dl.text}</span></div>
                })}
                {tasks.filter(t => t.status !== 'approved').length === 0 && <p className="text-xs text-gray-400 text-center py-2">Không có deadline nào 🎉</p>}
              </div>
            </div>
          </div>
        </div>
      )

      case 'documents': return (
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" /><input className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 placeholder:text-gray-300" placeholder="Tìm tài liệu..." value={docSearch} onChange={e => setDocSearch(e.target.value)} /></div>
            <select className="px-3 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none text-gray-600" value={docTypeFilter} onChange={e => setDocTypeFilter(e.target.value)}>
              <option value="all">Tất cả</option><option value="pdf">PDF</option><option value="slide">Slide</option><option value="link">Link</option><option value="other">Khác</option>
            </select>
          </div>
          {filteredDocs.length === 0 ? (
            <div className="text-center py-16"><FileText className="h-12 w-12 mx-auto mb-3 text-gray-200" /><p className="font-medium text-gray-400">Chưa có tài liệu nào từ Mentor</p></div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {filteredDocs.map(doc => {
                const dt = docTypeConfig[doc.doc_type] || docTypeConfig.other
                const isFile = doc.file_url?.startsWith('/api')
                const href = isFile ? `http://localhost:8000${doc.file_url}` : (doc.file_url || '#')
                return (
                  <div key={doc.id} className="bg-white border border-gray-100 rounded-2xl p-4 hover:border-blue-200 hover:shadow-sm transition-all">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl ${dt.bg} flex items-center justify-center text-lg shrink-0`}>{dt.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${dt.bg} ${dt.text}`}>{dt.label}</span>
                          {doc.batch_name && <span className="text-[10px] bg-purple-50 text-purple-600 font-medium px-2 py-0.5 rounded-full">{doc.batch_name}</span>}
                        </div>
                        <p className="font-semibold text-sm text-gray-900">{doc.title}</p>
                        {doc.description && <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{doc.description}</p>}
                        <p className="text-[10px] text-gray-400 mt-1.5">{doc.mentor_name} • {format(new Date(doc.created_at), 'dd/MM/yyyy', { locale: vi })}</p>
                      </div>
                      {doc.file_url && (
                        <a href={href} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors shrink-0">
                          {isFile ? <Download className="h-4 w-4" /> : <ExternalLink className="h-4 w-4" />}
                        </a>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )

      case 'logbook': return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {[{ val: 'all', label: 'Tất cả' }, { val: 'daily', label: 'Ngày' }, { val: 'weekly', label: 'Tuần' }].map(t => (
                <button key={t.val} onClick={() => { setLogTypeFilter(t.val); setLogPage(1) }}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${logTypeFilter === t.val ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                  {t.label}
                </button>
              ))}
            </div>
            <button onClick={() => { setEditingEntry(null); setLogbookOpen(true) }} className="text-xs font-bold bg-emerald-600 text-white px-4 py-2 rounded-full hover:bg-emerald-700 flex items-center gap-1.5 transition-colors">
              <Plus className="h-3.5 w-3.5" />Thêm nhật ký
            </button>
          </div>
          {filteredLog.length === 0 ? (
            <div className="text-center py-16"><BookOpen className="h-12 w-12 mx-auto mb-3 text-gray-200" /><p className="font-medium text-gray-400">Chưa có nhật ký nào</p><button onClick={() => { setEditingEntry(null); setLogbookOpen(true) }} className="mt-3 text-xs font-semibold text-emerald-600 border border-emerald-200 px-4 py-2 rounded-full hover:bg-emerald-50 transition-colors">Tạo nhật ký đầu tiên</button></div>
          ) : (
            <>
              <div className="space-y-3">
                {pagedLog.map((entry: LogbookEntry) => (
                  <div key={entry.id} className="bg-white border border-gray-100 rounded-2xl p-4 hover:border-green-200 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${entry.entry_type === 'daily' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                          {entry.entry_type === 'daily' ? (entry.log_date ? format(new Date(entry.log_date), 'dd/MM/yyyy', { locale: vi }) : '') : `Tuần ${entry.week_number}`}
                        </span>
                        <h4 className="font-semibold text-sm text-gray-900">{entry.title}</h4>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-gray-100 text-gray-400 shrink-0"><MoreHorizontal className="h-4 w-4" /></button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setEditingEntry(entry); setLogbookOpen(true) }}><Edit className="h-4 w-4 mr-2" />Chỉnh sửa</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setDeletingEntryId(entry.id)} className="text-red-600"><Trash2 className="h-4 w-4 mr-2" />Xóa</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <p className="text-sm text-gray-600 mt-2 line-clamp-3 whitespace-pre-wrap">{entry.content}</p>
                    {(entry.learned || entry.difficulties || entry.plan_next) && (
                      <div className="grid grid-cols-3 gap-2 mt-3">
                        {entry.learned && <div className="bg-yellow-50 rounded-xl p-2.5"><p className="text-[10px] font-bold text-yellow-600 mb-1 flex items-center gap-1"><Lightbulb className="h-3 w-3" />Học được</p><p className="text-xs text-yellow-800 line-clamp-2">{entry.learned}</p></div>}
                        {entry.difficulties && <div className="bg-orange-50 rounded-xl p-2.5"><p className="text-[10px] font-bold text-orange-600 mb-1 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Khó khăn</p><p className="text-xs text-orange-800 line-clamp-2">{entry.difficulties}</p></div>}
                        {entry.plan_next && <div className="bg-emerald-50 rounded-xl p-2.5"><p className="text-[10px] font-bold text-emerald-600 mb-1 flex items-center gap-1"><ArrowRight className="h-3 w-3" />Tiếp theo</p><p className="text-xs text-emerald-800 line-clamp-2">{entry.plan_next}</p></div>}
                      </div>
                    )}
                    <p className="text-[10px] text-gray-300 mt-2">{format(new Date(entry.created_at), 'dd/MM/yyyy HH:mm', { locale: vi })}</p>
                  </div>
                ))}
              </div>
              <PaginationBar currentPage={logPage} totalItems={filteredLog.length} pageSize={logPageSize} onPageChange={setLogPage} onPageSizeChange={s => { setLogPageSize(s); setLogPage(1) }} pageSizeOptions={[5, 10, 20]} />
            </>
          )}
        </div>
      )

      case 'feedback': return (
        <div>
          {myProfile ? <WeeklyFeedbackSection intern={myProfile} batchId={myBatch?.id} readonly={true} /> : (
            <div className="text-center py-16"><MessageSquare className="h-12 w-12 mx-auto mb-3 text-gray-200" /><p className="text-gray-400">Chưa có hồ sơ thực tập</p></div>
          )}
        </div>
      )

      case 'profile': return (
        <div className="space-y-4">
          <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 to-slate-700 rounded-2xl p-6 text-white">
            <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-white/5" />
            <div className="absolute -left-6 -bottom-6 w-32 h-32 rounded-full bg-white/5" />
            <div className="relative flex items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-3xl font-black shrink-0">
                {(currentUser.full_name || '?').charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-black text-xl">{currentUser.full_name || '—'}</h2>
                <p className="text-slate-300 text-sm">{currentUser.email}</p>
                {myProfile?.mentor_name && (
                  <div className="mt-2 inline-flex items-center gap-2 bg-white/10 rounded-xl px-3 py-1.5">
                    <User className="h-3.5 w-3.5 text-slate-300" />
                    <span className="text-xs text-slate-200">Mentor: <span className="font-semibold text-white">{myProfile.mentor_name}</span></span>
                  </div>
                )}
              </div>
              {myBatch && (
                <Badge className={`shrink-0 text-xs px-3 py-1 ${myBatch.status === 'open' ? 'bg-emerald-400/20 text-emerald-300 border-emerald-400/30' : 'bg-white/10 text-slate-300'}`}>
                  {myBatch.status === 'open' ? '🟢 Đang thực tập' : '⚪ Đã kết thúc'}
                </Badge>
              )}
            </div>
          </div>

          {myProfile ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                <div className="px-5 py-3.5 border-b border-gray-50 bg-gray-50/50">
                  <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2"><User className="h-4 w-4 text-blue-500" />Thông tin cá nhân</h3>
                </div>
                {[
                  { label: 'Giới tính',     value: currentUser.gender === 'male' ? 'Nam' : currentUser.gender === 'female' ? 'Nữ' : currentUser.gender || '—' },
                  { label: 'Ngày sinh',     value: currentUser.date_of_birth ? format(new Date(currentUser.date_of_birth), 'dd/MM/yyyy', { locale: vi }) : '—' },
                  { label: 'Số điện thoại', value: currentUser.phone || '—' },
                  { label: 'Địa chỉ',       value: currentUser.address || '—' },
                  { label: 'Trường',         value: myProfile.university || '—' },
                  { label: 'GPA',            value: myProfile.gpa?.toString() || '—' },
                ].map((row, i, arr) => (
                  <div key={row.label} className={`flex items-center justify-between px-5 py-3.5 ${i < arr.length - 1 ? 'border-b border-gray-50' : ''}`}>
                    <span className="text-sm text-gray-400">{row.label}</span>
                    <span className="text-sm font-semibold text-gray-800">{row.value}</span>
                  </div>
                ))}
                {myProfile.cv_link && (
                  <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-50">
                    <span className="text-sm text-gray-400">CV</span>
                    <a href={myProfile.cv_link} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-blue-600 flex items-center gap-1 hover:underline">
                      Xem CV <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {myBatch && (
                  <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                    <div className="px-5 py-3.5 border-b border-gray-50 bg-gray-50/50 flex items-center justify-between">
                      <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2"><Calendar className="h-4 w-4 text-emerald-500" />Đợt thực tập</h3>
                      <Badge className={`text-xs ${myBatch.status === 'open' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                        {myBatch.status === 'open' ? 'Đang mở' : 'Đã đóng'}
                      </Badge>
                    </div>
                    <div className="px-5 py-4 space-y-3">
                      <div>
                        <p className="text-xs text-gray-400 mb-0.5">Tên đợt</p>
                        <p className="font-bold text-gray-900">{myBatch.batch_name}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-emerald-50 rounded-xl p-3 text-center">
                          <p className="text-[10px] text-emerald-500 font-medium mb-0.5">Bắt đầu</p>
                          <p className="text-sm font-bold text-gray-700">{format(new Date(myBatch.start_date), 'dd/MM/yyyy', { locale: vi })}</p>
                        </div>
                        <div className="bg-red-50 rounded-xl p-3 text-center">
                          <p className="text-[10px] text-red-500 font-medium mb-0.5">Kết thúc</p>
                          <p className="text-sm font-bold text-gray-700">{format(new Date(myBatch.end_date), 'dd/MM/yyyy', { locale: vi })}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                  <div className="px-5 py-3.5 border-b border-gray-50 bg-gray-50/50">
                    <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2"><ClipboardList className="h-4 w-4 text-purple-500" />Tiến độ thực tập</h3>
                  </div>
                  <div className="p-5 space-y-4">
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="bg-blue-50 rounded-xl p-3">
                        <p className="text-2xl font-black text-blue-600">{tasks.length}</p>
                        <p className="text-[10px] text-blue-400 font-medium">Nhiệm vụ</p>
                      </div>
                      <div className="bg-emerald-50 rounded-xl p-3">
                        <p className="text-2xl font-black text-emerald-600">{tasks.filter(t => t.status === 'approved').length}</p>
                        <p className="text-[10px] text-emerald-400 font-medium">Hoàn thành</p>
                      </div>
                      <div className="bg-amber-50 rounded-xl p-3">
                        <p className="text-2xl font-black text-amber-600">{tasks.filter(t => t.status === 'request_change').length}</p>
                        <p className="text-[10px] text-amber-400 font-medium">Cần sửa</p>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-gray-400">Tỉ lệ hoàn thành</span>
                        <span className="font-bold text-emerald-600">{tasks.length > 0 ? Math.round(tasks.filter(t => t.status === 'approved').length / tasks.length * 100) : 0}%</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 transition-all"
                          style={{ width: `${tasks.length > 0 ? Math.round(tasks.filter(t => t.status === 'approved').length / tasks.length * 100) : 0}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-16">
              <User className="h-12 w-12 mx-auto mb-3 text-gray-200" />
              <p className="text-gray-400">Chưa có hồ sơ thực tập</p>
            </div>
          )}
        </div>
      )

      case 'evaluation': return (
        <div>
          {evaluationsLoading ? <div className="text-center py-16 text-gray-300">Đang tải...</div>
          : myEvaluation ? (
            <div className="space-y-4">
              <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl p-8 text-white shadow-lg">
                <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-white/5" />
                <div className="absolute -left-6 -bottom-6 w-32 h-32 rounded-full bg-white/5" />
                <div className="relative flex flex-col sm:flex-row items-center justify-center gap-8">
                  <div className="text-center">
                    <p className="text-indigo-200 text-sm mb-1">Điểm tổng kết</p>
                    <p className="text-8xl font-black leading-none">{myEvaluation.total_score}</p>
                    <p className="text-indigo-300 text-sm mt-1">/ 10</p>
                  </div>
                  <div className="w-px h-20 bg-white/20 hidden sm:block" />
                  <div className="text-center">
                    <p className="text-indigo-200 text-sm mb-2">Xếp loại</p>
                    <span className="bg-white/20 px-6 py-2 rounded-full font-black text-2xl">{myEvaluation.ranking}</span>
                    <p className="text-indigo-300 text-xs mt-3">Mentor: {myEvaluation.mentor_name}</p>
                    <p className="text-indigo-400 text-xs">{format(new Date(myEvaluation.created_at), 'dd/MM/yyyy', { locale: vi })}</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                {radarData.length > 0 && (
                  <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                    <h4 className="font-bold text-gray-900 text-sm mb-4">Biểu đồ năng lực</h4>
                    <ResponsiveContainer width="100%" height={260}>
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="#f0f0f0" />
                        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12, fill: '#6b7280' }} />
                        <PolarRadiusAxis domain={[0, 10]} tick={{ fontSize: 9 }} />
                        <Radar dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.25} />
                        <Tooltip />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                )}
                <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                  <h4 className="font-bold text-gray-900 text-sm mb-4">Điểm chi tiết</h4>
                  <div className="space-y-4">
                    {[
                      { key: 'attitude',    label: 'Thái độ làm việc' },
                      { key: 'discipline',  label: 'Ý thức kỷ luật' },
                      { key: 'learning',    label: 'Khả năng học hỏi' },
                      { key: 'skills',      label: 'Kỹ năng chuyên môn' },
                      { key: 'task_result', label: 'Kết quả công việc' },
                    ].map(c => {
                      const score = (myEvaluation.criteria_scores as any)?.[c.key] ?? 0
                      const color = score >= 8 ? '#10b981' : score >= 6.5 ? '#3b82f6' : score >= 5 ? '#f59e0b' : '#ef4444'
                      return (
                        <div key={c.key} className="space-y-1.5">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">{c.label}</span>
                            <span className="text-base font-black" style={{ color }}>{score}<span className="text-xs text-gray-300 font-normal">/10</span></span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${(score / 10) * 100}%`, backgroundColor: color }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {myEvaluation.final_comment && (
                <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                  <h4 className="font-bold text-gray-900 text-sm mb-3 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-indigo-500" />Nhận xét từ Mentor
                  </h4>
                  <div className="bg-indigo-50 rounded-xl p-4">
                    <p className="text-sm text-indigo-900 whitespace-pre-wrap leading-relaxed">{myEvaluation.final_comment}</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-24">
              <div className="w-24 h-24 rounded-3xl bg-gray-50 flex items-center justify-center mb-5 shadow-inner">
                <Award className="h-12 w-12 text-gray-200" />
              </div>
              <p className="font-bold text-gray-400 text-lg">Chưa có đánh giá</p>
              <p className="text-sm text-gray-300 mt-1">Đánh giá sẽ được thực hiện vào cuối kỳ thực tập</p>
            </div>
          )}
        </div>
      )

      default: return null
    }
  }

  return (
    <DashboardLayout role="intern" activeTab={activeTab} onTabChange={setActiveTab}>
      {renderContent()}

      <TaskSubmitDialog open={submitOpen} onOpenChange={setSubmitOpen} task={selectedTask} />
      <TaskViewDialog open={viewOpen} onOpenChange={setViewOpen} task={selectedTask}
        onSubmit={() => { setViewOpen(false); setSubmitOpen(true) }} />
      <TaskChatDialog open={chatOpen} onOpenChange={setChatOpen} task={chatTask} currentUserId={currentUser.id} currentUserRole="intern" />
      <LogbookDialog open={logbookOpen} onOpenChange={setLogbookOpen} batchId={myBatch?.id || myProfile?.batch_id || 0} existing={editingEntry} />
      {myBatch && <ScheduleRegisterDialog open={scheduleOpen} onOpenChange={setScheduleOpen} batchId={myBatch.id} internId={currentUser.id} />}
      {selectedLeaveSchedule && myBatch && (
        <LeaveRequestDialog open={leaveOpen} onOpenChange={setLeaveOpen} schedule={selectedLeaveSchedule} batchId={myBatch.id}
          existingLeave={leaveRequests.find(l => l.leave_date === selectedLeaveSchedule.work_date)} />
      )}
      <AlertDialog open={!!deletingEntryId} onOpenChange={o => !o && setDeletingEntryId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Xóa nhật ký?</AlertDialogTitle><AlertDialogDescription>Hành động này không thể hoàn tác.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={async () => {
              if (!deletingEntryId) return
              try { await deleteLogbook.mutateAsync(deletingEntryId); toast({ title: 'Đã xóa nhật ký' }); setDeletingEntryId(null) }
              catch { toast({ title: 'Lỗi', description: 'Không thể xóa' }) }
            }}>Xóa</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  )
}