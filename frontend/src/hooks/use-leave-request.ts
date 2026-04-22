import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────

export type LeaveStatus = 'pending' | 'approved' | 'rejected'

export interface LeaveRequest {
  id:          number
  intern_id:   number
  intern_name: string | null
  schedule_id: number | null
  batch_id:    number
  leave_date:  string       // 'YYYY-MM-DD'
  reason:      string
  status:      LeaveStatus
  hr_note:     string | null
  created_at:  string | null
}

export interface CreateLeaveData {
  leave_date:  string
  reason:      string
  batch_id:    number
  schedule_id?: number
}

export interface ReviewLeaveData {
  status:   LeaveStatus
  hr_note?: string
}

export const LEAVE_STATUS_LABELS: Record<LeaveStatus, { label: string; color: string }> = {
  pending:  { label: 'Chờ duyệt', color: 'bg-yellow-100 text-yellow-700' },
  approved: { label: 'Đã duyệt',  color: 'bg-green-100 text-green-700'  },
  rejected: { label: 'Từ chối',   color: 'bg-red-100 text-red-700'      },
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useLeaveRequests(params?: { intern_id?: number; batch_id?: number; status?: LeaveStatus }) {
  return useQuery<LeaveRequest[]>({
    queryKey: ['leave-requests', params],
    queryFn: async () => {
      const res = await api.get('/leave-requests/', { params })
      return res.data
    },
  })
}

export function useCreateLeaveRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateLeaveData) => api.post('/leave-requests/', data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leave-requests'] }),
  })
}

export function useReviewLeaveRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ReviewLeaveData }) =>
      api.put(`/leave-requests/${id}/review`, data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leave-requests'] }),
  })
}

export function useDeleteLeaveRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/leave-requests/${id}`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leave-requests'] }),
  })
}