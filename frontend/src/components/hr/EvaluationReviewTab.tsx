import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  CheckCircle, XCircle, Award, Eye, ChevronDown, ChevronUp,
  Loader2, ClipboardList, AlertCircle, TrendingUp, Clock,
  MessageSquare, CalendarCheck, UserX, Star,
} from 'lucide-react'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import {
  useEvaluations, useApproveEvaluation, approvalConfig,
  type Evaluation, type ApprovalStatus,
} from '@/hooks/use-evaluations'
import { useAttendanceHistory } from '@/hooks/use-attendance'
import { useBatches } from '@/hooks/use-batches'
import { useInternProfiles } from '@/hooks/use-profiles'
import { useTasks } from '@/hooks/use-tasks'
import { useToast } from '@/hooks/use-toast'

// ─── Constants ────────────────────────────────────────────────────────────────

const rankingConfig: Record<string, { bg: string; text: string; bar: string; gradient: string }> = {
  'Xuất sắc':   { bg: 'bg-purple-100', text: 'text-purple-700', bar: 'bg-purple-500', gradient: 'from-purple-500 to-purple-700' },
  'Giỏi':       { bg: 'bg-green-100',  text: 'text-green-700',  bar: 'bg-green-500',  gradient: 'from-green-500 to-emerald-600' },
  'Khá':        { bg: 'bg-blue-100',   text: 'text-blue-700',   bar: 'bg-blue-500',   gradient: 'from-blue-500 to-blue-600'    },
  'Trung bình': { bg: 'bg-yellow-100', text: 'text-yellow-700', bar: 'bg-yellow-400', gradient: 'from-yellow-400 to-yellow-600' },
  'Yếu':        { bg: 'bg-red-100',    text: 'text-red-700',    bar: 'bg-red-500',    gradient: 'from-red-500 to-red-700'      },
}

const criteriaLabels: Record<string, { label: string; icon: string; description: string }> = {
  attitude:    { label: 'Thái độ làm việc',   icon: '😊', description: 'Tinh thần cầu tiến, chủ động, nhiệt tình'              },
  discipline:  { label: 'Kỷ luật',            icon: '⏰', description: 'Đúng giờ, tuân thủ quy định, tác phong chuyên nghiệp'  },
  learning:    { label: 'Khả năng học hỏi',   icon: '📚', description: 'Tiếp thu nhanh, ham học hỏi, tự tìm tòi'               },
  skills:      { label: 'Kỹ năng chuyên môn', icon: '🔧', description: 'Năng lực kỹ thuật, giải quyết vấn đề'                  },
  task_result: { label: 'Kết quả công việc',  icon: '✅', description: 'Hoàn thành nhiệm vụ, chất lượng, đúng/trễ hạn'         },
}

