import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  useTaskReports,
  useApproveTask,
  useRequestChange,
  useAddMentorComment,
  type Task,
  type TaskReport,
} from '@/hooks/use-tasks'
import { useToast } from '@/hooks/use-toast'
import {
  CheckCircle, XCircle, MessageSquare, FileText, Clock,
  Download, Eye, FileSpreadsheet, File, Paperclip,
} from 'lucide-react'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import TaskChatDialog from '@/components/mentor/TaskChatDialog'

interface TaskReportReviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task: Task | null
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
  new:            { label: 'Mới',           variant: 'secondary' },
  submitted:      { label: 'Đã nộp',        variant: 'default' },
  request_change: { label: 'Yêu cầu sửa',  variant: 'destructive' },
  approved:       { label: 'Đã duyệt',      variant: 'secondary' },
  overdue:        { label: 'Quá hạn',       variant: 'destructive' },
}

// ── Helpers ────────────────────────────────────────────────────────────────
function buildFileUrl(fileUrl: string): string {
  if (!fileUrl) return '#'
  if (fileUrl.startsWith('http')) return fileUrl
  return `http://localhost:8000${fileUrl}`
}

function getFileName(fileUrl: string): string {
  const parts = fileUrl.split('/')
  return decodeURIComponent(parts[parts.length - 1].split('?')[0])
}

function getFileIcon(fileUrl: string) {
  const ext = fileUrl.split('.').pop()?.toLowerCase().split('?')[0]
  if (ext === 'pdf') return <FileText className="h-4 w-4 text-red-500" />
  if (['xls', 'xlsx'].includes(ext || '')) return <FileSpreadsheet className="h-4 w-4 text-green-600" />
  if (['doc', 'docx'].includes(ext || '')) return <FileText className="h-4 w-4 text-blue-600" />
  return <File className="h-4 w-4 text-gray-500" />
}

