import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

export interface WeeklyFeedback {
  id: number
  intern_id: number
  mentor_id: number
  batch_id: number
  week_number: number
  week_label: string | null
  content: string
  strengths: string | null
  improvements: string | null
  rating: number | null
  intern_name: string
  mentor_name: string
  created_at: string
  updated_at: string
}

export interface WeeklyFeedbackStatus {
  intern_id: number
  intern_name: string
  batch_id: number
  batch_name: string
  current_week: number
  has_feedback_this_week: boolean
  batch_status: 'open' | 'closed'
}

export interface CreateFeedbackData {
  intern_id: number
  batch_id: number
  week_number: number
  week_label?: string
  content: string
  strengths?: string
  improvements?: string
  rating?: number
}

export interface UpdateFeedbackData {
  week_label?: string
  content?: string
  strengths?: string
  improvements?: string
  rating?: number
}

export function useWeeklyFeedbacks(internId?: number, batchId?: number) {
  return useQuery<WeeklyFeedback[]>({
    queryKey: ['weekly-feedbacks', internId, batchId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (internId) params.append('intern_id', String(internId))
      if (batchId) params.append('batch_id', String(batchId))
      const res = await api.get(`/weekly-feedbacks/?${params.toString()}`)
      return res.data
    },
  })
}

/** Lấy trạng thái feedback tuần hiện tại của từng TTS — dùng cho banner nhắc nhở */
export function useWeeklyFeedbackStatus() {
  return useQuery<WeeklyFeedbackStatus[]>({
    queryKey: ['weekly-feedback-status'],
    queryFn: async () => {
      const res = await api.get('/weekly-feedbacks/status')
      return res.data
    },
    // Refetch mỗi 1 giờ để cập nhật trạng thái
    staleTime: 60 * 60 * 1000,
  })
}

export function useCreateFeedback() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: CreateFeedbackData) => {
      const res = await api.post('/weekly-feedbacks/', data)
      return res.data as WeeklyFeedback
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekly-feedbacks'] })
      queryClient.invalidateQueries({ queryKey: ['weekly-feedback-status'] })
    },
  })
}

export function useUpdateFeedback() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateFeedbackData }) => {
      const res = await api.put(`/weekly-feedbacks/${id}`, data)
      return res.data as WeeklyFeedback
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekly-feedbacks'] })
      queryClient.invalidateQueries({ queryKey: ['weekly-feedback-status'] })
    },
  })
}

export function useDeleteFeedback() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/weekly-feedbacks/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekly-feedbacks'] })
      queryClient.invalidateQueries({ queryKey: ['weekly-feedback-status'] })
    },
  })
}