const taskStatusConfig: Record<string, { label: string; cls: string }> = {
  approved:       { label: 'Đã duyệt', cls: 'bg-green-100 text-green-700'   },
  submitted:      { label: 'Đã nộp',   cls: 'bg-blue-100 text-blue-700'     },
  request_change: { label: 'Cần sửa',  cls: 'bg-orange-100 text-orange-700' },
  new:            { label: 'Chưa nộp', cls: 'bg-gray-100 text-gray-600'     },
  overdue:        { label: 'Quá hạn',  cls: 'bg-red-100 text-red-700'       },
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ScoreBar({ label, icon, value, barCls }: { label: string; icon: string; value: number; barCls: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm w-4 shrink-0">{icon}</span>
      <span className="text-xs text-gray-500 w-20 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${barCls}`} style={{ width: `${(value / 10) * 100}%` }} />
      </div>
      <span className="text-xs font-bold text-gray-700 w-6 text-right">{value}</span>
    </div>
  )
}

// ─── Full Review Dialog ───────────────────────────────────────────────────────

function FullReviewDialog({
  reviewing, isLocked, hrNote, setHrNote,
  onClose, onApprove, isPending, internBatchMap, batches,
}: {
  reviewing: Evaluation | null
  isLocked: boolean
  hrNote: string
  setHrNote: (v: string) => void
  onClose: () => void
  onApprove: (d: 'approved' | 'rejected') => void
  isPending: boolean
  internBatchMap: Map<number, { batchId: number; batchName: string }>
  batches: any[]
}) {
  const [showTasks, setShowTasks] = useState(true)
  const { data: allTasks = [] } = useTasks()

  // Fetch điểm danh TTS
  const { data: attendances = [] } = useAttendanceHistory(
    reviewing ? { intern_id: reviewing.intern_id } : undefined
  )

  const attendanceStats = useMemo(() => {
    const working = attendances.filter((a: any) => a.status === 'present' || a.status === 'checked_out').length
    const absent  = attendances.filter((a: any) => a.status === 'absent').length
    return { working, absent, total: working + absent }
  }, [attendances])

  const internTasks = useMemo(() =>
    allTasks.filter(t => t.intern_id === reviewing?.intern_id),
  [allTasks, reviewing])

  const taskStats = useMemo(() => {
    const total    = internTasks.length
    const approved = internTasks.filter(t => t.status === 'approved').length
    const overdue  = internTasks.filter(t => t.status === 'overdue').length
    const completion = total > 0 ? Math.round((approved / total) * 100) : 0
    return { total, approved, overdue, completion }
  }, [internTasks])

  if (!reviewing) return null

  const aCfg    = approvalConfig[reviewing.approval_status]
  const rCfg    = rankingConfig[reviewing.ranking] || rankingConfig['Trung bình']
  const batchInfo = internBatchMap.get(reviewing.intern_id)
  const canApprove = reviewing.approval_status !== 'approved' && !isLocked

  return (
    <Dialog open={!!reviewing} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-[#0f2d6b]" />
            Xét duyệt đánh giá — {reviewing.intern_name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">

          {/* ── Header điểm + xếp loại ── */}
          <div className="rounded-xl overflow-hidden">
            <div className={`bg-gradient-to-r ${rCfg.gradient} p-4 text-white`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold shrink-0">
                    {reviewing.intern_name?.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-base">{reviewing.intern_name}</p>
                    <p className="text-xs opacity-80">Mentor: {reviewing.mentor_name}</p>
                    {batchInfo && <p className="text-xs opacity-70">{batchInfo.batchName}</p>}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-4xl font-black">{reviewing.total_score}</p>
                  <p className="text-sm font-bold opacity-80">{reviewing.ranking}</p>
                </div>
              </div>
              {/* Mini bar chart */}
              <div className="mt-4 grid grid-cols-5 gap-1">
                {Object.entries(reviewing.criteria_scores).map(([k, v]) => (
                  <div key={k} className="text-center">
                    <p className="text-[9px] opacity-70 mb-1">{criteriaLabels[k]?.icon}</p>
                    <div className="h-8 bg-white/20 rounded overflow-hidden flex items-end">
                      <div className="w-full bg-white/60 rounded" style={{ height: `${(v / 10) * 100}%` }} />
                    </div>
                    <p className="text-[10px] font-bold mt-0.5">{v}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Thống kê chuyên cần ── */}
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-100">
              <CalendarCheck className="h-4 w-4 text-[#0f2d6b]" />
              <span className="text-sm font-semibold text-gray-800">Thống kê chuyên cần</span>
              <span className="text-xs text-gray-400 font-normal">từ hệ thống điểm danh</span>
            </div>
            <div className="p-3">
              {attendanceStats.total === 0 ? (
                <p className="text-xs text-gray-400 text-center py-2">Chưa có dữ liệu điểm danh</p>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-green-50 border border-green-100 rounded-xl p-2.5 text-center">
                      <p className="text-xl font-black text-green-700">{attendanceStats.working}</p>
                      <p className="text-[10px] text-green-600 font-medium">Ngày đi làm</p>
                    </div>
                    <div className="bg-red-50 border border-red-100 rounded-xl p-2.5 text-center">
                      <p className="text-xl font-black text-red-600">{attendanceStats.absent}</p>
                      <p className="text-[10px] text-red-500 font-medium">Ngày vắng</p>
                    </div>
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-2.5 text-center">
                      <p className="text-xl font-black text-blue-700">{attendanceStats.total}</p>
                      <p className="text-[10px] text-blue-600 font-medium">Tổng có lịch</p>
                    </div>
                  </div>
                  {/* Tỷ lệ */}
                  {(() => {
                    const rate = attendanceStats.total > 0
                      ? Math.round((attendanceStats.working / attendanceStats.total) * 100) : 0
                    return (
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-500">Tỷ lệ chuyên cần</span>
                          <span className={`font-bold ${rate >= 90 ? 'text-green-600' : rate >= 75 ? 'text-blue-600' : rate >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {rate}%
                          </span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${rate >= 90 ? 'bg-green-500' : rate >= 75 ? 'bg-blue-500' : rate >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                            style={{ width: `${rate}%` }} />
                        </div>
                      </div>
                    )
                  })()}
                </div>
              )}
            </div>
          </div>

          {/* ── Chấm điểm từng tiêu chí + nhận xét ── */}
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-100">
              <Star className="h-4 w-4 text-yellow-500" />
              <span className="text-sm font-semibold text-gray-800">Điểm & Nhận xét từng tiêu chí</span>
            </div>
            <div className="divide-y divide-gray-50">
              {Object.entries(reviewing.criteria_scores).map(([key, score]) => {
                const cLabel   = criteriaLabels[key]
                const comment  = reviewing.criteria_comments?.[key as keyof typeof reviewing.criteria_comments]
                const scoreColor = score >= 8 ? 'text-green-600' : score >= 6 ? 'text-blue-600' : score >= 4 ? 'text-yellow-600' : 'text-red-600'
                const trackBg   = score >= 8 ? 'bg-green-50'  : score >= 6 ? 'bg-blue-50'  : score >= 4 ? 'bg-yellow-50'  : 'bg-red-50'

                return (
                  <div key={key} className={`p-4 ${trackBg}`}>
                    {/* Header tiêu chí */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{cLabel?.icon}</span>
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{cLabel?.label}</p>
                          <p className="text-xs text-gray-400">{cLabel?.description}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`text-2xl font-black ${scoreColor}`}>{score}</span>
                        <span className="text-xs text-gray-400">/10</span>
                      </div>
                    </div>

                    {/* Thanh điểm */}
                    <div className="h-2 bg-white/60 rounded-full overflow-hidden mb-2">
                      <div className={`h-full rounded-full transition-all ${rCfg.bar}`}
                        style={{ width: `${(score / 10) * 100}%` }} />
                    </div>

                    {/* Nhận xét tiêu chí */}
                    {comment ? (
                      <div className="flex items-start gap-2 bg-white/70 rounded-lg px-3 py-2">
                        <MessageSquare className="h-3.5 w-3.5 text-gray-400 shrink-0 mt-0.5" />
                        <p className="text-xs text-gray-600 italic">{comment}</p>
                      </div>
                    ) : (
                      <p className="text-[10px] text-gray-300 italic">Mentor không có nhận xét cho tiêu chí này</p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── Nhiệm vụ ── */}
          <div className="border rounded-xl overflow-hidden">
            <button type="button" onClick={() => setShowTasks(v => !v)}
              className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors">
              <span className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <ClipboardList className="h-4 w-4 text-blue-600" />
                Thống kê nhiệm vụ ({internTasks.length})
                {taskStats.overdue > 0 && (
                  <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">
                    {taskStats.overdue} quá hạn
                  </span>
                )}
              </span>
              {showTasks ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
            </button>
            {showTasks && (
              <div className="p-4 bg-white space-y-3">
                {/* Stats nhiệm vụ */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500">Tỷ lệ hoàn thành</span>
                    <span className="font-bold text-[#0f2d6b]">{taskStats.completion}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-[#0f2d6b] to-blue-400"
                      style={{ width: `${taskStats.completion}%` }} />
                  </div>
                </div>
                {taskStats.overdue > 0 && (
                  <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span><strong>{taskStats.overdue} nhiệm vụ quá hạn</strong></span>
                  </div>
                )}
                {/* Danh sách task */}
                {internTasks.length > 0 && (
                  <div className="border rounded-lg overflow-hidden max-h-40 overflow-y-auto">
                    {internTasks
                      .sort((a, b) => {
                        const order: Record<string, number> = { approved: 0, submitted: 1, request_change: 2, new: 3, overdue: 4 }
                        return (order[a.status] ?? 5) - (order[b.status] ?? 5)
                      })
                      .map(task => {
                        const sc = taskStatusConfig[task.status] || taskStatusConfig.new
                        return (
                          <div key={task.id}
                            className={`flex items-center justify-between px-3 py-2 text-xs border-b last:border-0 ${task.status === 'overdue' ? 'bg-red-50/40' : ''}`}>
                            <span className="truncate flex-1 mr-2 text-gray-700">{task.title}</span>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-gray-400">{format(new Date(task.deadline), 'dd/MM', { locale: vi })}</span>
                              <Badge className={`${sc.cls} text-[10px] px-1.5 py-0`}>{sc.label}</Badge>
                            </div>
                          </div>
                        )
                      })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Nhận xét tổng quan của Mentor ── */}
          {reviewing.final_comment && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
              <p className="text-xs font-semibold text-blue-700 mb-1.5 flex items-center gap-1">
                <TrendingUp className="h-3.5 w-3.5" />Nhận xét tổng quan của Mentor
              </p>
              <p className="text-sm text-blue-800 italic">"{reviewing.final_comment}"</p>
            </div>
          )}

          {/* ── Trạng thái hiện tại ── */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium ${aCfg.bg} ${aCfg.text} ${aCfg.border}`}>
            <span className={`w-2 h-2 rounded-full ${aCfg.dot}`} />
            {aCfg.label}
            {reviewing.approved_at && (
              <span className="opacity-70 ml-1">
                · {format(new Date(reviewing.approved_at), 'HH:mm dd/MM/yyyy', { locale: vi })}
              </span>
            )}
          </div>

          {/* ── Ghi chú HR ── */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Ghi chú cho Mentor
              <span className="text-gray-400 font-normal text-xs ml-1">(tuỳ chọn)</span>
            </label>
            <Textarea
              placeholder="VD: Điểm số hợp lý / Cần xem xét lại tiêu chí kỷ luật..."
              value={hrNote}
              onChange={e => setHrNote(e.target.value)}
              rows={3}
              className="resize-none"
              readOnly={reviewing.approval_status === 'approved'}
            />
          </div>

          {reviewing.hr_note && reviewing.approval_status !== 'pending' && (
            <div className={`text-xs font-medium px-3 py-2 rounded-lg border ${aCfg.bg} ${aCfg.text} ${aCfg.border}`}>
              Ghi chú trước đó: {reviewing.hr_note}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 mt-2">
          <Button variant="outline" onClick={onClose}>Đóng</Button>
          {canApprove && (
            <>
              <Button variant="outline" className="border-red-300 text-red-600 hover:bg-red-50"
                disabled={isPending} onClick={() => onApprove('rejected')}>
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><XCircle className="h-4 w-4 mr-1.5" />Từ chối</>}
              </Button>
              <Button className="bg-green-600 hover:bg-green-700"
                disabled={isPending} onClick={() => onApprove('approved')}>
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CheckCircle className="h-4 w-4 mr-1.5" />Duyệt đánh giá</>}
              </Button>
            </>
          )}
          {!canApprove && isLocked && (
            <span className="text-xs text-amber-600 flex items-center gap-1">🔒 Đợt đã đóng — không thể duyệt</span>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── EvalCard ─────────────────────────────────────────────────────────────────

function EvalCard({
  ev, batchName, onReview, isLocked,
}: { ev: Evaluation; batchName?: string; onReview: (ev: Evaluation) => void; isLocked?: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const aCfg = approvalConfig[ev.approval_status]
  const rCfg = rankingConfig[ev.ranking] || rankingConfig['Trung bình']

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden hover:border-gray-200 transition-colors">
      <div
        className="flex items-center justify-between px-4 py-3 bg-white cursor-pointer hover:bg-gray-50/60"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-3 flex-wrap flex-1 min-w-0">
          <div className="w-8 h-8 rounded-full bg-[#0f2d6b] flex items-center justify-center text-white text-xs font-bold shrink-0">
            {ev.intern_name?.charAt(0) || '?'}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-semibold text-sm text-gray-800 truncate">{ev.intern_name}</span>
            <span className="text-xs text-gray-400">Mentor: {ev.mentor_name}</span>
          </div>
          <Badge className={`${rCfg.bg} ${rCfg.text} text-xs`}>{ev.ranking} ({ev.total_score})</Badge>
          {batchName && (
            <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-xs font-normal border">{batchName}</Badge>
          )}
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${aCfg.bg} ${aCfg.text} ${aCfg.border}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${aCfg.dot}`} />
            {aCfg.label}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-3">
          <Button size="sm"
            className={ev.approval_status === 'pending' && !isLocked
              ? 'h-7 text-xs bg-[#0f2d6b] hover:bg-[#1a3d8a]'
              : 'h-7 text-xs'}
            variant={ev.approval_status === 'pending' && !isLocked ? 'default' : 'outline'}
            onClick={e => { e.stopPropagation(); onReview(ev) }}
          >
            {ev.approval_status === 'pending' && !isLocked
              ? 'Xét duyệt'
              : <><Eye className="h-3.5 w-3.5 mr-1" />Xem</>
            }
          </Button>
          {expanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
        </div>
      </div>

      {/* Preview thu gọn khi expand */}
      {expanded && (
        <div className="px-4 pb-4 pt-2 border-t border-gray-100 bg-gray-50/40 space-y-2">
          <div className="space-y-1.5">
            {Object.entries(ev.criteria_scores).map(([k, v]) => (
              <ScoreBar key={k} label={criteriaLabels[k]?.label || k} icon={criteriaLabels[k]?.icon || '•'} value={v} barCls={rCfg.bar} />
            ))}
          </div>
          {ev.final_comment && (
            <p className="text-sm text-gray-600 bg-white rounded-lg p-3 border border-gray-100 italic">
              "{ev.final_comment}"
            </p>
          )}
          {ev.hr_note && (
            <p className={`text-xs font-medium px-3 py-2 rounded-lg border ${aCfg.bg} ${aCfg.text} ${aCfg.border}`}>
              Ghi chú HR: {ev.hr_note}
            </p>
          )}
          <p className="text-xs text-gray-400">
            Tạo lúc {format(new Date(ev.created_at), 'HH:mm dd/MM/yyyy', { locale: vi })}
            {ev.approved_at && ` · Duyệt lúc ${format(new Date(ev.approved_at), 'HH:mm dd/MM/yyyy', { locale: vi })}`}
          </p>
          <Button size="sm" variant="outline" className="w-full h-7 text-xs text-[#0f2d6b] border-[#0f2d6b] hover:bg-blue-50"
            onClick={() => onReview(ev)}>
            <Eye className="h-3.5 w-3.5 mr-1.5" />Xem đầy đủ form đánh giá
          </Button>
        </div>
      )}
    </div>
  )
}

// ─── BatchGroup ───────────────────────────────────────────────────────────────

function BatchGroup({
  batchName, items, onReview, internBatchMap, batchStatus,
}: {
  batchName: string
  items: Evaluation[]
  onReview: (ev: Evaluation) => void
  internBatchMap: Map<number, { batchId: number; batchName: string }>
  batchStatus?: string
}) {
  const [collapsed, setCollapsed] = useState(false)
  const pendingInGroup = items.filter(e => e.approval_status === 'pending').length

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-gray-50 to-white hover:from-blue-50 transition-colors"
        onClick={() => setCollapsed(c => !c)}
      >
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-gray-700">{batchName}</span>
          <Badge className="bg-gray-100 text-gray-600 text-xs">{items.length} đánh giá</Badge>
          {batchStatus === 'closed' && (
            <Badge className="bg-amber-100 text-amber-700 border-amber-200 border text-xs">🔒 Đã đóng</Badge>
          )}
          {pendingInGroup > 0 && (
            <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 border text-xs">
              {pendingInGroup} chờ duyệt
            </Badge>
          )}
        </div>
        {collapsed ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronUp className="h-4 w-4 text-gray-400" />}
      </button>
      {!collapsed && (
        <div className="divide-y divide-gray-50 bg-white">
          {items
            .slice()
            .sort((a, b) => {
              const order = { pending: 0, rejected: 1, approved: 2 }
              return (order[a.approval_status] ?? 3) - (order[b.approval_status] ?? 3)
            })
            .map(ev => (
              <EvalCard key={ev.id} ev={ev} onReview={onReview} />
            ))}
        </div>
      )}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function EvaluationReviewTab() {
  const { toast } = useToast()
  const { data: evaluations = [], isLoading } = useEvaluations()
  const { data: batches = [] }   = useBatches()
  const { data: profiles = [] }  = useInternProfiles()
  const approveEvaluation        = useApproveEvaluation()

  const [statusFilter, setStatusFilter] = useState<ApprovalStatus | 'all'>('all')
  const [batchFilter,  setBatchFilter]  = useState('all')
  const [reviewing,    setReviewing]    = useState<Evaluation | null>(null)
  const [hrNote,       setHrNote]       = useState('')

  const internBatchMap = useMemo(() => {
    const map = new Map<number, { batchId: number; batchName: string }>()
    profiles.forEach(p => {
      const batch = batches.find(b => b.id === p.batch_id)
      if (batch) map.set(p.user_id, { batchId: batch.id, batchName: batch.batch_name })
    })
    return map
  }, [profiles, batches])

  const pendingCount = evaluations.filter(e => e.approval_status === 'pending').length

  const stats = useMemo(() => ({
    pending:  evaluations.filter(e => e.approval_status === 'pending').length,
    approved: evaluations.filter(e => e.approval_status === 'approved').length,
    rejected: evaluations.filter(e => e.approval_status === 'rejected').length,
    total:    evaluations.length,
    avgScore: evaluations.length
      ? Math.round(evaluations.reduce((s, e) => s + e.total_score, 0) / evaluations.length * 10) / 10
      : 0,
  }), [evaluations])

  const filtered = useMemo(() => evaluations.filter(e => {
    const matchStatus = statusFilter === 'all' || e.approval_status === statusFilter
    const batchInfo   = internBatchMap.get(e.intern_id)
    const matchBatch  = batchFilter === 'all' || batchInfo?.batchId.toString() === batchFilter
    return matchStatus && matchBatch
  }), [evaluations, statusFilter, batchFilter, internBatchMap])

  const groupedByBatch = useMemo(() => {
    const groups = new Map<string, { batchId: number; batchName: string; items: Evaluation[] }>()
    filtered.forEach(ev => {
      const info = internBatchMap.get(ev.intern_id)
      const key  = info ? info.batchId.toString() : 'unknown'
      const name = info ? info.batchName : 'Chưa xác định đợt'
      if (!groups.has(key)) groups.set(key, { batchId: info?.batchId ?? 0, batchName: name, items: [] })
      groups.get(key)!.items.push(ev)
    })
    return [...groups.values()].sort((a, b) => {
      const pa = a.items.filter(e => e.approval_status === 'pending').length
      const pb = b.items.filter(e => e.approval_status === 'pending').length
      return pb - pa
    })
  }, [filtered, internBatchMap])

  const isClosedBatch = (internId: number) => {
    const info  = internBatchMap.get(internId)
    const batch = batches.find(b => b.id === info?.batchId)
    return batch?.status === 'closed'
  }

  const openReview = (ev: Evaluation) => {
    setReviewing(ev)
    setHrNote(ev.hr_note || '')
  }

  const handleApprove = async (decision: 'approved' | 'rejected') => {
    if (!reviewing) return
    try {
      await approveEvaluation.mutateAsync({
        evaluationId: reviewing.id,
        data: { approval_status: decision, hr_note: hrNote },
      })
      toast({
        title: decision === 'approved' ? '✅ Đã duyệt đánh giá' : '❌ Đã từ chối đánh giá',
        description: `${reviewing.intern_name} — ${reviewing.ranking} (${reviewing.total_score} điểm)`,
      })
      setReviewing(null)
    } catch (err: any) {
      toast({ title: 'Lỗi', description: err.response?.data?.detail || 'Có lỗi xảy ra' })
    }
  }

  return (
    <div className="space-y-5">

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: 'Tổng đánh giá', value: stats.total,    color: 'text-gray-800',   top: 'from-gray-400 to-gray-500'     },
          { label: 'Chờ duyệt',     value: stats.pending,  color: 'text-yellow-700', top: 'from-yellow-400 to-yellow-500' },
          { label: 'Đã duyệt',      value: stats.approved, color: 'text-green-700',  top: 'from-green-500 to-emerald-600' },
          { label: 'Từ chối',       value: stats.rejected, color: 'text-red-700',    top: 'from-red-400 to-red-600'       },
          { label: 'Điểm TB',       value: stats.avgScore, color: 'text-[#0f2d6b]',  top: 'from-[#0f2d6b] to-[#1e56b0]'  },
        ].map(s => (
          <Card key={s.label} className="border-0 shadow-sm ring-1 ring-gray-200 overflow-hidden">
            <div className={`h-1 bg-gradient-to-r ${s.top}`} />
            <CardContent className="p-4 text-center">
              <p className={`text-3xl font-extrabold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter + list */}
      <Card className="border-0 shadow-sm ring-1 ring-gray-200">
        {batchFilter !== 'all' && batches.find(b => b.id.toString() === batchFilter)?.status === 'closed' && (
          <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border-b border-amber-200 text-sm text-amber-800">
            <span>🔒</span>
            <span><strong>Đợt đã đóng</strong> — Chỉ xem, không thể duyệt</span>
          </div>
        )}
        <CardHeader className="border-b border-gray-100 bg-gray-50/60 pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <Award className="h-4 w-4 text-[#0f2d6b]" />
              Danh sách đánh giá
              {pendingCount > 0 && (
                <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 text-xs">{pendingCount} chờ duyệt</Badge>
              )}
              <Badge className="bg-gray-100 text-gray-500 text-xs">{filtered.length}/{evaluations.length}</Badge>
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={batchFilter} onValueChange={setBatchFilter}>
                <SelectTrigger className="h-8 text-xs w-[190px]"><SelectValue placeholder="Tất cả đợt" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả đợt</SelectItem>
                  {batches.map(b => <SelectItem key={b.id} value={b.id.toString()}>{b.batch_name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={v => setStatusFilter(v as any)}>
                <SelectTrigger className="h-8 text-xs w-[160px]"><SelectValue placeholder="Trạng thái" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả trạng thái</SelectItem>
                  <SelectItem value="pending">Chờ duyệt</SelectItem>
                  <SelectItem value="approved">Đã duyệt</SelectItem>
                  <SelectItem value="rejected">Từ chối</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Award className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="font-medium">Không có đánh giá nào</p>
            </div>
          ) : batchFilter !== 'all' ? (
            <div className="space-y-3">
              {filtered
                .slice()
                .sort((a, b) => {
                  const order = { pending: 0, rejected: 1, approved: 2 }
                  return (order[a.approval_status] ?? 3) - (order[b.approval_status] ?? 3)
                })
                .map(ev => (
                  <EvalCard key={ev.id} ev={ev}
                    batchName={internBatchMap.get(ev.intern_id)?.batchName}
                    onReview={openReview}
                    isLocked={isClosedBatch(ev.intern_id)}
                  />
                ))}
            </div>
          ) : (
            <div className="space-y-4">
              {groupedByBatch.map(group => (
                <BatchGroup key={group.batchId}
                  batchName={group.batchName} items={group.items}
                  onReview={openReview} internBatchMap={internBatchMap}
                  batchStatus={batches.find(b => b.id === group.batchId)?.status}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Full Review Dialog */}
      <FullReviewDialog
        reviewing={reviewing}
        isLocked={reviewing ? isClosedBatch(reviewing.intern_id) : false}
        hrNote={hrNote}
        setHrNote={setHrNote}
        onClose={() => setReviewing(null)}
        onApprove={handleApprove}
        isPending={approveEvaluation.isPending}
        internBatchMap={internBatchMap}
        batches={batches}
      />
    </div>
  )
}