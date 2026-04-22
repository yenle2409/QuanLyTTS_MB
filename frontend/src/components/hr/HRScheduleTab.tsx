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
  useSchedules, useReviewSchedule, useBulkApproveSchedule,
  SHIFT_LABELS, STATUS_LABELS,
  type InternSchedule, type ScheduleStatus,
} from '@/hooks/use-schedule'
import { useBatches } from '@/hooks/use-batches'
import {
  CalendarDays, CheckCircle, XCircle, Loader2,
  AlertCircle, Clock, Users, CalendarCheck,
} from 'lucide-react'
import {
  format, parseISO, startOfWeek, addDays, differenceInWeeks, isWithinInterval,
} from 'date-fns'
import { vi } from 'date-fns/locale'
import HRAttendanceSection from '@/components/hr/HRAttendanceSection'
// ─── Helpers ──────────────────────────────────────────────────────────────────

function getWeeksInBatch(startDate: string, endDate: string) {
  const start = parseISO(startDate)
  const end = parseISO(endDate)
  const batchMonday = startOfWeek(start, { weekStartsOn: 1 })
  const totalWeeks = differenceInWeeks(end, batchMonday) + 1
  return Array.from({ length: totalWeeks }, (_, i) => {
    const monday = addDays(batchMonday, i * 7)
    const sunday = addDays(monday, 6)
    return {
      index: i + 1,
      monday: format(monday, 'yyyy-MM-dd'),
      label: `Tuần ${i + 1}`,
      range: `${format(monday, 'dd/MM', { locale: vi })} - ${format(sunday, 'dd/MM', { locale: vi })}`,
      mondayDate: monday,
      sundayDate: sunday,
    }
  })
}

// ─── WeekCard ─────────────────────────────────────────────────────────────────

