import { useState, useEffect, useMemo } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { useCreateFeedback, useUpdateFeedback, type WeeklyFeedback, type CreateFeedbackData } from '@/hooks/use-weekly-feedbacks'
import { Star, TrendingUp, AlertCircle, FileText, CalendarDays, Info } from 'lucide-react'
import { differenceInCalendarWeeks, parseISO, startOfWeek, format, addDays } from 'date-fns'
import { vi } from 'date-fns/locale'
import type { InternProfile } from '@/hooks/use-profiles'

interface WeeklyFeedbackDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  intern: InternProfile | null
  existingFeedback?: WeeklyFeedback | null
  weekNumber?: number
  batchId?: number
  batchStartDate?: string  // ✅ THÊM: để tính tuần + hiển thị range ngày
}

// ✅ Tính tuần hiện tại từ ngày bắt đầu đợt
function calcCurrentWeek(batchStartDate: string): number {
  const start = startOfWeek(parseISO(batchStartDate), { weekStartsOn: 1 })
  const now   = startOfWeek(new Date(), { weekStartsOn: 1 })
  const diff  = differenceInCalendarWeeks(now, start)
  return Math.max(1, diff + 1)
}

// ✅ Tính range ngày của tuần thứ N trong đợt
function getWeekDateRange(batchStartDate: string, weekNumber: number): string {
  const start   = startOfWeek(parseISO(batchStartDate), { weekStartsOn: 1 })
  const monday  = addDays(start, (weekNumber - 1) * 7)
  const sunday  = addDays(monday, 6)
  return `${format(monday, 'dd/MM', { locale: vi })} - ${format(sunday, 'dd/MM/yyyy', { locale: vi })}`
}

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0)
  const labels = ['', 'Yếu', 'Trung bình', 'Khá', 'Tốt', 'Xuất sắc']
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(star => (
          <button key={star} type="button" onClick={() => onChange(star)}
            onMouseEnter={() => setHovered(star)} onMouseLeave={() => setHovered(0)}
            className="focus:outline-none transition-transform hover:scale-110">
            <Star className={`h-7 w-7 transition-colors ${
              star <= (hovered || value) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`} />
          </button>
        ))}
      </div>
      {(hovered || value) > 0 && (
        <span className="text-sm font-medium text-yellow-600">{labels[hovered || value]}</span>
      )}
    </div>
  )
}

