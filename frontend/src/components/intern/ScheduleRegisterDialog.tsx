import { useState, useEffect } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import {
  useCreateSchedule, useSchedules, SHIFT_LABELS, STATUS_LABELS,
  type ShiftType, type InternSchedule,
} from '@/hooks/use-schedule'
import { Calendar, Clock, CheckCircle, AlertCircle } from 'lucide-react'
import { format, addDays, startOfWeek, isSunday } from 'date-fns'
import { vi } from 'date-fns/locale'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  batchId: number
  internId: number
}

// Tạo danh sách các ngày trong tuần tới (T2-T7)
function getNextWeekDays(): Date[] {
  const today = new Date()
  // Nếu hôm nay là CN → tuần tới bắt đầu từ ngày mai (T2)
  // Nếu không → tuần tới
  const nextMonday = isSunday(today)
    ? addDays(today, 1)
    : addDays(startOfWeek(today, { weekStartsOn: 1 }), 7)
  return Array.from({ length: 6 }, (_, i) => addDays(nextMonday, i)) // T2-T7
}

export default function ScheduleRegisterDialog({ open, onOpenChange, batchId, internId }: Props) {
  const { toast } = useToast()
  const createSchedule = useCreateSchedule()
  const { data: existing = [] } = useSchedules({ intern_id: internId, batch_id: batchId })

  const nextWeekDays = getNextWeekDays()
  const weekLabel = `${format(nextWeekDays[0], 'dd/MM', { locale: vi })} - ${format(nextWeekDays[5], 'dd/MM/yyyy', { locale: vi })}`

  // State: map từ date string -> shift được chọn
  const [selections, setSelections] = useState<Record<string, ShiftType | null>>({})
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Check existing registrations
  const existingMap = new Map<string, InternSchedule>()
  existing.forEach(s => existingMap.set(s.work_date, s))

  const toggleShift = (dateStr: string, shift: ShiftType) => {
    setSelections(prev => ({
      ...prev,
      [dateStr]: prev[dateStr] === shift ? null : shift,
    }))
  }

  const selectedCount = Object.values(selections).filter(Boolean).length

  const handleSubmit = async () => {
    const toRegister = Object.entries(selections).filter(([, shift]) => shift)
    if (toRegister.length === 0) {
      toast({ title: 'Vui lòng chọn ít nhất 1 ngày và ca làm việc' })
      return
    }

    setSubmitting(true)
    let success = 0
    let failed = 0
    for (const [dateStr, shift] of toRegister) {
      if (!shift) continue
      try {
        await createSchedule.mutateAsync({ work_date: dateStr, shift, note, batch_id: batchId })
        success++
      } catch {
        failed++
      }
    }
    setSubmitting(false)

    if (success > 0) {
      toast({ title: `Đã đăng ký ${success} ngày làm việc${failed > 0 ? `, ${failed} ngày bị lỗi` : ''}` })
      onOpenChange(false)
    } else {
      toast({ title: 'Lỗi', description: 'Không thể đăng ký lịch' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[580px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            Đăng ký lịch thực tập tuần tới
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Tuần: <span className="font-medium text-blue-700">{weekLabel}</span>
          </p>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {/* Hướng dẫn */}
          <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-800 flex items-start gap-2">
            <Clock className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Chọn ca làm việc cho từng ngày</p>
              <p className="text-xs mt-0.5">Ca 1: 8:00-12:00 • Ca 2: 13:00-17:00 • Cả ngày: 8:00-17:00</p>
            </div>
          </div>

          {/* Danh sách ngày */}
          <div className="space-y-2">
            {nextWeekDays.map(day => {
              const dateStr = format(day, 'yyyy-MM-dd')
              const dayName = format(day, 'EEEE', { locale: vi })
              const dayLabel = format(day, 'dd/MM', { locale: vi })
              const existingReg = existingMap.get(dateStr)
              const selected = selections[dateStr]

              return (
                <div key={dateStr} className={`border rounded-lg p-3 ${existingReg ? 'bg-gray-50 opacity-70' : 'bg-white'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="font-medium text-sm capitalize">{dayName}</span>
                      <span className="text-xs text-muted-foreground ml-2">{dayLabel}</span>
                    </div>
                    {existingReg && (
                      <Badge className={STATUS_LABELS[existingReg.status].color + ' text-xs'}>
                        {STATUS_LABELS[existingReg.status].label} • {SHIFT_LABELS[existingReg.shift].label}
                      </Badge>
                    )}
                  </div>

                  {!existingReg && (
                    <div className="flex gap-2 flex-wrap">
                      {(['ca1', 'ca2', 'full'] as ShiftType[]).map(shift => (
                        <button
                          key={shift}
                          onClick={() => toggleShift(dateStr, shift)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                            selected === shift
                              ? 'bg-blue-800 text-white border-blue-800 shadow-sm'
                              : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-700'
                          }`}
                        >
                          <span>{SHIFT_LABELS[shift].label}</span>
                          <span className="block text-[10px] opacity-70">{SHIFT_LABELS[shift].time}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Ghi chú */}
          <div className="space-y-1.5">
            <Label>Ghi chú <span className="text-muted-foreground text-xs">(tuỳ chọn)</span></Label>
            <Textarea
              placeholder="Ghi chú cho mentor..."
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={2}
            />
          </div>

          {/* Summary */}
          {selectedCount > 0 && (
            <div className="bg-green-50 rounded-lg p-3 flex items-center gap-2 text-sm text-green-800">
              <CheckCircle className="h-4 w-4" />
              <span>Đã chọn <strong>{selectedCount}</strong> ngày làm việc</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Đóng
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={selectedCount === 0 || submitting}
            className="bg-blue-800 hover:bg-blue-900"
          >
            {submitting ? 'Đang gửi...' : `Đăng ký ${selectedCount > 0 ? `(${selectedCount} ngày)` : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}