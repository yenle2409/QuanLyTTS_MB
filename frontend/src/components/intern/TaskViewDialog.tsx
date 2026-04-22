import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useTaskReports, type Task, type TaskReport } from '@/hooks/use-tasks'
import { FileText, Clock, User, MessageSquare, CheckCircle, XCircle } from 'lucide-react'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'

interface TaskViewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task: Task | null
  onSubmit: () => void
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; color: string }> = {
  new: { label: 'Mới', variant: 'secondary', color: 'text-gray-600' },
  submitted: { label: 'Đã nộp', variant: 'default', color: 'text-blue-600' },
  request_change: { label: 'Yêu cầu sửa', variant: 'destructive', color: 'text-red-600' },
  approved: { label: 'Đã duyệt', variant: 'outline', color: 'text-green-600' },
  overdue: { label: 'Quá hạn', variant: 'destructive', color: 'text-red-600' },
}

export default function TaskViewDialog({ open, onOpenChange, task, onSubmit }: TaskViewDialogProps) {
  const { data: reports = [] } = useTaskReports(task?.id || 0)

  if (!task) return null

  const status = statusConfig[task.status] || statusConfig.new
  const isDeadlinePassed = new Date(task.deadline) < new Date()
  const canSubmit = task.status === 'new' || task.status === 'request_change'

  const getDaysRemaining = () => {
    const now = new Date()
    const deadline = new Date(task.deadline)
    const diffTime = deadline.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 0) return { text: `Quá hạn ${Math.abs(diffDays)} ngày`, color: 'text-red-600' }
    if (diffDays === 0) return { text: 'Hôm nay', color: 'text-orange-600' }
    if (diffDays === 1) return { text: 'Còn 1 ngày', color: 'text-orange-600' }
    if (diffDays <= 3) return { text: `Còn ${diffDays} ngày`, color: 'text-yellow-600' }
    return { text: `Còn ${diffDays} ngày`, color: 'text-green-600' }
  }

  const daysRemaining = getDaysRemaining()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Chi tiết nhiệm vụ
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Task Info */}
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <h3 className="font-semibold text-lg pr-4">{task.title}</h3>
              <Badge variant={status.variant}>{status.label}</Badge>
            </div>

            {task.description && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm whitespace-pre-wrap">{task.description}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Mentor:</span>
                <span className="font-medium">{task.mentor_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Hạn nộp:</span>
                <span className={`font-medium ${isDeadlinePassed ? 'text-red-600' : ''}`}>
                  {format(new Date(task.deadline), 'dd/MM/yyyy HH:mm', { locale: vi })}
                </span>
              </div>
            </div>

            <div className={`text-sm font-medium ${daysRemaining.color}`}>
              {daysRemaining.text}
            </div>

            {task.file_attachment && (
              <a
                href={task.file_attachment}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-blue-600 hover:underline text-sm"
              >
                <FileText className="h-4 w-4" />
                Xem tài liệu đính kèm
              </a>
            )}
          </div>

          <Separator />

          {/* Submission History */}
          <div className="space-y-4">
            <h4 className="font-semibold flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Lịch sử nộp báo cáo ({reports.length})
            </h4>

            {reports.length === 0 ? (
              <p className="text-muted-foreground text-sm italic">Chưa có báo cáo nào được nộp</p>
            ) : (
              <div className="space-y-4">
                {reports.map((report: TaskReport, index: number) => (
                  <div key={report.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">Lần nộp #{reports.length - index}</span>
                      <span className="text-muted-foreground">
                        {format(new Date(report.submitted_at), 'dd/MM/yyyy HH:mm', { locale: vi })}
                      </span>
                    </div>

                    <div className="bg-gray-50 p-3 rounded-md">
                      <p className="text-sm whitespace-pre-wrap">{report.content}</p>
                    </div>

                    {report.file_submission && (
                      <a
                        href={report.file_submission}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-blue-600 hover:underline text-sm"
                      >
                        <FileText className="h-4 w-4" />
                        File đính kèm
                      </a>
                    )}

                    {report.mentor_comment && (
                      <div className="bg-blue-50 p-3 rounded-md space-y-1">
                        <p className="text-sm font-medium text-blue-800 flex items-center gap-1">
                          <MessageSquare className="h-4 w-4" />
                          Nhận xét của Mentor:
                        </p>
                        <p className="text-sm text-blue-900">{report.mentor_comment}</p>
                        {report.commented_at && (
                          <p className="text-xs text-blue-600">
                            {format(new Date(report.commented_at), 'dd/MM/yyyy HH:mm', { locale: vi })}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Status Messages */}
          {task.status === 'approved' && (
            <div className="bg-green-50 border border-green-200 p-4 rounded-lg flex items-center gap-3">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <div>
                <p className="font-medium text-green-800">Nhiệm vụ đã được duyệt!</p>
                <p className="text-sm text-green-700">Mentor đã phê duyệt báo cáo của bạn.</p>
              </div>
            </div>
          )}

          {task.status === 'request_change' && (
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg flex items-center gap-3">
              <XCircle className="h-6 w-6 text-yellow-600" />
              <div>
                <p className="font-medium text-yellow-800">Cần chỉnh sửa</p>
                <p className="text-sm text-yellow-700">Mentor yêu cầu chỉnh sửa báo cáo. Xem nhận xét ở trên.</p>
              </div>
            </div>
          )}

          <Separator />

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Đóng
            </Button>
            {canSubmit && (
              <Button onClick={onSubmit}>
                {task.status === 'request_change' ? 'Nộp lại báo cáo' : 'Nộp báo cáo'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