function WeekCard({
  week, schedules, isSelected, onClick,
}: {
  week: ReturnType<typeof getWeeksInBatch>[0]
  schedules: InternSchedule[]
  isSelected: boolean
  onClick: () => void
}) {
  const today = new Date()
  const isCurrentWeek = isWithinInterval(today, { start: week.mondayDate, end: week.sundayDate })
  const isPast = week.sundayDate < today
  const pendingCount = schedules.filter(s => s.status === 'pending').length
  const approvedCount = schedules.filter(s => s.status === 'approved').length
  const total = schedules.length

  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-xl border-2 p-4 transition-all duration-150 ${
        isSelected
          ? 'border-[#0f2d6b] bg-blue-50 shadow-md'
          : isCurrentWeek
            ? 'border-blue-300 bg-blue-50/40 hover:border-blue-400 hover:shadow-sm'
            : isPast
              ? 'border-gray-100 bg-gray-50/50 hover:border-gray-200'
              : 'border-gray-100 bg-white hover:border-blue-200 hover:shadow-sm'
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="flex items-center gap-2">
            <span className={`font-bold text-sm ${isSelected ? 'text-[#0f2d6b]' : 'text-gray-800'}`}>
              {week.label}
            </span>
            {isCurrentWeek && (
              <span className="text-[10px] font-bold bg-blue-600 text-white px-1.5 py-0.5 rounded-full">
                Tuần này
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{week.range}</p>
        </div>
        {total === 0 ? (
          <span className="text-xs text-gray-300 font-medium">Chưa có</span>
        ) : (
          <span className={`text-lg font-black ${isSelected ? 'text-[#0f2d6b]' : 'text-gray-700'}`}>
            {total}
          </span>
        )}
      </div>
      {total > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {pendingCount > 0 && (
            <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full font-medium">
              {pendingCount} chờ duyệt
            </span>
          )}
          {approvedCount > 0 && (
            <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">
              {approvedCount} đã duyệt
            </span>
          )}
        </div>
      )}
    </button>
  )
}

// ─── WeekDetail ───────────────────────────────────────────────────────────────

function WeekDetail({
  week,
  schedules,
  batches,
  onReview,
  onBulkApprove,
  isBulkLoading,
}: {
  week: ReturnType<typeof getWeeksInBatch>[0]
  schedules: InternSchedule[]
  batches: any[]
  onReview: (s: InternSchedule) => void
  onBulkApprove: (ids: number[]) => void
  isBulkLoading: boolean
}) {
  const [statusFilter, setStatusFilter] = useState('all')

  const filtered = statusFilter === 'all'
    ? schedules
    : schedules.filter(s => s.status === statusFilter)

  const pendingSchedules = schedules.filter(s => s.status === 'pending')
  const pendingCount = pendingSchedules.length

  // Group by intern for display
  const byIntern = useMemo(() => {
    const map: Record<number, InternSchedule[]> = {}
    filtered.forEach(s => {
      if (!map[s.intern_id]) map[s.intern_id] = []
      map[s.intern_id].push(s)
    })
    return map
  }, [filtered])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="font-bold text-gray-900">{week.label} — {week.range}</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {schedules.length} lịch đăng ký
            {pendingCount > 0 && ` · ${pendingCount} chờ duyệt`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <Button
              size="sm"
              className="h-8 text-xs bg-green-600 hover:bg-green-700"
              disabled={isBulkLoading}
              onClick={() => onBulkApprove(pendingSchedules.map(s => s.id))}
            >
              {isBulkLoading
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <><CheckCircle className="h-3.5 w-3.5 mr-1" />Duyệt tất cả ({pendingCount})</>
              }
            </Button>
          )}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 text-xs w-[145px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả trạng thái</SelectItem>
              <SelectItem value="pending">Chờ duyệt</SelectItem>
              <SelectItem value="approved">Đã duyệt</SelectItem>
              <SelectItem value="rejected">Từ chối</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-300">
          <CalendarDays className="h-16 w-16 mb-3" />
          <p className="text-gray-400 font-medium">Không có lịch đăng ký nào</p>
          <p className="text-sm mt-1">
            {statusFilter !== 'all' ? 'Thay đổi bộ lọc để xem thêm' : 'Tuần này chưa có thực tập sinh nào đăng ký'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {Object.entries(byIntern).map(([internIdStr, internSchedules]) => {
            const internId = Number(internIdStr)
            const internName = internSchedules[0]?.intern_name || `TTS #${internId}`
            const internPending = internSchedules.filter(s => s.status === 'pending')

            return (
              <div key={internId} className="border border-gray-100 rounded-xl overflow-hidden">
                {/* Intern header */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-[#0f2d6b] flex items-center justify-center text-white text-xs font-bold">
                      {internName.charAt(0)}
                    </div>
                    <span className="font-semibold text-sm text-gray-800">{internName}</span>
                    <span className="text-xs text-gray-400">{internSchedules.length} ngày</span>
                  </div>
                  {internPending.length > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-[10px] text-green-700 border-green-300 hover:bg-green-50"
                      disabled={isBulkLoading}
                      onClick={() => onBulkApprove(internPending.map(s => s.id))}
                    >
                      Duyệt tất cả
                    </Button>
                  )}
                </div>

                {/* Schedule rows */}
                <div className="divide-y divide-gray-50">
                  {internSchedules
                    .sort((a, b) => a.work_date.localeCompare(b.work_date))
                    .map(schedule => (
                      <div
                        key={schedule.id}
                        className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                          schedule.status === 'pending'
                            ? 'bg-yellow-50/30 hover:bg-yellow-50/60'
                            : schedule.status === 'approved'
                              ? 'bg-green-50/20 hover:bg-green-50/40'
                              : 'bg-red-50/20 hover:bg-red-50/40'
                        }`}
                      >
                        {/* Ngày */}
                        <div className="w-32 shrink-0">
                          <p className="text-sm font-semibold text-gray-800 capitalize">
                            {format(parseISO(schedule.work_date), 'EEE', { locale: vi })}
                          </p>
                          <p className="text-xs text-gray-500">
                            {format(parseISO(schedule.work_date), 'dd/MM/yyyy')}
                          </p>
                        </div>

                        {/* Ca */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className={`${SHIFT_LABELS[schedule.shift].color} text-xs`}>
                              <Clock className="h-3 w-3 mr-1" />
                              {SHIFT_LABELS[schedule.shift].label}
                            </Badge>
                            <span className="text-xs text-gray-400">{SHIFT_LABELS[schedule.shift].time}</span>
                            <Badge className={`${STATUS_LABELS[schedule.status].color} text-xs`}>
                              {STATUS_LABELS[schedule.status].label}
                            </Badge>
                          </div>
                          {schedule.note && (
                            <p className="text-xs text-gray-400 italic mt-1 truncate max-w-xs">
                              "{schedule.note}"
                            </p>
                          )}
                          {schedule.mentor_note && (
                            <p className="text-xs text-blue-600 mt-0.5 italic">
                              Phản hồi: {schedule.mentor_note}
                            </p>
                          )}
                        </div>

                        {/* Action */}
                        <Button
                          size="sm"
                          variant={schedule.status === 'pending' ? 'default' : 'ghost'}
                          className={`shrink-0 h-7 text-xs ${
                            schedule.status === 'pending' ? 'bg-[#0f2d6b] hover:bg-[#0f2d6b]/90' : ''
                          }`}
                          onClick={() => onReview(schedule)}
                        >
                          {schedule.status === 'pending' ? 'Xét duyệt' : 'Xem'}
                        </Button>
                      </div>
                    ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Main: HRScheduleTab ──────────────────────────────────────────────────────

export default function HRScheduleTab() {
  const { toast } = useToast()
  const { data: batches = [] } = useBatches()
  const reviewSchedule = useReviewSchedule()
  const bulkApprove = useBulkApproveSchedule()

  const [selectedBatchId, setSelectedBatchId] = useState<string>('all-open')
  const [selectedWeekKey, setSelectedWeekKey] = useState<string | null>(null)
  const [reviewDialog, setReviewDialog] = useState<InternSchedule | null>(null)
  const [mentorNote, setMentorNote] = useState('')

  const openBatches = batches.filter((b: any) => b.status === 'open')

  // Đợt được chọn
  const activeBatch = useMemo(() => {
    if (selectedBatchId === 'all-open') return null
    return batches.find((b: any) => b.id === Number(selectedBatchId)) ?? null
  }, [selectedBatchId, batches])

  // Tuần của đợt được chọn
  const weeks = useMemo(() => {
    if (!activeBatch) return []
    return getWeeksInBatch(activeBatch.start_date, activeBatch.end_date)
  }, [activeBatch])

  // Fetch lịch của tuần được chọn (chỉ fetch khi đã chọn đợt + tuần cụ thể)
  const selectedWeek = useMemo(() => {
    if (!weeks.length) return null
    if (selectedWeekKey) {
      const found = weeks.find(w => w.monday === selectedWeekKey)
      if (found) return found
    }
    const today = format(new Date(), 'yyyy-MM-dd')
    return (
      weeks.find(w => w.monday <= today && today <= format(w.sundayDate, 'yyyy-MM-dd'))
      ?? weeks[0]
    )
  }, [weeks, selectedWeekKey])

  // Fetch lịch theo batch + week được chọn
  const { data: allSchedules = [], isLoading } = useSchedules(
    activeBatch && selectedWeek
      ? { batch_id: activeBatch.id, week_start: selectedWeek.monday }
      : activeBatch
        ? { batch_id: activeBatch.id }
        : undefined
  )

  // Fetch lịch toàn bộ (cho mode all-open summary)
  const { data: allBatchSchedules = [] } = useSchedules(undefined)

  // Stats tổng hợp
  const stats = useMemo(() => ({
    total: allBatchSchedules.length,
    pending: allBatchSchedules.filter(s => s.status === 'pending').length,
    approved: allBatchSchedules.filter(s => s.status === 'approved').length,
    rejected: allBatchSchedules.filter(s => s.status === 'rejected').length,
  }), [allBatchSchedules])

  // Map week → schedules cho batch đang chọn
  const schedulesByWeek = useMemo(() => {
    const map: Record<string, InternSchedule[]> = {}
    allSchedules.forEach(s => {
      const mon = format(startOfWeek(parseISO(s.work_date), { weekStartsOn: 1 }), 'yyyy-MM-dd')
      if (!map[mon]) map[mon] = []
      map[mon].push(s)
    })
    return map
  }, [allSchedules])

  const handleBatchChange = (val: string) => {
    setSelectedBatchId(val)
    setSelectedWeekKey(null)
  }

  const handleReview = async (status: ScheduleStatus) => {
    if (!reviewDialog) return
    try {
      await reviewSchedule.mutateAsync({
        id: reviewDialog.id,
        data: { status, mentor_note: mentorNote },
      })
      toast({
        title: status === 'approved' ? '✅ Đã duyệt lịch' : '❌ Đã từ chối lịch',
        description: `${reviewDialog.intern_name} — ${format(parseISO(reviewDialog.work_date), 'dd/MM/yyyy', { locale: vi })}`,
      })
      setReviewDialog(null)
      setMentorNote('')
    } catch (err: any) {
      toast({ title: 'Lỗi', description: err.response?.data?.detail || 'Có lỗi xảy ra' })
    }
  }

  const handleBulkApprove = async (ids: number[]) => {
    try {
      await bulkApprove.mutateAsync(ids)
      toast({ title: `✅ Đã duyệt ${ids.length} lịch thực tập` })
    } catch {
      toast({ title: 'Lỗi', description: 'Không thể duyệt hàng loạt' })
    }
  }

  return (
    <div className="space-y-5">
          {/* ✅ THÊM 2 DÒNG NÀY */}
          <HRAttendanceSection />
          <hr className="border-gray-100" />
      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Tổng lịch',  value: stats.total,    color: 'text-gray-700',   bg: 'bg-white',      icon: <CalendarDays className="h-5 w-5 text-gray-400" /> },
          { label: 'Chờ duyệt',  value: stats.pending,  color: 'text-yellow-700', bg: 'bg-yellow-50',  icon: <Clock className="h-5 w-5 text-yellow-400" /> },
          { label: 'Đã duyệt',   value: stats.approved, color: 'text-green-700',  bg: 'bg-green-50',   icon: <CheckCircle className="h-5 w-5 text-green-400" /> },
          { label: 'Từ chối',    value: stats.rejected, color: 'text-red-700',    bg: 'bg-red-50',     icon: <XCircle className="h-5 w-5 text-red-400" /> },
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

      {/* Chọn đợt */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <CalendarCheck className="h-4 w-4 text-[#0f2d6b]" />
          <span className="text-sm font-semibold text-gray-700">Đợt thực tập:</span>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => handleBatchChange('all-open')}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              selectedBatchId === 'all-open'
                ? 'bg-[#0f2d6b] text-white border-[#0f2d6b]'
                : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
            }`}
          >
            Tất cả đợt mở ({openBatches.length})
          </button>
          {openBatches.map((b: any) => (
            <button
              key={b.id}
              onClick={() => handleBatchChange(String(b.id))}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                selectedBatchId === String(b.id)
                  ? 'bg-[#0f2d6b] text-white border-[#0f2d6b]'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
              }`}
            >
              {b.batch_name}
              <span className="ml-1 text-[9px] text-green-400">●</span>
            </button>
          ))}
          {batches.filter((b: any) => b.status === 'closed').length > 0 && (
            <Select value={selectedBatchId} onValueChange={handleBatchChange}>
              <SelectTrigger className="h-7 text-xs border-dashed w-[140px]">
                <SelectValue placeholder="Đợt đã đóng..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-open">— Đợt đang mở —</SelectItem>
                {batches.filter((b: any) => b.status === 'closed').map((b: any) => (
                  <SelectItem key={b.id} value={String(b.id)}>{b.batch_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-gray-300" />
        </div>
      ) : (
        <>
          {/* Mode: tất cả đợt mở — tổng quan */}
          {selectedBatchId === 'all-open' && (
            openBatches.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <AlertCircle className="h-12 w-12 mx-auto mb-3 text-gray-200" />
                  <p className="text-gray-400 font-medium">Không có đợt thực tập nào đang mở</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {openBatches.map((batch: any) => {
                  const batchWeeks = getWeeksInBatch(batch.start_date, batch.end_date)
                  const batchSchedules = allBatchSchedules.filter(s => s.batch_id === batch.id)
                  const batchPending = batchSchedules.filter(s => s.status === 'pending').length
                  const weekMap: Record<string, InternSchedule[]> = {}
                  batchSchedules.forEach(s => {
                    const mon = format(startOfWeek(parseISO(s.work_date), { weekStartsOn: 1 }), 'yyyy-MM-dd')
                    if (!weekMap[mon]) weekMap[mon] = []
                    weekMap[mon].push(s)
                  })
                  return (
                    <Card key={batch.id} className="overflow-hidden">
                      <div className="h-1 bg-gradient-to-r from-[#0f2d6b] to-[#2563eb]" />
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-3 text-base">
                          <CalendarDays className="h-5 w-5 text-[#0f2d6b]" />
                          {batch.batch_name}
                          <Badge className="bg-green-100 text-green-700 text-xs">Đang mở</Badge>
                          {batchPending > 0 && (
                            <Badge className="bg-yellow-100 text-yellow-700 text-xs">
                              {batchPending} chờ duyệt
                            </Badge>
                          )}
                          <span className="text-xs text-gray-400 font-normal">
                            {format(parseISO(batch.start_date), 'dd/MM/yyyy')} – {format(parseISO(batch.end_date), 'dd/MM/yyyy')}
                          </span>
                          <Button
                            size="sm" variant="outline"
                            className="ml-auto h-7 text-xs text-[#0f2d6b] border-[#0f2d6b] hover:bg-blue-50"
                            onClick={() => { setSelectedBatchId(String(batch.id)); setSelectedWeekKey(null) }}
                          >
                            Xem chi tiết →
                          </Button>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                          {batchWeeks.map(w => (
                            <WeekCard
                              key={w.monday}
                              week={w}
                              schedules={weekMap[w.monday] || []}
                              isSelected={false}
                              onClick={() => {
                                setSelectedBatchId(String(batch.id))
                                setSelectedWeekKey(w.monday)
                              }}
                            />
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )
          )}

          {/* Mode: 1 đợt cụ thể */}
          {selectedBatchId !== 'all-open' && activeBatch && (
            <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-5 items-start">

              {/* Cột trái — danh sách tuần */}
              <Card className="overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-[#0f2d6b] to-[#2563eb]" />
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-700 flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-[#0f2d6b]" />
                    {weeks.length} tuần thực tập
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-2 space-y-1.5">
                  {weeks.map(w => (
                    <WeekCard
                      key={w.monday}
                      week={w}
                      schedules={schedulesByWeek[w.monday] || []}
                      isSelected={selectedWeek?.monday === w.monday}
                      onClick={() => setSelectedWeekKey(w.monday)}
                    />
                  ))}
                </CardContent>
              </Card>

              {/* Cột phải — chi tiết tuần */}
              <Card className="overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-[#0f2d6b] to-[#2563eb]" />
                <CardContent className="pt-5">
                  {selectedWeek ? (
                    <WeekDetail
                      week={selectedWeek}
                      schedules={schedulesByWeek[selectedWeek.monday] || []}
                      batches={batches}
                      onReview={s => { setReviewDialog(s); setMentorNote(s.mentor_note || '') }}
                      onBulkApprove={handleBulkApprove}
                      isBulkLoading={bulkApprove.isPending}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-300">
                      <CalendarDays className="h-16 w-16 mb-3" />
                      <p className="text-gray-400 font-medium">Chọn một tuần để xem lịch đăng ký</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}

      {/* Review Dialog */}
      <Dialog open={!!reviewDialog} onOpenChange={o => !o && setReviewDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarCheck className="h-5 w-5 text-blue-600" />
              Xét duyệt lịch thực tập
            </DialogTitle>
          </DialogHeader>
          {reviewDialog && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-xl p-4 space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Thực tập sinh</span>
                  <span className="font-semibold">{reviewDialog.intern_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ngày làm việc</span>
                  <span className="font-semibold capitalize">
                    {format(parseISO(reviewDialog.work_date), 'EEEE, dd/MM/yyyy', { locale: vi })}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Ca làm việc</span>
                  <Badge className={SHIFT_LABELS[reviewDialog.shift].color}>
                    <Clock className="h-3 w-3 mr-1" />
                    {SHIFT_LABELS[reviewDialog.shift].label} · {SHIFT_LABELS[reviewDialog.shift].time}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Trạng thái</span>
                  <Badge className={STATUS_LABELS[reviewDialog.status].color}>
                    {STATUS_LABELS[reviewDialog.status].label}
                  </Badge>
                </div>
                {reviewDialog.note && (
                  <div className="pt-2 border-t border-gray-200">
                    <p className="text-muted-foreground text-xs mb-1">Ghi chú của TTS</p>
                    <p className="text-gray-800">{reviewDialog.note}</p>
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  Ghi chú phản hồi <span className="text-gray-400 font-normal text-xs">(tuỳ chọn)</span>
                </label>
                <Textarea
                  placeholder="VD: Đã xác nhận lịch làm việc..."
                  value={mentorNote}
                  onChange={e => setMentorNote(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setReviewDialog(null)}>Đóng</Button>
            {reviewDialog?.status === 'pending' && (
              <>
                <Button
                  variant="outline"
                  className="border-red-300 text-red-600 hover:bg-red-50"
                  disabled={reviewSchedule.isPending}
                  onClick={() => handleReview('rejected')}
                >
                  {reviewSchedule.isPending
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <><XCircle className="h-4 w-4 mr-1" />Từ chối</>
                  }
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  disabled={reviewSchedule.isPending}
                  onClick={() => handleReview('approved')}
                >
                  {reviewSchedule.isPending
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <><CheckCircle className="h-4 w-4 mr-1" />Duyệt</>
                  }
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}