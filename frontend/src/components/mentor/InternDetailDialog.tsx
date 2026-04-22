import { useMemo } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  User, Mail, Phone, GraduationCap, Calendar, BookOpen,
  ClipboardList, FileText, Loader2, Lock, CheckCircle,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import api from '@/lib/api'
import type { InternProfile } from '@/hooks/use-profiles'
import type { Task, TaskReport } from '@/hooks/use-tasks'
import type { Evaluation } from '@/hooks/use-evaluations'

// ─── Types ────────────────────────────────────────────────────────────────────

interface BatchInfo {
  id: number
  batch_name: string
  start_date: string
  end_date: string
  status: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const taskStatusConfig: Record<string, { label: string; cls: string }> = {
  new:            { label: 'Chưa nộp',      cls: 'bg-gray-100 text-gray-700' },
  submitted:      { label: 'Đã nộp',        cls: 'bg-blue-100 text-blue-700' },
  request_change: { label: 'Cần chỉnh sửa', cls: 'bg-orange-100 text-orange-700' },
  approved:       { label: 'Đã duyệt',      cls: 'bg-green-100 text-green-700' },
  overdue:        { label: 'Quá hạn',       cls: 'bg-red-100 text-red-700' },
}

const rankingColors: Record<string, string> = {
  'Xuất sắc': 'bg-purple-100 text-purple-800',
  'Giỏi':     'bg-blue-100 text-blue-800',
  'Khá':      'bg-green-100 text-green-800',
  'Trung bình': 'bg-yellow-100 text-yellow-800',
  'Yếu':      'bg-red-100 text-red-800',
}

// Kiểm tra đợt thực tập đã kết thúc chưa
function isBatchEnded(endDate?: string): boolean {
  if (!endDate) return false
  return new Date(endDate) < new Date()
}

// ─── TaskReports sub-component ────────────────────────────────────────────────

function TaskReportsRow({ taskId }: { taskId: number }) {
  const { data: reports, isLoading } = useQuery({
    queryKey: ['taskReports', taskId],
    queryFn: async () => {
      const res = await api.get<TaskReport[]>(`/tasks/${taskId}/reports`)
      return res.data
    },
  })

  if (isLoading) return (
    <TableRow>
      <TableCell colSpan={4} className="py-2 text-center">
        <Loader2 className="h-4 w-4 animate-spin inline" />
      </TableCell>
    </TableRow>
  )
  if (!reports || reports.length === 0) return null

  return (
    <>
      {reports.map((r, idx) => (
        <TableRow key={r.id} className="bg-blue-50/50">
          <TableCell colSpan={2} className="pl-10 text-xs text-muted-foreground py-2">
            <FileText className="h-3 w-3 inline mr-1 text-blue-500" />
            Báo cáo #{idx + 1} — {format(new Date(r.submitted_at), 'dd/MM/yyyy HH:mm', { locale: vi })}
          </TableCell>
          <TableCell colSpan={2} className="text-xs py-2">
            <p className="line-clamp-2">{r.content}</p>
            {r.mentor_comment && (
              <p className="mt-1 text-blue-700">
                <span className="font-medium">Nhận xét: </span>{r.mentor_comment}
              </p>
            )}
          </TableCell>
        </TableRow>
      ))}
    </>
  )
}

// ─── Main Dialog ──────────────────────────────────────────────────────────────

interface Props {
  intern: InternProfile | null
  open: boolean
  onOpenChange: (v: boolean) => void
  tasks: Task[]
  evaluation?: Evaluation
  batchInfo?: BatchInfo
}

export default function InternDetailDialog({
  intern, open, onOpenChange, tasks, evaluation, batchInfo,
}: Props) {
  if (!intern) return null

  const internTasks = useMemo(
    () => tasks.filter(t => t.intern_id === intern.user_id),
    [tasks, intern.user_id]
  )

  const ended = isBatchEnded(batchInfo?.end_date)
  const batchEndDate = batchInfo?.end_date
    ? format(new Date(batchInfo.end_date), 'dd/MM/yyyy', { locale: vi })
    : null

  const stats = useMemo(() => ({
    total: internTasks.length,
    approved: internTasks.filter(t => t.status === 'approved').length,
    submitted: internTasks.filter(t => t.status === 'submitted').length,
    overdue: internTasks.filter(t => t.status === 'overdue').length,
  }), [internTasks])

  const completionRate = stats.total > 0
    ? Math.round(stats.approved / stats.total * 100)
    : 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <User className="h-5 w-5 text-blue-600" />
            Hồ sơ thực tập sinh — {intern.user_full_name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">

          {/* ── Thông tin cá nhân ─────────────────────────────────────────── */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <User className="h-4 w-4 text-blue-500" />Thông tin cá nhân
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">Email:</span>
                  <span className="font-medium truncate">{intern.user_email}</span>
                </div>
                {intern.user_phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">SĐT:</span>
                    <span className="font-medium">{intern.user_phone}</span>
                  </div>
                )}
                {intern.university && (
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">Trường:</span>
                    <span className="font-medium">{intern.university}</span>
                  </div>
                )}
                {intern.gpa != null && (
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">GPA:</span>
                    <span className="font-medium">{intern.gpa}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">Đợt:</span>
                  <span className="font-medium">{intern.batch_name}</span>
                </div>
                {batchInfo && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">Thời gian:</span>
                    <span className="font-medium">
                      {format(new Date(batchInfo.start_date), 'dd/MM/yyyy', { locale: vi })}
                      {' — '}
                      {format(new Date(batchInfo.end_date), 'dd/MM/yyyy', { locale: vi })}
                    </span>
                    <Badge className={batchInfo.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}>
                      {batchInfo.status === 'open' ? 'Đang mở' : 'Đã đóng'}
                    </Badge>
                  </div>
                )}
                {intern.cv_link && (
                  <div className="flex items-center gap-2 col-span-2">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">CV:</span>
                    <a href={intern.cv_link} target="_blank" rel="noopener noreferrer"
                      className="text-blue-600 underline truncate">{intern.cv_link}</a>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ── Tiến độ nhiệm vụ ──────────────────────────────────────────── */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-purple-500" />
                Tiến độ nhiệm vụ
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-3 mb-4">
                {[
                  { label: 'Tổng', val: stats.total, cls: 'text-gray-700' },
                  { label: 'Đã duyệt', val: stats.approved, cls: 'text-green-600' },
                  { label: 'Đã nộp', val: stats.submitted, cls: 'text-blue-600' },
                  { label: 'Quá hạn', val: stats.overdue, cls: 'text-red-600' },
                ].map(s => (
                  <div key={s.label} className="text-center bg-gray-50 rounded-lg py-3">
                    <p className={`text-2xl font-bold ${s.cls}`}>{s.val}</p>
                    <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
              {/* Progress bar */}
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-gray-100 rounded-full h-2.5">
                  <div
                    className="h-2.5 rounded-full transition-all"
                    style={{
                      width: `${completionRate}%`,
                      backgroundColor: completionRate >= 70 ? '#22c55e' : completionRate >= 40 ? '#f59e0b' : '#ef4444',
                    }}
                  />
                </div>
                <span className={`text-sm font-semibold ${completionRate >= 70 ? 'text-green-600' : completionRate >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {completionRate}% hoàn thành
                </span>
              </div>
            </CardContent>
          </Card>

          {/* ── Danh sách nhiệm vụ + báo cáo ─────────────────────────────── */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="h-4 w-4 text-green-500" />
                Chi tiết nhiệm vụ & báo cáo đã nộp
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {internTasks.length === 0 ? (
                <p className="text-center py-6 text-muted-foreground text-sm">
                  Chưa có nhiệm vụ nào được giao
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nhiệm vụ</TableHead>
                      <TableHead>Deadline</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead>Báo cáo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {internTasks.map(task => {
                      const sc = taskStatusConfig[task.status] || taskStatusConfig.new
                      const isOverdue = new Date(task.deadline) < new Date() && task.status !== 'approved'
                      return (
                        <>
                          <TableRow key={task.id}>
                            <TableCell className="font-medium">{task.title}</TableCell>
                            <TableCell className={isOverdue ? 'text-red-600 font-medium' : ''}>
                              {format(new Date(task.deadline), 'dd/MM/yyyy', { locale: vi })}
                            </TableCell>
                            <TableCell>
                              <Badge className={sc.cls}>{sc.label}</Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-xs">
                              {task.status === 'new' || task.status === 'overdue'
                                ? 'Chưa có'
                                : 'Xem bên dưới ↓'}
                            </TableCell>
                          </TableRow>
                          {/* Hiển thị báo cáo ngay dưới task */}
                          {task.status !== 'new' && task.status !== 'overdue' && (
                            <TaskReportsRow taskId={task.id} />
                          )}
                        </>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* ── Kết quả đánh giá / Thông báo khóa đánh giá ───────────────── */}
          <Card className={ended ? 'border-green-200' : 'border-orange-200'}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                {ended
                  ? <CheckCircle className="h-4 w-4 text-green-500" />
                  : <Lock className="h-4 w-4 text-orange-500" />
                }
                Kết quả đánh giá cuối kỳ
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!ended ? (
                <div className="flex items-start gap-3 bg-orange-50 rounded-lg p-4">
                  <Lock className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-semibold text-orange-700">Chưa thể đánh giá</p>
                    <p className="text-orange-600 mt-1">
                      Đợt thực tập vẫn đang diễn ra.{' '}
                      {batchEndDate && (
                        <>Đánh giá sẽ được mở sau ngày <span className="font-semibold">{batchEndDate}</span>.</>
                      )}
                    </p>
                  </div>
                </div>
              ) : evaluation ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Badge className={rankingColors[evaluation.ranking] || ''}>
                      {evaluation.ranking}
                    </Badge>
                    <span className="text-2xl font-bold">{evaluation.total_score}</span>
                    <span className="text-muted-foreground text-sm">/ 10</span>
                  </div>
                  <div className="grid grid-cols-5 gap-2 text-xs">
                    {[
                      { key: 'attitude', label: 'Thái độ' },
                      { key: 'discipline', label: 'Kỷ luật' },
                      { key: 'learning', label: 'Học hỏi' },
                      { key: 'skills', label: 'Kỹ năng' },
                      { key: 'task_result', label: 'Kết quả' },
                    ].map(c => (
                      <div key={c.key} className="bg-gray-50 rounded p-2 text-center">
                        <p className="font-bold text-base">
                          {(evaluation.criteria_scores as unknown as Record<string, number>)?.[c.key] ?? '—'}
                        </p>
                        <p className="text-muted-foreground">{c.label}</p>
                      </div>
                    ))}
                  </div>
                  {evaluation.final_comment && (
                    <div className="bg-blue-50 rounded p-3 text-sm">
                      <p className="font-medium text-blue-700 mb-1">Nhận xét cuối kỳ:</p>
                      <p className="text-blue-800">{evaluation.final_comment}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-start gap-3 bg-green-50 rounded-lg p-4">
                  <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-semibold text-green-700">Đợt thực tập đã kết thúc</p>
                    <p className="text-green-600 mt-1">
                      Bạn có thể đánh giá TTS này từ tab <span className="font-semibold">TTS phụ trách</span>.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </DialogContent>
    </Dialog>
  )
}