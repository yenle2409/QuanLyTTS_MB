import { useState, useMemo, useEffect, useRef } from 'react'
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
  useLeaveRequests, useReviewLeaveRequest,
  LEAVE_STATUS_LABELS, type LeaveRequest, type LeaveStatus,
} from '@/hooks/use-leave-request'
import { useBatches } from '@/hooks/use-batches'
import {
  CalendarOff, CheckCircle, XCircle, Bell, BellRing,
  ChevronRight, CalendarDays, Loader2,
} from 'lucide-react'
import {
  format, parseISO, startOfWeek, addDays, differenceInWeeks, isWithinInterval,
} from 'date-fns'
import { vi } from 'date-fns/locale'

// ─── Helpers ─────────────────────────────────────────────────
function getWeekIndex(leaveDate: string, batchStart: string): number {
  const leave    = parseISO(leaveDate)
  const start    = parseISO(batchStart)
  const batchMon = startOfWeek(start, { weekStartsOn: 1 })
  return differenceInWeeks(startOfWeek(leave, { weekStartsOn: 1 }), batchMon) + 1
}

function getWeekRange(leaveDate: string): string {
  const d   = parseISO(leaveDate)
  const mon = startOfWeek(d, { weekStartsOn: 1 })
  const sun = addDays(mon, 6)
  return `${format(mon, 'dd/MM', { locale: vi })} - ${format(sun, 'dd/MM', { locale: vi })}`
}

function getWeekMonday(leaveDate: string): string {
  return format(startOfWeek(parseISO(leaveDate), { weekStartsOn: 1 }), 'yyyy-MM-dd')
}

