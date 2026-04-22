import { useState, useRef } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useSubmitTaskReport, type Task } from '@/hooks/use-tasks'
import { useToast } from '@/hooks/use-toast'
import {
  FileText, Clock, User, Upload, X,
  AlertTriangle, Lock, CheckCircle, RefreshCw, AlertCircle,
} from 'lucide-react'
import { format, differenceInMinutes, differenceInSeconds } from 'date-fns'
import { vi } from 'date-fns/locale'
import api from '@/lib/api'

interface TaskSubmitDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task: Task | null
}

const statusConfig: Record<string, { label: string; cls: string }> = {
  new:            { label: 'Mới',           cls: 'bg-gray-100 text-gray-700'    },
  submitted:      { label: 'Đã nộp',        cls: 'bg-blue-100 text-blue-700'    },
  request_change: { label: 'Cần chỉnh sửa', cls: 'bg-orange-100 text-orange-800' },
  approved:       { label: 'Đã duyệt',      cls: 'bg-green-100 text-green-700'  },
  overdue:        { label: 'Quá hạn',       cls: 'bg-red-100 text-red-700'      },
}

const ALLOWED_EXTENSIONS = ['.pdf', '.xls', '.xlsx', '.doc', '.docx']
const MAX_FILE_SIZE = 10 * 1024 * 1024

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase()
  if (ext === 'pdf') return '📄'
  if (['xls', 'xlsx'].includes(ext || '')) return '📊'
  if (['doc', 'docx'].includes(ext || '')) return '📝'
  return '📎'
}

