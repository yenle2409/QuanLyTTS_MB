import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import {
  useTodayAttendance, useMarkAbsent, useAutoMarkAbsent,
  ATTENDANCE_STATUS_LABELS, type AttendanceRecord,
} from '@/hooks/use-attendance'
import { SHIFT_LABELS } from '@/hooks/use-schedule'
import { useBatches } from '@/hooks/use-batches'
import {
  Users, CheckCircle, XCircle, Clock, AlertCircle,
  Loader2, RefreshCw, CalendarDays, UserX,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { vi } from 'date-fns/locale'

export default function HRAttendanceSection() {
  const { toast } = useToast()
  const { data: batches = [] } = useBatches()
  const [selectedBatchId, setSelectedBatchId] = useState<number | undefined>(undefined)
  const [markAbsentDialog, setMarkAbsentDialog] = useState<AttendanceRecord | null>(null)
  const [absentNote, setAbsentNote] = useState('')

  const { data: todayList = [], isLoading, refetch, isFetching } = useTodayAttendance(selectedBatchId)
  const markAbsent   = useMarkAbsent()
  const autoMark     = useAutoMarkAbsent()

  const today = format(new Date(), 'EEEE, dd/MM/yyyy', { locale: vi })

  const stats = useMemo(() => ({
    total:          todayList.length,
    present:        todayList.filter(a => a.status === 'present').length,
    checked_out:    todayList.filter(a => a.status === 'checked_out').length,
    absent:         todayList.filter(a => a.status === 'absent').length,
    not_checked_in: todayList.filter(a => a.status === 'not_checked_in').length,
  }), [todayList])

  const handleMarkAbsent = async () => {
    if (!markAbsentDialog) return
    try {
      await markAbsent.mutateAsync({
        internId: markAbsentDialog.intern_id,
        note: absentNote,
      })
      toast({ title: '✅ Đã đánh dấu vắng', description: markAbsentDialog.intern_name ?? '' })
      setMarkAbsentDialog(null)
      setAbsentNote('')
    } catch (err: any) {
      toast({ title: 'Lỗi', description: err.response?.data?.detail || 'Có lỗi xảy ra' })
    }
  }

  const handleAutoMarkAbsent = async () => {
    try {
      const res = await autoMark.mutateAsync()
      toast({ title: '✅ Hoàn tất', description: (res as any).message })
    } catch {
      toast({ title: 'Lỗi', description: 'Không thể tự động đánh dấu vắng' })
    }
  }

  const openBatches = batches.filter((b: any) => b.status === 'open')

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-[#0f2d6b]" />
            Điểm danh hôm nay
          </h2>
          <p className="text-xs text-gray-400 mt-0.5 capitalize">{today}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Chọn đợt */}
          <Select
            value={selectedBatchId ? String(selectedBatchId) : 'all'}
            onValueChange={v => setSelectedBatchId(v === 'all' ? undefined : Number(v))}
          >
            <SelectTrigger className="h-8 text-xs w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả đợt mở</SelectItem>
              {openBatches.map((b: any) => (
                <SelectItem key={b.id} value={String(b.id)}>{b.batch_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Refresh */}
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1"
            onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            Làm mới
          </Button>

          {/* Auto mark absent */}
          <Button size="sm" variant="outline"
            className="h-8 text-xs gap-1 text-red-600 border-red-200 hover:bg-red-50"
            onClick={handleAutoMarkAbsent}
            disabled={autoMark.isPending}
          >
            {autoMark.isPending
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <UserX className="h-3.5 w-3.5" />
            }
            Đánh dấu vắng cuối ngày
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Có lịch hôm nay', value: stats.total,          icon: <Users className="h-4 w-4 text-gray-400" />,  bg: 'bg-white'      },
          { label: 'Đã check-in/out', value: stats.present + stats.checked_out, icon: <CheckCircle className="h-4 w-4 text-blue-400" />, bg: 'bg-blue-50'   },
          { label: 'Chưa check-in',   value: stats.not_checked_in,  icon: <Clock className="h-4 w-4 text-yellow-400" />,bg: 'bg-yellow-50'  },
          { label: 'Vắng mặt',        value: stats.absent,          icon: <XCircle className="h-4 w-4 text-red-400" />, bg: 'bg-red-50'     },
        ].map(s => (
          <div key={s.label} className={`${s.bg} border border-gray-100 rounded-xl p-3 flex items-center gap-3 shadow-sm`}>
            {s.icon}
            <div>
              <p className="text-xl font-black text-gray-800">{s.value}</p>
              <p className="text-[11px] text-gray-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Danh sách */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-7 w-7 animate-spin text-gray-300" />
        </div>
      ) : todayList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-300">
          <CalendarDays className="h-14 w-14 mb-3" />
          <p className="text-gray-400 font-medium">Hôm nay không có TTS nào có lịch đã duyệt</p>
        </div>
      ) : (
        <div className="space-y-2">
          {todayList.map((record, idx) => {
            const sl = ATTENDANCE_STATUS_LABELS[record.status]
            const shiftInfo = record.shift
              ? SHIFT_LABELS[record.shift as keyof typeof SHIFT_LABELS]
              : null

            return (
              <div
                key={`${record.intern_id}-${idx}`}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${
                  record.status === 'checked_out'
                    ? 'bg-green-50/40 border-green-100'
                    : record.status === 'present'
                      ? 'bg-blue-50/40 border-blue-100'
                      : record.status === 'absent'
                        ? 'bg-red-50/30 border-red-100'
                        : 'bg-yellow-50/30 border-yellow-100'
                }`}
              >
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-[#0f2d6b] flex items-center justify-center text-white text-sm font-bold shrink-0">
                  {(record.intern_name || '?').charAt(0)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-800">{record.intern_name}</span>
                    <Badge className={`${sl.bg} ${sl.color} text-xs`}>{sl.label}</Badge>
                    {shiftInfo && (
                      <Badge className={`${shiftInfo.color} text-xs`}>{shiftInfo.label}</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                    {record.check_in_time && (
                      <span>Check-in: <strong className="text-gray-600">
                        {format(parseISO(record.check_in_time), 'HH:mm')}
                      </strong></span>
                    )}
                    {record.check_out_time && (
                      <span>Check-out: <strong className="text-gray-600">
                        {format(parseISO(record.check_out_time), 'HH:mm')}
                      </strong></span>
                    )}
                    {!record.check_in_time && record.status === 'not_checked_in' && (
                      <span className="text-yellow-500">Chưa vào ca</span>
                    )}
                    {record.note && (
                      <span className="italic text-gray-400">"{record.note}"</span>
                    )}
                  </div>
                </div>

                {/* Action: chỉ hiện nút đánh dấu vắng nếu chưa check-in */}
                {record.status === 'not_checked_in' && (
                  <Button
                    size="sm" variant="outline"
                    className="shrink-0 h-7 text-xs text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => { setMarkAbsentDialog(record); setAbsentNote('') }}
                  >
                    <UserX className="h-3.5 w-3.5 mr-1" />Đánh dấu vắng
                  </Button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Mark Absent Dialog */}
      <Dialog open={!!markAbsentDialog} onOpenChange={o => !o && setMarkAbsentDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />Đánh dấu vắng mặt
            </DialogTitle>
          </DialogHeader>
          {markAbsentDialog && (
            <div className="space-y-3">
              <div className="bg-gray-50 rounded-xl p-3 text-sm space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Thực tập sinh</span>
                  <span className="font-semibold">{markAbsentDialog.intern_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ngày</span>
                  <span className="font-medium capitalize">{today}</span>
                </div>
                {markAbsentDialog.shift && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ca</span>
                    <span>{SHIFT_LABELS[markAbsentDialog.shift as keyof typeof SHIFT_LABELS]?.label}</span>
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  Ghi chú <span className="text-gray-400 font-normal text-xs">(tuỳ chọn)</span>
                </label>
                <Textarea
                  placeholder="VD: Không liên lạc được, vắng không lý do..."
                  value={absentNote}
                  onChange={e => setAbsentNote(e.target.value)}
                  rows={2}
                  className="resize-none"
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setMarkAbsentDialog(null)}>Huỷ</Button>
            <Button
              className="bg-red-600 hover:bg-red-700"
              disabled={markAbsent.isPending}
              onClick={handleMarkAbsent}
            >
              {markAbsent.isPending
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <><XCircle className="h-4 w-4 mr-1.5" />Xác nhận vắng</>
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}