import { useState, useEffect, useRef } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  useCreateTask, useUpdateTask, type Task, type CreateTaskData, type UpdateTaskData,
} from '@/hooks/use-tasks'
import { useInternProfiles, type InternProfile } from '@/hooks/use-profiles'
import { useBatches, type Batch } from '@/hooks/use-batches'
import { useToast } from '@/hooks/use-toast'
import { Upload, X, Users, Paperclip, Check } from 'lucide-react'
import api from '@/lib/api'

interface TaskFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task?: Task | null
}

const ALLOWED_EXTENSIONS = ['.pdf', '.xls', '.xlsx', '.doc', '.docx', '.png', '.jpg', '.jpeg']
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function TaskFormDialog({ open, onOpenChange, task }: TaskFormDialogProps) {
  const { toast } = useToast()
  const createTask = useCreateTask()
  const updateTask = useUpdateTask()
  const { data: interns = [], isLoading: internsLoading } = useInternProfiles()
  const { data: batches = [], isLoading: batchesLoading } = useBatches()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    batch_id: '',
    deadline: '',
  })
  const [selectedInternIds, setSelectedInternIds] = useState<string[]>([])
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  // ── Chỉ hiển thị đợt đang mở (status = "open") ──────────────────────────
  const openBatches = batches.filter((b: Batch) => b.status === 'open')

  // ── TTS lọc theo đợt đã chọn ─────────────────────────────────────────────
  const filteredInterns = interns.filter(
    (intern: InternProfile) =>
      !formData.batch_id || intern.batch_id.toString() === formData.batch_id
  )

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title,
        description: task.description || '',
        batch_id: task.batch_id.toString(),
        deadline: task.deadline ? task.deadline.slice(0, 16) : '',
      })
      setSelectedInternIds([task.intern_id.toString()])
    } else {
      setFormData({ title: '', description: '', batch_id: '', deadline: '' })
      setSelectedInternIds([])
      setSelectedFile(null)
    }
  }, [task, open])

  // Khi đổi đợt → reset danh sách TTS đã chọn
  const handleBatchChange = (value: string) => {
    setFormData({ ...formData, batch_id: value })
    setSelectedInternIds([])
  }

  // Toggle chọn/bỏ TTS
  const toggleIntern = (userId: string) => {
    setSelectedInternIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    )
  }

  const toggleAllInterns = () => {
    if (selectedInternIds.length === filteredInterns.length) {
      setSelectedInternIds([])
    } else {
      setSelectedInternIds(filteredInterns.map((i: InternProfile) => i.user_id.toString()))
    }
  }

  // ── File handling ─────────────────────────────────────────────────────────
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      toast({ title: 'Định dạng không hỗ trợ', description: `Chỉ chấp nhận: ${ALLOWED_EXTENSIONS.join(', ')}`})
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      toast({ title: 'File quá lớn', description: 'Tối đa 10MB'})
      return
    }
    setSelectedFile(file)
    e.target.value = ''
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (task?.status === 'approved') {
       toast({ title: 'Không thể sửa', description: 'Nhiệm vụ đã được duyệt' })
       return
    }
    if (!formData.title || !formData.batch_id || !formData.deadline) {
      toast({ title: 'Lỗi', description: 'Vui lòng điền đầy đủ thông tin bắt buộc' })
      return
    }
    if (!task && selectedInternIds.length === 0) {
      toast({ title: 'Lỗi', description: 'Vui lòng chọn ít nhất 1 thực tập sinh' })
      return
    }

    try {
      setUploading(true)

      // Upload file đính kèm nếu có
      let fileAttachmentUrl: string | undefined = undefined
      if (selectedFile) {
        const formDataUpload = new FormData()
        formDataUpload.append('file', selectedFile)
        formDataUpload.append('title', `Đính kèm - ${formData.title}`)
        formDataUpload.append('doc_type', selectedFile.name.endsWith('.pdf') ? 'pdf' : 'other')
        const uploadRes = await api.post('/documents/upload', formDataUpload, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        fileAttachmentUrl = uploadRes.data.file_url
      }

      if (task) {
        // Cập nhật nhiệm vụ đơn
        const updateData: UpdateTaskData = {
          title: formData.title,
          description: formData.description || undefined,
          deadline: new Date(formData.deadline).toISOString(),
          ...(fileAttachmentUrl && { file_attachment: fileAttachmentUrl }),
        }
        await updateTask.mutateAsync({ taskId: task.id, data: updateData })
        toast({ title: 'Thành công', description: 'Cập nhật nhiệm vụ thành công' })
      } else {
        // Tạo nhiệm vụ cho NHIỀU TTS — tạo lần lượt
        const deadline = new Date(formData.deadline).toISOString()
        const results = await Promise.allSettled(
          selectedInternIds.map(internId =>
            createTask.mutateAsync({
              title: formData.title,
              description: formData.description || undefined,
              intern_id: parseInt(internId),
              batch_id: parseInt(formData.batch_id),
              deadline,
              ...(fileAttachmentUrl && { file_attachment: fileAttachmentUrl }),
            } as CreateTaskData)
          )
        )

        const succeeded = results.filter(r => r.status === 'fulfilled').length
        const failed = results.filter(r => r.status === 'rejected').length

        if (succeeded > 0) {
          toast({
            title: '✅ Tạo nhiệm vụ thành công',
            description: failed > 0
              ? `Đã tạo cho ${succeeded}/${selectedInternIds.length} TTS. ${failed} TTS bị lỗi.`
              : `Đã giao cho ${succeeded} thực tập sinh`,
          })
        } else {
          toast({ title: 'Lỗi', description: 'Không thể tạo nhiệm vụ' })
          return
        }
      }

      onOpenChange(false)
    } catch (error: any) {
      toast({
        title: 'Lỗi',
        description: error.response?.data?.detail || 'Có lỗi xảy ra',
        
      })
    } finally {
      setUploading(false)
    }
  }

  const isLoading = uploading || createTask.isPending || updateTask.isPending
  const allSelected = filteredInterns.length > 0 && selectedInternIds.length === filteredInterns.length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{task ? 'Sửa nhiệm vụ' : 'Tạo nhiệm vụ mới'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tiêu đề */}
          <div className="space-y-1.5">
            <Label htmlFor="title">Tiêu đề <span className="text-red-500">*</span></Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Nhập tiêu đề nhiệm vụ"
            />
          </div>

          {/* Mô tả */}
          <div className="space-y-1.5">
            <Label htmlFor="description">Mô tả</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Nhập mô tả chi tiết"
              rows={3}
            />
          </div>

          {/* Đợt thực tập — chỉ hiện đợt ĐANG MỞ */}
          <div className="space-y-1.5">
            <Label>
              Đợt thực tập <span className="text-red-500">*</span>
              {!batchesLoading && openBatches.length === 0 && (
                <span className="ml-2 text-xs text-orange-500 font-normal">Không có đợt nào đang mở</span>
              )}
            </Label>
            <Select
              value={formData.batch_id}
              onValueChange={handleBatchChange}
              disabled={!!task || batchesLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder={batchesLoading ? 'Đang tải...' : 'Chọn đợt'} />
              </SelectTrigger>
              <SelectContent>
                {openBatches.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">Không có đợt nào đang mở</div>
                ) : (
                  openBatches.map((batch: Batch) => (
                    <SelectItem key={batch.id} value={batch.id.toString()}>
                      {batch.batch_name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Chọn TTS — multi-select bằng checkbox */}
          {!task && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>
                  Thực tập sinh <span className="text-red-500">*</span>
                  {selectedInternIds.length > 0 && (
                    <Badge className="ml-2 bg-blue-100 text-blue-700 text-xs">
                      Đã chọn {selectedInternIds.length}
                    </Badge>
                  )}
                </Label>
                {filteredInterns.length > 0 && formData.batch_id && (
                  <button
                    type="button"
                    className="text-xs text-blue-600 hover:underline"
                    onClick={toggleAllInterns}
                  >
                    {allSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                  </button>
                )}
              </div>

              {!formData.batch_id ? (
                <div className="border rounded-lg p-3 text-sm text-muted-foreground text-center bg-gray-50">
                  Vui lòng chọn đợt thực tập trước
                </div>
              ) : internsLoading ? (
                <div className="border rounded-lg p-3 text-sm text-center text-muted-foreground">Đang tải...</div>
              ) : filteredInterns.length === 0 ? (
                <div className="border rounded-lg p-3 text-sm text-center text-muted-foreground bg-gray-50">
                  Không có thực tập sinh nào trong đợt này
                </div>
              ) : (
                <div className="border rounded-lg divide-y max-h-44 overflow-y-auto">
                  {filteredInterns.map((intern: InternProfile) => {
                    const uid = intern.user_id.toString()
                    const checked = selectedInternIds.includes(uid)
                    return (
                      <label
                        key={intern.id}
                        className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors ${checked ? 'bg-blue-50' : ''}`}
                      >
                        <div
                          onClick={() => toggleIntern(uid)}
                          className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                            checked ? 'bg-blue-600 border-blue-600' : 'border-gray-300 bg-white'
                          }`}
                        >
                          {checked && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                        </div>
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                            {intern.user_full_name?.charAt(0) || '?'}
                          </div>
                          <span className="text-sm font-medium truncate">{intern.user_full_name}</span>
                        </div>
                      </label>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Khi edit — hiển thị TTS đơn giản (không cho đổi) */}
          {task && (
            <div className="space-y-1.5">
              <Label>Thực tập sinh</Label>
              <div className="flex items-center gap-2 px-3 py-2 border rounded-lg bg-gray-50 text-sm">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{task.intern_name}</span>
                <span className="text-muted-foreground text-xs ml-auto">Không thể thay đổi</span>
              </div>
            </div>
          )}

          {/* Hạn nộp */}
          <div className="space-y-1.5">
            <Label htmlFor="deadline">Hạn nộp <span className="text-red-500">*</span></Label>
            <Input
              id="deadline"
              type="datetime-local"
              value={formData.deadline}
              onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
              min={new Date().toISOString().slice(0, 16)}
            />
          </div>

          {/* Upload file đính kèm */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <Paperclip className="h-4 w-4" />
              File đính kèm <span className="text-muted-foreground font-normal text-xs">(không bắt buộc)</span>
            </Label>

            {!selectedFile ? (
              <div
                className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-1.5" />
                <p className="text-sm font-medium">Nhấn để đính kèm file</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  PDF, Excel, Word, ảnh — tối đa 10MB
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
                <Paperclip className="h-5 w-5 text-blue-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
                </div>
                <Button
                  type="button" variant="ghost" size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-red-600"
                  onClick={() => setSelectedFile(null)}
                  disabled={isLoading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept={ALLOWED_EXTENSIONS.join(',')}
              className="hidden"
              onChange={handleFileSelect}
              disabled={isLoading}
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Hủy
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <><span className="animate-spin mr-2">⏳</span>Đang xử lý...</>
              ) : task ? 'Cập nhật' : (
                selectedInternIds.length > 1
                  ? `Tạo cho ${selectedInternIds.length} TTS`
                  : 'Tạo nhiệm vụ'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}