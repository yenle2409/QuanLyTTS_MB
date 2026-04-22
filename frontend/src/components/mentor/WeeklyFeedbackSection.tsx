import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Star, Plus, MoreHorizontal, Edit, Trash2,
  TrendingUp, AlertCircle, MessageSquare, Lock, Bell, CalendarDays,
} from 'lucide-react'
import { useWeeklyFeedbacks, useDeleteFeedback, type WeeklyFeedback } from '@/hooks/use-weekly-feedbacks'
import WeeklyFeedbackDialog from '@/components/mentor/WeeklyFeedbackDialog'
import { useToast } from '@/hooks/use-toast'
import { format, differenceInCalendarWeeks, parseISO, startOfWeek } from 'date-fns'
import { vi } from 'date-fns/locale'
import type { InternProfile } from '@/hooks/use-profiles'

interface WeeklyFeedbackSectionProps {
  intern: InternProfile
  batchId?: number
  readonly?: boolean
  batchStatus?: 'open' | 'closed'
  currentWeek?: number
  batchStartDate?: string  // ✅ THÊM: ngày bắt đầu đợt để tính tuần tự động
}

// ✅ Tính tuần hiện tại dựa vào ngày bắt đầu đợt
function calcCurrentWeek(batchStartDate: string): number {
  const start = startOfWeek(parseISO(batchStartDate), { weekStartsOn: 1 })
  const now   = startOfWeek(new Date(), { weekStartsOn: 1 })
  const diff  = differenceInCalendarWeeks(now, start)
  return Math.max(1, diff + 1)
}

