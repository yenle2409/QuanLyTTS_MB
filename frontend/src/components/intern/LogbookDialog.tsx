import { useState, useEffect } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import {
  useCreateLogbook, useUpdateLogbook,
  type LogbookEntry, type CreateLogbookData,
} from '@/hooks/use-logbook'
import { BookOpen, Lightbulb, AlertTriangle, ArrowRight, CalendarDays, Hash } from 'lucide-react'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  batchId: number
  existing?: LogbookEntry | null
}

export default function LogbookDialog({ open, onOpenChange, batchId, existing }: Props) {
  const { toast } = useToast()
  const create = useCreateLogbook()
  const update = useUpdateLogbook()

  const today = new Date().toISOString().split('T')[0]

  const [entryType, setEntryType] = useState<'daily' | 'weekly'>('daily')
  const [form, setForm] = useState({
    log_date: today,
    week_number: 1,
    week_label: '',
    title: '',
    content: '',
    learned: '',
    difficulties: '',
    plan_next: '',
  })

  useEffect(() => {
    if (existing) {
      setEntryType(existing.entry_type)
      setForm({
        log_date: existing.log_date || today,
        week_number: existing.week_number || 1,
        week_label: existing.week_label || '',
        title: existing.title,
        content: existing.content,
        learned: existing.learned || '',
        difficulties: existing.difficulties || '',
        plan_next: existing.plan_next || '',
      })
    } else {
      setEntryType('daily')
      setForm({ log_date: today, week_number: 1, week_label: '', title: '', content: '', learned: '', difficulties: '', plan_next: '' })
    }
  }, [existing, open])

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.content.trim()) return
    try {
      if (existing) {
        await update.mutateAsync({
          id: existing.id,
          data: {
            title: form.title.trim(),
            content: form.content.trim(),
            learned: form.learned.trim() || undefined,
            difficulties: form.difficulties.trim() || undefined,
            plan_next: form.plan_next.trim() || undefined,
            week_label: entryType === 'weekly' ? (form.week_label || undefined) : undefined,
          },
        })
        toast({ title: 'Đã cập nhật nhật ký' })
      } else {
        const payload: CreateLogbookData = {
          batch_id: batchId,
          entry_type: entryType,
          title: form.title.trim(),
          content: form.content.trim(),
          learned: form.learned.trim() || undefined,
          difficulties: form.difficulties.trim() || undefined,
          plan_next: form.plan_next.trim() || undefined,
        }
        if (entryType === 'daily') {
          payload.log_date = form.log_date
        } else {
          payload.week_number = form.week_number
          payload.week_label = form.week_label || undefined
        }
        await create.mutateAsync(payload)
        toast({ title: 'Đã thêm nhật ký!' })
      }
      onOpenChange(false)
    } catch (err: any) {
      toast({ title: 'Lỗi', description: err.response?.data?.detail || 'Có lỗi xảy ra' })
    }
  }

  const isPending = create.isPending || update.isPending
  const isEditing = !!existing

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[580px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-green-600" />
            {isEditing ? 'Chỉnh sửa' : 'Thêm'} nhật ký thực tập
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Loại nhật ký — chỉ khi tạo mới */}
          {!isEditing && (
            <Tabs value={entryType} onValueChange={v => setEntryType(v as 'daily' | 'weekly')}>
              <TabsList className="w-full">
                <TabsTrigger value="daily" className="flex-1 gap-1.5">
                  <CalendarDays className="h-4 w-4" />Nhật ký ngày
                </TabsTrigger>
                <TabsTrigger value="weekly" className="flex-1 gap-1.5">
                  <Hash className="h-4 w-4" />Nhật ký tuần
                </TabsTrigger>
              </TabsList>
              <TabsContent value="daily" className="mt-3">
                <div className="space-y-1.5">
                  <Label>Ngày <span className="text-red-500">*</span></Label>
                  <Input type="date" value={form.log_date}
                    onChange={e => setForm(f => ({ ...f, log_date: e.target.value }))} />
                </div>
              </TabsContent>
              <TabsContent value="weekly" className="mt-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Tuần thứ <span className="text-red-500">*</span></Label>
                    <Input type="number" min={1} value={form.week_number}
                      onChange={e => setForm(f => ({ ...f, week_number: Number(e.target.value) }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Nhãn tuần</Label>
                    <Input placeholder="VD: 01/01 - 07/01" value={form.week_label}
                      onChange={e => setForm(f => ({ ...f, week_label: e.target.value }))} />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}

          {/* Tiêu đề */}
          <div className="space-y-1.5">
            <Label>Tiêu đề <span className="text-red-500">*</span></Label>
            <Input placeholder="VD: Học Git, hoàn thành task #3..." value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>

          {/* Hoạt động chính */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <BookOpen className="h-4 w-4 text-blue-500" />
              Hoạt động trong ngày/tuần <span className="text-red-500">*</span>
            </Label>
            <Textarea placeholder="Mô tả công việc, nhiệm vụ đã làm hôm nay..." rows={3}
              value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} />
          </div>

          {/* Đã học được */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <Lightbulb className="h-4 w-4 text-yellow-500" />Đã học được
            </Label>
            <Textarea placeholder="Kiến thức, kỹ năng học được hôm nay..." rows={2}
              value={form.learned} onChange={e => setForm(f => ({ ...f, learned: e.target.value }))}
              className="border-yellow-200 focus:border-yellow-400" />
          </div>

          {/* Khó khăn */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-orange-500" />Khó khăn gặp phải
            </Label>
            <Textarea placeholder="Những vấn đề chưa giải quyết được..." rows={2}
              value={form.difficulties} onChange={e => setForm(f => ({ ...f, difficulties: e.target.value }))}
              className="border-orange-200 focus:border-orange-400" />
          </div>

          {/* Kế hoạch */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <ArrowRight className="h-4 w-4 text-green-500" />
              Kế hoạch {entryType === 'daily' ? 'ngày' : 'tuần'} tới
            </Label>
            <Textarea placeholder="Dự kiến công việc tiếp theo..." rows={2}
              value={form.plan_next} onChange={e => setForm(f => ({ ...f, plan_next: e.target.value }))}
              className="border-green-200 focus:border-green-400" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>Hủy</Button>
          <Button
            onClick={handleSubmit}
            disabled={!form.title.trim() || !form.content.trim() || isPending}
            className="bg-green-700 hover:bg-green-800"
          >
            {isPending ? 'Đang lưu...' : isEditing ? 'Cập nhật' : 'Lưu nhật ký'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}