// ─── Notification Bell ────────────────────────────────────────
function NotificationBell({ leaves }: { leaves: LeaveRequest[] }) {
  const [open, setOpen] = useState(false)
  const [seenIds, setSeenIds] = useState<Set<number>>(() => {
    try {
      const s = localStorage.getItem('hr_leave_seen_ids')
      return new Set(s ? JSON.parse(s) : [])
    } catch { return new Set() }
  })
  const ref = useRef<HTMLDivElement>(null)

  const pending = leaves.filter(l => l.status === 'pending')
  const unseen  = pending.filter(l => !seenIds.has(l.id))

  const markAllSeen = () => {
    const next = new Set([...seenIds, ...pending.map(l => l.id)])
    setSeenIds(next)
    localStorage.setItem('hr_leave_seen_ids', JSON.stringify([...next]))
  }

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setOpen(o => !o); if (!open) markAllSeen() }}
        className={`relative flex items-center justify-center w-9 h-9 rounded-xl border-2 transition-all ${
          unseen.length > 0
            ? 'border-orange-400 bg-orange-50 text-orange-600 animate-pulse'
            : 'border-gray-200 bg-white text-gray-500 hover:border-blue-300'
        }`}
      >
        {unseen.length > 0 ? <BellRing className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
        {unseen.length > 0 && (
          <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-orange-500 text-white text-[9px] font-black flex items-center justify-center">
            {unseen.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
            <span className="font-bold text-sm text-gray-900">Đơn xin nghỉ chờ duyệt</span>
            <Badge className="bg-orange-100 text-orange-700 text-xs">{pending.length}</Badge>
          </div>
          {pending.length === 0 ? (
            <div className="py-8 text-center">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 text-gray-200" />
              <p className="text-sm text-gray-400">Không có đơn nào chờ duyệt</p>
            </div>
          ) : (
            <div className="max-h-72 overflow-y-auto divide-y divide-gray-50">
              {pending.slice(0, 10).map(l => (
                <div key={l.id} className={`px-4 py-3 hover:bg-gray-50 ${!seenIds.has(l.id) ? 'bg-orange-50/40' : ''}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{l.intern_name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Nghỉ ngày {format(parseISO(l.leave_date), 'EEE dd/MM/yyyy', { locale: vi })}
                      </p>
                      <p className="text-xs text-gray-400 truncate italic mt-0.5">"{l.reason}"</p>
                    </div>
                    {!seenIds.has(l.id) && (
                      <span className="w-2 h-2 rounded-full bg-orange-400 mt-1.5 shrink-0" />
                    )}
                  </div>
                </div>
              ))}
              {pending.length > 10 && (
                <div className="px-4 py-2 text-center text-xs text-gray-400">
                  +{pending.length - 10} đơn khác
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── WeekGroup ────────────────────────────────────────────────
function WeekGroup({
  weekMonday, weekIndex, leaves, onReview,
}: {
  weekMonday: string
  weekIndex: number
  leaves: LeaveRequest[]
  onReview: (l: LeaveRequest) => void
}) {
  const [expanded, setExpanded] = useState(true)
  const today  = new Date()
  const mon    = parseISO(weekMonday)
  const sun    = addDays(mon, 6)
  const isCurrent  = isWithinInterval(today, { start: mon, end: sun })
  const pendingCount = leaves.filter(l => l.status === 'pending').length
  const weekRangeLabel = `${format(mon, 'dd/MM', { locale: vi })} - ${format(sun, 'dd/MM', { locale: vi })}`

  return (
    <div className={`border rounded-xl overflow-hidden ${isCurrent ? 'border-blue-200' : 'border-gray-100'}`}>
      <button
        onClick={() => setExpanded(e => !e)}
        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
          isCurrent ? 'bg-blue-50/60 hover:bg-blue-50' : 'bg-gray-50/60 hover:bg-gray-50'
        }`}
      >
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
          isCurrent ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600'
        }`}>
          {weekIndex}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-gray-800">Tuần {weekIndex}</span>
            {isCurrent && (
              <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded-full font-bold">Tuần này</span>
            )}
            <span className="text-xs text-gray-400">{weekRangeLabel}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {pendingCount > 0 && (
            <Badge className="bg-yellow-100 text-yellow-700 text-xs">{pendingCount} chờ duyệt</Badge>
          )}
          <Badge className="bg-gray-100 text-gray-600 text-xs">{leaves.length} đơn</Badge>
          <ChevronRight className={`h-4 w-4 text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`} />
        </div>
      </button>

      {expanded && (
        <div className="divide-y divide-gray-50">
          {leaves
            .sort((a, b) => a.leave_date.localeCompare(b.leave_date))
            .map(leave => (
              <div key={leave.id} className={`flex items-center gap-3 px-4 py-3 ${
                leave.status === 'pending' ? 'bg-yellow-50/30' : ''
              }`}>
                <div className="w-8 h-8 rounded-full bg-[#0f2d6b] flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {(leave.intern_name || '?').charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-800">{leave.intern_name}</span>
                    <Badge className={`${LEAVE_STATUS_LABELS[leave.status].color} text-xs`}>
                      {LEAVE_STATUS_LABELS[leave.status].label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500 flex-wrap">
                    <span className="font-medium text-gray-700">
                      {format(parseISO(leave.leave_date), 'EEE dd/MM/yyyy', { locale: vi })}
                    </span>
                    <span className="text-gray-300">·</span>
                    <span className="italic truncate max-w-[200px]">"{leave.reason}"</span>
                    {leave.created_at && (
                      <>
                        <span className="text-gray-300">·</span>
                        <span>Gửi {format(parseISO(leave.created_at), 'dd/MM HH:mm', { locale: vi })}</span>
                      </>
                    )}
                  </div>
                  {leave.hr_note && (
                    <p className="text-xs text-blue-600 mt-0.5 italic">Ghi chú: {leave.hr_note}</p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant={leave.status === 'pending' ? 'default' : 'ghost'}
                  className={`shrink-0 h-7 text-xs ${leave.status === 'pending' ? 'bg-[#0f2d6b] hover:bg-[#0f2d6b]/90' : ''}`}
                  onClick={() => onReview(leave)}
                >
                  {leave.status === 'pending' ? 'Xét duyệt' : 'Xem'}
                </Button>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}

// ─── Main: HRLeaveTab ─────────────────────────────────────────
export default function HRLeaveTab() {
  const { toast } = useToast()
  const { data: batches = [] } = useBatches()
  const { data: allLeaves = [], isLoading } = useLeaveRequests()
  const reviewLeave = useReviewLeaveRequest()

  const [selectedBatchId, setSelectedBatchId] = useState<string>('all')
  const [statusFilter,    setStatusFilter]    = useState<string>('all')
  const [reviewDialog,    setReviewDialog]    = useState<LeaveRequest | null>(null)
  const [hrNote,          setHrNote]          = useState('')

  const filtered = useMemo(() => allLeaves.filter(l =>
    (selectedBatchId === 'all' || l.batch_id === Number(selectedBatchId)) &&
    (statusFilter    === 'all' || l.status   === statusFilter)
  ), [allLeaves, selectedBatchId, statusFilter])

  // Group: batch_id → weekMonday → { weekIndex, leaves }
  const grouped = useMemo(() => {
    const batchMap = Object.fromEntries(batches.map(b => [b.id, b]))
    const byBatch: Record<number, {
      batch: typeof batches[0]
      byWeek: Record<string, { weekIndex: number; leaves: LeaveRequest[] }>
    }> = {}

    filtered.forEach(leave => {
      const batch = batchMap[leave.batch_id]
      if (!batch) return
      if (!byBatch[leave.batch_id]) byBatch[leave.batch_id] = { batch, byWeek: {} }
      const weekMon = getWeekMonday(leave.leave_date)
      if (!byBatch[leave.batch_id].byWeek[weekMon]) {
        byBatch[leave.batch_id].byWeek[weekMon] = {
          weekIndex: getWeekIndex(leave.leave_date, batch.start_date),
          leaves: [],
        }
      }
      byBatch[leave.batch_id].byWeek[weekMon].leaves.push(leave)
    })
    return byBatch
  }, [filtered, batches])

  const stats = useMemo(() => ({
    total:    allLeaves.length,
    pending:  allLeaves.filter(l => l.status === 'pending').length,
    approved: allLeaves.filter(l => l.status === 'approved').length,
    rejected: allLeaves.filter(l => l.status === 'rejected').length,
  }), [allLeaves])

  const handleReview = async (status: LeaveStatus) => {
    if (!reviewDialog) return
    try {
      await reviewLeave.mutateAsync({ id: reviewDialog.id, data: { status, hr_note: hrNote } })
      toast({
        title: status === 'approved' ? '✅ Đã duyệt đơn nghỉ' : '❌ Đã từ chối đơn nghỉ',
        description: `${reviewDialog.intern_name} — ${format(parseISO(reviewDialog.leave_date), 'dd/MM/yyyy', { locale: vi })}`,
      })
      setReviewDialog(null); setHrNote('')
    } catch (err: any) {
      toast({ title: 'Lỗi', description: err.response?.data?.detail || 'Có lỗi xảy ra' })
    }
  }

  return (
    <div className="space-y-4">

      {/* Stats + Bell */}
      <div className="flex items-center gap-3">
        <div className="flex-1 grid grid-cols-4 gap-3">
          {[
            { label: 'Tổng đơn',  value: stats.total,    color: 'text-gray-700',   bg: 'bg-white'     },
            { label: 'Chờ duyệt', value: stats.pending,  color: 'text-yellow-700', bg: 'bg-yellow-50' },
            { label: 'Đã duyệt',  value: stats.approved, color: 'text-green-700',  bg: 'bg-green-50'  },
            { label: 'Từ chối',   value: stats.rejected, color: 'text-red-700',    bg: 'bg-red-50'    },
          ].map(s => (
            <div key={s.label} className={`${s.bg} border border-gray-100 rounded-xl p-4 text-center shadow-sm`}>
              <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
        <NotificationBell leaves={allLeaves} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-sm">
        <CalendarOff className="h-4 w-4 text-[#0f2d6b]" />
        <span className="text-sm font-semibold text-gray-700">Đợt:</span>
        <div className="flex gap-2 flex-wrap">
          {[{ id: 'all', name: 'Tất cả', status: '' }, ...batches.map(b => ({ id: String(b.id), name: b.batch_name, status: b.status }))].map(b => (
            <button
              key={b.id}
              onClick={() => setSelectedBatchId(b.id)}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                selectedBatchId === b.id
                  ? 'bg-[#0f2d6b] text-white border-[#0f2d6b]'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
              }`}
            >
              {b.name}
              {b.status === 'open' && <span className="ml-1 text-[9px] text-green-400">●</span>}
            </button>
          ))}
        </div>
        <div className="ml-auto">
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

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-gray-300" />
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-gray-100 rounded-2xl">
          <CalendarOff className="h-16 w-16 text-gray-100 mb-4" />
          <p className="font-semibold text-gray-400">Không có đơn xin nghỉ nào</p>
          <p className="text-sm text-gray-300 mt-1">Thay đổi bộ lọc để xem thêm</p>
        </div>
      ) : (
        Object.entries(grouped)
          .sort(([, a], [, b]) => (a.batch.status === 'open' ? 0 : 1) - (b.batch.status === 'open' ? 0 : 1))
          .map(([batchId, { batch, byWeek }]) => {
            const batchLeaves  = filtered.filter(l => l.batch_id === Number(batchId))
            const batchPending = batchLeaves.filter(l => l.status === 'pending').length
            return (
              <div key={batchId} className="space-y-2">
                {/* Batch header divider */}
                <div className="flex items-center gap-3 px-1">
                  <CalendarDays className="h-4 w-4 text-[#0f2d6b] shrink-0" />
                  <span className="font-bold text-gray-900 whitespace-nowrap">{batch.batch_name}</span>
                  <Badge className={batch.status === 'open'
                    ? 'bg-green-100 text-green-700 text-xs shrink-0'
                    : 'bg-gray-100 text-gray-600 text-xs shrink-0'
                  }>
                    {batch.status === 'open' ? 'Đang mở' : 'Đã đóng'}
                  </Badge>
                  {batchPending > 0 && (
                    <Badge className="bg-yellow-100 text-yellow-700 text-xs shrink-0">
                      {batchPending} chờ duyệt
                    </Badge>
                  )}
                  <div className="flex-1 h-px bg-gray-100" />
                  <span className="text-xs text-gray-400 shrink-0">{batchLeaves.length} đơn</span>
                </div>

                {/* Weeks */}
                <div className="space-y-2 pl-2">
                  {Object.entries(byWeek)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([weekMon, { weekIndex, leaves }]) => (
                      <WeekGroup
                        key={weekMon}
                        weekMonday={weekMon}
                        weekIndex={weekIndex}
                        leaves={leaves}
                        onReview={l => { setReviewDialog(l); setHrNote(l.hr_note || '') }}
                      />
                    ))}
                </div>
              </div>
            )
          })
      )}

      {/* Review Dialog */}
      <Dialog open={!!reviewDialog} onOpenChange={o => !o && setReviewDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarOff className="h-5 w-5 text-red-500" />Xét duyệt đơn nghỉ
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
                  <span className="text-muted-foreground">Ngày nghỉ</span>
                  <span className="font-semibold capitalize">
                    {format(parseISO(reviewDialog.leave_date), 'EEEE, dd/MM/yyyy', { locale: vi })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Đợt</span>
                  <span className="font-medium">
                    {batches.find(b => b.id === reviewDialog.batch_id)?.batch_name || `#${reviewDialog.batch_id}`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tuần</span>
                  <span className="font-medium">
                    {(() => {
                      const batch = batches.find(b => b.id === reviewDialog.batch_id)
                      if (!batch) return '—'
                      return `Tuần ${getWeekIndex(reviewDialog.leave_date, batch.start_date)} (${getWeekRange(reviewDialog.leave_date)})`
                    })()}
                  </span>
                </div>
                <div className="pt-2 border-t border-gray-200">
                  <p className="text-muted-foreground text-xs mb-1">Lý do</p>
                  <p className="text-gray-800">{reviewDialog.reason}</p>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Trạng thái</span>
                  <Badge className={LEAVE_STATUS_LABELS[reviewDialog.status].color}>
                    {LEAVE_STATUS_LABELS[reviewDialog.status].label}
                  </Badge>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  Ghi chú phản hồi <span className="text-gray-400 font-normal text-xs">(tuỳ chọn)</span>
                </label>
                <Textarea
                  placeholder="VD: Đã xác nhận, nghỉ có phép..."
                  value={hrNote}
                  onChange={e => setHrNote(e.target.value)}
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
                <Button variant="outline" className="border-red-300 text-red-600 hover:bg-red-50"
                  disabled={reviewLeave.isPending} onClick={() => handleReview('rejected')}>
                  {reviewLeave.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><XCircle className="h-4 w-4 mr-1" />Từ chối</>}
                </Button>
                <Button className="bg-green-600 hover:bg-green-700"
                  disabled={reviewLeave.isPending} onClick={() => handleReview('approved')}>
                  {reviewLeave.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CheckCircle className="h-4 w-4 mr-1" />Duyệt</>}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}