import { useState, useEffect, useMemo } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  useCreateEvaluation, useUpdateEvaluation,
  calculateTotalScore, getRankingFromScore, approvalConfig,
  type Evaluation, type CriteriaScores, type CriteriaComments, type CreateEvaluationData,
} from '@/hooks/use-evaluations'
import { useAttendanceHistory } from '@/hooks/use-attendance'
import { type InternProfile } from '@/hooks/use-profiles'
import { useTasks } from '@/hooks/use-tasks'
import { useBatches } from '@/hooks/use-batches'
import { useToast } from '@/hooks/use-toast'
import {
  Star, Award, FileText, CheckCircle2, Clock,
  XCircle, ChevronDown, ChevronUp, Lock, AlertTriangle,
  TrendingUp, AlertCircle, Sparkles, Info,
  CalendarCheck, MessageSquare,
} from 'lucide-react'
import { format, isPast } from 'date-fns'
import { vi } from 'date-fns/locale'

interface EvaluationFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  intern: InternProfile | null
  existingEvaluation?: Evaluation | null
}

const criteriaLabels: Record<keyof CriteriaScores, {
  label: string; description: string; icon: string; placeholder: string
}> = {
  attitude:    {
    label: 'Thái độ làm việc',
    description: 'Tinh thần cầu tiến, chủ động, nhiệt tình',
    icon: '😊',
    placeholder: 'VD: Luôn chủ động, nhiệt tình trong công việc, thái độ cầu tiến...',
  },
  discipline:  {
    label: 'Kỷ luật',
    description: 'Đúng giờ, tuân thủ quy định, tác phong chuyên nghiệp',
    icon: '⏰',
    placeholder: 'VD: Đi làm đúng giờ, tuân thủ nội quy, tác phong nghiêm túc...',
  },
  learning:    {
    label: 'Khả năng học hỏi',
    description: 'Tiếp thu nhanh, ham học hỏi, tự tìm tòi',
    icon: '📚',
    placeholder: 'VD: Tiếp thu kiến thức nhanh, hay đặt câu hỏi, tự nghiên cứu...',
  },
  skills:      {
    label: 'Kỹ năng chuyên môn',
    description: 'Năng lực kỹ thuật, giải quyết vấn đề',
    icon: '🔧',
    placeholder: 'VD: Có nền tảng kỹ thuật tốt, giải quyết vấn đề logic...',
  },
  task_result: {
    label: 'Kết quả công việc',
    description: 'Hoàn thành nhiệm vụ được giao, chất lượng, đúng/trễ hạn',
    icon: '✅',
    placeholder: 'VD: Hoàn thành đúng hạn X/Y nhiệm vụ, chất lượng đạt yêu cầu...',
  },
}

const rankingColors: Record<string, string> = {
  'Xuất sắc':   'bg-purple-100 text-purple-800 border-purple-300',
  'Giỏi':       'bg-green-100 text-green-800 border-green-300',
  'Khá':        'bg-blue-100 text-blue-800 border-blue-300',
  'Trung bình': 'bg-yellow-100 text-yellow-800 border-yellow-300',
  'Yếu':        'bg-red-100 text-red-800 border-red-300',
}

const rankingGradients: Record<string, string> = {
  'Xuất sắc':   'from-purple-500 to-purple-700',
  'Giỏi':       'from-green-500 to-green-700',
  'Khá':        'from-blue-500 to-blue-700',
  'Trung bình': 'from-yellow-500 to-yellow-600',
  'Yếu':        'from-red-500 to-red-700',
}