function StarDisplay({ rating }: { rating: number | null }) {
  if (!rating) return null
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <Star key={s} className={`h-4 w-4 ${s <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />
      ))}
    </div>
  )
}

const ratingLabel: Record<number, { label: string; cls: string }> = {
  1: { label: 'Yếu',        cls: 'bg-red-100 text-red-700'    },
  2: { label: 'Trung bình', cls: 'bg-orange-100 text-orange-700' },
  3: { label: 'Khá',        cls: 'bg-yellow-100 text-yellow-700' },
  4: { label: 'Tốt',        cls: 'bg-blue-100 text-blue-700'  },
  5: { label: 'Xuất sắc',   cls: 'bg-green-100 text-green-700' },
}

function isTodaySunday(): boolean {
  return new Date().getDay() === 0
}

export default function WeeklyFeedbackSection({
  intern,
  batchId,
  readonly = false,
  batchStatus = 'open',
  currentWeek: currentWeekProp,
  batchStartDate,
}: WeeklyFeedbackSectionProps) {
  const { toast } = useToast()
  const { data: feedbacks = [], isLoading } = useWeeklyFeedbacks(intern.user_id, batchId || intern.batch_id)
  const deleteFeedback = useDeleteFeedback()

  const [dialogOpen, setDialogOpen]         = useState(false)
  const [editingFeedback, setEditingFeedback] = useState<WeeklyFeedback | null>(null)
  const [deletingId, setDeletingId]           = useState<number | null>(null)

  const isBatchClosed = batchStatus === 'closed'

  // ✅ Tính tuần hiện tại: ưu tiên từ batchStartDate, fallback sang prop
  const currentWeek = useMemo(() => {
    if (batchStartDate) return calcCurrentWeek(batchStartDate)
    return currentWeekProp ?? 1
  }, [batchStartDate, currentWeekProp])

  // ✅ Tuần để tạo feedback mới = tuần hiện tại
  const nextWeekNumber = currentWeek

  const hasCurrentWeekFeedback = feedbacks.some(f => f.week_number === currentWeek)

  const showReminderBanner =
    !readonly &&
    !isBatchClosed &&
    (isTodaySunday() || !hasCurrentWeekFeedback)

  const handleEdit = (fb: WeeklyFeedback) => {
    if (isBatchClosed) {
      toast({ title: 'Đợt thực tập đã đóng', description: 'Không thể chỉnh sửa feedback.' })
      return
    }
    setEditingFeedback(fb)
    setDialogOpen(true)
  }

  const handleCreate = () => {
    if (isBatchClosed) {
      toast({ title: 'Đợt thực tập đã đóng', description: 'Không thể thêm feedback mới.' })
      return
    }
    setEditingFeedback(null)
    setDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!deletingId) return
    try {
      await deleteFeedback.mutateAsync(deletingId)
      toast({ title: 'Đã xóa feedback' })
      setDeletingId(null)
    } catch {
      toast({ title: 'Lỗi', description: 'Không thể xóa' })
    }
  }

  return (
    <>
      {/* Banner nhắc nhở */}
      {showReminderBanner && (
        <div className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${
          !hasCurrentWeekFeedback
            ? 'bg-orange-50 border-orange-200 text-orange-800'
            : 'bg-blue-50 border-blue-200 text-blue-800'
        }`}>
          <Bell className={`h-4 w-4 mt-0.5 shrink-0 ${!hasCurrentWeekFeedback ? 'text-orange-500' : 'text-blue-500'}`} />
          <div>
            {!hasCurrentWeekFeedback ? (
              <>
                <span className="font-semibold">Chưa có feedback tuần {currentWeek}!</span>
                {' '}Bạn chưa gửi feedback cho <span className="font-medium">{intern.user_full_name}</span> trong tuần này.
              </>
            ) : (
              <>
                <span className="font-semibold">Hôm nay là Chủ nhật</span> — hãy hoàn tất feedback tuần {currentWeek} cho{' '}
                <span className="font-medium">{intern.user_full_name}</span>.
              </>
            )}
            {!readonly && (
              <button onClick={handleCreate} className="ml-2 underline font-semibold hover:no-underline">
                Thêm ngay →
              </button>
            )}
          </div>
        </div>
      )}

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-blue-500" />
              Feedback định kỳ
              {feedbacks.length > 0 && (
                <Badge className="bg-blue-100 text-blue-700 ml-1">{feedbacks.length} tuần</Badge>
              )}
              {/* ✅ Hiển thị tuần hiện tại */}
              {!isBatchClosed && (
                <span className="text-xs text-gray-400 font-normal flex items-center gap-1">
                  <CalendarDays className="h-3 w-3" />
                  Tuần {currentWeek} hiện tại
                </span>
              )}
            </CardTitle>

            <div className="flex items-center gap-2">
              {isBatchClosed ? (
                <Badge className="bg-gray-100 text-gray-600 flex items-center gap-1">
                  <Lock className="h-3 w-3" />Đợt đã đóng
                </Badge>
              ) : (
                <Badge className="bg-green-100 text-green-700">Đợt đang mở</Badge>
              )}
              {!readonly && (
                isBatchClosed ? (
                  <Button size="sm" disabled className="h-8 opacity-50 cursor-not-allowed">
                    <Lock className="h-3.5 w-3.5 mr-1" />Không thể thêm
                  </Button>
                ) : (
                  <Button size="sm" onClick={handleCreate} className="bg-blue-800 hover:bg-blue-900 h-8">
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    {hasCurrentWeekFeedback ? 'Thêm feedback' : `Feedback tuần ${currentWeek}`}
                  </Button>
                )
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <p className="text-center text-sm text-muted-foreground py-4">Đang tải...</p>
          ) : feedbacks.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-20" />
              <p className="text-sm">Chưa có feedback nào</p>
              {!readonly && !isBatchClosed && (
                <Button size="sm" variant="outline" onClick={handleCreate} className="mt-3">
                  <Plus className="h-3.5 w-3.5 mr-1" />Tạo feedback tuần {currentWeek}
                </Button>
              )}
              {!readonly && isBatchClosed && (
                <p className="text-xs text-gray-400 mt-2 flex items-center justify-center gap-1">
                  <Lock className="h-3 w-3" />Đợt đã đóng
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {feedbacks
                .slice()
                .sort((a, b) => b.week_number - a.week_number)
                .map(fb => {
                  const rl = fb.rating ? ratingLabel[fb.rating] : null
                  const isThisWeek = fb.week_number === currentWeek
                  return (
                    <div key={fb.id} className={`border rounded-lg p-4 space-y-3 transition-colors ${
                      isThisWeek ? 'border-blue-300 bg-blue-50/40' : 'hover:border-blue-200'
                    }`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={`text-xs px-2 py-0.5 ${isThisWeek ? 'bg-blue-600 text-white' : 'bg-blue-800 text-white'}`}>
                            Tuần {fb.week_number}
                            {isThisWeek && ' (tuần này)'}
                          </Badge>
                          {fb.week_label && <span className="text-xs text-muted-foreground">{fb.week_label}</span>}
                          {rl && <Badge className={`${rl.cls} text-xs`}>{rl.label}</Badge>}
                          <StarDisplay rating={fb.rating} />
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(fb.created_at), 'dd/MM/yyyy', { locale: vi })}
                          </span>
                          {!readonly && !isBatchClosed && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEdit(fb)}>
                                  <Edit className="h-4 w-4 mr-2" />Chỉnh sửa
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setDeletingId(fb.id)} className="text-red-600">
                                  <Trash2 className="h-4 w-4 mr-2" />Xóa
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                          {!readonly && isBatchClosed && <Lock className="h-3.5 w-3.5 text-gray-400" />}
                        </div>
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{fb.content}</p>
                      {(fb.strengths || fb.improvements) && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {fb.strengths && (
                            <div className="bg-green-50 rounded-md p-2.5 text-xs">
                              <div className="flex items-center gap-1 font-semibold text-green-700 mb-1">
                                <TrendingUp className="h-3.5 w-3.5" />Điểm mạnh
                              </div>
                              <p className="text-green-800 whitespace-pre-wrap">{fb.strengths}</p>
                            </div>
                          )}
                          {fb.improvements && (
                            <div className="bg-orange-50 rounded-md p-2.5 text-xs">
                              <div className="flex items-center gap-1 font-semibold text-orange-700 mb-1">
                                <AlertCircle className="h-3.5 w-3.5" />Cần cải thiện
                              </div>
                              <p className="text-orange-800 whitespace-pre-wrap">{fb.improvements}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
            </div>
          )}
        </CardContent>
      </Card>

      <WeeklyFeedbackDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        intern={intern}
        existingFeedback={editingFeedback}
        weekNumber={nextWeekNumber}
        batchId={batchId || intern.batch_id}
        batchStartDate={batchStartDate}
      />

      <AlertDialog open={!!deletingId} onOpenChange={open => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa feedback?</AlertDialogTitle>
            <AlertDialogDescription>Hành động này không thể hoàn tác.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Xóa</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}