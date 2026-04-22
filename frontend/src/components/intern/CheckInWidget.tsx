import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import {
  useMyTodayAttendance, useCheckIn, useCheckOut,
  ATTENDANCE_STATUS_LABELS,
} from '@/hooks/use-attendance'
import { SHIFT_LABELS } from '@/hooks/use-schedule'
import {
  LogIn, LogOut, Clock, CheckCircle, XCircle,
  CalendarDays, Loader2, AlertCircle,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { vi } from 'date-fns/locale'

export default function CheckInWidget() {
  const { toast } = useToast()
  const { data, isLoading } = useMyTodayAttendance()
  const checkIn  = useCheckIn()
  const checkOut = useCheckOut()
  const [confirming, setConfirming] = useState<'in' | 'out' | null>(null)

  if (isLoading) return null
  if (!data?.has_schedule) return null

  const schedule   = data.schedule
  const attendance = data.attendance
  const shiftInfo  = schedule?.shift ? SHIFT_LABELS[schedule.shift as keyof typeof SHIFT_LABELS] : null

  // ✅ Dùng display_status từ backend (có thể là 'absent' dù chưa ghi DB)
  const status = (data.display_status ?? attendance?.status ?? 'not_checked_in') as string
  const isAutoAbsent = data.is_auto_absent ?? false  // vắng hiển thị nhưng chưa ghi DB

  const handleCheckIn = async () => {
    try {
      await checkIn.mutateAsync()
      toast({
        title: '✅ Check-in thành công!',
        description: `Chúc bạn một ngày làm việc hiệu quả — ${format(new Date(), 'HH:mm', { locale: vi })}`,
      })
      setConfirming(null)
    } catch (err: any) {
      toast({ title: 'Lỗi', description: err.response?.data?.detail || 'Không thể check-in' })
    }
  }

  const handleCheckOut = async () => {
    try {
      await checkOut.mutateAsync()
      toast({
        title: '👋 Check-out thành công!',
        description: `Hẹn gặp lại ngày mai — ${format(new Date(), 'HH:mm', { locale: vi })}`,
      })
      setConfirming(null)
    } catch (err: any) {
      toast({ title: 'Lỗi', description: err.response?.data?.detail || 'Không thể check-out' })
    }
  }

  const styleMap: Record<string, {
    border: string; bg: string; icon: React.ReactNode; dot: string
  }> = {
    not_checked_in: {
      border: 'border-yellow-300',
      bg: 'bg-gradient-to-r from-yellow-50 to-orange-50',
      icon: <AlertCircle className="h-5 w-5 text-yellow-500" />,
      dot: 'bg-yellow-400 animate-pulse',
    },
    present: {
      border: 'border-blue-300',
      bg: 'bg-gradient-to-r from-blue-50 to-indigo-50',
      icon: <Clock className="h-5 w-5 text-blue-500" />,
      dot: 'bg-blue-500 animate-pulse',
    },
    checked_out: {
      border: 'border-green-300',
      bg: 'bg-gradient-to-r from-green-50 to-emerald-50',
      icon: <CheckCircle className="h-5 w-5 text-green-500" />,
      dot: 'bg-green-500',
    },
    absent: {
      border: 'border-red-300',
      bg: 'bg-gradient-to-r from-red-50 to-rose-50',
      icon: <XCircle className="h-5 w-5 text-red-500" />,
      dot: 'bg-red-500',
    },
    leave: {
      border: 'border-gray-300',
      bg: 'bg-gradient-to-r from-gray-50 to-slate-50',
      icon: <CalendarDays className="h-5 w-5 text-gray-500" />,
      dot: 'bg-gray-400',
    },
  }
  const s = styleMap[status] ?? styleMap.not_checked_in

  // ✅ Label hiển thị — phân biệt vắng tự động vs vắng đã ghi DB
  const statusLabel = status === 'absent'
    ? isAutoAbsent
      ? 'Vắng mặt (chưa check-in)'
      : 'Vắng mặt'
    : (ATTENDANCE_STATUS_LABELS[status as keyof typeof ATTENDANCE_STATUS_LABELS]?.label ?? 'Không xác định')

  return (
    <div className={`rounded-2xl border-2 ${s.border} ${s.bg} px-5 py-4 shadow-sm`}>
      <div className="flex items-center justify-between gap-4 flex-wrap">

        {/* Left: info */}
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full shrink-0 ${s.dot}`} />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              {s.icon}
              <span className="font-bold text-gray-800 text-sm">{statusLabel}</span>
              {shiftInfo && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${shiftInfo.color}`}>
                  {shiftInfo.label} · {shiftInfo.time}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
              <span>{format(new Date(), 'EEEE, dd/MM/yyyy', { locale: vi })}</span>
              {attendance?.check_in_time && (
                <span>Check-in: <strong>{format(parseISO(attendance.check_in_time), 'HH:mm')}</strong></span>
              )}
              {attendance?.check_out_time && (
                <span>Check-out: <strong>{format(parseISO(attendance.check_out_time), 'HH:mm')}</strong></span>
              )}
              {/* ✅ Ghi chú khi vắng tự động */}
              {isAutoAbsent && (
                <span className="text-red-400 italic">Ca đã kết thúc mà không có mặt</span>
              )}
            </div>
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2">

          {/* Chưa check-in + ca chưa kết thúc */}
          {status === 'not_checked_in' && (
            confirming === 'in' ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600">Xác nhận check-in?</span>
                <Button size="sm" className="h-8 bg-blue-600 hover:bg-blue-700 text-xs"
                  disabled={checkIn.isPending} onClick={handleCheckIn}>
                  {checkIn.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Xác nhận'}
                </Button>
                <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setConfirming(null)}>
                  Huỷ
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                className="h-9 px-4 bg-[#0f2d6b] hover:bg-[#0f2d6b]/90 text-white font-semibold gap-1.5"
                onClick={() => setConfirming('in')}
              >
                <LogIn className="h-4 w-4" />Check-in
              </Button>
            )
          )}

          {/* Đã check-in, chưa check-out */}
          {status === 'present' && (
            confirming === 'out' ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600">Xác nhận check-out?</span>
                <Button size="sm" className="h-8 bg-green-600 hover:bg-green-700 text-xs"
                  disabled={checkOut.isPending} onClick={handleCheckOut}>
                  {checkOut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Xác nhận'}
                </Button>
                <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setConfirming(null)}>
                  Huỷ
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                className="h-9 px-4 bg-green-600 hover:bg-green-700 text-white font-semibold gap-1.5"
                onClick={() => setConfirming('out')}
              >
                <LogOut className="h-4 w-4" />Check-out
              </Button>
            )
          )}

          {/* Đã check-out */}
          {status === 'checked_out' && (
            <span className="text-xs text-green-700 font-semibold flex items-center gap-1">
              <CheckCircle className="h-4 w-4" />Hoàn thành hôm nay
            </span>
          )}

          {/* ✅ Vắng — phân biệt vắng tự động vs vắng do HR đánh */}
          {status === 'absent' && (
            <span className="text-xs text-red-600 font-semibold flex items-center gap-1">
              <XCircle className="h-4 w-4" />
              {isAutoAbsent ? 'Không check-in đúng giờ' : 'Đã bị đánh dấu vắng'}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}