export default function WeeklyFeedbackDialog({
  open, onOpenChange, intern, existingFeedback, weekNumber: weekNumberProp = 1, batchId, batchStartDate,
}: WeeklyFeedbackDialogProps) {
  const { toast } = useToast()
  const createFeedback = useCreateFeedback()
  const updateFeedback = useUpdateFeedback()

  // ✅ Tính tuần tự động nếu có batchStartDate
  const autoWeekNumber = useMemo(() => {
    if (batchStartDate) return calcCurrentWeek(batchStartDate)
    return weekNumberProp
  }, [batchStartDate, weekNumberProp])

  // ✅ Tính range ngày của tuần
  const weekDateRange = useMemo(() => {
    if (!batchStartDate) return null
    return getWeekDateRange(batchStartDate, autoWeekNumber)
  }, [batchStartDate, autoWeekNumber])

  const [form, setForm] = useState({
    week_number: autoWeekNumber,
    week_label:  weekDateRange || '',
    content:     '',
    strengths:   '',
    improvements:'',
    rating:      0,
  })

  useEffect(() => {
    if (!open) return
    if (existingFeedback) {
      setForm({
        week_number:  existingFeedback.week_number,
        week_label:   existingFeedback.week_label || '',
        content:      existingFeedback.content,
        strengths:    existingFeedback.strengths || '',
        improvements: existingFeedback.improvements || '',
        rating:       existingFeedback.rating || 0,
      })
    } else {
      // ✅ Auto-fill tuần + range ngày khi tạo mới
      setForm({
        week_number:  autoWeekNumber,
        week_label:   weekDateRange || '',
        content:      '',
        strengths:    '',
        improvements: '',
        rating:       0,
      })
    }
  }, [existingFeedback, open, autoWeekNumber, weekDateRange])

  // ✅ Khi mentor đổi số tuần → tự cập nhật lại range ngày
  const handleWeekNumberChange = (val: number) => {
    const newRange = batchStartDate ? getWeekDateRange(batchStartDate, val) : ''
    setForm(f => ({ ...f, week_number: val, week_label: newRange }))
  }

  const isEditing = !!existingFeedback

  const handleSubmit = async () => {
    if (!intern || !form.content.trim()) return
    try {
      if (isEditing && existingFeedback) {
        await updateFeedback.mutateAsync({
          id: existingFeedback.id,
          data: {
            week_label:   form.week_label || undefined,
            content:      form.content.trim(),
            strengths:    form.strengths.trim() || undefined,
            improvements: form.improvements.trim() || undefined,
            rating:       form.rating || undefined,
          },
        })
        toast({ title: 'Đã cập nhật feedback' })
      } else {
        const payload: CreateFeedbackData = {
          intern_id:    intern.user_id,
          batch_id:     batchId || intern.batch_id,
          week_number:  form.week_number,
          week_label:   form.week_label || undefined,
          content:      form.content.trim(),
          strengths:    form.strengths.trim() || undefined,
          improvements: form.improvements.trim() || undefined,
          rating:       form.rating || undefined,
        }
        await createFeedback.mutateAsync(payload)
        toast({ title: 'Đã tạo feedback tuần' })
      }
      onOpenChange(false)
    } catch (error: any) {
      toast({ title: 'Lỗi', description: error.response?.data?.detail || 'Có lỗi xảy ra' })
    }
  }

  if (!intern) return null
  const isPending = createFeedback.isPending || updateFeedback.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[580px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            {isEditing ? 'Chỉnh sửa' : 'Tạo'} Feedback tuần — {intern.user_full_name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">

          {/* ✅ Banner tuần tự động */}
          {batchStartDate && !isEditing && (
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-700">
              <CalendarDays className="h-4 w-4 shrink-0 text-blue-500" />
              <span>
                Hệ thống tự tính: <strong>Tuần {autoWeekNumber}</strong>
                {weekDateRange && <> ({weekDateRange})</>} — bạn có thể chỉnh nếu cần
              </span>
            </div>
          )}

          {/* Tuần số + nhãn */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>
                Tuần thứ <span className="text-red-500">*</span>
                {batchStartDate && !isEditing && (
                  <span className="ml-1 text-[10px] text-blue-500 font-normal">(tự động)</span>
                )}
              </Label>
              <Input
                type="number"
                min={1}
                max={52}
                value={form.week_number}
                onChange={e => handleWeekNumberChange(Number(e.target.value))}
                disabled={isEditing}
                className={!isEditing && batchStartDate ? 'border-blue-300 bg-blue-50/50' : ''}
              />
            </div>
            <div className="space-y-1.5">
              <Label>
                Khoảng thời gian
                {batchStartDate && !isEditing && (
                  <span className="ml-1 text-[10px] text-blue-500 font-normal">(tự động)</span>
                )}
              </Label>
              <Input
                placeholder="VD: 01/01 - 07/01"
                value={form.week_label}
                onChange={e => setForm(f => ({ ...f, week_label: e.target.value }))}
                className={!isEditing && batchStartDate ? 'border-blue-300 bg-blue-50/50' : ''}
              />
            </div>
          </div>

          {/* Đánh giá sao */}
          <div className="space-y-1.5">
            <Label>Đánh giá tổng quát</Label>
            <StarRating value={form.rating} onChange={v => setForm(f => ({ ...f, rating: v }))} />
          </div>

          {/* Nội dung nhận xét */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-blue-500" />
              Nhận xét chung <span className="text-red-500">*</span>
            </Label>
            <Textarea
              placeholder="Nhận xét về quá trình làm việc trong tuần này..."
              value={form.content}
              onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              rows={3}
            />
          </div>

          {/* Điểm mạnh */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-green-500" />
              Điểm mạnh
            </Label>
            <Textarea
              placeholder="Những điểm TTS thể hiện tốt trong tuần..."
              value={form.strengths}
              onChange={e => setForm(f => ({ ...f, strengths: e.target.value }))}
              rows={2}
              className="border-green-200 focus:border-green-400"
            />
          </div>

          {/* Cần cải thiện */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4 text-orange-500" />
              Cần cải thiện
            </Label>
            <Textarea
              placeholder="Những điểm TTS cần cải thiện trong tuần tới..."
              value={form.improvements}
              onChange={e => setForm(f => ({ ...f, improvements: e.target.value }))}
              rows={2}
              className="border-orange-200 focus:border-orange-400"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>Hủy</Button>
          <Button onClick={handleSubmit} disabled={!form.content.trim() || isPending} className="bg-blue-800 hover:bg-blue-900">
            {isPending ? 'Đang lưu...' : isEditing ? 'Cập nhật' : 'Tạo feedback'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}