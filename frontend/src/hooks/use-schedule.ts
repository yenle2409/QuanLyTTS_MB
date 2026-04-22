import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

export type ShiftType = 'ca1' | 'ca2' | 'full'
export type ScheduleStatus = 'pending' | 'approved' | 'rejected'

export interface InternSchedule {
  id: number
  intern_id: number
  mentor_id: number | null
  batch_id: number
  work_date: string       // 'YYYY-MM-DD'
  shift: ShiftType
  status: ScheduleStatus
  note: string | null
  mentor_note: string | null
  intern_name: string | null
  created_at: string | null
}

export interface CreateScheduleData {
  work_date: string
  shift: ShiftType
  note?: string
  batch_id: number
}

export interface ReviewScheduleData {
  status: ScheduleStatus
  mentor_note?: string
}

export const SHIFT_LABELS: Record<ShiftType, { label: string; time: string; color: string }> = {
  ca1:  { label: 'Ca 1 - Sáng',   time: '08:00 - 12:00', color: 'bg-blue-100 text-blue-700' },
  ca2:  { label: 'Ca 2 - Chiều',  time: '13:00 - 17:00', color: 'bg-orange-100 text-orange-700' },
  full: { label: 'Cả ngày',       time: '08:00 - 17:00', color: 'bg-green-100 text-green-700' },
}

export const STATUS_LABELS: Record<ScheduleStatus, { label: string; color: string }> = {
  pending:  { label: 'Chờ duyệt', color: 'bg-yellow-100 text-yellow-700' },
  approved: { label: 'Đã duyệt',  color: 'bg-green-100 text-green-700' },
  rejected: { label: 'Từ chối',   color: 'bg-red-100 text-red-700' },
}

export function useSchedules(params?: { intern_id?: number; batch_id?: number; week_start?: string }) {
  return useQuery<InternSchedule[]>({
    queryKey: ['schedules', params],
    queryFn: async () => {
      const p = new URLSearchParams()
      if (params?.intern_id) p.append('intern_id', String(params.intern_id))
      if (params?.batch_id)  p.append('batch_id',  String(params.batch_id))
      if (params?.week_start) p.append('week_start', params.week_start)
      const res = await api.get(`/schedules/?${p.toString()}`)
      return res.data
    },
  })
}

export function useCreateSchedule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: CreateScheduleData) => {
      const res = await api.post('/schedules/', data)
      return res.data as InternSchedule
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['schedules'] }),
  })
}

export function useUpdateSchedule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<CreateScheduleData> }) => {
      const res = await api.put(`/schedules/${id}`, data)
      return res.data as InternSchedule
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['schedules'] }),
  })
}

export function useReviewSchedule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: ReviewScheduleData }) => {
      const res = await api.put(`/schedules/${id}/review`, data)
      return res.data as InternSchedule
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['schedules'] }),
  })
}

// Duyệt hàng loạt: gọi song song nhiều request review
export function useBulkApproveSchedule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (ids: number[]) => {
      await Promise.all(
        ids.map(id => api.put(`/schedules/${id}/review`, { status: 'approved' }))
      )
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['schedules'] }),
  })
}

export function useDeleteSchedule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/schedules/${id}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['schedules'] }),
  })
}