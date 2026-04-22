import { useState } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { CalendarOff, Loader2, AlertTriangle } from 'lucide-react'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { useCreateLeaveRequest, LEAVE_STATUS_LABELS, type LeaveRequest } from '@/hooks/use-leave-request'
import { SHIFT_LABELS, type InternSchedule } from '@/hooks/use-schedule'
import { useToast } from '@/hooks/use-toast'

interface Props {
  open:         boolean
  onOpenChange: (v: boolean) => void
  schedule:     InternSchedule   // ngày đã đăng ký
  batchId:      number
  // đơn nghỉ nếu đã có cho ngày này
  existingLeave?: LeaveRequest
}

export default function LeaveRequestDialog({
  open, onOpenChange, schedule, batchId, existingLeave,
}: Props) {
  const { toast } = useToast()
  const createLeave = useCreateLeaveRequest()
  const [reason, setReason] = useState('')

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast({ title: 'Vui lòng nhập lý do nghỉ' })
      return
    }
    try {
      await createLeave.mutateAsync({
        leave_date:  schedule.work_date,
        reason:      reason.trim(),
        batch_id:    batchId,
        schedule_id: schedule.id,
      })
      toast({ title: 'Đã gửi đơn nghỉ', description: 'HR sẽ xét duyệt sớm nhất có thể' })
      setReason('')
      onOpenChange(false)
    } catch (err: any) {
      toast({
        title: 'Lỗi',
        description: err.response?.data?.detail || 'Không thể gửi đơn nghỉ',
        
      })
    }
  }

  const shift = SHIFT_LABELS[schedule.shift]
  const dateStr = format(new Date(schedule.work_date), 'EEEE, dd/MM/yyyy', { locale: vi })

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) setReason(''); onOpenChange(v) }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarOff className="h-5 w-5 text-red-500" />
            Xin nghỉ ngày làm việc
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Thông tin ngày */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Ngày</span>
              <span className="font-semibold capitalize">{dateStr}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Ca làm việc</span>
              <div className="flex items-center gap-2">
                <Badge className={`${shift.color} text-xs`}>{shift.label}</Badge>
                <span className="text-muted-foreground text-xs">{shift.time}</span>
              </div>
            </div>
          </div>

          {/* Nếu đã có đơn rồi */}
          {existingLeave ? (
            <div className="space-y-3">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-800">Đã gửi đơn nghỉ cho ngày này</p>
                  <p className="text-yellow-700 mt-1">Lý do: {existingLeave.reason}</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Trạng thái</span>
                <Badge className={LEAVE_STATUS_LABELS[existingLeave.status].color}>
                  {LEAVE_STATUS_LABELS[existingLeave.status].label}
                </Badge>
              </div>
              {existingLeave.hr_note && (
                <div className="bg-blue-50 rounded-lg p-3 text-sm">
                  <span className="font-medium text-blue-700">Ghi chú HR: </span>
                  <span className="text-blue-800">{existingLeave.hr_note}</span>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Form nhập lý do */}
              <div className="space-y-2">
                <Label htmlFor="reason" className="text-sm font-medium">
                  Lý do nghỉ <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="reason"
                  placeholder="Ví dụ: Bận việc gia đình, ốm đau, có cuộc hẹn y tế..."
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Đơn xin nghỉ sẽ được gửi đến HR để xét duyệt
                </p>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Đóng</Button>
          {!existingLeave && (
            <Button
              onClick={handleSubmit}
              disabled={createLeave.isPending || !reason.trim()}
              className="bg-red-600 hover:bg-red-700"
            >
              {createLeave.isPending
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Đang gửi...</>
                : <><CalendarOff className="h-4 w-4 mr-2" />Gửi đơn nghỉ</>
              }
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}