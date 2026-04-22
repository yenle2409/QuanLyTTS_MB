import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  useSchedules, SHIFT_LABELS, STATUS_LABELS, type InternSchedule,
} from '@/hooks/use-schedule'
import {
  useAttendanceHistory, useTodayAttendance, ATTENDANCE_STATUS_LABELS,
} from '@/hooks/use-attendance'
import { useInternProfiles } from '@/hooks/use-profiles'
import { useBatches } from '@/hooks/use-batches'
import {
  Calendar, Users, Clock, CheckCircle, XCircle,
  CalendarDays, Loader2, UserX, RefreshCw,
} from 'lucide-react'
import {
  format, startOfWeek, addDays, addWeeks, isWithinInterval, parseISO,
} from 'date-fns'
import { vi } from 'date-fns/locale'

interface Props {
  batchId?: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getWeekOptions() {
  const today = new Date()
  const weeks = []
  for (let i = -2; i <= 3; i++) {
    const monday = startOfWeek(addWeeks(today, i), { weekStartsOn: 1 })
    const sunday = addDays(monday, 6)
    const isCurrentWeek = isWithinInterval(today, { start: monday, end: sunday })
    weeks.push({
      value: format(monday, 'yyyy-MM-dd'),
      label: `${format(monday, 'dd/MM', { locale: vi })} - ${format(sunday, 'dd/MM/yyyy', { locale: vi })}`,
      isCurrentWeek,
    })
  }
  return weeks
}

// ✅ Giờ kết thúc ca — phải khớp với backend SHIFT_END_TIMES
const SHIFT_END_HOURS: Record<string, number> = {
  ca1:  12,
  ca2:  17,
  full: 17,
}

/**
 * ✅ Tính trạng thái hiển thị cho 1 ô lịch:
 * - Có attendance record trong DB → dùng status thật
 * - Lịch đã duyệt + ngày đã qua → 'absent'
 * - Lịch đã duyệt + hôm nay + ca đã quá giờ kết thúc → 'absent'
 * - Còn lại → undefined (không hiện badge điểm danh)
 */
function resolveDisplayStatus(
  schedule: InternSchedule,
  attendanceStatus: string | undefined,
): string | undefined {
  // Có record thật → dùng luôn
  if (attendanceStatus) return attendanceStatus

  // Lịch chưa duyệt → không tính
  if (schedule.status !== 'approved') return undefined

  const todayStr    = format(new Date(), 'yyyy-MM-dd')
  const workDateStr = schedule.work_date

  // Ngày tương lai → chưa xác định
  if (workDateStr > todayStr) return undefined

  // Ngày đã qua hoàn toàn → vắng
  if (workDateStr < todayStr) return 'absent'

  // Hôm nay → check giờ kết thúc ca
  const endHour = SHIFT_END_HOURS[schedule.shift]
  if (endHour === undefined) return undefined

  const now          = new Date()
  const shiftEndTime = new Date()
  shiftEndTime.setHours(endHour, 0, 0, 0)

  return now >= shiftEndTime ? 'absent' : undefined
}

// ─── Section: Hôm nay ─────────────────────────────────────────────────────────

function TodaySection({ batchId }: { batchId?: number }) {
  const { data: todayList = [], isLoading, refetch, isFetching } = useTodayAttendance(batchId)
  const today = format(new Date(), 'EEEE, dd/MM/yyyy', { locale: vi })

  const stats = useMemo(() => ({
    total:          todayList.length,
    present:        todayList.filter(a => a.status === 'present').length,
    checked_out:    todayList.filter(a => a.status === 'checked_out').length,
    absent:         todayList.filter(a => a.status === 'absent').length,
    not_checked_in: todayList.filter(a => a.status === 'not_checked_in').length,
  }), [todayList])

  return (
    <Card className="overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-[#0f2d6b] to-[#2563eb]" />
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between flex-wrap gap-2 text-sm">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-[#0f2d6b]" />
            <span className="font-bold text-gray-900">Điểm danh hôm nay</span>
            <span className="text-xs text-gray-400 font-normal capitalize">{today}</span>
          </div>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
            onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-3 w-3 ${isFetching ? 'animate-spin' : ''}`} />
            Làm mới
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Có lịch',       value: stats.total,                       bg: 'bg-gray-50',   color: 'text-gray-700'   },
            { label: 'Đã check-in',   value: stats.present + stats.checked_out, bg: 'bg-blue-50',   color: 'text-blue-700'   },
            { label: 'Chưa check-in', value: stats.not_checked_in,              bg: 'bg-yellow-50', color: 'text-yellow-700' },
            { label: 'Vắng mặt',      value: stats.absent,                      bg: 'bg-red-50',    color: 'text-red-700'    },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-xl p-2.5 text-center border border-gray-100`}>
              <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-gray-300" />
          </div>
        ) : todayList.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-gray-300">
            <CalendarDays className="h-10 w-10 mb-2" />
            <p className="text-gray-400 text-sm">Hôm nay không có TTS nào có lịch đã duyệt</p>
          </div>
        ) : (
          <div className="space-y-2">
            {todayList.map((record, idx) => {
              const sl = ATTENDANCE_STATUS_LABELS[record.status as keyof typeof ATTENDANCE_STATUS_LABELS]
              const shiftInfo = record.shift ? SHIFT_LABELS[record.shift as keyof typeof SHIFT_LABELS] : null
              return (
                <div key={`${record.intern_id}-${idx}`}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors ${
                    record.status === 'checked_out' ? 'bg-green-50/40 border-green-100'
                    : record.status === 'present'   ? 'bg-blue-50/40 border-blue-100'
                    : record.status === 'absent'    ? 'bg-red-50/40 border-red-100'
                    :                                 'bg-yellow-50/30 border-yellow-100'
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-[#0f2d6b] flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {(record.intern_name || '?').charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-gray-800">{record.intern_name}</span>
                      {sl && <Badge className={`${sl.bg} ${sl.color} text-[10px]`}>{sl.label}</Badge>}
                      {shiftInfo && <Badge className={`${shiftInfo.color} text-[10px]`}>{shiftInfo.label}</Badge>}
                      {record.status === 'absent' && (record as any).is_auto_absent && (
                        <span className="text-[10px] text-red-400 italic">quá giờ ca</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                      {record.check_in_time && (
                        <span>Check-in: <strong className="text-gray-600">{format(parseISO(record.check_in_time), 'HH:mm')}</strong></span>
                      )}
                      {record.check_out_time && (
                        <span>Check-out: <strong className="text-gray-600">{format(parseISO(record.check_out_time), 'HH:mm')}</strong></span>
                      )}
                      {!record.check_in_time && record.status === 'not_checked_in' && (
                        <span className="text-yellow-500">Chưa vào ca</span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function MentorScheduleTab({ batchId }: Props) {
  const { data: allInterns = [] } = useInternProfiles()
  const { data: batches = [] }    = useBatches()

  const interns = useMemo(() => {
    const openBatchIds = new Set(batches.filter((b: any) => b.status === 'open').map((b: any) => b.id))
    return allInterns.filter(i => i.intern_status === 'active' && openBatchIds.has(i.batch_id))
  }, [allInterns, batches])

  const weekOptions       = getWeekOptions()
  const currentWeekOption = weekOptions.find(w => w.isCurrentWeek) ?? weekOptions[2]

  const [selectedWeek, setSelectedWeek]         = useState(currentWeekOption.value)
  const [selectedInternId, setSelectedInternId] = useState<string>('all')

  const { data: schedules = [], isLoading } = useSchedules({
    batch_id:   batchId,
    week_start: selectedWeek,
    intern_id:  selectedInternId !== 'all' ? Number(selectedInternId) : undefined,
  })

  const weekEnd = format(addDays(parseISO(selectedWeek), 6), 'yyyy-MM-dd')
  const { data: attendances = [] } = useAttendanceHistory({
    batch_id:  batchId,
    date_from: selectedWeek,
    date_to:   weekEnd,
  })

  // Map: "intern_id_date" → status từ DB
  const attendanceMap = useMemo(() => {
    const map: Record<string, string> = {}
    attendances.forEach((a: any) => { map[`${a.intern_id}_${a.date}`] = a.status })
    return map
  }, [attendances])

  const pending  = schedules.filter(s => s.status === 'pending').length
  const approved = schedules.filter(s => s.status === 'approved').length
  const rejected = schedules.filter(s => s.status === 'rejected').length

  // ✅ Đếm vắng có tính cả vắng tự động (chưa ghi DB)
  const absentCount = useMemo(() =>
    schedules.filter(s =>
      resolveDisplayStatus(s, attendanceMap[`${s.intern_id}_${s.work_date}`]) === 'absent'
    ).length,
  [schedules, attendanceMap])

  const openBatchIds    = useMemo(() => new Set(batches.filter((b: any) => b.status === 'open').map((b: any) => b.id)), [batches])
  const activeInternIds = useMemo(() => new Set(allInterns.filter(i => i.intern_status === 'active').map(i => i.user_id)), [allInterns])

  const filteredSchedules = useMemo(() =>
    schedules.filter(s => activeInternIds.has(s.intern_id) && openBatchIds.has(s.batch_id)),
  [schedules, activeInternIds, openBatchIds])

  const byIntern = useMemo(() =>
    filteredSchedules.reduce((acc, s) => {
      if (!acc[s.intern_id]) acc[s.intern_id] = { name: s.intern_name || `TTS #${s.intern_id}`, schedules: [] }
      acc[s.intern_id].schedules.push(s)
      return acc
    }, {} as Record<number, { name: string; schedules: InternSchedule[] }>),
  [filteredSchedules])

  const selectedWeekLabel = weekOptions.find(w => w.value === selectedWeek)?.label ?? ''

  return (
    <div className="space-y-5">

      <TodaySection batchId={batchId} />
      <hr className="border-gray-100" />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Chờ duyệt', value: pending,     color: 'text-yellow-700', bg: 'bg-yellow-50', icon: <Clock       className="h-4 w-4 text-yellow-400" /> },
          { label: 'Đã duyệt',  value: approved,    color: 'text-green-700',  bg: 'bg-green-50',  icon: <CheckCircle className="h-4 w-4 text-green-400" /> },
          { label: 'Từ chối',   value: rejected,    color: 'text-red-700',    bg: 'bg-red-50',    icon: <XCircle     className="h-4 w-4 text-red-400" />    },
          { label: 'Vắng mặt', value: absentCount, color: 'text-red-700',    bg: 'bg-red-50',    icon: <UserX       className="h-4 w-4 text-red-400" />    },
        ].map(s => (
          <div key={s.label} className={`${s.bg} border border-gray-100 rounded-xl p-4 flex items-center gap-3 shadow-sm`}>
            {s.icon}
            <div>
              <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <Card className="overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-[#0f2d6b] to-[#2563eb]" />
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[#0f2d6b]" />
              <span className="text-sm font-semibold text-gray-700">Tuần:</span>
              <Select value={selectedWeek} onValueChange={setSelectedWeek}>
                <SelectTrigger className="h-8 text-xs w-[220px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {weekOptions.map(w => (
                    <SelectItem key={w.value} value={w.value}>
                      {w.isCurrentWeek ? `📍 ${w.label} (tuần này)` : w.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-[#0f2d6b]" />
              <span className="text-sm font-semibold text-gray-700">TTS:</span>
              <Select value={selectedInternId} onValueChange={setSelectedInternId}>
                <SelectTrigger className="h-8 text-xs w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  {interns.map(i => (
                    <SelectItem key={i.user_id} value={String(i.user_id)}>{i.user_full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lịch theo tuần */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-gray-300" />
        </div>
      ) : Object.keys(byIntern).length === 0 ? (
        <Card className="overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-[#0f2d6b] to-[#2563eb]" />
          <CardContent className="py-16 text-center">
            <CalendarDays className="h-14 w-14 mx-auto mb-3 text-gray-200" />
            <p className="text-gray-400 font-medium">Chưa có lịch đăng ký nào trong tuần này</p>
            <p className="text-xs text-gray-300 mt-1">{selectedWeekLabel}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(byIntern).map(([internIdStr, { name, schedules: internSchedules }]) => {
            const internId = Number(internIdStr)

            const internAbsent = internSchedules.filter(s => {
              const att = attendanceMap[`${internId}_${s.work_date}`]
              return resolveDisplayStatus(s, att) === 'absent'
            }).length

            return (
              <Card key={internId} className="overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-[#0f2d6b] to-[#2563eb]" />
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <div className="w-8 h-8 rounded-full bg-[#0f2d6b] flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {name.charAt(0)}
                    </div>
                    <span className="font-semibold text-gray-800">{name}</span>
                    <Badge className="bg-blue-100 text-blue-700 text-xs">{internSchedules.length} ngày</Badge>
                    {internAbsent > 0 && (
                      <Badge className="bg-red-100 text-red-700 text-xs">
                        <UserX className="h-3 w-3 mr-1" />{internAbsent} vắng
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                    {internSchedules
                      .sort((a, b) => a.work_date.localeCompare(b.work_date))
                      .map(s => {
                        const attFromDB     = attendanceMap[`${internId}_${s.work_date}`]
                        const displayStatus = resolveDisplayStatus(s, attFromDB)
                        const isAutoAbsent  = displayStatus === 'absent' && !attFromDB
                        const isAbsent      = displayStatus === 'absent'
                        const isPresent     = displayStatus === 'present'
                        const isCheckedOut  = displayStatus === 'checked_out'

                        // ✅ Màu card: vắng → đỏ, rejected → đỏ nhạt, pending → vàng, approved → xanh
                        const cardStyle = isAbsent
                          ? 'bg-red-50 border-red-200'
                          : s.status === 'rejected' ? 'bg-red-50 border-red-100'
                          : s.status === 'pending'  ? 'bg-yellow-50 border-yellow-100'
                          :                           'bg-green-50 border-green-100'

                        const attLabel = ATTENDANCE_STATUS_LABELS[displayStatus as keyof typeof ATTENDANCE_STATUS_LABELS]

                        return (
                          <div key={s.id} className={`rounded-xl p-3 border ${cardStyle} space-y-1.5`}>
                            <div>
                              <p className="text-xs font-bold text-gray-800 capitalize">
                                {format(new Date(s.work_date), 'EEE', { locale: vi })}
                              </p>
                              <p className="text-xs text-gray-400">
                                {format(new Date(s.work_date), 'dd/MM', { locale: vi })}
                              </p>
                            </div>

                            <Badge className={`${SHIFT_LABELS[s.shift].color} text-[10px] w-full justify-center`}>
                              {SHIFT_LABELS[s.shift].label}
                            </Badge>

                            {/* ✅ Badge trạng thái lịch — ẩn khi vắng để không rối */}
                            {!isAbsent && (
                              <Badge className={`${STATUS_LABELS[s.status].color} text-[10px] w-full justify-center`}>
                                {STATUS_LABELS[s.status].label}
                              </Badge>
                            )}

                            {/* ✅ Badge điểm danh — chỉ hiện khi lịch đã duyệt và có displayStatus */}
                            {s.status === 'approved' && displayStatus && (
                              <Badge className={`
                                ${isAbsent     ? 'bg-red-100 text-red-700'
                                  : isCheckedOut ? 'bg-green-100 text-green-700'
                                  : isPresent    ? 'bg-blue-100 text-blue-700'
                                  : attLabel     ? `${attLabel.bg} ${attLabel.color}`
                                  : 'bg-gray-100 text-gray-600'}
                                text-[10px] w-full justify-center
                              `}>
                                {isAbsent     && <UserX       className="h-2.5 w-2.5 mr-1" />}
                                {isCheckedOut && <CheckCircle className="h-2.5 w-2.5 mr-1" />}
                                {isPresent    && <Clock       className="h-2.5 w-2.5 mr-1" />}
                                {isAbsent
                                  ? isAutoAbsent ? 'Vắng (quá giờ)' : 'Vắng mặt'
                                  : attLabel?.label ?? displayStatus
                                }
                              </Badge>
                            )}

                            {s.note && (
                              <p className="text-[10px] text-gray-500 italic border-t border-gray-100 pt-1.5 line-clamp-2">
                                📝 {s.note}
                              </p>
                            )}
                            {s.mentor_note && (
                              <p className="text-[10px] text-blue-600 italic line-clamp-2">
                                💬 {s.mentor_note}
                              </p>
                            )}
                          </div>
                        )
                      })}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}