const taskStatusConfig: Record<string, { label: string; icon: React.ReactNode; cls: string }> = {
  approved:       { label: 'Đã duyệt', icon: <CheckCircle2 className="h-3.5 w-3.5" />, cls: 'bg-green-100 text-green-700'   },
  submitted:      { label: 'Đã nộp',   icon: <Clock className="h-3.5 w-3.5" />,        cls: 'bg-blue-100 text-blue-700'     },
  request_change: { label: 'Cần sửa',  icon: <XCircle className="h-3.5 w-3.5" />,      cls: 'bg-orange-100 text-orange-700' },
  new:            { label: 'Chưa nộp', icon: <Clock className="h-3.5 w-3.5" />,        cls: 'bg-gray-100 text-gray-600'     },
  overdue:        { label: 'Quá hạn',  icon: <XCircle className="h-3.5 w-3.5" />,      cls: 'bg-red-100 text-red-700'       },
}

function suggestTaskResultScore(approved: number, total: number, overdueCount: number): number {
  if (total === 0) return 5
  const completionRate = approved / total
  let score = completionRate * 10
  score -= overdueCount * 0.3
  return Math.max(1, Math.min(10, Math.round(score * 2) / 2))
}

const defaultComments: CriteriaComments = {
  attitude: '', discipline: '', learning: '', skills: '', task_result: '',
}

