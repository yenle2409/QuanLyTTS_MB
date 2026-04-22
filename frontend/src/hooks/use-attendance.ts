import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

export type AttendanceStatus = 'present' | 'checked_out' | 'absent' | 'leave' | 'not_checked_in'

export interface AttendanceRecord {
  intern_id: number
  intern_name: string | null
  schedule_id: number | null
  batch_id: number
  shift: string | null
  date: string
  attendance_id: number | null
  status: AttendanceStatus
  check_in_time: string | null
  check_out_time: string | null
  note: string | null
  // ✅ field mới từ backend
  is_auto_absent?: boolean  // true = vắng hiển thị nhưng chưa ghi DB
}

export interface MyTodayAttendance {
  is_active: boolean
  batch_open: boolean
  has_schedule: boolean
  schedule: {
    id: number
    shift: string
    work_date: string
  } | null
  attendance: {
    id: number
    status: AttendanceStatus
    check_in_time: string | null
    check_out_time: string | null
  } | null
  // ✅ 2 field mới — backend tính sẵn, frontend chỉ việc dùng
  display_status: AttendanceStatus | null  // trạng thái hiển thị (có thể 'absent' dù chưa ghi DB)
  is_auto_absent: boolean                 // true = vắng do quá giờ ca, chưa ghi DB
}

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, { label: string; color: string; bg: string }> = {
  present:        { label: 'Đã check-in',   color: 'text-blue-700',   bg: 'bg-blue-100'   },
  checked_out:    { label: 'Đã check-out',  color: 'text-green-700',  bg: 'bg-green-100'  },
  absent:         { label: 'Vắng mặt',      color: 'text-red-700',    bg: 'bg-red-100'    },
  leave:          { label: 'Nghỉ phép',     color: 'text-gray-700',   bg: 'bg-gray-100'   },
  not_checked_in: { label: 'Chưa check-in', color: 'text-yellow-700', bg: 'bg-yellow-100' },
}

// HR/Mentor: xem điểm danh hôm nay
export function useTodayAttendance(batchId?: number) {
  return useQuery<AttendanceRecord[]>({
    queryKey: ['attendance', 'today', batchId],
    queryFn: async () => {
      const p = new URLSearchParams()
      if (batchId) p.append('batch_id', String(batchId))
      const res = await api.get(`/attendance/today?${p.toString()}`)
      return res.data
    },
    refetchInterval: 60_000, // tự refresh mỗi 1 phút
  })
}

// HR: xem điểm danh theo ngày/khoảng thời gian
export function useAttendanceHistory(params?: {
  intern_id?: number
  batch_id?: number
  target_date?: string
  date_from?: string
  date_to?: string
}) {
  return useQuery({
    queryKey: ['attendance', 'history', params],
    queryFn: async () => {
      const p = new URLSearchParams()
      if (params?.intern_id)   p.append('intern_id',   String(params.intern_id))
      if (params?.batch_id)    p.append('batch_id',    String(params.batch_id))
      if (params?.target_date) p.append('target_date', params.target_date)
      if (params?.date_from)   p.append('date_from',   params.date_from)
      if (params?.date_to)     p.append('date_to',     params.date_to)
      const res = await api.get(`/attendance/?${p.toString()}`)
      return res.data
    },
    enabled: !!params,
  })
}

// TTS: xem trạng thái hôm nay của mình
export function useMyTodayAttendance() {
  return useQuery<MyTodayAttendance>({
    queryKey: ['attendance', 'me', 'today'],
    queryFn: async () => {
      const res = await api.get('/attendance/me/today')
      return res.data
    },
    refetchInterval: 30_000, // refresh mỗi 30 giây để cập nhật khi ca kết thúc
  })
}

// TTS: check-in
export function useCheckIn() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const res = await api.post('/attendance/check-in')
      return res.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attendance'] }),
  })
}

// TTS: check-out
export function useCheckOut() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const res = await api.post('/attendance/check-out')
      return res.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attendance'] }),
  })
}

// HR: đánh dấu vắng thủ công
export function useMarkAbsent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ internId, note, targetDate }: {
      internId: number
      note?: string
      targetDate?: string
    }) => {
      const p = new URLSearchParams()
      p.append('intern_id', String(internId))
      if (targetDate) p.append('target_date', targetDate)
      const res = await api.post(`/attendance/mark-absent?${p.toString()}`, { note })
      return res.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attendance'] }),
  })
}

// HR: ghi vắng vào DB cho tất cả ca đã kết thúc chưa check-in
export function useAutoMarkAbsent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const res = await api.post('/attendance/auto-mark-absent')
      return res.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attendance'] }),
  })
}