function getFileBg(fileUrl: string): string {
  const ext = fileUrl.split('.').pop()?.toLowerCase().split('?')[0]
  if (ext === 'pdf') return 'bg-red-50 border-red-200'
  if (['xls', 'xlsx'].includes(ext || '')) return 'bg-green-50 border-green-200'
  if (['doc', 'docx'].includes(ext || '')) return 'bg-blue-50 border-blue-200'
  return 'bg-gray-50 border-gray-200'
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function TaskReportReviewDialog({ open, onOpenChange, task }: TaskReportReviewDialogProps) {
  const { toast } = useToast()
  const { data: reports = [] } = useTaskReports(task?.id || 0)
  const approveTask = useApproveTask()
  const requestChange = useRequestChange()
  const addComment = useAddMentorComment()

  const [comment, setComment] = useState('')
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null)
  const [chatOpen, setChatOpen] = useState(false)
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null)

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}')

  const handleApprove = async () => {
    if (!task) return
    try {
      await approveTask.mutateAsync(task.id)
      toast({ title: 'Thành công', description: 'Đã duyệt nhiệm vụ' })
      onOpenChange(false)
    } catch (error: any) {
      toast({ title: 'Lỗi', description: error.response?.data?.detail || 'Có lỗi xảy ra'})
    }
  }

  const handleRequestChange = async () => {
    if (!task) return
    try {
      await requestChange.mutateAsync(task.id)
      toast({ title: 'Thành công', description: 'Đã yêu cầu chỉnh sửa' })
      onOpenChange(false)
    } catch (error: any) {
      toast({ title: 'Lỗi', description: error.response?.data?.detail || 'Có lỗi xảy ra'})
    }
  }

  const handleAddComment = async () => {
    if (!task || !selectedReportId || !comment.trim()) return
    try {
      await addComment.mutateAsync({ taskId: task.id, reportId: selectedReportId, comment: comment.trim() })
      toast({ title: 'Thành công', description: 'Đã thêm nhận xét' })
      setComment('')
      setSelectedReportId(null)
    } catch (error: any) {
      toast({ title: 'Lỗi', description: error.response?.data?.detail || 'Có lỗi xảy ra' })
    }
  }

  // Tải file về máy — fetch với JWT token rồi tạo blob URL
  const handleDownload = async (fileUrl: string, key: string) => {
    setDownloadingKey(key)
    try {
      const url = buildFileUrl(fileUrl)
      const fileName = getFileName(fileUrl)
      const token = localStorage.getItem('access_token')

      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) throw new Error('Lỗi tải file')

      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(blobUrl)

      toast({ title: '✅ Tải xuống thành công', description: fileName })
    } catch {
      toast({ title: 'Lỗi', description: 'Không thể tải file' })
    } finally {
      setDownloadingKey(null)
    }
  }

  if (!task) return null

  const status = statusConfig[task.status] || statusConfig.new
  const canReview = task.status === 'submitted'

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Chi tiết nhiệm vụ
              </div>
              <Button
                size="sm" variant="outline"
                onClick={() => setChatOpen(true)}
                className="flex items-center gap-1.5 text-blue-700 border-blue-300 hover:bg-blue-50"
              >
                <MessageSquare className="h-4 w-4" />
                Trao đổi với TTS
              </Button>
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[70vh] pr-4">
            <div className="space-y-6">

              {/* ── Thông tin nhiệm vụ ── */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg">{task.title}</h3>
                  <Badge variant={status.variant}>{status.label}</Badge>
                </div>

                {task.description && (
                  <p className="text-muted-foreground">{task.description}</p>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Thực tập sinh:</span>
                    <span className="font-medium">{task.intern_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Hạn nộp:</span>
                    <span className="font-medium">
                      {format(new Date(task.deadline), 'dd/MM/yyyy HH:mm', { locale: vi })}
                    </span>
                  </div>
                </div>

                {/* File mentor giao kèm nhiệm vụ */}
                {task.file_attachment && (
                  <div className={`flex items-center gap-3 border rounded-lg p-3 ${getFileBg(task.file_attachment)}`}>
                    <Paperclip className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground mb-0.5">File giao kèm nhiệm vụ</p>
                      <p className="text-sm font-medium truncate">{getFileName(task.file_attachment)}</p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <a href={buildFileUrl(task.file_attachment)} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="outline" className="h-7 gap-1">
                          <Eye className="h-3.5 w-3.5" /> Xem
                        </Button>
                      </a>
                      <Button
                        size="sm" variant="outline" className="h-7 gap-1"
                        disabled={downloadingKey === `task-${task.id}`}
                        onClick={() => handleDownload(task.file_attachment!, `task-${task.id}`)}
                      >
                        <Download className="h-3.5 w-3.5" />
                        {downloadingKey === `task-${task.id}` ? '...' : 'Tải'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* ── Báo cáo TTS ── */}
              <div className="space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Báo cáo ({reports.length})
                </h4>

                {reports.length === 0 ? (
                  <p className="text-muted-foreground text-sm italic">Chưa có báo cáo nào được nộp</p>
                ) : (
                  <div className="space-y-4">
                    {reports.map((report: TaskReport, index: number) => (
                      <div key={report.id} className="border rounded-lg overflow-hidden">

                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b">
                          <span className="text-sm font-medium">Lần nộp #{index + 1}</span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(report.submitted_at), 'HH:mm — dd/MM/yyyy', { locale: vi })}
                          </span>
                        </div>

                        <div className="p-4 space-y-3">
                          {/* Nội dung báo cáo */}
                          <div>
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1.5">
                              Nội dung
                            </p>
                            <div className="bg-gray-50 rounded-md p-3 text-sm whitespace-pre-wrap leading-relaxed">
                              {report.content}
                            </div>
                          </div>

                          {/* File TTS nộp kèm — XEM + TẢI XUỐNG */}
                          {report.file_submission && (
                            <div className={`flex items-center gap-3 border rounded-lg p-3 ${getFileBg(report.file_submission)}`}>
                              {getFileIcon(report.file_submission)}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{getFileName(report.file_submission)}</p>
                                <p className="text-xs text-muted-foreground">File báo cáo của TTS</p>
                              </div>
                              <div className="flex gap-2 flex-shrink-0">
                                {/* Xem — PDF/ảnh mở trên tab mới */}
                                <a
                                  href={buildFileUrl(report.file_submission)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <Button size="sm" variant="outline" className="h-8 gap-1.5">
                                    <Eye className="h-3.5 w-3.5" />
                                    Xem
                                  </Button>
                                </a>
                                {/* Tải xuống */}
                                <Button
                                  size="sm"
                                  className="h-8 gap-1.5"
                                  disabled={downloadingKey === `report-${report.id}`}
                                  onClick={() => handleDownload(report.file_submission!, `report-${report.id}`)}
                                >
                                  <Download className="h-3.5 w-3.5" />
                                  {downloadingKey === `report-${report.id}` ? 'Đang tải...' : 'Tải xuống'}
                                </Button>
                              </div>
                            </div>
                          )}

                          {/* Nhận xét mentor */}
                          {report.mentor_comment && (
                            <div className="bg-blue-50 border border-blue-100 rounded-md p-3">
                              <p className="text-sm font-medium text-blue-800 mb-1">Nhận xét của Mentor:</p>
                              <p className="text-sm text-blue-900">{report.mentor_comment}</p>
                              {report.commented_at && (
                                <p className="text-xs text-blue-500 mt-1">
                                  {format(new Date(report.commented_at), 'dd/MM/yyyy HH:mm', { locale: vi })}
                                </p>
                              )}
                            </div>
                          )}

                          {/* Form thêm nhận xét */}
                          {!report.mentor_comment && (
                            <div className="space-y-2">
                              {selectedReportId === report.id ? (
                                <>
                                  <Textarea
                                    placeholder="Nhập nhận xét cho TTS..."
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    rows={2}
                                  />
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      onClick={handleAddComment}
                                      disabled={!comment.trim() || addComment.isPending}
                                    >
                                      {addComment.isPending ? 'Đang lưu...' : 'Lưu nhận xét'}
                                    </Button>
                                    <Button
                                      size="sm" variant="outline"
                                      onClick={() => { setSelectedReportId(null); setComment('') }}
                                    >
                                      Hủy
                                    </Button>
                                  </div>
                                </>
                              ) : (
                                <Button size="sm" variant="outline"
                                  onClick={() => setSelectedReportId(report.id)}
                                >
                                  <MessageSquare className="h-4 w-4 mr-1" />
                                  Thêm nhận xét
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Duyệt / Yêu cầu sửa ── */}
              {canReview && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <Label>Hành động</Label>
                    <div className="flex gap-3">
                      <Button
                        onClick={handleApprove}
                        disabled={approveTask.isPending}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        {approveTask.isPending ? 'Đang xử lý...' : 'Duyệt nhiệm vụ'}
                      </Button>
                      <Button
                        onClick={handleRequestChange}
                        disabled={requestChange.isPending}
                        variant="destructive"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        {requestChange.isPending ? 'Đang xử lý...' : 'Yêu cầu chỉnh sửa'}
                      </Button>
                    </div>
                  </div>
                </>
              )}

            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <TaskChatDialog
        open={chatOpen}
        onOpenChange={setChatOpen}
        task={task}
        currentUserId={currentUser.id}
        currentUserRole="mentor"
      />
    </>
  )
}