export default function EvaluationFormDialog({
  open, onOpenChange, intern, existingEvaluation,
}: EvaluationFormDialogProps) {
  const { toast } = useToast()
  const createEvaluation = useCreateEvaluation()
  const updateEvaluation = useUpdateEvaluation()
  const { data: allTasks = [] } = useTasks()
  const { data: batches = [] }  = useBatches()

  const [scores, setScores] = useState<CriteriaScores>({
    attitude: 7, discipline: 7, learning: 7, skills: 7, task_result: 7,
  })
  const [comments, setComments]         = useState<CriteriaComments>(defaultComments)
  const [finalComment, setFinalComment] = useState('')
  const [showTasks, setShowTasks]       = useState(true)
  const [showSuggest, setShowSuggest]   = useState(false)

  // ✅ Kiểm tra đợt của TTS có còn mở không
  const internBatch = useMemo(() =>
    batches.find((b: any) => b.id === intern?.batch_id),
  [batches, intern])

  const isBatchClosed = internBatch?.status === 'closed'

  // Form bị lock nếu: đợt đã đóng HOẶC đánh giá đã được HR duyệt
  const isApproved    = existingEvaluation?.approval_status === 'approved'
  const isReadOnly    = isApproved || isBatchClosed   // ← điểm mấu chốt
  const approvalCfg   = existingEvaluation ? approvalConfig[existingEvaluation.approval_status] : null

  const { data: attendances = [] } = useAttendanceHistory(
    intern && internBatch ? {
      intern_id: intern.user_id,
      batch_id:  intern.batch_id,
    } : undefined
  )

  const attendanceStats = useMemo(() => {
    const working = attendances.filter((a: any) =>
      a.status === 'present' || a.status === 'checked_out'
    ).length
    const absent = attendances.filter((a: any) => a.status === 'absent').length
    return { working, absent, total: working + absent }
  }, [attendances])

  const internTasks = useMemo(() =>
    allTasks.filter(t => t.intern_id === intern?.user_id),
  [allTasks, intern])

  const taskStats = useMemo(() => {
    const total     = internTasks.length
    const approved  = internTasks.filter(t => t.status === 'approved').length
    const submitted = internTasks.filter(t => t.status === 'submitted').length
    const overdue   = internTasks.filter(t => t.status === 'overdue').length
    const pending   = internTasks.filter(t => t.status === 'new' || t.status === 'request_change').length
    const completionRate = total > 0 ? Math.round((approved / total) * 100) : 0
    return { total, approved, submitted, overdue, pending, completionRate }
  }, [internTasks])

  const suggestedTaskScore = useMemo(() =>
    suggestTaskResultScore(taskStats.approved, taskStats.total, taskStats.overdue),
  [taskStats])

  useEffect(() => {
    if (!open) return
    if (existingEvaluation) {
      setScores(existingEvaluation.criteria_scores)
      setComments(existingEvaluation.criteria_comments ?? defaultComments)
      setFinalComment(existingEvaluation.final_comment || '')
    } else {
      setScores({ attitude: 7, discipline: 7, learning: 7, skills: 7, task_result: suggestedTaskScore })
      setComments(defaultComments)
      setFinalComment('')
    }
    setShowSuggest(false)
  }, [existingEvaluation, open, suggestedTaskScore])

  const totalScore = calculateTotalScore(scores)
  const ranking    = getRankingFromScore(totalScore)

  const handleScoreChange = (key: keyof CriteriaScores, value: number[]) => {
    if (isReadOnly) return
    setScores(prev => ({ ...prev, [key]: value[0] }))
  }

  const handleCommentChange = (key: keyof CriteriaComments, value: string) => {
    if (isReadOnly) return
    setComments(prev => ({ ...prev, [key]: value }))
  }

  const handleApplySuggest = () => {
    if (isReadOnly) return
    setScores(prev => ({ ...prev, task_result: suggestedTaskScore }))
    toast({ title: '✨ Đã áp dụng điểm gợi ý', description: `Kết quả công việc: ${suggestedTaskScore}/10` })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!intern || isReadOnly) return
    if (!finalComment.trim()) {
      toast({ title: 'Lỗi', description: 'Vui lòng nhập nhận xét tổng quan' })
      return
    }
    try {
      const payload = {
        criteria_scores:   scores,
        criteria_comments: comments,
        final_comment:     finalComment,
        total_score:       totalScore,
        ranking,
        working_days: attendanceStats.working || undefined,
        absent_days:  attendanceStats.absent  || undefined,
      }
      if (existingEvaluation) {
        await updateEvaluation.mutateAsync({ evaluationId: existingEvaluation.id, data: payload })
        toast({ title: '✅ Cập nhật thành công', description: 'Đánh giá sẽ chờ HR duyệt lại.' })
      } else {
        await createEvaluation.mutateAsync({ intern_id: intern.user_id, ...payload } as CreateEvaluationData)
        toast({ title: '✅ Tạo đánh giá thành công', description: 'HR sẽ được thông báo để duyệt.' })
      }
      onOpenChange(false)
    } catch (error: any) {
      toast({ title: 'Lỗi', description: error.response?.data?.detail || 'Có lỗi xảy ra' })
    }
  }

  const isLoading = createEvaluation.isPending || updateEvaluation.isPending
  if (!intern) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-[#0f2d6b]" />
            {isBatchClosed ? 'Xem đánh giá — ' : 'Đánh giá cuối kỳ — '}
            {intern.user_full_name}
            {isBatchClosed && (
              <span className="ml-1 inline-flex items-center gap-1 text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                <Lock className="h-3 w-3" /> Đợt đã kết thúc
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">

          {/* ✅ Banner đợt đã đóng — hiện rõ lý do lock */}
          {isBatchClosed && (
            <div className="flex items-start gap-3 rounded-xl border border-gray-200 px-4 py-3 bg-gray-50">
              <Lock className="h-4 w-4 mt-0.5 shrink-0 text-gray-500" />
              <div>
                <p className="text-sm font-semibold text-gray-700">Đợt thực tập đã kết thúc</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Đợt <strong>{intern.batch_name}</strong> đã đóng — chỉ có thể xem đánh giá, không thể chỉnh sửa.
                </p>
              </div>
            </div>
          )}

          {/* Approval banner (chỉ hiện khi có đánh giá) */}
          {approvalCfg && !isBatchClosed && (
            <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${approvalCfg.bg} ${approvalCfg.border}`}>
              {isApproved
                ? <CheckCircle2 className={`h-4 w-4 mt-0.5 shrink-0 ${approvalCfg.text}`} />
                : existingEvaluation?.approval_status === 'rejected'
                  ? <AlertTriangle className={`h-4 w-4 mt-0.5 shrink-0 ${approvalCfg.text}`} />
                  : <Clock className={`h-4 w-4 mt-0.5 shrink-0 ${approvalCfg.text}`} />}
              <div className="flex-1">
                <p className={`text-sm font-semibold ${approvalCfg.text}`}>{approvalCfg.label}</p>
                {isApproved && (
                  <p className={`text-xs mt-0.5 ${approvalCfg.text} opacity-80`}>
                    Đánh giá đã được duyệt — không thể chỉnh sửa.
                    {existingEvaluation.approved_at && ` Duyệt lúc ${format(new Date(existingEvaluation.approved_at), 'HH:mm dd/MM/yyyy', { locale: vi })}.`}
                  </p>
                )}
                {existingEvaluation?.approval_status === 'rejected' && (
                  <p className={`text-xs mt-0.5 ${approvalCfg.text} opacity-80`}>
                    HR đã từ chối. Bạn có thể chỉnh sửa và gửi lại.
                  </p>
                )}
                {existingEvaluation?.hr_note && (
                  <p className={`text-xs mt-1 italic ${approvalCfg.text}`}>
                    Ghi chú HR: "{existingEvaluation.hr_note}"
                  </p>
                )}
              </div>
              {isApproved && <Lock className={`h-4 w-4 shrink-0 ${approvalCfg.text}`} />}
            </div>
          )}

          {/* Thông tin TTS + thống kê nhiệm vụ */}
          <div className="bg-gradient-to-br from-[#0f2d6b]/5 to-blue-50 rounded-xl border border-blue-100 p-4 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#0f2d6b] flex items-center justify-center text-white font-bold text-sm shrink-0">
                  {intern.user_full_name.charAt(0)}
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">{intern.user_full_name}</h4>
                  <p className="text-xs text-muted-foreground">{intern.user_email}</p>
                  <p className="text-xs text-muted-foreground">
                    Đợt: {intern.batch_name}
                    {isBatchClosed && (
                      <span className="ml-1.5 text-gray-400 italic">(đã kết thúc)</span>
                    )}
                  </p>
                </div>
              </div>
              <div className="text-right min-w-[100px]">
                <p className="text-xs text-muted-foreground mb-1">Tỷ lệ hoàn thành</p>
                <p className="text-2xl font-black text-[#0f2d6b]">{taskStats.completionRate}%</p>
                <div className="h-1.5 w-full bg-gray-200 rounded-full mt-1 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-[#0f2d6b] to-blue-400 transition-all"
                    style={{ width: `${taskStats.completionRate}%` }} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {[
                { label: 'Tổng NV',   value: taskStats.total,     color: 'text-gray-700',   bg: 'bg-white',     border: 'border-gray-200'   },
                { label: 'Đã duyệt',  value: taskStats.approved,  color: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-200'  },
                { label: 'Đã nộp',    value: taskStats.submitted, color: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-200'   },
                { label: 'Quá hạn',   value: taskStats.overdue,   color: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-200'    },
                { label: 'Chưa nộp',  value: taskStats.pending,   color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200' },
              ].map(s => (
                <div key={s.label} className={`${s.bg} border ${s.border} rounded-lg p-2 text-center`}>
                  <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">{s.label}</p>
                </div>
              ))}
            </div>

            {taskStats.overdue > 0 && (
              <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>
                  <strong>{taskStats.overdue} nhiệm vụ quá hạn</strong> — ảnh hưởng đến điểm kết quả công việc.
                </span>
              </div>
            )}

            {/* ✅ Gợi ý điểm — chỉ hiện khi đợt còn mở và chưa có đánh giá */}
            {!existingEvaluation && !isReadOnly && taskStats.total > 0 && (
              <div className="flex items-center justify-between bg-white border border-blue-200 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2 text-xs text-blue-700">
                  <Sparkles className="h-3.5 w-3.5 shrink-0 text-blue-500" />
                  <span>
                    Gợi ý điểm <strong>Kết quả công việc: {suggestedTaskScore}/10</strong>
                    {' '}({taskStats.completionRate}% hoàn thành
                    {taskStats.overdue > 0 && `, trừ ${taskStats.overdue} task trễ`})
                  </span>
                </div>
                <Button type="button" size="sm" variant="outline"
                  className="h-6 text-[10px] border-blue-300 text-blue-700 hover:bg-blue-50 shrink-0 ml-2"
                  onClick={handleApplySuggest}>
                  Áp dụng
                </Button>
              </div>
            )}
          </div>

          {/* Thống kê chuyên cần */}
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-100">
              <CalendarCheck className="h-4 w-4 text-[#0f2d6b]" />
              <span className="text-sm font-semibold text-gray-800">Thống kê chuyên cần</span>
              <span className="text-xs text-gray-400 ml-1 font-normal">tự động từ hệ thống điểm danh</span>
            </div>
            <div className="p-4 space-y-3">
              {attendanceStats.total === 0 ? (
                <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-50 rounded-xl px-3 py-3">
                  <CalendarCheck className="h-4 w-4 shrink-0" />
                  <span>Chưa có dữ liệu điểm danh cho thực tập sinh này</span>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-center">
                      <p className="text-2xl font-black text-green-700">{attendanceStats.working}</p>
                      <p className="text-[11px] text-green-600 mt-0.5 font-medium">Ngày đi làm</p>
                    </div>
                    <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-center">
                      <p className="text-2xl font-black text-red-600">{attendanceStats.absent}</p>
                      <p className="text-[11px] text-red-500 mt-0.5 font-medium">Ngày vắng mặt</p>
                    </div>
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center">
                      <p className="text-2xl font-black text-blue-700">{attendanceStats.total}</p>
                      <p className="text-[11px] text-blue-600 mt-0.5 font-medium">Tổng ngày có lịch</p>
                    </div>
                  </div>
                  {(() => {
                    const rate = attendanceStats.total > 0
                      ? Math.round((attendanceStats.working / attendanceStats.total) * 100)
                      : 0
                    return (
                      <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="text-gray-500 font-medium">Tỷ lệ chuyên cần</span>
                          <span className={`font-black ${rate >= 90 ? 'text-green-600' : rate >= 75 ? 'text-blue-600' : rate >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {rate}%
                          </span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${rate >= 90 ? 'bg-green-500' : rate >= 75 ? 'bg-blue-500' : rate >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                            style={{ width: `${rate}%` }}
                          />
                        </div>
                        {attendanceStats.absent >= 3 && (
                          <p className="text-[10px] text-orange-500 mt-1.5 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Vắng {attendanceStats.absent} ngày — nên đề cập trong nhận xét
                          </p>
                        )}
                      </div>
                    )
                  })()}
                </>
              )}
            </div>
          </div>

          {/* Danh sách nhiệm vụ */}
          {internTasks.length > 0 && (
            <div className="border rounded-xl overflow-hidden">
              <button type="button" onClick={() => setShowTasks(v => !v)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors">
                <span className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                  <FileText className="h-4 w-4 text-blue-600" />
                  Danh sách nhiệm vụ ({internTasks.length})
                  {taskStats.overdue > 0 && (
                    <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-medium">
                      {taskStats.overdue} quá hạn
                    </span>
                  )}
                </span>
                {showTasks ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </button>
              {showTasks && (
                <div className="divide-y max-h-52 overflow-y-auto">
                  <div className="grid grid-cols-[1fr_100px_90px] gap-2 px-4 py-2 bg-gray-50/80 text-[10px] font-bold text-gray-500 uppercase tracking-wide">
                    <span>Nhiệm vụ</span>
                    <span className="text-center">Deadline</span>
                    <span className="text-center">Trạng thái</span>
                  </div>
                  {internTasks
                    .sort((a, b) => {
                      const order: Record<string, number> = { approved: 0, submitted: 1, request_change: 2, new: 3, overdue: 4 }
                      return (order[a.status] ?? 5) - (order[b.status] ?? 5)
                    })
                    .map(task => {
                      const sc = taskStatusConfig[task.status] || taskStatusConfig.new
                      const deadlinePast = isPast(new Date(task.deadline))
                      return (
                        <div key={task.id}
                          className={`grid grid-cols-[1fr_100px_90px] gap-2 items-center px-4 py-2.5 hover:bg-gray-50 ${task.status === 'overdue' ? 'bg-red-50/30' : ''}`}>
                          <p className="text-sm font-medium truncate">{task.title}</p>
                          <p className={`text-xs text-center ${deadlinePast && task.status !== 'approved' ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}>
                            {format(new Date(task.deadline), 'dd/MM/yyyy', { locale: vi })}
                          </p>
                          <div className="flex justify-center">
                            <Badge className={`${sc.cls} flex items-center gap-1 text-[10px] px-1.5`}>
                              {sc.icon}{sc.label}
                            </Badge>
                          </div>
                        </div>
                      )
                    })}
                </div>
              )}
            </div>
          )}

          <Separator />

          {/* Form chấm điểm */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-500" />
                Chấm điểm theo tiêu chí
                <span className="text-xs font-normal text-muted-foreground">(1–10)</span>
                {/* ✅ Hiện lý do lock rõ ràng */}
                {isReadOnly && (
                  <span className="text-xs font-normal text-muted-foreground flex items-center gap-1">
                    <Lock className="h-3 w-3" />
                    {isBatchClosed ? 'Đợt đã đóng' : 'Đã khóa'}
                  </span>
                )}
              </h4>
              {!isReadOnly && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Info className="h-3.5 w-3.5" />
                  <span>Kéo thanh để chấm điểm</span>
                </div>
              )}
            </div>

            <div className="space-y-4">
              {(Object.keys(criteriaLabels) as Array<keyof CriteriaScores>).map(key => {
                const score = scores[key]
                const scoreColor = score >= 8 ? 'text-green-600' : score >= 6 ? 'text-blue-600' : score >= 4 ? 'text-yellow-600' : 'text-red-600'
                const trackColor = score >= 8 ? 'bg-green-50'  : score >= 6 ? 'bg-blue-50'  : score >= 4 ? 'bg-yellow-50'  : 'bg-red-50'
                const isTaskResult = key === 'task_result'

                return (
                  <div key={key} className={`rounded-xl border p-4 space-y-3 transition-all ${
                    isReadOnly ? 'opacity-60 bg-gray-50 border-gray-100' : `${trackColor} border-transparent`
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{criteriaLabels[key].icon}</span>
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{criteriaLabels[key].label}</p>
                          <p className="text-xs text-muted-foreground">{criteriaLabels[key].description}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`text-2xl font-black ${scoreColor}`}>{score}</span>
                        <span className="text-xs text-muted-foreground">/10</span>
                      </div>
                    </div>

                    {isTaskResult && taskStats.total > 0 && !isReadOnly && (
                      <div className="flex items-center gap-1.5 text-[10px] text-blue-600 bg-white/60 rounded px-2 py-1">
                        <TrendingUp className="h-3 w-3 shrink-0" />
                        <span>
                          Hoàn thành {taskStats.approved}/{taskStats.total}
                          {taskStats.overdue > 0 && ` · ${taskStats.overdue} quá hạn`}
                          {' '}→ Gợi ý: <strong>{suggestedTaskScore}/10</strong>
                        </span>
                      </div>
                    )}

                    {/* ✅ Slider — pointer-events-none khi readOnly */}
                    <Slider
                      value={[score]}
                      onValueChange={value => handleScoreChange(key, value)}
                      min={1} max={10} step={0.5}
                      className={isReadOnly ? 'pointer-events-none' : 'cursor-pointer'}
                    />
                    <div className="flex justify-between text-[9px] text-muted-foreground px-0.5">
                      <span>1 — Yếu</span><span>5 — TB</span><span>8 — Giỏi</span><span>10 — XS</span>
                    </div>

                    {/* ✅ Textarea nhận xét — readOnly khi đợt đóng */}
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-600 flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        Nhận xét cho tiêu chí này
                        <span className="text-gray-400 font-normal">(tuỳ chọn)</span>
                      </label>
                      <Textarea
                        value={comments[key]}
                        onChange={e => handleCommentChange(key, e.target.value)}
                        placeholder={criteriaLabels[key].placeholder}
                        rows={2}
                        readOnly={isReadOnly}
                        className={`text-xs resize-none ${isReadOnly ? 'bg-white/50 cursor-not-allowed' : 'bg-white/80'}`}
                      />
                    </div>
                  </div>
                )
              })}
            </div>

            <Separator />

            {/* Tổng điểm + Xếp loại */}
            <div className={`rounded-xl overflow-hidden ${isReadOnly ? 'opacity-60' : ''}`}>
              <div className={`bg-gradient-to-r ${rankingGradients[ranking]} p-4 text-white`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide opacity-80">Điểm tổng kết</p>
                    <p className="text-5xl font-black mt-1">{totalScore}</p>
                    <p className="text-xs opacity-70 mt-1">Trung bình 5 tiêu chí</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold uppercase tracking-wide opacity-80 mb-2">Xếp loại</p>
                    <div className="bg-white/20 rounded-xl px-4 py-2 text-center">
                      <p className="text-xl font-black">{ranking}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-5 gap-1.5">
                  {(Object.keys(criteriaLabels) as Array<keyof CriteriaScores>).map(key => (
                    <div key={key} className="text-center">
                      <p className="text-[9px] opacity-70 mb-1 truncate">{criteriaLabels[key].label.split(' ')[0]}</p>
                      <div className="h-10 bg-white/20 rounded overflow-hidden flex items-end">
                        <div className="w-full bg-white/70 rounded transition-all"
                          style={{ height: `${(scores[key] / 10) * 100}%` }} />
                      </div>
                      <p className="text-[10px] font-bold mt-0.5">{scores[key]}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <Separator />

            {/* Nhận xét tổng quan */}
            <div className="space-y-2">
              <Label htmlFor="finalComment" className="font-semibold">
                Nhận xét tổng quan {!isReadOnly && <span className="text-red-500">*</span>}
              </Label>
              {!isReadOnly && !finalComment && (
                <div className="text-xs text-muted-foreground bg-gray-50 border border-dashed rounded-lg p-3 space-y-1">
                  <p className="font-medium text-gray-600">💡 Gợi ý nội dung:</p>
                  <ul className="space-y-0.5 text-gray-500 list-disc list-inside">
                    <li>Tổng quan thái độ và tinh thần làm việc</li>
                    <li>Điểm mạnh nổi bật</li>
                    <li>Điểm cần cải thiện</li>
                    {taskStats.overdue > 0 && <li className="text-red-500">Lưu ý: {taskStats.overdue} nhiệm vụ quá hạn</li>}
                    {attendanceStats.absent >= 3 && <li className="text-orange-500">Lưu ý: {attendanceStats.absent} ngày vắng mặt</li>}
                    <li>Định hướng phát triển</li>
                  </ul>
                </div>
              )}
              <Textarea
                id="finalComment"
                value={finalComment}
                onChange={e => { if (!isReadOnly) setFinalComment(e.target.value) }}
                placeholder="Nhập nhận xét tổng quan về thực tập sinh..."
                rows={5}
                readOnly={isReadOnly}
                className={isReadOnly ? 'bg-gray-50 cursor-not-allowed resize-none' : 'resize-none'}
              />
              {!isReadOnly && (
                <p className="text-xs text-muted-foreground text-right">{finalComment.length} ký tự</p>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {isReadOnly ? 'Đóng' : 'Hủy'}
              </Button>
              {/* ✅ Ẩn nút Lưu khi đợt đóng hoặc đã approved */}
              {!isReadOnly && (
                <Button type="submit" disabled={isLoading} className="bg-[#0f2d6b] hover:bg-[#1a3d8a] gap-2">
                  <Award className="h-4 w-4" />
                  {isLoading
                    ? 'Đang xử lý...'
                    : existingEvaluation
                      ? 'Cập nhật & gửi HR duyệt'
                      : 'Lưu & gửi HR duyệt'}
                </Button>
              )}
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}