// ─── Helper: tính thời gian quá hạn ──────────────────────────
function getOverdueDuration(deadline: Date): string {
  const now = new Date()
  if (deadline >= now) return ''

  const totalSeconds = Math.floor((now.getTime() - deadline.getTime()) / 1000)
  const days    = Math.floor(totalSeconds / 86400)
  const hours   = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)

  const parts: string[] = []
  if (days > 0)    parts.push(`${days} ngày`)
  if (hours > 0)   parts.push(`${hours} giờ`)
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes} phút`)
  return parts.join(' ')
}

export default function TaskSubmitDialog({ open, onOpenChange, task }: TaskSubmitDialogProps) {
  const { toast } = useToast()
  const submitReport = useSubmitTaskReport()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [content,      setContent]      = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading,    setUploading]    = useState(false)

  const now      = new Date()
  const deadline = task ? new Date(task.deadline) : null

  // Quá hạn hay chưa
  const isOverdue  = deadline ? deadline < now : false
  const overdueDuration = deadline && isOverdue ? getOverdueDuration(deadline) : ''

  // Sắp hết hạn (còn <= 24h)
  const minutesLeft = deadline && !isOverdue ? differenceInMinutes(deadline, now) : 0
  const isUrgent    = !isOverdue && minutesLeft <= 60 * 24

  // Có thể nộp: đúng trạng thái (new / request_change / overdue)
  // ── BỎ điều kiện chặn quá hạn ──
  const canSubmit =
    task &&
    (task.status === 'new' || task.status === 'request_change' || task.status === 'overdue')

  // ── File handling ─────────────────────────────────────────
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      toast({ title: 'Định dạng không hỗ trợ', description: `Chỉ chấp nhận: ${ALLOWED_EXTENSIONS.join(', ')}` })
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      toast({ title: 'File quá lớn', description: 'Kích thước tối đa là 10MB' })
      return
    }
    setSelectedFile(file)
    e.target.value = ''
  }

  // ── Submit ────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!task || !canSubmit) return
    if (!content.trim()) {
      toast({ title: 'Lỗi', description: 'Vui lòng nhập nội dung báo cáo' })
      return
    }

    try {
      setUploading(true)
      let fileSubmissionUrl: string | undefined

      if (selectedFile) {
        const formData = new FormData()
        formData.append('file', selectedFile)
        formData.append('title', `Báo cáo - ${task.title}`)
        formData.append('doc_type', selectedFile.name.endsWith('.pdf') ? 'pdf' : 'other')
        const uploadRes = await api.post('/documents/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        fileSubmissionUrl = uploadRes.data.file_url
      }

      await submitReport.mutateAsync({
        taskId: task.id,
        data: { content: content.trim(), file_submission: fileSubmissionUrl },
      })

      toast({
        title: isOverdue ? '⚠️ Nộp báo cáo trễ hạn' : '✅ Nộp báo cáo thành công',
        description: isOverdue
          ? `Báo cáo đã được nộp nhưng trễ ${overdueDuration}. Mentor sẽ được thông báo.`
          : 'Mentor sẽ xem xét và phản hồi sớm.',
      })

      setContent('')
      setSelectedFile(null)
      onOpenChange(false)
    } catch (error: any) {
      const detail = error.response?.data?.detail
      const msg = typeof detail === 'string'
        ? detail
        : Array.isArray(detail)
          ? detail.map((e: any) => e.msg || e.message).join(', ')
          : 'Có lỗi xảy ra khi nộp báo cáo'
      toast({ title: 'Lỗi', description: msg })
    } finally {
      setUploading(false)
    }
  }

  if (!task) return null

  const statusInfo = statusConfig[task.status] || statusConfig.new

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Nộp báo cáo nhiệm vụ
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Task info */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-base leading-tight">{task.title}</h3>
              <Badge className={statusInfo.cls}>{statusInfo.label}</Badge>
            </div>
            {task.description && (
              <p className="text-sm text-muted-foreground">{task.description}</p>
            )}
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Mentor:</span>
                <span className="font-medium">{task.mentor_name}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Hạn nộp:</span>
                <span className={`font-medium ${isOverdue ? 'text-red-600' : isUrgent ? 'text-orange-600' : 'text-green-700'}`}>
                  {format(new Date(task.deadline), 'dd/MM/yyyy HH:mm', { locale: vi })}
                </span>
              </div>
            </div>
            {task.file_attachment && (
              <a href={task.file_attachment} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline">
                <Upload className="h-4 w-4" />Tài liệu đính kèm từ Mentor
              </a>
            )}
          </div>

          {/* ── Banner quá hạn — hiện nhưng vẫn cho nộp ── */}
          {isOverdue && canSubmit && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-4">
              <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-red-700">Đã quá hạn {overdueDuration}</p>
                <p className="text-sm text-red-600 mt-1">
                  Hạn nộp là <strong>{format(new Date(task.deadline), 'HH:mm dd/MM/yyyy', { locale: vi })}</strong>.
                  Bạn vẫn có thể nộp nhưng Mentor sẽ thấy thông báo nộp trễ.
                </p>
              </div>
            </div>
          )}

          {/* Sắp hết hạn */}
          {isUrgent && canSubmit && !isOverdue && (
            <div className="flex items-start gap-3 bg-orange-50 border border-orange-200 rounded-lg p-3">
              <AlertTriangle className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-orange-700">Sắp hết hạn!</p>
                <p className="text-sm text-orange-600 mt-0.5">
                  Còn {minutesLeft >= 60
                    ? `${Math.floor(minutesLeft / 60)} giờ ${minutesLeft % 60} phút`
                    : `${minutesLeft} phút`} để nộp.
                </p>
              </div>
            </div>
          )}

          {/* Cần chỉnh sửa */}
          {task.status === 'request_change' && (
            <div className="flex items-start gap-3 bg-orange-50 border border-orange-200 rounded-lg p-3">
              <RefreshCw className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
              <p className="text-sm text-orange-800 font-medium">
                Mentor yêu cầu chỉnh sửa. Vui lòng xem lại nhận xét và nộp lại.
              </p>
            </div>
          )}

          {/* Đã nộp - chờ duyệt */}
          {task.status === 'submitted' && (
            <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
              <Clock className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <p className="text-sm text-blue-800 font-medium">Bạn đã nộp báo cáo. Đang chờ Mentor duyệt.</p>
            </div>
          )}

          {/* Đã duyệt */}
          {task.status === 'approved' && (
            <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-lg p-3">
              <CheckCircle className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
              <p className="text-sm text-green-800 font-medium">Nhiệm vụ đã được duyệt. Chúc mừng! 🎉</p>
            </div>
          )}

          <Separator />

          {/* Form nộp */}
          {canSubmit ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="content">
                  Nội dung báo cáo <span className="text-red-500">*</span>
                  {isOverdue && (
                    <span className="ml-2 text-xs text-red-500 font-normal">
                      (nộp trễ {overdueDuration})
                    </span>
                  )}
                </Label>
                <Textarea
                  id="content"
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="Mô tả chi tiết công việc đã thực hiện, kết quả đạt được, khó khăn gặp phải..."
                  rows={5}
                  disabled={uploading}
                  className={isOverdue ? 'border-red-200 focus-visible:ring-red-300' : ''}
                />
              </div>

              {/* Upload file */}
              <div className="space-y-2">
                <Label>File đính kèm <span className="text-muted-foreground font-normal">(không bắt buộc)</span></Label>
                {!selectedFile ? (
                  <div
                    className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm font-medium">Nhấn để chọn file</p>
                    <p className="text-xs text-muted-foreground mt-1">PDF, Excel, Word — tối đa 10MB</p>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <span className="text-2xl">{getFileIcon(selectedFile.name)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
                    </div>
                    <Button type="button" variant="ghost" size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-red-600"
                      onClick={() => setSelectedFile(null)} disabled={uploading}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                <input ref={fileInputRef} type="file" accept={ALLOWED_EXTENSIONS.join(',')}
                  className="hidden" onChange={handleFileSelect} disabled={uploading} />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={uploading}>
                  Hủy
                </Button>
                <Button
                  type="submit"
                  disabled={uploading || submitReport.isPending}
                  className={isOverdue ? 'bg-red-600 hover:bg-red-700' : ''}
                >
                  {uploading || submitReport.isPending ? (
                    <><span className="animate-spin mr-2">⏳</span>Đang nộp...</>
                  ) : isOverdue ? (
                    <><AlertCircle className="h-4 w-4 mr-2" />Nộp trễ hạn</>
                  ) : (
                    <><FileText className="h-4 w-4 mr-2" />Nộp báo cáo</>
                  )}
                </Button>
              </div>
            </form>
          ) : (
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Đóng</Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}