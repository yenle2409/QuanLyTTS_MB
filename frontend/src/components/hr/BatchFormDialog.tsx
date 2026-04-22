import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCreateBatch, useUpdateBatch, type Batch, type CreateBatchData, type UpdateBatchData } from '@/hooks/use-batches'
import { useToast } from '@/hooks/use-toast'
import { Loader2 } from 'lucide-react'

interface BatchFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  batch?: Batch | null
}

export default function BatchFormDialog({ open, onOpenChange, batch }: BatchFormDialogProps) {
  const { toast } = useToast()
  const createBatch = useCreateBatch()
  const updateBatch = useUpdateBatch()

  const isEditing = !!batch

  const [formData, setFormData] = useState({
    batch_name: '',
    start_date: '',
    end_date: '',
    status: 'open' as 'open' | 'closed',
    description: '',
  })

  useEffect(() => {
    if (batch) {
      setFormData({
        batch_name: batch.batch_name,
        start_date: batch.start_date,
        end_date: batch.end_date,
        status: batch.status,
        description: batch.description || '',
      })
    } else {
      setFormData({
        batch_name: '',
        start_date: '',
        end_date: '',
        status: 'open',
        description: '',
      })
    }
  }, [batch, open])

  // ── Dùng onClick thay vì onSubmit để tránh Dialog đóng khi Select thay đổi ──
  const today = new Date().toISOString().split('T')[0] // 'yyyy-MM-dd'

  const handleSubmit = async () => {
    if (!formData.batch_name.trim()) {
      toast({ title: 'Lỗi', description: 'Vui lòng nhập tên đợt thực tập' })
      return
    }
    if (!formData.start_date || !formData.end_date) {
      toast({ title: 'Lỗi', description: 'Vui lòng chọn ngày bắt đầu và kết thúc' })
      return
    }
    // Khi tạo mới: ngày bắt đầu không được là ngày trong quá khứ
    if (!isEditing && formData.start_date < today) {
      toast({ title: 'Lỗi', description: 'Ngày bắt đầu không được là ngày trong quá khứ' })
      return
    }
    if (formData.end_date <= formData.start_date) {
      toast({ title: 'Lỗi', description: 'Ngày kết thúc phải sau ngày bắt đầu' })
      return
    }

    try {
      if (isEditing) {
        const updateData: UpdateBatchData = {
          batch_name: formData.batch_name,
          start_date: formData.start_date,
          end_date: formData.end_date,
          status: formData.status,
          description: formData.description || undefined,
        }
        await updateBatch.mutateAsync({ batchId: batch.id, data: updateData })
        toast({ title: 'Thành công', description: 'Cập nhật đợt thực tập thành công' })
      } else {
        const createData: CreateBatchData = {
          batch_name: formData.batch_name,
          start_date: formData.start_date,
          end_date: formData.end_date,
          description: formData.description || undefined,
        }
        await createBatch.mutateAsync(createData)
        toast({ title: 'Thành công', description: 'Tạo đợt thực tập mới thành công' })
      }
      onOpenChange(false)
    } catch (error: any) {
      toast({
        title: 'Lỗi',
        description: error.response?.data?.detail || 'Có lỗi xảy ra',
      })
    }
  }

  const isLoading = createBatch.isPending || updateBatch.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[500px]"
        onInteractOutside={(e) => {
          // Chặn Dialog đóng khi click vào SelectContent portal
          const target = e.target as HTMLElement
          if (target.closest('[data-radix-popper-content-wrapper]')) {
            e.preventDefault()
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Chỉnh sửa đợt thực tập' : 'Tạo đợt thực tập mới'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="batch_name">Tên đợt thực tập</Label>
            <Input
              id="batch_name"
              placeholder="VD: Đợt 1 - 2025"
              value={formData.batch_name}
              onChange={(e) => setFormData({ ...formData, batch_name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Ngày bắt đầu</Label>
              <Input
                id="start_date"
                type="date"
                min={!isEditing ? today : undefined}
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">Ngày kết thúc</Label>
              <Input
                id="end_date"
                type="date"
                min={formData.start_date || (!isEditing ? today : undefined)}
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              />
            </div>
          </div>

          {isEditing && (
            <div className="space-y-2">
              <Label>Trạng thái</Label>
              <Select
                value={formData.status}
                onValueChange={(value: 'open' | 'closed') =>
                  setFormData({ ...formData, status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Đang mở</SelectItem>
                  <SelectItem value="closed">Đã đóng</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="description">Mô tả</Label>
            <textarea
              id="description"
              placeholder="Mô tả chi tiết về đợt thực tập..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Hủy
            </Button>
            {/* ✅ onClick thay vì type="submit" — tránh form submit đóng Dialog */}
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading}
            >
              {isLoading
                ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Đang xử lý...</>
                : isEditing ? 'Cập nhật' : 'Tạo mới'
              }
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}